import React from 'react';
import { History, Calendar } from 'lucide-react';
import { Task } from '../../../types';

interface TaskHistorySectionProps {
  task: Task | null;
}

export const TaskHistorySection: React.FC<TaskHistorySectionProps> = ({ task }) => {
  if (!task) {
    return (
      <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-gray-100">
        <p className="text-xs text-gray-400">No hay información de historial para una nueva tarea.</p>
      </div>
    );
  }

  const historyEntries = (task as any).history || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
        <History size={16} className="text-blue-500" />
        <span>Registro de Cambios y Actividad</span>
      </div>

      {historyEntries.length > 0 ? (
        <div className="space-y-3">
          {historyEntries.map((entry: any, index: number) => (
            <div key={`history_${index}`} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5">
                <Calendar size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-800">{entry.userName || entry.user || 'Usuario'}</span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{entry.description || entry.action}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
          <p className="text-xs text-gray-400">Sin historial registrado para esta tarea.</p>
        </div>
      )}
    </div>
  );
};
