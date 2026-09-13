import { useState, useEffect, useMemo, useCallback } from 'react';
import { TaskComment, TeamMember } from '../types';
import { commentService } from '../services/commentService';

export interface UseTaskCommentsProps {
  taskId?: string;
  taskTitle?: string;
  initialComments?: TaskComment[];
  currentMember?: TeamMember | null;
}

export function useTaskComments({
  taskId,
  taskTitle,
  initialComments = [],
  currentMember
}: UseTaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>(initialComments);
  const [loading, setLoading] = useState(true);

  // Sincronización en tiempo real
  useEffect(() => {
    if (!taskId) {
      setComments(initialComments);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = commentService.subscribeTaskComments(
      taskId,
      (updatedComments) => {
        setComments(updatedComments);
        setLoading(false);
      },
      initialComments
    );

    return () => {
      unsubscribe();
    };
  }, [taskId]);

  // Contador de revisiones pendientes
  const pendingReviewsCount = useMemo(() => {
    return comments.filter(c => c.requiresReview && c.status === 'pending').length;
  }, [comments]);

  // Agregar comentario
  const handleAddComment = useCallback(async (
    commentPayload: Omit<TaskComment, 'id' | 'createdAt'>
  ) => {
    if (!taskId) return;

    try {
      const fullPayload = {
        ...commentPayload,
        taskId,
        taskTitle: taskTitle || ''
      };
      
      const newComment = await commentService.addComment(fullPayload);
      
      // Actualización optimista local
      setComments(prev => {
        if (prev.some(c => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    } catch (err) {
      console.error('Error al agregar comentario:', err);
    }
  }, [taskId, taskTitle]);

  // Cambiar estado de revisión ('pending' | 'resolved')
  const handleToggleCommentStatus = useCallback(async (
    commentId: string, 
    newStatus: 'pending' | 'resolved'
  ) => {
    try {
      // Optimista
      setComments(prev => prev.map(c => {
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

      await commentService.toggleCommentStatus(
        commentId, 
        newStatus, 
        currentMember?.name,
        taskId
      );
    } catch (err) {
      console.error('Error al alternar estado de comentario:', err);
    }
  }, [currentMember, taskId]);

  // Eliminar comentario
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      // Optimista
      setComments(prev => prev.filter(c => c.id !== commentId));
      await commentService.deleteComment(commentId, taskId);
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  }, [taskId]);

  return {
    comments,
    loading,
    pendingReviewsCount,
    addComment: handleAddComment,
    toggleCommentStatus: handleToggleCommentStatus,
    deleteComment: handleDeleteComment
  };
}
