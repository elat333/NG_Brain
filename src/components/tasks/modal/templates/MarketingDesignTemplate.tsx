import React, { useState } from 'react';
import { Layers, Plus, Trash, Trash2, Link as LinkIcon, Info, Video } from 'lucide-react';
import { uploadImageToStorage } from '../../../../lib/imageUtils';

interface MarketingDesignTemplateProps {
  newTaskData: any;
  setNewTaskData: React.Dispatch<React.SetStateAction<any>>;
  canEdit?: boolean;
}

export const MarketingDesignTemplate: React.FC<MarketingDesignTemplateProps> = ({
  newTaskData,
  setNewTaskData,
  canEdit = true
}) => {
  const [slideToDelete, setSlideToDelete] = useState<number | null>(null);
  const [elementToDelete, setElementToDelete] = useState<string | null>(null);
  const [designColWidths, setDesignColWidths] = useState({
    element: 150,
    content: 250,
    visual: 200,
    observations: 200
  });

  const isCarousel = newTaskData.taskTemplate === 'design_carousel';

  const handleDesignTablePaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, 
    startRowIdx: number, 
    startColName: 'element' | 'content' | 'visual' | 'observations'
  ) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || (!pasteData.includes(String.fromCharCode(9)) && !pasteData.includes(String.fromCharCode(10)))) return;
    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).filter(r => r.length > 0 || r.includes(String.fromCharCode(9)));
    if (rows.length === 0) return;
    const currentElements = [...(newTaskData.designData?.elements || [])];
    const props: ('element' | 'content' | 'visual' | 'observations')[] = ['element', 'content', 'visual', 'observations'];
    const startPropIdx = props.indexOf(startColName);
    const targetSlide = isCarousel ? (currentElements[startRowIdx]?.slideIndex || 1) : 1;
    const slideItemIndices = isCarousel
      ? currentElements.map((el: any, idx: number) => ((el.slideIndex || 1) === targetSlide ? idx : -1)).filter((idx: number) => idx !== -1)
      : currentElements.map((_: any, idx: number) => idx);
    const relativeStartPos = slideItemIndices.indexOf(startRowIdx);
    const startPos = relativeStartPos >= 0 ? relativeStartPos : 0;
    let lastModifiedIdx = startRowIdx;

    rows.forEach((rowStr, rOffset) => {
      const cols = rowStr.split(String.fromCharCode(9));
      const targetPos = startPos + rOffset;
      let elementToUpdate: any;
      if (targetPos < slideItemIndices.length) {
        const actualIdx = slideItemIndices[targetPos];
        elementToUpdate = currentElements[actualIdx];
        lastModifiedIdx = actualIdx;
      } else {
        const newItem = {
          id: String(Date.now()) + '-' + Math.random().toString(36).substr(2, 6),
          element: '',
          content: '',
          visual: '',
          observations: '',
          ...(isCarousel ? { slideIndex: targetSlide } : {})
        };
        const insertAfterIdx = lastModifiedIdx;
        if (insertAfterIdx >= 0 && insertAfterIdx < currentElements.length) {
          currentElements.splice(insertAfterIdx + 1, 0, newItem);
          lastModifiedIdx = insertAfterIdx + 1;
        } else {
          currentElements.push(newItem);
          lastModifiedIdx = currentElements.length - 1;
        }
        elementToUpdate = newItem;
      }
      cols.forEach((colData, colIdx) => {
        const propToUpdate = props[startPropIdx + colIdx];
        if (propToUpdate && elementToUpdate) {
          elementToUpdate[propToUpdate] = colData;
        }
      });
    });

    setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: currentElements } });
  };

  let slides: number[] = isCarousel
    ? Array.from(new Set<number>((newTaskData.designData?.elements || []).map((e: any) => Number(e.slideIndex) || 1))).sort((a: number, b: number) => a - b)
    : [1];
  if (slides.length === 0) slides = [1];

  return (
    <div className="space-y-6 pt-4 border-t border-gray-100">
      {slides.map((slideIdx, sIdx) => {
        const slideElements = newTaskData.designData?.elements?.filter((e: any) => (e.slideIndex || 1) === slideIdx) || [];

        return (
          <div key={`modal_slide_${slideIdx}_${sIdx}`} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                <Layers size={14} className="text-purple-500" /> Elementos del Diseño {isCarousel ? `- Imagen ${slideIdx}` : ''}
              </label>
              <div className="flex items-center gap-2">
                {isCarousel && slides.length > 1 && canEdit && (
                  <button
                    type="button"
                    onClick={() => setSlideToDelete(slideIdx)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                    title="Eliminar imagen"
                  >
                    <Trash size={14} /> Borrar
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                      const newElements = [...(currentDesignData.elements || []), { id: Date.now().toString(), element: '', content: '', visual: '', observations: '', slideIndex: slideIdx }];
                      setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, elements: newElements } });
                    }}
                    className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> Añadir Fila
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl relative">
              <table className="min-w-full w-max text-left text-xs table-fixed">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                  <tr>
                    <th style={{ width: designColWidths.element }} className="p-0 border-r border-gray-100/50 relative group select-none">
                      <div className="px-4 py-3 flex items-center overflow-hidden">Elemento</div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors"
                        onMouseDown={(e) => {
                          const startX = e.pageX;
                          const startWidth = designColWidths.element;
                          const onMouseMove = (moveEvent: MouseEvent) => {
                            setDesignColWidths(prev => ({ ...prev, element: Math.max(50, startWidth + (moveEvent.pageX - startX)) }));
                          };
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                          };
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                        }}
                      />
                    </th>
                    <th style={{ width: designColWidths.content }} className="p-0 border-r border-gray-100/50 relative group select-none">
                      <div className="px-4 py-3 flex items-center overflow-hidden">Contenido / Copy</div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors"
                        onMouseDown={(e) => {
                          const startX = e.pageX;
                          const startWidth = designColWidths.content;
                          const onMouseMove = (moveEvent: MouseEvent) => {
                            setDesignColWidths(prev => ({ ...prev, content: Math.max(50, startWidth + (moveEvent.pageX - startX)) }));
                          };
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                          };
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                        }}
                      />
                    </th>
                    <th style={{ width: designColWidths.visual }} className="p-0 border-r border-gray-100/50 relative group select-none">
                      <div className="px-4 py-3 flex items-center overflow-hidden">Referencia Visual (Descriptivo)</div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors"
                        onMouseDown={(e) => {
                          const startX = e.pageX;
                          const startWidth = designColWidths.visual;
                          const onMouseMove = (moveEvent: MouseEvent) => {
                            setDesignColWidths(prev => ({ ...prev, visual: Math.max(50, startWidth + (moveEvent.pageX - startX)) }));
                          };
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                          };
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                        }}
                      />
                    </th>
                    <th style={{ width: designColWidths.observations }} className="p-0 relative group select-none">
                      <div className="px-4 py-3 flex items-center overflow-hidden">Observaciones</div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors"
                        onMouseDown={(e) => {
                          const startX = e.pageX;
                          const startWidth = designColWidths.observations;
                          const onMouseMove = (moveEvent: MouseEvent) => {
                            setDesignColWidths(prev => ({ ...prev, observations: Math.max(50, startWidth + (moveEvent.pageX - startX)) }));
                          };
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                          };
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {slideElements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No hay elementos agregados. Añade una fila para comenzar.</td>
                    </tr>
                  )}
                  {newTaskData.designData?.elements?.map((el: any, originalIndex: number) => {
                    if ((el.slideIndex || 1) !== slideIdx) return null;
                    return (
                      <tr key={`modal_slide_${slideIdx}_el_${el.id || originalIndex}_${originalIndex}`} className="group hover:bg-gray-50/50">
                        <td className="p-1 border-r border-gray-100/50 align-top">
                          <textarea
                            rows={1}
                            placeholder="Ej: Imagen principal"
                            disabled={!canEdit}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                            style={{ minHeight: '36px' }}
                            ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                            onInput={(e) => {
                              e.currentTarget.style.height = 'auto';
                              e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                            value={el.element}
                            onChange={(e) => {
                              const newElements = [...(newTaskData.designData?.elements || [])];
                              newElements[originalIndex] = { ...el, element: e.target.value };
                              setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: newElements } });
                            }}
                            onPaste={(e) => handleDesignTablePaste(e, originalIndex, 'element')}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-100/50 align-top">
                          <textarea
                            rows={1}
                            placeholder="Ej: Seguridad es primero"
                            disabled={!canEdit}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                            style={{ minHeight: '36px' }}
                            ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                            onInput={(e) => {
                              e.currentTarget.style.height = 'auto';
                              e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                            value={el.content}
                            onChange={(e) => {
                              const newElements = [...(newTaskData.designData?.elements || [])];
                              newElements[originalIndex] = { ...el, content: e.target.value };
                              setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: newElements } });
                            }}
                            onPaste={(e) => handleDesignTablePaste(e, originalIndex, 'content')}
                          />
                        </td>
                        <td className="p-1 border-r border-gray-100/50 align-top">
                          <textarea
                            rows={1}
                            placeholder="Ej: Foto en planta"
                            disabled={!canEdit}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                            style={{ minHeight: '36px' }}
                            ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                            onInput={(e) => {
                              e.currentTarget.style.height = 'auto';
                              e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                            value={el.visual}
                            onChange={(e) => {
                              const newElements = [...(newTaskData.designData?.elements || [])];
                              newElements[originalIndex] = { ...el, visual: e.target.value };
                              setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: newElements } });
                            }}
                            onPaste={(e) => handleDesignTablePaste(e, originalIndex, 'visual')}
                          />
                        </td>
                        <td className="p-1 align-top">
                          <textarea
                            rows={1}
                            placeholder="Evitar oscuros"
                            disabled={!canEdit}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                            style={{ minHeight: '36px' }}
                            ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                            onInput={(e) => {
                              e.currentTarget.style.height = 'auto';
                              e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                            value={el.observations}
                            onChange={(e) => {
                              const newElements = [...(newTaskData.designData?.elements || [])];
                              newElements[originalIndex] = { ...el, observations: e.target.value };
                              setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: newElements } });
                            }}
                            onPaste={(e) => handleDesignTablePaste(e, originalIndex, 'observations')}
                          />
                        </td>
                        <td className="px-2 py-2 text-right align-top">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setElementToDelete(el.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {isCarousel && canEdit && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => {
              const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
              const currentSlides: number[] = Array.from(new Set<number>((currentDesignData.elements || []).map((e: any) => Number(e.slideIndex) || 1)));
              const nextSlideIdx = currentSlides.length > 0 ? Math.max(...currentSlides) + 1 : 1;
              const newElements = [...(currentDesignData.elements || []), { id: Date.now().toString(), element: '', content: '', visual: '', observations: '', slideIndex: nextSlideIdx }];
              setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, elements: newElements } });
            }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 border border-transparent transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Añadir imagen al carrusel
          </button>
        </div>
      )}

      {/* Visual References */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
            <Info size={14} className="text-pink-500" /> Referencias Visuales
          </label>
          <div className="flex gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                  const newRefs = [...(currentDesignData.references || []), { id: Date.now().toString(), type: 'video_link' as const, url: '', comment: '' }];
                  setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                }}
                className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 shadow-sm"
                title="Añadir Link de Video"
              >
                <Video size={16} />
              </button>
            )}
          </div>
        </div>

        {canEdit && (
          <div
            className="w-full border-2 border-dashed border-gray-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer relative overflow-hidden group"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.add('border-pink-500', 'bg-pink-50');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-pink-500', 'bg-pink-50');
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-pink-500', 'bg-pink-50');
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                  try {
                    const downloadUrl = await uploadImageToStorage(file);
                    const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                    const newRefs = [...(currentDesignData.references || []), { id: Date.now().toString(), type: 'image' as const, url: downloadUrl, comment: '' }];
                    setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                  } catch (err) {
                    console.error("Error uploading image to storage:", err);
                    alert("Error al subir la imagen. Por favor, intenta de nuevo.");
                  }
                }
              }
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-pink-500 border border-gray-100">
              <Plus size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700">Arrastra y suelta imágenes de referencia aquí</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Soporta JPG, PNG, WebP</p>
            </div>
          </div>
        )}

        {newTaskData.designData?.references && newTaskData.designData.references.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {newTaskData.designData.references.map((ref: any, refIdx: number) => (
              <div key={`modal_ref_${ref.id || refIdx}_${refIdx}`} className="relative group bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden p-2 flex flex-col gap-2">
                {ref.type === 'image' ? (
                  <img src={ref.url} alt="Referencia" className="w-full h-24 object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    <LinkIcon size={24} />
                  </div>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                      const newRefs = (currentDesignData.references || []).filter((_: any, i: number) => i !== refIdx);
                      setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-white/90 text-rose-500 rounded-lg shadow-sm hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Confirmación Borrar Slide */}
      {slideToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-base font-black text-gray-900">¿Eliminar Imagen {slideToDelete}?</h3>
            <p className="text-xs text-gray-500">Se eliminarán todos los elementos de contenido asociados a esta imagen del carrusel.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSlideToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const filtered = (newTaskData.designData?.elements || []).filter((e: any) => (e.slideIndex || 1) !== slideToDelete);
                  setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData, elements: filtered } });
                  setSlideToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Borrar Elemento */}
      {elementToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-base font-black text-gray-900">¿Eliminar fila?</h3>
            <p className="text-xs text-gray-500">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setElementToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const filtered = (newTaskData.designData?.elements || []).filter((e: any) => e.id !== elementToDelete);
                  setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData, elements: filtered } });
                  setElementToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
