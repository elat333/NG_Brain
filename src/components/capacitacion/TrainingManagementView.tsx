import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Plus, Search, Edit2, Trash2, Clock, DollarSign, Target, Calendar, ExternalLink, Megaphone, FolderKanban, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { 
  TrainingManagement, 
  TrainingPlan, 
  SalesClient, 
  MarketingCampaign, 
  Trainer, 
  TrainingSpace, 
  TeamMember,
  Company,
  Project
} from '../../types';
import { TrainingPlan360View } from './TrainingPlan360View';

interface TrainingManagementViewProps {
  managements: TrainingManagement[];
  plans: TrainingPlan[];
  clients: SalesClient[];
  campaigns: MarketingCampaign[];
  projects?: Project[];
  trainers: Trainer[];
  spaces?: TrainingSpace[];
  members?: TeamMember[];
  companies?: Company[];
  onSaveManagement: (management: Partial<TrainingManagement>, planData?: Partial<TrainingPlan>) => Promise<void>;
  onDeleteManagement: (id: string, planId?: string) => Promise<void>;
  isReadOnly?: boolean;
}

export const TrainingManagementView: React.FC<TrainingManagementViewProps> = ({ 
  managements, 
  plans, 
  clients, 
  campaigns, 
  projects = [],
  trainers, 
  spaces = [],
  members = [],
  companies = [],
  onSaveManagement, 
  onDeleteManagement,
  isReadOnly = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMgmt, setSelectedMgmt] = useState<TrainingManagement | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const filtered = managements.filter(m => {
    return (m.code || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const generateCode = () => {
    const d = new Date();
    const year = d.getFullYear();
    const count = managements.length + 1;
    return `CAP-${year}-${count.toString().padStart(3, '0')}`;
  };

  const handleOpenFullDetail = (mgmt?: TrainingManagement) => {
    if (mgmt) {
      setSelectedMgmt(mgmt);
      setIsCreatingNew(false);
    } else {
      setSelectedMgmt({ 
        id: `mg-${Date.now()}`,
        code: generateCode(), 
        planId: '', 
        clientId: '', 
        marketingCampaignId: '', 
        totalHours: 0, 
        totalCost: 0, 
        status: 'pendiente' 
      });
      setIsCreatingNew(true);
    }
  };

  const getClientName = (c: SalesClient) => {
    if (c.clientType === 'B2B') {
      const comp = companies.find(cp => cp.id === c.directoryId);
      return comp ? comp.name : `Empresa (${c.id})`;
    } else {
      const mem = members.find(m => m.id === c.directoryId);
      return mem ? mem.name : `Cliente (${c.id})`;
    }
  };

  const handleCloseDetail = () => {
    setSelectedMgmt(null);
    setIsCreatingNew(false);
  };

  const handleSaveDetail = async (mgmtData: Partial<TrainingManagement>, planData?: Partial<TrainingPlan>) => {
    await onSaveManagement(mgmtData, planData);
    handleCloseDetail();
  };

  const handleDeleteDetail = async (mgmtId: string, planId?: string) => {
    await onDeleteManagement(mgmtId, planId);
    handleCloseDetail();
  };

  // If viewing/editing in Full Screen
  if (selectedMgmt) {
    const activePlan = plans.find(p => p.id === selectedMgmt.planId) || null;
    return (
      <TrainingPlan360View
        management={isCreatingNew ? selectedMgmt : selectedMgmt}
        plan={activePlan}
        plans={plans}
        trainers={trainers}
        spaces={spaces}
        members={members}
        companies={companies}
        clients={clients}
        campaigns={campaigns}
        projects={projects}
        onSave={handleSaveDetail}
        onDelete={handleDeleteDetail}
        onBack={handleCloseDetail}
        isReadOnly={isReadOnly}
      />
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Gestión de Capacitaciones
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Registro, horas, costos y cronograma de sesiones por capacitación.
          </p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => handleOpenFullDetail()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:scale-102 cursor-pointer"
          >
            <Plus size={16} />
            <span>Registrar Capacitación</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código (ej: CAP-2026-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-black text-slate-500 tracking-wider">
              <tr>
                <th className="p-4">Código</th>
                <th className="p-4">Planificación / Evento</th>
                <th className="p-4">Origen / Vínculo</th>
                <th className="p-4">Horas</th>
                <th className="p-4">Balance Financiero</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((mgmt, mgmtIdx) => {
                const plan = plans.find(p => p.id === mgmt.planId);
                const client = clients.find(c => c.id === mgmt.clientId);
                const camp = campaigns.find(c => c.id === mgmt.marketingCampaignId);
                const proj = projects.find(pr => pr.id === mgmt.projectId);

                const totalCost = Number(mgmt.totalCost || 0);
                const totalIncome = Number(mgmt.totalIncome || 0);
                const netProfit = mgmt.netProfit !== undefined ? Number(mgmt.netProfit) : (totalIncome - totalCost);
                
                return (
                  <tr 
                    key={`tr_mgmt_row_${mgmt.id || mgmtIdx}_${mgmtIdx}`} 
                    className="hover:bg-indigo-50/30 transition-colors group"
                  >
                    {/* Código con enlace directo a pantalla completa */}
                    <td className="p-4 font-mono font-bold">
                      <button
                        type="button"
                        onClick={() => handleOpenFullDetail(mgmt)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        title="Ver ficha completa en pantalla completa"
                      >
                        <span>{mgmt.code}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>

                    {/* Planificación / Evento con enlace a pantalla completa */}
                    <td className="p-4">
                      {plan ? (
                        <div 
                          onClick={() => handleOpenFullDetail(mgmt)}
                          className="cursor-pointer group-hover:text-indigo-900"
                          title="Clic para abrir ficha completa"
                        >
                          <div className="font-bold text-slate-700 hover:text-indigo-600 transition-colors">{plan.title}</div>
                          <div className="text-xs text-slate-500">
                            {plan.date} {plan.sessions && plan.sessions.length > 1 ? `(${plan.sessions.length} sesiones)` : `(${plan.startTime || ''})`}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenFullDetail(mgmt)}
                          className="text-slate-400 text-xs italic hover:text-indigo-600 cursor-pointer"
                        >
                          + Configurar planificación
                        </button>
                      )}
                    </td>

                    {/* Origen / Vínculo */}
                    <td className="p-4">
                      <div className="space-y-1">
                        {mgmt.originType === 'marketing_campaign' && (
                          <div className="text-xs flex items-center gap-1.5 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 w-fit">
                            <Megaphone size={12} className="text-purple-600 shrink-0" />
                            <span className="truncate max-w-[140px]">{camp ? camp.name : 'Campaña Marketing'}</span>
                          </div>
                        )}
                        {mgmt.originType === 'project' && (
                          <div className="text-xs flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 w-fit">
                            <FolderKanban size={12} className="text-blue-600 shrink-0" />
                            <span className="truncate max-w-[140px]">{proj ? proj.name : 'Proyecto'}</span>
                          </div>
                        )}
                        {mgmt.originType === 'direct_client' && (
                          <div className="text-xs flex items-center gap-1.5 text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 w-fit">
                            <Target size={12} className="text-indigo-600 shrink-0" />
                            <span className="truncate max-w-[140px]">{client ? getClientName(client) : 'Cliente Directo'}</span>
                          </div>
                        )}
                        {mgmt.originType === 'internal_initiative' && (
                          <div className="text-xs flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 w-fit">
                            <Sparkles size={12} className="text-emerald-600 shrink-0" />
                            <span>Iniciativa Interna</span>
                          </div>
                        )}
                        {(!mgmt.originType || mgmt.originType === 'other') && (
                          <span className="text-xs text-slate-400">
                            {client ? getClientName(client) : camp ? camp.name : 'General / Interna'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Horas */}
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <Clock size={12} className="text-indigo-500"/>
                        <span>{mgmt.totalExecutedHours !== undefined ? mgmt.totalExecutedHours : mgmt.totalHours} h</span>
                        <span className="text-[10px] text-slate-400 font-medium">({mgmt.totalHours || 0}h plan)</span>
                      </div>
                    </td>

                    {/* Balance Financiero: Ingresos vs Costos & Utilidad */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 font-medium text-[11px]">Ingr:</span>
                          <span className="font-bold text-emerald-600">${totalIncome.toFixed(2)}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-400 font-medium text-[11px]">Cost:</span>
                          <span className="font-bold text-rose-600">${totalCost.toFixed(2)}</span>
                        </div>
                        {totalIncome > 0 && (
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                              netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {netProfit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              Utilidad: ${netProfit.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        mgmt.status === 'ejecutada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {mgmt.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenFullDetail(mgmt)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Abrir ficha completa"
                        >
                          <Edit2 size={16} />
                        </button>
                        {!isReadOnly && (
                          <button 
                            onClick={() => {
                              if (confirm(`¿Eliminar la capacitación ${mgmt.code}?`)) onDeleteManagement(mgmt.id, mgmt.planId);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    No se encontraron registros de capacitaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
