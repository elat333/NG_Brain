import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  CalendarDays, 
  MessageSquare, 
  Search, 
  User, 
  Building2, 
  FolderKanban, 
  Eye, 
  Wrench,
  ArrowUpRight
} from 'lucide-react';
import { Task, TeamMember, Process, Project, Role, TaskComment } from '../../types';
import { commentService } from '../../services/commentService';
import { getModuleAccess } from '../../lib/permissions';

export interface DashboardViewProps {
  tasks?: Task[];
  projects?: Project[];
  processes: Process[];
  members: TeamMember[];
  currentMember?: TeamMember | null;
  roles?: Role[];
  onOpenTask?: (task: Task) => void;
  onAddTask?: () => void;
  onNavigateToScrum?: () => void;
  onNavigateToTranscript?: () => void;
  onNavigateToProcess?: (processId: string) => void;
  isTaskVisibleForMember?: (task: Task, member: TeamMember | null | undefined, roles: Role[]) => boolean;
}

type StoryCategory = 'all' | 'review' | 'correction' | 'today' | 'expired' | 'nodate';

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks = [],
  projects = [],
  processes = [],
  members = [],
  currentMember,
  roles = [],
  onOpenTask,
  onAddTask,
  onNavigateToProcess,
  isTaskVisibleForMember
}) => {
  // Verificar si el usuario puede ver historias de todo el equipo (Admins o Líderes de algún proceso)
  const canViewTeamStories = useMemo(() => {
    if (!currentMember) return false;
    if (currentMember.isSystemAdmin || currentMember.systemRoleId === 'role-admin') return true;
    return processes.some(proc => {
      const access = getModuleAccess(currentMember, roles, `tasks_${proc.id}`, false);
      return access === 'lider' || access === 'administrador';
    });
  }, [currentMember, roles, processes]);

  // Estados locales de filtrado (por defecto 'my' para foco personal)
  const [activeCategory, setActiveCategory] = useState<StoryCategory>('today');
  const [scopeFilter, setScopeFilter] = useState<'my' | 'all'>('my');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [commentTab, setCommentTab] = useState<'all' | 'reviews' | 'mentions'>('all');
  const [liveComments, setLiveComments] = useState<TaskComment[]>([]);

  // Suscripción en tiempo real a comentarios de historias
  useEffect(() => {
    const unsubscribe = commentService.subscribeAllComments((comments) => {
      setLiveComments(comments);
    }, tasks);

    return () => {
      unsubscribe();
    };
  }, [tasks]);

  // Fecha actual YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filtrar historias visibles según permisos del usuario
  const baseVisibleStories = useMemo(() => {
    return tasks.filter(t => {
      if (isTaskVisibleForMember && roles) {
        return isTaskVisibleForMember(t, currentMember, roles);
      }
      return true;
    });
  }, [tasks, currentMember, roles, isTaskVisibleForMember]);

  // Helper para verificar si la historia está asignada al miembro actual
  const isAssignedToCurrentMember = (t: Task): boolean => {
    if (!currentMember) return false;
    const isAssignee = t.memberId === currentMember.id;
    const isAuxiliary = Boolean(t.auxiliaryIds?.includes(currentMember.id) || t.auxiliaryId === currentMember.id);
    const isReviewer = t.revisorId === currentMember.id;
    return Boolean(isAssignee || isAuxiliary || isReviewer);
  };

  // Clasificación de historias
  const isStoryReview = (t: Task): boolean => {
    return t.status === 'review' || Boolean(t.comments?.some(c => c.requiresReview && c.status === 'pending'));
  };

  const isStoryCorrection = (t: Task): boolean => {
    return t.status === 'correction' || Boolean(t.hasPendingReview);
  };

  const isStoryToday = (t: Task): boolean => {
    if (t.status === 'done' || t.status === 'rejected') return false;
    return t.plannedDate === todayStr || t.dueDate === todayStr;
  };

  const isStoryExpired = (t: Task): boolean => {
    if (t.status === 'done' || t.status === 'rejected') return false;
    if (!t.dueDate) return false;
    return t.dueDate < todayStr;
  };

  const isStoryNoDate = (t: Task): boolean => {
    if (t.status === 'done' || t.status === 'rejected') return false;
    return !t.dueDate && !t.plannedDate;
  };

  // Conjunto de historias filtradas por ámbito y proceso
  const scopedStories = useMemo(() => {
    return baseVisibleStories.filter(t => {
      // Filtro de ámbito: Si no puede ver todo o tiene 'my' activo, filtrar por asignación
      if (!canViewTeamStories || scopeFilter === 'my') {
        if (!isAssignedToCurrentMember(t)) return false;
      }
      // Filtro de proceso
      if (processFilter !== 'all' && t.processId !== processFilter) {
        return false;
      }
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [baseVisibleStories, canViewTeamStories, scopeFilter, processFilter, searchQuery, currentMember]);

  // Conteo de métricas para los Pills minimalistas
  const stats = useMemo(() => {
    const applyScopeAndProc = (t: Task) => {
      if (!canViewTeamStories || scopeFilter === 'my') {
        if (!isAssignedToCurrentMember(t)) return false;
      }
      if (processFilter !== 'all' && t.processId !== processFilter) return false;
      return true;
    };

    const targetList = baseVisibleStories.filter(applyScopeAndProc);

    const reviewCount = targetList.filter(isStoryReview).length;
    const correctionCount = targetList.filter(isStoryCorrection).length;
    const todayCount = targetList.filter(isStoryToday).length;
    const expiredCount = targetList.filter(isStoryExpired).length;
    const noDateCount = targetList.filter(isStoryNoDate).length;
    const totalActive = targetList.filter(t => t.status !== 'done' && t.status !== 'rejected').length;

    return {
      review: reviewCount,
      correction: correctionCount,
      today: todayCount,
      expired: expiredCount,
      noDate: noDateCount,
      totalActive
    };
  }, [baseVisibleStories, canViewTeamStories, scopeFilter, processFilter, currentMember, todayStr]);

  // Lista final mostrada según la categoría seleccionada
  const displayedStories = useMemo(() => {
    return scopedStories.filter(t => {
      switch (activeCategory) {
        case 'review':
          return isStoryReview(t);
        case 'correction':
          return isStoryCorrection(t);
        case 'today':
          return isStoryToday(t);
        case 'expired':
          return isStoryExpired(t);
        case 'nodate':
          return isStoryNoDate(t);
        case 'all':
        default:
          return t.status !== 'done' && t.status !== 'rejected';
      }
    });
  }, [scopedStories, activeCategory, todayStr]);

  // Feed de comentarios
  const feedComments = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const list: { comment: TaskComment; task?: Task; member?: TeamMember; process?: Process }[] = [];

    liveComments.forEach(comment => {
      const task = comment.taskId ? taskMap.get(comment.taskId) : undefined;
      const member = members.find(m => m.id === comment.authorId);
      const process = task?.processId ? processes.find(p => p.id === task.processId) : undefined;

      // Aplicar filtro de tab de comentarios
      if (commentTab === 'reviews' && !comment.requiresReview) return;
      if (commentTab === 'mentions' && currentMember) {
        const isMentioned = comment.mentionedMemberIds?.includes(currentMember.id);
        const isTarget = comment.targetMemberId === currentMember.id;
        if (!isMentioned && !isTarget) return;
      }

      list.push({ comment, task, member, process });
    });

    return list.slice(0, 30);
  }, [liveComments, tasks, members, processes, commentTab, currentMember]);

  // Helper para tiempo relativo
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return `Hace ${diffDays} d`;
    } catch {
      return dateStr;
    }
  };

  // Helper para días de retraso
  const getDaysOverdue = (dueDateStr: string): number => {
    try {
      const due = new Date(dueDateStr);
      const now = new Date(todayStr);
      const diffTime = now.getTime() - due.getTime();
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      return 1;
    }
  };

  return (
    <motion.div
      key="dashboard_split_view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col min-h-0"
    >
      {/* PANTALLA DIVIDIDA CON DESPLAZAMIENTO INDEPENDIENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1 min-h-0">
        
        {/* COLUMNA 1 (5/12): Muro de Comentarios y Feedback (Scroll Independiente) */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 lg:h-[calc(100vh-130px)] lg:overflow-y-auto custom-scrollbar pr-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-3 shrink-0">
            
            {/* Header del Muro */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <MessageSquare size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Muro de Comentarios y Feedback
                  </h3>
                  <p className="text-[9px] text-gray-400">Actividad y observaciones en historias</p>
                </div>
              </div>

              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="En vivo" />
            </div>

            {/* Pestañas de Filtro de Comentarios */}
            <div className="flex items-center bg-gray-50 p-1 rounded-xl text-[10px] font-bold">
              <button
                onClick={() => setCommentTab('all')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  commentTab === 'all' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Todos ({liveComments.length})
              </button>
              <button
                onClick={() => setCommentTab('reviews')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  commentTab === 'reviews' ? 'bg-white text-purple-700 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Revisiones ({liveComments.filter(c => c.requiresReview).length})
              </button>
              <button
                onClick={() => setCommentTab('mentions')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  commentTab === 'mentions' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Menciones
              </button>
            </div>

            {/* Lista del Feed de Comentarios */}
            <div className="space-y-2.5 max-h-[480px] lg:max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {feedComments.map(({ comment, task, member, process }, idx) => (
                <div
                  key={`feed_comment_${comment.id || idx}`}
                  onClick={() => task && onOpenTask?.(task)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    comment.requiresReview && comment.status === 'pending'
                      ? 'bg-purple-50/60 border-purple-200 hover:border-purple-400'
                      : 'bg-gray-50/60 border-gray-100 hover:border-blue-300 hover:bg-white'
                  }`}
                >
                  {/* Encabezado del Comentario */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                        {member?.avatar ? (
                          <img src={member.avatar} alt={comment.authorName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          comment.authorName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-gray-900 truncate block">
                          {comment.authorName}
                        </span>
                        <span className="text-[9px] text-gray-400 font-medium">
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>
                    </div>

                    {comment.requiresReview && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 shrink-0">
                        Revisión
                      </span>
                    )}
                  </div>

                  {/* Texto del Comentario */}
                  <p className="text-xs text-gray-700 leading-relaxed break-words bg-white/70 p-2 rounded-lg border border-gray-100/60 mb-1.5">
                    {comment.text}
                  </p>

                  {/* Historia y Proceso Vinculados */}
                  {task && (
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium pt-1 border-t border-gray-100">
                      <span className="truncate max-w-[180px] text-blue-600 font-bold hover:underline">
                        📌 {task.title}
                      </span>
                      {process && (
                        <span className="text-gray-400 shrink-0 text-[9px]">
                          {process.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {feedComments.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400 space-y-1">
                  <MessageSquare size={20} className="mx-auto opacity-30 mb-1" />
                  <p>No hay comentarios en este filtro</p>
                </div>
              )}
            </div>
          </div>

          {/* Accesos a Procesos */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs space-y-2 shrink-0">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Building2 size={12} className="text-blue-600" />
              Procesos Vigentes ({processes.length})
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {processes.map((p) => (
                <button
                  key={`dash_proc_btn_${p.id}`}
                  onClick={() => onNavigateToProcess?.(p.id)}
                  className="p-2 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <span className="text-[11px] font-bold text-gray-800 group-hover:text-blue-700 block truncate">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA 2 (7/12): Bandeja de Historias con Scroll Independiente */}
        <div className="lg:col-span-7 flex flex-col lg:h-[calc(100vh-130px)] min-h-0 space-y-2.5">
          
          {/* BARRA SUPERIOR DE HERRAMIENTAS Y FILTROS (Fija en la columna) */}
          <div className="shrink-0 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
            
            {/* Fila 1: Ámbito (Mis Historias / Equipo) + Selector de Proceso + Nueva Historia */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              
              {/* Conmutador de Ámbito */}
              <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg shrink-0">
                <button
                  onClick={() => setScopeFilter('my')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    scopeFilter === 'my'
                      ? 'bg-white text-gray-900 shadow-2xs font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  👤 Mis Historias
                </button>
                {canViewTeamStories && (
                  <button
                    onClick={() => setScopeFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      scopeFilter === 'all'
                        ? 'bg-white text-gray-900 shadow-2xs font-black'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    👥 Historias del Equipo
                  </button>
                )}
              </div>

              {/* Selector de Proceso */}
              <select
                value={processFilter}
                onChange={(e) => setProcessFilter(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 focus:outline-hidden hover:border-gray-300 transition-colors shrink-0 max-w-[160px] truncate"
              >
                <option value="all">Todos los Procesos</option>
                {processes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Botón Nueva Historia */}
              {onAddTask && (
                <button
                  onClick={onAddTask}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer shrink-0 ml-auto"
                >
                  + Nueva Historia
                </button>
              )}
            </div>

            {/* Fila 2: PILLS / CHIPS MINIMALISTAS DE METRICAS (Filtros Rápidos) */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
              
              {/* Pill 1: Para Hoy */}
              <button
                type="button"
                onClick={() => setActiveCategory('today')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  activeCategory === 'today'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-black'
                    : 'bg-white hover:bg-blue-50 text-gray-700 border-gray-200'
                }`}
              >
                <CalendarDays size={12} className={activeCategory === 'today' ? 'text-white' : 'text-blue-500'} />
                <span>Para Hoy</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeCategory === 'today' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                }`}>
                  {stats.today}
                </span>
              </button>

              {/* Pill 2: Revisión */}
              <button
                type="button"
                onClick={() => setActiveCategory('review')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  activeCategory === 'review'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-black'
                    : 'bg-white hover:bg-purple-50 text-gray-700 border-gray-200'
                }`}
              >
                <Eye size={12} className={activeCategory === 'review' ? 'text-white' : 'text-purple-500'} />
                <span>Revisión</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeCategory === 'review' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'
                }`}>
                  {stats.review}
                </span>
              </button>

              {/* Pill 3: Correcciones */}
              <button
                type="button"
                onClick={() => setActiveCategory('correction')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  activeCategory === 'correction'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-black'
                    : 'bg-white hover:bg-amber-50 text-gray-700 border-gray-200'
                }`}
              >
                <Wrench size={12} className={activeCategory === 'correction' ? 'text-white' : 'text-amber-500'} />
                <span>Corrección</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeCategory === 'correction' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                }`}>
                  {stats.correction}
                </span>
              </button>

              {/* Pill 4: Expiradas */}
              <button
                type="button"
                onClick={() => setActiveCategory('expired')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  activeCategory === 'expired'
                    ? 'bg-red-600 text-white border-red-600 shadow-2xs font-black'
                    : 'bg-white hover:bg-red-50 text-gray-700 border-gray-200'
                }`}
              >
                <AlertTriangle size={12} className={activeCategory === 'expired' ? 'text-white' : 'text-red-500'} />
                <span>Expiradas</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeCategory === 'expired' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-700'
                }`}>
                  {stats.expired}
                </span>
              </button>

              {/* Pill 5: Sin Fecha */}
              <button
                type="button"
                onClick={() => setActiveCategory('nodate')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  activeCategory === 'nodate'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-black'
                    : 'bg-white hover:bg-indigo-50 text-gray-700 border-gray-200'
                }`}
              >
                <Clock size={12} className={activeCategory === 'nodate' ? 'text-white' : 'text-indigo-500'} />
                <span>Sin Fecha</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeCategory === 'nodate' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  {stats.noDate}
                </span>
              </button>

              {/* Pill 6: Todas */}
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  activeCategory === 'all'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-2xs font-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <FolderKanban size={12} className={activeCategory === 'all' ? 'text-white' : 'text-gray-500'} />
                <span>Todas</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {stats.totalActive}
                </span>
              </button>
            </div>

            {/* Fila 3: Buscador Rápido de Historias */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar historias por título o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:border-blue-500 focus:outline-hidden shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* LISTA DE HISTORIAS CON SCROLL INDEPENDIENTE */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 min-h-0">
            {displayedStories.map((task) => {
              const process = processes.find(p => p.id === task.processId);
              const project = projects.find(p => p.id === task.projectId);
              const assignee = members.find(m => m.id === task.memberId);
              const isOverdue = isStoryExpired(task);
              const daysOverdue = isOverdue && task.dueDate ? getDaysOverdue(task.dueDate) : 0;
              const hasObservations = Boolean(task.hasPendingReview || task.comments?.some(c => c.requiresReview && c.status === 'pending'));

              return (
                <div
                  key={`dash_story_${task.id}`}
                  onClick={() => onOpenTask?.(task)}
                  className="bg-white p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative overflow-hidden"
                >
                  {/* Barra lateral de prioridad */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      task.priority === 'alta' || task.priority === 'meteoric_crash'
                        ? 'bg-red-500'
                        : task.priority === 'media'
                        ? 'bg-blue-500'
                        : 'bg-emerald-500'
                    }`}
                  />

                  {/* Contenido de la Historia */}
                  <div className="min-w-0 flex-1 pl-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {/* Estado */}
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                        task.status === 'review'
                          ? 'bg-purple-100 text-purple-800'
                          : task.status === 'correction'
                          ? 'bg-amber-100 text-amber-800'
                          : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {task.status}
                      </span>

                      {/* Proceso */}
                      {process && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 truncate max-w-[130px]">
                          {process.name}
                        </span>
                      )}

                      {/* Proyecto */}
                      {project && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 truncate max-w-[130px]">
                          📁 {project.name}
                        </span>
                      )}

                      {/* Alerta de Observaciones */}
                      {hasObservations && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 flex items-center gap-1 animate-pulse">
                          <AlertCircle size={9} />
                          Observación
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Asignado, Fecha y Acción */}
                  <div className="flex items-center gap-2.5 shrink-0 sm:border-l sm:border-gray-100 sm:pl-2.5">
                    {/* Responsable */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[9px] overflow-hidden">
                        {assignee?.avatar ? (
                          <img src={assignee.avatar} alt={assignee.name} className="w-full h-full object-cover" />
                        ) : (
                          assignee?.name?.substring(0, 1) || <User size={10} />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-gray-600 max-w-[70px] truncate hidden md:inline">
                        {assignee?.name?.split(' ')[0] || 'Sin asignar'}
                      </span>
                    </div>

                    {/* Fecha / Retraso */}
                    <div className="text-right min-w-[65px]">
                      {isOverdue ? (
                        <span className="text-[10px] font-black text-red-600 flex items-center gap-0.5 justify-end">
                          <AlertTriangle size={10} />
                          {daysOverdue}d atraso
                        </span>
                      ) : task.dueDate ? (
                        <span className="text-[10px] font-bold text-gray-500 flex items-center gap-0.5 justify-end">
                          <Calendar size={10} />
                          {task.dueDate === todayStr ? 'Hoy' : task.dueDate}
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-gray-400 italic">
                          Sin fecha
                        </span>
                      )}

                      {task.plannedStartTime && (
                        <p className="text-[9px] font-medium text-gray-400">
                          {task.plannedStartTime} - {task.plannedEndTime || ''}
                        </p>
                      )}
                    </div>

                    {/* Botón Abrir */}
                    <div className="p-1 rounded-lg bg-gray-50 group-hover:bg-blue-600 group-hover:text-white text-gray-400 transition-all">
                      <ArrowUpRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedStories.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center space-y-2">
                <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <h4 className="text-xs font-bold text-gray-800">No hay historias pendientes en esta sección</h4>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Puedes alternar entre los filtros superiores o crear una nueva historia.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
