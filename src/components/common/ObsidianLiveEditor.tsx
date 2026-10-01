import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, Decoration, DecorationSet, WidgetType, keymap } from '@codemirror/view';
import { StateField, Prec } from '@codemirror/state';

// -------------------------------------------------------------
// 1. Interactive Checkbox Widget (Obsidian Task Item)
// -------------------------------------------------------------
class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
    readonly to: number,
    readonly onToggle: (from: number, to: number, nextChecked: boolean) => void
  ) {
    super();
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.from === this.from && other.to === this.to;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'cm-obsidian-checkbox-wrapper';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.verticalAlign = 'middle';
    wrapper.style.marginRight = '8px';
    wrapper.style.userSelect = 'none';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.className = 'cm-obsidian-checkbox';
    input.style.width = '15px';
    input.style.height = '15px';
    input.style.borderRadius = '4px';
    input.style.cursor = 'pointer';
    input.style.accentColor = '#4f46e5';

    input.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onToggle(this.from, this.to, !this.checked);
    });

    wrapper.appendChild(input);
    return wrapper;
  }

  ignoreEvent() {
    return false;
  }
}

// -------------------------------------------------------------
// 2. Interactive Wikilink Widget [[Nota]]
// -------------------------------------------------------------
class WikilinkWidget extends WidgetType {
  constructor(
    readonly noteTitle: string,
    readonly onWikilinkClick?: (title: string) => void
  ) {
    super();
  }

  eq(other: WikilinkWidget) {
    return other.noteTitle === this.noteTitle;
  }

  toDOM(): HTMLElement {
    const button = document.createElement('span');
    button.className = 'cm-obsidian-wikilink-pill';
    button.textContent = `[[${this.noteTitle}]]`;
    button.title = `Abrir nota: ${this.noteTitle}`;
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.padding = '1px 7px';
    button.style.margin = '0 2px';
    button.style.backgroundColor = '#eef2ff';
    button.style.color = '#4338ca';
    button.style.border = '1px solid #c7d2fe';
    button.style.borderRadius = '6px';
    button.style.fontWeight = '600';
    button.style.fontSize = '0.85em';
    button.style.cursor = 'pointer';
    button.style.userSelect = 'none';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onWikilinkClick) {
        this.onWikilinkClick(this.noteTitle);
      }
    });

    return button;
  }

  ignoreEvent() {
    return false;
  }
}

// -------------------------------------------------------------
// 3. Interactive Web Link Widget [Text](URL) & Bare URLs / Domains
// -------------------------------------------------------------
class WebLinkWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly url: string,
    readonly from: number
  ) {
    super();
  }

  eq(other: WebLinkWidget) {
    return other.label === this.label && other.url === this.url && other.from === this.from;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'cm-obsidian-link-pill';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.margin = '0 2px';
    wrapper.style.verticalAlign = 'baseline';

    const cleanUrl = this.url.startsWith('http://') || this.url.startsWith('https://') 
      ? this.url 
      : `https://${this.url}`;

    // Label span
    const labelSpan = document.createElement('span');
    labelSpan.className = 'cm-obsidian-link-label';
    labelSpan.textContent = this.label;
    labelSpan.style.color = '#2563eb';
    labelSpan.style.textDecoration = 'underline';
    labelSpan.style.textDecorationColor = '#93c5fd';
    labelSpan.style.cursor = 'text';

    // Click label to place cursor inside the editor to edit
    labelSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      view.dispatch({ selection: { anchor: this.from } });
      view.focus();
    });

    // Arrow Button (la flechita de la derecha)
    const arrowBtn = document.createElement('button');
    arrowBtn.type = 'button';
    arrowBtn.className = 'cm-obsidian-link-arrow-btn';
    arrowBtn.innerHTML = '↗';
    arrowBtn.title = `Abrir enlace en nueva pestaña:\n${cleanUrl}`;
    arrowBtn.style.display = 'inline-flex';
    arrowBtn.style.alignItems = 'center';
    arrowBtn.style.justifyContent = 'center';
    arrowBtn.style.width = '18px';
    arrowBtn.style.height = '18px';
    arrowBtn.style.marginLeft = '4px';
    arrowBtn.style.borderRadius = '4px';
    arrowBtn.style.fontSize = '11px';
    arrowBtn.style.fontWeight = 'bold';
    arrowBtn.style.backgroundColor = '#eff6ff';
    arrowBtn.style.color = '#2563eb';
    arrowBtn.style.border = '1px solid #bfdbfe';
    arrowBtn.style.cursor = 'pointer';
    arrowBtn.style.lineHeight = '1';
    arrowBtn.style.userSelect = 'none';
    arrowBtn.style.transition = 'all 0.15s ease';

    arrowBtn.addEventListener('mouseenter', () => {
      arrowBtn.style.backgroundColor = '#2563eb';
      arrowBtn.style.color = '#ffffff';
    });
    arrowBtn.addEventListener('mouseleave', () => {
      arrowBtn.style.backgroundColor = '#eff6ff';
      arrowBtn.style.color = '#2563eb';
    });

    arrowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    });

    wrapper.appendChild(labelSpan);
    wrapper.appendChild(arrowBtn);
    return wrapper;
  }

  ignoreEvent() {
    return true;
  }
}

// -------------------------------------------------------------
// 4. Custom NovaGreen Modal Helper for In-Place Editor
// -------------------------------------------------------------
function showNovaGreenConfirmModal({
  title,
  itemName,
  description,
  confirmText,
  onConfirm,
}: {
  title: string;
  itemName: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
}) {
  const overlay = document.createElement('div');
  overlay.className = 'cm-ng-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `;

  const modal = document.createElement('div');
  modal.className = 'cm-ng-modal-card';
  modal.style.cssText = `
    background: #ffffff;
    border-radius: 24px;
    padding: 24px;
    max-width: 380px;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 1px solid #f1f5f9;
    text-align: center;
    font-family: inherit;
  `;

  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = `
    width: 48px;
    height: 48px;
    background-color: #fee2e2;
    color: #ef4444;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
    border: 1px solid #fecaca;
  `;
  iconDiv.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18"></path>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  `;

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    font-size: 16px;
    font-weight: 900;
    color: #0f172a;
    margin: 0 0 6px 0;
  `;

  const descEl = document.createElement('p');
  descEl.textContent = description;
  descEl.style.cssText = `
    font-size: 12px;
    color: #64748b;
    margin: 0 0 8px 0;
    line-height: 1.4;
  `;

  const itemChip = document.createElement('div');
  itemChip.textContent = itemName;
  itemChip.style.cssText = `
    font-size: 12px;
    font-weight: 700;
    color: #1e293b;
    background: #f8fafc;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    margin-bottom: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.textContent = confirmText;
  confirmBtn.style.cssText = `
    width: 100%;
    padding: 10px 16px;
    background-color: #ef4444;
    color: #ffffff;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.25);
    transition: all 0.15s ease;
  `;
  confirmBtn.onmouseenter = () => { confirmBtn.style.backgroundColor = '#dc2626'; };
  confirmBtn.onmouseleave = () => { confirmBtn.style.backgroundColor = '#ef4444'; };

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = `
    width: 100%;
    padding: 9px 16px;
    background-color: #f1f5f9;
    color: #475569;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.15s ease;
  `;
  cancelBtn.onmouseenter = () => { cancelBtn.style.backgroundColor = '#e2e8f0'; cancelBtn.style.color = '#0f172a'; };
  cancelBtn.onmouseleave = () => { cancelBtn.style.backgroundColor = '#f1f5f9'; cancelBtn.style.color = '#475569'; };

  const cleanup = () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  };

  confirmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cleanup();
    onConfirm();
  });

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cleanup();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup();
    }
  });

  modal.appendChild(iconDiv);
  modal.appendChild(titleEl);
  modal.appendChild(descEl);
  modal.appendChild(itemChip);
  btnContainer.appendChild(confirmBtn);
  btnContainer.appendChild(cancelBtn);
  modal.appendChild(btnContainer);
  overlay.appendChild(modal);

  document.addEventListener('keydown', handleKeyDown);
  document.body.appendChild(overlay);
  confirmBtn.focus();
}

// -------------------------------------------------------------
// 5. In-Place Permanent Visual Markdown Table Widget
// -------------------------------------------------------------
class TableWidget extends WidgetType {
  constructor(
    readonly rawTable: string,
    readonly from: number,
    readonly to: number,
    readonly onUpdateTable: (from: number, to: number, newTableMarkdown: string) => void
  ) {
    super();
  }

  eq(other: TableWidget) {
    return other.rawTable === this.rawTable && other.from === this.from && other.to === this.to;
  }

  toDOM(view: EditorView): HTMLElement {
    const lines = this.rawTable.trim().split('\n').filter(Boolean);
    const container = document.createElement('div');
    container.className = 'cm-obsidian-table-wrapper';
    container.style.userSelect = 'text';

    if (lines.length < 2) {
      container.textContent = this.rawTable;
      return container;
    }

    // Parse Header
    const rawHeaderCells = lines[0].split('|').map((c) => c.trim());
    let headerCells = lines[0].startsWith('|') && lines[0].endsWith('|')
      ? rawHeaderCells.slice(1, -1)
      : rawHeaderCells.filter(Boolean);
    if (headerCells.length === 0) headerCells = ['Columna 1', 'Columna 2', 'Columna 3'];

    // Parse Data rows
    let dataRows: string[][] = [];
    for (let r = 2; r < lines.length; r++) {
      const rowLine = lines[r];
      if (!rowLine.includes('|')) continue;
      const rawData = rowLine.split('|').map((c) => c.trim());
      const rowCells = rowLine.startsWith('|') && rowLine.endsWith('|')
        ? rawData.slice(1, -1)
        : rawData.filter(Boolean);
      dataRows.push(rowCells);
    }
    if (dataRows.length === 0) {
      dataRows = [headerCells.map(() => '')];
    }

    const table = document.createElement('table');
    table.className = 'cm-obsidian-table';

    const saveChanges = () => {
      const headers: string[] = [];
      table.querySelectorAll('thead th.cm-table-header-cell').forEach((th) => {
        const textSpan = th.querySelector('.cm-table-header-text') || th;
        headers.push(textSpan.textContent?.trim().replace(/\|/g, ' ') || ' ');
      });
      const rows: string[][] = [];
      table.querySelectorAll('tbody tr.cm-table-data-row').forEach((tr) => {
        const rowData: string[] = [];
        tr.querySelectorAll('td.cm-table-cell').forEach((td) => {
          rowData.push(td.textContent?.trim().replace(/\|/g, ' ') || ' ');
        });
        rows.push(rowData);
      });
      if (headers.length === 0) return;

      const headerStr = '| ' + headers.join(' | ') + ' |';
      const delimStr = '| ' + headers.map(() => '---').join(' | ') + ' |';
      const rowsStr = rows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
      const newMarkdown = `${headerStr}\n${delimStr}\n${rowsStr}\n`;

      if (newMarkdown.trim() !== this.rawTable.trim()) {
        this.onUpdateTable(this.from, this.to, newMarkdown);
      }
    };

    // Header Element
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerCells.forEach((cellText, colIdx) => {
      const th = document.createElement('th');
      th.className = 'cm-table-cell cm-table-header-cell';
      
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'cm-table-header-inner';
      contentWrapper.style.display = 'flex';
      contentWrapper.style.alignItems = 'flex-start';
      contentWrapper.style.justifyContent = 'center';
      contentWrapper.style.width = '100%';

      const textSpan = document.createElement('span');
      textSpan.className = 'cm-table-header-text';
      textSpan.contentEditable = 'true';
      textSpan.spellcheck = false;
      const colTitle = cellText || `Columna ${colIdx + 1}`;
      textSpan.textContent = colTitle;
      textSpan.style.flex = '1';
      textSpan.style.textAlign = 'center';
      textSpan.style.outline = 'none';
      textSpan.addEventListener('blur', saveChanges);
      textSpan.addEventListener('keydown', (e) => handleKeyNavigation(e, textSpan));
      contentWrapper.appendChild(textSpan);

      // If more than 1 column, add Delete Column button (✕) in top-center with NovaGreen confirmation modal
      if (headerCells.length > 1) {
        const delColBtn = document.createElement('button');
        delColBtn.type = 'button';
        delColBtn.className = 'cm-table-del-col-btn';
        delColBtn.textContent = '✕';
        delColBtn.title = `Eliminar Columna "${colTitle}"`;
        delColBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const currentTitle = textSpan.textContent?.trim() || `Columna ${colIdx + 1}`;
          showNovaGreenConfirmModal({
            title: '¿Eliminar columna?',
            description: 'Estás a punto de eliminar la columna y todo su contenido:',
            itemName: currentTitle,
            confirmText: 'Sí, eliminar columna',
            onConfirm: () => {
              const newHeaders = headerCells.filter((_, idx) => idx !== colIdx);
              const newRows = dataRows.map((r) => r.filter((_, idx) => idx !== colIdx));
              const headerStr = '| ' + newHeaders.join(' | ') + ' |';
              const delimStr = '| ' + newHeaders.map(() => '---').join(' | ') + ' |';
              const rowsStr = newRows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
              this.onUpdateTable(this.from, this.to, `${headerStr}\n${delimStr}\n${rowsStr}\n`);
            }
          });
        });
        th.appendChild(delColBtn);
      }

      // Column Resizer Handle (Transfer width with adjacent column without exceeding 100% sheet width)
      if (headerCells.length > 1) {
        const resizer = document.createElement('div');
        resizer.className = 'cm-table-col-resizer';
        resizer.title = 'Arrastrar para regular el tamaño de la columna';
        resizer.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.pageX;

          const allHeaderThs = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th.cm-table-header-cell'));
          // Set initial explicit pixel widths on all columns so layout doesn't jump
          allHeaderThs.forEach((hTh) => {
            const rectWidth = hTh.getBoundingClientRect().width;
            hTh.style.width = `${rectWidth}px`;
          });

          const isLastCol = colIdx === headerCells.length - 1;
          const targetTh = isLastCol ? allHeaderThs[colIdx - 1] : th;
          const neighborTh = isLastCol ? th : allHeaderThs[colIdx + 1];

          if (!targetTh || !neighborTh) return;

          const targetStartWidth = targetTh.getBoundingClientRect().width;
          const neighborStartWidth = neighborTh.getBoundingClientRect().width;
          const totalPairWidth = targetStartWidth + neighborStartWidth;
          const minColWidth = 50;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = isLastCol ? (startX - moveEvent.pageX) : (moveEvent.pageX - startX);
            let newTargetWidth = targetStartWidth + deltaX;
            let newNeighborWidth = neighborStartWidth - deltaX;

            if (newTargetWidth < minColWidth) {
              newTargetWidth = minColWidth;
              newNeighborWidth = totalPairWidth - minColWidth;
            } else if (newNeighborWidth < minColWidth) {
              newNeighborWidth = minColWidth;
              newTargetWidth = totalPairWidth - minColWidth;
            }

            targetTh.style.width = `${newTargetWidth}px`;
            neighborTh.style.width = `${newNeighborWidth}px`;
          };
          
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
          };
          
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
        th.appendChild(resizer);
      }

      th.appendChild(contentWrapper);
      headerRow.appendChild(th);
    });

    // Add Column Header Button (+ Col)
    const addColTh = document.createElement('th');
    addColTh.className = 'cm-table-action-th';
    addColTh.style.width = '48px';
    addColTh.style.padding = '6px';
    addColTh.style.textAlign = 'center';
    addColTh.style.userSelect = 'none';
    const addColBtn = document.createElement('button');
    addColBtn.type = 'button';
    addColBtn.className = 'cm-table-add-col-btn';
    addColBtn.textContent = '+ Col';
    addColBtn.title = 'Añadir nueva columna a la derecha';
    addColBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const newHeaders = [...headerCells, `Columna ${headerCells.length + 1}`];
      const newRows = dataRows.map((r) => [...r, '']);
      const headerStr = '| ' + newHeaders.join(' | ') + ' |';
      const delimStr = '| ' + newHeaders.map(() => '---').join(' | ') + ' |';
      const rowsStr = newRows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
      this.onUpdateTable(this.from, this.to, `${headerStr}\n${delimStr}\n${rowsStr}\n`);
    });
    addColTh.appendChild(addColBtn);
    headerRow.appendChild(addColTh);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body Element
    const tbody = document.createElement('tbody');
    dataRows.forEach((row, rowIdx) => {
      const tr = document.createElement('tr');
      tr.className = 'cm-table-data-row';
      headerCells.forEach((_, colIdx) => {
        const td = document.createElement('td');
        td.className = 'cm-table-cell';
        td.contentEditable = 'true';
        td.spellcheck = false;
        td.textContent = row[colIdx] || '';
        td.style.textAlign = 'justify';
        td.style.verticalAlign = 'middle';
        td.addEventListener('blur', saveChanges);
        td.addEventListener('keydown', (e) => handleKeyNavigation(e, td));
        tr.appendChild(td);
      });

      // Delete Row Button
      const delTd = document.createElement('td');
      delTd.className = 'cm-table-action-td';
      delTd.style.width = '32px';
      delTd.style.padding = '2px';
      delTd.style.textAlign = 'center';
      delTd.style.userSelect = 'none';
      const delRowBtn = document.createElement('button');
      delRowBtn.type = 'button';
      delRowBtn.className = 'cm-table-del-row-btn';
      delRowBtn.innerHTML = '&times;';
      delRowBtn.title = 'Eliminar fila';
      delRowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const newRows = dataRows.filter((_, idx) => idx !== rowIdx);
        if (newRows.length === 0) newRows.push(headerCells.map(() => ''));
        const headerStr = '| ' + headerCells.join(' | ') + ' |';
        const delimStr = '| ' + headerCells.map(() => '---').join(' | ') + ' |';
        const rowsStr = newRows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
        this.onUpdateTable(this.from, this.to, `${headerStr}\n${delimStr}\n${rowsStr}\n`);
      });
      delTd.appendChild(delRowBtn);
      tr.appendChild(delTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // Footer Bar with + Añadir Fila Button
    const footerDiv = document.createElement('div');
    footerDiv.className = 'cm-table-footer-bar';
    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className = 'cm-table-add-row-btn';
    addRowBtn.innerHTML = '<span>+ Añadir Fila</span>';
    addRowBtn.title = 'Insertar nueva fila al final de la tabla';
    addRowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const newRows = [...dataRows, headerCells.map(() => '')];
      const headerStr = '| ' + headerCells.join(' | ') + ' |';
      const delimStr = '| ' + headerCells.map(() => '---').join(' | ') + ' |';
      const rowsStr = newRows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
      this.onUpdateTable(this.from, this.to, `${headerStr}\n${delimStr}\n${rowsStr}\n`);
    });
    footerDiv.appendChild(addRowBtn);
    container.appendChild(footerDiv);

    // Keyboard Navigation across cells and in/out of table
    const handleKeyNavigation = (e: KeyboardEvent, currentCell: HTMLElement) => {
      const allCells = Array.from(table.querySelectorAll<HTMLElement>('.cm-table-header-text, td.cm-table-cell'));
      const currentIdx = allCells.indexOf(currentCell);
      const colsCount = headerCells.length;

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        saveChanges();
        if (!e.shiftKey) {
          if (currentIdx < allCells.length - 1) {
            allCells[currentIdx + 1].focus();
          } else {
            addRowBtn.click();
          }
        } else {
          if (currentIdx > 0) {
            allCells[currentIdx - 1].focus();
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        saveChanges();
        if (currentIdx + colsCount < allCells.length) {
          allCells[currentIdx + colsCount].focus();
        } else {
          addRowBtn.click();
        }
      } else if (e.key === 'ArrowUp') {
        if (currentIdx < colsCount) {
          // Top row: exit table upwards to editor line above
          e.preventDefault();
          e.stopPropagation();
          saveChanges();
          view.dispatch({
            selection: { anchor: this.from, head: this.from },
            scrollIntoView: true
          });
          view.focus();
        } else {
          e.preventDefault();
          e.stopPropagation();
          allCells[currentIdx - colsCount]?.focus();
        }
      } else if (e.key === 'ArrowDown') {
        if (currentIdx + colsCount >= allCells.length) {
          // Bottom row: exit table downwards to editor line below
          e.preventDefault();
          e.stopPropagation();
          saveChanges();
          view.dispatch({
            selection: { anchor: this.to, head: this.to },
            scrollIntoView: true
          });
          view.focus();
        } else {
          e.preventDefault();
          e.stopPropagation();
          allCells[currentIdx + colsCount]?.focus();
        }
      }
    };

    return container;
  }

  ignoreEvent() {
    return true;
  }
}

// -------------------------------------------------------------
// 5. Obsidian Live Preview Plugin: Headings, Tasks, Callouts, Delimiters, Tables, Links
// -------------------------------------------------------------
function createObsidianLivePreviewPlugin(
  onToggleCheckbox: (from: number, to: number, nextChecked: boolean) => void,
  onUpdateTable: (from: number, to: number, newTableMarkdown: string) => void,
  onWikilinkClick?: (title: string) => void
) {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, onToggleCheckbox, onUpdateTable, onWikilinkClick);
    },
    update(decorations, tr) {
      if (tr.docChanged || tr.selection) {
        return buildDecorations(tr.state, onToggleCheckbox, onUpdateTable, onWikilinkClick);
      }
      return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

function buildDecorations(
  state: any,
  onToggleCheckbox: (from: number, to: number, nextChecked: boolean) => void,
  onUpdateTable: (from: number, to: number, newTableMarkdown: string) => void,
  onWikilinkClick?: (title: string) => void
): DecorationSet {
  const decorations: any[] = [];
  const doc = state.doc;
  const selection = state.selection?.main;
  const cursorFrom = selection?.from ?? -1;
  const cursorTo = selection?.to ?? -1;

  let lineNum = 1;
  while (lineNum <= doc.lines) {
    const line = doc.line(lineNum);
    const text = line.text;
    const lineFrom = line.from;

    if (!text) {
      lineNum++;
      continue;
    }

    // A. Multi-line Markdown Table Detection (Permanently Rendered as Visual Interactive Table)
    if (text.trim().startsWith('|') && text.trim().endsWith('|') && lineNum < doc.lines) {
      const nextLine = doc.line(lineNum + 1);
      // Check if next line is table delimiter (e.g. |:---|:---| or |---|---|)
      if (nextLine.text.trim().startsWith('|') && /\|(?:\s*:?-+:?\s*\|)+/.test(nextLine.text.trim())) {
        let tableEndLineNum = lineNum + 1;
        while (tableEndLineNum < doc.lines) {
          const subsequentLine = doc.line(tableEndLineNum + 1);
          if (subsequentLine.text.trim().startsWith('|') && subsequentLine.text.trim().includes('|')) {
            tableEndLineNum++;
          } else {
            break;
          }
        }

        const tableStartPos = lineFrom;
        const tableEndPos = doc.line(tableEndLineNum).to;
        const rawTable = doc.sliceString(tableStartPos, tableEndPos);

        decorations.push(
          Decoration.replace({
            widget: new TableWidget(rawTable, tableStartPos, tableEndPos, onUpdateTable),
          }).range(tableStartPos, tableEndPos)
        );
        lineNum = tableEndLineNum + 1;
        continue;
      }
    }

    // B. Headings: # H1, ## H2, ### H3, #### H4
    const h1Match = text.match(/^(#\s)(.*)$/);
    if (h1Match) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-h1' }).range(lineFrom)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-obsidian-hash' }).range(lineFrom, lineFrom + 2)
      );
      lineNum++;
      continue;
    }

    const h2Match = text.match(/^(##\s)(.*)$/);
    if (h2Match) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-h2' }).range(lineFrom)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-obsidian-hash' }).range(lineFrom, lineFrom + 3)
      );
      lineNum++;
      continue;
    }

    const h3Match = text.match(/^(###\s)(.*)$/);
    if (h3Match) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-h3' }).range(lineFrom)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-obsidian-hash' }).range(lineFrom, lineFrom + 4)
      );
      lineNum++;
      continue;
    }

    const h4Match = text.match(/^(####\s)(.*)$/);
    if (h4Match) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-h4' }).range(lineFrom)
      );
      decorations.push(
        Decoration.mark({ class: 'cm-obsidian-hash' }).range(lineFrom, lineFrom + 5)
      );
      lineNum++;
      continue;
    }

    // C. Interactive Checklists (- [ ] or - [x])
    const taskMatch = text.match(/^(\s*[-*+]\s+\[)([\s xX])(\]\s*)(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const bracketIdx = text.indexOf('[');
      const closeBracketIdx = text.indexOf(']', bracketIdx);

      if (bracketIdx !== -1 && closeBracketIdx !== -1) {
        const replaceFrom = lineFrom + bracketIdx;
        const replaceTo = lineFrom + closeBracketIdx + 1;

        decorations.push(
          Decoration.line({
            class: isChecked ? 'cm-obsidian-task cm-obsidian-task-done' : 'cm-obsidian-task',
          }).range(lineFrom)
        );

        decorations.push(
          Decoration.replace({
            widget: new CheckboxWidget(isChecked, replaceFrom, replaceTo, onToggleCheckbox),
          }).range(replaceFrom, replaceTo)
        );
      }
      lineNum++;
      continue;
    }

    // D. Callouts: > [!NOTE], > [!TIP], > [!WARNING]
    if (text.startsWith('> [!NOTE]')) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-callout cm-obsidian-callout-note' }).range(lineFrom)
      );
      lineNum++;
      continue;
    }
    if (text.startsWith('> [!TIP]')) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-callout cm-obsidian-callout-tip' }).range(lineFrom)
      );
      lineNum++;
      continue;
    }
    if (text.startsWith('> [!WARNING]')) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-callout cm-obsidian-callout-warning' }).range(lineFrom)
      );
      lineNum++;
      continue;
    }

    // E. Blockquote: > text
    if (text.startsWith('> ')) {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-quote' }).range(lineFrom)
      );
      lineNum++;
      continue;
    }

    // F. Horizontal rule: ---, ***, ___
    if (text === '---' || text === '***' || text === '___') {
      decorations.push(
        Decoration.line({ class: 'cm-obsidian-hr' }).range(lineFrom)
      );
      lineNum++;
      continue;
    }

    // G. Wikilinks [[Titulo Nota]]
    const wikilinkRegex = /\[\[(.*?)\]\]/g;
    let wMatch: RegExpExecArray | null;
    const occupiedRanges: [number, number][] = [];

    while ((wMatch = wikilinkRegex.exec(text)) !== null) {
      const matchFrom = lineFrom + wMatch.index;
      const matchTo = matchFrom + wMatch[0].length;
      occupiedRanges.push([matchFrom, matchTo]);
      const noteTitle = wMatch[1];

      decorations.push(
        Decoration.replace({
          widget: new WikilinkWidget(noteTitle, onWikilinkClick),
        }).range(matchFrom, matchTo)
      );
    }

    // H. Markdown Links [Label](URL)
    const mdLinkRegex = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
    let mlMatch: RegExpExecArray | null;
    while ((mlMatch = mdLinkRegex.exec(text)) !== null) {
      const matchFrom = lineFrom + mlMatch.index;
      const matchTo = matchFrom + mlMatch[0].length;
      occupiedRanges.push([matchFrom, matchTo]);

      const label = mlMatch[1];
      const url = mlMatch[2];
      const isCursorInside = cursorFrom <= matchTo && cursorTo >= matchFrom;

      if (!isCursorInside) {
        decorations.push(
          Decoration.replace({
            widget: new WebLinkWidget(label, url, matchFrom),
          }).range(matchFrom, matchTo)
        );
      } else {
        decorations.push(Decoration.mark({ class: 'cm-obsidian-web-link cm-obsidian-editing-inline' }).range(matchFrom, matchTo));
      }
    }

    // I. Bare URLs and Direct Domains (e.g. novagreen.ec, https://..., www.novagreen.ec)
    const bareUrlRegex = /(?:https?:\/\/|www\.)[^\s<>)"]+|(?<=\s|^)[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:ec|com|org|net|io|ai|app|dev|edu|gov|co|es|lat|me|info|biz|site|online)(?:\/[^\s<>)"]*)?(?=\s|$|[),.!?])/gi;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = bareUrlRegex.exec(text)) !== null) {
      const matchFrom = lineFrom + urlMatch.index;
      const matchTo = matchFrom + urlMatch[0].length;

      // Skip if inside a wikilink or markdown link
      const isOccupied = occupiedRanges.some(([s, e]) => matchFrom >= s && matchTo <= e);
      if (isOccupied) continue;

      const rawUrl = urlMatch[0];
      const isCursorInside = cursorFrom <= matchTo && cursorTo >= matchFrom;

      if (!isCursorInside) {
        decorations.push(
          Decoration.replace({
            widget: new WebLinkWidget(rawUrl, rawUrl, matchFrom),
          }).range(matchFrom, matchTo)
        );
      } else {
        decorations.push(Decoration.mark({ class: 'cm-obsidian-web-link cm-obsidian-editing-inline' }).range(matchFrom, matchTo));
      }
    }

    // J. Inline Formatting with Conceal Delimiters (Bold, Italic, Highlight, Strike, Inline Code)
    // 1. Highlight: ==text==
    const highlightRegex = /==([^=\n]+?)==/g;
    let hlMatch: RegExpExecArray | null;
    while ((hlMatch = highlightRegex.exec(text)) !== null) {
      const start = lineFrom + hlMatch.index;
      const end = start + hlMatch[0].length;
      const isCursorInside = cursorFrom <= end && cursorTo >= start;

      if (!isCursorInside) {
        decorations.push(Decoration.replace({}).range(start, start + 2));
        decorations.push(Decoration.mark({ class: 'cm-obsidian-highlight' }).range(start + 2, end - 2));
        decorations.push(Decoration.replace({}).range(end - 2, end));
      } else {
        decorations.push(Decoration.mark({ class: 'cm-obsidian-highlight cm-obsidian-editing-inline' }).range(start, end));
      }
    }

    // 2. Bold: **text**
    const boldRegex = /\*\*([^*\n]+?)\*\*/g;
    let bMatch: RegExpExecArray | null;
    while ((bMatch = boldRegex.exec(text)) !== null) {
      const start = lineFrom + bMatch.index;
      const end = start + bMatch[0].length;
      const isCursorInside = cursorFrom <= end && cursorTo >= start;

      if (!isCursorInside) {
        decorations.push(Decoration.replace({}).range(start, start + 2));
        decorations.push(Decoration.mark({ class: 'cm-obsidian-bold' }).range(start + 2, end - 2));
        decorations.push(Decoration.replace({}).range(end - 2, end));
      } else {
        decorations.push(Decoration.mark({ class: 'cm-obsidian-bold cm-obsidian-editing-inline' }).range(start, end));
      }
    }

    // 3. Strikethrough: ~~text~~
    const strikeRegex = /~~([^~\n]+?)~~/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = strikeRegex.exec(text)) !== null) {
      const start = lineFrom + sMatch.index;
      const end = start + sMatch[0].length;
      const isCursorInside = cursorFrom <= end && cursorTo >= start;

      if (!isCursorInside) {
        decorations.push(Decoration.replace({}).range(start, start + 2));
        decorations.push(Decoration.mark({ class: 'cm-obsidian-strike' }).range(start + 2, end - 2));
        decorations.push(Decoration.replace({}).range(end - 2, end));
      } else {
        decorations.push(Decoration.mark({ class: 'cm-obsidian-strike cm-obsidian-editing-inline' }).range(start, end));
      }
    }

    // 4. Inline Code: `code`
    const codeRegex = /(?<!`)`([^`\n]+?)`(?!`)/g;
    let cMatch: RegExpExecArray | null;
    while ((cMatch = codeRegex.exec(text)) !== null) {
      const start = lineFrom + cMatch.index;
      const end = start + cMatch[0].length;
      const isCursorInside = cursorFrom <= end && cursorTo >= start;

      if (!isCursorInside) {
        decorations.push(Decoration.replace({}).range(start, start + 1));
        decorations.push(Decoration.mark({ class: 'cm-obsidian-inline-code' }).range(start + 1, end - 1));
        decorations.push(Decoration.replace({}).range(end - 1, end));
      } else {
        decorations.push(Decoration.mark({ class: 'cm-obsidian-inline-code cm-obsidian-editing-inline' }).range(start, end));
      }
    }

    // 5. Italic: *text* (excluding **)
    const italicRegex = /(?<!\*)\*([^*\n]+?)\*(?!\*)/g;
    let iMatch: RegExpExecArray | null;
    while ((iMatch = italicRegex.exec(text)) !== null) {
      const start = lineFrom + iMatch.index;
      const end = start + iMatch[0].length;
      const isCursorInside = cursorFrom <= end && cursorTo >= start;

      if (!isCursorInside) {
        decorations.push(Decoration.replace({}).range(start, start + 1));
        decorations.push(Decoration.mark({ class: 'cm-obsidian-italic' }).range(start + 1, end - 1));
        decorations.push(Decoration.replace({}).range(end - 1, end));
      } else {
        decorations.push(Decoration.mark({ class: 'cm-obsidian-italic cm-obsidian-editing-inline' }).range(start, end));
      }
    }

    lineNum++;
  }

  return Decoration.set(decorations, true);
}

// -------------------------------------------------------------
// 6. Smart Hierarchical Numbered Lists Keymap (Enter, Tab, Shift-Tab)
// -------------------------------------------------------------
function handleSmartEnter(view: EditorView): boolean {
  const state = view.state;
  const selection = state.selection.main;
  if (!selection.empty) return false;

  const line = state.doc.lineAt(selection.from);
  const text = line.text;

  // Match hierarchical numbered list: "1. ", "1.1. ", "1.2.3. ", "  1.1 "
  const numMatch = text.match(/^(\s*)((?:\d+\.)+)\s*(.*)$/);
  if (numMatch) {
    const indent = numMatch[1];
    const numPart = numMatch[2]; // e.g. "1.", "1.1.", "1.2.1."
    const rest = numMatch[3];

    // If rest is empty and cursor is at end of numbering, exit list cleanly
    if (!rest.trim()) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
      });
      return true;
    }

    // Parse parts: "1.2.1." -> ["1", "2", "1"]
    const parts = numPart.split('.').filter(Boolean);
    if (parts.length > 0) {
      const lastIdx = parts.length - 1;
      parts[lastIdx] = String(parseInt(parts[lastIdx], 10) + 1);
      const nextNum = `${parts.join('.')}. `;
      const insertText = `\n${indent}${nextNum}`;

      view.dispatch({
        changes: { from: selection.from, insert: insertText },
        selection: { anchor: selection.from + insertText.length },
      });
      return true;
    }
  }

  // Interactive Checklist Enter: "- [ ] "
  const taskMatch = text.match(/^(\s*[-*+]\s+\[[\s xX]\]\s*)(.*)$/);
  if (taskMatch) {
    const prefix = taskMatch[1];
    const rest = taskMatch[2];
    if (!rest.trim()) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
      });
      return true;
    }
    const cleanPrefix = prefix.replace(/\[xX\]/, '[ ]');
    const insertText = `\n${cleanPrefix}`;
    view.dispatch({
      changes: { from: selection.from, insert: insertText },
      selection: { anchor: selection.from + insertText.length },
    });
    return true;
  }

  // Bullet List Enter: "- " or "* "
  const bulletMatch = text.match(/^(\s*[-*+]\s+)(.*)$/);
  if (bulletMatch) {
    const prefix = bulletMatch[1];
    const rest = bulletMatch[2];
    if (!rest.trim()) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
      });
      return true;
    }
    const insertText = `\n${prefix}`;
    view.dispatch({
      changes: { from: selection.from, insert: insertText },
      selection: { anchor: selection.from + insertText.length },
    });
    return true;
  }

  return false;
}

function handleSmartTab(view: EditorView): boolean {
  const state = view.state;
  const selection = state.selection.main;
  const line = state.doc.lineAt(selection.from);
  const text = line.text;

  const numMatch = text.match(/^(\s*)((?:\d+\.)+)\s*(.*)$/);
  if (!numMatch) return false;

  const indent = numMatch[1];
  const numPart = numMatch[2];
  const rest = numMatch[3];
  const currentParts = numPart.split('.').filter(Boolean);

  // Look for previous line to establish hierarchy
  let prevParts: string[] | null = null;
  if (line.number > 1) {
    const prevLine = state.doc.line(line.number - 1);
    const prevMatch = prevLine.text.match(/^(\s*)((?:\d+\.)+)\s*/);
    if (prevMatch) {
      prevParts = prevMatch[2].split('.').filter(Boolean);
    }
  }

  let newParts: string[];
  if (prevParts && prevParts.length >= currentParts.length) {
    // Nested under parent: e.g. prev is ["1"], current was ["2"] -> becomes ["1", "1"]
    newParts = [...prevParts, '1'];
  } else {
    // Just append .1 to current
    newParts = [...currentParts, '1'];
  }

  const newPrefix = `${indent}${newParts.join('.')}. `;
  const oldPrefixMatch = text.match(/^(\s*(?:\d+\.)+\s*)/);
  const oldPrefixLength = oldPrefixMatch ? oldPrefixMatch[1].length : (indent.length + numPart.length);

  view.dispatch({
    changes: { from: line.from, to: line.from + oldPrefixLength, insert: newPrefix },
    selection: { anchor: line.from + newPrefix.length + rest.length },
  });
  return true;
}

function handleSmartShiftTab(view: EditorView): boolean {
  const state = view.state;
  const selection = state.selection.main;
  const line = state.doc.lineAt(selection.from);
  const text = line.text;

  const numMatch = text.match(/^(\s*)((?:\d+\.)+)\s*(.*)$/);
  if (!numMatch) return false;

  const indent = numMatch[1];
  const numPart = numMatch[2];
  const rest = numMatch[3];
  const currentParts = numPart.split('.').filter(Boolean);

  const oldPrefixMatch = text.match(/^(\s*(?:\d+\.)+\s*)/);
  const oldPrefixLength = oldPrefixMatch ? oldPrefixMatch[1].length : (indent.length + numPart.length);

  if (currentParts.length > 1) {
    // Reduce one level: e.g. ["1", "2", "1"] -> ["1", "3"]
    const newParts = currentParts.slice(0, -1);
    const lastIdx = newParts.length - 1;
    newParts[lastIdx] = String(parseInt(newParts[lastIdx], 10) + 1);
    const newPrefix = `${indent}${newParts.join('.')}. `;

    view.dispatch({
      changes: { from: line.from, to: line.from + oldPrefixLength, insert: newPrefix },
      selection: { anchor: line.from + newPrefix.length + rest.length },
    });
    return true;
  } else {
    // Top level: remove numbering entirely
    view.dispatch({
      changes: { from: line.from, to: line.from + oldPrefixLength, insert: '' },
      selection: { anchor: line.from },
    });
    return true;
  }
}

const smartListKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Enter',
      run: (view) => handleSmartEnter(view),
    },
    {
      key: 'Tab',
      run: (view) => handleSmartTab(view),
    },
    {
      key: 'Shift-Tab',
      run: (view) => handleSmartShiftTab(view),
    },
  ])
);

// -------------------------------------------------------------
// 7. Obsidian Theme Styles (CodeMirror BaseTheme)
// -------------------------------------------------------------
const obsidianLiveTheme = EditorView.theme({
  '&': {
    fontSize: '15px',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1e293b',
    backgroundColor: 'transparent',
    lineHeight: '1.65',
    minHeight: '480px',
  },
  '.cm-content': {
    caretColor: '#4f46e5',
    padding: '8px 0',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#4f46e5',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: '#e0e7ff !important',
  },
  '.cm-line': {
    padding: '2px 0',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: '1.65',
  },

  // Headings
  '.cm-obsidian-h1': {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.02em',
    lineHeight: '1.3',
    paddingTop: '12px',
    paddingBottom: '4px',
    borderBottom: '1px solid #f1f5f9',
    marginTop: '6px',
    marginBottom: '4px',
  },
  '.cm-obsidian-h2': {
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: '-0.015em',
    lineHeight: '1.35',
    paddingTop: '10px',
    paddingBottom: '2px',
    marginTop: '4px',
  },
  '.cm-obsidian-h3': {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#334155',
    letterSpacing: '-0.01em',
    paddingTop: '6px',
  },
  '.cm-obsidian-h4': {
    fontSize: '1.0rem',
    fontWeight: '600',
    color: '#475569',
  },
  '.cm-obsidian-hash': {
    color: '#818cf8',
    opacity: '0.45',
    fontFamily: 'monospace',
    fontWeight: 'normal',
    marginRight: '3px',
  },

  // Inline Formatting Styles
  '.cm-obsidian-bold': {
    fontWeight: '700',
    color: '#0f172a',
  },
  '.cm-obsidian-italic': {
    fontStyle: 'italic',
    color: '#334155',
  },
  '.cm-obsidian-highlight': {
    backgroundColor: '#fef08a',
    color: '#713f12',
    padding: '1px 4px',
    borderRadius: '4px',
    fontWeight: '500',
  },
  '.cm-obsidian-strike': {
    textDecoration: 'line-through',
    color: '#94a3b8',
  },
  '.cm-obsidian-inline-code': {
    backgroundColor: '#f1f5f9',
    color: '#4338ca',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.9em',
    padding: '1px 5px',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
  },
  '.cm-obsidian-editing-inline': {
    opacity: '0.85',
  },

  // Web Links
  '.cm-obsidian-link-pill': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    borderRadius: '6px',
  },
  '.cm-obsidian-link-label': {
    color: '#2563eb',
    textDecoration: 'underline',
    textDecorationColor: '#93c5fd',
    fontWeight: '500',
    cursor: 'text',
  },
  '.cm-obsidian-link-arrow-btn': {
    cursor: 'pointer',
  },

  // Permanent Interactive Markdown Tables
  '.cm-obsidian-table-wrapper': {
    margin: '14px 0',
    width: '100%',
    maxWidth: '100%',
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },
  '.cm-obsidian-table': {
    width: '100%',
    maxWidth: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13.5px',
    lineHeight: '1.5',
    boxSizing: 'border-box',
  },
  '.cm-obsidian-table th.cm-table-cell': {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontWeight: '700',
    padding: '10px 14px',
    borderBottom: '2px solid #cbd5e1',
    borderRight: '1px solid #e2e8f0',
    outline: 'none',
    position: 'relative',
    userSelect: 'none',
    verticalAlign: 'top',
    textAlign: 'center',
  },
  '.cm-table-header-inner': {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  '.cm-table-header-text': {
    textAlign: 'center',
  },
  '.cm-obsidian-table th.cm-table-cell:focus': {
    backgroundColor: '#eff6ff',
    boxShadow: 'inset 0 0 0 2px #4f46e5',
  },
  '.cm-table-col-resizer': {
    position: 'absolute',
    top: '0',
    right: '-3px',
    bottom: '0',
    width: '6px',
    cursor: 'col-resize',
    userSelect: 'none',
    zIndex: '10',
    transition: 'background-color 0.15s ease',
  },
  '.cm-table-col-resizer:hover, .cm-table-col-resizer:active': {
    backgroundColor: '#3b82f6',
  },
  '.cm-obsidian-table td.cm-table-cell': {
    padding: '9px 14px',
    borderBottom: '1px solid #f1f5f9',
    borderRight: '1px solid #f1f5f9',
    color: '#334155',
    outline: 'none',
    verticalAlign: 'middle',
    textAlign: 'justify',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
  '.cm-obsidian-table td.cm-table-cell:focus': {
    backgroundColor: '#eff6ff',
    boxShadow: 'inset 0 0 0 2px #4f46e5',
  },
  '.cm-obsidian-table tr:hover td.cm-table-cell': {
    backgroundColor: '#fafafa',
  },
  '.cm-table-action-th, .cm-table-action-td': {
    borderBottom: '1px solid #f1f5f9',
  },
  '.cm-table-add-col-btn': {
    padding: '2px 6px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '10.5px',
    fontWeight: '700',
    borderRadius: '4px',
    border: '1px dashed #cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  '.cm-table-add-col-btn:hover': {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    borderColor: '#94a3b8',
  },
  '.cm-table-del-col-btn': {
    position: 'absolute',
    top: '1px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    border: 'none',
    backgroundColor: '#ffffff',
    color: '#94a3b8',
    fontSize: '9px',
    lineHeight: '1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    opacity: '0',
    transition: 'all 0.15s ease',
    zIndex: '5',
    padding: '0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  '.cm-table-header-cell:hover .cm-table-del-col-btn': {
    opacity: '0.7',
  },
  '.cm-table-del-col-btn:hover': {
    backgroundColor: '#fee2e2 !important',
    color: '#dc2626 !important',
    opacity: '1 !important',
  },
  '.cm-table-del-row-btn': {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: '15px',
    lineHeight: '1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  '.cm-table-del-row-btn:hover': {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  '.cm-table-footer-bar': {
    padding: '6px 12px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
  },
  '.cm-table-add-row-btn': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#4f46e5',
    backgroundColor: '#ffffff',
    border: '1px dashed #c7d2fe',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  '.cm-table-add-row-btn:hover': {
    backgroundColor: '#eff6ff',
    borderColor: '#818cf8',
    color: '#3730a3',
  },

  // Checklists
  '.cm-obsidian-task': {
    display: 'flex',
    alignItems: 'center',
    padding: '2px 4px',
    borderRadius: '6px',
  },
  '.cm-obsidian-task-done': {
    textDecoration: 'line-through',
    color: '#94a3b8',
    opacity: '0.75',
  },

  // Callouts
  '.cm-obsidian-callout': {
    borderRadius: '0 10px 10px 0',
    padding: '6px 12px',
    margin: '4px 0',
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
  },
  '.cm-obsidian-callout-note': {
    backgroundColor: '#eff6ff',
    borderLeftColor: '#3b82f6',
    color: '#1e3a8a',
  },
  '.cm-obsidian-callout-tip': {
    backgroundColor: '#ecfdf5',
    borderLeftColor: '#10b981',
    color: '#064e3b',
  },
  '.cm-obsidian-callout-warning': {
    backgroundColor: '#fffbeb',
    borderLeftColor: '#f59e0b',
    color: '#78350f',
  },

  // Quotes
  '.cm-obsidian-quote': {
    borderLeft: '3px solid #818cf8',
    paddingLeft: '10px',
    fontStyle: 'italic',
    color: '#475569',
    backgroundColor: '#f8fafc',
    borderRadius: '0 6px 6px 0',
    margin: '3px 0',
  },

  // Horizontal Rule
  '.cm-obsidian-hr': {
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '8px',
    marginBottom: '8px',
  },
});

// -------------------------------------------------------------
// 8. Obsidian Live Editor Component Export
// -------------------------------------------------------------
export interface ObsidianLiveEditorHandle {
  insertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  undo: () => void;
  redo: () => void;
  focus: () => void;
  getEditorView: () => EditorView | null;
}

interface ObsidianLiveEditorProps {
  value: string;
  onChange: (val: string) => void;
  onWikilinkClick?: (title: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const ObsidianLiveEditor = forwardRef<ObsidianLiveEditorHandle, ObsidianLiveEditorProps>(
  ({ value, onChange, onWikilinkClick, placeholder, autoFocus }, ref) => {
    const cmRef = useRef<ReactCodeMirrorRef>(null);

    // Checkbox toggle transaction handler in CodeMirror 6
    const handleToggleCheckbox = (from: number, to: number, nextChecked: boolean) => {
      const view = cmRef.current?.view;
      if (!view) return;

      const replacement = nextChecked ? '[x]' : '[ ]';
      view.dispatch({
        changes: { from, to, insert: replacement },
      });
    };

    // Table in-place update transaction handler
    const handleUpdateTable = (from: number, to: number, newTableMarkdown: string) => {
      const view = cmRef.current?.view;
      if (!view) return;

      view.dispatch({
        changes: { from, to, insert: newTableMarkdown },
      });
    };

    // Build plugins and extensions
    const extensions = useMemo(() => {
      return [
        markdown(),
        EditorView.lineWrapping,
        smartListKeymap,
        createObsidianLivePreviewPlugin(handleToggleCheckbox, handleUpdateTable, onWikilinkClick),
        obsidianLiveTheme,
      ];
    }, [onWikilinkClick]);

    // Imperative handle for toolbar buttons (Headings, Checklists, Tables, Undo, Redo, etc.)
    useImperativeHandle(ref, () => ({
      getEditorView: () => cmRef.current?.view || null,
      focus: () => cmRef.current?.view?.focus(),
      undo: () => {
        const view = cmRef.current?.view;
        if (view) {
          const evt = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
          view.contentDOM.dispatchEvent(evt);
        }
      },
      redo: () => {
        const view = cmRef.current?.view;
        if (view) {
          const evt = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true });
          view.contentDOM.dispatchEvent(evt);
        }
      },
      insertMarkdown: (prefix: string, suffix: string = '', defaultText: string = '') => {
        const view = cmRef.current?.view;
        if (!view) return;

        const state = view.state;
        const selection = state.selection.main;
        const { from, to } = selection;
        const selectedText = state.sliceDoc(from, to) || defaultText;

        // Line-based prefixes (H1, H2, H3, H4, Checklists, Callouts, Quotes, Numbered)
        if (['# ', '## ', '### ', '#### ', '- [ ] ', '- ', '1. ', '> [!NOTE]\n> ', '> [!TIP]\n> ', '> [!WARNING]\n> ', '> '].includes(prefix)) {
          const line = state.doc.lineAt(from);
          const lineText = line.text;
          const cleanPrefix = prefix.includes('\n') ? prefix.split('\n')[0] : prefix.trimEnd();
          const cleanedText = lineText.replace(/^(#{1,6}\s+|- \[[ xX]\]\s+|- \s+|(?:(?:\d+\.)+)\s+|> \[[^\]]+\]\s+|> \s+)/, '');
          const newLineText = `${cleanPrefix} ${cleanedText || defaultText}`;

          view.dispatch({
            changes: { from: line.from, to: line.to, insert: newLineText },
            selection: { anchor: line.from + newLineText.length },
          });
          view.focus();
          return;
        }

        // Table insertion
        if (prefix.startsWith('\n|') || prefix.startsWith('|')) {
          const tableText = '\n| Columna 1 | Columna 2 | Columna 3 |\n| :--- | :--- | :--- |\n| Dato A | Dato B | Dato C |\n';
          view.dispatch({
            changes: { from, to, insert: tableText },
            selection: { anchor: from + tableText.length },
          });
          view.focus();
          return;
        }

        // Inline wrapping (Bold, Italic, Highlight, Wikilink, Code)
        const wrapped = `${prefix}${selectedText}${suffix}`;
        view.dispatch({
          changes: { from, to, insert: wrapped },
          selection: { anchor: from + prefix.length + selectedText.length },
        });
        view.focus();
      },
    }));

    return (
      <div className="w-full flex-1 flex flex-col min-h-[460px] obsidian-live-preview-container select-text">
        <CodeMirror
          ref={cmRef}
          value={value}
          onChange={onChange}
          extensions={extensions}
          placeholder={placeholder || "Escribe aquí tu documento usando Markdown (# Título, ## Subtítulo, - [ ] Tarea, [[Nota]] Enlace)..."}
          autoFocus={autoFocus}
          basicSetup={{
            lineNumbers: false,
            highlightActiveLine: false,
            foldGutter: false,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            history: true,
          }}
          className="w-full flex-1 focus:outline-none"
        />
      </div>
    );
  }
);
