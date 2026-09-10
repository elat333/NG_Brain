import React from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Laptop, 
  User, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Edit2, 
  ExternalLink,
  BookOpen,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { TrainingPlan, Trainer, TrainingSpace, TeamMember, TrainingSession } from '../../types';

interface TrainingPlanDetailModalProps {
  plan: TrainingPlan;
  trainers: Trainer[];
  spaces: TrainingSpace[];
  members: TeamMember[];
  onClose: () => void;
  onEdit: (plan: TrainingPlan) => void;
}

export const TrainingPlanDetailModal: React.FC<TrainingPlanDetailModalProps> = ({
  plan,
  trainers,
  spaces,
  members,
  onClose,
  onEdit
}) => {
  // Normalizar las sesiones si el plan fue creado en formato antiguo
  const rawSessions: TrainingSession[] = plan.sessions && plan.sessions.length > 0 
    ? plan.sessions 
    : [{
        id: 'sess-0',
        date: plan.date || new Date().toISOString().split('T')[0],
        startTime: plan.startTime || '09:00',
        endTime: plan.endTime || '10:00',
        trainerId: plan.trainerId || '',
        spaceId: plan.spaceId || '',
        topic: 'Sesión Principal'
      }];

  // Ordenar sesiones cronológicamente
  const sessions = [...rawSessions].sort((a, b) => {
    const dComp = (a.date || '').localeCompare(b.date || '');
    if (dComp !== 0) return dComp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  const getTrainerInfo = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return { name: 'Capacitador no asignado', type: 'externo', avatar: '', specialties: '' };
    const member = members.find(m => m.id === trainer.directoryId);
    return {
      name: member?.name || 'Capacitador',
      type: trainer.type,
      avatar: member?.avatar || `https://picsum.photos/seed/${(member?.name || 'tr').replace(/\s/g, '')}/100/100`,
      role: member?.role || 'Instructor',
      specialties: trainer.specialties || ''
    };
  };

  const getSpaceInfo = (spaceId: string) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return { name: 'Lugar no especificado', type: 'fisico', city: '', platform: '', link: '' };
    return space;
  };

  // Calcular métricas
  const totalHours = sessions.reduce((acc, s) => {
    if (!s.startTime || !s.endTime) return acc;
    const [sH, sM] = s.startTime.split(':').map(Number);
    const [eH, eM] = s.endTime.split(':').map(Number);
    const h = (eH + eM / 60) - (sH + sM / 60);
    return acc + (h > 0 ? h : 0);
  }, 0);

  // Obtener fechas únicas
  const uniqueDates = Array.from(new Set(sessions.map(s => s.date).filter(Boolean)));
  // Obtener capacitadores únicos
  const uniqueTrainers = Array.from(new Set(sessions.map(s => s.trainerId).filter(Boolean)));
  // Obtener espacios únicos
  const uniqueSpaces = Array.from(new Set(sessions.map(s => s.spaceId).filter(Boolean)));

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
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
        {/* Cabecera Principal */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pr-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  plan.status === 'completada' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  plan.status === 'cancelada' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {plan.status || 'programada'}
                </span>
                <span className="text-xs text-indigo-200/80 font-bold flex items-center gap-1.5">
                  <Layers size={13} />
                  {uniqueDates.length} {uniqueDates.length === 1 ? 'Jornada' : 'Jornadas / Días'} • {sessions.length} {sessions.length === 1 ? 'Sesión' : 'Sesiones'}
                </span>
              </div>

              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                {plan.title}
              </h2>

              {plan.description && (
                <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
                  {plan.description}
                </p>
              )}
            </div>

            <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block">Carga Horaria Total</span>
                <div className="text-xl font-black text-white flex items-center justify-end gap-1.5">
                  <Clock size={18} className="text-amber-400" />
                  {totalHours.toFixed(1)} hrs
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onEdit(plan);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30"
              >
                <Edit2 size={14} />
                <span>Editar Planificación</span>
              </button>
            </div>
          </div>

          {/* Mini Resumen Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <CalendarIcon size={16} className="text-indigo-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Fechas</span>
                <span className="font-bold text-white">
                  {uniqueDates.length > 1 
                    ? `${uniqueDates[0]} al ${uniqueDates[uniqueDates.length - 1]}`
                    : uniqueDates[0] || 'Por definir'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <User size={16} className="text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacitadores</span>
                <span className="font-bold text-white">
                  {uniqueTrainers.length} {uniqueTrainers.length === 1 ? 'Instructor' : 'Instructores'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <MapPin size={16} className="text-rose-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Salas & Espacios</span>
                <span className="font-bold text-white">
                  {uniqueSpaces.length} {uniqueSpaces.length === 1 ? 'Espacio' : 'Espacios'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <GraduationCap size={16} className="text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Modalidad</span>
                <span className="font-bold text-white">
                  {uniqueSpaces.some(sId => spaces.find(s => s.id === sId)?.type === 'virtual') && 
                   uniqueSpaces.some(sId => spaces.find(s => s.id === sId)?.type === 'fisico')
                    ? 'Híbrida (Mixta)'
                    : uniqueSpaces.some(sId => spaces.find(s => s.id === sId)?.type === 'virtual')
                    ? '100% Virtual'
                    : '100% Presencial'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido: Cronograma de Sesiones & Días */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50/50">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CalendarIcon size={16} className="text-indigo-600" />
                Cronograma Detallado de Sesiones por Día
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {sessions.length} {sessions.length === 1 ? 'bloque horario' : 'bloques horarios'}
              </span>
            </div>

            <div className="space-y-4">
              {sessions.map((session, idx) => {
                const trainer = getTrainerInfo(session.trainerId);
                const space = getSpaceInfo(session.spaceId);
                
                // Calcular duración de este bloque
                let blockDuration = 0;
                if (session.startTime && session.endTime) {
                  const [sH, sM] = session.startTime.split(':').map(Number);
                  const [eH, eM] = session.endTime.split(':').map(Number);
                  blockDuration = Math.max(0, (eH + eM / 60) - (sH + sM / 60));
                }

                return (
                  <div
                    key={`sess_detail_${session.id || idx}_${idx}`}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-indigo-200 transition-all space-y-4"
                  >
                    {/* Header de la Sesión */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center border border-indigo-100/80">
                          #{idx + 1}
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-800 capitalize">
                            {formatDate(session.date)}
                          </span>
                          {session.topic && (
                            <p className="text-xs text-indigo-600 font-bold mt-0.5">
                              📌 {session.topic}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                          <Clock size={13} className="text-amber-600" />
                          {session.startTime} - {session.endTime} ({blockDuration.toFixed(1)} hrs)
                        </span>
                      </div>
                    </div>

                    {/* Detalle 2 Columnas: Capacitador Asignado y Espacio */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Capacitador para este bloque */}
                      <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-3.5">
                        <img
                          src={trainer.avatar}
                          alt={trainer.name}
                          className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 truncate block">
                              {trainer.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              trainer.type === 'interno' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {trainer.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {trainer.role} {trainer.specialties ? `• ${trainer.specialties}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Espacio / Sala para este bloque */}
                      <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl ${
                            space.type === 'virtual' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {space.type === 'virtual' ? <Laptop size={18} /> : <MapPin size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 truncate">
                                {space.name}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-white rounded border border-slate-200">
                                {space.type === 'virtual' ? 'Virtual' : 'Presencial'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              {space.type === 'virtual' 
                                ? (space.platform || 'Plataforma Online')
                                : (space.city ? `Ciudad: ${space.city}` : 'Ubicación física')}
                            </p>
                          </div>
                        </div>

                        {space.link && (
                          <a
                            href={space.link.startsWith('http') ? space.link : `https://${space.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors shrink-0"
                            title="Abrir enlace de la sala"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </div>
                    </div>

                    {session.notes && (
                      <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60 text-xs text-slate-700 font-medium">
                        <span className="font-bold text-indigo-900 block mb-0.5">Notas del bloque:</span>
                        {session.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Código de Plan: <code className="font-mono text-slate-700 font-bold">{plan.id}</code></span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
          >
            Cerrar Ficha
          </button>
        </div>
      </motion.div>
    </div>
  );
};
