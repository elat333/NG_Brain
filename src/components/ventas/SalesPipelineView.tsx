import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Building,
  DollarSign,
  Calendar,
  User,
  Tag,
  ChevronRight,
} from "lucide-react";
import { SalesDeal, SalesClient, TeamMember, Company } from "../../types";

interface SalesPipelineViewProps {
  companies: Company[];
  deals: SalesDeal[];
  clients: SalesClient[];
  members: TeamMember[];
  onSaveDeal: (deal: Partial<SalesDeal>) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onUpdateStage: (id: string, stage: SalesDeal["stage"]) => Promise<void>;
}

const STAGES: { id: SalesDeal["stage"]; label: string; color: string }[] = [
  {
    id: "contacto",
    label: "Contacto Inicial",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    id: "reunion",
    label: "Reunión Agendada",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "propuesta",
    label: "Propuesta Enviada",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "negociacion",
    label: "Negociación",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "ganado",
    label: "Ganado",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "perdido",
    label: "Perdido",
    color: "bg-red-50 text-red-700 border-red-200",
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
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Partial<SalesDeal> | null>(
    null,
  );

  const handleOpenModal = (deal?: SalesDeal) => {
    if (deal) {
      setEditingDeal(deal);
    } else {
      setEditingDeal({
        title: "",
        clientId: "",
        amount: 0,
        stage: "contacto",
        expectedCloseDate: new Date().toISOString().split("T")[0],
        responsibleId: "",
      });
    }
    setShowModal(true);
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Embudo de Ventas B2C
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Seguimiento de oportunidades y ciclo de vida para clientes B2C
            (Personas).
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={16} />
          <span>Nueva Oportunidad</span>
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => {
            if (d.stage !== stage.id) return false;
            const c = clients.find((cl) => cl.id === d.clientId);
            return c?.clientType === "B2C";
          });
          const totalAmount = stageDeals.reduce(
            (sum, d) => sum + Number(d.amount),
            0,
          );

          return (
            <div
              key={stage.id}
              className="min-w-[300px] w-[300px] flex-shrink-0 flex flex-col bg-slate-50/50 rounded-3xl border border-slate-100"
            >
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${stage.color}`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="text-lg font-black text-slate-800 tracking-tight">
                  $
                  {totalAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[400px]">
                {stageDeals.map((deal) => {
                  const client = clients.find((c) => c.id === deal.clientId);
                  let clientName = "Sin cliente";
                  if (client) {
                    if (client.clientType === "B2B") {
                      clientName =
                        companies.find((c) => c.id === client.directoryId)
                          ?.name || "Empresa Desconocida";
                    } else {
                      clientName =
                        members.find((m) => m.id === client.directoryId)
                          ?.name || "Persona Desconocida";
                    }
                  }
                  const member = members.find(
                    (m) => m.id === deal.responsibleId,
                  );

                  return (
                    <motion.div
                      key={deal.id}
                      layoutId={deal.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                      onClick={() => handleOpenModal(deal)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">
                          {deal.title}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDeal(deal.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Building size={12} className="text-slate-400" />
                          <span className="truncate">{clientName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-0.5 rounded-lg border border-emerald-100">
                          <DollarSign size={12} />
                          {Number(deal.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px] font-black">
                            {member?.name.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]">
                            {member?.name || "Sin asignar"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <select
                            value={deal.stage}
                            onChange={(e) => {
                              e.stopPropagation();
                              onUpdateStage(
                                deal.id,
                                e.target.value as SalesDeal["stage"],
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-slate-300"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && editingDeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-lg text-slate-800">
                  {editingDeal.id ? "Editar Oportunidad" : "Nueva Oportunidad"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form
                  id="deal-form"
                  onSubmit={handleSave}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Target size={14} /> Título de la Oportunidad
                    </label>
                    <input
                      type="text"
                      required
                      value={editingDeal.title}
                      onChange={(e) =>
                        setEditingDeal({
                          ...editingDeal,
                          title: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Ej. Implementación de paneles solares..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Building size={14} /> Cliente
                      </label>
                      <select
                        required
                        value={editingDeal.clientId}
                        onChange={(e) =>
                          setEditingDeal({
                            ...editingDeal,
                            clientId: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="">Seleccione...</option>

                        {clients
                          .filter((c) => c.clientType === "B2C")
                          .map((c) => {
                            const cName =
                              members.find((m) => m.id === c.directoryId)
                                ?.name || "Persona";
                            return (
                              <option key={c.id} value={c.id}>
                                {cName}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <DollarSign size={14} /> Monto ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editingDeal.amount}
                        onChange={(e) =>
                          setEditingDeal({
                            ...editingDeal,
                            amount: Number(e.target.value),
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Tag size={14} /> Etapa
                      </label>
                      <select
                        required
                        value={editingDeal.stage}
                        onChange={(e) =>
                          setEditingDeal({
                            ...editingDeal,
                            stage: e.target.value as any,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Calendar size={14} /> Cierre Esperado
                      </label>
                      <input
                        type="date"
                        required
                        value={editingDeal.expectedCloseDate}
                        onChange={(e) =>
                          setEditingDeal({
                            ...editingDeal,
                            expectedCloseDate: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <User size={14} /> Responsable Comercial
                    </label>
                    <select
                      required
                      value={editingDeal.responsibleId}
                      onChange={(e) =>
                        setEditingDeal({
                          ...editingDeal,
                          responsibleId: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Seleccione...</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="deal-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-md shadow-emerald-500/20"
                >
                  Guardar Oportunidad
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
