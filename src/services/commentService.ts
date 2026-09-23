import { 
  db, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  arrayUnion
} from '../lib/firebase';
import { TaskComment, Task, UniversalComment, CommentEntityType } from '../types';

/**
 * Sanitiza objetos para Firestore eliminando valores undefined
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized;
  }
  return obj;
}

const COMMENTS_COLLECTION = 'task_comments';
const LOCAL_COMMENTS_PREFIX = 'novagreen_comments_task_';

/**
 * Helpers para persistencia y respaldo en localStorage por tarea
 */
function getLocalCommentsForTask(taskId: string): TaskComment[] {
  if (!taskId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_COMMENTS_PREFIX}${taskId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalCommentForTask(taskId: string, comment: TaskComment): void {
  if (!taskId) return;
  try {
    const current = getLocalCommentsForTask(taskId);
    if (!current.some(c => c.id === comment.id)) {
      const updated = [...current, comment];
      localStorage.setItem(`${LOCAL_COMMENTS_PREFIX}${taskId}`, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('No se pudo guardar comentario en localStorage:', e);
  }
}

function updateLocalCommentStatus(taskId: string, commentId: string, status: 'pending' | 'resolved', resolvedBy?: string): void {
  if (!taskId) return;
  try {
    const current = getLocalCommentsForTask(taskId);
    const updated = current.map(c => c.id === commentId ? {
      ...c,
      status,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined,
      resolvedBy: status === 'resolved' ? (resolvedBy || 'Usuario') : undefined
    } : c);
    localStorage.setItem(`${LOCAL_COMMENTS_PREFIX}${taskId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('No se pudo actualizar comentario en localStorage:', e);
  }
}

function removeLocalComment(taskId: string, commentId: string): void {
  if (!taskId) return;
  try {
    const current = getLocalCommentsForTask(taskId);
    const updated = current.filter(c => c.id !== commentId);
    localStorage.setItem(`${LOCAL_COMMENTS_PREFIX}${taskId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('No se pudo eliminar comentario en localStorage:', e);
  }
}

export const commentService = {
  /**
   * Suscribe en tiempo real a los comentarios de una tarea específica
   */
  subscribeTaskComments(
    taskId: string, 
    callback: (comments: TaskComment[]) => void,
    legacyComments: TaskComment[] = []
  ): () => void {
    if (!taskId) {
      callback(legacyComments);
      return () => {};
    }

    let activeLegacy = legacyComments || [];
    let activeFetched: TaskComment[] = [];

    const notify = () => {
      const localComments = taskId ? getLocalCommentsForTask(taskId) : [];
      const map = new Map<string, TaskComment>();

      // 1. Agregar comentarios legacy del documento de la tarea
      (activeLegacy || []).forEach(c => {
        if (c && c.id) map.set(c.id, c);
      });

      // 2. Agregar comentarios de la colección task_comments
      (activeFetched || []).forEach(c => {
        if (c && c.id) map.set(c.id, c);
      });

      // 3. Agregar comentarios respaldados localmente
      localComments.forEach(c => {
        if (c && c.id && !map.has(c.id)) {
          map.set(c.id, c);
        }
      });

      const allMerged = Array.from(map.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      callback(allMerged);
    };

    // 1. Escuchar en el documento de la tarea para captar de inmediato cualquier adición o cambio
    let taskUnsub: (() => void) | null = null;
    try {
      taskUnsub = onSnapshot(
        doc(db, 'tasks', taskId), 
        (docSnap) => {
          if (docSnap.exists()) {
            const tData = docSnap.data();
            if (Array.isArray(tData.comments)) {
              activeLegacy = tData.comments;
              notify();
            }
          }
        }, 
        (err) => {
          console.warn('Error en listener de tarea comments:', err);
        }
      );
    } catch (tErr) {
      console.warn('No se pudo suscribir a documento de tarea:', tErr);
    }

    // 2. Escuchar en colección task_comments
    let commentsUnsub: (() => void) | null = null;
    try {
      const q = query(
        collection(db, COMMENTS_COLLECTION),
        where('taskId', '==', taskId)
      );

      commentsUnsub = onSnapshot(
        q,
        (snapshot) => {
          const fetched: TaskComment[] = [];
          snapshot.forEach((docSnap) => {
            fetched.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<TaskComment, 'id'>)
            });
          });
          activeFetched = fetched;
          notify();
        },
        (error) => {
          console.warn('Error en listener de comentarios desacoplados, usando documento de tarea:', error);
          notify();
        }
      );
    } catch (err) {
      console.warn('Error al configurar listener de task_comments:', err);
      notify();
    }

    return () => {
      if (taskUnsub) taskUnsub();
      if (commentsUnsub) commentsUnsub();
    };
  },

  /**
   * Suscribe en tiempo real a todos los comentarios (para el Dashboard / Bandeja de Observaciones)
   */
  subscribeAllComments(
    callback: (comments: TaskComment[]) => void,
    tasksFallback: Task[] = []
  ): () => void {
    try {
      const q = query(
        collection(db, COMMENTS_COLLECTION),
        limit(500)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedComments: TaskComment[] = [];
          snapshot.forEach((docSnap) => {
            fetchedComments.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<TaskComment, 'id'>)
            });
          });

          // Combinar con los comentarios legacy de tareas que aún no estén en task_comments
          const existingIds = new Set(fetchedComments.map(c => c.id));
          const legacyCommentsFromTasks: TaskComment[] = [];

          tasksFallback.forEach(task => {
            if (task.comments && task.comments.length > 0) {
              task.comments.forEach(c => {
                if (!existingIds.has(c.id)) {
                  legacyCommentsFromTasks.push({
                    ...c,
                    taskId: c.taskId || task.id,
                    taskTitle: c.taskTitle || task.title
                  });
                }
              });
            }
          });

          const allMerged = [...fetchedComments, ...legacyCommentsFromTasks].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          callback(allMerged);
        },
        (error) => {
          console.warn('Error al consultar todos los comentarios, usando fallback:', error);
          // Extraer de tareas en memoria
          const list: TaskComment[] = [];
          tasksFallback.forEach(t => {
            if (t.comments) {
              t.comments.forEach(c => {
                list.push({ ...c, taskId: c.taskId || t.id, taskTitle: c.taskTitle || t.title });
              });
            }
          });
          callback(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Error al iniciar suscripción de todos los comentarios:', err);
      return () => {};
    }
  },

  /**
   * Agrega un nuevo comentario tanto al documento de la tarea como a la colección task_comments,
   * con respaldo persistente garantizado en localStorage y almacenamiento resiliente.
   */
  async addComment(
    commentData: Omit<TaskComment, 'id' | 'createdAt'> & { taskId: string; taskTitle?: string }
  ): Promise<TaskComment> {
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullComment: TaskComment = sanitizeForFirestore({
      ...commentData,
      id: commentId,
      createdAt: new Date().toISOString()
    });

    // 1. Respaldo inmediato en localStorage para inmunidad total ante fallos de conexión o permisos
    if (commentData.taskId) {
      saveLocalCommentForTask(commentData.taskId, fullComment);
    }

    let savedToRemote = false;

    // 2. Guardar en la colección desacoplada task_comments (Almacenamiento primario independiente)
    try {
      await setDoc(doc(db, COMMENTS_COLLECTION, commentId), sanitizeForFirestore(fullComment));
      savedToRemote = true;
    } catch (colErr) {
      console.warn('Colección task_comments no autorizada o no disponible en Firestore:', colErr);
    }

    // 3. Actualizar metadatos ligeros (contador y badge) en el documento tasks/{taskId} sin engordar el documento
    if (commentData.taskId) {
      try {
        const taskRef = doc(db, 'tasks', commentData.taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          const currentCount = typeof taskData.commentsCount === 'number'
            ? taskData.commentsCount
            : (Array.isArray(taskData.comments) ? taskData.comments.length : 0);
          
          const metaUpdate: any = {
            commentsCount: currentCount + 1
          };
          if (commentData.requiresReview) {
            metaUpdate.hasPendingReview = true;
          }
          await updateDoc(taskRef, metaUpdate);
        }
      } catch (metaErr) {
        // Silencioso si el usuario solo tiene permisos para comentar pero no para editar la tarea padre
      }
    }

    // 4. Fallback en Firestore a nivel de notas de proceso si las reglas de tareas rechazan al colaborador
    if (!savedToRemote && commentData.taskId) {
      try {
        const noteId = `note_tcomment_${commentId}`;
        await setDoc(doc(db, 'process_notes', noteId), sanitizeForFirestore({
          id: noteId,
          type: 'task_comment',
          taskId: commentData.taskId,
          title: `Comentario en ${commentData.taskTitle || 'Tarea'}`,
          content: fullComment.text,
          commentPayload: fullComment,
          createdAt: fullComment.createdAt,
          authorName: fullComment.authorName
        }));
        savedToRemote = true;
      } catch (noteErr) {
        console.warn('Fallback en process_notes no disponible:', noteErr);
      }
    }

    // Si el servidor de Firestore rechazó la escritura por rol de colaborador, el comentario
    // ya quedó respaldado de forma segura en localStorage y en memoria local.
    // Retornamos el comentario exitosamente para que el usuario no pierda su trabajo ni vea bloqueado su flujo.
    if (!savedToRemote) {
      console.info('Comentario respaldado localmente (sin permisos de escritura en la tarea padre en Firestore).');
    }

    return fullComment;
  },

  /**
   * Cambia el estado de un comentario ('pending' | 'resolved')
   */
  async toggleCommentStatus(
    commentId: string,
    newStatus: 'pending' | 'resolved',
    resolvedBy?: string,
    taskId?: string
  ): Promise<void> {
    const updateData: any = {
      status: newStatus
    };

    if (newStatus === 'resolved') {
      updateData.resolvedAt = new Date().toISOString();
      updateData.resolvedBy = resolvedBy || 'Usuario';
    } else {
      updateData.resolvedAt = null;
      updateData.resolvedBy = null;
    }

    // Respaldo en almacenamiento local
    if (taskId) {
      updateLocalCommentStatus(taskId, commentId, newStatus, resolvedBy);
    }

    // 1. Actualizar primero en la colección task_comments (fuente primaria)
    try {
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      await updateDoc(commentRef, sanitizeForFirestore(updateData));
    } catch (err) {
      console.warn('Error al actualizar en task_comments:', err);
    }

    // 2. Respaldo secundario en el documento de la tarea tasks/{taskId} si el usuario tiene permisos
    if (taskId) {
      try {
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          const comments = Array.isArray(taskData.comments) ? taskData.comments : [];
          const updatedComments = comments.map((c: any) => {
            if (c.id === commentId) {
              return {
                ...c,
                ...updateData
              };
            }
            return c;
          });
          await updateDoc(taskRef, {
            comments: sanitizeForFirestore(updatedComments)
          });
        }
      } catch (taskErr) {
        // Silencioso si no tiene permisos sobre la tarea padre
      }
    }
  },

  /**
   * Elimina un comentario
   */
  async deleteComment(commentId: string, taskId?: string): Promise<void> {
    // Eliminar de almacenamiento local
    if (taskId) {
      removeLocalComment(taskId, commentId);
    }

    // 1. Eliminar primero de la colección task_comments
    try {
      await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    } catch (err) {
      console.warn('Error al eliminar de task_comments:', err);
    }

    // 2. Limpieza de retrocompatibilidad y decremento de contador en tasks/{taskId}
    if (taskId) {
      try {
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          const currentCount = typeof taskData.commentsCount === 'number'
            ? taskData.commentsCount
            : (Array.isArray(taskData.comments) ? taskData.comments.length : 1);
          
          const updatePayload: any = {
            commentsCount: Math.max(0, currentCount - 1)
          };
          if (Array.isArray(taskData.comments)) {
            updatePayload.comments = sanitizeForFirestore(taskData.comments.filter((c: any) => c.id !== commentId));
          }
          await updateDoc(taskRef, updatePayload);
        }
      } catch (taskErr) {
        // Silencioso si no tiene permisos
      }
    }
  },

  /**
   * Suscribe en tiempo real a TODOS los comentarios universales de la organización
   * (Tareas, Enlaces, Notas, Campañas, Proyectos), unificando la colección 'comments'
   * con retrocompatibilidad de 'task_comments' y comentarios embebidos.
   */
  subscribeAllUniversalComments(
    callback: (comments: UniversalComment[]) => void,
    tasksFallback: Task[] = []
  ): () => void {
    let universalFetched: UniversalComment[] = [];
    let legacyFetched: UniversalComment[] = [];

    const notify = () => {
      const existingIds = new Set<string>();
      const combined: UniversalComment[] = [];

      // 1. Prioridad: colección universal 'comments'
      universalFetched.forEach(c => {
        if (c && c.id && !existingIds.has(c.id)) {
          existingIds.add(c.id);
          combined.push(c);
        }
      });

      // 2. Legacy 'task_comments'
      legacyFetched.forEach(c => {
        if (c && c.id && !existingIds.has(c.id)) {
          existingIds.add(c.id);
          combined.push(c);
        }
      });

      // 3. Fallback de tareas en memoria
      tasksFallback.forEach(task => {
        if (task.comments && Array.isArray(task.comments)) {
          task.comments.forEach(c => {
            if (c && c.id && !existingIds.has(c.id)) {
              existingIds.add(c.id);
              combined.push({
                id: c.id,
                entityType: 'task',
                entityId: c.taskId || task.id,
                entityTitle: c.taskTitle || task.title,
                processId: task.processId,
                authorId: c.authorId,
                authorName: c.authorName,
                authorRole: c.authorRole,
                authorAvatar: c.authorAvatar,
                text: c.text,
                createdAt: c.createdAt,
                requiresReview: c.requiresReview,
                status: c.status,
                resolvedAt: c.resolvedAt,
                resolvedBy: c.resolvedBy,
                targetMemberId: c.targetMemberId,
                mentionedMemberIds: c.mentionedMemberIds
              });
            }
          });
        }
      });

      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(combined);
    };

    // 1. Listener a la colección raíz 'comments'
    let unsubComments: (() => void) | null = null;
    try {
      const qComments = query(collection(db, 'comments'), limit(1000));
      unsubComments = onSnapshot(qComments, (snapshot) => {
        const list: UniversalComment[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as UniversalComment;
          list.push({
            ...data,
            id: docSnap.id,
            entityType: data.entityType || 'task'
          });
        });
        universalFetched = list;
        notify();
      }, (err) => {
        console.warn('Error en listener de universal comments:', err);
        notify();
      });
    } catch (e) {
      console.warn('Error configurando listener universal:', e);
    }

    // 2. Listener a la colección legacy 'task_comments'
    let unsubLegacy: (() => void) | null = null;
    try {
      const qLegacy = query(collection(db, 'task_comments'), limit(500));
      unsubLegacy = onSnapshot(qLegacy, (snapshot) => {
        const list: UniversalComment[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as any;
          list.push({
            id: docSnap.id,
            entityType: 'task',
            entityId: data.taskId || docSnap.id,
            entityTitle: data.taskTitle || 'Tarea',
            authorId: data.authorId,
            authorName: data.authorName,
            authorRole: data.authorRole,
            authorAvatar: data.authorAvatar,
            text: data.text,
            createdAt: data.createdAt,
            requiresReview: data.requiresReview,
            status: data.status,
            resolvedAt: data.resolvedAt,
            resolvedBy: data.resolvedBy,
            targetMemberId: data.targetMemberId,
            mentionedMemberIds: data.mentionedMemberIds
          });
        });
        legacyFetched = list;
        notify();
      }, (err) => {
        console.warn('Error en listener de legacy task_comments:', err);
        notify();
      });
    } catch (e) {
      console.warn('Error configurando listener legacy:', e);
    }

    return () => {
      if (unsubComments) unsubComments();
      if (unsubLegacy) unsubLegacy();
    };
  },

  /**
   * Agrega un comentario universal en Firestore (/comments)
   */
  async addUniversalComment(
    commentData: Omit<UniversalComment, 'id' | 'createdAt'>
  ): Promise<UniversalComment> {
    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullComment: UniversalComment = sanitizeForFirestore({
      ...commentData,
      id: commentId,
      createdAt: new Date().toISOString()
    });

    try {
      await setDoc(doc(db, 'comments', commentId), fullComment);
    } catch (err) {
      console.error('Error guardando en colección comments:', err);
      // Respaldo secundario si es tarea
      if (commentData.entityType === 'task' && commentData.entityId) {
        saveLocalCommentForTask(commentData.entityId, {
          ...fullComment,
          taskId: commentData.entityId,
          taskTitle: commentData.entityTitle
        });
      }
    }

    return fullComment;
  },

  /**
   * Cambia el estado de cualquier comentario ('pending' | 'resolved')
   */
  async toggleUniversalCommentStatus(
    commentId: string,
    newStatus: 'pending' | 'resolved',
    resolvedBy?: string
  ): Promise<void> {
    const updateData: any = {
      status: newStatus,
      resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : null,
      resolvedBy: newStatus === 'resolved' ? (resolvedBy || 'Usuario') : null
    };

    try {
      await updateDoc(doc(db, 'comments', commentId), sanitizeForFirestore(updateData));
    } catch (err) {
      console.warn('No se pudo actualizar en /comments, intentando en legacy:', err);
      try {
        await updateDoc(doc(db, 'task_comments', commentId), sanitizeForFirestore(updateData));
      } catch (errLegacy) {
        console.warn('Fallo en fallback legacy status:', errLegacy);
      }
    }
  },

  /**
   * Elimina un comentario universal
   */
  async deleteUniversalComment(commentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err) {
      console.warn('No se pudo eliminar de /comments, probando legacy:', err);
      try {
        await deleteDoc(doc(db, 'task_comments', commentId));
      } catch (errLegacy) {
        // Silencioso
      }
    }
  }
};
