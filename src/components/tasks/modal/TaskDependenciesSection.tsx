import React from 'react';
import { Ban, Activity, Plus, X, Copy } from 'lucide-react';
import { Task, Project, Process } from '../../../types';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface TaskDependenciesSectionProps {
  newTaskData: any;
  setNewTaskData: React.Dispatch<React.SetStateAction<any>>;
  tasks: Task[];
  projects: Project[];
  processes: Process[];
  canEditMetadataField: boolean;
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
}

export const TaskDependenciesSection: React.FC<TaskDependenciesSectionProps> = ({
  newTaskData,
  setNewTaskData,
  tasks,
  projects,
  processes,
  canEditMetadataField,
  setTasks
}) => {
  const [showAddBlockerDropdown, setShowAddBlockerDropdown] = React.useState(false);
  const [blockerSearchQuery, setBlockerSearchQuery] = React.useState('');
  const [blockerSelectedProjectId, setBlockerSelectedProjectId] = React.useState('all');
  const [blockerSelectedProcessId, setBlockerSelectedProcessId] = React.useState('all');

  const [showAddBlocksDropdown, setShowAddBlocksDropdown] = React.useState(false);
  const [blocksSearchQuery, setBlocksSearchQuery] = React.useState('');
  const [blocksSelectedProjectId, setBlocksSelectedProjectId] = React.useState('all');
  const [blocksSelectedProcessId, setBlocksSelectedProcessId] = React.useState('all');

  return (
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
                        
                        if (blockerSearchQuery && !t.title.toLowerCase().includes(blockerSearchQuery.toLowerCase())) {
                          return false;
                        }
                        if (blockerSelectedProjectId !== 'all' && t.projectId !== blockerSelectedProjectId) {
                          return false;
                        }
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
                            className="w-full text-left p-2 rounded-xl hover:bg-red-50/50 transition-colors border border-transparent hover:border-red-100 flex flex-col gap-0.5 cursor-pointer"
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
            {newTaskData.blockedByTaskIds?.map((id: string, bIdx: number) => {
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
                          blockedByTaskIds: newTaskData.blockedByTaskIds?.filter((tid: string) => tid !== id)
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
                      {projects.map((p, pIdx) => (
                        <option key={`blocks_proj_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      value={blocksSelectedProcessId}
                      onChange={e => setBlocksSelectedProcessId(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                    >
                      <option value="all">Todos los Proc.</option>
                      {processes.map((p, pIdx) => (
                        <option key={`blocks_proc_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Resultados de tareas */}
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pt-1">
                    {(() => {
                      const filteredTasks = tasks.filter(t => {
                        if (t.id === newTaskData.id) return false;
                        if ((t.blockedByTaskIds || []).includes(newTaskData.id)) return false;
                        
                        if (blocksSearchQuery && !t.title.toLowerCase().includes(blocksSearchQuery.toLowerCase())) {
                          return false;
                        }
                        if (blocksSelectedProjectId !== 'all' && t.projectId !== blocksSelectedProjectId) {
                          return false;
                        }
                        if (blocksSelectedProcessId !== 'all' && t.processId !== blocksSelectedProcessId) {
                          return false;
                        }
                        return true;
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
                            className="w-full text-left p-2 rounded-xl hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100 flex flex-col gap-0.5 cursor-pointer"
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
                          setTasks?.(prev => prev.map(pt => pt.id === t.id ? {
                            ...pt,
                            blockedByTaskIds: pt.blockedByTaskIds?.filter(id => id !== newTaskData.id)
                          } : pt));
                          
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
  );
};
