import React, { useState } from 'react';
import { 
  Layers, 
  LayoutTemplate, 
  User, 
  CheckCircle2, 
  Users, 
  UserPlus, 
  X, 
  Check, 
  FolderKanban, 
  Activity, 
  Zap, 
  Trash 
} from 'lucide-react';
import { TaskDependenciesSection } from './TaskDependenciesSection';
import { Member, Process, Project, Task } from '../../../types';

interface StoryMetadataSidebarProps {
  newTaskData: any;
  setNewTaskData: React.Dispatch<React.SetStateAction<any>>;
  editingTask: Task | null;
  processes: Process[];
  projects: Project[];
  sortedMembers: Member[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  canEditMetadataField: boolean;
  canEditStatusField: boolean;
  isNewTask: boolean;
  isProcessLeader: boolean;
  isMarketingProcess: boolean;
  handleDeleteTask?: (taskId: string) => void;
  checkTaskBlocked: (taskId: string, tasks: Task[]) => { isBlocked: boolean; blockers: Task[] };
}

export const StoryMetadataSidebar: React.FC<StoryMetadataSidebarProps> = ({
  newTaskData,
  setNewTaskData,
  editingTask,
  processes,
  projects,
  sortedMembers,
  tasks,
  setTasks,
  canEditMetadataField,
  canEditStatusField,
  isNewTask,
  isProcessLeader,
  isMarketingProcess,
  handleDeleteTask,
  checkTaskBlocked
}) => {
  const [showAddAuxDropdown, setShowAddAuxDropdown] = useState(false);
  const [auxSearchQuery, setAuxSearchQuery] = useState('');

  return (
    <div className="lg:col-span-3 space-y-6">
      <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 space-y-6">
        {/* Proceso */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
            <Layers size={12} className="text-blue-500" /> Proceso
          </label>
          <select 
            required
            disabled={!canEditMetadataField}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-xs font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            value={newTaskData.processId}
            onChange={e => {
              const newProcessId = e.target.value;
              const proc = processes.find(p => p.id === newProcessId);
              const isMkt = (proc?.name || '').toLowerCase().includes('marketing') || (proc?.id || '').toLowerCase().includes('marketing');
              
              const currentTemplate = newTaskData.taskTemplate;
              const isDesignTemplate = currentTemplate === 'design_post' || currentTemplate === 'design_carousel' || currentTemplate === 'design_video';
              
              setNewTaskData({
                ...newTaskData, 
                processId: newProcessId,
                taskTemplate: (!isMkt && isDesignTemplate) ? 'standard' : currentTemplate
              });
            }}
          >
            <option value="">Seleccionar Proceso...</option>
            {processes.map((p, pIdx) => <option key={`modal_proc_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Plantilla de Tarea */}
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
            {isMarketingProcess && (
              <optgroup label="Plantillas de Diseño (Marketing)">
                <option value="design_post">Diseño - Post Estático</option>
                <option value="design_carousel">Diseño - Carrusel</option>
                <option value="design_video">Diseño - Video</option>
              </optgroup>
            )}
          </select>
          {!isMarketingProcess && (
            <p className="text-[9px] text-gray-400 font-medium px-1 italic">
              * Las plantillas de diseño se activan al seleccionar el proceso de Marketing.
            </p>
          )}
        </div>

        {/* Responsable */}
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

        {/* Revisor */}
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

        {/* Auxiliares */}
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

          <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-2xl min-h-[48px] items-center border border-dashed border-gray-200">
            {(!Array.isArray(newTaskData.auxiliaryIds) || newTaskData.auxiliaryIds.length === 0) ? (
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
                          const nextIds = (Array.isArray(newTaskData.auxiliaryIds) ? newTaskData.auxiliaryIds : []).filter(currId => currId !== id);
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  className="w-full text-[11px] px-2.5 py-1.5 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 font-medium"
                  value={auxSearchQuery}
                  onChange={e => setAuxSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                {sortedMembers
                  .filter(m => !newTaskData.memberId || m.id !== newTaskData.memberId)
                  .filter(m => !auxSearchQuery || m.name.toLowerCase().includes(auxSearchQuery.toLowerCase()))
                  .map((m, mIdx) => {
                    const isSelected = Array.isArray(newTaskData.auxiliaryIds) && newTaskData.auxiliaryIds.includes(m.id);
                    return (
                      <button
                        key={`aux_add_opt_${m.id || mIdx}_${mIdx}`}
                        type="button"
                        onClick={() => {
                          const currentIds = Array.isArray(newTaskData.auxiliaryIds) ? [...newTaskData.auxiliaryIds] : [];
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

        {/* Proyecto */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
            <FolderKanban size={12} className="text-green-500" /> Proyecto
          </label>
          <select 
            disabled={!canEditMetadataField}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-xs font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            value={newTaskData.projectId}
            onChange={e => {
              const newProjId = e.target.value;
              const proj = projects.find(p => p.id === newProjId);
              let nextProcessId = newTaskData.processId;
              if (proj && proj.processId && !newTaskData.processId) {
                nextProcessId = proj.processId;
              }
              const proc = processes.find(p => p.id === nextProcessId);
              const isMkt = (proc?.name || '').toLowerCase().includes('marketing') || (proc?.id || '').toLowerCase().includes('marketing');
              const currentTemplate = newTaskData.taskTemplate;
              const isDesignTemplate = currentTemplate === 'design_post' || currentTemplate === 'design_carousel' || currentTemplate === 'design_video';

              setNewTaskData({
                ...newTaskData, 
                projectId: newProjId,
                ...(nextProcessId ? { processId: nextProcessId } : {}),
                taskTemplate: (!isMkt && isDesignTemplate) ? 'standard' : currentTemplate
              });
            }}
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

        {/* Estado Scrum */}
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
                const { isBlocked, blockers } = checkTaskBlocked(editingTask.id, tasks);
                if (isBlocked) {
                  alert(`ESTA TAREA ESTÁ BLOQUEADA\n\nPara poder iniciar esta tarea se debe terminar primero:\n• ${blockers.map(t => t.title).join('\n• ')}`);
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
                { value: 'review', label: '🔍 Para Revisión' },
                { value: 'correction', label: '🔧 Para Corrección' },
                { value: 'done', label: '✅ Completada' },
                { value: 'blocked', label: '🚫 Bloqueada' }
              ];
              if (isNewTask || isProcessLeader) {
                return allOptions.map((opt, optIdx) => (
                  <option key={`task_st_opt_${opt.value}_${optIdx}`} value={opt.value}>{opt.label}</option>
                ));
              }
              const allowedValues = new Set(['todo', 'in_progress', 'review', newTaskData.status]);
              const filtered = allOptions.filter(opt => allowedValues.has(opt.value));
              return filtered.map((opt, optIdx) => (
                <option key={`task_st_filt_opt_${opt.value}_${optIdx}`} value={opt.value}>{opt.label}</option>
              ));
            })()}
          </select>
        </div>

        {/* Prioridad */}
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

        {/* Dependencias */}
        <TaskDependenciesSection
          newTaskData={newTaskData}
          setNewTaskData={setNewTaskData}
          tasks={tasks}
          projects={projects}
          processes={processes}
          canEditMetadataField={canEditMetadataField}
          setTasks={setTasks}
        />
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
  );
};
