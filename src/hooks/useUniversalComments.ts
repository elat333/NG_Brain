import { useState, useEffect, useCallback, useMemo } from 'react';
import { db, collection, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, sanitizeForFirestore } from '../lib/firebase';
import { UniversalComment, CommentEntityType, TeamMember, TaskComment } from '../types';

interface UseUniversalCommentsProps {
  entityType: CommentEntityType;
  entityId: string;
  entityTitle?: string;
  processId?: string;
  legacyComments?: TaskComment[];
  currentMember: TeamMember | null;
}

export function useUniversalComments({
  entityType,
  entityId,
  entityTitle,
  processId,
  legacyComments = [],
  currentMember
}: UseUniversalCommentsProps) {
  const [firestoreComments, setFirestoreComments] = useState<UniversalComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!entityId) {
      setFirestoreComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const commentsRef = collection(db, 'comments');
    const q = query(
      commentsRef,
      where('entityId', '==', entityId),
      where('entityType', '==', entityType)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: UniversalComment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UniversalComment;
          loaded.push({
            ...data,
            id: docSnap.id
          });
        });
        loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setFirestoreComments(loaded);
        setLoading(false);
      },
      (error) => {
        console.error('Error al escuchar comentarios en tiempo real:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [entityId, entityType]);

  const allComments: UniversalComment[] = useMemo(() => {
    const firestoreIds = new Set(firestoreComments.map(c => c.id));
    const adaptedLegacy: UniversalComment[] = (legacyComments || [])
      .filter(lc => !firestoreIds.has(lc.id))
      .map(lc => ({
        id: lc.id,
        entityType,
        entityId,
        entityTitle,
        processId,
        authorId: lc.authorId,
        authorName: lc.authorName,
        authorRole: lc.authorRole,
        authorAvatar: lc.authorAvatar,
        text: lc.text,
        createdAt: lc.createdAt,
        requiresReview: lc.requiresReview,
        status: lc.status,
        resolvedAt: lc.resolvedAt,
        resolvedBy: lc.resolvedBy,
        targetMemberId: lc.targetMemberId,
        mentionedMemberIds: lc.mentionedMemberIds
      }));

    const merged = [...adaptedLegacy, ...firestoreComments];
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }, [firestoreComments, legacyComments, entityType, entityId, entityTitle, processId]);

  const addComment = useCallback(async (
    text: string,
    options?: {
      requiresReview?: boolean;
      targetMemberId?: string;
      mentionedMemberIds?: string[];
    }
  ) => {
    if (!text.trim() || !entityId) return;

    const commentId = `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newComment: UniversalComment = {
      id: commentId,
      entityType,
      entityId,
      entityTitle: entityTitle || '',
      processId: processId || '',
      authorId: currentMember?.id || 'unknown',
      authorName: currentMember?.name || 'Usuario',
      authorRole: currentMember?.role || 'Colaborador',
      authorAvatar: currentMember?.avatar || '',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      requiresReview: options?.requiresReview || false,
      status: options?.requiresReview ? 'pending' : undefined,
      targetMemberId: options?.targetMemberId,
      mentionedMemberIds: options?.mentionedMemberIds || []
    };

    try {
      await setDoc(doc(db, 'comments', commentId), sanitizeForFirestore(newComment));
    } catch (err) {
      console.error('Error al guardar comentario universal:', err);
      throw err;
    }
  }, [entityType, entityId, entityTitle, processId, currentMember]);

  const toggleCommentStatus = useCallback(async (commentId: string, newStatus: 'pending' | 'resolved') => {
    try {
      const updatePayload: Partial<UniversalComment> = {
        status: newStatus,
        resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
        resolvedBy: newStatus === 'resolved' ? (currentMember?.name || 'Usuario') : undefined
      };
      await updateDoc(doc(db, 'comments', commentId), sanitizeForFirestore(updatePayload));
    } catch (err) {
      console.error('Error al actualizar estado del comentario:', err);
      throw err;
    }
  }, [currentMember]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
      throw err;
    }
  }, []);

  return {
    comments: allComments,
    loading,
    addComment,
    toggleCommentStatus,
    deleteComment
  };
}
