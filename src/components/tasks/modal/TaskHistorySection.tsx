import React, { useState, useMemo } from 'react';
import { 
  History, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Activity, 
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Task, TeamMember } from '../../../types';
import { useUniversalComments } from '../../../hooks/useUniversalComments';
import { renderCommentWithMentions } from '../../common/UniversalCommentsThread';

interface TaskHistorySectionProps {
  task: Task | null;
  members?: TeamMember[];
  currentMember?: TeamMember | null;
}

type HistoryTab = 'unified' | 'task_changes' | 'comments';

interface UnifiedTimelineItem {
  id: string;
  type: 'task_event' | 'comment_event';
  date: Date;
  timestampStr: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  action: string;
  detail?: string;
  requiresReview?: boolean;
  status?: 'pending' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: string;
}

export const TaskHistorySection: React.FC<TaskHistorySectionProps> = ({ 
  task, 
  members = [], 
  currentMember = null 
}) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>('unified');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Consulta en tiempo real de comentarios universales de la tarea
  const { comments, loading: commentsLoading } = useUniversalComments({
    entityType: 'task',
    entityId: task?.id || '',
    entityTitle: task?.title,
    processId: task?.processId,
    legacyComments: task?.comments || [],
    currentMember
  });

  if (!task) {
    return (
      <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-gray-100">
        <p className="text-xs text-gray-400">No hay información de historial para una nueva historia.</p>
      </div>
    );
  }

  const rawHistoryEntries = (task as any).history || [];

  // 1. Normalizar eventos de cambios de tarea
  const taskEvents: UnifiedTimelineItem[] = useMemo(() => {
    return rawHistoryEntries.map((entry: any, index: number) => {
      const rawDate = entry.timestamp || entry.date || entry.createdAt || '';
      const parsedDate = rawDate ? new Date(rawDate) : new Date(0);
      const member = members.find(m => m.name.toLowerCase() === (entry.userName || entry.user || '').toLowerCase());

      return {
        id: `task_ev_${index}_${rawDate}`,
        type: 'task_event' as const,
        date: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate,
        timestampStr: rawDate ? new Date(rawDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha no registrada',
        userName: entry.userName || entry.user || 'Sistema / Usuario',
        userAvatar: member?.avatar,
        userRole: member?.role,
        action: entry.action || 'Modificación de tarea',
        detail: entry.description || entry.detail || ''
      };
    });
  }, [rawHistoryEntries, members]);

  // 2. Normalizar eventos de comentarios
  const commentEvents: UnifiedTimelineItem[] = useMemo(() => {
    return comments.map((comment) => {
      const rawDate = comment.createdAt || '';
      const parsedDate = rawDate ? new Date(rawDate) : new Date(0);
      const member = members.find(m => m.id === comment.authorId);

      return {
        id: `comment_ev_${comment.id}`,
        type: 'comment_event' as const,
        date: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate,
        timestampStr: rawDate ? new Date(rawDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha no registrada',
        userName: comment.authorName || member?.name || 'Usuario',
        userAvatar: comment.authorAvatar || member?.avatar,
        userRole: comment.authorRole || member?.role,
        action: comment.requiresReview 
          ? 'Agregó una observación de revisión' 
          : 'Comentó en la tarea',
        detail: comment.text,
        requiresReview: comment.requiresReview,
        status: comment.status || 'pending',
        resolvedAt: comment.resolvedAt,
        resolvedBy: comment.resolvedBy
      };
    });
  }, [comments, members]);

  // 3. Timeline combinado ordenable
  const timelineItems = useMemo(() => {
    let items: UnifiedTimelineItem[] = [];

    if (activeTab === 'unified') {
      items = [...taskEvents, ...commentEvents];
    } else if (activeTab === 'task_changes') {
      items = [...taskEvents];
    } else if (activeTab === 'comments') {
      items = [...commentEvents];
    }

    items.sort((a, b) => {
      const diff = b.date.getTime() - a.date.getTime();
      return sortOrder === 'desc' ? diff : -diff;
    });

    return items;
  }, [activeTab, taskEvents, commentEvents, sortOrder]);

  return (
    <div className="space-y-4">
      {/* Header con título y controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <History size={16} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900">Historial y Trazabilidad</h4>
            <p className="text-[11px] text-gray-400 font-semibold">
              Auditoría de cambios y registro de observaciones
            </p>
          </div>
        </div>

        {/* Botón invertir orden */}
        <button
          type="button"
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          title={`Orden: ${sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}`}
        >
          <ArrowUpDown size={12} className="text-gray-400" />
          <span>{sortOrder === 'desc' ? 'Recientes primero' : 'Antiguos primero'}</span>
        </button>
      </div>

      {/* Tabs de Selección */}
      <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('unified')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'unified'
              ? 'bg-white text-gray-900 shadow-2xs font-black'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Layers size={13} className={activeTab === 'unified' ? 'text-blue-600' : 'text-gray-400'} />
          <span>Historial Unificado</span>
          <span className="ml-0.5 px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
            {taskEvents.length + commentEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('task_changes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'task_changes'
              ? 'bg-white text-gray-900 shadow-2xs font-black'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Activity size={13} className={activeTab === 'task_changes' ? 'text-blue-600' : 'text-gray-400'} />
          <span>Cambios de Historia</span>
          <span className="ml-0.5 px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
            {taskEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'comments'
              ? 'bg-white text-gray-900 shadow-2xs font-black'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <MessageSquare size={13} className={activeTab === 'comments' ? 'text-purple-600' : 'text-gray-400'} />
          <span>Comentarios & Revisiones</span>
          <span className="ml-0.5 px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
            {commentEvents.length}
          </span>
        </button>
      </div>

      {/* Lista del Timeline */}
      {commentsLoading ? (
        <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
          Cargando historial y comentarios...
        </div>
      ) : timelineItems.length > 0 ? (
        <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
          {timelineItems.map((item) => {
            const isComment = item.type === 'comment_event';

            return (
              <div 
                key={item.id} 
                className={`relative p-3 rounded-2xl border transition-all text-xs ${
                  isComment 
                    ? 'bg-white border-purple-100 hover:border-purple-200 shadow-2xs' 
                    : 'bg-white border-blue-100 hover:border-blue-200 shadow-2xs'
                }`}
              >
                {/* Marcador del punto en la línea de tiempo */}
                <div 
                  className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs flex items-center justify-center ${
                    isComment ? 'bg-purple-600 ring-2 ring-purple-100' : 'bg-blue-600 ring-2 ring-blue-100'
                  }`} 
                />

                {/* Cabecera del evento */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {item.userAvatar ? (
                      <img 
                        src={item.userAvatar} 
                        alt={item.userName} 
                        className="w-5 h-5 rounded-full object-cover shrink-0" 
                      />
                    ) : (
                      <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[9px] shrink-0 ${
                        isComment ? 'bg-purple-600' : 'bg-blue-600'
                      }`}>
                        {item.userName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold text-gray-900">{item.userName}</span>
                    {item.userRole && (
                      <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                        • {item.userRole}
                      </span>
                    )}
                  </div>

                  {/* Badge de tipo de evento */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isComment 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200/60' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                      }`}
                    >
                      {isComment ? <MessageSquare size={10} /> : <Activity size={10} />}
                      <span>{isComment ? 'Comentario' : 'Cambio Tarea'}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock size={10} /> {item.timestampStr}
                    </span>
                  </div>
                </div>

                {/* Descripción o Acción */}
                <div className="pl-7 space-y-1">
                  <p className="font-bold text-gray-800 text-[11px]">
                    {item.action}
                  </p>

                  {item.detail && (
                    <div className="p-2.5 bg-gray-50 rounded-xl text-gray-700 text-xs font-medium border border-gray-100 leading-relaxed">
                      {isComment 
                        ? renderCommentWithMentions(item.detail, members)
                        : item.detail
                      }
                    </div>
                  )}

                  {/* Metadatos adicionales para comentarios */}
                  {isComment && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {item.requiresReview && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold">
                          <AlertCircle size={9} /> Requiere Revisión
                        </span>
                      )}
                      {item.status === 'resolved' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                          <CheckCircle2 size={9} /> Resuelto
                          {item.resolvedBy && ` por ${item.resolvedBy}`}
                        </span>
                      ) : item.requiresReview ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50/70 text-amber-600 rounded text-[9px] font-semibold">
                          Pendiente de resolución
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
          <p className="text-xs text-gray-400">
            {activeTab === 'comments' 
              ? 'No hay comentarios registrados para esta tarea todavía.' 
              : activeTab === 'task_changes'
              ? 'Sin cambios técnicos registrados en la tarea.'
              : 'Sin historial ni comentarios registrados para esta tarea.'}
          </p>
        </div>
      )}
    </div>
  );
};
