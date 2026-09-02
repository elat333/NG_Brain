import React from 'react';
import { motion } from 'motion/react';
import { Users, Building2, Clock, Sparkles, ArrowRight, ChevronRight } from 'lucide-react';
import { Process, TeamMember } from '../../types';

export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
      <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
    </div>
    <div className="mt-4">
      <span className="text-2xl font-black text-gray-900">{value}</span>
      <p className="text-xs text-gray-400 mt-1">{trend}</p>
    </div>
  </div>
);

export interface AIInsightItemProps {
  title: string;
  desc: string;
  time: string;
}

export const AIInsightItem: React.FC<AIInsightItemProps> = ({ title, desc, time }) => (
  <div className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-2xl transition-all">
    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0 mt-0.5">
      <Sparkles size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-gray-900 truncate">{title}</h4>
        <span className="text-[10px] text-gray-400 shrink-0">{time}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export interface DashboardViewProps {
  members: TeamMember[];
  processes: Process[];
  onNavigateToTranscript: () => void;
  onNavigateToProcess?: (processId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  processes,
  onNavigateToTranscript,
  onNavigateToProcess
}) => {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Miembros del Equipo"
          value={members.length.toString()}
          icon={<Users className="text-blue-600" />}
          trend="+2 este mes"
        />
        <StatCard
          title="Procesos Activos"
          value={processes.length.toString()}
          icon={<Building2 className="text-purple-600" />}
          trend="Estructura óptima"
        />
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-ng-gray shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-ng-green opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-ng-black">
            <Clock size={20} className="text-ng-green" />
            Insight Recientes de IA
          </h3>
          <div className="space-y-4">
            <AIInsightItem
              title="Actualización de Perfil"
              desc="Elena Rodriguez añadió 'GCP Architecture' a sus habilidades."
              time="Hace 2 horas"
            />
            <AIInsightItem
              title="Nuevo Objetivo"
              desc="El proceso de Desarrollo de Software tiene un nuevo objetivo de migración."
              time="Hace 5 horas"
            />
            <AIInsightItem
              title="Logro Detectado"
              desc="Lucas Smith completó la campaña SEO trimestral."
              time="Ayer"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions / New Analysis */}
      <div className="space-y-6">
        <div className="bg-ng-black text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <Sparkles className="absolute right-[-10px] top-[-10px] w-32 h-32 text-ng-lime opacity-5 group-hover:opacity-10 transition-opacity duration-500" />
          <h3 className="text-lg font-black mb-2 tracking-tight">¿Nueva Reunión?</h3>
          <p className="text-ng-gray/60 text-sm mb-6 font-medium">
            Pega la transcripción y deja que la IA actualice los perfiles automáticamente.
          </p>
          <button
            onClick={onNavigateToTranscript}
            className="w-full py-3 bg-ng-lime text-ng-black font-black rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-lg shadow-ng-lime/10 cursor-pointer"
          >
            Empezar Análisis
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-ng-gray shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-ng-green opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="font-black mb-4 text-ng-black uppercase text-xs tracking-widest">
            Procesos Vigentes
          </h3>
          <div className="space-y-3">
            {processes.map((p, pIdx) => (
              <div
                key={`dash_proc_${p.id || pIdx}_${pIdx}`}
                onClick={() => onNavigateToProcess?.(p.id)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-ng-lime/10 transition-colors cursor-pointer group/item"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-ng-green" />
                  <span className="text-sm font-bold text-ng-black/70 group-hover/item:text-ng-black">
                    {p.name}
                  </span>
                </div>
                <ChevronRight size={16} className="text-ng-gray group-hover/item:text-ng-green" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
