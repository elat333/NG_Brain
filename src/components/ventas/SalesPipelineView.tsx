import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Plus, Search, Edit2, Trash2, X, Building, DollarSign,
  Calendar, User, Tag, ChevronRight, TrendingUp, Sparkles, AlertCircle
} from 'lucide-react';
import { SalesDeal, SalesClient, TeamMember, Company } from '../../types';
import { SearchableSelect } from '../common/SearchableSelect';

interface SalesPipelineViewProps {
  companies: Company[];
  deals: SalesDeal[];
  clients: SalesClient[];
  members: TeamMember[];
  onSaveDeal: (deal: Partial<SalesDeal>) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onUpdateStage: (id: string, stage: SalesDeal['stage']) => Promise<void>;
  onSelectDeal?: (deal: SalesDeal) => void;
  onCreateNewDeal?: () => void;
}

type ClientTypeFilter = 'all' | 'B2B' | 'B2C';

const STAGES: { id: SalesDeal['stage']; label: string; prob: number; color: string; badge: string }[] = [
  {
    id: 'contacto',
    label: 'Contacto Inicial',
    prob: 20,
    color: 'bg-slate-100/80 text-slate-700 border-slate-200',
    badge: 'bg-blue-500',
  },
  {
    id: 'reunion',
    label: 'Diagnóstico / Reunión',
    prob: 40,
    color: 'bg-indigo-50/80 text-indigo-700 border-indigo-200',
    badge: 'bg-indigo-500',
  },
  {
    id: 'propuesta',
    label: 'Propuesta Presentada',
    prob: 60,
    color: 'bg-purple-50/80 text-purple-700 border-purple-200',
    badge: 'bg-purple-500',
  },
  {
    id: 'negociacion',
    label: 'Negociación',
    prob: 80,
    color: 'bg-amber-50/80 text-amber-700 border-amber-200',
    badge: 'bg-amber-500',
  },
  {
    id: 'seguimiento',
    label: 'Seguimiento',
    prob: 90,
    color: 'bg-cyan-50/80 text-cyan-700 border-cyan-200',
    badge: 'bg-cyan-500',
  },
  {
    id: 'ganado',
    label: 'Ganado 🏆',
    prob: 100,
    color: 'bg-emerald-50/80 text-emerald-700 border-emerald-200',
    badge: 'bg-emerald-500',
  },
  {
    id: 'perdido',
    label: 'Perdido ❌',
    prob: 0,
    color: 'bg-rose-50/80 text-rose-700 border-rose-200',
    badge: 'bg-rose-500',
  },
];

export const SalesPipelineView: React.FC<SalesPipelineViewProps> = ({
  deals,
  clients,
  companies,
  members,
  onSaveDeal,
  onDeleteDeal,
  onUpdateStage,
  onSelectDeal,
  onCreateNewDeal,
}) => {
  const [clientTypeFilter, setClientTypeFilter] = useState<ClientTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Partial<SalesDeal> | null>(null);

  // Overall KPIs
  const totalPipelineAmount = useMemo(() => {
    return deals
      .filter((d) => d.stage !== 'perdido')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [deals]);

  const totalWeightedForecast = useMemo(() => {
    return deals
      .filter((d) => d.stage !== 'perdido')
      .reduce((sum, d) => {
        const amt = Number(d.amount) || 0;
        const prob = d.probability !== undefined ? d.probability : 30;
        return sum + (amt * prob) / 100;
      }, 0);
  }, [deals]);

  // Open deal editor or 360 view
  const handleDealClick = (deal: SalesDeal) => {
    if (onSelectDeal) {
      onSelectDeal(deal);
    } else {
      setEditingDeal(deal);
      setShowModal(true);
    }
  };

  const handleCreateClick = () => {
    if (onCreateNewDeal) {
      onCreateNewDeal();
    } else {
      const currentYear = new Date().getFullYear();
      const randomCode = Math.floor(100 + Math.random() * 900);
      setEditingDeal({
        code: `OPN-${currentYear}-${randomCode}`,
        title: '',
        clientId: clients[0]?.id || '',
        amount: 0,
        stage: 'contacto',
        probability: 20,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        responsibleId: members[0]?.id || '',
      });
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDeal(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDeal) {
      await onSaveDeal(editingDeal);
      handleCloseModal();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & METRICS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Target size={13} className="text-blue-600" />
              Pipeline Comercial Unificado
            </span>
            <span className="text-xs text-slate-400 font-bold">• {deals.length} oportunidades</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Embudo de Oportunidades (B2B & B2C)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestión del ciclo comercial según estándar Tryton: seguimiento por etapas, probabilidad de cierre y forecast ponderado.
          </p>
        </div>

        {/* Global Forecast Metrics & Action */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 hidden sm:flex items-center gap-3">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Cartera Activa</span>
              <span className="text-sm font-black text-slate-900">
                ${totalPipelineAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200" />
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Forecast Ponderado</span>
              <span className="text-sm font-black text-blue-600">
                ${totalWeightedForecast.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Nueva Oportunidad</span>
          </button>
        </div>
      </div>

      {/* 2. QUICK FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Client Type Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-400 hidden sm:inline">Segmento:</span>
          <button
            type="button"
            onClick={() => setClientTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              clientTypeFilter === 'all'
                ? 'bg-slate-900 text-white font-black shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({deals.length})
          </button>

          <button
            type="button"
            onClick={() => setClientTypeFilter('B2B')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              clientTypeFilter === 'B2B'
                ? 'bg-indigo-600 text-white font-black shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Building size={13} />
            <span>🏢 B2B Empresas</span>
          </button>

          <button
            type="button"
            onClick={() => setClientTypeFilter('B2C')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              clientTypeFilter === 'B2C'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <User size={13} />
            <span>👤 B2C Personas</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, título, cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-2 pl-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* 3. KANBAN COLUMNS */}
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {STAGES.map((stage, stageIdx) => {
          const stageDeals = deals.filter((d) => {
            if (d.stage !== stage.id) return false;

            const client = clients.find((cl) => cl.id === d.clientId);
            const isB2B = client?.clientType === 'B2B';
            const isB2C = client?.clientType === 'B2C';

            // Filter by client type
            if (clientTypeFilter === 'B2B' && !isB2B) return false;
            if (clientTypeFilter === 'B2C' && !isB2C) return false;

            // Filter by search query
            if (searchQuery.trim() !== '') {
              const q = searchQuery.toLowerCase();
              const matchTitle = d.title?.toLowerCase().includes(q);
              const matchCode = d.code?.toLowerCase().includes(q);
              let clientName = '';
              if (client) {
                if (isB2B) {
                  const comp = companies.find((c) => c.id === client.directoryId);
                  clientName = (comp?.name || comp?.commercialName || '').toLowerCase();
                } else {
                  const mem = members.find((m) => m.id === client.directoryId);
                  clientName = (mem?.name || '').toLowerCase();
                }
              }
              return matchTitle || matchCode || clientName.includes(q);
            }

            return true;
          });

          const totalAmount = stageDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

          return (
            <div
              key={`pipe_stage_${stage.id || stageIdx}`}
              className="min-w-[310px] w-[310px] shrink-0 flex flex-col bg-slate-100/60 rounded-3xl border border-slate-200/80"
            >
              {/* Stage Header */}
              <div className="p-4 border-b border-slate-200/80 bg-white rounded-t-3xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.badge}`} />
                    <span className="font-black text-xs text-slate-800 uppercase tracking-wider">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-900 text-sm">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    Prob. {stage.prob}%
                  </span>
                </div>
              </div>

              {/* Deal Cards Container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[460px] max-h-[70vh] custom-scrollbar">
                {stageDeals.map((deal, dealIdx) => {
                  const client = clients.find((c) => c.id === deal.clientId);
                  const isB2B = client?.clientType === 'B2B';
                  let clientName = 'Sin cliente';
                  if (client) {
                    if (isB2B) {
                      clientName =
                        companies.find((c) => c.id === client.directoryId)?.name || 'Empresa Desconocida';
                    } else {
                      clientName =
                        members.find((m) => m.id === client.directoryId)?.name || 'Persona Desconocida';
                    }
                  }
                  const member = members.find((m) => m.id === deal.responsibleId);

                  // Days to close
                  let daysRemaining: number | null = null;
                  if (deal.expectedCloseDate) {
                    const target = new Date(deal.expectedCloseDate).getTime();
                    const now = new Date().getTime();
                    daysRemaining = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <motion.div
                      key={`pipe_deal_${deal.id || dealIdx}`}
                      layoutId={`pipe_deal_layout_${deal.id || dealIdx}`}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all group cursor-pointer space-y-2.5 relative"
                      onClick={() => handleDealClick(deal)}
                    >
                      {/* Code & Delete */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {deal.code || 'OPN-2026'}
                        </span>

                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase border ${
                            isB2B ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isB2B ? 'B2B' : 'B2C'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Eliminar la oportunidad "${deal.title}"?`)) {
                                onDeleteDeal(deal.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Eliminar oportunidad"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-black text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {deal.title}
                      </h4>

                      {/* Client Info */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        {isB2B ? <Building size={13} className="text-indigo-600 shrink-0" /> : <User size={13} className="text-emerald-600 shrink-0" />}
                        <span className="truncate">{clientName}</span>
                      </div>

                      {/* Amount & Expected Date */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="font-black text-slate-900 text-sm">
                          ${(Number(deal.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>

                        {daysRemaining !== null && (
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${
                            daysRemaining < 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            <Calendar size={11} />
                            {daysRemaining < 0 ? `Vencida (${Math.abs(daysRemaining)}d)` : `${daysRemaining}d`}
                          </span>
                        )}
                      </div>

                      {/* Footer: Responsible & Quick Stage Changer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-black">
                            {member?.name.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]">
                            {member?.name.split(' ')[0] || 'Asignar'}
                          </span>
                        </div>

                        <select
                          value={deal.stage}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStage(deal.id, e.target.value as SalesDeal['stage']);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none cursor-pointer"
                        >
                          {STAGES.map((s) => (
                            <option key={`sales_pipe_select_${deal.id}_${s.id}`} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  );
                })}

                {stageDeals.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-400">Sin oportunidades</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL FALLBACK IF onSelectDeal IS NOT PROVIDED */}
      <AnimatePresence>
        {showModal && editingDeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-lg text-slate-800">
                  {editingDeal.id ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="deal-form" onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Título de la Oportunidad</label>
                    <input
                      type="text"
                      required
                      value={editingDeal.title || ''}
                      onChange={(e) => setEditingDeal({ ...editingDeal, title: e.target.value })}
                      placeholder="Ej: Servicio de Monitoreo Ocupacional"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cliente</label>
                    <SearchableSelect
                      required
                      value={editingDeal.clientId}
                      onChange={(val) => setEditingDeal({ ...editingDeal, clientId: val })}
                      placeholder="Seleccione cliente..."
                      searchPlaceholder="Buscar cliente o empresa..."
                      isClearable
                      options={clients.map((c) => {
                        const name =
                          c.clientType === 'B2B'
                            ? companies.find((comp) => comp.id === c.directoryId)?.name || 'Empresa'
                            : members.find((mem) => mem.id === c.directoryId)?.name || 'Persona';
                        return {
                          value: c.id,
                          label: name,
                          badge: c.clientType,
                          badgeColor: c.clientType === 'B2B' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700',
                        };
                      })}
                      buttonClassName="p-2.5 bg-white border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Monto ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editingDeal.amount ?? 0}
                        onChange={(e) => setEditingDeal({ ...editingDeal, amount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Etapa</label>
                      <select
                        required
                        value={editingDeal.stage || 'contacto'}
                        onChange={(e) => setEditingDeal({ ...editingDeal, stage: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Fecha Prevista Cierre</label>
                      <input
                        type="date"
                        required
                        value={editingDeal.expectedCloseDate || ''}
                        onChange={(e) => setEditingDeal({ ...editingDeal, expectedCloseDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Responsable</label>
                      <select
                        value={editingDeal.responsibleId || ''}
                        onChange={(e) => setEditingDeal({ ...editingDeal, responsibleId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="deal-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md shadow-blue-500/20 uppercase tracking-wider cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
