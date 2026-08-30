import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  BarChart2,
  PieChart,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { MarketingMetricRecord, MarketingCampaign, MarketingLead } from '../../types';

interface MetricsAnalyticsViewProps {
  metrics: MarketingMetricRecord[];
  campaigns: MarketingCampaign[];
  leads: MarketingLead[];
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  onSaveMetric: (metric: MarketingMetricRecord) => Promise<void>;
  onDeleteMetric: (metricId: string) => Promise<void>;
}

export const MetricsAnalyticsView: React.FC<MetricsAnalyticsViewProps> = ({
  metrics,
  campaigns,
  leads,
  accessLevel,
  onSaveMetric,
  onDeleteMetric
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Partial<MarketingMetricRecord>>({});

  const isReadOnly = accessLevel === 'lector';

  // Global calculations
  const totalAdSpend = metrics.reduce((acc, m) => acc + (m.adSpend || 0), 0) || 
    campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  
  const totalLeads = leads.length || metrics.reduce((acc, m) => acc + (m.leadsGenerated || 0), 0);
  
  const wonLeads = leads.filter(l => l.stage === 'ganado');
  const totalRevenue = wonLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0) || 
    metrics.reduce((acc, m) => acc + (m.revenueGenerated || 0), 0);

  const avgCpl = totalLeads > 0 ? (totalAdSpend / totalLeads) : 0;
  const globalRoas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) : 0;
  const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;

  const handleOpenCreate = () => {
    setEditingMetric({
      id: `metric-${Date.now()}`,
      campaignId: campaigns[0]?.id || '',
      campaignCode: campaigns[0]?.code || '',
      period: '2026-08',
      channel: 'Meta Ads (FB/IG)',
      adSpend: 500,
      impressions: 25000,
      clicks: 950,
      leadsGenerated: 25,
      dealsClosed: 2,
      revenueGenerated: 7500,
      cpl: 20,
      roas: 15,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const camp = campaigns.find(c => c.id === editingMetric.campaignId);
    const spend = Number(editingMetric.adSpend) || 0;
    const leadsGen = Number(editingMetric.leadsGenerated) || 0;
    const rev = Number(editingMetric.revenueGenerated) || 0;

    const finalMetric: MarketingMetricRecord = {
      id: editingMetric.id || `metric-${Date.now()}`,
      campaignId: editingMetric.campaignId,
      campaignCode: camp?.code || editingMetric.campaignCode || 'General',
      period: editingMetric.period || '2026-08',
      channel: editingMetric.channel || 'Meta Ads',
      adSpend: spend,
      impressions: Number(editingMetric.impressions) || 0,
      clicks: Number(editingMetric.clicks) || 0,
      leadsGenerated: leadsGen,
      dealsClosed: Number(editingMetric.dealsClosed) || 0,
      revenueGenerated: rev,
      cpl: leadsGen > 0 ? Number((spend / leadsGen).toFixed(2)) : 0,
      roas: spend > 0 ? Number((rev / spend).toFixed(1)) : 0,
      notes: editingMetric.notes,
      updatedAt: new Date().toISOString()
    };

    await onSaveMetric(finalMetric);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Executive Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <DollarSign size={12} className="text-blue-500" /> Inversión Pauta
          </span>
          <h3 className="text-xl font-black text-slate-900">${totalAdSpend.toLocaleString()}</h3>
          <span className="text-[10px] text-slate-400 font-bold">Total Acumulado</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Users size={12} className="text-indigo-500" /> Leads Captados
          </span>
          <h3 className="text-xl font-black text-slate-900">{totalLeads}</h3>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center">
            <ArrowUpRight size={12} /> {leads.filter(l => l.stage !== 'nuevo').length} calificados
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Target size={12} className="text-amber-500" /> CPL Promedio
          </span>
          <h3 className="text-xl font-black text-slate-900">${avgCpl.toFixed(2)}</h3>
          <span className="text-[10px] text-slate-400 font-bold">Costo por Lead</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <DollarSign size={12} className="text-emerald-500" /> Ventas Generadas
          </span>
          <h3 className="text-xl font-black text-emerald-600">${totalRevenue.toLocaleString()}</h3>
          <span className="text-[10px] text-slate-400 font-bold">{wonLeads.length} contratos cerrados</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <TrendingUp size={12} className="text-purple-500" /> Retorno (ROAS)
          </span>
          <h3 className="text-xl font-black text-purple-700">{globalRoas.toFixed(1)}x</h3>
          <span className="text-[10px] text-emerald-600 font-bold">Rentabilidad Alta</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" /> Conversión Venta
          </span>
          <h3 className="text-xl font-black text-slate-900">{conversionRate.toFixed(1)}%</h3>
          <span className="text-[10px] text-slate-400 font-bold">De Lead a Cliente</span>
        </div>
      </div>

      {/* Campaigns ROI Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Rendimiento por Campaña</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comparativa de presupuesto asignado, gasto real, prospectos generados y ROAS
            </p>
          </div>

          {!isReadOnly && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
            >
              <Plus size={16} />
              Registrar Métrica
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Código y Campaña</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Presupuesto</th>
                <th className="py-3.5 px-4 text-right">Invertido</th>
                <th className="py-3.5 px-4 text-center">Leads</th>
                <th className="py-3.5 px-4 text-right">CPL ($)</th>
                <th className="py-3.5 px-4 text-right">Ventas ($)</th>
                <th className="py-3.5 px-6 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {campaigns.map((camp) => {
                const campLeads = leads.filter(l => l.campaignId === camp.id);
                const campWon = campLeads.filter(l => l.stage === 'ganado');
                const campRevenue = campWon.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
                const cpl = campLeads.length > 0 ? (camp.spent / campLeads.length) : 0;
                const roas = camp.spent > 0 ? (campRevenue / camp.spent) : 0;

                return (
                  <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-black text-slate-900">{camp.name}</div>
                      <div className="font-mono text-[10px] text-blue-600">{camp.code}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">
                      ${camp.budget.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-blue-600">
                      ${camp.spent.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center font-black text-slate-900">
                      {campLeads.length}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-amber-600">
                      ${cpl.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-emerald-600">
                      ${campRevenue.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-black text-purple-700">
                      {roas.toFixed(1)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Metric Logs */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h4 className="text-base font-black text-slate-900">Historial de Registros de Pauta & Canales</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((m) => (
            <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {m.campaignCode || 'General'}
                  </span>
                  <h5 className="text-xs font-black text-slate-900 mt-1">{m.channel} ({m.period})</h5>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  ROAS: {m.roas}x
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">Gasto</span>
                  <strong className="text-slate-800">${m.adSpend}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">Leads</span>
                  <strong className="text-slate-800">{m.leadsGenerated} (CPL: ${m.cpl})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">Ventas</span>
                  <strong className="text-slate-800">${m.revenueGenerated}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LOG METRIC MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <BarChart2 size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Registrar Métrica de Pauta</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Campaña
                    </label>
                    <select
                      value={editingMetric.campaignId || ''}
                      onChange={(e) => setEditingMetric(prev => ({ ...prev, campaignId: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Canal
                    </label>
                    <input
                      type="text"
                      placeholder="Meta Ads, Google Ads, TikTok..."
                      value={editingMetric.channel || ''}
                      onChange={(e) => setEditingMetric(prev => ({ ...prev, channel: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Inversión ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingMetric.adSpend || 0}
                      onChange={(e) => setEditingMetric(prev => ({ ...prev, adSpend: Number(e.target.value) }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Leads Captados
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingMetric.leadsGenerated || 0}
                      onChange={(e) => setEditingMetric(prev => ({ ...prev, leadsGenerated: Number(e.target.value) }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                      Ventas Cerradas ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingMetric.revenueGenerated || 0}
                      onChange={(e) => setEditingMetric(prev => ({ ...prev, revenueGenerated: Number(e.target.value) }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>
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
                    Guardar Métrica
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
