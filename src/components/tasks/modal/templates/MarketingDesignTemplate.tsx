import React, { useState, useRef } from 'react';
import { Layers, Plus, Trash, Trash2, Link as LinkIcon, Info, Video, Image as ImageIcon, Loader2, UploadCloud, Eye, ExternalLink, X } from 'lucide-react';
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
  const [isUploadingReferences, setIsUploadingReferences] = useState(false);
  const [uploadingRowIndex, setUploadingRowIndex] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowFileInputRef = useRef<HTMLInputElement>(null);

  const [designColWidths, setDesignColWidths] = useState({
    element: 150,
    content: 250,
    visual: 240,
    observations: 180
  });

  const isCarousel = newTaskData.taskTemplate === 'design_carousel';

  const handleUploadReferenceFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploadingReferences(true);
    try {
      const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
      const newUploadedRefs: any[] = [];

      for (const file of imageFiles) {
        const downloadUrl = await uploadImageToStorage(file, 'task_references');
        newUploadedRefs.push({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'image' as const,
          url: downloadUrl,
          comment: file.name
        });
      }

      setNewTaskData({
        ...newTaskData,
        designData: {
          ...currentDesignData,
          references: [...(currentDesignData.references || []), ...newUploadedRefs]
        }
      });
    } catch (err) {
      console.error("Error uploading reference images:", err);
      alert("Hubo un error al subir una o más imágenes de referencia.");
    } finally {
      setIsUploadingReferences(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadRowVisual = async (file: File, originalIndex: number) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingRowIndex(originalIndex);
    try {
      const downloadUrl = await uploadImageToStorage(file, 'design_elements');
      const newElements = [...(newTaskData.designData?.elements || [])];
      const prevVisual = newElements[originalIndex]?.visual || '';
      newElements[originalIndex] = {
        ...newElements[originalIndex],
        visualImage: downloadUrl,
        visual: prevVisual.startsWith('data:image') ? '' : prevVisual
      };
      setNewTaskData({
        ...newTaskData,
        designData: {
          ...newTaskData.designData!,
          elements: newElements
        }
      });
    } catch (err) {
      console.error("Error uploading element visual image:", err);
      alert("Error al subir la imagen para este elemento de diseño.");
    } finally {
      setUploadingRowIndex(null);
      if (rowFileInputRef.current) rowFileInputRef.current.value = '';
    }
  };

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
                          <div className="flex flex-col gap-1.5 p-1">
                            <div className="flex items-center gap-1.5">
                              <textarea
                                rows={1}
                                placeholder="Ej: Foto en planta o notas..."
                                disabled={!canEdit}
                                className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-1 resize-none overflow-hidden block text-xs"
                                style={{ minHeight: '32px' }}
                                ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                                onInput={(e) => {
                                  e.currentTarget.style.height = 'auto';
                                  e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                }}
                                value={el.visual && el.visual.startsWith('data:image') ? '' : (el.visual || '')}
                                onChange={(e) => {
                                  const newElements = [...(newTaskData.designData?.elements || [])];
                                  newElements[originalIndex] = { ...el, visual: e.target.value };
                                  setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: newElements } });
                                }}
                                onPaste={(e) => handleDesignTablePaste(e, originalIndex, 'visual')}
                              />
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUploadingRowIndex(originalIndex);
                                    rowFileInputRef.current?.click();
                                  }}
                                  disabled={uploadingRowIndex === originalIndex}
                                  className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg shrink-0 transition-colors border border-purple-200/60 shadow-2xs cursor-pointer"
                                  title="Subir imagen para este elemento"
                                >
                                  {uploadingRowIndex === originalIndex ? <Loader2 size={13} className="animate-spin text-purple-600" /> : <ImageIcon size={13} />}
                                </button>
                              )}
                            </div>

                            {/* Thumbnail preview if it has an attached image */}
                            {Boolean(el.visualImage || (el.visual && (el.visual.startsWith('http://') || el.visual.startsWith('https://') || el.visual.startsWith('data:image')))) && (
                              (() => {
                                const activeRowImg = el.visualImage || el.visual;
                                return (
                                  <div className="relative group/thumb inline-flex items-center gap-2 p-1.5 bg-purple-50/70 rounded-xl border border-purple-100 shadow-2xs">
                                    <img
                                      src={activeRowImg}
                                      alt="Referencia fila"
                                      className="w-10 h-10 object-cover rounded-lg border border-white shadow-xs cursor-pointer hover:opacity-90"
                                      onClick={() => setPreviewImageUrl(activeRowImg)}
                                    />
                                    <div className="flex flex-col text-[10px] text-gray-500 overflow-hidden max-w-[120px]">
                                      <span className="font-bold text-purple-700 truncate">Imagen adjunta</span>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImageUrl(activeRowImg)}
                                        className="text-blue-600 hover:underline flex items-center gap-0.5 text-[9px] font-semibold cursor-pointer text-left"
                                      >
                                        Ver en grande <ExternalLink size={9} />
                                      </button>
                                    </div>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newElements = [...(newTaskData.designData?.elements || [])];
                                          newElements[originalIndex] = {
                                            ...el,
                                            visualImage: '',
                                            visual: el.visual?.startsWith('data:image') ? '' : el.visual
                                          };
                                          setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: newElements } });
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded ml-auto cursor-pointer"
                                        title="Quitar imagen"
                                      >
                                        <Trash size={11} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })()
                            )}
                          </div>
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
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
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
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 border border-transparent transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus size={14} /> Añadir imagen al carrusel
          </button>
        </div>
      )}

      {/* Visual References */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUploadReferenceFiles(e.target.files);
            }
          }}
        />
        <input
          type="file"
          ref={rowFileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0] && uploadingRowIndex !== null) {
              handleUploadRowVisual(e.target.files[0], uploadingRowIndex);
            }
          }}
        />

        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
            <Info size={14} className="text-pink-500" /> Referencias Visuales & Mockups
          </label>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingReferences}
                  className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-all border border-pink-200/60 shadow-xs flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight cursor-pointer"
                  title="Subir imágenes desde tu equipo"
                >
                  <UploadCloud size={14} /> Subir Imágenes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                    const newRefs = [...(currentDesignData.references || []), { id: Date.now().toString(), type: 'video_link' as const, url: '', comment: '' }];
                    setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                  }}
                  className="p-1.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 shadow-xs cursor-pointer"
                  title="Añadir Link de Video o Web"
                >
                  <Video size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {canEdit && (
          <div
            onClick={() => {
              if (!isUploadingReferences) {
                fileInputRef.current?.click();
              }
            }}
            className={`w-full border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer relative overflow-hidden group ${
              isUploadingReferences 
                ? 'border-pink-400 bg-pink-50/50 cursor-wait' 
                : 'border-gray-200 bg-gray-50/50 hover:bg-pink-50/40 hover:border-pink-400'
            }`}
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
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-pink-500', 'bg-pink-50');
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleUploadReferenceFiles(e.dataTransfer.files);
              }
            }}
          >
            {isUploadingReferences ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 size={32} className="animate-spin text-pink-500" />
                <p className="text-xs font-bold text-pink-700">Subiendo y optimizando imágenes a Full HD...</p>
                <p className="text-[10px] text-pink-400">Por favor espera un momento</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-pink-500 border border-gray-100 group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-700 group-hover:text-pink-600 transition-colors">
                    Haz clic aquí o arrastra tus imágenes de referencia
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Soporta JPG, PNG, WebP (Optimización automática 1080p)</p>
                </div>
              </>
            )}
          </div>
        )}

        {newTaskData.designData?.references && newTaskData.designData.references.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {newTaskData.designData.references.map((ref: any, refIdx: number) => (
              <div key={`modal_ref_${ref.id || refIdx}_${refIdx}`} className="relative group bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden p-2 flex flex-col gap-2 shadow-2xs">
                {ref.type === 'image' ? (
                  <div className="relative overflow-hidden rounded-xl bg-slate-900 group/img">
                    <img 
                      src={ref.url} 
                      alt="Referencia" 
                      className="w-full h-24 object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-105" 
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(ref.url)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      title="Ver en grande"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    <LinkIcon size={24} />
                  </div>
                )}

                {ref.type === 'video_link' && (
                  <input
                    type="text"
                    placeholder="URL del video o web..."
                    disabled={!canEdit}
                    className="w-full text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-pink-500"
                    value={ref.url || ''}
                    onChange={(e) => {
                      const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                      const newRefs = [...(currentDesignData.references || [])];
                      newRefs[refIdx] = { ...newRefs[refIdx], url: e.target.value };
                      setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                    }}
                  />
                )}

                <input
                  type="text"
                  placeholder="Comentario / Nota..."
                  disabled={!canEdit}
                  className="w-full text-[10px] px-2 py-1 bg-transparent border-0 focus:ring-1 focus:ring-pink-500 text-gray-600 rounded"
                  value={ref.comment || ''}
                  onChange={(e) => {
                    const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                    const newRefs = [...(currentDesignData.references || [])];
                    newRefs[refIdx] = { ...newRefs[refIdx], comment: e.target.value };
                    setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                  }}
                />

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                      const newRefs = (currentDesignData.references || []).filter((_: any, i: number) => i !== refIdx);
                      setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-white/90 text-rose-500 rounded-lg shadow-sm hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                    title="Eliminar referencia"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Modal de Vista Previa de Imagen */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-3 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 p-2 bg-slate-900 text-white rounded-full hover:bg-rose-600 transition-colors shadow-lg cursor-pointer"
            >
              <X size={18} />
            </button>
            <img src={previewImageUrl} alt="Vista previa" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
            <div className="w-full flex justify-between items-center px-4 pt-3">
              <span className="text-xs text-gray-500 font-medium truncate max-w-xs">{previewImageUrl}</span>
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                Abrir Original <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

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
