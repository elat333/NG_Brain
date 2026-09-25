import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, CheckCircle2, Clock, AlertCircle, 
  Search, Check, Trash2, Megaphone, Link as LinkIcon, 
  FileText, CheckSquare, FolderKanban, ShieldCheck, 
  ArrowRight, AtSign, Shield, Bookmark, Users
} from 'lucide-react';
import { 
  UniversalComment, 
  CommentEntityType, 
  TeamMember, 
  Process, 
  Project, 
  Task,
  Role,
  PersonalNote,
  PersonalLink
} from '../../types';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { commentService } from '../../services/commentService';
import { renderCommentWithMentions } from '../common/UniversalCommentsThread';
import { CommentsPermissionsMatrix } from './CommentsPermissionsMatrix';
import { PersonalNotesView } from '../common/PersonalNotesView';
import { PersonalLinksView } from '../common/PersonalLinksView';

export type CommentsSubTab = 'inbox' | 'notes' | 'links' | 'permissions';

export interface CommentsModuleProps {
  tasks: Task[];
  members: TeamMember[];
  processes: Process[];
  projects: Project[];
  currentMember: TeamMember | null;
  roles?: Role[];
  activeSubTab?: CommentsSubTab;
  onSubTabChange?: (subTab: CommentsSubTab) => void;
  onOpenTask?: (task: Task) => void;
  onNavigateToTab?: (tab: string, subTab?: string, id?: string) => void;
}

export const CommentsModule: React.FC<CommentsModuleProps> = ({
  tasks,
  members,
  processes,
  projects,
  currentMember,
  roles = [],
  activeSubTab = 'inbox',
  onSubTabChange,
  onOpenTask,
  onNavigateToTab
}) => {
  const [internalSubTab, setInternalSubTab] = useState<CommentsSubTab>(activeSubTab);
  const currentSubTab = onSubTabChange ? activeSubTab : internalSubTab;
  const setSubTab = (tab: CommentsSubTab) => {
    if (onSubTabChange) onSubTabChange(tab);
    setInternalSubTab(tab);
  };

  const [comments, setComments] = useState<UniversalComment[]>([]);
  const [allNotes, setAllNotes] = useState<PersonalNote[]>([]);
  const [allLinks, setAllLinks] = useState<PersonalLink[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [filterProcessId, setFilterProcessId] = useState<string>('all');
  const [onlyMentionsMe, setOnlyMentionsMe] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Suscripción universal en tiempo real a comentarios
  useEffect(() => {
    const unsubscribe = commentService.subscribeAllUniversalComments((fetchedComments) => {
      setComments(fetchedComments);
    }, tasks);

    return () => {
      unsubscribe();
    };
  }, [tasks]);

  // Suscripción en tiempo real a notas y enlaces para verificación de pertenencia / asignación
  useEffect(() => {
    const unsubNotes = onSnapshot(collection(db, 'user_personal_notes'), (snapshot) => {
      const fetched: PersonalNote[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as PersonalNote[];
      setAllNotes(fetched);
    }, (err) => console.warn('Error en notas listener:', err));

    const unsubLinks = onSnapshot(collection(db, 'user_personal_links'), (snapshot) => {
      const fetched: PersonalLink[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as PersonalLink[];
      setAllLinks(fetched);
    }, (err) => console.warn('Error en links listener:', err));

    return () => {
      unsubNotes();
      unsubLinks();
    };
  }, []);

  // Mapas rápidos de acceso por ID
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const notesMap = useMemo(() => new Map(allNotes.map(n => [n.id, n])), [allNotes]);
  const linksMap = useMemo(() => new Map(allLinks.map(l => [l.id, l])), [allLinks]);

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

      // 6. Verificación granular de permisos por tipo, proceso y rol de competencia
      const isUserAdmin = Boolean(
        currentMember?.isSystemAdmin || 
        currentMember?.systemRoleId === 'role-admin' ||
        currentMember?.role === 'superadmin' ||
        currentMember?.role === 'admin' ||
        currentMember?.moduleAccess?.['comments'] === 'administrador'
      );

      if (!isUserAdmin && currentMember) {
        const isAuthor = comment.authorId === currentMember.id;
        const isTarget = comment.targetMemberId === currentMember.id;
        const isMentioned = comment.mentionedMemberIds?.includes(currentMember.id) || 
          comment.text.toLowerCase().includes(`@${currentMember.name.toLowerCase()}`);

        // 6.1 Permiso por tipo de entidad (bloqueo absoluto 'ninguno')
        if (comment.entityType === 'task') {
          const taskPerm = currentMember.moduleAccess?.['comments_tasks'];
          if (taskPerm === 'ninguno') return false;
        } else if (comment.entityType === 'note') {
          const notePerm = currentMember.moduleAccess?.['comments_notes'];
          if (notePerm === 'ninguno') return false;
        } else if (comment.entityType === 'link') {
          const linkPerm = currentMember.moduleAccess?.['comments_links'];
          if (linkPerm === 'ninguno') return false;
        }

        // 6.2 Permiso por proceso departamental
        const effectiveProcId = comment.processId || (comment.entityType === 'task' ? taskMap.get(comment.entityId)?.processId : undefined);
        if (effectiveProcId) {
          const procPerm = currentMember.moduleAccess?.[`comments_${effectiveProcId}`];
          if (procPerm === 'ninguno') return false;
        }

        // 6.3 Determinar si el usuario es Líder de este proceso/módulo
        const processPerm = effectiveProcId ? currentMember.moduleAccess?.[`comments_${effectiveProcId}`] : undefined;
        const globalPerm = currentMember.moduleAccess?.['comments'];
        const isLeaderForThis = (processPerm === 'lider' || processPerm === 'administrador' || globalPerm === 'lider');

        // Si NO es líder de este proceso ni administrador, aplica la regla estricta de Colaborador / Lector
        if (!isLeaderForThis) {
          let isDirectlyInvolved = isAuthor || isTarget || isMentioned;

          // Si no está mencionado directamente, comprobar pertenencia al elemento padre
          if (!isDirectlyInvolved) {
            if (comment.entityType === 'task') {
              const task = taskMap.get(comment.entityId);
              if (task) {
                const isResponsible = task.memberId === currentMember.id;
                const isAuxiliary = task.auxiliaryId === currentMember.id || 
                  (task.auxiliaryIds && task.auxiliaryIds.includes(currentMember.id));
                const isRevisor = task.revisorId === currentMember.id;
                if (isResponsible || isAuxiliary || isRevisor) {
                  isDirectlyInvolved = true;
                }
              }
            } else if (comment.entityType === 'note') {
              const note = notesMap.get(comment.entityId);
              if (note) {
                const isCreator = note.createdByMemberId === currentMember.id;
                const isShared = (note.sharedMemberIds && note.sharedMemberIds.includes(currentMember.id)) ||
                                 (note.sharedWith && note.sharedWith.some(s => s.memberId === currentMember.id));
                if (isCreator || isShared) {
                  isDirectlyInvolved = true;
                }
              }
            } else if (comment.entityType === 'link') {
              const link = linksMap.get(comment.entityId);
              if (link) {
                const isCreator = link.createdByMemberId === currentMember.id;
                const isShared = (link.sharedMemberIds && link.sharedMemberIds.includes(currentMember.id)) ||
                                 (link.sharedWith && link.sharedWith.some(s => s.memberId === currentMember.id));
                if (isCreator || isShared) {
                  isDirectlyInvolved = true;
                }
              }
            }
          }

          // Si no le compete la actividad/nota/link ni está involucrado, no puede ver el comentario
          if (!isDirectlyInvolved) {
            return false;
          }
        }
      }

      return true;
    });
  }, [comments, filterEntity, filterStatus, filterProcessId, onlyMentionsMe, searchTerm, currentMember, taskMap, notesMap, linksMap]);

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

  const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
  const canSeeCommentsPerms = isUserAdmin || currentMember?.moduleAccess?.['comments'] === 'lider' || currentMember?.moduleAccess?.['comments'] === 'administrador';

  return (
    <div className="flex flex-col space-y-3">
      {/* Si está en la pestaña de Permisos, renderizar la matriz de permisos */}
      {currentSubTab === 'permissions' ? (
        <CommentsPermissionsMatrix
          currentMember={currentMember}
          members={members}
          processes={processes}
          roles={roles}
        />
      ) : currentSubTab === 'notes' ? (
        <PersonalNotesView
          currentMember={currentMember}
          members={members}
          moduleName="Colaboración"
          accentColor="indigo"
        />
      ) : currentSubTab === 'links' ? (
        <PersonalLinksView
          currentMember={currentMember}
          members={members}
          moduleName="Colaboración"
          accentColor="indigo"
        />
      ) : (
        <>
          {/* Tarjetas de Métricas Rápidas (solo en bandeja de comentarios) */}
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
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
      </>
      )}
    </div>
  );
};
