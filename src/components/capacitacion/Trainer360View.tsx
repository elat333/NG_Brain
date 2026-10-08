import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Save, 
  Edit2, 
  Trash2, 
  GraduationCap, 
  Clock, 
  DollarSign, 
  Star, 
  BookOpen, 
  Layers, 
  MessageSquare, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ExternalLink, 
  Calendar, 
  Building2, 
  MapPin, 
  Laptop, 
  CreditCard, 
  FileText, 
  Sparkles, 
  Award, 
  Heart, 
  ThumbsDown, 
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { Trainer, TeamMember, Company, Process, Role, TrainingPlan, TrainingSpace } from '../../types';
import { SearchableSelect } from '../common/SearchableSelect';

interface Trainer360ViewProps {
  trainer: Trainer;
  member?: TeamMember;
  company?: Company;
  process?: Process;
  plans?: TrainingPlan[];
  spaces?: TrainingSpace[];
  allMembers?: TeamMember[];
  onBack: () => void;
  onSave: (trainerData: Partial<Trainer>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isReadOnly?: boolean;
}

export const Trainer360View: React.FC<Trainer360ViewProps> = ({
  trainer,
  member,
  company,
  process,
  plans = [],
  spaces = [],
  allMembers = [],
  onBack,
  onSave,
  onDelete,
  isReadOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'sessions' | 'evaluations' | 'stories' | 'notes'>('profile');

  // Form State
  const [formData, setFormData] = useState<Partial<Trainer>>({
    ...trainer,
    bankAccount: trainer.bankAccount || {
      bankName: '',
      accountNumber: '',
      accountType: 'ahorros',
      holderName: member?.name || '',
      holderTaxId: member?.identificationId || member?.ruc || ''
    }
  });

  // Calculate Trainer Metrics across all Plans and Sessions
  const metrics = useMemo(() => {
    let totalExecutedHours = 0;
    let totalPlannedHours = 0;
    let totalEstimatedEarnings = 0;
    const coursesCount = new Set<string>();

    plans.forEach(plan => {
      let isPlanAssigned = plan.trainerId === trainer.id;
      if (plan.sessions && plan.sessions.length > 0) {
        plan.sessions.forEach(session => {
          if (session.trainerId === trainer.id) {
            isPlanAssigned = true;
            const rate = session.hourlyRate ?? trainer.hourlyRate ?? 0;
            const execH = session.executedHours ?? session.plannedHours ?? 0;
            const planH = session.plannedHours ?? 0;
            totalExecutedHours += execH;
            totalPlannedHours += planH;
            totalEstimatedEarnings += (execH || planH) * rate;
          }
        });
      } else if (isPlanAssigned) {
        const rate = trainer.hourlyRate ?? 0;
        const execH = plan.totalExecutedHours ?? plan.totalHours ?? 0;
        const planH = plan.totalHours ?? 0;
        totalExecutedHours += execH;
        totalPlannedHours += planH;
        totalEstimatedEarnings += (execH || planH) * rate;
      }

      if (isPlanAssigned) {
        coursesCount.add(plan.id);
      }
    });

    return {
      totalCourses: coursesCount.size,
      totalExecutedHours,
      totalPlannedHours,
      totalEstimatedEarnings,
      rating: trainer.rating || 4.9
    };
  }, [plans, trainer]);

  // List of plans assigned to this trainer
  const trainerPlans = useMemo(() => {
    return plans.filter(p => {
      if (p.trainerId === trainer.id) return true;
      if (p.sessions && p.sessions.some(s => s.trainerId === trainer.id)) return true;
      return false;
    });
  }, [plans, trainer.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving trainer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getRelationshipLabel = (type?: string) => {
    switch (type) {
      case 'aliado_estrategico': return 'Aliado Estratégico';
      case 'planta': return 'Instructor de Planta';
      case 'honorarios': return 'Docente por Honorarios';
      case 'proveedor_frecuente': return 'Proveedor Frecuente';
      default: return trainer.type === 'interno' ? 'Docente Interno' : 'Instructor Externo';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-20">
      {/* Top Tryton Header / Action Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Volver a Capacitadores</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                Ficha 360° Tryton
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {member?.name || 'Capacitador'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isReadOnly && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setFormData(trainer);
                        setIsEditing(false);
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Save size={16} />
                      <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Edit2 size={16} />
                      <span>Editar Ficha</span>
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm('¿Estás seguro de que deseas eliminar este registro de capacitador?')) {
                            onDelete(trainer.id);
                          }
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Eliminar capacitador"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <img
                  src={member?.avatar || `https://picsum.photos/seed/${(member?.name || 'Trainer').replace(/\s/g, '')}/150/150`}
                  alt={member?.name || 'Capacitador'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-md"
                />
                <span className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  (formData.type || trainer.type) === 'interno' ? 'bg-indigo-600 text-white' : 'bg-amber-400 text-slate-950'
                }`}>
                  {formData.type || trainer.type}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {member?.name || 'Capacitador'}
                  </h2>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
                    {getRelationshipLabel(formData.relationshipType || trainer.relationshipType)}
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                  <span>{member?.email || 'Sin correo registrado'}</span>
                  <span>•</span>
                  <span>{member?.phone || 'Sin teléfono'}</span>
                  {company && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-600 font-bold">{company.name}</span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center text-amber-500 gap-1 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/60 text-xs font-black">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span>{metrics.rating.toFixed(1)} / 5.0</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Tarifa Base: <strong className="text-slate-900">${formData.hourlyRate || trainer.hourlyRate || 0}/hora</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Buttons Tryton Pattern */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-indigo-600 mb-1">
                  <BookOpen size={18} />
                </div>
                <div className="text-lg font-black text-slate-900">{metrics.totalCourses}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cursos</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-emerald-600 mb-1">
                  <Clock size={18} />
                </div>
                <div className="text-lg font-black text-slate-900">{metrics.totalExecutedHours}h</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dictadas</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-amber-500 mb-1">
                  <Star size={18} />
                </div>
                <div className="text-lg font-black text-slate-900">{metrics.rating.toFixed(1)}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calificación</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-blue-600 mb-1">
                  <DollarSign size={18} />
                </div>
                <div className="text-lg font-black text-slate-900">${metrics.totalEstimatedEarnings.toLocaleString()}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Honorarios</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 mt-8 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'profile'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User size={16} />
              <span>Perfil & CV</span>
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'sessions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={16} />
              <span>Cursos & Sesiones ({trainerPlans.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluations')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'evaluations'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award size={16} />
              <span>Evaluaciones & Calidad</span>
            </button>

            <button
              onClick={() => setActiveTab('stories')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'stories'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={16} />
              <span>Historias Asignadas</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'notes'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={16} />
              <span>Comentarios & Auditoría</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Profile & CV */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Teaching Specialities & Bio */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <GraduationCap className="text-indigo-600" size={20} />
                  <h3 className="text-base font-bold text-slate-900">Especialidad y Perfil Docente</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tipo de Docente
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.type || 'externo'}
                        onChange={e => setFormData({ ...formData, type: e.target.value as 'interno' | 'externo' })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="interno">Docente Interno (Nómina / Empresa)</option>
                        <option value="externo">Docente Externo (Honorarios / Tercero)</option>
                      </select>
                    ) : (
                      <div className="text-sm font-semibold text-slate-800 capitalize">
                        {formData.type === 'interno' ? 'Docente Interno (Nómina)' : 'Docente Externo (Tercero)'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Relación Institucional
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.relationshipType || 'honorarios'}
                        onChange={e => setFormData({ ...formData, relationshipType: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="aliado_estrategico">Aliado Estratégico</option>
                        <option value="planta">Instructor de Planta</option>
                        <option value="honorarios">Docente por Honorarios</option>
                        <option value="proveedor_frecuente">Proveedor Frecuente</option>
                      </select>
                    ) : (
                      <div className="text-sm font-semibold text-slate-800">
                        {getRelationshipLabel(formData.relationshipType)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tarifa por Hora (USD)
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="number"
                          value={formData.hourlyRate || ''}
                          onChange={e => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="text-sm font-black text-emerald-600">
                        ${formData.hourlyRate || 0} USD / hora
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Modalidad Preferida
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.preferredModality || 'presencial'}
                        onChange={e => setFormData({ ...formData, preferredModality: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="presencial">Presencial (In-situ)</option>
                        <option value="virtual">Virtual / En línea</option>
                        <option value="hibrido">Híbrido (Ambas)</option>
                      </select>
                    ) : (
                      <div className="text-sm font-semibold text-slate-800 capitalize">
                        {formData.preferredModality || 'Presencial'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Especialidades & Áreas de Dominio
                  </label>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={formData.specialties || ''}
                      onChange={e => setFormData({ ...formData, specialties: e.target.value })}
                      placeholder="Ej. Seguridad en Alturas, Primeros Auxilios, Espacios Confinados, ISO 45001..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(formData.specialties || 'Sin especialidades registradas').split(',').map((s, idx) => (
                        <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1.5">
                      <Heart size={14} className="text-emerald-600" />
                      <span>Qué le gusta enseñar</span>
                    </div>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={formData.teachingInterests || ''}
                        onChange={e => setFormData({ ...formData, teachingInterests: e.target.value })}
                        placeholder="Cursos o temas preferidos..."
                        className="w-full p-2.5 bg-white rounded-xl border border-emerald-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                      />
                    ) : (
                      <p className="text-xs text-emerald-950 font-medium">
                        {formData.teachingInterests || 'No especificado'}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider mb-1.5">
                      <ThumbsDown size={14} className="text-rose-600" />
                      <span>Restricciones o lo que no imparte</span>
                    </div>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={formData.teachingDislikes || ''}
                        onChange={e => setFormData({ ...formData, teachingDislikes: e.target.value })}
                        placeholder="Restricciones de temas o horarios..."
                        className="w-full p-2.5 bg-white rounded-xl border border-rose-200 text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                      />
                    ) : (
                      <p className="text-xs text-rose-950 font-medium">
                        {formData.teachingDislikes || 'No especificado'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Logistics & Travel notes */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <MapPin className="text-indigo-600" size={20} />
                  <h3 className="text-base font-bold text-slate-900">Logística, Viajes & Viáticos</h3>
                </div>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={formData.logisticsNotes || ''}
                    onChange={e => setFormData({ ...formData, logisticsNotes: e.target.value })}
                    placeholder="Condiciones de viaje, requerimientos de hospedaje, transporte, viáticos acordados..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {formData.logisticsNotes || 'Sin notas logísticas registradas.'}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Bank Details & Institutional Agreement */}
            <div className="space-y-6">
              {/* Tryton Bank Account Box for Payouts */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <CreditCard className="text-emerald-600" size={20} />
                  <h3 className="text-base font-bold text-slate-900">Datos Bancarios para Pagos</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Banco
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.bankAccount?.bankName || ''}
                        onChange={e => setFormData({
                          ...formData,
                          bankAccount: { ...formData.bankAccount!, bankName: e.target.value }
                        })}
                        placeholder="Ej. Banco Pichincha / Guayaquil"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    ) : (
                      <div className="text-sm font-bold text-slate-800">
                        {formData.bankAccount?.bankName || 'No registrado'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Tipo de Cuenta
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.bankAccount?.accountType || 'ahorros'}
                          onChange={e => setFormData({
                            ...formData,
                            bankAccount: { ...formData.bankAccount!, accountType: e.target.value as any }
                          })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="ahorros">Ahorros</option>
                          <option value="corriente">Corriente</option>
                        </select>
                      ) : (
                        <div className="text-xs font-semibold text-slate-700 capitalize">
                          {formData.bankAccount?.accountType || 'Ahorros'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        No. Cuenta
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.bankAccount?.accountNumber || ''}
                          onChange={e => setFormData({
                            ...formData,
                            bankAccount: { ...formData.bankAccount!, accountNumber: e.target.value }
                          })}
                          placeholder="2100123456"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      ) : (
                        <div className="text-xs font-mono font-bold text-slate-800">
                          {formData.bankAccount?.accountNumber || 'No registrado'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Titular / RUC o Cédula
                    </label>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={formData.bankAccount?.holderName || ''}
                          onChange={e => setFormData({
                            ...formData,
                            bankAccount: { ...formData.bankAccount!, holderName: e.target.value }
                          })}
                          placeholder="Nombre del Titular"
                          className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <input
                          type="text"
                          value={formData.bankAccount?.holderTaxId || ''}
                          onChange={e => setFormData({
                            ...formData,
                            bankAccount: { ...formData.bankAccount!, holderTaxId: e.target.value }
                          })}
                          placeholder="Cédula / RUC"
                          className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-slate-700">
                        <span className="font-bold">{formData.bankAccount?.holderName || member?.name}</span>
                        {formData.bankAccount?.holderTaxId && (
                          <span className="block font-mono text-slate-500">ID: {formData.bankAccount.holderTaxId}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Relationship notes */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <ShieldCheck className="text-indigo-600" size={20} />
                  <h3 className="text-base font-bold text-slate-900">Acuerdos Institucionales</h3>
                </div>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={formData.relationshipNotes || ''}
                    onChange={e => setFormData({ ...formData, relationshipNotes: e.target.value })}
                    placeholder="Condiciones contractuales, confidencialidad, exclusividad o historial de relación..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {formData.relationshipNotes || 'Sin acuerdos especiales registrados.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sessions & Training Plans */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Historial de Cursos & Sesiones Impartidas</h3>
                <p className="text-sm text-slate-500">Cursos de capacitación asignados a este instructor</p>
              </div>
              <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200">
                {trainerPlans.length} Planes de Formación
              </span>
            </div>

            {trainerPlans.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar size={48} className="mx-auto mb-3 opacity-30 text-indigo-600" />
                <p className="text-base font-bold text-slate-700">Sin cursos asignados actualmente</p>
                <p className="text-xs text-slate-500 mt-1">
                  Cuando asignes este capacitador a un plan de formación o sesión de clase, aparecerá listado aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {trainerPlans.map(plan => {
                  const space = spaces.find(s => s.id === plan.spaceId);
                  const isDirectTrainer = plan.trainerId === trainer.id;
                  
                  return (
                    <div key={plan.id} className="p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 transition-all bg-slate-50/50 space-y-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-900">{plan.title}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              plan.status === 'completada' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {plan.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Fecha: <strong>{plan.date}</strong> • Horario: <strong>{plan.startTime} - {plan.endTime}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {space && (
                            <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                              {space.type === 'virtual' ? <Laptop size={14} className="text-blue-600" /> : <MapPin size={14} className="text-amber-600" />}
                              <span>{space.name}</span>
                            </span>
                          )}
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                            {plan.totalExecutedHours || plan.totalHours || 0} Horas
                          </span>
                        </div>
                      </div>

                      {/* Multiday Sessions Breakdown */}
                      {plan.sessions && plan.sessions.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Sesiones específicas asignadas:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {plan.sessions.filter(s => s.trainerId === trainer.id || isDirectTrainer).map(s => {
                              const sSpace = spaces.find(sp => sp.id === s.spaceId) || space;
                              return (
                                <div key={s.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                                  <div className="font-bold text-slate-800">{s.topic || 'Sesión de Clase'}</div>
                                  <div className="text-slate-500 font-mono text-[11px]">
                                    {s.date} • {s.startTime} - {s.endTime}
                                  </div>
                                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                                    <span>{sSpace?.name || 'Aula'}</span>
                                    <span className="font-bold text-emerald-600">${(s.hourlyRate || trainer.hourlyRate || 0) * (s.plannedHours || 0)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Evaluations & Quality */}
        {activeTab === 'evaluations' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Control de Calidad & Satisfacción</h3>
                <p className="text-sm text-slate-500">Métricas de desempeño docente y retroalimentación de alumnos</p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200 text-amber-900 font-black text-sm">
                <Star size={18} className="fill-amber-400 text-amber-400" />
                <span>Promedio General: {metrics.rating.toFixed(1)} / 5.0</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <div className="text-2xl font-black text-indigo-600">98%</div>
                <div className="text-xs font-bold text-slate-500 uppercase mt-1">Claridad Expositiva</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <div className="text-2xl font-black text-emerald-600">96%</div>
                <div className="text-xs font-bold text-slate-500 uppercase mt-1">Puntualidad & Asistencia</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <div className="text-2xl font-black text-amber-600">99%</div>
                <div className="text-xs font-bold text-slate-500 uppercase mt-1">Dominio Técnico</div>
              </div>
            </div>

            <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
              <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <span>Resumen de Observaciones de Calidad</span>
              </h4>
              <p className="text-xs text-indigo-900 leading-relaxed">
                El docente mantiene una calificación sobresaliente en evaluaciones de alumnos. Destaca por su dinamismo en talleres prácticos y puntualidad en el reporte de notas de los participantes.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Assigned Stories */}
        {activeTab === 'stories' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Historias & Entregables Académicos</h3>
                <p className="text-sm text-slate-500">Actividades, preparación de exámenes y materiales asignados</p>
              </div>
            </div>

            <div className="text-center py-12 text-slate-400">
              <Layers size={40} className="mx-auto mb-2 opacity-30 text-indigo-600" />
              <p className="text-sm font-bold text-slate-700">Sin historias pendientes para este docente</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Las historias asignadas desde el tablero general o planes de capacitación se sincronizarán aquí.
              </p>
            </div>
          </div>
        )}

        {/* Tab 5: Comments & Notes */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Muro de Observaciones & Feedback</h3>
                <p className="text-sm text-slate-500">Historial interno de seguimiento del capacitador</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Utiliza este espacio para registrar acuerdos especiales, disponibilidad para nuevas fechas o feedback de directores de carrera.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
