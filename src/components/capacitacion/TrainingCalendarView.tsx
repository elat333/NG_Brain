import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  Laptop, 
  User, 
  Edit2, 
  Trash2, 
  Eye, 
  Layers,
  Search,
  Filter,
  Sparkles
} from 'lucide-react';
import { TrainingPlan, Trainer, TrainingSpace, TeamMember, TrainingSession } from '../../types';
import { TrainingPlanDetailModal } from './TrainingPlanDetailModal';
import { TrainingPlanEditorModal } from './TrainingPlanEditorModal';

interface TrainingCalendarViewProps {
  plans: TrainingPlan[];
  trainers: Trainer[];
  spaces: TrainingSpace[];
  members: TeamMember[];
  onSavePlan: (plan: Partial<TrainingPlan>) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
}

export const TrainingCalendarView: React.FC<TrainingCalendarViewProps> = ({ 
  plans, 
  trainers, 
  spaces, 
  members, 
  onSavePlan, 
  onDeletePlan 
}) => {
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<TrainingPlan> | null>(null);
  const [viewingPlan, setViewingPlan] = useState<TrainingPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Simple sort by date and time
  const sortedPlans = [...plans].sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    return dateCompare !== 0 ? dateCompare : (a.startTime || '').localeCompare(b.startTime || '');
  });

  const filteredPlans = sortedPlans.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenEditor = (plan?: TrainingPlan) => {
    if (plan) {
      setEditingPlan(plan);
    } else {
      setEditingPlan(null);
    }
    setShowEditorModal(true);
  };

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return 'Capacitador';
    return members.find(m => m.id === trainer.directoryId)?.name || 'Capacitador';
  };

  const getSpaceDetails = (spaceId: string) => {
    return spaces.find(s => s.id === spaceId);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/60">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Planificación de Capacitaciones
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Agenda de cursos, jornadas multidía, capacitadores asignados y asignación de salas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenEditor()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus size={16} />
            <span>Agendar Capacitación</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-xs">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título de capacitación..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] hidden md:inline">Estado:</span>
          {['all', 'programada', 'completada', 'cancelada'].map((st) => (
            <button
              key={`st_filter_${st}`}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all capitalize whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Capacitaciones */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPlans.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
              <CalendarIcon size={24} />
            </div>
            <h3 className="font-black text-slate-700 text-base">No se encontraron capacitaciones</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? 'Prueba modificando los filtros de búsqueda.'
                : 'Comienza agendando una capacitación multidía con sus respectivas jornadas y salas.'}
            </p>
          </div>
        ) : (
          filteredPlans.map((plan, pIdx) => {
            const sessions: TrainingSession[] = plan.sessions && plan.sessions.length > 0 
              ? plan.sessions 
              : [{
                  id: 'sess-0',
                  date: plan.date,
                  startTime: plan.startTime,
                  endTime: plan.endTime,
                  trainerId: plan.trainerId,
                  spaceId: plan.spaceId,
                  topic: 'Sesión Principal'
                }];

            const uniqueDates = Array.from(new Set(sessions.map(s => s.date).filter(Boolean)));
            const uniqueTrainers = Array.from(new Set(sessions.map(s => s.trainerId).filter(Boolean)));
            const primarySpace = getSpaceDetails(sessions[0]?.spaceId || plan.spaceId);

            // Calcular horas totales
            const totalHours = sessions.reduce((acc, s) => {
              if (!s.startTime || !s.endTime) return acc;
              const [sH, sM] = s.startTime.split(':').map(Number);
              const [eH, eM] = s.endTime.split(':').map(Number);
              const h = (eH + eM / 60) - (sH + sM / 60);
              return acc + (h > 0 ? h : 0);
            }, 0);

            return (
              <div 
                key={`tr_cal_plan_${plan.id || pIdx}_${pIdx}`} 
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                {/* Zona de Información Principal (Clic abre la Ficha) */}
                <div 
                  onClick={() => setViewingPlan(plan)}
                  className="space-y-3 cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      plan.status === 'programada' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      plan.status === 'completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {plan.status || 'programada'}
                    </span>

                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold flex items-center gap-1">
                      <Layers size={11} />
                      {sessions.length} {sessions.length === 1 ? 'Sesión' : 'Sesiones'} • {uniqueDates.length} {uniqueDates.length === 1 ? 'Día' : 'Días'}
                    </span>

                    <h3 className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                      {plan.title}
                    </h3>
                  </div>
                  
                  {plan.description && (
                    <p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-2xl">
                      {plan.description}
                    </p>
                  )}

                  {/* Chips Resumen */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <CalendarIcon size={14} className="text-indigo-500" />
                      <span className="font-bold text-slate-700">
                        {uniqueDates.length > 1 
                          ? `${uniqueDates[0]} al ${uniqueDates[uniqueDates.length - 1]}`
                          : uniqueDates[0] || plan.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <Clock size={14} className="text-amber-500" />
                      <span className="font-bold text-slate-700">{totalHours.toFixed(1)} hrs</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <User size={14} className="text-emerald-500" />
                      <span className="font-bold text-slate-700 truncate max-w-[150px]">
                        {uniqueTrainers.length > 1 
                          ? `${uniqueTrainers.length} Capacitadores`
                          : getTrainerName(sessions[0]?.trainerId || plan.trainerId)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      {primarySpace?.type === 'virtual' ? <Laptop size={14} className="text-blue-500" /> : <MapPin size={14} className="text-rose-500" />}
                      <span className="font-bold text-slate-700 truncate max-w-[160px]">
                        {primarySpace?.name || 'Espacio no especificado'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Botonera de Acciones */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button 
                    onClick={() => setViewingPlan(plan)}
                    title="Ver Ficha Integral de la Capacitación"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                  >
                    <Eye size={15} />
                    <span>Ver Ficha</span>
                  </button>

                  <button 
                    onClick={() => handleOpenEditor(plan)}
                    title="Editar Planificación"
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button 
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar la capacitación "${plan.title}"?`)) {
                        onDeletePlan(plan.id);
                      }
                    }}
                    title="Eliminar Planificación"
                    className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Ficha Integral de la Capacitación */}
      <AnimatePresence>
        {viewingPlan && (
          <TrainingPlanDetailModal
            plan={viewingPlan}
            trainers={trainers}
            spaces={spaces}
            members={members}
            onClose={() => setViewingPlan(null)}
            onEdit={(p) => {
              setViewingPlan(null);
              handleOpenEditor(p);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal Editor Multidía */}
      <AnimatePresence>
        {showEditorModal && (
          <TrainingPlanEditorModal
            initialPlan={editingPlan}
            trainers={trainers}
            spaces={spaces}
            members={members}
            onClose={() => {
              setShowEditorModal(false);
              setEditingPlan(null);
            }}
            onSave={async (planData) => {
              await onSavePlan(planData);
              setShowEditorModal(false);
              setEditingPlan(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
