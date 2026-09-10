import { Task, Process, Project, TeamMember } from '../types';
import { db, collection, addDoc } from './firebase';

/**
 * Descarga una copia de respaldo en formato JSON de la lista de tareas.
 */
export const exportTasksBackup = (taskList: Task[]): void => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(taskList, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `respaldo-tareas-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

/**
 * Exporta la lista de tareas a formato CSV compatible con Excel.
 */
export const exportTasksToCsv = (
  taskList: Task[],
  processes: Process[],
  projects: Project[],
  members: TeamMember[]
): void => {
  const headers = [
    'ID', 'Título', 'Descripción', 'Estado', 'Proceso', 'Proyecto',
    'Responsable', 'Revisor', 'Prioridad', 'Fecha Planificada',
    'Fecha Límite', 'Horas Planificadas', 'Horas Reales'
  ];

  const statusMap: Record<string, string> = {
    backlog: 'Product Backlog',
    todo: 'Por Hacer',
    in_progress: 'En Progreso',
    review: 'En Revisión',
    correction: 'Para Corrección',
    done: 'Completada',
    blocked: 'Bloqueada',
    rejected: 'Rechazada'
  };

  const rows = taskList.map(t => {
    const proc = processes.find(p => p.id === t.processId)?.name || '';
    const proj = projects.find(p => p.id === t.projectId)?.name || '';
    const resp = members.find(m => m.id === t.memberId)?.name || '';
    const rev = members.find(m => m.id === t.revisorId)?.name || '';

    return [
      `"${(t.id || '').replace(/"/g, '""')}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${statusMap[t.status] || t.status || ''}"`,
      `"${proc.replace(/"/g, '""')}"`,
      `"${proj.replace(/"/g, '""')}"`,
      `"${resp.replace(/"/g, '""')}"`,
      `"${rev.replace(/"/g, '""')}"`,
      `"${t.priority || 'media'}"`,
      `"${t.plannedDate || ''}"`,
      `"${t.dueDate || ''}"`,
      `"${t.plannedHours || 0}"`,
      `"${t.actualHours || 0}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte-tareas-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Importa tareas desde un archivo JSON hacia Firestore.
 */
export const handleImportTasksFromFile = (
  file: File,
  onSuccess: () => void,
  onError: (errorMsg: string) => void
): void => {
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      if (Array.isArray(data)) {
        for (const task of data) {
          if (task.title && task.status) {
            await addDoc(collection(db, 'tasks'), {
              ...task,
              id: undefined,
              createdAt: new Date().toISOString(),
            });
          }
        }
        onSuccess();
      } else {
        onError('El archivo no contiene un arreglo de tareas válido.');
      }
    } catch (err) {
      onError('Error al importar tareas. Asegúrese de que sea un archivo JSON válido.');
    }
  };
  reader.readAsText(file);
};

/**
 * Copia una imagen al portapapeles.
 */
export const copyImageToClipboard = async (
  imageUrl: string,
  e?: React.MouseEvent,
  onSuccess?: () => void,
  onError?: (err: any) => void
): Promise<void> => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    ctx.drawImage(img, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error('Blob creation failed');
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        if (onSuccess) {
          onSuccess();
        } else {
          alert('Imagen copiada al portapapeles');
        }
      } catch (err) {
        console.error('Error al escribir al portapapeles:', err);
        if (onError) {
          onError(err);
        } else {
          alert('No se pudo copiar la imagen. El navegador puede no soportarlo.');
        }
      }
    }, 'image/png');
  } catch (err) {
    console.error('Error al procesar imagen para copiar:', err);
    if (onError) {
      onError(err);
    } else {
      alert('Hubo un error al preparar la imagen para copiar.');
    }
  }
};
