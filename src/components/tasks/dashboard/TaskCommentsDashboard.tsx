import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, CheckCircle2, Clock, AlertCircle, User, 
  Search, ArrowRight, CheckCircle, FolderKanban, ChevronRight,
  Filter, Sparkles, AlertTriangle
} from 'lucide-react';
import { Task, TeamMember, Process, Project, TaskComment } from '../../../types';
import { renderCommentWithMentions } from '../modal/TaskCommentsSection';

export interface TaskCommentsDashboardProps {
  tasks: Task[];
  members: TeamMember[];
  processes: Process[];
  projects: Project[];
  currentMember: TeamMember | null;
  onOpenTask: (task: Task) => void;
  onResolveComment?: (taskId: string, commentId: string) => void;
}

export const TaskCommentsDashboard: React.FC<TaskCommentsDashboardProps> = ({
  tasks,
  members,
  processes,
  projects,
  currentMember,
  onOpenTask,
  onResolveComment
}) => {
  const [filterMemberId, setFilterMemberId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract all comments from all tasks with enriched task information
  const allCommentsWithTask = useMemo(() => {
    const list: { comment: TaskComment; task: Task; member?: TeamMember; process?: Process; project?: Project }[] = [];
    
    tasks.forEach(task => {
      if (task.comments && task.comments.length > 0) {
        const member = members.find(m => m.id === task.memberId);
        const process = processes.find(p => p.id === task.processId);
        const project = projects.find(p => p.id === task.projectId);

        task.comments.forEach(comment => {
          list.push({
            comment,
            task,
            member,
            process,
            project
          });
        });
      }
    });

    // Sort by createdAt descending
    return list.sort((a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime());
  }, [tasks, members, processes, projects]);

  // General Metrics
  const totalComments = allCommentsWithTask.length;
  const reviewRequests = allCommentsWithTask.filter(c => c.comment.requiresReview);
  const pendingRequests = reviewRequests.filter(c => c.comment.status === 'pending');
  const resolvedRequests = reviewRequests.filter(c => c.comment.status === 'resolved');

  // Stats grouped by Assigned Member
  const memberStats = useMemo(() => {
    const map = new Map<string, { member: TeamMember; pending: number; resolved: number; total: number }>();

    allCommentsWithTask.forEach(({ comment, task, member }) => {
      const mem = member || { id: task.memberId || 'unassigned', name: 'Sin Asignar', role: 'General' } as TeamMember;
      const key = mem.id;
      
      if (!map.has(key)) {
        map.set(key, { member: mem, pending: 0, resolved: 0, total: 0 });
      }

      const stat = map.get(key)!;
      stat.total += 1;
      if (comment.requiresReview) {
        if (comment.status === 'pending') {
          stat.pending += 1;
        } else if (comment.status === 'resolved') {
          stat.resolved += 1;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.pending - a.pending);
  }, [allCommentsWithTask]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    return allCommentsWithTask.filter(({ comment, task, member }) => {
      // Filter by Member
      if (filterMemberId !== 'all' && task.memberId !== filterMemberId && comment.authorId !== filterMemberId) {
        return false;
      }

      // Filter by Review Status
      if (filterStatus === 'pending' && (!comment.requiresReview || comment.status !== 'pending')) {
        return false;
      }
      if (filterStatus === 'resolved' && (!comment.requiresReview || comment.status !== 'resolved')) {
        return false;
      }

      // Filter by Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesText = comment.text.toLowerCase().includes(query);
        const matchesAuthor = comment.authorName.toLowerCase().includes(query);
        const matchesTask = task.title.toLowerCase().includes(query);
        const matchesMember = member?.name.toLowerCase().includes(query);
        if (!matchesText && !matchesAuthor && !matchesTask && !matchesMember) {
          return false;
        }
      }

      return true;
    });
  }, [allCommentsWithTask, filterMemberId, filterStatus, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Comentarios</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalComments}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-linear-to-br from-white to-amber-50/30 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Por Resolver</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{pendingRequests.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-linear-to-br from-white to-emerald-50/30 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Comentarios Resueltos</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{resolvedRequests.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tasa de Resolución</p>
            <p className="text-2xl font-black text-gray-900 mt-1">
              {reviewRequests.length > 0 
                ? `${Math.round((resolvedRequests.length / reviewRequests.length) * 100)}%` 
                : '100%'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      {/* Grid: Breakdown by Member & Live Interactive List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Member Resolution Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <User size={16} className="text-blue-500" /> Por Responsable
              </h3>
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                {memberStats.length} personas
              </span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
              {memberStats.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center font-medium">No hay comentarios registrados</p>
              ) : (
                memberStats.map(({ member, pending, resolved, total }, mIdx) => {
                  const isSelected = filterMemberId === member.id;
                  return (
                    <button
                      key={`dashboard_mem_stat_${member.id || mIdx}_${mIdx}`}
                      type="button"
                      onClick={() => setFilterMemberId(isSelected ? 'all' : member.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' 
                          : 'bg-gray-50/60 border-gray-200/60 hover:bg-gray-100/80 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{member.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{member.role || 'Colaborador'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {pending > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-black text-[10px]" title="Pendientes por resolver">
                            {pending} pend.
                          </span>
                        )}
                        {resolved > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]" title="Resueltos">
                            {resolved} res.
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Comments List with direct link to task (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-500" /> Registro de Observaciones & Feedback
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Haz clic en cualquier observación para abrir la tarea directamente
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200/60">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      filterStatus === 'all' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Por Resolver
                  </button>
                  <button
                    onClick={() => setFilterStatus('resolved')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      filterStatus === 'resolved' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Resueltos
                  </button>
                </div>

                {filterMemberId !== 'all' && (
                  <button
                    onClick={() => setFilterMemberId('all')}
                    className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    Limpiar Filtro Persona ×
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por texto de comentario, tarea o autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Comments Stream */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {filteredComments.length === 0 ? (
                <div className="text-center py-12 px-4 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
                  <MessageSquare size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-500">No hay observaciones que coincidan</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Ajusta los filtros o escribe un nuevo comentario en las tareas.
                  </p>
                </div>
              ) : (
                filteredComments.map(({ comment, task, member, process, project }, fcIdx) => {
                  const isPending = comment.requiresReview && comment.status === 'pending';
                  const isResolved = comment.requiresReview && comment.status === 'resolved';

                  return (
                    <div
                      key={`dashboard_comment_${task.id || 't'}_${comment.id || fcIdx}_${fcIdx}`}
                      onClick={() => onOpenTask(task)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-md ${
                        isPending
                          ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                          : isResolved
                          ? 'bg-emerald-50/30 border-emerald-200/60 hover:border-emerald-300'
                          : 'bg-white border-gray-200/80 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {comment.authorAvatar ? (
                            <img src={comment.authorAvatar} alt={comment.authorName} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center">
                              {comment.authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900 text-xs">{comment.authorName}</span>
                            {comment.authorRole && (
                              <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                                {comment.authorRole}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300/60">
                              <Clock size={10} /> Por Resolver
                            </span>
                          )}
                          {isResolved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                              <CheckCircle2 size={10} /> Resuelto
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Comment text */}
                      <div className="text-xs text-gray-700 leading-relaxed pl-8 mb-3 whitespace-pre-wrap">
                        {renderCommentWithMentions(comment.text, members)}
                      </div>

                      {/* Task Info Footer Banner */}
                      <div className="ml-8 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap bg-gray-50/70 p-2.5 rounded-xl group-hover:bg-blue-50/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Tarea:</span>
                          <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 truncate transition-colors">
                            {task.title}
                          </span>
                          {process && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {process.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                          <span>Abrir Tarea</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
