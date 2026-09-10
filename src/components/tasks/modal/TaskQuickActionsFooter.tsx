import React from 'react';
import { 
  ArrowLeft, CheckCircle, AlertTriangle, ShieldAlert, 
  Play, RefreshCw, Send, Check
} from 'lucide-react';
import { Task } from '../../../types';

export interface TaskQuickActionsFooterProps {
  currentStatus: Task['status'];
  isProcessLeader: boolean;
  canEditExecution: boolean;
  onTransitionStatus: (newStatus: Task['status']) => void;
}

export const TaskQuickActionsFooter: React.FC<TaskQuickActionsFooterProps> = ({
  currentStatus,
  isProcessLeader,
  canEditExecution,
  onTransitionStatus
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Botón Permanente: Bloquear Tarea (Disponible en cualquier estado excepto cuando ya está bloqueada) */}
      {currentStatus !== 'blocked' && (
        <button
          type="button"
          onClick={() => onTransitionStatus('blocked')}
          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-100 hover:border-red-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
          title="Marcar tarea como bloqueada por impedimento o dependencia"
        >
          <ShieldAlert size={13} />
          <span>Bloquear Tarea</span>
        </button>
      )}

      {/* Si está Bloqueada: Desbloquear / Reanudar */}
      {currentStatus === 'blocked' && (
        <button
          type="button"
          onClick={() => onTransitionStatus('in_progress')}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Play size={13} />
          <span>Desbloquear / Reanudar</span>
        </button>
      )}

      {/* Si está en 'todo' (Por Hacer) */}
      {currentStatus === 'todo' && (
        <>
          {isProcessLeader && (
            <button
              type="button"
              onClick={() => onTransitionStatus('backlog')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              title="Devolver al Backlog (Solo Líder)"
            >
              <ArrowLeft size={13} />
              <span>Volver al Backlog</span>
            </button>
          )}
          {canEditExecution && (
            <button
              type="button"
              onClick={() => onTransitionStatus('in_progress')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Play size={13} />
              <span>Iniciar (En Progreso)</span>
            </button>
          )}
        </>
      )}

      {/* Si está en 'in_progress' (En Progreso) */}
      {currentStatus === 'in_progress' && (
        <button
          type="button"
          onClick={() => onTransitionStatus('review')}
          className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Send size={13} />
          <span>Enviar para Revisión</span>
        </button>
      )}

      {/* Si está en 'review' (Para Revisión) */}
      {currentStatus === 'review' && (
        <>
          {isProcessLeader && (
            <button
              type="button"
              onClick={() => onTransitionStatus('backlog')}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1"
              title="Devolver al Backlog (Solo Líder)"
            >
              <ArrowLeft size={12} />
              <span>Backlog</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onTransitionStatus('correction')}
            className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <AlertTriangle size={13} />
            <span>Para Corrección</span>
          </button>
          <button
            type="button"
            onClick={() => onTransitionStatus('done')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle size={13} />
            <span>Aprobar y Completar</span>
          </button>
        </>
      )}

      {/* Si está en 'correction' (Para Corrección) */}
      {currentStatus === 'correction' && (
        <button
          type="button"
          onClick={() => onTransitionStatus('review')}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw size={13} />
          <span>Reenviar a Revisión</span>
        </button>
      )}

      {/* Si está en 'backlog' */}
      {currentStatus === 'backlog' && (
        <button
          type="button"
          onClick={() => onTransitionStatus('todo')}
          className="px-3.5 py-1.5 rounded-xl bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <span>Mover a "Por Hacer"</span>
        </button>
      )}
    </div>
  );
};
