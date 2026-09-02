import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Laptop, User, X } from 'lucide-react';
import { TrainingPlan, Trainer, TrainingSpace, TeamMember } from '../../types';

interface TrainingCalendarViewProps {
  plans: TrainingPlan[];
  trainers: Trainer[];
  spaces: TrainingSpace[];
  members: TeamMember[];
  onSavePlan: (plan: Partial<TrainingPlan>) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
}

export const TrainingCalendarView: React.FC<TrainingCalendarViewProps> = ({ plans, trainers, spaces, members, onSavePlan, onDeletePlan }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<TrainingPlan> | null>(null);
  const [selectedSpaceType, setSelectedSpaceType] = useState<'fisico' | 'virtual'>('fisico');

  // Simple sort by date and time
  const sortedPlans = [...plans].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.startTime.localeCompare(b.startTime);
  });

  const handleOpenModal = (plan?: TrainingPlan) => {
    if (plan) {
      setEditingPlan(plan);
      const space = spaces.find(s => s.id === plan.spaceId);
      if (space) setSelectedSpaceType(space.type);
    } else {
      setEditingPlan({ status: 'programada', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', spaceId: '', trainerId: '' });
      setSelectedSpaceType('fisico');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      await onSavePlan(editingPlan);
      setShowModal(false);
    }
  };

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return 'Desconocido';
    return members.find(m => m.id === trainer.directoryId)?.name || 'Desconocido';
  };

  const getSpaceDetails = (spaceId: string) => {
    const space = spaces.find(s => s.id === spaceId);
    return space;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            Planificación de Capacitaciones
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Calendario y agendamiento de eventos.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus size={16} />
          <span>Agendar Capacitación</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sortedPlans.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-500">
            No hay planificaciones agendadas.
          </div>
        ) : (
          sortedPlans.map((plan, pIdx) => {
            const space = getSpaceDetails(plan.spaceId);
            return (
              <div key={`tr_cal_plan_${plan.id || pIdx}_${pIdx}`} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      plan.status === 'programada' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      plan.status === 'completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {plan.status}
                    </span>
                    <h3 className="font-bold text-slate-800 text-lg">{plan.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <CalendarIcon size={14} className="text-indigo-500" />
                      {plan.date}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <Clock size={14} className="text-amber-500" />
                      {plan.startTime} - {plan.endTime}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <User size={14} className="text-emerald-500" />
                      {getTrainerName(plan.trainerId)}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      {space?.type === 'virtual' ? <Laptop size={14} className="text-blue-500" /> : <MapPin size={14} className="text-rose-500" />}
                      {space?.name || 'Lugar Desconocido'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-start md:self-center">
                  <button 
                    onClick={() => handleOpenModal(plan)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('¿Eliminar esta planificación?')) onDeletePlan(plan.id);
                    }}
                    className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showModal && editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg my-8 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-3xl sticky top-0 z-10">
                <h3 className="font-black text-lg text-slate-800">
                  {editingPlan.id ? 'Editar Planificación' : 'Nueva Planificación'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <form id="plan-form" onSubmit={handleSave} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Título del Evento / Curso
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPlan.title || ''}
                      onChange={e => setEditingPlan({ ...editingPlan, title: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Fecha</label>
                      <input
                        type="date"
                        required
                        value={editingPlan.date || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, date: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estado</label>
                      <select
                        value={editingPlan.status || 'programada'}
                        onChange={e => setEditingPlan({ ...editingPlan, status: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="programada">Programada</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Hora de Inicio</label>
                      <input
                        type="time"
                        required
                        value={editingPlan.startTime || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, startTime: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Hora de Fin</label>
                      <input
                        type="time"
                        required
                        value={editingPlan.endTime || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, endTime: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Capacitador Asignado</label>
                    <select
                      required
                      value={editingPlan.trainerId || ''}
                      onChange={e => setEditingPlan({ ...editingPlan, trainerId: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Seleccione capacitador...</option>
                      {trainers.map((t, tIdx) => (
                        <option key={`tr_cal_trainer_opt_${t.id || tIdx}_${tIdx}`} value={t.id}>{getTrainerName(t.id)} - {t.type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 p-4 border border-indigo-50 bg-indigo-50/30 rounded-2xl">
                    <label className="block text-xs font-black text-indigo-800 uppercase tracking-wider">
                      Ubicación de la Capacitación
                    </label>
                    <div className="flex items-center gap-4 bg-white p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => { setSelectedSpaceType('fisico'); setEditingPlan({...editingPlan, spaceId: ''}); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${selectedSpaceType === 'fisico' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Lugar Físico
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedSpaceType('virtual'); setEditingPlan({...editingPlan, spaceId: ''}); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${selectedSpaceType === 'virtual' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Aula Virtual
                      </button>
                    </div>
                    
                    <select
                      required
                      value={editingPlan.spaceId || ''}
                      onChange={e => setEditingPlan({ ...editingPlan, spaceId: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Seleccione espacio {selectedSpaceType === 'fisico' ? 'físico' : 'virtual'}...</option>
                      {spaces.filter(s => s.type === selectedSpaceType).map((s, sIdx) => (
                        <option key={`tr_cal_space_opt_${s.id || sIdx}_${sIdx}`} value={s.id}>{s.name} {s.city ? `(${s.city})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="plan-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-500/20"
                >
                  Guardar Planificación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
