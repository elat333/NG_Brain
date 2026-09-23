import { 
  X, Check, Edit, History, CheckCircle2, CheckSquare, Loader2 
} from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { Task, TeamMember, Role, Process, Project } from '../types';
import { isTaskBlocked as checkTaskBlocked } from '../lib/permissions';
import { TaskDeliverablesSection } from './tasks/modal/TaskDeliverablesSection';
import { TaskHistorySection } from './tasks/modal/TaskHistorySection';
import { TaskCommentsSection } from './tasks/modal/TaskCommentsSection';
import { TaskQuickActionsFooter } from './tasks/modal/TaskQuickActionsFooter';
import { StoryMetadataSidebar } from './tasks/modal/StoryMetadataSidebar';
import { StoryPlanningSection } from './tasks/modal/StoryPlanningSection';
import { MarketingDesignTemplate } from './tasks/modal/templates/MarketingDesignTemplate';
import { AudiovisualTemplate } from './tasks/modal/templates/AudiovisualTemplate';
import { commentService } from '../services/commentService';

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
  canEditDeliveryDateTime?: boolean;
  canEditActualHours?: boolean;
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
  canEditDeliveryDateTime = true,
  canEditActualHours = true,
  showTaskHistory,
  setShowTaskHistory,
  setTasks,
  setEditingTask,
  handleDeleteTask
}: TaskModalProps) {
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const [commentDraft, setCommentDraft] = useState<{ text: string; requiresReview: boolean }>({ text: '', requiresReview: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [realtimeComments, setRealtimeComments] = useState<any[]>(newTaskData.comments || []);

  useEffect(() => {
    setIsSubmitting(false);
  }, [isOpen, editingTask?.id]);

  // Sincronización desacoplada en tiempo real de comentarios de la tarea
  useEffect(() => {
    if (!isOpen) return;
    const currentTaskId = editingTask?.id;
    if (!currentTaskId) {
      setRealtimeComments(newTaskData.comments || []);
      return;
    }

    const unsubscribe = commentService.subscribeTaskComments(
      currentTaskId,
      (fetched) => {
        setRealtimeComments(fetched);
      },
      newTaskData.comments || []
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, editingTask?.id]);

  const handleDraftChange = useCallback((text: string, requiresReview: boolean) => {
    setCommentDraft({ text, requiresReview });
  }, []);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members]);

  const isPrimaryAssignee = currentMember?.id === (editingTask?.memberId || newTaskData?.memberId);
  const taskAccess: string = 'administrador';

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

  if (!isOpen) return null;

  const canEditStoryAndCriteria = isNewTask || isProcessLeader;

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
        <form 
          onSubmit={async (e) => {
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
                const targetTaskId = editingTask?.id || newTaskData.id;
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

              // Si el usuario no tiene permisos para modificar campos estructurales
              // y solo deseaba comentar, cerramos limpiamente habiendo guardado el comentario
              const canModifyTask = isNewTask || isProcessLeader || canEditMetadataField || canEditStatusField || canEditPlanning || canEditExecution;
              if (!canModifyTask) {
                onClose();
                return;
              }

              await onSave(e);
            } finally {
              setIsSubmitting(false);
            }
          }} 
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Header */}
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
            <div className="flex items-center gap-2 shrink-0">
              {editingTask && (
                <button
                  type="button"
                  onClick={() => setShowTaskHistory(!showTaskHistory)}
                  className={`p-3 rounded-2xl transition-all border shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs font-bold ${
                    showTaskHistory
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'
                  }`}
                  title="Historial de actividad"
                >
                  <History size={18} />
                  <span className="hidden sm:inline">Historial</span>
                </button>
              )}
              <button 
                type="button"
                onClick={onClose}
                className="p-3 shrink-0 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 shadow-sm hover:shadow-md"
                title="Cerrar"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {showTaskHistory && editingTask ? (
              <div className="p-4 bg-gray-50/50 rounded-3xl border border-gray-100 mb-6">
                <TaskHistorySection 
                  task={editingTask} 
                  members={members}
                  currentMember={currentMember}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              {/* Left Column: Metadata Sidebar */}
              <StoryMetadataSidebar
                newTaskData={newTaskData}
                setNewTaskData={setNewTaskData}
                editingTask={editingTask}
                processes={processes}
                projects={projects}
                sortedMembers={sortedMembers}
                tasks={tasks}
                setTasks={setTasks}
                canEditMetadataField={canEditMetadataField}
                canEditStatusField={canEditStatusField}
                isNewTask={isNewTask}
                isProcessLeader={isProcessLeader}
                isMarketingProcess={isMarketingProcess}
                handleDeleteTask={handleDeleteTask}
                checkTaskBlocked={checkTaskBlocked}
              />

              {/* Right Column: Story Details, Planning, Templates & Comments */}
              <div className="lg:col-span-9 space-y-4">
                {/* Planificación y Ejecución */}
                <StoryPlanningSection
                  newTaskData={newTaskData}
                  setNewTaskData={setNewTaskData}
                  canEditPlanning={isNewTask || isProcessLeader}
                  canEditExecution={canEditExecution}
                  canEditDeliveryDateTime={canEditDeliveryDateTime}
                  canEditActualHours={canEditActualHours}
                  showTimeInputs={showTimeInputs}
                  setShowTimeInputs={setShowTimeInputs}
                />

                {/* Descripción de la historia */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">
                    Descripción de la historia
                  </label>
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
                    <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">
                      Solo Líder / Administrador
                    </span>
                  )}
                </div>

                {/* Plantilla de Diseño (Marketing: Post estático o Carrusel) */}
                {(newTaskData.taskTemplate === 'design_post' || newTaskData.taskTemplate === 'design_carousel') && (
                  <MarketingDesignTemplate
                    newTaskData={newTaskData}
                    setNewTaskData={setNewTaskData}
                    canEdit={canEditStoryAndCriteria}
                  />
                )}

                {/* Plantilla Audiovisual (Marketing: Video) */}
                {newTaskData.taskTemplate === 'design_video' && (
                  <AudiovisualTemplate
                    newTaskData={newTaskData}
                    setNewTaskData={setNewTaskData}
                    canEdit={canEditStoryAndCriteria}
                  />
                )}

                {/* Criterios de Aceptación, Entregables y Comentarios */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
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
                    {!canEditStoryAndCriteria && (
                      <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">
                        Solo Líder / Administrador
                      </span>
                    )}
                  </div>

                  {/* Entregables */}
                  <TaskDeliverablesSection
                    deliverables={newTaskData.deliverables}
                    canEditExecution={canEditExecution}
                    onUpdateDeliverables={(newDeliverables) => {
                      setNewTaskData({ ...newTaskData, deliverables: newDeliverables });
                    }}
                  />

                  {/* Comentarios y Solicitudes de Revisión (100% Desacoplado) */}
                  <TaskCommentsSection
                    comments={realtimeComments}
                    currentMember={currentMember}
                    members={members}
                    canAddComment={true}
                    onDraftChange={handleDraftChange}
                    onAddComment={async (newComment) => {
                      const targetTaskId = editingTask?.id || newTaskData.id;
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
                      const targetTaskId = editingTask?.id || newTaskData.id;
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
                      const targetTaskId = editingTask?.id || newTaskData.id;
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
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <TaskQuickActionsFooter
              currentStatus={newTaskData.status || 'todo'}
              isProcessLeader={isProcessLeader}
              canEditExecution={canEditExecution}
              onTransitionStatus={(newStatus) => {
                setNewTaskData({ ...newTaskData, status: newStatus });
              }}
            />

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline-flex items-center gap-1.5 mr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Comentarios sincronizados
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl bg-ng-lime text-ng-black text-xs font-black shadow-lg shadow-ng-lime/25 hover:bg-[#d5ed3a] transition-all flex items-center gap-2 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : commentDraft.text && commentDraft.text.trim()
                    ? 'Guardar Comentario'
                    : editingTask
                    ? 'Actualizar Historia'
                    : 'Crear Historia'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}