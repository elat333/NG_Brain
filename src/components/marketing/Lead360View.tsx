import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Building2,
  MessageCircle,
  Sparkles,
  MapPin,
  Tag,
  Star,
  CheckCircle2,
  Clock,
  Plus,
  Check,
  ChevronRight,
  User,
  Activity,
  Layers,
  FileText
} from 'lucide-react';
import { MarketingLead, MarketingCampaign, TeamMember, Task } from '../../types';

interface Lead360ViewProps {
  lead: MarketingLead | null;
  isCreating?: boolean;
  campaigns: MarketingCampaign[];
  members: TeamMember[];
  tasks?: Task[];
  currentMember: TeamMember | null;
  onBack: () => void;
  onSave: (lead: MarketingLead) => Promise<void>;
  onDelete: (leadId: string) => Promise<void>;
  onAddStoryForLead?: (storyData: Partial<Task>) => Promise<void>;
  onOpenStory?: (story: Task) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export type Lead360Tab = 'contact' | 'qualification' | 'stories' | 'notes';

export const Lead360View: React.FC<Lead360ViewProps> = ({
  lead,
  isCreating = false,
  campaigns,
  members,
  tasks = [],
  currentMember,
  onBack,
  onSave,
  onDelete,
  onAddStoryForLead,
  onOpenStory,
  canEdit = true,
  canDelete = true
}) => {
  const [activeTab, setActiveTab] = useState<Lead360Tab>('contact');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<MarketingLead>>(() => {
    if (lead) return { ...lead };
    return {
      id: `lead-${Date.now()}`,
      name: '',
      companyName: '',
      email: '',
      phone: '+593 ',
      channel: 'meta_ads',
      stage: 'nuevo',
      estimatedValue: 3500,
      assignedMemberId: currentMember?.id || '',
      campaignId: campaigns[0]?.id || '',
      city: 'Quito',
      notes: '',
      tags: ['B2B', 'Interesado'],
      createdAt: new Date().toISOString()
    };
  });

  // Story Form State (Inside lead)
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [storyForm, setStoryForm] = useState<{
    title: string;
    description: string;
    memberId: string;
    priority: 'baja' | 'media' | 'alta' | 'meteoric_crash';
    dueDate: string;
  }>({
    title: '',
    description: '',
    memberId: currentMember?.id || '',
    priority: 'alta',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const funnelStages: { id: MarketingLead['stage']; title: string; color: string; bg: string }[] = [
    { id: 'nuevo', title: 'Nuevo', color: 'text-blue-700', bg: 'bg-blue-600' },
    { id: 'contactado', title: 'Contactado', color: 'text-indigo-700', bg: 'bg-indigo-600' },
    { id: 'calificado', title: 'Calificado', color: 'text-purple-700', bg: 'bg-purple-600' },
    { id: 'propuesta', title: 'Propuesta', color: 'text-amber-700', bg: 'bg-amber-600' },
    { id: 'negociacion', title: 'Negociación', color: 'text-orange-700', bg: 'bg-orange-600' },
    { id: 'ganado', title: 'Ganado / Cliente', color: 'text-emerald-700', bg: 'bg-emerald-600' },
    { id: 'perdido', title: 'Perdido', color: 'text-slate-500', bg: 'bg-slate-600' }
  ];

  const handleSaveMain = async () => {
    if (!formData.name?.trim()) {
      alert('Por favor ingrese el nombre del prospecto / cliente.');
      return;
    }
    setIsSaving(true);
    try {
      const finalLead: MarketingLead = {
        id: formData.id || `lead-${Date.now()}`,
        name: formData.name,
        companyName: formData.companyName || '',
        email: formData.email || '',
        phone: formData.phone || '',
        channel: formData.channel || 'meta_ads',
        stage: formData.stage || 'nuevo',
        estimatedValue: Number(formData.estimatedValue) || 0,
        assignedMemberId: formData.assignedMemberId,
        campaignId: formData.campaignId,
        city: formData.city || '',
        notes: formData.notes || '',
        tags: formData.tags || [],
        lastContactDate: formData.lastContactDate || new Date().toISOString().split('T')[0],
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(finalLead);
      onBack();
    } catch (e) {
      console.error(e);
      alert('Error al guardar el prospecto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyForm.title.trim() || !onAddStoryForLead) return;

    try {
      const storyPayload: Partial<Task> = {
        title: `[Seguimiento Lead: ${formData.name}] ${storyForm.title}`,
        description: `Prospecto: ${formData.name} (${formData.companyName})\nTel: ${formData.phone}\nEmail: ${formData.email}\n\nDetalle:\n${storyForm.description}`,
        memberId: storyForm.memberId,
        category: 'Ventas & CRM',
        priority: storyForm.priority,
        dueDate: storyForm.dueDate,
        completed: false
      };

      await onAddStoryForLead(storyPayload);
      setIsAddingStory(false);
      setStoryForm({
        title: '',
        description: '',
        memberId: currentMember?.id || '',
        priority: 'alta',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (e) {
      console.error(e);
      alert('Error al crear la historia de seguimiento');
    }
  };

  // Associated
  const linkedCampaign = campaigns.find(c => c.id === formData.campaignId);
  const assignedMember = members.find(m => m.id === formData.assignedMemberId);
  const leadStories = tasks.filter(t => t.title.includes(formData.name || '---') || (t.description && t.description.includes(formData.name || '---')));

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* TOP HEADER / BREADCRUMB */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Breadcrumb & Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                title="Volver al CRM"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">CRM Leads</span>
              </button>

              <div className="h-5 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 font-mono text-[10px] font-extrabold rounded-md uppercase border border-purple-100">
                  LEAD-360
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate max-w-xs sm:max-w-md">
                  {formData.name || (isCreating ? 'Nuevo Prospecto Comercial' : 'Ficha 360° del Prospecto')}
                </h1>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveMain}
                  disabled={isSaving}
                  className="px-5 py-2 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Prospecto'}</span>
                </button>
              )}

              {canDelete && !isCreating && lead && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Está seguro de eliminar este prospecto?')) {
                      onDelete(lead.id);
                      onBack();
                    }
                  }}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  title="Eliminar Prospecto"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* TRYTON FUNNEL STAGE SELECTOR (EMBUDO COMERCIAL) */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {funnelStages.map((st, sIdx) => {
                const isActive = formData.stage === st.id;
                return (
                  <button
                    key={`lead_st_${st.id}`}
                    type="button"
                    onClick={() => setFormData({ ...formData, stage: st.id })}
                    className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? `${st.bg} text-white shadow-xs`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{sIdx + 1}. {st.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SMART BUTTONS / STATS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
            {/* Valor de Oportunidad */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <DollarSign size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Valor Oportunidad</span>
                <span className="font-black text-slate-900">${(formData.estimatedValue || 0).toFixed(2)} USD</span>
              </div>
            </div>

            {/* Canal de Procedencia */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                <Sparkles size={16} />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Canal de Origen</span>
                <span className="font-bold text-slate-800 truncate block uppercase">{formData.channel || 'Directo'}</span>
              </div>
            </div>

            {/* Asesor Asignado */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                <User size={16} />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Asesor Asignado</span>
                <span className="font-bold text-slate-800 truncate block">{assignedMember ? assignedMember.name : 'Sin asignar'}</span>
              </div>
            </div>

            {/* Historias de Seguimiento */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Historias de Seguimiento</span>
                <span className="font-black text-slate-900">{leadStories.length} asignadas</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'contact'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={15} />
            <span>1. Contacto & Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qualification')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'qualification'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={15} />
            <span>2. Calificación & Negocio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stories')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'stories'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>3. Historias de Seguimiento ({leadStories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={15} />
            <span>4. Notas & Bitácora</span>
          </button>
        </div>
      </div>

      {/* MAIN BODY CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: CONTACTO & EMPRESA */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Users className="text-blue-600" size={20} />
              <h3 className="text-base font-black text-slate-900">Datos del Prospecto y Empresa</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-medium">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Nombre Completo del Contacto *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ing. Carlos Paredes"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Empresa / Negocio
                </label>
                <input
                  type="text"
                  placeholder="Ej: Industria Textil del Norte Cía. Ltda."
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="+593 99 123 4567"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="carlos@empresa.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Ciudad / Ubicación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Quito, Pichincha"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Campaña de Origen
                </label>
                <select
                  value={formData.campaignId || ''}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">Sin campaña específica</option>
                  {campaigns.map(c => (
                    <option key={`lead_camp_opt_${c.id}`} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Canal de Captación
                </label>
                <select
                  value={formData.channel || 'meta_ads'}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="meta_ads">Meta Ads (Facebook / Instagram)</option>
                  <option value="google_ads">Google Ads / Búsqueda</option>
                  <option value="tiktok">TikTok Ads</option>
                  <option value="linkedin">LinkedIn B2B</option>
                  <option value="organico">Orgánico / Web Novagreen</option>
                  <option value="referido">Referido Comercial</option>
                  <option value="evento">Feria / Evento BTL</option>
                  <option value="directo">Contacto Directo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Asesor Comercial Asignado
                </label>
                <select
                  value={formData.assignedMemberId || ''}
                  onChange={(e) => setFormData({ ...formData, assignedMemberId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">Seleccionar Asesor...</option>
                  {members.map(m => (
                    <option key={`lead_mem_opt_${m.id}`} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CALIFICACIÓN & NEGOCIO */}
        {activeTab === 'qualification' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <DollarSign className="text-emerald-600" size={20} />
              <h3 className="text-base font-black text-slate-900">Potencial de Venta y Oportunidad</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-medium">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Valor Estimado de Negocio ($ USD)
                </label>
                <input
                  type="number"
                  step="50"
                  value={formData.estimatedValue || 0}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-lg text-emerald-700"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Fecha de Último Contacto
                </label>
                <input
                  type="date"
                  value={formData.lastContactDate || ''}
                  onChange={(e) => setFormData({ ...formData, lastContactDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Etiquetas / Clasificadores de Oportunidad
                </label>
                <div className="flex flex-wrap gap-2">
                  {['B2B', 'B2C', 'Solar', 'EPP', 'Industrial', 'Residencial', 'Urgente', 'Decisor Clave'].map(t => {
                    const hasTag = (formData.tags || []).includes(t);
                    return (
                      <button
                        key={`lead_tag_${t}`}
                        type="button"
                        onClick={() => {
                          const curr = formData.tags || [];
                          setFormData({
                            ...formData,
                            tags: hasTag ? curr.filter(x => x !== t) : [...curr, t]
                          });
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          hasTag
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HISTORIAS DE SEGUIMIENTO */}
        {activeTab === 'stories' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="text-purple-600" size={20} />
                  <span>Historias de Seguimiento y Acciones ({leadStories.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Historias asignadas a los asesores para llamada, envío de proforma, reunión o cierre de venta con este prospecto.
                </p>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsAddingStory(!isAddingStory)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Nueva Historia</span>
                </button>
              )}
            </div>

            {/* CREATOR FORM */}
            <AnimatePresence>
              {isAddingStory && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateStorySubmit}
                  className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4 overflow-hidden"
                >
                  <div className="text-xs font-black uppercase text-purple-900 tracking-wider">
                    Asignar Historia de Seguimiento para este Lead
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Acción / Título de la Historia *</label>
                      <input
                        type="text"
                        placeholder="Ej: Llamar para coordinar visita técnica y cotización"
                        value={storyForm.title}
                        onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Asesor Responsable</label>
                      <select
                        value={storyForm.memberId}
                        onChange={(e) => setStoryForm({ ...storyForm, memberId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        {members.map(m => (
                          <option key={`story_lead_mem_${m.id}`} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Notas de la Historia</label>
                      <textarea
                        rows={2}
                        placeholder="Puntos a tratar, requerimientos del cliente..."
                        value={storyForm.description}
                        onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Fecha Límite</label>
                      <input
                        type="date"
                        value={storyForm.dueDate}
                        onChange={(e) => setStoryForm({ ...storyForm, dueDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Prioridad</label>
                      <select
                        value={storyForm.priority}
                        onChange={(e) => setStoryForm({ ...storyForm, priority: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="meteoric_crash">Crítica / Inmediata</option>
                      </select>
                    </div>

                    <div className="flex items-end justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingStory(false)}
                        className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                      >
                        Guardar Historia
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* STORIES LIST */}
            <div className="space-y-2">
              {leadStories.map((story) => {
                const assigned = members.find(m => m.id === story.memberId);
                return (
                  <div
                    key={`lead_story_row_${story.id}`}
                    onClick={() => onOpenStory && onOpenStory(story)}
                    className="p-4 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200/80 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        story.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'
                      }`}>
                        {story.completed && <Check size={12} />}
                      </div>

                      <div className="min-w-0">
                        <span className={`font-bold text-xs block truncate ${
                          story.completed ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-blue-600'
                        }`}>
                          {story.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium">
                          {assigned && <span>Asesor: {assigned.name}</span>}
                          {story.dueDate && <span>• Límite: {story.dueDate}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        story.priority === 'meteoric_crash' ? 'bg-rose-100 text-rose-800' :
                        story.priority === 'alta' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {story.priority}
                      </span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}

              {leadStories.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="mx-auto text-slate-300 mb-2" size={36} />
                  <p className="text-xs font-bold text-slate-600">No hay historias de seguimiento activas para este prospecto</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Usa el botón "+ Nueva Historia" para programar una llamada o tarea.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: NOTAS & BITÁCORA */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <FileText className="text-blue-600" size={20} />
              <h3 className="text-base font-black text-slate-900">Bitácora y Observaciones Comerciales</h3>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                Notas del Prospecto
              </label>
              <textarea
                rows={6}
                placeholder="Registra aquí los requerimientos técnicos, objeciones, fechas tentativas de compra y observaciones generales..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
