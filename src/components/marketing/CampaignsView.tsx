import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  Target, 
  Users, 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  X, 
  Edit, 
  Trash, 
  Trash2,
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Tag,
  Palette,
  PenTool,
  Video,
  Share2,
  BarChart2,
  Building2,
  ExternalLink,
  Layers,
  MapPin,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { MarketingCampaign, Task, Project, TeamMember, Process, MarketingLead } from '../../types';
import { UniversalCommentsModal } from '../common/UniversalCommentsThread';
import { Campaign360View } from './Campaign360View';

interface CampaignsViewProps {
  campaigns: MarketingCampaign[];
  tasks: Task[];
  projects: Project[];
  members: TeamMember[];
  processes: Process[];
  leads?: MarketingLead[];
  currentMember: TeamMember | null;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  onSaveCampaign: (campaign: MarketingCampaign, createLinkedProject: boolean) => Promise<void>;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  onAddTaskForCampaign: (taskData: Partial<Task>) => Promise<void>;
  onOpenTask?: (task: Task) => void;
  onOpenCreateTaskModal?: (initialOverrides?: Partial<Task>) => void;
}

const deepCleanUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepCleanUndefined);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = deepCleanUndefined(obj[key]);
    }
  }
  return result;
};

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  tasks,
  projects,
  members,
  processes,
  leads = [],
  currentMember,
  accessLevel,
  onSaveCampaign,
  onDeleteCampaign,
  onAddTaskForCampaign,
  onOpenTask,
  onOpenCreateTaskModal
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [activeCommentCampaign, setActiveCommentCampaign] = useState<MarketingCampaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<MarketingCampaign | null>(null);

  const isReadOnly = accessLevel === 'lector';

  // Calculate campaign related stories
  const getCampaignStories = (camp: MarketingCampaign) => {
    return tasks.filter(t => 
      (camp.projectId && t.projectId === camp.projectId) ||
      (camp.code && t.storyDescription && t.storyDescription.includes(camp.code)) ||
      (camp.code && t.description && t.description.includes(camp.code)) ||
      (camp.code && t.title && t.title.includes(camp.code))
    );
  };

  // Helper to ensure project linkage
  const ensureCampaignProject = async (camp: MarketingCampaign): Promise<string> => {
    let campProjId = camp.projectId;
    if (campProjId && projects.some(p => p.id === campProjId)) {
      return campProjId;
    }

    const existingProj = projects.find(p => p.name === camp.code || p.name.includes(camp.code));
    if (existingProj) {
      campProjId = existingProj.id;
      if (camp.projectId !== campProjId) {
        await onSaveCampaign({ ...camp, projectId: campProjId }, false);
      }
      return campProjId;
    }

    const newProjId = `proj-camp-${Date.now()}`;
    await onSaveCampaign({ ...camp, projectId: newProjId }, true);
    return newProjId;
  };

  const handleSaveCampaignFrom360 = async (camp: MarketingCampaign, createLinkedProject: boolean) => {
    const cleanFinal = deepCleanUndefined(camp);
    await onSaveCampaign(cleanFinal, createLinkedProject);
    setSelectedCampaign(null);
    setIsCreatingCampaign(false);
  };

  const handleAddStoryFrom360 = async (storyData: Partial<Task>) => {
    if (selectedCampaign) {
      const campProjectId = await ensureCampaignProject(selectedCampaign);
      const mktProc = processes.find(p => p.id === selectedCampaign.processId) || processes[0];
      const campCode = selectedCampaign.code || selectedCampaign.name || 'CMP';
      
      let finalTitle = (storyData.title || '').trim();
      if (!finalTitle.startsWith(`${campCode}_`) && !finalTitle.startsWith(`${campCode} `)) {
        finalTitle = `${campCode}_${finalTitle}`;
      }

      await onAddTaskForCampaign({
        ...storyData,
        title: finalTitle,
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        storyDescription: `Historia vinculada para la campaña ${selectedCampaign.code}`
      });
    } else {
      await onAddTaskForCampaign(storyData);
    }
  };

  // If in Form View (Tryton Form Mode: Detail or Create)
  if (selectedCampaign || isCreatingCampaign) {
    return (
      <Campaign360View
        campaign={selectedCampaign}
        isCreating={isCreatingCampaign}
        projects={projects}
        tasks={tasks}
        members={members}
        processes={processes}
        leads={leads}
        currentMember={currentMember}
        onBack={() => {
          setSelectedCampaign(null);
          setIsCreatingCampaign(false);
        }}
        onSave={handleSaveCampaignFrom360}
        onDelete={async (id) => {
          await onDeleteCampaign(id);
          setSelectedCampaign(null);
          setIsCreatingCampaign(false);
        }}
        onAddStoryForCampaign={handleAddStoryFrom360}
        onOpenStory={onOpenTask}
        canEdit={!isReadOnly}
        canDelete={!isReadOnly}
      />
    );
  }

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.targetAudience || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-ng-lime/20 flex items-center justify-center text-ng-black">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Campañas de Marketing & Ventas</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Nomenclatura [AAMMDD] - Sincronización automática con Proyectos e Historias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código, nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 font-bold focus:outline-hidden focus:ring-2 focus:ring-ng-lime w-64 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ng-lime"
          >
            <option value="todos">Todos los Estados</option>
            <option value="activa">Activas</option>
            <option value="planificacion">En Planificación</option>
            <option value="en_pausa">En Pausa</option>
            <option value="completada">Completadas</option>
          </select>

          {!isReadOnly && (
            <button
              onClick={() => setIsCreatingCampaign(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md shadow-ng-lime/20 shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              Nueva Campaña
            </button>
          )}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.map((camp, cIdx) => {
          const campStories = getCampaignStories(camp);
          const completedStories = campStories.filter(t => t.completed || t.status === 'done').length;
          const storyProgress = campStories.length > 0 ? Math.round((completedStories / campStories.length) * 100) : 0;
          const budgetPercent = camp.budget > 0 ? Math.min(Math.round((camp.spent / camp.budget) * 100), 100) : 0;
          const leader = members.find(m => m.id === camp.leaderMemberId);

          const statusColors: Record<string, string> = {
            activa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            planificacion: 'bg-blue-50 text-blue-700 border-blue-200',
            en_pausa: 'bg-amber-50 text-amber-700 border-amber-200',
            completada: 'bg-purple-50 text-purple-700 border-purple-200',
            cancelada: 'bg-red-50 text-red-700 border-red-200'
          };

          return (
            <div
              key={`mkt_camp_card_${camp.id || cIdx}_${cIdx}`}
              onClick={() => setSelectedCampaign(camp)}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs hover:shadow-xl hover:border-slate-200 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-4">
                {/* Header Badge & Code */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                    {camp.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${statusColors[camp.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {camp.status}
                    </span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCampaignToDelete(camp);
                        }}
                        title="Eliminar campaña"
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Campaign Title & Objective */}
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {camp.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">
                    {camp.description || camp.notes || camp.targetAudience || 'Sin descripción adicional.'}
                  </p>
                </div>

                {/* Channels Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(camp.channels || []).slice(0, 3).map((ch, idx) => (
                    <span key={`${camp.id}_ch_${ch}_${idx}`} className="text-[9px] font-bold bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                      {ch}
                    </span>
                  ))}
                  {(camp.channels || []).length > 3 && (
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">
                      +{(camp.channels || []).length - 3}
                    </span>
                  )}
                </div>

                {/* Progress Meters */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Stories progress */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-500" /> Historias ({completedStories}/{campStories.length})
                      </span>
                      <span>{storyProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${storyProgress}%` }} />
                    </div>
                  </div>

                  {/* Budget progress */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <DollarSign size={11} className="text-blue-500" /> Presupuesto (${camp.spent} / ${camp.budget})
                      </span>
                      <span>{budgetPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${budgetPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src={leader?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(leader?.name || 'Leader')}`}
                    alt="Leader"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-[10px] font-black text-slate-600 truncate max-w-[100px]">
                    {leader?.name || 'Sin Asignar'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Ver observaciones y comentarios de la campaña"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCommentCampaign(camp);
                    }}
                    className="p-1 px-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                  >
                    <MessageSquare size={12} className="text-blue-500" />
                    <span>Comentarios</span>
                  </button>

                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Calendar size={12} />
                    <span>{camp.startDate}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCampaigns.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100 p-8 space-y-3">
            <Target size={40} className="mx-auto text-slate-300" />
            <h4 className="text-base font-black text-slate-700">No se encontraron campañas</h4>
            <p className="text-xs text-slate-400 font-medium">Crea una nueva campaña o ajusta tus filtros de búsqueda.</p>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE CAMPAIGN MODAL */}
      <AnimatePresence>
        {campaignToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-md w-full p-6 text-left space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">¿Eliminar esta campaña?</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Esta acción removerá la campaña de la base de datos.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {campaignToDelete.code || 'Sin código'}
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    {campaignToDelete.status}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-800 line-clamp-2">
                  {campaignToDelete.name}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCampaignToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDelete = campaignToDelete.id;
                    setCampaignToDelete(null);
                    await onDeleteCampaign(idToDelete);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  <Trash2 size={15} />
                  Sí, eliminar campaña
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIVERSAL COMMENTS MODAL */}
      <UniversalCommentsModal
        isOpen={!!activeCommentCampaign}
        onClose={() => setActiveCommentCampaign(null)}
        entityType="campaign"
        entityId={activeCommentCampaign?.id || ''}
        entityTitle={`${activeCommentCampaign?.code ? `[${activeCommentCampaign.code}] ` : ''}${activeCommentCampaign?.name || ''}`}
        currentMember={currentMember}
        members={members}
      />
    </div>
  );
};
