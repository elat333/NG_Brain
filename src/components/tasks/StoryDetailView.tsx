import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  ArrowLeft, Check, Edit, History, CheckCircle2, CheckSquare, Loader2, Link2, Sparkles, FolderKanban,
  Calendar, Clock, Lock, Plus, Trash2, Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { Task, TeamMember, Role, Process, Project } from '../../types';
import { isTaskBlocked as checkTaskBlocked } from '../../lib/permissions';
import { TaskDeliverablesSection } from './modal/TaskDeliverablesSection';
import { TaskHistorySection } from './modal/TaskHistorySection';
import { TaskCommentsSection } from './modal/TaskCommentsSection';
import { TaskQuickActionsFooter } from './modal/TaskQuickActionsFooter';
import { StoryMetadataSidebar } from './modal/StoryMetadataSidebar';
import { MarketingDesignTemplate } from './modal/templates/MarketingDesignTemplate';
import { AudiovisualTemplate } from './modal/templates/AudiovisualTemplate';
import { commentService } from '../../services/commentService';

export interface StoryDetailViewProps {
  task: Task;
  newTaskData: any;
  setNewTaskData: React.Dispatch<React.SetStateAction<any>>;
  onSave: (e: React.FormEvent) => Promise<void> | void;
  onBack: () => void;
  originTabLabel?: string;
  currentMember: TeamMember | null | undefined;
  roles: Role[];
  processes: Process[];
  projects: Project[];
  members: TeamMember[];
  tasks: Task[];
  isProcessLeader: boolean;
  canEditMetadataField: any;
  canEditStatusField: any;
  canEditPlanning: boolean;
  canEditExecution: boolean;
  canEditDeliveryDateTime?: boolean;
  canEditActualHours?: boolean;
  showTaskHistory: boolean;
  setShowTaskHistory: (show: boolean) => void;
  setTasks?: any;
  handleDeleteTask?: (id: string) => void;
}

export const StoryDetailView: React.FC<StoryDetailViewProps> = ({
  task,
  newTaskData,
  setNewTaskData,
  onSave,
  onBack,
  originTabLabel = 'Módulo Anterior',
  currentMember,
  roles,
  processes,
  projects,
  members,
  tasks,
  isProcessLeader,
  canEditMetadataField,
  canEditStatusField,
  canEditPlanning,
  canEditExecution,
  canEditDeliveryDateTime = true,
  canEditActualHours = true,
  showTaskHistory,
  setShowTaskHistory,
  setTasks,
  handleDeleteTask
}) => {
  const [showTimeInputs, setShowTimeInputs] = useState(
    Boolean(newTaskData.plannedStartTime || newTaskData.plannedEndTime)
  );
  const [commentDraft, setCommentDraft] = useState<{ text: string; requiresReview: boolean }>({ text: '', requiresReview: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [realtimeComments, setRealtimeComments] = useState<any[]>(newTaskData?.comments || []);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyStoryLink = () => {
    const taskId = task?.id || newTaskData?.id;
    if (!taskId) return;
    try {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const link = `${origin}${pathname}?story=${taskId}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Error al copiar enlace:', err);
    }
  };

  useEffect(() => {
    setIsSubmitting(false);
    setShowSaveSuccess(false);
    setCopiedLink(false);
    setShowTimeInputs(Boolean(newTaskData.plannedStartTime || newTaskData.plannedEndTime));
  }, [task?.id]);

  // Sincronización desacoplada en tiempo real de comentarios de la tarea
  useEffect(() => {
    const currentTaskId = task?.id;
    if (!currentTaskId) {
      setRealtimeComments(newTaskData?.comments || []);
      return;
    }

    const unsubscribe = commentService.subscribeTaskComments(
      currentTaskId,
      (fetched) => {
        setRealtimeComments(fetched);
      },
      newTaskData?.comments || []
    );

    return () => {
      unsubscribe();
    };
  }, [task?.id]);

  const handleDraftChange = useCallback((text: string, requiresReview: boolean) => {
    setCommentDraft({ text, requiresReview });
  }, []);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members]);

  // Verifica si el proceso actual o proyecto enlazado es de Marketing
  const isMarketingProcess = useMemo(() => {
    if (newTaskData.processId) {
      const proc = processes.find(p => p.id === newTaskData.processId);
      if (proc) {
        return (proc.name || '').toLowerCase().includes('marketing') || (proc.id || '').toLowerCase().includes('marketing');
      }
      return newTaskData.processId.toLowerCase().includes('marketing');
    }
    if (newTaskData.projectId) {
      const proj = projects.find(p => p.id === newTaskData.projectId);
      if (proj && proj.processId) {
        const proc = processes.find(p => p.id === proj.processId);
        return (proc?.name || '').toLowerCase().includes('marketing') || (proc?.id || '').toLowerCase().includes('marketing');
      }
    }
    return false;
  }, [newTaskData.processId, newTaskData.projectId, processes, projects]);

  const canEditStoryAndCriteria = isProcessLeader || canEditPlanning;

  // Proceso y Proyecto asociados para badges
  const currentProcess = useMemo(() => {
    return processes.find(p => p.id === newTaskData.processId);
  }, [processes, newTaskData.processId]);

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === newTaskData.projectId);
  }, [projects, newTaskData.projectId]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (commentDraft.text && commentDraft.text.trim()) {
        const mentionedIds: string[] = [];
        members.forEach(m => {
          if (commentDraft.text.includes(`@${m.name}`)) {
            mentionedIds.push(m.id);
          }
        });
        const targetTaskId = task?.id || newTaskData.id;
        try {
          const created = await commentService.addComment({
            authorId: currentMember?.id || 'anonymous',
            authorName: currentMember?.name || 'Usuario',
            authorRole: currentMember?.role || 'Colaborador',
            authorAvatar: currentMember?.avatar || '',
            text: commentDraft.text.trim(),
            requiresReview: !!commentDraft.requiresReview,
            status: commentDraft.requiresReview ? 'pending' : undefined,
            mentionedMemberIds: mentionedIds.length > 0 ? Array.from(new Set(mentionedIds)) : [],
            taskId: targetTaskId,
            taskTitle: newTaskData.title || ''
          });
          setRealtimeComments(prev => {
            if (prev.some(c => c.id === created.id)) return prev;
            return [...prev, created];
          });
          setCommentDraft({ text: '', requiresReview: false });
        } catch (err) {
          console.error('Error saving draft comment:', err);
        }
      }

      const canModifyTask = isProcessLeader || canEditMetadataField || canEditStatusField || canEditPlanning || canEditExecution;
      if (!canModifyTask) {
        onBack();
        return;
      }

      await onSave(e);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="w-full max-w-7xl mx-auto space-y-5 pb-16"
    >
      <form onSubmit={handleSubmitForm} className="space-y-5">
        {/* BARRA SUPERIOR DE NAVEGACIÓN Y ACCIONES STICKY */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md p-3.5 md:p-4 rounded-3xl border border-gray-200/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all shadow-2xs hover:scale-102 cursor-pointer group"
            >
              <ArrowLeft size={15} className="text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
              <span>Volver a {originTabLabel}</span>
            </button>

            {currentProcess && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/70 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentProcess.color || '#3b82f6' }} />
                {currentProcess.name}
              </span>
            )}

            {currentProject && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5 shrink-0">
                <FolderKanban size={13} className="text-blue-500" />
                {currentProject.name}
              </span>
            )}

            {/* SEPARADOR VERTICAL */}
            <div className="hidden md:block h-5 w-px bg-slate-200 mx-0.5" />

            {/* CAMBIO RÁPIDO DE ESTADO EN BARRA SUPERIOR PERSISTENTE */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <TaskQuickActionsFooter
                currentStatus={newTaskData.status || 'todo'}
                isProcessLeader={isProcessLeader}
                canEditExecution={canEditExecution}
                onTransitionStatus={(newStatus) => {
                  setNewTaskData({ ...newTaskData, status: newStatus });
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handleCopyStoryLink}
              className={`px-3 py-1.5 rounded-xl transition-all border shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
              }`}
              title="Copiar enlace directo de esta historia"
            >
              {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Link2 size={14} />}
              <span>{copiedLink ? '¡Copiado!' : 'Copiar Enlace'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTaskHistory(!showTaskHistory)}
              className={`px-3 py-1.5 rounded-xl transition-all border shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                showTaskHistory
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
              }`}
              title="Historial de actividad"
            >
              <History size={14} />
              <span className="hidden sm:inline">Historial</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                showSaveSuccess
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-ng-lime text-ng-black shadow-ng-lime/20 hover:bg-[#d5ed3a]'
              } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              title="Guardar cambios sin salir de la historia"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : showSaveSuccess ? (
                <Check size={14} className="text-white" />
              ) : (
                <Check size={14} />
              )}
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : showSaveSuccess
                  ? '¡Guardado!'
                  : commentDraft.text && commentDraft.text.trim()
                  ? 'Guardar Comentario'
                  : 'Guardar Cambios'}
              </span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Salir y volver al módulo anterior"
            >
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* ENCABEZADO UNIFICADO COMPACTO: Título + Fechas en 1 solo bloque */}
        <div className="bg-white p-4 md:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
          {/* Fila 2: Título de la Historia */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shadow-inner shrink-0">
              <Edit size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                Historia de Usuario / Actividad
              </span>
              <input
                type="text"
                required
                disabled={!isProcessLeader}
                placeholder="Título de la historia de usuario..."
                className={`w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-xl md:text-2xl font-black tracking-tight placeholder:text-gray-300 px-0 py-0 leading-tight ${
                  !isProcessLeader ? 'cursor-not-allowed text-gray-800' : 'text-gray-900'
                }`}
                value={newTaskData.title}
                onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
              />
            </div>
          </div>

          {/* Fila 3: Ribbon Compacto de Planificación y Ejecución Real */}
          <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-2.5 text-xs">
            {/* Grupo Planificación */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50/90 p-1.5 rounded-2xl border border-slate-200/70">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 px-1">
                Planificación
              </span>

              {/* Fecha Planificada */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <Calendar size={12} className="text-sky-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400">Planif:</span>
                <input 
                  type="date" 
                  disabled={!canEditExecution}
                  className={`bg-transparent border-0 p-0 text-xs font-bold text-slate-700 focus:outline-none ${
                    !canEditExecution ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'
                  }`}
                  value={newTaskData.plannedDate || ''}
                  onChange={e => setNewTaskData({...newTaskData, plannedDate: e.target.value})}
                />
              </div>

              {/* Fecha Límite */}
              <div className="flex items-center gap-1.5 bg-red-50/80 px-2.5 py-1 rounded-xl border border-red-200 shadow-2xs" title={!canEditPlanning ? "Solo líder o administrador" : undefined}>
                <Calendar size={12} className="text-red-500 shrink-0" />
                <span className="text-[10px] font-bold text-red-500">Límite:</span>
                <input 
                  type="date" 
                  disabled={!canEditPlanning}
                  className={`bg-transparent border-0 p-0 text-xs font-bold text-red-700 focus:outline-none ${
                    !canEditPlanning ? 'cursor-not-allowed text-red-400' : 'cursor-pointer'
                  }`}
                  value={newTaskData.dueDate || ''}
                  onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                />
                {!canEditPlanning && <Lock size={10} className="text-red-300 ml-0.5" />}
              </div>

              {/* Horas Planificadas (Escala Fibonacci) */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <Clock size={12} className="text-blue-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400">Horas:</span>
                <select 
                  disabled={!canEditPlanning}
                  className={`bg-transparent border-0 p-0 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer ${
                    !canEditPlanning ? 'cursor-not-allowed text-slate-400' : ''
                  }`}
                  value={newTaskData.plannedHours}
                  onChange={e => setNewTaskData({...newTaskData, plannedHours: parseFloat(e.target.value) || 0})}
                >
                  <option value="0">0h</option>
                  {newTaskData.plannedHours && ![0, 0.5, 1, 2, 3, 5, 8, 13, 21, 34].includes(newTaskData.plannedHours) && (
                    <option value={newTaskData.plannedHours}>
                      {newTaskData.plannedHours}h (actual)
                    </option>
                  )}
                  {[0.5, 1, 2, 3, 5, 8, 13, 21, 34].map((num, nIdx) => (
                    <option key={`task_hours_opt_${num}_${nIdx}`} value={num}>
                      {num === 0.5 ? '0.5h' : `${num}h`}
                    </option>
                  ))}
                </select>
                {!canEditPlanning && <Lock size={10} className="text-slate-300 ml-0.5" />}
              </div>

              {/* Botón / Inputs de Horario */}
              {!showTimeInputs && canEditExecution ? (
                <button 
                  type="button" 
                  onClick={() => setShowTimeInputs(true)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} /> Horario
                </button>
              ) : showTimeInputs ? (
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
                  <input 
                    type="time" 
                    disabled={!canEditExecution}
                    className="bg-transparent border-0 p-0 text-xs font-bold text-slate-700 focus:outline-none"
                    value={newTaskData.plannedStartTime || ''}
                    onChange={e => setNewTaskData({...newTaskData, plannedStartTime: e.target.value})}
                  />
                  <span className="text-slate-300 text-xs">-</span>
                  <input 
                    type="time" 
                    disabled={!canEditExecution}
                    className="bg-transparent border-0 p-0 text-xs font-bold text-slate-700 focus:outline-none"
                    value={newTaskData.plannedEndTime || ''}
                    onChange={e => setNewTaskData({...newTaskData, plannedEndTime: e.target.value})}
                  />
                  {canEditExecution && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowTimeInputs(false);
                        setNewTaskData({...newTaskData, plannedStartTime: '', plannedEndTime: ''});
                      }}
                      className="text-red-400 hover:text-red-500 p-0.5 cursor-pointer"
                      title="Quitar Horario"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {/* Separador vertical */}
            <div className="hidden lg:block h-6 w-px bg-slate-200" />

            {/* Grupo Ejecución Real */}
            <div className="flex flex-wrap items-center gap-2 bg-blue-50/60 p-1.5 rounded-2xl border border-blue-100">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 px-1">
                Ejecución Real
              </span>

              {/* Fecha Entrega */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs" title={!canEditDeliveryDateTime ? "Disponible cuando la tarea está En Progreso" : undefined}>
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400">Entrega:</span>
                <input 
                  type="date" 
                  disabled={!canEditDeliveryDateTime}
                  className={`bg-transparent border-0 p-0 text-xs font-bold text-slate-700 focus:outline-none ${
                    !canEditDeliveryDateTime ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'
                  }`}
                  value={newTaskData.actualEndDate || ''}
                  onChange={e => setNewTaskData({...newTaskData, actualEndDate: e.target.value})}
                />
                {!canEditDeliveryDateTime && <Lock size={10} className="text-slate-300 ml-0.5" />}
              </div>

              {/* Hora Entrega */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs" title={!canEditDeliveryDateTime ? "Disponible cuando la tarea está En Progreso" : undefined}>
                <Clock size={12} className="text-blue-500 shrink-0" />
                <input 
                  type="time" 
                  disabled={!canEditDeliveryDateTime}
                  className={`bg-transparent border-0 p-0 text-xs font-bold text-slate-700 focus:outline-none ${
                    !canEditDeliveryDateTime ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'
                  }`}
                  value={newTaskData.actualEndTime || ''}
                  onChange={e => setNewTaskData({...newTaskData, actualEndTime: e.target.value})}
                />
                {!canEditDeliveryDateTime && <Lock size={10} className="text-slate-300 ml-0.5" />}
              </div>

              {/* Horas Reales */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs" title={!canEditActualHours ? "Disponible cuando la tarea está En Progreso" : undefined}>
                <Activity size={12} className="text-green-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400">Reales:</span>
                <input 
                  type="number" 
                  step="0.5" 
                  min="0"
                  disabled={!canEditActualHours}
                  className={`w-11 bg-transparent border-0 p-0 text-xs font-bold text-slate-700 focus:outline-none ${
                    !canEditActualHours ? 'cursor-not-allowed text-slate-400' : ''
                  }`}
                  value={newTaskData.actualHours || 0}
                  onChange={e => setNewTaskData({...newTaskData, actualHours: parseFloat(e.target.value) || 0})}
                />
                <span className="text-[10px] font-bold text-slate-400">h</span>
                {!canEditActualHours && <Lock size={10} className="text-slate-300 ml-0.5" />}
              </div>
            </div>
          </div>
        </div>

        {/* Historial si está expandido */}
        {showTaskHistory && task && (
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <TaskHistorySection 
              task={task} 
              members={members}
              currentMember={currentMember}
            />
          </div>
        )}

        {/* Layout de 2 Columnas Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Columna Izquierda: Descripción, Plantillas, Criterios, Entregables y Comentarios */}
          <div className="lg:col-span-8 space-y-5">
            {/* Descripción de la Historia */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  Descripción de la historia
                </label>
                {!canEditStoryAndCriteria && (
                  <span className="text-[9px] font-black tracking-tight text-red-500 uppercase">
                    Solo Líder / Administrador
                  </span>
                )}
              </div>
              <textarea 
                placeholder="Describe el contexto narrativo de la historia de usuario o actividad..."
                disabled={!canEditStoryAndCriteria}
                className={`w-full h-32 px-5 py-3.5 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm leading-relaxed shadow-2xs placeholder:text-gray-300 ${
                  !canEditStoryAndCriteria ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-slate-800'
                }`}
                value={newTaskData.storyDescription || ''}
                onChange={e => setNewTaskData({...newTaskData, storyDescription: e.target.value})}
              />
            </div>

            {/* Plantilla de Diseño (Marketing: Post estático o Carrusel) */}
            {(newTaskData.taskTemplate === 'design_post' || newTaskData.taskTemplate === 'design_carousel') && (
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
                <MarketingDesignTemplate
                  newTaskData={newTaskData}
                  setNewTaskData={setNewTaskData}
                  canEdit={canEditStoryAndCriteria}
                />
              </div>
            )}

            {/* Plantilla Audiovisual (Marketing: Video) */}
            {newTaskData.taskTemplate === 'design_video' && (
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
                <AudiovisualTemplate
                  newTaskData={newTaskData}
                  setNewTaskData={setNewTaskData}
                  canEdit={canEditStoryAndCriteria}
                />
              </div>
            )}

            {/* Criterios de Aceptación */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckSquare size={14} className="text-emerald-500" />
                  Criterios de Aceptación
                </label>
                {!canEditStoryAndCriteria && (
                  <span className="text-[9px] font-black tracking-tight text-red-500 uppercase">
                    Solo Líder / Administrador
                  </span>
                )}
              </div>
              <textarea 
                placeholder="Lista de criterios requeridos para dar por finalizada la tarea..."
                disabled={!canEditStoryAndCriteria}
                className={`w-full h-28 px-5 py-3.5 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none text-sm leading-relaxed shadow-2xs placeholder:text-gray-300 ${
                  !canEditStoryAndCriteria ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-slate-800'
                }`}
                value={newTaskData.acceptanceCriteria || ''}
                onChange={e => setNewTaskData({...newTaskData, acceptanceCriteria: e.target.value})}
              />
            </div>

            {/* Entregables */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
              <TaskDeliverablesSection
                deliverables={newTaskData.deliverables}
                canEditExecution={canEditExecution}
                onUpdateDeliverables={(newDeliverables) => {
                  setNewTaskData({ ...newTaskData, deliverables: newDeliverables });
                }}
              />
            </div>

            {/* Comentarios y Solicitudes de Revisión */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
              <TaskCommentsSection
                comments={realtimeComments}
                currentMember={currentMember}
                members={members}
                canAddComment={true}
                onDraftChange={handleDraftChange}
                onAddComment={async (newComment) => {
                  const targetTaskId = task?.id || newTaskData.id;
                  const created = await commentService.addComment({
                    ...newComment,
                    taskId: targetTaskId,
                    taskTitle: newTaskData.title || ''
                  });
                  setRealtimeComments(prev => {
                    if (prev.some(c => c.id === created.id)) return prev;
                    return [...prev, created];
                  });
                  return created;
                }}
                onToggleCommentStatus={async (commentId, newStatus) => {
                  const targetTaskId = task?.id || newTaskData.id;
                  try {
                    await commentService.toggleCommentStatus(
                      commentId,
                      newStatus,
                      currentMember?.name,
                      targetTaskId
                    );
                    setRealtimeComments(prev => prev.map(c => {
                      if (c.id === commentId) {
                        return {
                          ...c,
                          status: newStatus,
                          resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
                          resolvedBy: newStatus === 'resolved' ? (currentMember?.name || 'Usuario') : undefined
                        };
                      }
                      return c;
                    }));
                  } catch (err) {
                    console.error('Error updating comment status in real-time:', err);
                    alert('No se pudo actualizar el estado del comentario en el servidor.');
                  }
                }}
                onDeleteComment={async (commentId) => {
                  const targetTaskId = task?.id || newTaskData.id;
                  try {
                    await commentService.deleteComment(commentId, targetTaskId);
                    setRealtimeComments(prev => prev.filter(c => c.id !== commentId));
                  } catch (err) {
                    console.error('Error deleting comment in real-time:', err);
                    alert('No se pudo eliminar el comentario en el servidor.');
                  }
                }}
              />
            </div>
          </div>

          {/* Columna Derecha: Metadatos y Acciones Rápidas */}
          <div className="lg:col-span-4 space-y-5 sticky top-6">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <StoryMetadataSidebar
                newTaskData={newTaskData}
                setNewTaskData={setNewTaskData}
                editingTask={task}
                processes={processes}
                projects={projects}
                sortedMembers={sortedMembers}
                tasks={tasks}
                setTasks={setTasks}
                canEditMetadataField={canEditMetadataField}
                canEditStatusField={canEditStatusField}
                isNewTask={false}
                isProcessLeader={isProcessLeader}
                isMarketingProcess={isMarketingProcess}
                handleDeleteTask={handleDeleteTask}
                checkTaskBlocked={checkTaskBlocked}
              />
            </div>

            {/* Acciones Rápidas de Transición de Estado */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Cambio Rápido de Estado
              </h4>
              <TaskQuickActionsFooter
                currentStatus={newTaskData.status || 'todo'}
                isProcessLeader={isProcessLeader}
                canEditExecution={canEditExecution}
                onTransitionStatus={(newStatus) => {
                  setNewTaskData({ ...newTaskData, status: newStatus });
                }}
              />
            </div>

            {/* Botones de Acción al pie de la columna */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  showSaveSuccess
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-ng-lime text-ng-black shadow-ng-lime/20 hover:bg-[#d5ed3a]'
                } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                title="Guardar cambios sin salir de la historia"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : showSaveSuccess ? (
                  <Check size={16} className="text-white" />
                ) : (
                  <Check size={16} />
                )}
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : showSaveSuccess
                    ? '¡Guardado con Éxito!'
                    : commentDraft.text && commentDraft.text.trim()
                    ? 'Guardar Comentario'
                    : 'Guardar Cambios'}
                </span>
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
              >
                Cerrar y Volver
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};
