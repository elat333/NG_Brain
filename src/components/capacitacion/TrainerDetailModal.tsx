import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  GraduationCap, 
  DollarSign, 
  Mail, 
  Phone, 
  Building, 
  CreditCard, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Heart, 
  ThumbsDown, 
  ShieldAlert, 
  Briefcase, 
  FileText, 
  Layers, 
  Sparkles, 
  HelpCircle,
  MapPin,
  Edit2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Trainer, TeamMember, Company, Process, Role, TrainingPlan, TrainingSpace } from '../../types';

interface TrainerDetailModalProps {
  trainer: Trainer;
  member?: TeamMember;
  company?: Company;
  process?: Process;
  plans?: TrainingPlan[];
  spaces?: TrainingSpace[];
  onClose: () => void;
  onEdit: (trainer: Trainer) => void;
}

export const TrainerDetailModal: React.FC<TrainerDetailModalProps> = ({
  trainer,
  member,
  company,
  process,
  plans = [],
  spaces = [],
  onClose,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'training' | 'history'>('training');

  // Filtrar planes de capacitación dictados por este instructor (tanto directo como en sesiones multidía)
  const trainerPlans = plans.filter(p => {
    if (p.trainerId === trainer.id) return true;
    if (p.sessions && p.sessions.some(s => s.trainerId === trainer.id)) return true;
    return false;
  });

  const getRelationshipLabel = (type?: string) => {
    switch (type) {
      case 'aliado_estrategico': return 'Aliado Estratégico';
      case 'planta': return 'Instructor de Planta';
      case 'honorarios': return 'Docente por Honorarios';
      case 'proveedor_frecuente': return 'Proveedor Frecuente';
      default: return trainer.type === 'interno' ? 'Docente Interno' : 'Instructor Externo';
    }
  };

  const getModalityLabel = (modality?: string) => {
    switch (modality) {
      case 'presencial': return 'Presencial (In-situ)';
      case 'virtual': return 'Virtual / En línea';
      case 'hibrido': return 'Híbrido (Virtual & Presencial)';
      default: return 'No especificado';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 text-left"
      >
        {/* Cabecera Principal del Capacitador */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pr-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={member?.avatar || `https://picsum.photos/seed/${(member?.name || 'Trainer').replace(/\s/g, '')}/150/150`}
                  alt={member?.name || 'Capacitador'}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-white/10 shadow-lg"
                />
                <span className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                  trainer.type === 'interno' ? 'bg-indigo-500 text-white' : 'bg-amber-400 text-slate-950 font-black'
                }`}>
                  {trainer.type}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {member?.name || 'Capacitador sin vincular'}
                  </h2>
                  <span className="px-2.5 py-1 bg-white/10 text-indigo-200 text-xs font-bold rounded-lg backdrop-blur-md">
                    {getRelationshipLabel(trainer.relationshipType)}
                  </span>
                </div>

                <p className="text-sm text-indigo-200 font-semibold mt-1">
                  {member?.role || 'Capacitador / Facilitador Profesional'}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-300 font-medium mt-2.5 flex-wrap">
                  {member?.email && (
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors">
                      <Mail size={13} className="text-indigo-400" />
                      {member.email}
                    </span>
                  )}
                  {member?.phone && (
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors">
                      <Phone size={13} className="text-indigo-400" />
                      {member.phone}
                    </span>
                  )}
                  {company?.name && (
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors">
                      <Building size={13} className="text-indigo-400" />
                      {company.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block">Tarifa acordada</span>
                <div className="text-lg font-black text-white flex items-center justify-end gap-1">
                  <DollarSign size={16} className="text-emerald-400" />
                  {trainer.hourlyRate ? `${trainer.hourlyRate.toFixed(2)}/h` : 'No definida'}
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onEdit(trainer);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                <Edit2 size={14} />
                <span>Editar Ficha</span>
              </button>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setActiveTab('training')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'training'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <GraduationCap size={15} />
              <span>Capacitación & Preferencias</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'profile'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={15} />
              <span>Datos del Directorio</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar size={15} />
              <span>Historial de Capacitaciones ({trainerPlans.length})</span>
            </button>
          </div>
        </div>

        {/* Contenido de las Pestañas */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50/50">
          {/* PESTAÑA 1: CAPACITACIÓN & PREFERENCIAS */}
          {activeTab === 'training' && (
            <div className="space-y-6">
              {/* Grid 2 Columnas: Especialidades y Qué sabe enseñar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider">
                    <Sparkles size={16} />
                    <span>Especialidades & Competencias Clave</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {trainer.specialties ? (
                      trainer.specialties.split(',').map((spec, i) => (
                        <span
                          key={`spec_${i}`}
                          className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-bold rounded-xl"
                        >
                          {spec.trim()}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No hay especialidades registradas.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-wider">
                    <Heart size={16} />
                    <span>¿Qué sabe y le gusta enseñar?</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/60 min-h-[60px]">
                    {trainer.teachingInterests || 'Sin especificaciones sobre materias o temas preferidos.'}
                  </p>
                </div>
              </div>

              {/* Grid 2 Columnas: Lo que no le gusta / Restricciones y Modalidad/Logística */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-wider">
                    <ThumbsDown size={16} />
                    <span>¿Qué no le gusta / Restricciones?</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/60 min-h-[60px]">
                    {trainer.teachingDislikes || 'Sin restricciones o temas no deseados especificados.'}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-black text-xs uppercase tracking-wider">
                    <Layers size={16} />
                    <span>Modalidad Preferida & Viáticos</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-500">Modalidad Favorita:</span>
                      <span className="font-black text-slate-800">{getModalityLabel(trainer.preferredModality)}</span>
                    </div>
                    {trainer.logisticsNotes && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-500 block mb-1">Condiciones Logísticas / Viáticos:</span>
                        <p className="text-slate-700 font-medium">{trainer.logisticsNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notas de Relación Institucional / Acuerdos */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                  <MessageSquare size={16} className="text-indigo-600" />
                  <span>Bitácora de Relación & Acuerdos Institucionales</span>
                </div>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-line">
                  {trainer.relationshipNotes || 'No se han registrado acuerdos o notas especiales de relación con este capacitador.'}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: DATOS DEL DIRECTORIO */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identificación y Legal */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CreditCard size={14} className="text-indigo-600" />
                    Identificación & Registro Tributario
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold">Cédula / Identificación:</span>
                      <span className="font-black text-slate-800">{member?.identificationId || 'No registrada'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold">RUC:</span>
                      <span className="font-black text-slate-800">{member?.ruc || (member?.hasRuc ? 'RUC Activo' : 'No registra')}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 font-bold">Categorías en Directorio:</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(member?.categories || ['contacto']).map((c, idx) => (
                          <span key={`cat_badge_${idx}`} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vínculo Corporativo & Proceso */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Building size={14} className="text-indigo-600" />
                    Empresa & Proceso Vinculado
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold">Empresa Principal:</span>
                      <span className="font-black text-slate-800">{company?.name || 'Independiente / Sin vincular'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold">Área / Proceso:</span>
                      <span className="font-black text-slate-800">{process?.name || 'Capacitación General'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 font-bold">Cargo Declarado:</span>
                      <span className="font-black text-slate-800">{member?.role || 'Capacitador'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Habilidades & Responsabilidades registradas en el Directorio */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Briefcase size={14} className="text-indigo-600" />
                  Competencias & Perfil del Directorio
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block mb-1.5">Habilidades Generales:</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(member?.skills) && member.skills.length > 0 ? (
                        member.skills.map((s, i) => (
                          <span key={`dir_skill_${i}`} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">No especificadas</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block mb-1.5">Notas de Perfil:</span>
                    <p className="text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {member?.notes || member?.personality || 'Sin observaciones adicionales en el directorio.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: HISTORIAL DE CAPACITACIONES */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Capacitaciones Asociadas ({trainerPlans.length})
                </h4>
                <span className="text-xs font-bold text-slate-400">Trazabilidad en tiempo real</span>
              </div>

              {trainerPlans.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-2">
                  <GraduationCap size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No hay planes de capacitación asignados</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Cuando programes cursos o talleres vinculando a este capacitador en el Calendario o Gestión, aparecerán listados aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {trainerPlans.map((plan, pIdx) => {
                    const space = spaces.find(s => s.id === plan.spaceId);
                    return (
                      <div
                        key={`trainer_plan_${plan.id || pIdx}_${pIdx}`}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 hover:border-indigo-100 transition-colors"
                      >
                        <div className="space-y-1">
                          <h5 className="text-sm font-black text-slate-800">{plan.title}</h5>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar size={13} className="text-indigo-600" />
                              {plan.date ? new Date(plan.date).toLocaleDateString() : 'Sin fecha'}
                            </span>
                            {plan.startTime && (
                              <span className="flex items-center gap-1">
                                <Clock size={13} className="text-slate-400" />
                                {plan.startTime} {plan.endTime ? `- ${plan.endTime}` : ''}
                              </span>
                            )}
                            {space && (
                              <span className="flex items-center gap-1">
                                <MapPin size={13} className="text-slate-400" />
                                {space.name} ({space.type})
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          plan.status === 'completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          plan.status === 'cancelada' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {plan.status || 'programada'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>ID de Capacitador: <code className="font-mono text-slate-700 font-bold">{trainer.id}</code></span>
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
