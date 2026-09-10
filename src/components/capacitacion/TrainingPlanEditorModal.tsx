import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Laptop, 
  User, 
  Plus, 
  Trash2, 
  Copy, 
  Layers, 
  BookOpen,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { TrainingPlan, Trainer, TrainingSpace, TeamMember, TrainingSession } from '../../types';

interface TrainingPlanEditorModalProps {
  initialPlan: Partial<TrainingPlan> | null;
  trainers: Trainer[];
  spaces: TrainingSpace[];
  members: TeamMember[];
  onClose: () => void;
  onSave: (plan: Partial<TrainingPlan>) => Promise<void>;
}

export const TrainingPlanEditorModal: React.FC<TrainingPlanEditorModalProps> = ({
  initialPlan,
  trainers,
  spaces,
  members,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(initialPlan?.title || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [status, setStatus] = useState<'programada' | 'completada' | 'cancelada'>(initialPlan?.status || 'programada');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Inicializar sesiones
  const [sessions, setSessions] = useState<TrainingSession[]>(() => {
    if (initialPlan?.sessions && initialPlan.sessions.length > 0) {
      return initialPlan.sessions;
    }
    // Si viene de un plan antiguo con un solo día:
    return [{
      id: `sess-${Date.now()}-0`,
      date: initialPlan?.date || new Date().toISOString().split('T')[0],
      startTime: initialPlan?.startTime || '09:00',
      endTime: initialPlan?.endTime || '12:00',
      trainerId: initialPlan?.trainerId || (trainers[0]?.id || ''),
      spaceId: initialPlan?.spaceId || (spaces[0]?.id || ''),
      topic: 'Módulo 1',
      notes: ''
    }];
  });

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return 'Capacitador no asignado';
    const member = members.find(m => m.id === trainer.directoryId);
    return `${member?.name || 'Capacitador'} (${trainer.type})`;
  };

  const handleAddSession = () => {
    const lastSession = sessions[sessions.length - 1];
    let nextDate = new Date().toISOString().split('T')[0];
    
    // Si ya hay una sesión, calcular el día siguiente por defecto
    if (lastSession && lastSession.date) {
      try {
        const parts = lastSession.date.split('-');
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split('T')[0];
      } catch {
        nextDate = lastSession.date;
      }
    }

    const newSession: TrainingSession = {
      id: `sess-${Date.now()}-${sessions.length}`,
      date: nextDate,
      startTime: lastSession?.startTime || '09:00',
      endTime: lastSession?.endTime || '12:00',
      trainerId: lastSession?.trainerId || (trainers[0]?.id || ''),
      spaceId: lastSession?.spaceId || (spaces[0]?.id || ''),
      topic: `Módulo ${sessions.length + 1}`,
      notes: ''
    };

    setSessions([...sessions, newSession]);
  };

  const handleDuplicateSession = (idx: number) => {
    const source = sessions[idx];
    const newSession: TrainingSession = {
      ...source,
      id: `sess-${Date.now()}-${sessions.length}`,
      topic: `${source.topic || 'Módulo'} (Copia)`
    };
    const updated = [...sessions];
    updated.splice(idx + 1, 0, newSession);
    setSessions(updated);
  };

  const handleRemoveSession = (idx: number) => {
    if (sessions.length <= 1) {
      setFormError('La capacitación debe tener al menos una sesión o jornada programada.');
      return;
    }
    setFormError('');
    setSessions(sessions.filter((_, i) => i !== idx));
  };

  const handleUpdateSession = (idx: number, field: keyof TrainingSession, value: any) => {
    const updated = [...sessions];
    updated[idx] = { ...updated[idx], [field]: value };
    setSessions(updated);
  };

  // Calcular horas totales sumando todas las sesiones
  const totalHours = sessions.reduce((acc, s) => {
    if (!s.startTime || !s.endTime) return acc;
    const [sH, sM] = s.startTime.split(':').map(Number);
    const [eH, eM] = s.endTime.split(':').map(Number);
    const h = (eH + eM / 60) - (sH + sM / 60);
    return acc + (h > 0 ? h : 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Por favor ingresa un título para la capacitación.');
      return;
    }

    if (sessions.length === 0) {
      setFormError('Debes agregar al menos una sesión de capacitación.');
      return;
    }

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.date) {
        setFormError(`Por favor define la fecha en la sesión #${i + 1}.`);
        return;
      }
      if (!s.startTime || !s.endTime) {
        setFormError(`Por favor define el horario completo en la sesión #${i + 1}.`);
        return;
      }
      if (!s.trainerId) {
        setFormError(`Por favor asigna un capacitador en la sesión #${i + 1}.`);
        return;
      }
      if (!s.spaceId) {
        setFormError(`Por favor selecciona una sala o espacio en la sesión #${i + 1}.`);
        return;
      }
    }

    try {
      setIsSaving(true);
      setFormError('');

      // Ordenar sesiones por fecha y hora
      const sortedSessions = [...sessions].sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

      const firstSession = sortedSessions[0];
      const lastSession = sortedSessions[sortedSessions.length - 1];

      const planData: Partial<TrainingPlan> = {
        ...(initialPlan || {}),
        title: title.trim(),
        description: description.trim(),
        status,
        sessions: sortedSessions,
        // Compatibilidad hacia atrás:
        date: firstSession.date,
        endDate: lastSession.date,
        startTime: firstSession.startTime,
        endTime: firstSession.endTime,
        trainerId: firstSession.trainerId,
        spaceId: firstSession.spaceId,
        totalHours: Number(totalHours.toFixed(1))
      };

      await onSave(planData);
      onClose();
    } catch (err: any) {
      console.error('Error guardando planificación:', err);
      setFormError('Ocurrió un error al guardar la capacitación. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 text-left"
      >
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {initialPlan?.id ? 'Editar Planificación de Capacitación' : 'Nueva Planificación Multidía'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configura fechas, franjas horarias, capacitadores y salas independientes por sesión.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <form id="plan-multiday-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Información General */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-600" />
                Información General del Curso / Evento
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Título de la Capacitación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Certificación en Manejo de Extintores y Evacuación"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Estado de la Planificación
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="programada">Programada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Descripción / Objetivos de la Capacitación
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalle breve del alcance, temario principal o público objetivo..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs font-medium p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Constructor de Sesiones / Días */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Layers size={15} className="text-indigo-600" />
                    Jornadas, Días y Franjas Horarias ({sessions.length})
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Puedes programar múltiples días o varias franjas en el mismo día con diferentes capacitadores y salas.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-black flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-600" />
                    <span>Total: {totalHours.toFixed(1)} hrs</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSession}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-colors"
                  >
                    <Plus size={14} />
                    <span>+ Agregar Sesión / Día</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {sessions.map((session, idx) => {
                  const space = spaces.find(s => s.id === session.spaceId);
                  
                  // Calcular duración de esta sesión
                  let sDuration = 0;
                  if (session.startTime && session.endTime) {
                    const [sH, sM] = session.startTime.split(':').map(Number);
                    const [eH, eM] = session.endTime.split(':').map(Number);
                    sDuration = Math.max(0, (eH + eM / 60) - (sH + sM / 60));
                  }

                  return (
                    <div
                      key={`sess_editor_${session.id || idx}_${idx}`}
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all space-y-4"
                    >
                      {/* Cabecera de la Sesión individual */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder={`Tema / Módulo ${idx + 1}`}
                            value={session.topic || ''}
                            onChange={e => handleUpdateSession(idx, 'topic', e.target.value)}
                            className="bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-300 text-xs font-bold px-2.5 py-1 rounded-lg focus:outline-none transition-all"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">
                            {sDuration.toFixed(1)} hrs
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDuplicateSession(idx)}
                            title="Duplicar esta sesión"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Copy size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveSession(idx)}
                            title="Eliminar sesión"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Campos: Fecha, Horas, Capacitador, Sala */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {/* Fecha */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                            <CalendarIcon size={12} className="text-indigo-600" /> Fecha <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={session.date || ''}
                            onChange={e => handleUpdateSession(idx, 'date', e.target.value)}
                            className="w-full bg-slate-50/70 border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        {/* Horario (Inicio - Fin) */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                            <Clock size={12} className="text-amber-600" /> Horario <span className="text-rose-500">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="time"
                              required
                              value={session.startTime || ''}
                              onChange={e => handleUpdateSession(idx, 'startTime', e.target.value)}
                              className="w-full bg-slate-50/70 border border-slate-200 text-[11px] font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            <input
                              type="time"
                              required
                              value={session.endTime || ''}
                              onChange={e => handleUpdateSession(idx, 'endTime', e.target.value)}
                              className="w-full bg-slate-50/70 border border-slate-200 text-[11px] font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Capacitador para este bloque */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                            <User size={12} className="text-emerald-600" /> Capacitador <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={session.trainerId || ''}
                            onChange={e => handleUpdateSession(idx, 'trainerId', e.target.value)}
                            className="w-full bg-slate-50/70 border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          >
                            <option value="">Seleccionar capacitador...</option>
                            {trainers.map((t, tIdx) => (
                              <option key={`sess_${idx}_tr_${t.id || tIdx}_${tIdx}`} value={t.id}>
                                {getTrainerName(t.id)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Sala / Espacio para este bloque */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                            {space?.type === 'virtual' ? <Laptop size={12} className="text-blue-600" /> : <MapPin size={12} className="text-rose-600" />} 
                            Espacio / Sala <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={session.spaceId || ''}
                            onChange={e => handleUpdateSession(idx, 'spaceId', e.target.value)}
                            className="w-full bg-slate-50/70 border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          >
                            <option value="">Seleccionar sala o virtual...</option>
                            <optgroup label="📍 Espacios Físicos">
                              {spaces.filter(s => s.type === 'fisico').map((s, sIdx) => (
                                <option key={`sess_${idx}_sp_f_${s.id || sIdx}_${sIdx}`} value={s.id}>
                                  {s.name} {s.city ? `(${s.city})` : ''}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="💻 Aulas Virtuales">
                              {spaces.filter(s => s.type === 'virtual').map((s, sIdx) => (
                                <option key={`sess_${idx}_sp_v_${s.id || sIdx}_${sIdx}`} value={s.id}>
                                  {s.name} ({s.platform || 'Online'})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>

                      {/* Notas opcionales de la sesión */}
                      <div>
                        <input
                          type="text"
                          placeholder="Notas o requerimientos de este bloque (opcional)..."
                          value={session.notes || ''}
                          onChange={e => handleUpdateSession(idx, 'notes', e.target.value)}
                          className="w-full bg-slate-50/40 border border-slate-100 text-[11px] font-medium px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-300 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Pie de modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-20">
          <span className="text-xs font-bold text-slate-500">
            {sessions.length} {sessions.length === 1 ? 'jornada configurada' : 'jornadas configuradas'} • {totalHours.toFixed(1)} horas totales
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="plan-multiday-form"
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
            >
              {isSaving ? 'Guardando...' : 'Guardar Planificación'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
