import React, { useState } from 'react';
import { Plus, Trash2, Link as LinkIcon, FolderKanban, AlignLeft } from 'lucide-react';
import { Deliverable } from '../../../types';

interface TaskDeliverablesSectionProps {
  deliverables?: Deliverable[];
  canEditExecution: boolean;
  onUpdateDeliverables: (deliverables: Deliverable[]) => void;
}

export const TaskDeliverablesSection: React.FC<TaskDeliverablesSectionProps> = ({
  deliverables = [],
  canEditExecution,
  onUpdateDeliverables,
}) => {
  const handleAddDeliverable = () => {
    const newDeliverable: Deliverable = {
      id: Date.now().toString(),
      url: '',
      description: '',
      folderLocation: ''
    };
    onUpdateDeliverables([...deliverables, newDeliverable]);
  };

  const handleUpdateDeliverable = (index: number, field: keyof Deliverable, value: string) => {
    const updated = [...deliverables];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onUpdateDeliverables(updated);
  };

  const handleDeleteDeliverable = (index: number) => {
    const updated = deliverables.filter((_, i) => i !== index);
    onUpdateDeliverables(updated);
  };

  return (
    <div className="space-y-4 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
          <LinkIcon size={14} className="text-blue-500" /> Links para entrega de productos
        </label>
        {canEditExecution && (
          <button
            type="button"
            onClick={handleAddDeliverable}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus size={14} /> Añadir Link
          </button>
        )}
      </div>

      {deliverables.length > 0 ? (
        <div className="space-y-3">
          {deliverables.map((del, idx) => (
            <div key={`task_deliv_${del.id || idx}_${idx}`} className="flex gap-3 items-start bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <FolderKanban size={12} className="text-orange-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Ubicación en Drive (Ruta o carpeta)..."
                      disabled={!canEditExecution}
                      className={`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs ${
                        !canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={del.folderLocation || ''}
                      onChange={e => handleUpdateDeliverable(idx, 'folderLocation', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <LinkIcon size={12} className="text-blue-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="URL del entregable (ej. Figma, Docs...)"
                      disabled={!canEditExecution}
                      className={`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs ${
                        !canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                      }`}
                      value={del.url}
                      onChange={e => handleUpdateDeliverable(idx, 'url', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlignLeft size={12} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Descripción breve (opcional)..."
                    disabled={!canEditExecution}
                    className={`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs ${
                      !canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                    }`}
                    value={del.description || ''}
                    onChange={e => handleUpdateDeliverable(idx, 'description', e.target.value)}
                  />
                </div>
              </div>
              {canEditExecution && (
                <button
                  type="button"
                  onClick={() => handleDeleteDeliverable(idx)}
                  className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1 shrink-0 cursor-pointer"
                  title="Eliminar entregable"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
          <p className="text-xs font-medium text-gray-400">No hay links de entrega añadidos.</p>
        </div>
      )}
    </div>
  );
};
