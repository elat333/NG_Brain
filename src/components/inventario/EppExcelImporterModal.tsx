import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  ArrowRight,
  Boxes,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Info,
  Check,
  PackagePlus,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductItem, Warehouse, InventoryStockItem, TeamMember } from '../../types';
import { db, doc, writeBatch, collection } from '../../lib/firebase';

export interface EppExcelImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  existingProducts: ProductItem[];
  existingStockItems: InventoryStockItem[];
  currentMember: TeamMember | null | undefined;
  onSuccess?: (stats: { productsCreated: number; productsUpdated: number; stockUpdated: number }) => void;
}

export interface ParsedEppItem {
  id: string;
  sku: string;
  name: string;
  category: 'epp';
  subcategory: string;
  description: string;
  technicalSpecs: string;
  certificationsOrNorms: string[];
  basePrice: number;
  costPrice: number;
  imageUrl: string;
  documentsUrl: string;
  notes: string;
  stock: number;
  size: string;
  status: 'activo';
  isExistingInCatalog: boolean;
  existingProductId?: string;
  selected: boolean;
}

// Helper to remove accents and clean string for comparison
function cleanStr(str: any): string {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

function parsePrice(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[$€\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseStockQty(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.max(0, Math.floor(val));
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

// Clean object for Firestore (remove undefined)
function cleanObjectForFirestore(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanObjectForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
}

export const EppExcelImporterModal: React.FC<EppExcelImporterModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  existingProducts,
  existingStockItems,
  currentMember,
  onSuccess
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<ParsedEppItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    warehouses[0]?.id || ''
  );
  const [importToCatalog, setImportToCatalog] = useState<boolean>(true);
  const [importInitialStock, setImportInitialStock] = useState<boolean>(true);
  const [updateExistingCatalog, setUpdateExistingCatalog] = useState<boolean>(true);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [dragOver, setDragOver] = useState<boolean>(false);

  // Sync selectedWarehouseId if empty and warehouses available
  React.useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Convert raw row keys to normalized fields
  const mapRowToEppItem = (row: Record<string, any>, index: number): ParsedEppItem | null => {
    const keys = Object.keys(row);
    if (keys.length === 0) return null;

    let sku = '';
    let name = '';
    let normas = '';
    let puVenta = 0;
    let pvp = 0;
    let precioSinIva = 0;
    let linkFoto = '';
    let linkFicha = '';
    let linkWeb = '';
    let descripcion = '';
    let stock = 0;
    let talla = '';

    for (const key of keys) {
      const normKey = cleanStr(key);
      const val = row[key];

      if (normKey.includes('codigo') || normKey.includes('sku') || normKey === 'cod') {
        sku = String(val || '').trim();
      } else if (normKey.includes('nombre') || normKey.includes('epp') || normKey.includes('producto')) {
        name = String(val || '').trim();
      } else if (normKey.includes('norma') || normKey.includes('certifica')) {
        normas = String(val || '').trim();
      } else if (normKey.includes('pu venta') || normKey.includes('venta sin iva')) {
        puVenta = parsePrice(val);
      } else if (normKey === 'pvp' || normKey.includes('precio venta') || normKey.includes('pvp sin iva')) {
        pvp = parsePrice(val);
      } else if (normKey.includes('precio sin iva') || normKey.includes('costo') || normKey.includes('precio compra')) {
        precioSinIva = parsePrice(val);
      } else if (normKey.includes('link foto') || normKey.includes('link de foto') || (normKey.includes('foto') && !normKey.includes('ficha'))) {
        linkFoto = String(val || '').trim();
      } else if (normKey.includes('ficha') || normKey.includes('tecnica') || normKey.includes('pdf')) {
        linkFicha = String(val || '').trim();
      } else if (normKey.includes('web') || normKey.includes('url')) {
        linkWeb = String(val || '').trim();
      } else if (normKey.includes('descrip') || normKey.includes('detalle')) {
        descripcion = String(val || '').trim();
      } else if (normKey.includes('stock') || normKey.includes('cantidad') || normKey.includes('cant') || normKey.includes('existencia')) {
        stock = parseStockQty(val);
      } else if (normKey.includes('talla') || normKey.includes('medida')) {
        talla = String(val || '').trim();
      }
    }

    // Fallbacks if not recognized by specific prefix
    if (!sku && row['Código Novagreen']) sku = String(row['Código Novagreen']).trim();
    if (!name && row['Nombre Novagreen']) name = String(row['Nombre Novagreen']).trim();
    if (!name && row['Nombre del EPP']) name = String(row['Nombre del EPP']).trim();

    // Must have at least name or sku to be valid
    if (!name && !sku) return null;
    if (!name) name = `EPP ${sku}`;
    if (!sku) sku = `EPP-${(index + 1).toString().padStart(4, '0')}`;

    // Price resolution
    const finalBasePrice = puVenta > 0 ? puVenta : (pvp > 0 ? pvp : 0);
    const finalCostPrice = precioSinIva > 0 ? precioSinIva : (finalBasePrice > 0 ? finalBasePrice * 0.7 : 0);

    // Certifications array
    const certsArray = normas
      ? normas.split(/[,;\n/]+/).map(c => c.trim()).filter(c => c.length > 0)
      : [];

    // Check if exists in existing catalog
    const existing = existingProducts.find(
      p =>
        (p.sku && p.sku.trim().toLowerCase() === sku.toLowerCase()) ||
        (p.name && p.name.trim().toLowerCase() === name.toLowerCase())
    );

    const generatedId = existing ? existing.id : `prod-epp-${sku.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-${Date.now().toString().slice(-4)}`;

    return {
      id: generatedId,
      sku,
      name,
      category: 'epp',
      subcategory: 'Equipo de Protección Personal (EPP)',
      description: descripcion || `${name} con certificación ${normas || 'estándar de seguridad'}.`,
      technicalSpecs: normas ? `Normas: ${normas}` : '',
      certificationsOrNorms: certsArray,
      basePrice: finalBasePrice,
      costPrice: finalCostPrice,
      imageUrl: linkFoto,
      documentsUrl: linkFicha,
      notes: linkWeb ? `Ficha Web: ${linkWeb}` : '',
      stock,
      size: talla,
      status: 'activo',
      isExistingInCatalog: Boolean(existing),
      existingProductId: existing?.id,
      selected: true
    };
  };

  // Handle Excel / CSV File
  const handleFileChange = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const mapped: ParsedEppItem[] = [];
        rawJson.forEach((row, idx) => {
          const item = mapRowToEppItem(row, idx);
          if (item) mapped.push(item);
        });

        setParsedItems(mapped);
      } catch (err) {
        console.error('Error reading Excel:', err);
        alert('Error al leer el archivo Excel. Asegúrate de que no esté protegido o dañado.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Pasted Text from Google Sheets / Excel
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      alert('Por favor pega los datos de tu hoja de cálculo primero.');
      return;
    }

    try {
      // Split into lines
      const lines = pastedText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        alert('El texto pegado debe contener al menos una fila de encabezados y una fila de datos.');
        return;
      }

      // Detect separator: Tab (\t) is standard for Google Sheets & Excel copy
      const headerLine = lines[0];
      const separator = headerLine.includes('\t') ? '\t' : (headerLine.includes(';') ? ';' : ',');
      const headers = headerLine.split(separator).map(h => h.trim());

      const mapped: ParsedEppItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const cells = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cells[idx] || '';
        });

        const item = mapRowToEppItem(rowObj, i - 1);
        if (item) mapped.push(item);
      }

      setParsedItems(mapped);
      setFileName(`Datos pegados (${mapped.length} filas detectadas)`);
    } catch (err) {
      console.error('Error parsing pasted text:', err);
      alert('Error al procesar el texto pegado. Verifica el formato de las columnas.');
    }
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setParsedItems(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const handleToggleItem = (id: string) => {
    setParsedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Filtered Items for Preview Table
  const filteredItems = useMemo(() => {
    if (!filterSearch.trim()) return parsedItems;
    const term = filterSearch.toLowerCase();
    return parsedItems.filter(
      item =>
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.technicalSpecs.toLowerCase().includes(term) ||
        item.size.toLowerCase().includes(term)
    );
  }, [parsedItems, filterSearch]);

  // Summary counts
  const stats = useMemo(() => {
    const selected = parsedItems.filter(i => i.selected);
    const newItems = selected.filter(i => !i.isExistingInCatalog);
    const existingItems = selected.filter(i => i.isExistingInCatalog);
    const itemsWithStock = selected.filter(i => i.stock > 0);
    const totalStockQty = selected.reduce((acc, curr) => acc + curr.stock, 0);

    return {
      total: parsedItems.length,
      selectedCount: selected.length,
      newCount: newItems.length,
      existingCount: existingItems.length,
      withStockCount: itemsWithStock.length,
      totalStockUnits: totalStockQty
    };
  }, [parsedItems]);

  // Execute Import to Firestore
  const handleExecuteImport = async () => {
    const selectedItems = parsedItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      alert('Por favor selecciona al menos un producto para importar.');
      return;
    }

    if (importInitialStock && !selectedWarehouseId) {
      alert('Por favor selecciona una bodega para cargar el stock inicial.');
      return;
    }

    const selectedWh = warehouses.find(w => w.id === selectedWarehouseId);
    if (importInitialStock && !selectedWh) {
      alert('Bodega de destino no válida.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);

    try {
      const now = new Date().toISOString();
      let createdProductsCount = 0;
      let updatedProductsCount = 0;
      let stockItemsCount = 0;

      // Group operations in chunks of 350 to respect Firestore limit of 500
      const CHUNK_SIZE = 350;
      const chunks: ParsedEppItem[][] = [];
      for (let i = 0; i < selectedItems.length; i += CHUNK_SIZE) {
        chunks.push(selectedItems.slice(i, i + CHUNK_SIZE));
      }

      for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
        const chunk = chunks[cIdx];
        const batch = writeBatch(db);

        for (const item of chunk) {
          // 1. Guardar en Catálogo de Productos si está habilitado
          if (importToCatalog) {
            if (!item.isExistingInCatalog || updateExistingCatalog) {
              const productRef = doc(db, 'products', item.id);
              const productPayload: ProductItem = {
                id: item.id,
                sku: item.sku,
                name: item.name,
                category: 'epp',
                subcategory: item.subcategory,
                description: item.description,
                technicalSpecs: item.technicalSpecs,
                certificationsOrNorms: item.certificationsOrNorms,
                basePrice: item.basePrice,
                costPrice: item.costPrice,
                currency: 'USD',
                imageUrl: item.imageUrl || undefined,
                documentsUrl: item.documentsUrl || undefined,
                notes: item.notes || undefined,
                status: 'activo',
                createdAt: item.isExistingInCatalog ? (existingProducts.find(p => p.id === item.id)?.createdAt || now) : now,
                updatedAt: now
              };

              batch.set(productRef, cleanObjectForFirestore(productPayload), { merge: true });

              if (item.isExistingInCatalog) {
                updatedProductsCount++;
              } else {
                createdProductsCount++;
              }
            }
          }

          // 2. Guardar en Inventario de Bodega si está habilitado y tiene stock > 0
          if (importInitialStock && selectedWh && item.stock > 0) {
            const stockDocId = `${selectedWh.id}_${item.id}`;
            const existingStock = existingStockItems.find(
              s => s.id === stockDocId || (s.warehouseId === selectedWh.id && s.productId === item.id)
            );

            const initialSizes: Record<string, number> = { ...(existingStock?.sizesStock || {}) };
            if (item.size && item.size.trim() && item.size !== 'Estándar') {
              initialSizes[item.size.trim()] = (initialSizes[item.size.trim()] || 0) + item.stock;
            }

            const newStockQty = (existingStock?.currentStock || 0) + item.stock;

            const stockRef = doc(db, 'inventory_stock', stockDocId);
            const stockPayload: InventoryStockItem = {
              id: stockDocId,
              warehouseId: selectedWh.id,
              warehouseName: selectedWh.name,
              productId: item.id,
              productName: item.name,
              productSku: item.sku,
              productCategory: 'epp',
              currentStock: newStockQty,
              minStock: existingStock?.minStock || 5,
              unit: 'unidad',
              sizesStock: Object.keys(initialSizes).length > 0 ? initialSizes : undefined,
              updatedAt: now
            };

            batch.set(stockRef, cleanObjectForFirestore(stockPayload), { merge: true });
            stockItemsCount++;
          }
        }

        await batch.commit();
        setProcessProgress(Math.round(((cIdx + 1) / chunks.length) * 100));
      }

      alert(
        `¡Importación completada con éxito!\n\n` +
        `• Productos creados en Catálogo: ${createdProductsCount}\n` +
        `• Productos actualizados en Catálogo: ${updatedProductsCount}\n` +
        (importInitialStock && selectedWh
          ? `• Ítems con stock inicial ingresados en "${selectedWh.name}": ${stockItemsCount} (${stats.totalStockUnits} unidades totales)\n`
          : '')
      );

      if (onSuccess) {
        onSuccess({
          productsCreated: createdProductsCount,
          productsUpdated: updatedProductsCount,
          stockUpdated: stockItemsCount
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Error importing EPP products:', err);
      alert('Error durante la importación: ' + (err?.message || err));
    } finally {
      setIsProcessing(false);
      setProcessProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Importar Catálogo y Stock de EPP desde Excel / Google Sheets
                <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full">
                  Masivo
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sube tu hoja de cálculo o pega directamente las filas copiadas desde tu Google Sheet (BD_EPP y Equipos).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Options & Settings Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-emerald-600" />
                Bodega Destino para Stock Inicial
              </label>
              <select
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                disabled={!importInitialStock || isProcessing}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code}) - {wh.type === 'fija' ? 'Almacén' : 'Móvil'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-center space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={importToCatalog}
                  onChange={e => setImportToCatalog(e.target.checked)}
                  disabled={isProcessing}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Guardar / Actualizar en Catálogo de Productos (EPP)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={importInitialStock}
                  onChange={e => setImportInitialStock(e.target.checked)}
                  disabled={isProcessing}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Ingresar Stock Inicial en la Bodega seleccionada</span>
              </label>
            </div>

            <div className="flex flex-col justify-center space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={updateExistingCatalog}
                  onChange={e => setUpdateExistingCatalog(e.target.checked)}
                  disabled={isProcessing || !importToCatalog}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Actualizar precios y fotos si el código ya existe</span>
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                💡 Los productos de otras categorías (Certificación, etc.) nunca son alterados.
              </div>
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveInputTab('upload')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all border-b-2 ${
                  activeInputTab === 'upload'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Upload size={16} />
                Subir Archivo Excel (.xlsx / .csv)
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('paste')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all border-b-2 ${
                  activeInputTab === 'paste'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <ClipboardPaste size={16} />
                Copiar y Pegar desde Google Sheets / Excel
              </button>
            </div>

            {/* TAB 1: Upload File */}
            {activeInputTab === 'upload' && (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileChange(file);
                }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/20'
                }`}
                onClick={() => document.getElementById('epp-file-input')?.click()}
              >
                <input
                  id="epp-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                  {fileName ? fileName : 'Selecciona o arrastra tu archivo Excel aquí'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Formatos compatibles: <span className="font-semibold text-slate-700 dark:text-slate-300">.xlsx, .xls, .csv</span>.
                  Reconoce automáticamente columnas de Código, Nombre, Normas, Fotos, Fichas Técnicas, Precios y Stock.
                </p>
                {fileName && (
                  <span className="inline-block mt-3 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-3 py-1 rounded-full">
                    ✓ Archivo cargado con éxito
                  </span>
                )}
              </div>
            )}

            {/* TAB 2: Paste from Google Sheets */}
            {activeInputTab === 'paste' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Pega las celdas copiadas (incluyendo la fila de títulos de columna):</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText(
                        'Código Novagreen\tNombre Novagreen\tNormas\tPU Venta Sin Iva\tPVP\tLink Foto\tLink Ficha Técnica Novagreen\tFoto\tLink Web\tDescripcion\tprecio Sin IVa\tStock\tTalla (Opcional)\n' +
                        'EPP-CAS-01\tCasco de Seguridad Tipo 1 Clase E\tANSI Z89.1\t12.50\t14.00\thttps://novagreen.ec/img/casco.jpg\thttps://novagreen.ec/pdf/casco.pdf\t\t\tCasco con barboquejo\t8.50\t25\tEstándar\n' +
                        'EPP-BOT-02\tBota de Seguridad con Puntera\tASTM F2413\t45.00\t50.40\t\t\t\t\tBota de cuero dieléctrica\t32.00\t10\t41'
                      );
                    }}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Insertar ejemplo de prueba
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Selecciona las filas en Google Sheets, presiona Ctrl+C y luego pega aquí con Ctrl+V..."
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Sparkles size={14} />
                    Procesar Filas Pegadas
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Section */}
          {parsedItems.length > 0 && (
            <div className="space-y-4 pt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                    Total Detectados
                  </span>
                  <span className="text-xl font-bold text-slate-800 dark:text-white">
                    {stats.selectedCount} <span className="text-xs font-normal text-slate-400">/ {stats.total}</span>
                  </span>
                </div>

                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-2xl">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                    Nuevos en Catálogo
                  </span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {stats.newCount}
                  </span>
                </div>

                <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-2xl">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium block">
                    Existentes a Actualizar
                  </span>
                  <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                    {stats.existingCount}
                  </span>
                </div>

                <div className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 p-3 rounded-2xl">
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium block">
                    Unidades de Stock Inicial
                  </span>
                  <span className="text-xl font-bold text-teal-700 dark:text-teal-300">
                    {stats.totalStockUnits} <span className="text-xs font-normal">en {stats.withStockCount} ítems</span>
                  </span>
                </div>
              </div>

              {/* Table Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Seleccionar todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  >
                    Deseleccionar todos
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    placeholder="Filtrar por código o nombre..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={stats.selectedCount === stats.total && stats.total > 0}
                          onChange={e => handleToggleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                      </th>
                      <th className="p-3">Código</th>
                      <th className="p-3">Nombre del EPP</th>
                      <th className="p-3">Normas / Specs</th>
                      <th className="p-3 text-right">P. Venta</th>
                      <th className="p-3 text-right">Costo</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3">Talla</th>
                      <th className="p-3 text-center">Estado Catálogo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => handleToggleItem(item.id)}
                        className={`cursor-pointer transition-colors ${
                          item.selected
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                            : 'opacity-50 hover:opacity-80 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(item.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-700 dark:text-slate-200">
                          {item.sku}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-white max-w-xs truncate">
                          {item.name}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {item.technicalSpecs || '—'}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-800 dark:text-slate-200">
                          ${item.basePrice.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-slate-500 dark:text-slate-400">
                          ${item.costPrice.toFixed(2)}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {item.stock > 0 ? `+${item.stock}` : '0'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {item.size || 'Estándar'}
                        </td>
                        <td className="p-3 text-center">
                          {item.isExistingInCatalog ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                              Actualizará
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              ✓ Nuevo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Info size={16} className="text-emerald-600 flex-shrink-0" />
            <span>
              Se guardará con la categoría <strong>"epp"</strong> oficial y quedará disponible para inventario, facturas y actas de entrega.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing || stats.selectedCount === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Importando ({processProgress}%)...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Confirmar e Importar ({stats.selectedCount} productos)
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
