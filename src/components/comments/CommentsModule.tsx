import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, CheckCircle2, Clock, AlertCircle, 
  Search, Check, Trash2, Megaphone, Link as LinkIcon, 
  FileText, CheckSquare, FolderKanban, ShieldCheck, 
  ArrowRight, AtSign
} from 'lucide-react';
import { 
  UniversalComment, 
  CommentEntityType, 
  TeamMember, 
  Process, 
  Project, 
  Task 
} from '../../types';
import { commentService } from '../../services/commentService';
import { renderCommentWithMentions } from '../common/UniversalCommentsThread';

export interface CommentsModuleProps {
  tasks: Task[];
  members: TeamMember[];
  processes: Process[];
  projects: Project[];
  currentMember: TeamMember | null;
  onOpenTask?: (task: Task) => void;
  onNavigateToTab?: (tab: string, subTab?: string, id?: string) => void;
}

export const CommentsModule: React.FC<CommentsModuleProps> = ({
  tasks,
  members,
  processes,
  projects,
  currentMember,
  onOpenTask,
  onNavigateToTab
}) => {
  const [comments, setComments] = useState<UniversalComment[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [filterProcessId, setFilterProcessId] = useState<string>('all');
  const [onlyMentionsMe, setOnlyMentionsMe] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Suscripción universal en tiempo real
  useEffect(() => {
    const unsubscribe = commentService.subscribeAllUniversalComments((fetchedComments) => {
      setComments(fetchedComments);
    }, tasks);

    return () => {
      unsubscribe();
    };
  }, [tasks]);

  // Mapa rápido de tareas
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  // Filtrado reactivo de comentarios
  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      // 1. Filtro por tipo de entidad
      if (filterEntity !== 'all' && comment.entityType !== filterEntity) {
        return false;
      }

      // 2. Filtro por estado de revisión
      if (filterStatus === 'pending') {
        if (!comment.requiresReview || comment.status !== 'pending') return false;
      } else if (filterStatus === 'resolved') {
        if (!comment.requiresReview || comment.status !== 'resolved') return false;
      }

      // 3. Filtro por proceso
      if (filterProcessId !== 'all') {
        if (comment.processId && comment.processId !== filterProcessId) {
          return false;
        }
        // Si no tiene processId explícito pero es tarea, buscar en la tarea
        if (!comment.processId && comment.entityType === 'task') {
          const t = taskMap.get(comment.entityId);
          if (t && t.processId !== filterProcessId) return false;
        }
      }

      // 4. Filtro por menciones directas (@mí)
      if (onlyMentionsMe && currentMember) {
        const isMentionedById = comment.mentionedMemberIds?.includes(currentMember.id);
        const isMentionedByName = comment.text.toLowerCase().includes(`@${currentMember.name.toLowerCase()}`);
        const isTarget = comment.targetMemberId === currentMember.id;
        if (!isMentionedById && !isMentionedByName && !isTarget) {
          return false;
        }
      }

      // 5. Búsqueda por texto o título
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesText = comment.text.toLowerCase().includes(q);
        const matchesAuthor = comment.authorName.toLowerCase().includes(q);
        const matchesTitle = comment.entityTitle?.toLowerCase().includes(q) || false;
        if (!matchesText && !matchesAuthor && !matchesTitle) {
          return false;
        }
      }

      return true;
    });
  }, [comments, filterEntity, filterStatus, filterProcessId, onlyMentionsMe, searchTerm, currentMember, taskMap]);

  // Estadísticas globales
  const stats = useMemo(() => {
    const total = comments.length;
    const reviewRequests = comments.filter(c => c.requiresReview);
    const pending = reviewRequests.filter(c => c.status === 'pending').length;
    const resolved = reviewRequests.filter(c => c.status === 'resolved').length;
    
    let mentionsCount = 0;
    if (currentMember) {
      mentionsCount = comments.filter(c => 
        c.mentionedMemberIds?.includes(currentMember.id) ||
        c.text.toLowerCase().includes(`@${currentMember.name.toLowerCase()}`) ||
        c.targetMemberId === currentMember.id
      ).length;
    }

    return { total, pending, resolved, mentionsCount };
  }, [comments, currentMember]);

  // Configuración visual por tipo de entidad
  const getEntityMeta = (entityType: CommentEntityType) => {
    switch (entityType) {
      case 'task':
        return {
          label: 'Historia',
          icon: <CheckSquare size={13} />,
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dotColor: 'bg-blue-500'
        };
      case 'link':
        return {
          label: 'Enlace',
          icon: <LinkIcon size={13} />,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500'
        };
      case 'note':
        return {
          label: 'Nota',
          icon: <FileText size={13} />,
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dotColor: 'bg-amber-500'
        };
      case 'campaign':
        return {
          label: 'Campaña',
          icon: <Megaphone size={13} />,
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
          dotColor: 'bg-purple-500'
        };
      case 'project':
        return {
          label: 'Proyecto',
          icon: <FolderKanban size={13} />,
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          dotColor: 'bg-indigo-500'
        };
      default:
        return {
          label: 'Entidad',
          icon: <MessageSquare size={13} />,
          badgeClass: 'bg-gray-50 text-gray-700 border-gray-200/80',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const handleResolve = async (e: React.MouseEvent, comment: UniversalComment) => {
    e.stopPropagation();
    try {
      const nextStatus = comment.status === 'resolved' ? 'pending' : 'resolved';
      await commentService.toggleUniversalCommentStatus(comment.id, nextStatus, currentMember?.name);
    } catch (err) {
      console.error('Error alternando estado del comentario:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar este comentario?')) return;
    try {
      await commentService.deleteUniversalComment(commentId);
    } catch (err) {
      console.error('Error eliminando comentario:', err);
    }
  };

  const handleOpenEntity = (comment: UniversalComment) => {
    if (comment.entityType === 'task') {
      const task = taskMap.get(comment.entityId);
      if (task && onOpenTask) {
        onOpenTask(task);
      } else if (onNavigateToTab) {
        onNavigateToTab('tasks', 'board');
      }
    } else if (comment.entityType === 'campaign') {
      if (onNavigateToTab) onNavigateToTab('marketing', 'campaigns');
    } else if (comment.entityType === 'link' || comment.entityType === 'note') {
      if (comment.processId && onNavigateToTab) {
        onNavigateToTab('process_dashboard', comment.entityType === 'link' ? 'links' : 'notes', comment.processId);
      } else if (onNavigateToTab) {
        onNavigateToTab('process_dashboard');
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Centro de Comentarios & Observaciones
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Gestión transversal de discusiones y solicitudes de revisión en toda la organización
              </p>
            </div>
          </div>
        </div>

        {/* Tarjetas de Métricas Rápidas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-white border border-gray-100 px-3.5 py-2 rounded-2xl shadow-xs flex items-center gap-2.5">
            <span className="text-xs font-bold text-gray-500">Total</span>
            <span className="text-sm font-black text-gray-900">{stats.total}</span>
          </div>

          <div className={`border px-3.5 py-2 rounded-2xl shadow-xs flex items-center gap-2.5 transition-colors ${
            stats.pending > 0 ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-white border-gray-100 text-gray-700'
          }`}>
            <AlertCircle size={14} className={stats.pending > 0 ? 'text-amber-600 animate-pulse' : 'text-gray-400'} />
            <span className="text-xs font-bold">Por Revisar</span>
            <span className="text-sm font-black">{stats.pending}</span>
          </div>

          <div className="bg-white border border-gray-100 px-3.5 py-2 rounded-2xl shadow-xs flex items-center gap-2.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs font-bold text-gray-500">Resueltos</span>
            <span className="text-sm font-black text-emerald-700">{stats.resolved}</span>
          </div>

          {currentMember && (
            <button
              onClick={() => setOnlyMentionsMe(!onlyMentionsMe)}
              className={`border px-3.5 py-2 rounded-2xl shadow-xs flex items-center gap-2.5 transition-all ${
                onlyMentionsMe
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                  : 'bg-white border-gray-100 text-gray-700 hover:border-blue-200'
              }`}
            >
              <AtSign size={14} className={onlyMentionsMe ? 'text-white' : 'text-blue-500'} />
              <span className="text-xs font-bold">Menciones a mí</span>
              <span className={`text-xs font-black px-1.5 py-0.2 rounded-full ${
                onlyMentionsMe ? 'bg-white text-blue-600' : 'bg-blue-50 text-blue-700'
              }`}>
                {stats.mentionsCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3">
        {/* Filtros de Entidad (Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setFilterEntity('all')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              filterEntity === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Todos los módulos ({comments.length})
          </button>
          <button
            onClick={() => setFilterEntity('task')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterEntity === 'task'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CheckSquare size={13} />
            <span>Historias ({comments.filter(c => c.entityType === 'task').length})</span>
          </button>
          <button
            onClick={() => setFilterEntity('link')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterEntity === 'link'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LinkIcon size={13} />
            <span>Enlaces ({comments.filter(c => c.entityType === 'link').length})</span>
          </button>
          <button
            onClick={() => setFilterEntity('note')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterEntity === 'note'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={13} />
            <span>Notas ({comments.filter(c => c.entityType === 'note').length})</span>
          </button>
          <button
            onClick={() => setFilterEntity('campaign')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap ${
              filterEntity === 'campaign'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Megaphone size={13} />
            <span>Campañas ({comments.filter(c => c.entityType === 'campaign').length})</span>
          </button>
        </div>

        {/* Fila de Controles Secundarios */}
        <div className="flex flex-col md:flex-row items-center gap-3 pt-2 border-t border-gray-100">
          {/* Buscador */}
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por contenido, autor o elemento asociado..."
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filtro por Estado */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full md:w-auto px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">⚠️ Pendientes de revisión</option>
            <option value="resolved">✅ Resueltos / Aprobados</option>
          </select>

          {/* Filtro por Proceso */}
          <select
            value={filterProcessId}
            onChange={(e) => setFilterProcessId(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">Todos los procesos</option>
            {processes.map(proc => (
              <option key={proc.id} value={proc.id}>{proc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Comentarios */}
      <div className="space-y-3">
        {filteredComments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-3xl bg-gray-50 text-gray-400 flex items-center justify-center mb-3">
              <MessageSquare size={26} />
            </div>
            <h4 className="text-sm font-bold text-gray-900">No se encontraron comentarios</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              No hay observaciones que coincidan con los filtros seleccionados o todavía no se han registrado comentarios en este módulo.
            </p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const meta = getEntityMeta(comment.entityType);
            const isAuthor = currentMember && currentMember.id === comment.authorId;
            const canManage = isAuthor || currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';

            return (
              <div
                key={comment.id}
                className={`bg-white rounded-2xl border transition-all p-4 shadow-xs hover:shadow-md ${
                  comment.requiresReview
                    ? comment.status === 'resolved'
                      ? 'border-emerald-200/80 bg-emerald-50/15'
                      : 'border-amber-300 bg-amber-50/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                  {/* Autor y Fecha */}
                  <div className="flex items-center gap-3">
                    {comment.authorAvatar ? (
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white shadow-xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                        {comment.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">{comment.authorName}</span>
                        {comment.authorRole && (
                          <span className="text-[10px] text-gray-400 font-medium">• {comment.authorRole}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(comment.createdAt).toLocaleString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Badges de Entidad y Estado */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge de Entidad */}
                    <button
                      onClick={() => handleOpenEntity(comment)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors hover:opacity-80 ${meta.badgeClass}`}
                    >
                      {meta.icon}
                      <span>{meta.label}: {comment.entityTitle || 'Ver detalle'}</span>
                      <ArrowRight size={11} className="opacity-60" />
                    </button>

                    {/* Estado de Revisión */}
                    {comment.requiresReview && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                        comment.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      }`}>
                        {comment.status === 'resolved' ? (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Resuelto</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} className="text-amber-600" />
                            <span>Revisión pendiente</span>
                          </>
                        )}
                      </span>
                    )}

                    {canManage && (
                      <button
                        onClick={(e) => handleDelete(e, comment.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Eliminar comentario"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido del Comentario */}
                <div className="text-xs text-gray-800 leading-relaxed break-words whitespace-pre-wrap pl-11">
                  {renderCommentWithMentions(comment.text, members)}
                </div>

                {/* Pie con Acciones */}
                {comment.requiresReview && (
                  <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between pl-11 text-[11px]">
                    <div>
                      {comment.status === 'resolved' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[10px]">
                          <ShieldCheck size={12} className="text-emerald-600" />
                          Revisado por {comment.resolvedBy || 'un revisor'} el {comment.resolvedAt ? new Date(comment.resolvedAt).toLocaleDateString() : ''}
                        </span>
                      ) : (
                        <span className="text-amber-700 text-[10px] font-medium">
                          Solicitud abierta para revisión por el equipo
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleResolve(e, comment)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                        comment.status === 'resolved'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {comment.status === 'resolved' ? (
                        'Reabrir solicitud'
                      ) : (
                        <>
                          <Check size={12} />
                          <span>Marcar como resuelto</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
