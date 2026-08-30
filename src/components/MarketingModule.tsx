import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Calendar, 
  Users, 
  BarChart2, 
  Megaphone, 
  Sparkles, 
  FolderKanban,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  DollarSign,
  Link2
} from 'lucide-react';
import { 
  MarketingCampaign, 
  MarketingContent, 
  MarketingLead, 
  MarketingMetricRecord, 
  Task, 
  Project, 
  TeamMember, 
  Process, 
  Company 
} from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { 
  initialMarketingCampaigns, 
  initialMarketingContents, 
  initialMarketingLeads, 
  initialMarketingMetrics 
} from '../lib/initialData';
import { CampaignsView } from './marketing/CampaignsView';
import { ContentCalendarView } from './marketing/ContentCalendarView';
import { MetricsAnalyticsView } from './marketing/MetricsAnalyticsView';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';

export type MarketingSubTab = 'campaigns' | 'content_calendar' | 'metrics_analytics' | 'links' | 'notes';

interface MarketingModuleProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  processes: Process[];
  tasks: Task[];
  projects: Project[];
  companies: Company[];
  accessLevel?: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab?: MarketingSubTab;
  onSubTabChange?: (tab: MarketingSubTab) => void;
  onAddTask?: (taskData: Partial<Task>) => Promise<any>;
  onAddProject?: (projectData: Partial<Project>) => Promise<any>;
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

const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const MarketingModule: React.FC<MarketingModuleProps> = ({
  currentMember,
  members,
  processes,
  tasks,
  projects,
  companies,
  accessLevel = 'administrador',
  activeSubTab: externalSubTab,
  onSubTabChange,
  onAddTask,
  onAddProject,
  onOpenTask,
  onOpenCreateTaskModal
}) => {
  const [internalSubTab, setInternalSubTab] = useState<MarketingSubTab>('campaigns');
  const activeSubTab = externalSubTab || internalSubTab;

  const handleSetSubTab = (tab: MarketingSubTab) => {
    setInternalSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // State collections
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [metrics, setMetrics] = useState<MarketingMetricRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore Sync with fallback to initial seed data
  useEffect(() => {
    let unsubCampaigns = () => {};
    let unsubContents = () => {};
    let unsubLeads = () => {};
    let unsubMetrics = () => {};

    try {
      // 1. Campaigns
      const campCol = collection(db, 'marketing_campaigns');
      unsubCampaigns = onSnapshot(campCol, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MarketingCampaign));
        setCampaigns(deduplicateById(docs));
      }, (err) => {
        console.warn('Firestore marketing_campaigns error:', err);
      });

      // 2. Contents
      const cntCol = collection(db, 'marketing_contents');
      unsubContents = onSnapshot(cntCol, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MarketingContent));
        setContents(deduplicateById(docs));
      }, (err) => {
        console.warn('Firestore marketing_contents error:', err);
      });

      // 3. Leads
      const leadsCol = collection(db, 'marketing_leads');
      unsubLeads = onSnapshot(leadsCol, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MarketingLead));
        setLeads(deduplicateById(docs));
      }, (err) => {
        console.warn('Firestore marketing_leads error:', err);
      });

      // 4. Metrics
      const metCol = collection(db, 'marketing_metrics');
      unsubMetrics = onSnapshot(metCol, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MarketingMetricRecord));
        setMetrics(deduplicateById(docs));
        setIsLoading(false);
      }, (err) => {
        console.warn('Firestore marketing_metrics error:', err);
        setIsLoading(false);
      });

    } catch (e) {
      console.warn('Firestore initialization fallback:', e);
      setCampaigns(deduplicateById(initialMarketingCampaigns));
      setContents(deduplicateById(initialMarketingContents));
      setLeads(deduplicateById(initialMarketingLeads));
      setMetrics(deduplicateById(initialMarketingMetrics));
      setIsLoading(false);
    }

    return () => {
      unsubCampaigns();
      unsubContents();
      unsubLeads();
      unsubMetrics();
    };
  }, []);

  // --- Campaign Handlers ---
  const handleSaveCampaign = async (campaign: MarketingCampaign, createLinkedProject: boolean) => {
    setSaveError(null);
    setSaveError(null);
    console.log('MarketingModule: handleSaveCampaign called with:', campaign, createLinkedProject);
    let linkedProjId = campaign.projectId;

    // Automatic synchronization with Projects
    if (createLinkedProject && (!linkedProjId || !projects.some(p => p.id === linkedProjId))) {
      try {
        const newProjId = `proj-camp-${Date.now()}`;
        const newProjectData: Project = {
          id: newProjId,
          name: campaign.code || campaign.name,
          description: `Proyecto de campaña de Marketing: ${campaign.name}. Audiencia: ${campaign.targetAudience || 'General'}. Presupuesto: $${campaign.budget}`,
          status: campaign.status === 'activa' ? 'activo' : campaign.status === 'completada' ? 'completado' : 'pausado',
          processId: campaign.processId || 'proc-mkt',
          createdAt: new Date().toISOString()
        };

        if (onAddProject) {
          await onAddProject(newProjectData);
        } else {
          await setDoc(doc(db, 'projects', newProjId), newProjectData);
        }
        linkedProjId = newProjId;
      } catch (err) {
        console.error('Error creating linked project:', err);
      }
    }

    const campaignToSave = {
      ...campaign,
    };
    if (linkedProjId) {
        campaignToSave.projectId = linkedProjId;
    }

    const cleanCampaign = deepCleanUndefined(campaignToSave);

    try {
      console.log('MarketingModule: about to setDoc marketing_campaigns:', campaignToSave);
      await setDoc(doc(db, 'marketing_campaigns', cleanCampaign.id), cleanCampaign);
      console.log('MarketingModule: setDoc marketing_campaigns SUCCESS');
      setCampaigns(prev => {
        const idx = prev.findIndex(c => c.id === campaignToSave.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = campaignToSave;
          return updated;
        }
        return [campaignToSave, ...prev];
      });
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      setSaveError(err.message || 'Unknown error');
      alert('Error saving campaign: ' + (err.message || 'Unknown'));
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await deleteDoc(doc(db, 'marketing_campaigns', campaignId));
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    }
  };

  // --- Task Creation for Campaign ---
  const handleAddTaskForCampaign = async (taskData: Partial<Task>) => {
    Object.keys(taskData).forEach(key => { if ((taskData as any)[key] === undefined) delete (taskData as any)[key]; });
    const taskId = taskData.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newTask: Task = {
      id: taskId,
      title: taskData.title || 'Nueva Tarea',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'media',
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      memberId: taskData.memberId || currentMember?.id || 'mem-1',
      processId: taskData.processId || 'proc-mkt',
      projectId: taskData.projectId,
      storyDescription: taskData.storyDescription || '',
      acceptanceCriteria: taskData.acceptanceCriteria || 'Revisión y aprobación por líder de campaña',
      taskTemplate: taskData.taskTemplate || 'standard',
      plannedHours: taskData.plannedHours || 2,
      actualHours: taskData.actualHours || 0,
      blockedByTaskIds: taskData.blockedByTaskIds || [],
      deliverables: taskData.deliverables || [],
      createdAt: new Date().toISOString(),
      ...(taskData.designData ? { designData: taskData.designData } : {})
    };

    const cleanTask = deepCleanUndefined(newTask);
    if (onAddTask) {
      await onAddTask(cleanTask);
    } else {
      await setDoc(doc(db, 'tasks', cleanTask.id), cleanTask);
    }
  };

  // --- Content Handlers ---
  const handleSaveContent = async (content: MarketingContent) => {
    Object.keys(content).forEach(key => { if ((content as any)[key] === undefined) delete (content as any)[key]; });
    try {
      await setDoc(doc(db, 'marketing_contents', content.id), content);
      setContents(prev => {
        const idx = prev.findIndex(c => c.id === content.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = content;
          return updated;
        }
        return [content, ...prev];
      });
    } catch (err) {
      console.error('Error saving content:', err);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      await deleteDoc(doc(db, 'marketing_contents', contentId));
      setContents(prev => prev.filter(c => c.id !== contentId));
    } catch (err) {
      console.error('Error deleting content:', err);
      setContents(prev => prev.filter(c => c.id !== contentId));
    }
  };

  // --- Leads Handlers ---
  const handleSaveLead = async (lead: MarketingLead) => {
    Object.keys(lead).forEach(key => { if ((lead as any)[key] === undefined) delete (lead as any)[key]; });
    try {
      await setDoc(doc(db, 'marketing_leads', lead.id), lead);
      setLeads(prev => {
        const idx = prev.findIndex(l => l.id === lead.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = lead;
          return updated;
        }
        return [lead, ...prev];
      });
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'marketing_leads', leadId));
      setLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (err) {
      console.error('Error deleting lead:', err);
      setLeads(prev => prev.filter(l => l.id !== leadId));
    }
  };

  const handleUpdateLeadStage = async (leadId: string, stage: MarketingLead['stage']) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;
    const updated = { ...targetLead, stage, updatedAt: new Date().toISOString() };
    await handleSaveLead(updated);
  };

  // --- Metrics Handlers ---
  const handleSaveMetric = async (metric: MarketingMetricRecord) => {
    try {
      await setDoc(doc(db, 'marketing_metrics', metric.id), metric);
      setMetrics(prev => {
        const idx = prev.findIndex(m => m.id === metric.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = metric;
          return updated;
        }
        return [metric, ...prev];
      });
    } catch (err) {
      console.error('Error saving metric:', err);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    try {
      await deleteDoc(doc(db, 'marketing_metrics', metricId));
      setMetrics(prev => prev.filter(m => m.id !== metricId));
    } catch (err) {
      console.error('Error deleting metric:', err);
      setMetrics(prev => prev.filter(m => m.id !== metricId));
    }
  };

  const subTabsList: { id: MarketingSubTab; label: string; icon: any; count?: number }[] = [
    { id: 'links', label: 'Enlaces de Interés', icon: <Link2 size={16} /> },
    { id: 'campaigns', label: 'Campañas', icon: <Target size={16} />, count: campaigns.length },
    { id: 'content_calendar', label: 'Contenido & Calendario', icon: <Calendar size={16} />, count: contents.length },
    { id: 'metrics_analytics', label: 'Métricas & KPIs', icon: <BarChart2 size={16} /> }
  ];

  return (
    <div className="space-y-1 text-left">


      {/* Subtab Views Rendering */}
      <div>
        {activeSubTab === 'campaigns' && (
          <motion.div
            key="campaigns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {saveError && <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-4 font-bold">Error guardando: {saveError}</div>}
            <CampaignsView
              campaigns={campaigns}
              tasks={tasks}
              projects={projects}
              members={members}
              processes={processes}
              currentMember={currentMember}
              accessLevel={accessLevel}
              onSaveCampaign={handleSaveCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onAddTaskForCampaign={handleAddTaskForCampaign}
              onOpenTask={onOpenTask}
              onOpenCreateTaskModal={onOpenCreateTaskModal}
            />
          </motion.div>
        )}

        {activeSubTab === 'content_calendar' && (
          <motion.div
            key="content_calendar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ContentCalendarView
              contents={contents}
              campaigns={campaigns}
              members={members}
              currentMember={currentMember}
              accessLevel={accessLevel}
              onSaveContent={handleSaveContent}
              onDeleteContent={handleDeleteContent}
            />
          </motion.div>
        )}


        {activeSubTab === 'metrics_analytics' && (
          <motion.div
            key="metrics_analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <MetricsAnalyticsView
              metrics={metrics}
              campaigns={campaigns}
              leads={leads}
              accessLevel={accessLevel}
              onSaveMetric={handleSaveMetric}
              onDeleteMetric={handleDeleteMetric}
            />
          </motion.div>
        )}

        {activeSubTab === 'links' && (
          <motion.div
            key="links"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PersonalLinksView
              currentMember={currentMember}
              members={members}
              moduleName="Marketing"
              accentColor="pink"
            />
          </motion.div>
        )}

        {activeSubTab === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PersonalNotesView
              currentMember={currentMember}
              members={members}
              moduleName="Marketing"
              accentColor="purple"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};
