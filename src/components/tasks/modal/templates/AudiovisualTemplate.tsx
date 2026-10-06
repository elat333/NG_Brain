import React, { useState, useRef } from 'react';
import { Video, Plus, Trash, Trash2, Link as LinkIcon, Info, Image as ImageIcon, Loader2, UploadCloud, Eye, ExternalLink, X } from 'lucide-react';
import { uploadImageToStorage } from '../../../../lib/imageUtils';

interface AudiovisualTemplateProps {
  newTaskData: any;
  setNewTaskData: React.Dispatch<React.SetStateAction<any>>;
  canEdit?: boolean;
}

export const AudiovisualTemplate: React.FC<AudiovisualTemplateProps> = ({
  newTaskData,
  setNewTaskData,
  canEdit = true
}) => {
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);
  const [isUploadingReferences, setIsUploadingReferences] = useState(false);
  const [uploadingSceneIndex, setUploadingSceneIndex] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowFileInputRef = useRef<HTMLInputElement>(null);

  const [videoColWidths, setVideoColWidths] = useState<{ [key: string]: number }>({
    time: 80,
    stage: 110,
    visual: 240,
    onScreenText: 180,
    voiceOver: 200,
    observations: 150
  });

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

  const handleUploadSceneVisual = async (file: File, originalIndex: number) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingSceneIndex(originalIndex);
    try {
      const downloadUrl = await uploadImageToStorage(file, 'video_scenes');
      const newScenes = [...(newTaskData.designData?.videoScenes || [])];
      const prevVisual = newScenes[originalIndex]?.visual || '';
      newScenes[originalIndex] = {
        ...newScenes[originalIndex],
        visualImage: downloadUrl,
        visual: prevVisual.startsWith('data:image') ? '' : prevVisual
      };
      setNewTaskData({
        ...newTaskData,
        designData: {
          ...newTaskData.designData!,
          videoScenes: newScenes
        }
      });
    } catch (err) {
      console.error("Error uploading scene visual image:", err);
      alert("Error al subir la imagen para esta escena.");
    } finally {
      setUploadingSceneIndex(null);
      if (rowFileInputRef.current) rowFileInputRef.current.value = '';
    }
  };

  const handleVideoTablePaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, 
    startRowIdx: number, 
    startColName: string
  ) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || (!pasteData.includes(String.fromCharCode(9)) && !pasteData.includes(String.fromCharCode(10)))) return;
    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).filter(r => r.length > 0 || r.includes(String.fromCharCode(9)));
    if (rows.length === 0) return;
    const currentScenes = [...(newTaskData.designData?.videoScenes || [])];
    const customCols = newTaskData.designData?.customVideoColumns || [];
    const props = ['time', 'stage', 'visual', 'onScreenText', 'voiceOver', 'observations', ...customCols.map((c: any) => c.id)];
    const startPropIdx = props.indexOf(startColName);
    
    let currentRowIdx = startRowIdx;
    
    rows.forEach(rowStr => {
      const cols = rowStr.split(String.fromCharCode(9));
      if (!currentScenes[currentRowIdx]) {
        currentScenes.push({ id: Date.now().toString() + currentRowIdx + Math.random().toString(36).substr(2, 4), time: '', stage: '', visual: '', onScreenText: '', voiceOver: '', observations: '', customFields: {} });
      }
      cols.forEach((colData, colIdx) => {
        const propName = props[startPropIdx + colIdx];
        if (propName) {
            if (['time', 'stage', 'visual', 'onScreenText', 'voiceOver', 'observations'].includes(propName)) {
                (currentScenes[currentRowIdx] as any)[propName] = colData;
            } else {
                if (!currentScenes[currentRowIdx].customFields) currentScenes[currentRowIdx].customFields = {};
                currentScenes[currentRowIdx].customFields![propName] = colData;
            }
        }
      });
      currentRowIdx++;
    });
    
    setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: currentScenes } });
  };

  const videoScenes = (newTaskData.designData?.videoScenes?.length ? newTaskData.designData.videoScenes : [{ id: 'default-scene', time: '', stage: '', visual: '', onScreenText: '', voiceOver: '' }]);

  return (
    <div className="space-y-6 pt-4 border-t border-gray-100">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
            <Video size={14} className="text-purple-500" /> Guion Audiovisual
          </label>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button 
                type="button"
                onClick={() => {
                  const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], videoScenes: [], references: [] };
                  const newScenes = [...(currentDesignData.videoScenes || []), { id: Date.now().toString(), time: '', stage: '', visual: '', onScreenText: '', voiceOver: '' }];
                  setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, videoScenes: newScenes } });
                }}
                className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2"
              >
                <Plus size={14} /> Añadir Escena
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto border border-gray-100 rounded-2xl relative">
          <table className="min-w-full w-max text-left text-xs table-fixed">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
              <tr>
                <th style={{ width: videoColWidths.time }} className="p-0 border-r border-gray-100/50 relative group select-none">
                  <div className="px-4 py-3 flex items-center overflow-hidden">Tiempo</div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.time; const onMouseMove = (moveEvent: MouseEvent) => setVideoColWidths(prev => ({ ...prev, time: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                </th>
                <th style={{ width: videoColWidths.stage }} className="p-0 border-r border-gray-100/50 relative group select-none">
                  <div className="px-4 py-3 flex items-center overflow-hidden">Etapa</div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.stage; const onMouseMove = (moveEvent: MouseEvent) => setVideoColWidths(prev => ({ ...prev, stage: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                </th>
                <th style={{ width: videoColWidths.visual }} className="p-0 border-r border-gray-100/50 relative group select-none">
                  <div className="px-4 py-3 flex items-center overflow-hidden">Visual (imágenes / edición)</div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.visual; const onMouseMove = (moveEvent: MouseEvent) => setVideoColWidths(prev => ({ ...prev, visual: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                </th>
                <th style={{ width: videoColWidths.onScreenText }} className="p-0 border-r border-gray-100/50 relative group select-none">
                  <div className="px-4 py-3 flex items-center overflow-hidden">Texto en pantalla (claqueta)</div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.onScreenText; const onMouseMove = (moveEvent: MouseEvent) => setVideoColWidths(prev => ({ ...prev, onScreenText: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                </th>
                <th style={{ width: videoColWidths.voiceOver }} className="p-0 border-r border-gray-100/50 relative group select-none">
                  <div className="px-4 py-3 flex items-center overflow-hidden">Voz en off</div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.voiceOver; const onMouseMove = (moveEvent: MouseEvent) => setVideoColWidths(prev => ({ ...prev, voiceOver: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                </th>
                <th style={{ width: videoColWidths.observations || 200 }} className="p-0 border-r border-gray-100/50 relative group select-none">
                  <div className="px-4 py-3 flex items-center overflow-hidden">Observaciones</div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.observations || 200; const onMouseMove = (moveEvent: MouseEvent) => setVideoColWidths(prev => ({ ...prev, observations: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                </th>
                {newTaskData.designData?.customVideoColumns?.map((col: any, colIdx: number) => (
                  <th key={`modal_custom_video_col_${col.id || colIdx}_${colIdx}`} style={{ width: videoColWidths[col.id] || 200 }} className="p-0 border-r border-gray-100/50 relative group select-none group/th">
                    <div className="px-2 py-2 flex items-center justify-between overflow-hidden">
                      <input 
                        value={col.name}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const newCols = [...(newTaskData.designData?.customVideoColumns || [])];
                          const idx = newCols.findIndex((c: any) => c.id === col.id);
                          if (idx >= 0) newCols[idx].name = e.target.value;
                          setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, customVideoColumns: newCols } });
                        }}
                        className="w-full bg-transparent border-0 uppercase text-[10px] font-black tracking-wider text-gray-500 focus:ring-0 p-1"
                      />
                      {canEdit && (
                        <button 
                          onClick={() => {
                            const newCols = newTaskData.designData?.customVideoColumns?.filter((c: any) => c.id !== col.id) || [];
                            setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, customVideoColumns: newCols } });
                          }}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover/th:opacity-100 transition-all ml-1 p-1"
                          title="Eliminar columna"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths[col.id] || 200; const onMouseMove = (moveEvent: MouseEvent) => setVideoColWidths(prev => ({ ...prev, [col.id]: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                  </th>
                ))}
                {canEdit && (
                  <th className="px-2 py-3 w-10 border-l border-gray-100">
                    <button 
                      type="button"
                      onClick={() => {
                        const newId = 'col_' + Date.now();
                        const newCols = [...(newTaskData.designData?.customVideoColumns || []), { id: newId, name: 'Nueva Columna' }];
                        setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, customVideoColumns: newCols } });
                      }}
                      className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all flex items-center justify-center w-full"
                      title="Añadir columna"
                    >
                      <Plus size={14} />
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {videoScenes.map((scene: any, originalIndex: number) => (
                <tr key={`modal_video_scene_${scene.id || originalIndex}_${originalIndex}`} className="group hover:bg-gray-50/50">
                  <td className="p-1 border-r border-gray-100/50 align-top">
                    <textarea
                      rows={1}
                      placeholder="Ej: 0:00 - 0:05"
                      disabled={!canEdit}
                      className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                      style={{ minHeight: '36px' }}
                      ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                      onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      value={scene.time}
                      onChange={(e) => {
                        const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                        newScenes[originalIndex] = { ...scene, time: e.target.value };
                        setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                      }}
                      onPaste={(e) => handleVideoTablePaste(e, originalIndex, 'time')}
                    />
                  </td>
                  <td className="p-1 border-r border-gray-100/50 align-top">
                    <textarea
                      rows={1}
                      placeholder="Ej: Gancho"
                      disabled={!canEdit}
                      className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                      style={{ minHeight: '36px' }}
                      ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                      onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      value={scene.stage}
                      onChange={(e) => {
                        const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                        newScenes[originalIndex] = { ...scene, stage: e.target.value };
                        setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                      }}
                      onPaste={(e) => handleVideoTablePaste(e, originalIndex, 'stage')}
                    />
                  </td>
                  <td className="p-1 border-r border-gray-100/50 align-top">
                    <div className="flex flex-col gap-1.5 p-1">
                      <div className="flex items-center gap-1.5">
                        <textarea
                          rows={1}
                          placeholder="Ej: Imágenes dinámicas..."
                          disabled={!canEdit}
                          className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-1 resize-none overflow-hidden block text-xs"
                          style={{ minHeight: '32px' }}
                          ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                          onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                          value={scene.visual && scene.visual.startsWith('data:image') ? '' : (scene.visual || '')}
                          onChange={(e) => {
                            const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                            newScenes[originalIndex] = { ...scene, visual: e.target.value };
                            setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                          }}
                          onPaste={(e) => handleVideoTablePaste(e, originalIndex, 'visual')}
                        />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadingSceneIndex(originalIndex);
                              rowFileInputRef.current?.click();
                            }}
                            disabled={uploadingSceneIndex === originalIndex}
                            className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg shrink-0 transition-colors border border-purple-200/60 shadow-2xs cursor-pointer"
                            title="Subir imagen para esta escena"
                          >
                            {uploadingSceneIndex === originalIndex ? <Loader2 size={13} className="animate-spin text-purple-600" /> : <ImageIcon size={13} />}
                          </button>
                        )}
                      </div>

                      {/* Thumbnail preview if it has an attached image */}
                      {Boolean(scene.visualImage || (scene.visual && (scene.visual.startsWith('http://') || scene.visual.startsWith('https://') || scene.visual.startsWith('data:image')))) && (
                        (() => {
                          const activeRowImg = scene.visualImage || scene.visual;
                          return (
                            <div className="relative group/thumb inline-flex items-center gap-2 p-1.5 bg-purple-50/70 rounded-xl border border-purple-100 shadow-2xs">
                              <img
                                src={activeRowImg}
                                alt="Escena visual"
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
                                    const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                                    newScenes[originalIndex] = {
                                      ...scene,
                                      visualImage: '',
                                      visual: scene.visual?.startsWith('data:image') ? '' : scene.visual
                                    };
                                    setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
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
                  <td className="p-1 border-r border-gray-100/50 align-top">
                    <textarea
                      rows={1}
                      placeholder="Ej: ¿Trabajas en...?"
                      disabled={!canEdit}
                      className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                      style={{ minHeight: '36px' }}
                      ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                      onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      value={scene.onScreenText}
                      onChange={(e) => {
                        const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                        newScenes[originalIndex] = { ...scene, onScreenText: e.target.value };
                        setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                      }}
                      onPaste={(e) => handleVideoTablePaste(e, originalIndex, 'onScreenText')}
                    />
                  </td>
                  <td className="p-1 border-r border-gray-100/50 align-top">
                    <textarea
                      rows={1}
                      placeholder="Ej: Sabías que..."
                      disabled={!canEdit}
                      className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                      style={{ minHeight: '36px' }}
                      ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                      onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      value={scene.voiceOver}
                      onChange={(e) => {
                        const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                        newScenes[originalIndex] = { ...scene, voiceOver: e.target.value };
                        setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                      }}
                      onPaste={(e) => handleVideoTablePaste(e, originalIndex, 'voiceOver')}
                    />
                  </td>
                  <td className="p-1 border-r border-gray-100/50 align-top">
                    <textarea
                      rows={1}
                      placeholder="Observaciones..."
                      disabled={!canEdit}
                      className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                      style={{ minHeight: '36px' }}
                      ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                      onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      value={scene.observations || ''}
                      onChange={(e) => {
                        const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                        newScenes[originalIndex] = { ...scene, observations: e.target.value };
                        setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                      }}
                      onPaste={(e) => handleVideoTablePaste(e, originalIndex, 'observations')}
                    />
                  </td>
                  {newTaskData.designData?.customVideoColumns?.map((col: any, cIdx: number) => (
                    <td key={`scene_${scene.id || originalIndex}_col_${col.id || cIdx}_${cIdx}`} className="p-1 border-r border-gray-100/50 align-top">
                      <textarea
                        rows={1}
                        placeholder="..."
                        disabled={!canEdit}
                        className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                        style={{ minHeight: '36px' }}
                        ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                        onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                        value={scene.customFields?.[col.id] || ''}
                        onChange={(e) => {
                          const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                          newScenes[originalIndex] = { ...scene, customFields: { ...(scene.customFields || {}), [col.id]: e.target.value } };
                          setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                        }}
                        onPaste={(e) => handleVideoTablePaste(e, originalIndex, col.id)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right align-top border-l border-gray-100/50">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setSceneToDelete(scene.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
            if (e.target.files && e.target.files[0] && uploadingSceneIndex !== null) {
              handleUploadSceneVisual(e.target.files[0], uploadingSceneIndex);
            }
          }}
        />

        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
            <Info size={14} className="text-pink-500" /> Referencias Visuales & Moodboard
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

      {/* Modal Confirmación Borrar Escena */}
      {sceneToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-base font-black text-gray-900">¿Eliminar escena?</h3>
            <p className="text-xs text-gray-500">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setSceneToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const filtered = (newTaskData.designData?.videoScenes || []).filter((s: any) => s.id !== sceneToDelete);
                  setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData, videoScenes: filtered } });
                  setSceneToDelete(null);
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
