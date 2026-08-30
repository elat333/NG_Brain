import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Building,
  DollarSign,
  Calendar,
  Tag,
} from "lucide-react";
import { SalesQuote, SalesClient, Company, TeamMember } from "../../types";

interface SalesQuotesViewProps {
  companies: Company[];
  members: TeamMember[];
  quotes: SalesQuote[];
  clients: SalesClient[];
  onSaveQuote: (quote: Partial<SalesQuote>) => Promise<void>;
  onDeleteQuote: (id: string) => Promise<void>;
}

export const SalesQuotesView: React.FC<SalesQuotesViewProps> = ({
  quotes,
  clients,
  companies,
  members,
  onSaveQuote,
  onDeleteQuote,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Partial<SalesQuote> | null>(
    null,
  );

  const filteredQuotes = quotes.filter(
    (q) =>
      q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (() => {
        const c = clients.find((cl) => cl.id === q.clientId);
        if (!c) return false;
        if (c.clientType === "B2B")
          return (
            companies
              .find((comp) => comp.id === c.directoryId)
              ?.name?.toLowerCase()
              .includes(searchQuery.toLowerCase()) || false
          );
        return (
          members
            .find((m) => m.id === c.directoryId)
            ?.name?.toLowerCase()
            .includes(searchQuery.toLowerCase()) || false
        );
      })(),
  );

  const handleOpenModal = (quote?: SalesQuote) => {
    if (quote) {
      setEditingQuote(quote);
    } else {
      setEditingQuote({
        quoteNumber: `PF-${new Date().getFullYear()}-${Math.floor(
          Math.random() * 1000,
        )
          .toString()
          .padStart(3, "0")}`,
        clientId: "",
        amount: 0,
        status: "borrador",
        date: new Date().toISOString().split("T")[0],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQuote(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuote) {
      await onSaveQuote(editingQuote);
      handleCloseModal();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Gestión B2B (Cotizaciones)
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de proformas y negocios para clientes B2B (Empresas).
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={16} />
          <span>Crear Cotización</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-black text-slate-500 tracking-wider">
              <tr>
                <th className="p-4">Nº Cotización</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Fecha</th>
                <th className="p-4 text-right">Monto</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((quote) => {
                const client = clients.find((c) => c.id === quote.clientId);
                let clientName = "Cliente no encontrado";
                if (client) {
                  if (client.clientType === "B2B") {
                    clientName =
                      companies.find((c) => c.id === client.directoryId)
                        ?.name || "Empresa Desconocida";
                  } else {
                    clientName =
                      members.find((m) => m.id === client.directoryId)?.name ||
                      "Persona Desconocida";
                  }
                }
                return (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-black text-slate-800">
                        {quote.quoteNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-700">
                          {clientName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{quote.date}</td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-emerald-700">
                        $
                        {Number(quote.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          quote.status === "aprobada"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : quote.status === "enviada"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : quote.status === "rechazada"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {quote.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(quote)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "¿Está seguro de eliminar esta cotización?",
                              )
                            ) {
                              onDeleteQuote(quote.id);
                            }
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
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron cotizaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && editingQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-lg text-slate-800">
                  {editingQuote.id ? "Editar Cotización" : "Nueva Cotización"}
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
                  id="quote-form"
                  onSubmit={handleSave}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText size={14} /> Nº Proforma
                      </label>
                      <input
                        type="text"
                        required
                        value={editingQuote.quoteNumber}
                        onChange={(e) =>
                          setEditingQuote({
                            ...editingQuote,
                            quoteNumber: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Calendar size={14} /> Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={editingQuote.date}
                        onChange={(e) =>
                          setEditingQuote({
                            ...editingQuote,
                            date: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Building size={14} /> Cliente
                    </label>
                    <select
                      required
                      value={editingQuote.clientId}
                      onChange={(e) =>
                        setEditingQuote({
                          ...editingQuote,
                          clientId: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Seleccione...</option>

                      {clients
                        .filter((c) => c.clientType === "B2B")
                        .map((c) => {
                          const cName =
                            companies.find((comp) => comp.id === c.directoryId)
                              ?.name || "Empresa";
                          return (
                            <option key={c.id} value={c.id}>
                              {cName}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <DollarSign size={14} /> Monto ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editingQuote.amount}
                        onChange={(e) =>
                          setEditingQuote({
                            ...editingQuote,
                            amount: Number(e.target.value),
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Tag size={14} /> Estado
                      </label>
                      <select
                        required
                        value={editingQuote.status}
                        onChange={(e) =>
                          setEditingQuote({
                            ...editingQuote,
                            status: e.target.value as any,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="borrador">Borrador</option>
                        <option value="enviada">Enviada</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
                    </div>
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
                  form="quote-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-md shadow-emerald-500/20"
                >
                  Guardar Cotización
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
