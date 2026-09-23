import React, { useState, useRef, useMemo } from 'react';
import { 
  MessageSquare, Send, CheckCircle2, Clock, AlertCircle, 
  AtSign, ShieldCheck, X, Check, Trash2
} from 'lucide-react';
import { UniversalComment, CommentEntityType, TeamMember, TaskComment } from '../../types';
import { useUniversalComments } from '../../hooks/useUniversalComments';

/**
 * Función para renderizar el texto del comentario con resaltado de menciones @Nombre
 */
export const renderCommentWithMentions = (text: string, members: TeamMember[] = []): React.ReactNode => {
  if (!text) return null;

  const sortedMembers = [...members].sort((a, b) => b.name.length - a.name.length);
  
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

export interface UniversalCommentsThreadProps {
  entityType: CommentEntityType;
  entityId: string;
  entityTitle?: string;
  processId?: string;
  legacyComments?: TaskComment[];
  currentMember: TeamMember | null;
  members?: TeamMember[];
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const UniversalCommentsThread: React.FC<UniversalCommentsThreadProps> = ({
  entityType,
  entityId,
  entityTitle,
  processId,
  legacyComments = [],
  currentMember,
  members = [],
  title,
  onClose,
  className = ''
}) => {
  const { comments, loading, addComment, toggleCommentStatus, deleteComment } = useUniversalComments({
    entityType,
    entityId,
    entityTitle,
    processId,
    legacyComments,
    currentMember
  });

  const [commentText, setCommentText] = useState('');
  const [requiresReview, setRequiresReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para autocompletado de menciones @
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCommentText(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
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

  const handleSelectMember = (member: TeamMember) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart || commentText.length;
    const textBeforeAt = commentText.slice(0, mentionStartIndex);
    const textAfterCursor = commentText.slice(cursorPos);
    
    const insertText = `@${member.name} `;
    const newFullText = textBeforeAt + insertText + textAfterCursor;
    
    setCommentText(newFullText);
    setIsMentionOpen(false);
    setMentionStartIndex(-1);
    setMentionQuery('');

    setTimeout(() => {
      if (textareaRef.current) {
        const nextPos = textBeforeAt.length + insertText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

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

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return;

    // Detectar miembros mencionados
    const mentionedIds: string[] = [];
    members.forEach(m => {
      if (commentText.includes(`@${m.name}`)) {
        mentionedIds.push(m.id);
      }
    });

    setIsSubmitting(true);
    try {
      await addComment(commentText, {
        requiresReview,
        mentionedMemberIds: mentionedIds
      });
      setCommentText('');
      setRequiresReview(false);
    } catch (err) {
      console.error('Error al agregar comentario:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = comments.filter(c => c.requiresReview && c.status === 'pending').length;

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">
              {title || 'Discusión & Observaciones'}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
              <span>{comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''} de revisión
                </span>
              )}
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Lista de comentarios */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar min-h-[200px] max-h-[460px]">
        {loading && comments.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Cargando comentarios...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-2">
              <MessageSquare size={22} />
            </div>
            <p className="text-xs font-semibold text-gray-500">No hay comentarios aún</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Escribe el primer comentario o menciona a un colega con @</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor = currentMember && currentMember.id === comment.authorId;
            const canManage = isAuthor || currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';

            return (
              <div 
                key={comment.id}
                className={`p-3.5 rounded-2xl transition-all border ${
                  comment.requiresReview 
                    ? comment.status === 'resolved'
                      ? 'bg-emerald-50/40 border-emerald-200/60'
                      : 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                    : 'bg-gray-50/70 border-gray-100'
                }`}
              >
                {/* Cabecera del comentario */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {comment.authorAvatar ? (
                      <img 
                        src={comment.authorAvatar} 
                        alt={comment.authorName} 
                        className="w-6 h-6 rounded-full object-cover shrink-0" 
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {comment.authorName}
                        </span>
                        {comment.authorRole && (
                          <span className="text-[10px] text-gray-400 font-medium truncate">
                            • {comment.authorRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(comment.createdAt).toLocaleString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    {comment.requiresReview && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        comment.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      }`}>
                        {comment.status === 'resolved' ? (
                          <>
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Resuelto</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={11} className="text-amber-600" />
                            <span>Revisión requerida</span>
                          </>
                        )}
                      </span>
                    )}

                    {canManage && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white/80 transition-colors ml-1"
                        title="Eliminar comentario"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Texto del comentario */}
                <div className="text-xs text-gray-700 leading-relaxed break-words whitespace-pre-wrap pl-8">
                  {renderCommentWithMentions(comment.text, members)}
                </div>

                {/* Pie de revisión y resolución */}
                {comment.requiresReview && (
                  <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] pl-8">
                    {comment.status === 'resolved' ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[10px]">
                        <ShieldCheck size={12} className="text-emerald-600" />
                        Revisado por {comment.resolvedBy || 'un revisor'} el {comment.resolvedAt ? new Date(comment.resolvedAt).toLocaleDateString() : ''}
                      </span>
                    ) : (
                      <span className="text-amber-700 text-[10px] font-medium">
                        Esperando verificación o cambios...
                      </span>
                    )}

                    <button
                      onClick={() => toggleCommentStatus(
                        comment.id, 
                        comment.status === 'resolved' ? 'pending' : 'resolved'
                      )}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                        comment.status === 'resolved'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {comment.status === 'resolved' ? (
                        'Reabrir revisión'
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

      {/* Caja de entrada para nuevo comentario */}
      <div className="p-3 bg-gray-50/70 border-t border-gray-100 relative">
        {/* Menú de menciones flotante */}
        {isMentionOpen && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20 max-h-48 overflow-y-auto">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Mencionar a un miembro (@)
            </div>
            {filteredMembers.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMember(m)}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                  idx === selectedMentionIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-700'
                }`}
              >
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {m.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{m.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">{m.role || 'Miembro'}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all p-2">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un comentario u observación... (usa @ para mencionar)"
            rows={2}
            className="w-full text-xs text-gray-800 placeholder-gray-400 bg-transparent resize-none focus:outline-hidden"
          />

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCommentText(prev => prev + '@');
                  setIsMentionOpen(true);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-[11px] font-medium"
              >
                <AtSign size={13} />
                <span>Mencionar</span>
              </button>

              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-gray-900 select-none">
                <input
                  type="checkbox"
                  checked={requiresReview}
                  onChange={(e) => setRequiresReview(e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-500 rounded border-gray-300 focus:ring-amber-400 focus:ring-offset-0"
                />
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <AlertCircle size={12} className={requiresReview ? 'text-amber-500' : 'text-gray-400'} />
                  Solicitar revisión
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!commentText.trim() || isSubmitting}
              className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5"
            >
              <Send size={12} />
              <span>{isSubmitting ? 'Enviando...' : 'Comentar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface UniversalCommentsModalProps extends UniversalCommentsThreadProps {
  isOpen: boolean;
}

export const UniversalCommentsModal: React.FC<UniversalCommentsModalProps> = ({
  isOpen,
  onClose,
  ...threadProps
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        <UniversalCommentsThread
          {...threadProps}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
