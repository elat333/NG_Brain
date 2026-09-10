import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  MessageSquare, Send, CheckCircle2, Clock, AlertCircle, 
  AtSign, User, ShieldCheck, X 
} from 'lucide-react';
import { TaskComment, TeamMember } from '../../../types';

export interface TaskCommentsSectionProps {
  comments: TaskComment[];
  currentMember: TeamMember | null;
  members?: TeamMember[];
  canAddComment: boolean;
  onAddComment: (comment: Omit<TaskComment, 'id' | 'createdAt'>) => void;
  onToggleCommentStatus?: (commentId: string, newStatus: 'pending' | 'resolved') => void;
  onDeleteComment?: (commentId: string) => void;
  onDraftChange?: (draftText: string, requiresReview: boolean) => void;
}

/**
 * Función para renderizar el texto del comentario con resaltado de menciones @Nombre
 */
export const renderCommentWithMentions = (text: string, members: TeamMember[] = []): React.ReactNode => {
  if (!text) return null;

  // Busca patrones @Nombre (pudiendo tener varios nombres y apellidos)
  // Construimos una lista ordenada de nombres de miembros por longitud descendente para coincidencias exactas
  const sortedMembers = [...members].sort((a, b) => b.name.length - a.name.length);
  
  // Si no hay miembros cargados, hacemos un split por @palabra
  if (sortedMembers.length === 0) {
    const parts = text.split(/(@[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span 
            key={`mention-nomem-${i}-${part.slice(0, 8)}`} 
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[11px] border border-blue-200/60 shadow-2xs"
          >
            {part}
          </span>
        );
      }
      return <span key={`text-nomem-${i}`}>{part}</span>;
    });
  }

  // Si hay miembros, buscamos coincidencias con nombres de colaboradores
  const memberNamesEscaped = sortedMembers
    .map(m => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const mentionRegex = new RegExp(`(@(?:${memberNamesEscaped}|[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+))`, 'g');
  const parts = text.split(mentionRegex);

  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const nameWithoutAt = part.slice(1).trim().toLowerCase();
      const matchedMember = sortedMembers.find(
        m => m.name.toLowerCase() === nameWithoutAt || m.name.toLowerCase().startsWith(nameWithoutAt)
      );

      return (
        <span 
          key={`mention_part_${i}_${matchedMember?.id || 'unmatched'}`} 
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[11px] border border-blue-200/60 shadow-2xs group hover:bg-blue-100 transition-colors"
          title={matchedMember ? `${matchedMember.name} • ${matchedMember.role || 'Miembro'}` : part}
        >
          {matchedMember?.avatar ? (
            <img 
              src={matchedMember.avatar} 
              alt={matchedMember.name} 
              className="w-3.5 h-3.5 rounded-full object-cover inline-block"
            />
          ) : (
            <AtSign size={10} className="text-blue-500 inline-block" />
          )}
          <span>{part}</span>
        </span>
      );
    }
    return <span key={`text_part_${i}`}>{part}</span>;
  });
};

export const TaskCommentsSection: React.FC<TaskCommentsSectionProps> = ({
  comments = [],
  currentMember,
  members = [],
  canAddComment,
  onAddComment,
  onToggleCommentStatus,
  onDeleteComment,
  onDraftChange
}) => {
  const [commentText, setCommentText] = useState('');
  const [requiresReview, setRequiresReview] = useState(false);

  // Notificar cambios de borrador de forma controlada sin bucles infinitos
  const updateDraft = (text: string, review: boolean) => {
    if (onDraftChange) {
      onDraftChange(text, review);
    }
  };

  // Estados para el autocompletado de menciones @
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  // Filtrar miembros para el menú de menciones
  const filteredMembers = useMemo(() => {
    if (!isMentionOpen) return [];
    const q = mentionQuery.toLowerCase().trim();
    if (!q) return members.slice(0, 8);
    return members
      .filter(m => 
        m.name.toLowerCase().includes(q) || 
        (m.role && m.role.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [members, isMentionOpen, mentionQuery]);

  // Manejar cambios en el textarea y detección de @
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCommentText(value);
    updateDraft(value, requiresReview);

    // Buscar si hay un '@' justo antes del cursor
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Validar que no haya saltos de línea ni otros caracteres de ruptura entre el @ y el cursor
      if (!textAfterAt.includes('\n') && textAfterAt.length <= 30) {
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setIsMentionOpen(true);
        setSelectedMentionIndex(0);
        return;
      }
    }

    setIsMentionOpen(false);
  };

  // Seleccionar miembro de la lista de mención
  const handleSelectMember = (member: TeamMember) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart || commentText.length;
    const textBeforeAt = commentText.slice(0, mentionStartIndex);
    const textAfterCursor = commentText.slice(cursorPos);
    
    // Insertamos @Nombre + un espacio
    const insertText = `@${member.name} `;
    const newFullText = textBeforeAt + insertText + textAfterCursor;
    
    setCommentText(newFullText);
    updateDraft(newFullText, requiresReview);
    setIsMentionOpen(false);
    setMentionStartIndex(-1);
    setMentionQuery('');

    // Reenfocar y mover cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const nextPos = textBeforeAt.length + insertText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  // Manejo de teclas para navegación en la lista de menciones y envío con Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionOpen && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev + 1) % filteredMembers.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[selectedMentionIndex]) {
          handleSelectMember(filteredMembers[selectedMentionIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        setIsMentionOpen(false);
        return;
      }
    }

    // Enviar comentario con Enter (sin Shift) si el menú de menciones no está abierto
    if (e.key === 'Enter' && !e.shiftKey && !isMentionOpen) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Botón directo para insertar '@' y abrir selector
  const triggerMentionManual = () => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart || commentText.length;
    const before = commentText.slice(0, cursorPos);
    const after = commentText.slice(cursorPos);
    
    // Si no termina en espacio ni está al inicio, agregar un espacio antes de @
    const needsSpace = before.length > 0 && !before.endsWith(' ');
    const prefix = needsSpace ? ' @' : '@';
    const newText = before + prefix + after;
    
    setCommentText(newText);
    updateDraft(newText, requiresReview);
    const newPos = before.length + prefix.length;
    setMentionStartIndex(newPos - 1);
    setMentionQuery('');
    setIsMentionOpen(true);
    setSelectedMentionIndex(0);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!commentText.trim()) return;

    const authorRole = currentMember?.role || 'Colaborador';
    
    // Detectar miembros mencionados
    const mentionedIds: string[] = [];
    members.forEach(m => {
      if (commentText.includes(`@${m.name}`)) {
        mentionedIds.push(m.id);
      }
    });

    const commentPayload: any = {
      authorId: currentMember?.id || 'anonymous',
      authorName: currentMember?.name || 'Usuario',
      authorRole: authorRole,
      authorAvatar: currentMember?.avatar || '',
      text: commentText.trim(),
      requiresReview: !!requiresReview,
      mentionedMemberIds: mentionedIds.length > 0 ? Array.from(new Set(mentionedIds)) : []
    };

    if (requiresReview) {
      commentPayload.status = 'pending';
    }

    onAddComment(commentPayload);

    setCommentText('');
    setRequiresReview(false);
    updateDraft('', false);
    setIsMentionOpen(false);
  };

  const pendingReviewsCount = comments.filter(c => c.requiresReview && c.status === 'pending').length;

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-500" />
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
            Comentarios & Solicitudes de Revisión
          </h4>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {comments.length}
          </span>
        </div>
        {pendingReviewsCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60 animate-pulse">
            <AlertCircle size={11} /> {pendingReviewsCount} por resolver
          </span>
        )}
      </div>

      {/* Lista de comentarios */}
      <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
        {comments.length === 0 ? (
          <div className="text-center py-6 px-4 bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl">
            <MessageSquare size={24} className="mx-auto text-gray-300 mb-1.5" />
            <p className="text-xs font-bold text-gray-400">Sin comentarios aún</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Deja observaciones, notas de avance o solicita una revisión etiquetando con <span className="font-bold text-blue-600">@</span>.
            </p>
          </div>
        ) : (
          comments.map((comment, idx) => {
            const isPending = comment.requiresReview && comment.status === 'pending';
            const isResolved = comment.requiresReview && comment.status === 'resolved';
            const commentKey = `comment_${idx}_${comment.id || 'no_id'}_${comment.createdAt || 'no_time'}`;

            return (
              <div 
                key={commentKey}
                className={`p-3.5 rounded-2xl border transition-all text-xs ${
                  isPending 
                    ? 'bg-amber-50/40 border-amber-200/80 shadow-xs' 
                    : isResolved
                    ? 'bg-emerald-50/30 border-emerald-200/60'
                    : 'bg-white border-gray-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {comment.authorAvatar ? (
                      <img 
                        src={comment.authorAvatar} 
                        alt={comment.authorName} 
                        className="w-6 h-6 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center">
                        {comment.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-800 text-[11px]">{comment.authorName}</span>
                        {comment.authorRole && (
                          <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                            {comment.authorRole}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] text-gray-400 font-medium">
                      {new Date(comment.createdAt).toLocaleDateString('es-ES', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {onDeleteComment && (comment.authorId === currentMember?.id || currentMember?.isSystemAdmin) && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-gray-300 hover:text-red-500 p-0.5 rounded transition-colors"
                        title="Eliminar comentario"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Texto del comentario con resaltado de menciones @ */}
                <div className="text-gray-700 leading-relaxed pl-8 pr-2 whitespace-pre-wrap">
                  {renderCommentWithMentions(comment.text, members)}
                </div>

                {/* Indicador de Solicitud de Revisión / Cambio */}
                {comment.requiresReview && (
                  <div className="mt-2.5 ml-8 pt-2 border-t border-gray-100/80 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300/60">
                          <Clock size={10} /> Requiere Revisión
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                          <CheckCircle2 size={10} /> Revisión Resuelta
                        </span>
                      )}
                    </div>

                    {onToggleCommentStatus && (
                      <button
                        type="button"
                        onClick={() => onToggleCommentStatus(comment.id, isPending ? 'resolved' : 'pending')}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-2xs ${
                          isPending
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <CheckCircle2 size={11} /> Marcar como Resuelto
                          </>
                        ) : (
                          <>
                            <Clock size={11} /> Reabrir Observación
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Formulario para agregar nuevo comentario */}
      {canAddComment && (
        <div className="space-y-2 pt-2 bg-gray-50/60 p-3 rounded-2xl border border-gray-100 relative">
          
          {/* Menú Flotante de Autocompletado de Menciones */}
          {isMentionOpen && filteredMembers.length > 0 && (
            <div 
              ref={mentionMenuRef}
              className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="p-2 bg-slate-50 border-b border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-500">
                <span className="flex items-center gap-1">
                  <AtSign size={12} className="text-blue-600" /> Etiquetar colaborador
                </span>
                <span className="text-[9px] text-gray-400 font-normal">Usa ↑ ↓ y Enter para elegir</span>
              </div>
              <div className="p-1 space-y-0.5">
                {filteredMembers.map((member, idx) => {
                  const isSelected = idx === selectedMentionIndex;
                  return (
                    <button
                      key={`mention_dropdown_${member.id || idx}_${idx}`}
                      type="button"
                      onClick={() => handleSelectMember(member)}
                      onMouseEnter={() => setSelectedMentionIndex(idx)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {member.avatar ? (
                          <img 
                            src={member.avatar} 
                            alt={member.name} 
                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs truncate">{member.name}</p>
                          {member.role && (
                            <p className="text-[10px] text-gray-400 truncate font-normal">{member.role}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-600 font-semibold shrink-0 ml-2">
                        @{member.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={2}
              placeholder="Escribe un comentario o usa @ para mencionar a alguien..."
              value={commentText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder:text-gray-300"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Botón directo de arroba */}
              <button
                type="button"
                onClick={triggerMentionManual}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all shadow-2xs"
                title="Mencionar a un miembro (@)"
              >
                <AtSign size={13} className="text-blue-600" />
                <span className="text-[11px]">Mencionar</span>
              </button>

              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-gray-900 select-none">
                <input
                  type="checkbox"
                  checked={requiresReview}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRequiresReview(checked);
                    updateDraft(commentText, checked);
                  }}
                  className="w-3.5 h-3.5 text-amber-500 rounded border-gray-300 focus:ring-amber-400 focus:ring-offset-0"
                />
                <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                  <AlertCircle size={12} className={requiresReview ? 'text-amber-500' : 'text-gray-400'} />
                  Solicitar revisión / Acción requerida
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!commentText.trim()}
              className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
            >
              <Send size={12} />
              <span>Comentar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

