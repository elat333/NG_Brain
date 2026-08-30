import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  DollarSign,
  Building2,
  Calendar,
  MessageCircle,
  Edit,
  Trash,
  X,
  CheckCircle2,
  TrendingUp,
  Filter,
  ArrowRight,
  Sparkles,
  ExternalLink,
  MapPin,
  Tag
} from 'lucide-react';
import { MarketingLead, MarketingCampaign, TeamMember } from '../../types';

interface LeadsCrmViewProps {
  leads: MarketingLead[];
  campaigns: MarketingCampaign[];
  members: TeamMember[];
  currentMember: TeamMember | null;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  onSaveLead: (lead: MarketingLead) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onUpdateLeadStage: (leadId: string, stage: MarketingLead['stage']) => Promise<void>;
}

export const LeadsCrmView: React.FC<LeadsCrmViewProps> = ({
  leads,
  campaigns,
  members,
  currentMember,
  accessLevel,
  onSaveLead,
  onDeleteLead,
  onUpdateLeadStage
}) => {
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<MarketingLead>>({});

  const isReadOnly = accessLevel === 'lector';

  const stages: { id: MarketingLead['stage']; title: string; color: string; bg: string }[] = [
    { id: 'nuevo', title: 'Nuevo Prospecto', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { id: 'contactado', title: 'Contactado', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    { id: 'calificado', title: 'Calificado', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    { id: 'propuesta', title: 'Propuesta Enviada', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { id: 'negociacion', title: 'En Negociación', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    { id: 'ganado', title: 'Ganado / Cliente', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { id: 'perdido', title: 'Perdido', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' }
  ];

  const handleOpenCreate = (prefillStage?: MarketingLead['stage']) => {
    setEditingLead({
      id: `lead-${Date.now()}`,
      name: '',
      companyName: '',
      email: '',
      phone: '+593 ',
      channel: 'meta_ads',
      stage: prefillStage || 'nuevo',
      estimatedValue: 3500,
      assignedMemberId: currentMember?.id || '',
      campaignId: campaigns[0]?.id || '',
      city: 'Quito',
      notes: '',
      tags: ['B2B']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lead: MarketingLead) => {
    setEditingLead({ ...lead });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead.name) return;

    const finalLead: MarketingLead = {
      id: editingLead.id || `lead-${Date.now()}`,
      name: editingLead.name,
      companyName: editingLead.companyName || '',
      email: editingLead.email || '',
      phone: editingLead.phone || '',
      channel: editingLead.channel || 'meta_ads',
      stage: editingLead.stage || 'nuevo',
      estimatedValue: Number(editingLead.estimatedValue) || 0,
      assignedMemberId: editingLead.assignedMemberId,
      campaignId: editingLead.campaignId,
      city: editingLead.city || '',
      notes: editingLead.notes || '',
      tags: editingLead.tags || [],
      lastContactDate: editingLead.lastContactDate || new Date().toISOString().split('T')[0],
      createdAt: editingLead.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSaveLead(finalLead);
    setIsModalOpen(false);
  };

  // Pipeline metrics
  const totalLeadsCount = leads.length;
  const activePipelineValue = leads
    .filter(l => l.stage !== 'perdido' && l.stage !== 'ganado')
    .reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
  const wonLeads = leads.filter(l => l.stage === 'ganado');
  const wonRevenue = wonLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
  const conversionRate = totalLeadsCount > 0 ? Math.round((wonLeads.length / totalLeadsCount) * 100) : 0;

  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || '').includes(search);
    const matchesCampaign = campaignFilter === 'todos' || l.campaignId === campaignFilter;
    return matchesSearch && matchesCampaign;
  });

  return (
    <div className="space-y-6">
      {/* Pipeline KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Prospectos</span>
            <h3 className="text-xl font-black text-slate-900">{totalLeadsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pipeline Activo</span>
            <h3 className="text-xl font-black text-slate-900">${activePipelineValue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ventas Ganadas</span>
            <h3 className="text-xl font-black text-emerald-600">${wonRevenue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tasa de Cierre</span>
            <h3 className="text-xl font-black text-purple-700">{conversionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-slate-900">Embudo de Ventas & Oportunidades (CRM)</h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filteredLeads.length} registros
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar prospecto, empresa, fono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-ng-lime focus:outline-none w-56"
            />
          </div>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime"
          >
            <option value="todos">Todas las Campañas</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>

          {!isReadOnly && (
            <button
              onClick={() => handleOpenCreate()}
              className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
            >
              <Plus size={16} />
              Nuevo Prospecto
            </button>
          )}
        </div>
      </div>

      {/* KANBAN CRM BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
          const stageTotal = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

          return (
            <div
              key={stage.id}
              className="bg-slate-50/75 rounded-3xl p-3 border border-slate-200/70 flex flex-col min-w-[240px] max-h-[750px]"
            >
              {/* Stage Column Header */}
              <div className="flex items-center justify-between p-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className={`text-xs font-black uppercase tracking-wider ${stage.color}`}>
                      {stage.title}
                    </h4>
                    <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-600">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                    ${stageTotal.toLocaleString()}
                  </span>
                </div>

                {!isReadOnly && (
                  <button
                    onClick={() => handleOpenCreate(stage.id)}
                    className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                    title={`Añadir a ${stage.title}`}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {/* Leads Cards Container */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {stageLeads.map((lead) => {
                  const campaign = campaigns.find(c => c.id === lead.campaignId);
                  const assigned = members.find(m => m.id === lead.assignedMemberId);
                  const cleanPhone = (lead.phone || '').replace(/\D/g, '');

                  return (
                    <div
                      key={lead.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all space-y-2.5 text-left"
                    >
                      {/* Lead Name & Value */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-black text-slate-900 leading-tight">{lead.name}</h5>
                          {lead.companyName && (
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 size={11} className="text-slate-400" />
                              {lead.companyName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                          ${(lead.estimatedValue || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Campaign Attribution */}
                      {campaign && (
                        <div className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50/75 px-2 py-0.5 rounded truncate">
                          {campaign.code}
                        </div>
                      )}

                      {/* Notes snippet */}
                      {lead.notes && (
                        <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                          {lead.notes}
                        </p>
                      )}

                      {/* Action buttons: WhatsApp & Call */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 font-bold text-[10px]"
                              title="Chat en WhatsApp"
                            >
                              <MessageCircle size={12} />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                              title={lead.email}
                            >
                              <Mail size={12} />
                            </a>
                          )}
                        </div>

                        {/* Stage mover dropdown */}
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(lead)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Editar Prospecto"
                            >
                              <Edit size={12} />
                            </button>
                            <select
                              value={lead.stage}
                              onChange={(e) => onUpdateLeadStage(lead.id, e.target.value as any)}
                              className="text-[9px] font-black uppercase bg-slate-100 text-slate-700 border-none rounded py-0.5 px-1 cursor-pointer focus:ring-1 focus:ring-ng-lime"
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {stageLeads.length === 0 && (
                  <div className="py-8 text-center text-[10px] font-bold text-slate-300 italic">
                    Sin prospectos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT LEAD MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 space-y-4 text-left max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Users size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingLead.id?.startsWith('lead-') ? 'Nuevo Prospecto / Lead' : 'Editar Prospecto'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Nombre del Contacto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ing. Carlos Villacís"
                      value={editingLead.name || ''}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Empresa / Institución
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Industrias Lácteas del Sur"
                      value={editingLead.companyName || ''}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      placeholder="+593 99 876 5432"
                      value={editingLead.phone || ''}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="contacto@empresa.ec"
                      value={editingLead.email || ''}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Etapa
                    </label>
                    <select
                      value={editingLead.stage || 'nuevo'}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, stage: e.target.value as any }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Valor Estimado ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editingLead.estimatedValue || 0}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, estimatedValue: Number(e.target.value) }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Origen / Canal
                    </label>
                    <select
                      value={editingLead.channel || 'meta_ads'}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, channel: e.target.value as any }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="meta_ads">Meta Ads (FB/IG)</option>
                      <option value="google_ads">Google Ads</option>
                      <option value="tiktok">TikTok</option>
                      <option value="organico">Orgánico / Web</option>
                      <option value="referido">Referido</option>
                      <option value="evento">Evento / BTL</option>
                      <option value="directo">Directo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Campaña Asociada
                    </label>
                    <select
                      value={editingLead.campaignId || ''}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, campaignId: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="">Sin campaña específica</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Responsable Comercial
                    </label>
                    <select
                      value={editingLead.assignedMemberId || ''}
                      onChange={(e) => setEditingLead(prev => ({ ...prev, assignedMemberId: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                    Notas de Contacto y Requerimientos
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Servicios de interés, fecha de última llamada, objeciones o acuerdos..."
                    value={editingLead.notes || ''}
                    onChange={(e) => setEditingLead(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90"
                  >
                    Guardar Prospecto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
