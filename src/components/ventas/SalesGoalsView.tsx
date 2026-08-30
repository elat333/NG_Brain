import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, Target, TrendingUp, Users } from 'lucide-react';
import { SalesDeal, SalesClient, SalesQuote } from '../../types';

interface SalesGoalsViewProps {
  deals: SalesDeal[];
  clients: SalesClient[];
  quotes: SalesQuote[];
}

export const SalesGoalsView: React.FC<SalesGoalsViewProps> = ({ deals, clients, quotes }) => {
  const activeClients = clients.filter(c => c.status === 'activo').length;
  
  const totalPipeline = deals.reduce((sum, d) => sum + Number(d.amount), 0);
  const wonDealsAmount = deals.filter(d => d.stage === 'ganado').reduce((sum, d) => sum + Number(d.amount), 0);
  
  const approvedQuotesAmount = quotes.filter(q => q.status === 'aprobada').reduce((sum, q) => sum + Number(q.amount), 0);

  // Conversion rate (Ganados vs (Ganados + Perdidos))
  const closedDeals = deals.filter(d => d.stage === 'ganado' || d.stage === 'perdido');
  const conversionRate = closedDeals.length > 0 
    ? (deals.filter(d => d.stage === 'ganado').length / closedDeals.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Metas & Desempeño
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitoreo de KPIs, conversión y objetivos comerciales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <DollarSign size={20} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">Valor Total del Pipeline</p>
          <h3 className="text-2xl font-black text-slate-800">
            ${totalPipeline.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={20} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">Negocios Ganados</p>
          <h3 className="text-2xl font-black text-emerald-600">
            ${wonDealsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <Target size={20} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">Tasa de Conversión</p>
          <h3 className="text-2xl font-black text-slate-800">
            {conversionRate.toFixed(1)}%
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Users size={20} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">Clientes Activos</p>
          <h3 className="text-2xl font-black text-slate-800">
            {activeClients}
          </h3>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Resumen de Cotizaciones</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
              <span className="font-semibold text-slate-600">Total Cotizado (Enviadas)</span>
              <span className="font-black text-slate-800">
                ${quotes.filter(q => q.status === 'enviada').reduce((sum, q) => sum + Number(q.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl">
              <span className="font-semibold text-emerald-700">Cotizaciones Aprobadas</span>
              <span className="font-black text-emerald-700">
                ${approvedQuotesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl">
              <span className="font-semibold text-red-700">Cotizaciones Rechazadas</span>
              <span className="font-black text-red-700">
                ${quotes.filter(q => q.status === 'rechazada').reduce((sum, q) => sum + Number(q.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp size={32} />
          </div>
          <h3 className="text-slate-800 font-bold mb-2">Gráficos en Progreso</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Pronto podrás visualizar aquí las métricas de desempeño histórico, proyecciones de ventas y comisiones del equipo.
          </p>
        </div>
      </div>
    </div>
  );
};
