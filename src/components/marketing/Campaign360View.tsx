import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone,
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  DollarSign,
  Target,
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit,
  TrendingUp,
  Tag,
  Palette,
  PenTool,
  Video,
  Share2,
  BarChart2,
  Building2,
  ExternalLink,
  Layers,
  MapPin,
  AlertTriangle,
  MessageSquare,
  Plus,
  Check,
  ChevronRight,
  User,
  Activity
} from 'lucide-react';
import { MarketingCampaign, Task, Project, TeamMember, Process, MarketingLead } from '../../types';
import { UniversalCommentsThread } from '../common/UniversalCommentsThread';
import { SearchableSelect } from '../common/SearchableSelect';

interface Campaign360ViewProps {
  campaign: MarketingCampaign | null;
  isCreating?: boolean;
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  processes: Process[];
  leads?: MarketingLead[];
  currentMember: TeamMember | null;
  onBack: () => void;
  onSave: (campaign: MarketingCampaign, createLinkedProject: boolean) => Promise<void>;
  onDelete: (campaignId: string) => Promise<void>;
  onAddStoryForCampaign: (storyData: Partial<Task>) => Promise<void>;
  onOpenStory?: (story: Task) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export type Campaign360Tab = 'general' | 'finances' | 'stories' | 'leads' | 'comments';

export const Campaign360View: React.FC<Campaign360ViewProps> = ({
  campaign,
  isCreating = false,
  projects,
  tasks,
  members,
  processes,
  leads = [],
  currentMember,
  onBack,
  onSave,
  onDelete,
  onAddStoryForCampaign,
  onOpenStory,
  canEdit = true,
  canDelete = true
}) => {
  const [activeTab, setActiveTab] = useState<Campaign360Tab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [createLinkedProject, setCreateLinkedProject] = useState(true);

  // Form state
  const [formData, setFormData] = useState<Partial<MarketingCampaign>>(() => {
    if (campaign) return { ...campaign };
    return {
      id: `camp-${Date.now()}`,
      code: `CAMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      description: '',
      objective: 'leads',
      status: 'planificacion',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      budget: 1200,
      spent: 0,
      targetAudience: '',
      channels: ['Meta Ads (FB/IG)'],
      city: 'Nacional / Ecuador',
      leaderMemberId: currentMember?.id || '',
      notes: '',
      createdAt: new Date().toISOString()
    };
  });

  // Story Form State (Inside campaign)
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [storyForm, setStoryForm] = useState<{
    title: string;
    description: string;
    memberId: string;
    category: string;
    storyTemplate: 'standard' | 'design_post' | 'design_carousel' | 'design_video';
    priority: 'baja' | 'media' | 'alta' | 'meteoric_crash';
    dueDate: string;
  }>({
    title: '',
    description: '',
    memberId: currentMember?.id || '',
    category: 'Creativos & Pauta',
    storyTemplate: 'standard',
    priority: 'media',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const availableChannels = [
    'Meta Ads (FB/IG)',
    'Google Ads',
    'TikTok Ads',
    'Email Marketing',
    'Eventos / BTL',
    'LinkedIn Ads',
    'Orgánico / Redes',
    'Radio / Prensa',
    'Venta Directa'
  ];

  const handleToggleChannel = (chan: string) => {
    const current = formData.channels || [];
    if (current.includes(chan)) {
      setFormData({ ...formData, channels: current.filter(c => c !== chan) });
    } else {
      setFormData({ ...formData, channels: [...current, chan] });
    }
  };

  const handleApplyStoryTemplate = (tpl: 'standard' | 'design_post' | 'design_carousel' | 'design_video') => {
    let t = '';
    let d = '';
    if (tpl === 'design_post') {
      t = `Diseño de Post: ${formData.name || 'Campaña'}`;
      d = `## 🎨 Requerimiento de Diseño\n- Formato: 1080x1080 / 1080x1350\n- Mensaje clave: \n- Call to Action: \n- Elementos gráficos requeridos: Logo, colores de marca, producto destacado.`;
    } else if (tpl === 'design_carousel') {
      t = `Carrusel Educativo: ${formData.name || 'Campaña'}`;
      d = `## 📱 Estructura del Carrusel\n- Diapositiva 1 (Gancho): \n- Diapositiva 2 (Problema): \n- Diapositiva 3 (Solución): \n- Diapositiva 4 (Beneficios): \n- Diapositiva 5 (CTA / Cierre): `;
    } else if (tpl === 'design_video') {
      t = `Edición de Video / Reel: ${formData.name || 'Campaña'}`;
      d = `## 🎬 Guion y Edición de Video\n- Formato: 9:16 (Reels / TikTok)\n- Gancho primeros 3 segundos: \n- Música / Voz en off: \n- Subtítulos dinámicos: Sí\n- CTA final: `;
    }
    setStoryForm(prev => ({
      ...prev,
      storyTemplate: tpl,
      title: t || prev.title,
      description: d || prev.description
    }));
  };

  const handleSaveMain = async () => {
    if (!formData.name?.trim()) {
      alert('Por favor ingrese el nombre de la campaña.');
      return;
    }
    setIsSaving(true);
    try {
      const finalCampaign: MarketingCampaign = {
        id: formData.id || `camp-${Date.now()}`,
        code: formData.code || `CAMP-${Date.now()}`,
        name: formData.name,
        description: formData.description || '',
        objective: formData.objective || 'leads',
        status: formData.status || 'planificacion',
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date().toISOString().split('T')[0],
        budget: Number(formData.budget) || 0,
        spent: Number(formData.spent) || 0,
        targetAudience: formData.targetAudience || '',
        channels: formData.channels || [],
        city: formData.city || '',
        leaderMemberId: formData.leaderMemberId || '',
        projectId: formData.projectId || '',
        processId: formData.processId || '',
        notes: formData.notes || '',
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(finalCampaign, isCreating ? createLinkedProject : false);
      onBack();
    } catch (e) {
      console.error(e);
      alert('Error al guardar la campaña');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyForm.title.trim()) return;

    try {
      const storyPayload: Partial<Task> = {
        title: storyForm.title,
        description: storyForm.description,
        memberId: storyForm.memberId,
        category: storyForm.category,
        priority: storyForm.priority,
        dueDate: storyForm.dueDate,
        projectId: formData.projectId || '',
        processId: formData.processId || '',
        completed: false
      };

      await onAddStoryForCampaign(storyPayload);
      setIsAddingStory(false);
      setStoryForm({
        title: '',
        description: '',
        memberId: currentMember?.id || '',
        category: 'Creativos & Pauta',
        storyTemplate: 'standard',
        priority: 'media',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (e) {
      console.error(e);
      alert('Error al crear la historia');
    }
  };

  // Associated calculations
  const linkedProject = projects.find(p => p.id === formData.projectId);
  const campaignStories = tasks.filter(t => t.projectId && t.projectId === formData.projectId);
  const campaignLeads = leads.filter(l => l.campaignId === formData.id);
  const totalBudget = Number(formData.budget) || 0;
  const totalSpent = Number(formData.spent) || 0;
  const budgetUtilization = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const completedStoriesCount = campaignStories.filter(s => s.completed).length;

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
                title="Volver a Campañas"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Campañas</span>
              </button>

              <div className="h-5 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-extrabold rounded-md uppercase border border-blue-100">
                  {formData.code || 'CAMP-NUEVA'}
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate max-w-xs sm:max-w-md">
                  {formData.name || (isCreating ? 'Nueva Campaña de Marketing' : 'Ficha 360° de Campaña')}
                </h1>
              </div>
            </div>

            {/* State Selector & Actions */}
            <div className="flex items-center gap-2.5">
              {/* Tryton State Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                {(['planificacion', 'activa', 'en_pausa', 'completada', 'cancelada'] as MarketingCampaign['status'][]).map(st => (
                  <button
                    key={`camp_st_${st}`}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: st })}
                    className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                      formData.status === st
                        ? st === 'activa'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : st === 'planificacion'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : st === 'completada'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'planificacion' ? 'Plan' : st === 'en_pausa' ? 'Pausa' : st}
                  </button>
                ))}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveMain}
                  disabled={isSaving}
                  className="px-5 py-2 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Ficha'}</span>
                </button>
              )}

              {canDelete && !isCreating && campaign && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Está seguro de eliminar esta campaña de marketing?')) {
                      onDelete(campaign.id);
                      onBack();
                    }
                  }}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  title="Eliminar Campaña"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* SMART BUTTONS / STATS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
            {/* Presupuesto */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <DollarSign size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Presupuesto / Gasto</span>
                <span className="font-black text-slate-900">${totalSpent.toFixed(0)} / ${totalBudget.toFixed(0)}</span>
                <span className="text-[10px] font-bold text-slate-500 ml-1">({budgetUtilization}%)</span>
              </div>
            </div>

            {/* Leads Captados */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                <Target size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Leads Captados</span>
                <span className="font-black text-slate-900">{campaignLeads.length} prospectos</span>
              </div>
            </div>

            {/* Historias Vinculadas */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                <FolderKanban size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Historias (Entregables)</span>
                <span className="font-black text-slate-900">{completedStoriesCount} / {campaignStories.length} completadas</span>
              </div>
            </div>

            {/* Proyecto Vinculado */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                <Layers size={16} />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Proyecto Vinculado</span>
                <span className="font-bold text-slate-800 truncate block">
                  {linkedProject ? linkedProject.name : 'Sin proyecto vinculado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Megaphone size={15} />
            <span>1. Estrategia & Objetivos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finances')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'finances'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={15} />
            <span>2. Presupuesto & Finanzas</span>
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
            <span>3. Historias & Entregables ({campaignStories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'leads'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={15} />
            <span>4. Leads Captados ({campaignLeads.length})</span>
          </button>

          {!isCreating && (
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'comments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={15} />
              <span>5. Comentarios & Notas</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN BODY CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: ESTRATEGIA & OBJETIVOS */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Megaphone className="text-blue-600" size={20} />
              <h3 className="text-base font-black text-slate-900">Estrategia, Alcance y Canales de Campaña</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Código Nomenclatura
                </label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Nombre de la Campaña *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Lanzamiento Paneles Solares 500W Q3 2026"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Descripción y Justificación Estratégica
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla el enfoque, oferta principal y propuesta de valor..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Objetivo Principal
                </label>
                <select
                  value={formData.objective || 'leads'}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="leads">Captación de Leads / Prospectos B2B</option>
                  <option value="ventas">Conversión y Ventas Directas</option>
                  <option value="branding">Reconocimiento de Marca / Branding</option>
                  <option value="engagement">Interacción y Comunidad</option>
                  <option value="evento">Convocatoria a Evento / Webinar</option>
                  <option value="otro">Otro Objetivo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Fecha de Finalización
                </label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Líder / Responsable
                </label>
                <select
                  value={formData.leaderMemberId || ''}
                  onChange={(e) => setFormData({ ...formData, leaderMemberId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">Seleccionar Responsable...</option>
                  {members.map(m => (
                    <option key={`camp_leader_opt_${m.id}`} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Ubicación / Cobertura
                </label>
                <input
                  type="text"
                  placeholder="Ej: Quito, Guayaquil, Nacional"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  Público Objetivo / Buyer Persona
                </label>
                <input
                  type="text"
                  placeholder="Ej: Empresas industriales, instaladores solares"
                  value={formData.targetAudience || ''}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>
            </div>

            {/* CANALES SELECCIONABLES */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">
                Canales de Difusión y Pauta Publicitaria
              </label>
              <div className="flex flex-wrap gap-2">
                {availableChannels.map(chan => {
                  const isSelected = (formData.channels || []).includes(chan);
                  return (
                    <button
                      key={`chan_btn_${chan}`}
                      type="button"
                      onClick={() => handleToggleChannel(chan)}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? <Check size={13} /> : <Plus size={13} />}
                      <span>{chan}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CREACIÓN DE PROYECTO VINCULADO (TRYTON INTEGRATION) */}
            {isCreating && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-xs">Sincronización Automática con Proyectos</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Crear automáticamente un Proyecto en el ERP vinculado para alojar las Historias de entrega de esta campaña.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={createLinkedProject}
                  onChange={(e) => setCreateLinkedProject(e.target.checked)}
                  className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRESUPUESTO & FINANZAS */}
        {activeTab === 'finances' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <DollarSign className="text-emerald-600" size={20} />
              <h3 className="text-base font-black text-slate-900">Liquidación y Control Presupuestario</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-medium">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Presupuesto Asignado ($ USD)
                </label>
                <input
                  type="number"
                  step="10"
                  value={formData.budget || 0}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-lg text-slate-900"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Gasto Real Ejecutado ($ USD)
                </label>
                <input
                  type="number"
                  step="10"
                  value={formData.spent || 0}
                  onChange={(e) => setFormData({ ...formData, spent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-lg text-emerald-700"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Saldo Restante Disponible
                </label>
                <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-lg text-slate-900">
                  ${Math.max(0, totalBudget - totalSpent).toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-black">
                <span className="text-slate-600">Porcentaje de Ejecución Presupuestaria</span>
                <span className={budgetUtilization > 90 ? 'text-rose-600' : 'text-slate-900'}>
                  {budgetUtilization}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    budgetUtilization > 100
                      ? 'bg-rose-600'
                      : budgetUtilization > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HISTORIAS & ENTREGABLES */}
        {activeTab === 'stories' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="text-purple-600" size={20} />
                  <span>Historias de Trabajo y Entregables ({campaignStories.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Historias y actividades de diseño, pauta publicitaria y redacción asignadas al equipo para esta campaña.
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

            {/* CREATOR FORM FOR NEW STORY */}
            <AnimatePresence>
              {isAddingStory && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateStorySubmit}
                  className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                      Crear Nueva Historia para esta Campaña
                    </span>
                    {/* Plantillas Rápidas */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">Plantilla:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyStoryTemplate('design_post')}
                        className="px-2 py-1 bg-white border border-purple-200 rounded-lg text-[10px] font-bold text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                      >
                        <Palette size={11} /> Post
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyStoryTemplate('design_carousel')}
                        className="px-2 py-1 bg-white border border-purple-200 rounded-lg text-[10px] font-bold text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                      >
                        <Layers size={11} /> Carrusel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyStoryTemplate('design_video')}
                        className="px-2 py-1 bg-white border border-purple-200 rounded-lg text-[10px] font-bold text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                      >
                        <Video size={11} /> Video
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Título de la Historia *</label>
                      <input
                        type="text"
                        placeholder="Ej: Crear reel comparativo de paneles solares"
                        value={storyForm.title}
                        onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Responsable</label>
                      <select
                        value={storyForm.memberId}
                        onChange={(e) => setStoryForm({ ...storyForm, memberId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        {members.map(m => (
                          <option key={`story_mem_${m.id}`} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Detalles / Requerimiento de la Historia</label>
                      <textarea
                        rows={3}
                        value={storyForm.description}
                        onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
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
                        <option value="meteoric_crash">Crítica / Urgente</option>
                      </select>
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
              {campaignStories.map((story) => {
                const assigned = members.find(m => m.id === story.memberId);
                return (
                  <div
                    key={`story_row_${story.id}`}
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
                          {assigned && <span>Resp: {assigned.name}</span>}
                          {story.dueDate && <span>• Entrega: {story.dueDate}</span>}
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

              {campaignStories.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FolderKanban className="mx-auto text-slate-300 mb-2" size={36} />
                  <p className="text-xs font-bold text-slate-600">No hay historias registradas en esta campaña</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Usa el botón "+ Nueva Historia" para agregar entregables.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LEADS CAPTADOS */}
        {activeTab === 'leads' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Users className="text-blue-600" size={20} />
              <h3 className="text-base font-black text-slate-900">Prospectos y Clientes Captados ({campaignLeads.length})</h3>
            </div>

            <div className="space-y-3">
              {campaignLeads.map(lead => (
                <div
                  key={`lead_camp_row_${lead.id}`}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition-all flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">{lead.name}</h4>
                    <p className="text-[11px] text-slate-500">{lead.companyName || 'Empresa particular'} • {lead.phone} • {lead.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900 text-xs">${lead.estimatedValue.toFixed(2)} USD</span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">
                      {lead.stage}
                    </span>
                  </div>
                </div>
              ))}

              {campaignLeads.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Target className="mx-auto text-slate-300 mb-2" size={36} />
                  <p className="text-xs font-bold text-slate-600">No hay prospectos atribuidos a esta campaña aún</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: COMENTARIOS & NOTAS */}
        {activeTab === 'comments' && campaign && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <UniversalCommentsThread
              targetType="marketing_campaign"
              targetId={campaign.id}
              currentMember={currentMember}
              members={members}
              title={`Notas y Comentarios: ${campaign.name}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
