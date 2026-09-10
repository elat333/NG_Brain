import React from 'react';
import { Trash2, Calendar, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { Task, TeamMember, Process, Project } from '../../types';

export interface TaskCardProps {
  task: Task;
  allTasks?: Task[];
  member?: TeamMember;
  auxiliary?: TeamMember;
  auxiliaries?: TeamMember[];
  revisor?: TeamMember;
  process?: Process;
  project?: Project;
  onUpdateStatus: (id: string, status: any) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  member,
  auxiliaries = [],
  revisor,
  process,
  project,
  onUpdateStatus,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      onClick={() => onEdit(task)}
      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.priority && (
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                task.priority === 'meteoric_crash'
                  ? 'bg-red-50 text-red-600'
                  : task.priority === 'alta'
                  ? 'bg-amber-50 text-amber-600'
                  : task.priority === 'media'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {task.priority === 'meteoric_crash' ? 'urgente' : task.priority}
            </span>
          )}
          {project && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 truncate max-w-[120px]">
              {project.name}
            </span>
          )}
          {task.comments && task.comments.length > 0 && (() => {
            const pendingCount = task.comments.filter(c => c.requiresReview && c.status === 'pending').length;
            return (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs ${
                  pendingCount > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                    : 'bg-gray-100 text-gray-600'
                }`}
                title={pendingCount > 0 ? `${pendingCount} solicitud(es) de revisión pendientes` : `${task.comments.length} comentarios`}
              >
                <MessageSquare size={10} />
                <span>{task.comments.length}</span>
                {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </span>
            );
          })()}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-[11px] text-gray-400 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100/80 mt-auto gap-2">
        {/* Cluster de Participantes: Responsable │ Revisor │ Auxiliares */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* 1. Responsable Principal */}
          {member ? (
            <div
              className="relative group/resp shrink-0"
              title={`Responsable principal: ${member.name || 'Sin nombre'}`}
            >
              <div className="w-6 h-6 rounded-full ring-2 ring-[#97d700] overflow-hidden bg-emerald-50 text-emerald-800 flex items-center justify-center text-[9px] font-black shadow-xs">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{(member.name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400 font-bold shrink-0"
              title="Sin responsable asignado"
            >
              ?
            </div>
          )}

          {/* 2. Divisor 1 y Revisor */}
          {revisor && (
            <div className="flex items-center gap-0.5 shrink-0">
              <div className="h-3.5 w-[1.5px] bg-gray-200/90 rounded-full shrink-0 mx-0.5" />
              <div
                className="relative group/rev shrink-0"
                title={`Revisor / Aprobador: ${revisor.name || 'Sin nombre'}`}
              >
                <div className="w-5 h-5 rounded-full ring-1.5 ring-indigo-400 overflow-hidden bg-indigo-50 text-indigo-700 flex items-center justify-center text-[8px] font-bold shadow-xs">
                  {revisor.avatar ? (
                    <img
                      src={revisor.avatar}
                      alt={revisor.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{(revisor.name || 'R').charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. Divisor 2 y Auxiliares */}
          {auxiliaries && auxiliaries.length > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <div className="h-3.5 w-[1.5px] bg-gray-200/90 rounded-full shrink-0 mx-0.5" />
              <div
                className="flex items-center -space-x-1.5 shrink-0"
                title={`Auxiliares: ${auxiliaries.map(a => a.name).join(', ')}`}
              >
                {auxiliaries.slice(0, 2).map((a: any, aIdx: number) => (
                  <div
                    key={`task_card_${task.id || 't'}_aux_${a.id || aIdx}_${aIdx}`}
                    className="w-[18px] h-[18px] rounded-full ring-1 ring-purple-300 border border-white overflow-hidden bg-purple-50 text-purple-700 flex items-center justify-center text-[7.5px] font-bold shadow-xs shrink-0"
                    title={`Auxiliar: ${a.name}`}
                  >
                    {a.avatar ? (
                      <img
                        src={a.avatar}
                        alt={a.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{(a.name || 'A').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                ))}
                {auxiliaries.length > 2 && (
                  <div
                    className="w-[18px] h-[18px] rounded-full bg-gray-100 ring-1 ring-gray-300 border border-white text-gray-600 flex items-center justify-center text-[7px] font-black shrink-0"
                    title={`+${auxiliaries.length - 2} auxiliares más`}
                  >
                    +{auxiliaries.length - 2}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {task.plannedDate && (
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs" title="Fecha Planificada">
              <Calendar size={10} className="text-blue-500" /> {new Date(task.plannedDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).replace('.', '')}
            </span>
          )}
          {task.dueDate && (
            <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs" title="Fecha Límite">
              <Calendar size={10} className="text-red-500" /> {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).replace('.', '')}
            </span>
          )}
          {task.plannedHours ? (
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 ml-0.5" title="Horas planificadas">
              <Clock size={10} /> {task.plannedHours}h
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
