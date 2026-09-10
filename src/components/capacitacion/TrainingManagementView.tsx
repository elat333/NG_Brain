import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Plus, Search, Edit2, Trash2, X, Clock, DollarSign, Target, Calendar } from 'lucide-react';
import { TrainingManagement, TrainingPlan, SalesClient, MarketingCampaign, Trainer } from '../../types';

interface TrainingManagementViewProps {
  managements: TrainingManagement[];
  plans: TrainingPlan[];
  clients: SalesClient[];
  campaigns: MarketingCampaign[];
  trainers: Trainer[];
  onSaveManagement: (management: Partial<TrainingManagement>) => Promise<void>;
  onDeleteManagement: (id: string) => Promise<void>;
}

export const TrainingManagementView: React.FC<TrainingManagementViewProps> = ({ 
  managements, plans, clients, campaigns, trainers, onSaveManagement, onDeleteManagement 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMgmt, setEditingMgmt] = useState<Partial<TrainingManagement> | null>(null);

  const filtered = managements.filter(m => {
    return m.code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const generateCode = () => {
    const d = new Date();
    const year = d.getFullYear();
    const count = managements.length + 1;
    return `CAP-${year}-${count.toString().padStart(3, '0')}`;
  };

  const handleOpenModal = (mgmt?: TrainingManagement) => {
    if (mgmt) {
      setEditingMgmt(mgmt);
    } else {
      setEditingMgmt({ 
        code: generateCode(), 
        planId: '', 
        clientId: '', 
        marketingCampaignId: '', 
        totalHours: 0, 
        totalCost: 0, 
        status: 'pendiente' 
      });
    }
    setShowModal(true);
  };

  const handlePlanSelection = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan || !editingMgmt) return;

    let finalHours = 0;
    let cost = 0;

    if (plan.sessions && plan.sessions.length > 0) {
      // Sumar horas y costos de cada sesión considerando su capacitador específico
      plan.sessions.forEach(session => {
        if (session.startTime && session.endTime) {
          const [sH, sM] = session.startTime.split(':').map(Number);
          const [eH, eM] = session.endTime.split(':').map(Number);
          const blockH = Math.max(0, (eH + eM / 60) - (sH + sM / 60));
          finalHours += blockH;

          const tr = trainers.find(t => t.id === session.trainerId);
          if (tr && tr.hourlyRate) {
            cost += tr.hourlyRate * blockH;
          }
        }
      });
    } else {
      // Cálculo para planes legados de una sesión
      const [startH, startM] = plan.startTime.split(':').map(Number);
      const [endH, endM] = plan.endTime.split(':').map(Number);
      const hours = (endH + endM / 60) - (startH + startM / 60);
      finalHours = hours > 0 ? hours : 0;

      const trainer = trainers.find(t => t.id === plan.trainerId);
      if (trainer && trainer.hourlyRate) {
        cost = trainer.hourlyRate * finalHours;
      }
    }

    setEditingMgmt({
      ...editingMgmt,
      planId,
      totalHours: Number(finalHours.toFixed(1)),
      totalCost: Number(cost.toFixed(2))
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMgmt) {
      await onSaveManagement(editingMgmt);
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Gestión de Capacitaciones
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Registro, horas y análisis de costos por capacitación.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus size={16} />
          <span>Registrar Capacitación</span>
        </button>
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
                <th className="p-4">Vínculos</th>
                <th className="p-4">Horas / Costo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((mgmt, mgmtIdx) => {
                const plan = plans.find(p => p.id === mgmt.planId);
                const client = clients.find(c => c.id === mgmt.clientId);
                const camp = campaigns.find(c => c.id === mgmt.marketingCampaignId);
                
                return (
                  <tr key={`tr_mgmt_row_${mgmt.id || mgmtIdx}_${mgmtIdx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{mgmt.code}</td>
                    <td className="p-4">
                      {plan ? (
                        <div>
                          <div className="font-bold text-slate-700">{plan.title}</div>
                          <div className="text-xs text-slate-500">{plan.date} ({plan.startTime})</div>
                        </div>
                      ) : <span className="text-slate-400">Sin plan asignado</span>}
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {client && <div className="text-xs flex items-center gap-1 text-slate-600"><Target size={12}/> Cliente</div>}
                        {camp && <div className="text-xs flex items-center gap-1 text-slate-600"><Calendar size={12}/> Campaña</div>}
                        {!client && !camp && <span className="text-xs text-slate-400">Independiente</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                          <Clock size={12} className="text-amber-500"/> {mgmt.totalHours} h
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                          <DollarSign size={12} className="text-emerald-500"/> {mgmt.totalCost.toFixed(2)}
                        </span>
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
                          onClick={() => handleOpenModal(mgmt)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('¿Eliminar este registro?')) onDeleteManagement(mgmt.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron registros de capacitaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && editingMgmt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg my-8 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-3xl sticky top-0 z-10">
                <h3 className="font-black text-lg text-slate-800">
                  {editingMgmt.id ? 'Editar Registro' : 'Nuevo Registro de Capacitación'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <form id="mgmt-form" onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Código</label>
                      <input
                        type="text"
                        required
                        value={editingMgmt.code || ''}
                        onChange={e => setEditingMgmt({ ...editingMgmt, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estado</label>
                      <select
                        value={editingMgmt.status || 'pendiente'}
                        onChange={e => setEditingMgmt({ ...editingMgmt, status: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="ejecutada">Ejecutada</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Evento de Planificación
                    </label>
                    <select
                      required
                      value={editingMgmt.planId || ''}
                      onChange={e => handlePlanSelection(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Seleccione evento agendado...</option>
                      {plans.map((p, pIdx) => (
                        <option key={`tr_mgmt_plan_opt_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.title} - {p.date}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div>
                      <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Clock size={12} /> Horas Impartidas
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        required
                        value={editingMgmt.totalHours || ''}
                        onChange={e => setEditingMgmt({ ...editingMgmt, totalHours: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <DollarSign size={12} /> Costo Total ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editingMgmt.totalCost || ''}
                        onChange={e => setEditingMgmt({ ...editingMgmt, totalCost: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Vínculos (Opcional)
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Target size={14} /> Cliente Receptor
                      </label>
                      <select
                        value={editingMgmt.clientId || ''}
                        onChange={e => setEditingMgmt({ ...editingMgmt, clientId: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">Independiente / Sin Cliente</option>
                        {clients.filter(c => c.clientType === 'B2B').map((c, cIdx) => (
                          <option key={`tmgmt_opt_cl_${c.id || cIdx}_${cIdx}`} value={c.id}>{`Cliente (${c.id})`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar size={14} /> Campaña de Marketing
                      </label>
                      <select
                        value={editingMgmt.marketingCampaignId || ''}
                        onChange={e => setEditingMgmt({ ...editingMgmt, marketingCampaignId: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">Ninguna</option>
                        {campaigns.map((c, cIdx) => (
                          <option key={`tmgmt_opt_camp_${c.id || cIdx}_${cIdx}`} value={c.id}>[{c.code}] {`Cliente (${c.id})`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="mgmt-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-500/20"
                >
                  Guardar Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
