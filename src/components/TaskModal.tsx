import { 
  X, Check, AlertCircle, Plus, Trash2, Trash, Edit2, Edit, Clock, Calendar, 
  User, Tag, CheckSquare, Paperclip, MessageSquare, AlertTriangle, 
  ExternalLink, ChevronRight, Layers, FileText, Layout, LayoutTemplate, Video, 
  Info, History, CheckCircle2, ChevronDown, ChevronUp, Link as LinkIcon, 
  Lock, Activity, FolderKanban, AlignLeft, Users, UserPlus, Zap, Ban, Copy 
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { processAndCompressImage } from '../lib/imageUtils';
import { Task, TeamMember, Role, Process, Project } from '../types';
interface TaskModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  newTaskData: any;
  setNewTaskData: React.Dispatch<React.SetStateAction<any>>;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  currentMember: TeamMember | null;
  roles: Role[];
  processes: Process[];
  projects: Project[];
  members: TeamMember[];
  tasks: Task[];
  isNewTask: boolean;
  isProcessLeader: boolean;
  canEditMetadataField: any;
  canEditStatusField: any;
  canEditPlanning: boolean;
  canEditExecution: boolean;
  showTaskHistory: boolean;
  setShowTaskHistory: (show: boolean) => void;
  setTasks?: any;
  setEditingTask?: any;
  handleDeleteTask?: any;
}
export default function TaskModal({
  isOpen,
  editingTask,
  newTaskData,
  setNewTaskData,
  onSave,
  onClose,
  currentMember,
  roles,
  processes,
  projects,
  members,
  tasks,
  isNewTask,
  isProcessLeader,
  canEditMetadataField,
  canEditStatusField,
  canEditPlanning,
  canEditExecution,
  showTaskHistory,
  setShowTaskHistory,
  setTasks,
  setEditingTask,
  handleDeleteTask
}: TaskModalProps) {
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<number | null>(null);
  const [elementToDelete, setElementToDelete] = useState<string | null>(null);
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);

  const [showAddAuxDropdown, setShowAddAuxDropdown] = useState(false);
  const [auxSearchQuery, setAuxSearchQuery] = useState('');
  const [showAddBlockerDropdown, setShowAddBlockerDropdown] = useState(false);
  const [blockerSearchQuery, setBlockerSearchQuery] = useState('');
  const [blockerSelectedProjectId, setBlockerSelectedProjectId] = useState('all');
  const [blockerSelectedProcessId, setBlockerSelectedProcessId] = useState('all');
  const [showAddBlocksDropdown, setShowAddBlocksDropdown] = useState(false);
  const [blocksSearchQuery, setBlocksSearchQuery] = useState('');
  const [blocksSelectedProjectId, setBlocksSelectedProjectId] = useState('all');
  const [blocksSelectedProcessId, setBlocksSelectedProcessId] = useState('all');

  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members]);

  const isTaskBlocked = (id: string, allTasks: Task[]): { isBlocked: boolean; blockers: Task[] } => {
    const task = allTasks.find(t => t.id === id);
    if (!task || !task.blockedByTaskIds || task.blockedByTaskIds.length === 0) return { isBlocked: false, blockers: [] };
    const activeBlockers = allTasks.filter(t => task.blockedByTaskIds?.includes(t.id) && t.status !== 'done');
    return {
      isBlocked: activeBlockers.length > 0,
      blockers: activeBlockers
    };
  };

  const isPrimaryAssignee = currentMember?.id === (editingTask?.memberId || newTaskData?.memberId);
  const taskAccess: string = 'administrador'; // full edit within modal if user opened it

  const [designColWidths, setDesignColWidths] = useState({
    element: 150,
    content: 250,
    visual: 200,
    observations: 200
  });
  const [videoColWidths, setVideoColWidths] = useState<{ [key: string]: number }>({
    time: 80,
    stage: 110,
    visual: 200,
    onScreenText: 180,
    voiceOver: 200,
    observations: 150
  });
  const handleDesignTablePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, startRowIdx: number, startColName: 'element' | 'content' | 'visual' | 'observations') => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || (!pasteData.includes(String.fromCharCode(9)) && !pasteData.includes(String.fromCharCode(10)))) return;
    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).filter(r => r.length > 0 || r.includes(String.fromCharCode(9)));
    if (rows.length === 0) return;
    const currentElements = [...(newTaskData.designData?.elements || [])];
    const props: ('element' | 'content' | 'visual' | 'observations')[] = ['element', 'content', 'visual', 'observations'];
    const startPropIdx = props.indexOf(startColName);
    const isCarousel = newTaskData.taskTemplate === 'design_carousel';
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
  const handleVideoTablePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, startRowIdx: number, startColName: string) => {
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
  if (!isOpen) return null;
  return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <form onSubmit={onSave} className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 z-10">
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                      <div className={`p-2.5 rounded-xl shrink-0 ${editingTask ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {editingTask ? <Edit size={20} /> : <CheckCircle2 size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          required
                          disabled={!(isNewTask || isProcessLeader)}
                          placeholder="Título de la historia de usuario..."
                          className={`w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-xl font-black tracking-tight placeholder:text-gray-300 px-0 py-0 ${
                            !(isNewTask || isProcessLeader) ? 'cursor-not-allowed text-gray-700' : 'text-gray-900'
                          }`}
                          value={newTaskData.title}
                          onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                        />
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={onClose}
                      className="p-3 shrink-0 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 shadow-sm hover:shadow-md"
                      title="Cerrar"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    {/* Left Column: Metadata */}
                    <div className="lg:col-span-3 space-y-6">
                      <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Layers size={12} className="text-blue-500" /> Proceso
                          </label>
                          <select 
                            required
                            disabled={!canEditMetadataField}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-xs font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.processId}
                            onChange={e => setNewTaskData({...newTaskData, processId: e.target.value})}
                          >
                            <option value="">Seleccionar Proceso...</option>
                            {processes.map((p, pIdx) => <option key={`modal_proc_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <LayoutTemplate size={12} className="text-pink-500" /> Plantilla de Tarea
                          </label>
                          <select 
                            disabled={!isNewTask}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all appearance-none text-xs font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.taskTemplate || 'standard'}
                            onChange={e => {
                              const newTemplate = e.target.value as any;
                              if ((newTemplate === 'design_post' || newTemplate === 'design_carousel' || newTemplate === 'design_video') && (!newTaskData.designData || !newTaskData.designData.elements || newTaskData.designData.elements.length === 0)) {
                                setNewTaskData({
                                  ...newTaskData, 
                                  taskTemplate: newTemplate,
                                  designData: {
                                    campaign: newTaskData.designData?.campaign || '',
                                    formats: newTaskData.designData?.formats || '',
                                    elements: [{ id: Date.now().toString(), element: '', content: '', visual: '', observations: '' }],
                                    references: newTaskData.designData?.references || []
                                  }
                                });
                              } else {
                                setNewTaskData({...newTaskData, taskTemplate: newTemplate});
                              }
                            }}
                          >
                            <option value="standard">Desarrollo / Estándar</option>
                            <option value="design_post">Diseño - Post Estático</option>
                            <option value="design_carousel">Diseño - Carrusel</option>
                            <option value="design_video">Diseño - Video</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <User size={12} className="text-purple-500" /> Responsable
                          </label>
                          <select 
                            disabled={!canEditMetadataField}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-xs font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.memberId}
                            onChange={e => setNewTaskData({...newTaskData, memberId: e.target.value})}
                          >
                            <option value="">Sin Asignar (Task Pool)</option>
                            {newTaskData.processId ? (
                              <>
                                {sortedMembers.filter(m => m.processId === newTaskData.processId).length > 0 && (
                                  <optgroup label="Miembros del Proceso">
                                    {sortedMembers.filter(m => m.processId === newTaskData.processId).map((m, mIdx) => (
                                      <option key={`modal_m_proc_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {sortedMembers.filter(m => m.processId !== newTaskData.processId).length > 0 && (
                                  <optgroup label="Otros Miembros del Equipo">
                                    {sortedMembers.filter(m => m.processId !== newTaskData.processId).map((m, mIdx) => (
                                      <option key={`modal_m_other_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </>
                            ) : (
                              sortedMembers.map((m, mIdx) => (
                                <option key={`modal_m_all_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name}</option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-emerald-500" /> Revisor
                          </label>
                          <select 
                            disabled={!canEditMetadataField}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-xs font-bold shadow-sm cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.revisorId || ''}
                            onChange={e => setNewTaskData({...newTaskData, revisorId: e.target.value})}
                          >
                            <option value="">Sin Asignar (Revisión de Líder/Admin)</option>
                            {sortedMembers.map((m, mIdx) => (
                              <option key={`modal_rev_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                              <Users size={12} className="text-amber-500" /> Auxiliares ({newTaskData.auxiliaryIds?.length || 0})
                            </label>
                            
                            {canEditMetadataField && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddAuxDropdown(!showAddAuxDropdown);
                                  setAuxSearchQuery('');
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer border transition-all ${
                                  showAddAuxDropdown 
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-md' 
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 shadow-sm'
                                }`}
                              >
                                <UserPlus size={10} />
                                <span>Agregar</span>
                              </button>
                            )}
                          </div>
                          {/* Horizontal flex of assigned auxiliaries */}
                          <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-2xl min-h-[48px] items-center border border-dashed border-gray-200">
                            {(!newTaskData.auxiliaryIds || newTaskData.auxiliaryIds.length === 0) ? (
                              <span className="text-[10px] text-gray-400 italic px-2 select-none py-1">Sin auxiliares asignados. Usa "+ Agregar".</span>
                            ) : (
                              newTaskData.auxiliaryIds.map((id, aIdx) => {
                                const m = sortedMembers.find(member => member.id === id);
                                if (!m) return null;
                                return (
                                  <div 
                                    key={`task_aux_${id}_${aIdx}`}
                                    className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-100 rounded-xl pl-1.5 pr-1 py-1 text-[11px] font-bold text-amber-800 transition-all shadow-sm hover:bg-amber-50"
                                  >
                                    <img 
                                      src={m.avatar} 
                                      className="w-4 h-4 rounded-md object-cover select-none" 
                                      referrerPolicy="no-referrer"
                                      alt=""
                                    />
                                    <span className="truncate max-w-[80px]" title={m.name}>{m.name.split(' ')[0]}</span>
                                    {canEditMetadataField && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextIds = (newTaskData.auxiliaryIds || []).filter(currId => currId !== id);
                                          setNewTaskData({
                                            ...newTaskData,
                                            auxiliaryIds: nextIds,
                                            auxiliaryId: nextIds[0] || ''
                                          });
                                        }}
                                        className="p-0.5 hover:bg-amber-150 rounded-md text-amber-500 hover:text-amber-800 transition-colors ml-0.5 cursor-pointer"
                                        title={`Quitar ${m.name}`}
                                      >
                                        <X size={10} strokeWidth={3} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                          {/* Dropdown Popover */}
                          {showAddAuxDropdown && (
                            <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-3 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Añadir Miembro Auxiliar</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddAuxDropdown(false);
                                    setAuxSearchQuery('');
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
                                >
                                  <X size={11} strokeWidth={3} />
                                </button>
                              </div>
                              {/* Mini Search input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Buscar por nombre..."
                                  className="w-full text-[11px] px-2.5 py-1.5 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 font-medium"
                                  value={auxSearchQuery}
                                  onChange={e => setAuxSearchQuery(e.target.value)}
                                />
                              </div>
                              {/* Members items */}
                              <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                                {sortedMembers
                                  .filter(m => !newTaskData.memberId || m.id !== newTaskData.memberId)
                                  .filter(m => !auxSearchQuery || m.name.toLowerCase().includes(auxSearchQuery.toLowerCase()))
                                  .map((m, mIdx) => {
                                    const isSelected = !!newTaskData.auxiliaryIds?.includes(m.id);
                                    return (
                                      <button
                                        key={`aux_add_opt_${m.id || mIdx}_${mIdx}`}
                                        type="button"
                                        onClick={() => {
                                          const currentIds = [...(newTaskData.auxiliaryIds || [])];
                                          let nextIds = [];
                                          if (isSelected) {
                                            nextIds = currentIds.filter(id => id !== m.id);
                                          } else {
                                            nextIds = [...currentIds, m.id];
                                          }
                                          setNewTaskData({
                                            ...newTaskData,
                                            auxiliaryIds: nextIds,
                                            auxiliaryId: nextIds[0] || ''
                                          });
                                        }}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                                          isSelected 
                                            ? 'bg-amber-50/70 border-amber-200 text-amber-800' 
                                            : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                                        }`}
                                      >
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                          isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 bg-white'
                                        }`}>
                                          {isSelected && <Check size={8} strokeWidth={4} />}
                                        </div>
                                        <img 
                                          src={m.avatar} 
                                          className="w-4.5 h-4.5 rounded-md object-cover flex-shrink-0" 
                                          referrerPolicy="no-referrer"
                                          alt=""
                                        />
                                        <span className="truncate flex-1">{m.name}</span>
                                      </button>
                                    );
                                  })
                                }
                                {sortedMembers
                                  .filter(m => !newTaskData.memberId || m.id !== newTaskData.memberId)
                                  .filter(m => !auxSearchQuery || m.name.toLowerCase().includes(auxSearchQuery.toLowerCase()))
                                  .length === 0 && (
                                    <p className="text-[10px] text-gray-400 italic text-center py-2">Sin otros miembros.</p>
                                  )
                                }
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <FolderKanban size={12} className="text-green-500" /> Proyecto
                          </label>
                          <select 
                            disabled={!canEditMetadataField}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-xs font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.projectId}
                            onChange={e => setNewTaskData({...newTaskData, projectId: e.target.value})}
                          >
                            <option value="">Historia de Usuario Independiente</option>
                            {projects.filter(p => 
                              (!newTaskData.processId || p.processId === newTaskData.processId) &&
                              (p.status !== 'completado' || p.id === newTaskData.projectId)
                            ).map((p, pIdx) => (
                              <option key={`modal_proj_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Activity size={12} className="text-red-500" /> Estado Scrum
                          </label>
                          <select 
                            required
                            disabled={!canEditStatusField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm capitalize disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.status}
                            onChange={e => {
                               const newStatus = e.target.value as any;
                               if (newStatus === 'in_progress' && editingTask) {
                                 const { isBlocked, blockers } = isTaskBlocked(editingTask.id, tasks);
                                 if (isBlocked) {
                                   alert(`ESTA TAREA ESTÁ BLOQUEADAPara poder iniciar esta tarea se debe terminar primero:• ${blockers.map(t => t.title).join('• ')}`);
                                   return;
                                 }
                               }
                               setNewTaskData({...newTaskData, status: newStatus});
                            }}
                          >
                            {(() => {
                              const allOptions = [
                                { value: 'backlog', label: '📦 Product Backlog' },
                                { value: 'todo', label: '📋 Por Hacer' },
                                { value: 'in_progress', label: '⚡ En Progreso' },
                                { value: 'review', label: '🔍 En Revisión' },
                                { value: 'correction', label: '🔧 Para Corrección' },
                                { value: 'done', label: '✅ Completada' },
                                { value: 'blocked', label: '🚫 Bloqueada' }
                              ];
                              if (isNewTask || isProcessLeader) {
                                return allOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ));
                              }
                              if (taskAccess === 'colaborador') {
                                // Only allow 'in_progress', 'review', and current status
                                const filtered = allOptions.filter(opt => 
                                  opt.value === 'in_progress' || 
                                  opt.value === 'review' || 
                                  opt.value === newTaskData.status
                                );
                                return filtered.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ));
                              }
                              // Otherwise, they shouldn't be editing, but if they view it:
                              return allOptions.filter(opt => opt.value === newTaskData.status).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Zap size={12} className="text-amber-500" /> Prioridad de la Tarea
                          </label>
                          <select 
                            required
                            disabled={!canEditMetadataField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm capitalize disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.priority || 'media'}
                            onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as 'baja' | 'media' | 'alta' | 'meteoric_crash'})}
                          >
                            <option value="baja">🟢 Baja (Normal)</option>
                            <option value="media">⚡ Media (Estándar)</option>
                            <option value="alta">🔥 Alta (Urgente)</option>
                            <option value="meteoric_crash">☄️ Meteoric Crash (ALERTA MÁXIMA)</option>
                          </select>
                        </div>
                        <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-100 mt-4">
                            <div className="bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100/50 space-y-4">
                              {/* ¿Quién bloquea esta tarea? */}
                              <div className="space-y-2 relative">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 flex-shrink-0">
                                    <Ban size={10} className="text-red-500" /> BLOQUEADA POR
                                  </label>
                                  
                                  <div className="relative">
                                    {canEditMetadataField && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddBlockerDropdown(!showAddBlockerDropdown);
                                          setShowAddBlocksDropdown(false);
                                        }}
                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
                                      >
                                        <Plus size={10} strokeWidth={3} /> {showAddBlockerDropdown ? 'Cerrar' : 'Añadir'}
                                      </button>
                                    )}
                                    {showAddBlockerDropdown && (
                                      <div className="absolute left-0 lg:left-full lg:-ml-4 mt-2 lg:mt-0 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Buscar Bloqueo</div>
                                        
                                        {/* Buscador de texto */}
                                        <input
                                          type="text"
                                          placeholder="Buscar por título..."
                                          value={blockerSearchQuery}
                                          onChange={e => setBlockerSearchQuery(e.target.value)}
                                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400/20"
                                        />
                                        {/* Filtros rápidos: Proyecto y Proceso */}
                                        <div className="grid grid-cols-2 gap-2">
                                          <select
                                            value={blockerSelectedProjectId}
                                            onChange={e => setBlockerSelectedProjectId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proy.</option>
                                            {projects.map((p, pIdx) => (
                                              <option key={`blocker_p_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                          <select
                                            value={blockerSelectedProcessId}
                                            onChange={e => setBlockerSelectedProcessId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proc.</option>
                                            {processes.map((p, pIdx) => (
                                              <option key={`blocker_proc_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        {/* Resultados de tareas */}
                                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pt-1">
                                          {(() => {
                                            const filteredTasks = tasks.filter(t => {
                                              if (t.id === newTaskData.id) return false;
                                              if (newTaskData.blockedByTaskIds?.includes(t.id)) return false;
                                              
                                              // Filtro por texto
                                              if (blockerSearchQuery && !t.title.toLowerCase().includes(blockerSearchQuery.toLowerCase())) {
                                                return false;
                                              }
                                              // Filtro por proyecto
                                              if (blockerSelectedProjectId !== 'all' && t.projectId !== blockerSelectedProjectId) {
                                                return false;
                                              }
                                              // Filtro por proceso
                                              if (blockerSelectedProcessId !== 'all' && t.processId !== blockerSelectedProcessId) {
                                                return false;
                                              }
                                              return true;
                                            }).sort((a, b) => {
                                              const sameProjA = newTaskData.projectId && a.projectId === newTaskData.projectId;
                                              const sameProcA = newTaskData.processId && a.processId === newTaskData.processId;
                                              const sameProjB = newTaskData.projectId && b.projectId === newTaskData.projectId;
                                              const sameProcB = newTaskData.processId && b.processId === newTaskData.processId;
                                              const getScore = (sameProj: any, sameProc: any) => {
                                                if (sameProj && sameProc) return 1;
                                                if (sameProj) return 2;
                                                if (sameProc) return 3;
                                                return 4;
                                              };
                                              const scoreA = getScore(sameProjA, sameProcA);
                                              const scoreB = getScore(sameProjB, sameProcB);
                                              if (scoreA !== scoreB) {
                                                return scoreA - scoreB;
                                              }
                                              const nameA_Proc = (processes.find(p => p.id === a.processId)?.name || '').toLowerCase();
                                              const nameB_Proc = (processes.find(p => p.id === b.processId)?.name || '').toLowerCase();
                                              if (nameA_Proc && !nameB_Proc) return -1;
                                              if (!nameA_Proc && nameB_Proc) return 1;
                                              const procCompare = nameA_Proc.localeCompare(nameB_Proc, 'es', { sensitivity: 'base' });
                                              if (procCompare !== 0) return procCompare;
                                              const nameA_Proj = (projects.find(p => p.id === a.projectId)?.name || '').toLowerCase();
                                              const nameB_Proj = (projects.find(p => p.id === b.projectId)?.name || '').toLowerCase();
                                              if (nameA_Proj && !nameB_Proj) return -1;
                                              if (!nameA_Proj && nameB_Proj) return 1;
                                              const projCompare = nameA_Proj.localeCompare(nameB_Proj, 'es', { sensitivity: 'base' });
                                              if (projCompare !== 0) return projCompare;
                                              return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
                                            });
                                            if (filteredTasks.length === 0) {
                                              return (
                                                <div className="text-center py-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                  No se encontraron tareas
                                                </div>
                                              );
                                            }
                                            return filteredTasks.map((t, tIdx) => {
                                              const tProj = projects.find(p => p.id === t.projectId)?.name;
                                              const tProc = processes.find(p => p.id === t.processId)?.name;
                                              return (
                                                <button
                                                  type="button"
                                                  key={`blocker_cand_${t.id || tIdx}_${tIdx}`}
                                                  onClick={() => {
                                                    setNewTaskData({
                                                      ...newTaskData,
                                                      blockedByTaskIds: [...(newTaskData.blockedByTaskIds || []), t.id]
                                                    });
                                                    setBlockerSearchQuery('');
                                                    setShowAddBlockerDropdown(false);
                                                  }}
                                                  className="w-full text-left p-2 rounded-xl hover:bg-red-50/50 transition-colors border border-transparent hover:border-red-100 flex flex-col gap-0.5"
                                                >
                                                  <span className="text-xs font-semibold text-gray-800 line-clamp-1">{t.title}</span>
                                                  <div className="flex flex-wrap gap-1 items-center">
                                                    {tProj && (
                                                      <span className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProj}
                                                      </span>
                                                    )}
                                                    {tProc && (
                                                      <span className="text-[8px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProc}
                                                      </span>
                                                    )}
                                                  </div>
                                                </button>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {newTaskData.blockedByTaskIds?.map((id, bIdx) => {
                                      const blockedByTask = tasks.find(t => t.id === id);
                                      return (
                                        <div key={`task_blocked_by_${id}_${bIdx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-red-700 rounded-xl text-[10px] font-black border border-red-100 shadow-sm group animate-in fade-in slide-in-from-left-2">
                                          <span className="truncate max-w-[120px]" title={blockedByTask?.title}>{blockedByTask?.title}</span>
                                          <div className="flex items-center gap-0.5 ml-auto">
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                if (blockedByTask?.title) {
                                                  navigator.clipboard.writeText(blockedByTask.title);
                                                }
                                              }}
                                              className="hover:text-red-900 p-1 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                              title="Copiar nombre"
                                            >
                                              <Copy size={11} />
                                            </button>
                                            {canEditMetadataField && (
                                              <button 
                                                type="button"
                                                onClick={() => setNewTaskData({
                                                  ...newTaskData, 
                                                  blockedByTaskIds: newTaskData.blockedByTaskIds?.filter(tid => tid !== id)
                                                })}
                                                className="hover:text-red-900 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                              >
                                                <X size={11} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {(!newTaskData.blockedByTaskIds || newTaskData.blockedByTaskIds.length === 0) && (
                                      <div className="w-full py-2 text-center border border-dashed border-gray-200 rounded-xl">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Sin bloqueos activos</p>
                                      </div>
                                    )}
                                </div>
                              </div>
     
                              {/* ¿A quién bloquea esta tarea? */}
                              <div className="space-y-2 pt-3 border-t border-gray-100 relative">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 flex-shrink-0">
                                    <Activity size={10} className="text-blue-500" /> BLOQUEA A
                                  </label>
                                  
                                  <div className="relative">
                                    {canEditMetadataField && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddBlocksDropdown(!showAddBlocksDropdown);
                                          setShowAddBlockerDropdown(false);
                                        }}
                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-700 rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
                                      >
                                        <Plus size={10} strokeWidth={3} /> {showAddBlocksDropdown ? 'Cerrar' : 'Añadir'}
                                      </button>
                                    )}
                                    {showAddBlocksDropdown && (
                                      <div className="absolute left-0 lg:left-full lg:-ml-4 mt-2 lg:mt-0 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Buscar Tarea a Bloquear</div>
                                        
                                        {/* Buscador de texto */}
                                        <input
                                          type="text"
                                          placeholder="Buscar por título..."
                                          value={blocksSearchQuery}
                                          onChange={e => setBlocksSearchQuery(e.target.value)}
                                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                                        />
                                        {/* Filtros rápidos: Proyecto y Proceso */}
                                        <div className="grid grid-cols-2 gap-2">
                                          <select
                                            value={blocksSelectedProjectId}
                                            onChange={e => setBlocksSelectedProjectId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proy.</option>
                                            {projects.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                          <select
                                            value={blocksSelectedProcessId}
                                            onChange={e => setBlocksSelectedProcessId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proc.</option>
                                            {processes.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        {/* Resultados de tareas */}
                                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pt-1">
                                          {(() => {
                                            const filteredTasks = tasks.filter(t => {
                                              if (t.id === newTaskData.id) return false;
                                              if ((t.blockedByTaskIds || []).includes(newTaskData.id)) return false;
                                              
                                              // Filtro por texto
                                              if (blocksSearchQuery && !t.title.toLowerCase().includes(blocksSearchQuery.toLowerCase())) {
                                                return false;
                                              }
                                              // Filtro por proyecto
                                              if (blocksSelectedProjectId !== 'all' && t.projectId !== blocksSelectedProjectId) {
                                                return false;
                                              }
                                              // Filtro por proceso
                                              if (blocksSelectedProcessId !== 'all' && t.processId !== blocksSelectedProcessId) {
                                                return false;
                                              }
                                              return true;
                                            }).sort((a, b) => {
                                              const sameProjA = newTaskData.projectId && a.projectId === newTaskData.projectId;
                                              const sameProcA = newTaskData.processId && a.processId === newTaskData.processId;
                                              const sameProjB = newTaskData.projectId && b.projectId === newTaskData.projectId;
                                              const sameProcB = newTaskData.processId && b.processId === newTaskData.processId;
                                              const getScore = (sameProj: any, sameProc: any) => {
                                                if (sameProj && sameProc) return 1;
                                                if (sameProj) return 2;
                                                if (sameProc) return 3;
                                                return 4;
                                              };
                                              const scoreA = getScore(sameProjA, sameProcA);
                                              const scoreB = getScore(sameProjB, sameProcB);
                                              if (scoreA !== scoreB) {
                                                return scoreA - scoreB;
                                              }
                                              const nameA_Proc = (processes.find(p => p.id === a.processId)?.name || '').toLowerCase();
                                              const nameB_Proc = (processes.find(p => p.id === b.processId)?.name || '').toLowerCase();
                                              if (nameA_Proc && !nameB_Proc) return -1;
                                              if (!nameA_Proc && nameB_Proc) return 1;
                                              const procCompare = nameA_Proc.localeCompare(nameB_Proc, 'es', { sensitivity: 'base' });
                                              if (procCompare !== 0) return procCompare;
                                              const nameA_Proj = (projects.find(p => p.id === a.projectId)?.name || '').toLowerCase();
                                              const nameB_Proj = (projects.find(p => p.id === b.projectId)?.name || '').toLowerCase();
                                              if (nameA_Proj && !nameB_Proj) return -1;
                                              if (!nameA_Proj && nameB_Proj) return 1;
                                              const projCompare = nameA_Proj.localeCompare(nameB_Proj, 'es', { sensitivity: 'base' });
                                              if (projCompare !== 0) return projCompare;
                                              return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
                                            });
                                            if (filteredTasks.length === 0) {
                                              return (
                                                <div className="text-center py-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                  No se encontraron tareas
                                                </div>
                                              );
                                            }
                                            return filteredTasks.map((t, tIdx) => {
                                              const tProj = projects.find(p => p.id === t.projectId)?.name;
                                              const tProc = processes.find(p => p.id === t.processId)?.name;
                                              return (
                                                <button
                                                  type="button"
                                                  key={`blocks_cand_${t.id || tIdx}_${tIdx}`}
                                                  onClick={() => {
                                                    // Bloquear en estado local
                                                    setTasks?.(prev => prev.map(pt => {
                                                      if (pt.id === t.id) {
                                                        const currentBlockedBy = pt.blockedByTaskIds || [];
                                                        if (!currentBlockedBy.includes(newTaskData.id)) {
                                                          return { ...pt, blockedByTaskIds: [...currentBlockedBy, newTaskData.id] };
                                                        }
                                                      }
                                                      return pt;
                                                    }));
                                                    // Realizar actualización a DB
                                                    const currentBlockedBy = t.blockedByTaskIds || [];
                                                    if (!currentBlockedBy.includes(newTaskData.id)) {
                                                      updateDoc(doc(db, 'tasks', t.id), {
                                                        blockedByTaskIds: [...currentBlockedBy, newTaskData.id]
                                                      }).catch(err => console.error(err));
                                                    }
                                                    setBlocksSearchQuery('');
                                                    setShowAddBlocksDropdown(false);
                                                  }}
                                                  className="w-full text-left p-2 rounded-xl hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100 flex flex-col gap-0.5"
                                                >
                                                  <span className="text-xs font-semibold text-gray-800 line-clamp-1">{t.title}</span>
                                                  <div className="flex flex-wrap gap-1 items-center">
                                                    {tProj && (
                                                      <span className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProj}
                                                      </span>
                                                    )}
                                                    {tProc && (
                                                      <span className="text-[8px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProc}
                                                      </span>
                                                    )}
                                                  </div>
                                                </button>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tasks.filter(t => t.blockedByTaskIds?.includes(newTaskData.id)).length > 0 ? (
                                      tasks.filter(t => t.blockedByTaskIds?.includes(newTaskData.id)).map((t, tIdx) => (
                                        <div key={`task_blocks_out_${t.id || tIdx}_${tIdx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-blue-700 rounded-xl text-[10px] font-black border border-blue-100 shadow-sm group animate-in fade-in slide-in-from-left-2">
                                          <span className="truncate max-w-[120px]" title={t.title}>{t.title}</span>
                                          <div className="flex items-center gap-0.5 ml-auto">
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(t.title);
                                              }}
                                              className="hover:text-blue-900 p-1 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                              title="Copiar nombre"
                                            >
                                              <Copy size={11} />
                                            </button>
                                            {canEditMetadataField && (
                                              <button 
                                                type="button"
                                                onClick={() => {
                                                  // Quitar el bloqueo de la otra tarea en listado local
                                                  setTasks?.(prev => prev.map(pt => pt.id === t.id ? {
                                                    ...pt,
                                                    blockedByTaskIds: pt.blockedByTaskIds?.filter(id => id !== newTaskData.id)
                                                  } : pt));
                                                  
                                                  // Realizar actualización a DB
                                                  updateDoc(doc(db, 'tasks', t.id), {
                                                    blockedByTaskIds: (t.blockedByTaskIds || []).filter(id => id !== newTaskData.id)
                                                  }).catch(err => console.error(err));
                                                }}
                                                className="hover:text-blue-900 p-1 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                              >
                                                <X size={11} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="w-full py-2 text-center border border-dashed border-gray-200 rounded-xl">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">No bloquea a ninguna tarea</p>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      {editingTask && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (handleDeleteTask) {
                              handleDeleteTask(editingTask.id);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-3 py-4 bg-red-600 text-white rounded-3xl hover:bg-red-700 transition-all text-xs font-black uppercase tracking-widest shadow-xl shadow-red-200"
                        >
                          <Trash size={18} />
                          Borrar Tarea
                        </button>
                      )}
                    </div>
                    {/* Right Column: Content */}
                    <div className="lg:col-span-9 space-y-4">
                      {(() => {
                        const canEditPlannedDates = isNewTask || isProcessLeader;
                        const canEditDueDate = isNewTask || isProcessLeader || isPrimaryAssignee || (!editingTask?.memberId && taskAccess === 'colaborador');
                        const canEditStoryAndCriteria = isNewTask || isProcessLeader;
                        return (
                          <>
                            
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* BLOQUE 1: PLANIFICACIÓN Y LÍMITES */}
      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
          <Calendar size={12} className="text-gray-400" /> Planificación y Límites
        </h4>
        
        {/* FILA 1: Fecha Planificada | Horas Planificadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Calendar size={12} className="text-sky-500" /> Fecha Planificada
            </label>
            <input 
              type="date" 
              disabled={!canEditExecution}
              className={`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold ${
                !canEditExecution ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
              }`}
              value={newTaskData.plannedDate || ''}
              onChange={e => setNewTaskData({...newTaskData, plannedDate: e.target.value})}
            />
          </div>
          
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Clock size={12} className="text-blue-500" /> Horas Planificadas
              {!canEditPlanning && <Lock size={10} className="text-gray-400 ml-auto" />}
            </label>
            <select 
              disabled={!canEditPlanning}
              className={`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold appearance-none ${
                !canEditPlanning ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer'
              }`}
              value={newTaskData.plannedHours}
              onChange={e => setNewTaskData({...newTaskData, plannedHours: parseFloat(e.target.value) || 0})}
            >
              <option value="0">Sin horas</option>
              {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40].map(num => (
                <option key={num} value={num}>
                  {num === 0.5 ? '0.5 horas' : num === 1 ? '1 hora' : `${num} horas`}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* FILA 2: Fecha Límite | Horario Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className={`space-y-2 relative flex-1 p-3 -m-3 rounded-xl border transition-colors ${!canEditPlanning ? 'bg-red-50/40 border-red-50/50' : 'bg-red-50/80 border-red-100'}`}>
            <label className="text-[10px] font-bold text-red-600 uppercase tracking-wider ml-1 flex items-center gap-1.5" title="Solo el líder de proceso o administrador puede cambiar esta fecha">
              <Calendar size={12} className="text-red-500" /> Fecha Límite
              {!canEditPlanning && <Lock size={10} className="text-red-300 ml-auto" />}
            </label>
            <input 
              type="date" 
              disabled={!canEditPlanning}
              className={`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold ${
                !canEditPlanning ? 'bg-red-50/50 text-red-400/80 cursor-not-allowed border-red-200/40' : 'bg-white border-red-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-sm text-red-700'
              }`}
              value={newTaskData.dueDate || ''}
              onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
            />
          </div>
          {!showTimeInputs && canEditExecution ? (
            <div className="flex-1 pb-1">
              <button 
                type="button" 
                onClick={() => setShowTimeInputs(true)}
                className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100"
              >
                <Plus size={14} /> Agregar Horario
              </button>
            </div>
          ) : !showTimeInputs && !canEditExecution ? (
            <div className="flex-1"></div>
          ) : (
            <>
              <div className="space-y-2 relative flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-400" /> Hora Inicio
                </label>
                <input 
                  type="time" 
                  disabled={!canEditExecution}
                  className={`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold ${
                    !canEditExecution ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
                  }`}
                  value={newTaskData.plannedStartTime || ''}
                  onChange={e => setNewTaskData({...newTaskData, plannedStartTime: e.target.value})}
                />
              </div>
              <div className="space-y-2 relative flex-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" /> Hora Fin
                  </label>
                  {canEditExecution && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowTimeInputs(false);
                        setNewTaskData({...newTaskData, plannedStartTime: '', plannedEndTime: ''});
                      }}
                      className="text-red-400 hover:text-red-500 bg-red-50 hover:bg-red-100 p-1 rounded-md transition-colors"
                      title="Quitar Horario"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <input 
                  type="time" 
                  disabled={!canEditExecution}
                  className={`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold ${
                    !canEditExecution ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
                  }`}
                  value={newTaskData.plannedEndTime || ''}
                  onChange={e => setNewTaskData({...newTaskData, plannedEndTime: e.target.value})}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {/* BLOQUE 2: EJECUCIÓN REAL */}
      <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-4 shadow-sm shadow-blue-900/5">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 mb-2">
          <CheckCircle2 size={12} className="text-blue-500" /> Ejecución Real
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Calendar size={12} className="text-emerald-500" /> Entregado el...
              {!canEditExecution && <Lock size={10} className="text-gray-300 ml-auto" />}
            </label>
            <input 
              type="date" 
              disabled={!canEditExecution}
              className={`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold ${
                !canEditExecution ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
              }`}
              value={newTaskData.actualEndDate || ''}
              onChange={e => setNewTaskData({...newTaskData, actualEndDate: e.target.value})}
            />
          </div>
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Activity size={12} className="text-green-500" /> Horas Reales
              {!canEditExecution && <Lock size={10} className="text-gray-300 ml-auto" />}
            </label>
            <input 
              type="number" 
              min="0"
              step="0.5"
              disabled={!canEditExecution}
              className={`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold ${
                !canEditExecution ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
              }`}
              value={newTaskData.actualHours}
              onChange={e => setNewTaskData({...newTaskData, actualHours: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>
      </div>
    </div>
    {/* Section: Split Description into Description and Acceptance Criteria */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Descripción de la historia</label>
                              <textarea 
                                placeholder="Describe el contexto narrativo de la historia de usuario o actividad..."
                                disabled={!canEditStoryAndCriteria}
                                className={`w-full h-32 px-6 py-4 border-2 border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm leading-relaxed shadow-sm placeholder:text-gray-300 ${
                                  !canEditStoryAndCriteria ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                                }`}
                                value={newTaskData.storyDescription || ''}
                                onChange={e => setNewTaskData({...newTaskData, storyDescription: e.target.value})}
                              />
                              {!canEditStoryAndCriteria && (
                                <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder / Administrador</span>
                              )}
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                <CheckSquare size={14} className="text-emerald-500" /> Criterios de Aceptación
                              </label>
                              <textarea 
                                placeholder="Lista de criterios requeridos para dar por finalizada la tarea..."
                                disabled={!canEditStoryAndCriteria}
                                className={`w-full h-24 px-6 py-4 border-2 border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none text-sm leading-relaxed shadow-sm placeholder:text-gray-300 ${
                                  !canEditStoryAndCriteria ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                                }`}
                                value={newTaskData.acceptanceCriteria || ''}
                                onChange={e => setNewTaskData({...newTaskData, acceptanceCriteria: e.target.value})}
                              />
                            </div>
                            {/* Section: Deliverables */}
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                  <LinkIcon size={14} className="text-blue-500" /> Links para entrega de productos
                                </label>
                                {canEditExecution && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newDeliverables = [...(newTaskData.deliverables || []), { id: Date.now().toString(), url: '', description: '' }];
                                      setNewTaskData({ ...newTaskData, deliverables: newDeliverables });
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                  >
                                    <Plus size={14} /> Añadir Link
                                  </button>
                                )}
                              </div>
                              {(newTaskData.deliverables && newTaskData.deliverables.length > 0) ? (
                                <div className="space-y-3">
                                  {newTaskData.deliverables.map((del, idx) => (
                                    <div key={del.id || `del_${idx}`} className="flex gap-3 items-start bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                                      <div className="flex-1 space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-3">
                                          <div className="flex items-center gap-2 flex-1">
                                            <FolderKanban size={12} className="text-orange-400 shrink-0" />
                                            <input
                                              type="text"
                                              placeholder="Ubicación en Drive (Ruta o carpeta)..."
                                              disabled={!canEditExecution}
                                              className={`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs ${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                                              value={del.folderLocation || ''}
                                              onChange={e => {
                                                const newDel = [...newTaskData.deliverables];
                                                newDel[idx].folderLocation = e.target.value;
                                                setNewTaskData({ ...newTaskData, deliverables: newDel });
                                              }}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2 flex-1">
                                            <LinkIcon size={12} className="text-blue-400 shrink-0" />
                                            <input
                                              type="text"
                                              placeholder="URL del entregable (ej. Figma, Docs...)"
                                              disabled={!canEditExecution}
                                              className={`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs ${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                                              value={del.url}
                                              onChange={e => {
                                                const newDel = [...newTaskData.deliverables];
                                                newDel[idx].url = e.target.value;
                                                setNewTaskData({ ...newTaskData, deliverables: newDel });
                                              }}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <AlignLeft size={12} className="text-gray-400 shrink-0" />
                                          <input
                                            type="text"
                                            placeholder="Descripción breve (opcional)..."
                                            disabled={!canEditExecution}
                                            className={`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs ${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                                            value={del.description || ''}
                                            onChange={e => {
                                              const newDel = [...newTaskData.deliverables];
                                              newDel[idx].description = e.target.value;
                                              setNewTaskData({ ...newTaskData, deliverables: newDel });
                                            }}
                                          />
                                        </div>
                                      </div>
                                      {canEditExecution && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newDel = newTaskData.deliverables.filter((_, i) => i !== idx);
                                            setNewTaskData({ ...newTaskData, deliverables: newDel });
                                          }}
                                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1 shrink-0"
                                          title="Eliminar entregable"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                                  <p className="text-xs font-medium text-gray-400">No hay links de entrega añadidos.</p>
                                </div>
                              )}
                            </div>
                            {(newTaskData.taskTemplate === 'design_post' || newTaskData.taskTemplate === 'design_carousel' || newTaskData.taskTemplate === 'design_video') && (
                              <div className="space-y-6 pt-4 border-t border-gray-100">
                                {(newTaskData.taskTemplate === 'design_post' || newTaskData.taskTemplate === 'design_carousel') && (() => {
                                  let slides: number[] = newTaskData.taskTemplate === 'design_carousel' ? Array.from(new Set<number>((newTaskData.designData?.elements || []).map((e: any) => Number(e.slideIndex) || 1))).sort((a: number, b: number) => a - b) : [1];
                                  if (slides.length === 0) slides = [1];
                                  
                                  return (
                                    <>
                                      {slides.map(slideIdx => {
                                        const slideElements = newTaskData.designData?.elements?.filter((e: any) => (e.slideIndex || 1) === slideIdx) || [];
                                        
                                        return (
                                          <div key={slideIdx} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                                <Layers size={14} className="text-purple-500" /> Elementos del Diseño {newTaskData.taskTemplate === 'design_carousel' ? `- Imagen ${slideIdx}` : ''}
                                              </label>
                                              <div className="flex items-center gap-2">
                                                {newTaskData.taskTemplate === 'design_carousel' && slides.length > 1 && (
                                                  <button 
                                                    type="button"
                                                    onClick={() => setSlideToDelete(slideIdx)}
                                                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                                                    title="Eliminar imagen"
                                                  >
                                                    <Trash size={14} /> Borrar
                                                  </button>
                                                )}
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
                                                          const onMouseMove = (moveEvent) => {
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
                                                          const onMouseMove = (moveEvent) => {
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
                                                          const onMouseMove = (moveEvent) => {
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
                                                          const onMouseMove = (moveEvent) => {
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
                                                  {newTaskData.designData?.elements?.map((el, originalIndex) => {
                                                    if ((el.slideIndex || 1) !== slideIdx) return null;
                                                    return (
                                                      <tr key={el.id || `design_el_${originalIndex}`} className="group hover:bg-gray-50/50">
                                                        <td className="p-1 border-r border-gray-100/50 align-top">
                                                          <textarea
                                                            rows={1}
                                                            placeholder="Ej: Imagen principal"
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
                                                            onPaste={(e) => handleDesignTablePaste(e as any, originalIndex, 'element')}
                                                          />
                                                        </td>
                                                        <td className="p-1 border-r border-gray-100/50 align-top">
                                                          <textarea
                                                            rows={1}
                                                            placeholder="Ej: Seguridad es primero"
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
                                                            onPaste={(e) => handleDesignTablePaste(e as any, originalIndex, 'content')}
                                                          />
                                                        </td>
                                                        <td className="p-1 border-r border-gray-100/50 align-top">
                                                          <textarea
                                                            rows={1}
                                                            placeholder="Ej: Foto en planta"
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
                                                            onPaste={(e) => handleDesignTablePaste(e as any, originalIndex, 'visual')}
                                                          />
                                                        </td>
                                                        <td className="p-1 align-top">
                                                          <textarea
                                                            rows={1}
                                                            placeholder="Evitar oscuros"
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
                                                            onPaste={(e) => handleDesignTablePaste(e as any, originalIndex, 'observations')}
                                                          />
                                                        </td>
                                                        <td className="px-2 py-2 text-right align-top">
                                                          <button
                                                            type="button"
                                                            onClick={() => setElementToDelete(el.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                          >
                                                            <Trash size={14} />
                                                          </button>
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
                                      {newTaskData.taskTemplate === 'design_carousel' && (
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
                                    </>
                                  );
                                })()}
                                
                                    {newTaskData.taskTemplate === 'design_video' && (
                                      <div className="space-y-6 pt-4 border-t border-gray-100">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                              <Video size={14} className="text-purple-500" /> Guion Audiovisual
                                            </label>
                                            <div className="flex items-center gap-2">
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
                                            </div>
                                          </div>
                                          
                                          <div className="overflow-x-auto border border-gray-100 rounded-2xl relative">
                                            <table className="min-w-full w-max text-left text-xs table-fixed">
                                              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                                                <tr>
                                                  <th style={{ width: videoColWidths.time }} className="p-0 border-r border-gray-100/50 relative group select-none">
                                                    <div className="px-4 py-3 flex items-center overflow-hidden">Tiempo</div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.time; const onMouseMove = (moveEvent) => setVideoColWidths(prev => ({ ...prev, time: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                                                  </th>
                                                  <th style={{ width: videoColWidths.stage }} className="p-0 border-r border-gray-100/50 relative group select-none">
                                                    <div className="px-4 py-3 flex items-center overflow-hidden">Etapa</div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.stage; const onMouseMove = (moveEvent) => setVideoColWidths(prev => ({ ...prev, stage: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                                                  </th>
                                                  <th style={{ width: videoColWidths.visual }} className="p-0 border-r border-gray-100/50 relative group select-none">
                                                    <div className="px-4 py-3 flex items-center overflow-hidden">Visual (imágenes / edición)</div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.visual; const onMouseMove = (moveEvent) => setVideoColWidths(prev => ({ ...prev, visual: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                                                  </th>
                                                  <th style={{ width: videoColWidths.onScreenText }} className="p-0 border-r border-gray-100/50 relative group select-none">
                                                    <div className="px-4 py-3 flex items-center overflow-hidden">Texto en pantalla (claqueta)</div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.onScreenText; const onMouseMove = (moveEvent) => setVideoColWidths(prev => ({ ...prev, onScreenText: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                                                  </th>
                                                  <th style={{ width: videoColWidths.voiceOver }} className="p-0 border-r border-gray-100/50 relative group select-none">
                                                    <div className="px-4 py-3 flex items-center overflow-hidden">Voz en off</div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.voiceOver; const onMouseMove = (moveEvent) => setVideoColWidths(prev => ({ ...prev, voiceOver: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                                                  </th>
                                                  <th style={{ width: videoColWidths.observations || 200 }} className="p-0 border-r border-gray-100/50 relative group select-none">
                                                    <div className="px-4 py-3 flex items-center overflow-hidden">Observaciones</div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths.observations || 200; const onMouseMove = (moveEvent) => setVideoColWidths(prev => ({ ...prev, observations: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                                                  </th>
                                                  {newTaskData.designData?.customVideoColumns?.map((col, colIdx) => (
                                                    <th key={col.id || `custom_col_${colIdx}`} style={{ width: videoColWidths[col.id] || 200 }} className="p-0 border-r border-gray-100/50 relative group select-none group/th">
                                                      <div className="px-2 py-2 flex items-center justify-between overflow-hidden">
                                                        <input 
                                                          value={col.name}
                                                          onChange={(e) => {
                                                            const newCols = [...(newTaskData.designData?.customVideoColumns || [])];
                                                            const idx = newCols.findIndex(c => c.id === col.id);
                                                            if (idx >= 0) newCols[idx].name = e.target.value;
                                                            setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, customVideoColumns: newCols } });
                                                          }}
                                                          className="w-full bg-transparent border-0 uppercase text-[10px] font-black tracking-wider text-gray-500 focus:ring-0 p-1"
                                                        />
                                                        <button 
                                                          onClick={() => {
                                                            const newCols = newTaskData.designData?.customVideoColumns?.filter(c => c.id !== col.id) || [];
                                                            setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, customVideoColumns: newCols } });
                                                          }}
                                                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover/th:opacity-100 transition-all ml-1 p-1"
                                                          title="Eliminar columna"
                                                        >
                                                          <Trash size={12} />
                                                        </button>
                                                      </div>
                                                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-purple-400 transition-colors" onMouseDown={(e) => { const startX = e.pageX; const startWidth = videoColWidths[col.id] || 200; const onMouseMove = (moveEvent) => setVideoColWidths(prev => ({ ...prev, [col.id]: Math.max(50, startWidth + (moveEvent.pageX - startX)) })); const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }} />
                                                    </th>
                                                  ))}
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
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100 bg-white">
                                                
                                                {(newTaskData.designData?.videoScenes?.length ? newTaskData.designData.videoScenes : [{ id: 'default-scene', time: '', stage: '', visual: '', onScreenText: '', voiceOver: '' }]).map((scene, originalIndex) => (
                                                  <tr key={scene.id || `video_scene_${originalIndex}`} className="group hover:bg-gray-50/50">
                                                    <td className="p-1 border-r border-gray-100/50 align-top">
                                                      <textarea
                                                        rows={1}
                                                        placeholder="Ej: 0:00 - 0:05"
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
                                                        onPaste={(e) => handleVideoTablePaste(e as any, originalIndex, 'time')}
                                                      />
                                                    </td>
                                                    <td className="p-1 border-r border-gray-100/50 align-top">
                                                      <textarea
                                                        rows={1}
                                                        placeholder="Ej: Gancho"
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
                                                        onPaste={(e) => handleVideoTablePaste(e as any, originalIndex, 'stage')}
                                                      />
                                                    </td>
                                                    <td className="p-1 border-r border-gray-100/50 align-top">
                                                      <textarea
                                                        rows={1}
                                                        placeholder="Ej: Imágenes dinámicas..."
                                                        className="w-full bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 rounded p-2 resize-none overflow-hidden block"
                                                        style={{ minHeight: '36px' }}
                                                        ref={(elRef) => { if (elRef) { elRef.style.height = 'auto'; elRef.style.height = elRef.scrollHeight + 'px'; } }}
                                                        onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                                        value={scene.visual}
                                                        onChange={(e) => {
                                                          const newScenes = [...(newTaskData.designData?.videoScenes || [])];
                                                          newScenes[originalIndex] = { ...scene, visual: e.target.value };
                                                          setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: newScenes } });
                                                        }}
                                                        onPaste={(e) => handleVideoTablePaste(e as any, originalIndex, 'visual')}
                                                      />
                                                    </td>
                                                    <td className="p-1 border-r border-gray-100/50 align-top">
                                                      <textarea
                                                        rows={1}
                                                        placeholder="Ej: ¿Trabajas en...?"
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
                                                        onPaste={(e) => handleVideoTablePaste(e as any, originalIndex, 'onScreenText')}
                                                      />
                                                    </td>
                                                    <td className="p-1 border-r border-gray-100/50 align-top">
                                                      <textarea
                                                        rows={1}
                                                        placeholder="Ej: Sabías que..."
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
                                                        onPaste={(e) => handleVideoTablePaste(e as any, originalIndex, 'voiceOver')}
                                                      />
                                                    </td>
                                                    <td className="p-1 border-r border-gray-100/50 align-top">
                                                      <textarea
                                                        rows={1}
                                                        placeholder="Observaciones..."
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
                                                        onPaste={(e) => handleVideoTablePaste(e as any, originalIndex, 'observations')}
                                                      />
                                                    </td>
                                                    {newTaskData.designData?.customVideoColumns?.map(col => (
                                                      <td key={col.id} className="p-1 border-r border-gray-100/50 align-top">
                                                        <textarea
                                                          rows={1}
                                                          placeholder="..."
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
                                                          onPaste={(e) => handleVideoTablePaste(e as any, originalIndex, col.id)}
                                                        />
                                                      </td>
                                                    ))}
                                                    <td className="px-2 py-2 text-right align-top border-l border-gray-100/50">
                                                      <button
                                                        type="button"
                                                        onClick={() => setSceneToDelete(scene.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                      >
                                                        <Trash size={14} />
                                                      </button>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                      <Info size={14} className="text-pink-500" /> Referencias Visuales
                                    </label>
                                    <div className="flex gap-2">
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
                                    </div>
                                  </div>
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
                                            const dataUrl = await processAndCompressImage(file);
                                            const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                                            const newRefs = [...(currentDesignData.references || []), { id: Date.now().toString(), type: 'image' as const, url: dataUrl, comment: '' }];
                                            setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                                            } catch (err) {
                                              console.error("Error processing image:", err);
                                              alert("Error procesando la imagen. Intenta con un archivo más ligero.");
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
                                    {newTaskData.designData?.references && newTaskData.designData.references.length > 0 && (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                                        {newTaskData.designData.references.map((ref, refIdx) => (
                                          <div key={ref.id || refIdx} className="relative group bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden p-2 flex flex-col gap-2">
                                            {ref.type === 'image' ? (
                                              <img src={ref.url} alt="Referencia" className="w-full h-24 object-cover rounded-xl" />
                                            ) : (
                                              <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                                <LinkIcon size={24} />
                                              </div>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentDesignData = newTaskData.designData || { campaign: '', formats: '', elements: [], references: [] };
                                                const newRefs = (currentDesignData.references || []).filter((_, i) => i !== refIdx);
                                                setNewTaskData({ ...newTaskData, designData: { ...currentDesignData, references: newRefs } });
                                              }}
                                              className="absolute top-3 right-3 p-1.5 bg-white/90 text-rose-500 rounded-lg shadow-sm hover:bg-rose-500 hover:text-white transition-all"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-ng-lime text-ng-black text-xs font-black shadow-lg shadow-ng-lime/25 hover:bg-[#d5ed3a] transition-all flex items-center gap-2"
                    >
                      <Check size={14} />
                      <span>{editingTask ? 'Actualizar Historia' : 'Crear Historia'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
  );
}