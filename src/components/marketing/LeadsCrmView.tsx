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
import { MarketingLead, MarketingCampaign, TeamMember, Task } from '../../types';
import { Lead360View } from './Lead360View';

interface LeadsCrmViewProps {
  leads: MarketingLead[];
  campaigns: MarketingCampaign[];
  members: TeamMember[];
  tasks?: Task[];
  currentMember: TeamMember | null;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  onSaveLead: (lead: MarketingLead) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onUpdateLeadStage: (leadId: string, stage: MarketingLead['stage']) => Promise<void>;
  onAddStoryForLead?: (storyData: Partial<Task>) => Promise<void>;
  onOpenStory?: (story: Task) => void;
}

export const LeadsCrmView: React.FC<LeadsCrmViewProps> = ({
  leads,
  campaigns,
  members,
  tasks = [],
  currentMember,
  accessLevel,
  onSaveLead,
  onDeleteLead,
  onUpdateLeadStage,
  onAddStoryForLead,
  onOpenStory
}) => {
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<string>('todos');
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);

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
    setSelectedLead(null);
    setIsCreatingLead(true);
  };

  const handleOpenEdit = (lead: MarketingLead) => {
    setSelectedLead(lead);
    setIsCreatingLead(false);
  };

  const handleSaveLeadFrom360 = async (lead: MarketingLead) => {
    await onSaveLead(lead);
    setSelectedLead(null);
    setIsCreatingLead(false);
  };

  // If in Form View (Tryton Form Mode: Detail or Create)
  if (selectedLead || isCreatingLead) {
    return (
      <Lead360View
        lead={selectedLead}
        isCreating={isCreatingLead}
        campaigns={campaigns}
        members={members}
        tasks={tasks}
        currentMember={currentMember}
        onBack={() => {
          setSelectedLead(null);
          setIsCreatingLead(false);
        }}
        onSave={handleSaveLeadFrom360}
        onDelete={async (leadId) => {
          await onDeleteLead(leadId);
          setSelectedLead(null);
          setIsCreatingLead(false);
        }}
        onAddStoryForLead={onAddStoryForLead}
        onOpenStory={onOpenStory}
        canEdit={!isReadOnly}
        canDelete={!isReadOnly}
      />
    );
  }

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
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Prospectos</span>
            <h3 className="text-xl font-black text-slate-900">{totalLeadsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pipeline Activo</span>
            <h3 className="text-xl font-black text-slate-900">${activePipelineValue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ventas Ganadas</span>
            <h3 className="text-xl font-black text-emerald-600">${wonRevenue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-3.5">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
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
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-ng-lime focus:outline-hidden w-56"
            />
          </div>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ng-lime"
          >
            <option value="todos">Todas las Campañas</option>
            {campaigns.map((c, cIdx) => (
              <option key={`mkt_leads_filter_camp_${c.id || cIdx}_${cIdx}`} value={c.id}>{c.code}</option>
            ))}
          </select>

          {!isReadOnly && (
            <button
              onClick={() => handleOpenCreate()}
              className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              Nuevo Prospecto
            </button>
          )}
        </div>
      </div>

      {/* KANBAN CRM BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {stages.map((stage, stIdx) => {
          const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
          const stageTotal = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

          return (
            <div
              key={`mkt_lead_stage_col_${stage.id}_${stIdx}`}
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
                    className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={`Añadir a ${stage.title}`}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {/* Leads Cards Container */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {stageLeads.map((lead, lIdx) => {
                  const campaign = campaigns.find(c => c.id === lead.campaignId);
                  const assigned = members.find(m => m.id === lead.assignedMemberId);
                  const cleanPhone = (lead.phone || '').replace(/\D/g, '');

                  return (
                    <div
                      key={`mkt_lead_card_${lead.id || lIdx}_${lIdx}`}
                      onClick={() => handleOpenEdit(lead)}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all space-y-2.5 text-left cursor-pointer"
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

                      {/* Assigned & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          {assigned ? (
                            <img
                              src={assigned.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(assigned.name)}`}
                              alt={assigned.name}
                              className="w-5 h-5 rounded-full object-cover"
                              title={`Asignado a: ${assigned.name}`}
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">
                              ?
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold truncate max-w-[80px]">
                            {assigned?.name.split(' ')[0] || 'Sin Asignar'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Contactar vía WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Llamar"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-slate-300 text-[11px] font-bold">
                    Sin prospectos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
