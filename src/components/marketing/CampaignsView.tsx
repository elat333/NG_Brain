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
  AlertTriangle
} from 'lucide-react';
import { MarketingCampaign, Task, Project, TeamMember, Process } from '../../types';

interface CampaignsViewProps {
  campaigns: MarketingCampaign[];
  tasks: Task[];
  projects: Project[];
  members: TeamMember[];
  processes: Process[];
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
  const [campaignToDelete, setCampaignToDelete] = useState<MarketingCampaign | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<MarketingCampaign>>({});
  const [createLinkedProject, setCreateLinkedProject] = useState(true);

  // New task within campaign detail modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    memberId: string;
    category: string;
    taskTemplate: 'standard' | 'design_post' | 'design_carousel' | 'design_video';
    priority: 'baja' | 'media' | 'alta' | 'meteoric_crash';
    dueDate: string;
  }>({
    title: '',
    description: '',
    memberId: '',
    category: 'diseno_post',
    taskTemplate: 'design_post',
    priority: 'media',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const isReadOnly = accessLevel === 'lector';

  // Format Helper: Generate [AAMMDD] - [Nombre]
  const generateCampaignCode = (dateStr: string, name: string) => {
    if (!dateStr || !name) return '';
    try {
      const d = new Date(dateStr);
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const cleanName = name.trim();
      return `${yy}${mm}${dd} - ${cleanName}`;
    } catch {
      return name;
    }
  };

  const handleOpenCreate = () => {
    const mktProc = processes.find(p => p.id === 'proc-mkt' || p.name.toLowerCase().includes('marketing')) || processes[0];

    // Auto-detect Victoria or Marketing leader
    const victoriaMember = members.find(m => m.name.toLowerCase().includes('victoria'));
    const mktLeader = victoriaMember || members.find(m => 
      (m.moduleAccess?.marketing === 'lider' || m.moduleAccess?.marketing === 'administrador') &&
      (m.processId === 'proc-mkt' || (mktProc && m.processId === mktProc.id))
    ) || members.find(m =>
      m.moduleAccess?.marketing === 'lider' || m.moduleAccess?.marketing === 'administrador'
    ) || members.find(m =>
      m.processId === 'proc-mkt' || (mktProc && m.processId === mktProc.id)
    ) || members.find(m =>
      m.role?.toLowerCase().includes('marketing') || m.role?.toLowerCase().includes('lider') || m.role?.toLowerCase().includes('líder')
    ) || currentMember || members[0];

    setEditingCampaign({
      id: `camp-${Date.now()}`,
      name: '',
      code: '',
      description: '',
      objective: '' as any,
      status: 'planificacion',
      startDate: '',
      endDate: '',
      budget: 55, // Presupuesto por defecto: 55 USD
      spent: 0,
      targetAudience: '',
      channels: ['Meta Ads (FB/IG)', 'Google Ads'],
      city: 'Nacional / Ecuador',
      leaderMemberId: mktLeader?.id || '',
      processId: mktProc?.id || 'proc-mkt',
      targetKpis: {
        targetLeads: 50,
        targetSales: 5,
        targetCpl: 25,
        targetReach: 20000
      },
      notes: ''
    });
    setCreateLinkedProject(true);
    setIsEditingModalOpen(true);
  };

  const handleOpenEdit = (camp: MarketingCampaign) => {
    setEditingCampaign({ ...camp });
    // Si la campana ya tiene proyecto vinculado, se muestra el checklist seleccionado
    setCreateLinkedProject(!!camp.projectId);
    setIsEditingModalOpen(true);
  };

  const handleSaveCampaignSubmit = async (e: React.FormEvent) => {
    console.log('CampaignsView: handleSaveCampaignSubmit triggered');
    e.preventDefault();
    if (!editingCampaign.name) {
      console.log('CampaignsView: Validation failed. Name/Code missing.', editingCampaign);
      return;
    }

    const campaignCode = editingCampaign.code || editingCampaign.name;
    
    const finalCampaign: MarketingCampaign = {
      id: editingCampaign.id || `camp-${Date.now()}`,
      code: campaignCode,
      name: editingCampaign.name,
      description: editingCampaign.description || '',
      objective: (editingCampaign.objective as any) || '',
      status: editingCampaign.status || 'planificacion',
      startDate: editingCampaign.startDate || '',
      endDate: editingCampaign.endDate || '',
      budget: Number(editingCampaign.budget) ?? 55,
      spent: Number(editingCampaign.spent) || 0,
      targetAudience: editingCampaign.targetAudience || '',
      channels: editingCampaign.channels || ['Meta Ads (FB/IG)'],
      city: editingCampaign.city || 'Nacional',
      leaderMemberId: editingCampaign.leaderMemberId || '',
      processId: editingCampaign.processId || 'proc-mkt',
      projectId: editingCampaign.projectId || '',
      targetKpis: editingCampaign.targetKpis || {},
      notes: editingCampaign.notes || '',
      createdAt: editingCampaign.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const cleanFinalCampaign = deepCleanUndefined(finalCampaign);


    await onSaveCampaign(cleanFinalCampaign, createLinkedProject);
    setIsEditingModalOpen(false);

    // If detail is open for this campaign, refresh selection
    if (selectedCampaign?.id === finalCampaign.id) {
      setSelectedCampaign(finalCampaign);
    }
  };

  // Helper to ensure a campaign has a valid project ID
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

  const handleOpenNewTaskForCampaign = async () => {
    if (!selectedCampaign) return;
    const campProjectId = await ensureCampaignProject(selectedCampaign);
    const mktProc = processes.find(p => p.id === selectedCampaign.processId) || processes.find(p => p.id === 'proc-mkt') || processes[0];
    const campCode = selectedCampaign.code || selectedCampaign.name || 'CMP';
    const initialTaskTitle = `${campCode}_`;

    if (onOpenCreateTaskModal) {
      onOpenCreateTaskModal({
        title: initialTaskTitle,
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        dueDate: selectedCampaign.endDate || new Date().toISOString().split('T')[0],
        memberId: selectedCampaign.leaderMemberId || currentMember?.id || '',
        storyDescription: `Campaña ${selectedCampaign.code}: ${selectedCampaign.name}`,
        acceptanceCriteria: `Revisión y aprobación por el líder de la campaña ${selectedCampaign.code}`
      });
    } else {
      setTaskForm({
        title: initialTaskTitle,
        description: '',
        memberId: selectedCampaign.leaderMemberId || currentMember?.id || '',
        category: 'diseno',
        taskTemplate: 'standard',
        priority: 'media',
        dueDate: selectedCampaign.endDate || new Date().toISOString().split('T')[0]
      });
      setIsTaskModalOpen(true);
    }
  };

  const handleQuickAddPresetTask = async (presetType: 'post_estatico' | 'carrusel' | 'video' | 'copy' | 'pauta' | 'metricas') => {
    if (!selectedCampaign) return;

    const campProjectId = await ensureCampaignProject(selectedCampaign);
    const mktProc = processes.find(p => p.id === selectedCampaign.processId) || processes.find(p => p.id === 'proc-mkt') || processes[0];
    const targetDueDate = selectedCampaign.endDate || new Date().toISOString().split('T')[0];
    const targetMemberId = selectedCampaign.leaderMemberId || currentMember?.id || '';
    const campCode = selectedCampaign.code || selectedCampaign.name || 'CMP';

    if (presetType === 'post_estatico') {
      await onAddTaskForCampaign({
        title: `${campCode}_🖼️ Post Estático - ${selectedCampaign.name}`,
        description: `Diseñar arte de post estático (Feed 1:1 e Stories 9:16) para la campaña ${selectedCampaign.code}. Incluir elementos visuales de marca, llamada a la acción y titulares optimizados.`,
        status: 'backlog',
        priority: 'alta',
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        dueDate: targetDueDate,
        memberId: targetMemberId,
        storyDescription: `Como diseñador, crear el diseño de post estático para la campaña ${selectedCampaign.code}.`,
        acceptanceCriteria: 'Post estático aprobado en formatos oficiales con línea gráfica de Novagreen.',
        taskTemplate: 'design_post',
        plannedHours: 3,
        designData: {
          campaign: selectedCampaign.name,
          formats: 'Feed 1:1, Stories 9:16',
          elements: [
            { id: `el-1-${Date.now()}`, element: 'Imagen Principal', content: 'Creativo visual de alto impacto', visual: 'Fotografía/Render de alta calidad', observations: 'Cumplir guía de estilo de marca' },
            { id: `el-2-${Date.now()}`, element: 'Titular / Hook', content: selectedCampaign.name, visual: 'Tipografía destacada', observations: 'Llamado a la acción claro' }
          ],
          references: []
        }
      });
    } else if (presetType === 'carrusel') {
      await onAddTaskForCampaign({
        title: `${campCode}_📑 Carrusel Informativo - ${selectedCampaign.name}`,
        description: `Diseñar secuencia gráfica de carrusel (múltiples diapositivas/slides) para educar y convertir en la campaña ${selectedCampaign.code}.`,
        status: 'backlog',
        priority: 'alta',
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        dueDate: targetDueDate,
        memberId: targetMemberId,
        storyDescription: `Como diseñador, crear la secuencia visual de carrusel para la campaña ${selectedCampaign.code}.`,
        acceptanceCriteria: 'Carrusel completo con portada, diapositivas de valor y slide final de CTA aprobados.',
        taskTemplate: 'design_carousel',
        plannedHours: 5,
        designData: {
          campaign: selectedCampaign.name,
          formats: 'Carrusel 1:1 / 4:5',
          elements: [
            { id: `el-car-1-${Date.now()}`, slideIndex: 1, element: 'Slide 1 (Portada)', content: selectedCampaign.name, visual: 'Hook visual llamativo', observations: 'Generar curiosidad para deslizar' },
            { id: `el-car-2-${Date.now()}`, slideIndex: 2, element: 'Slide 2 (Problema/Contexto)', content: 'Punto de dolor o necesidad', visual: 'Gráfico explicativo', observations: 'Texto claro y conciso' },
            { id: `el-car-3-${Date.now()}`, slideIndex: 3, element: 'Slide 3 (Solución Novagreen)', content: 'Propuesta de valor y beneficios', visual: 'Demostración de producto', observations: 'Destacar diferenciales' },
            { id: `el-car-4-${Date.now()}`, slideIndex: 4, element: 'Slide 4 (Llamada a la Acción)', content: 'Contáctanos / Más información', visual: 'Logo e información de contacto', observations: 'Instrucción directa al usuario' }
          ],
          references: []
        }
      });
    } else if (presetType === 'video') {
      await onAddTaskForCampaign({
        title: `${campCode}_🎬 Video / Reel Promocional - ${selectedCampaign.name}`,
        description: `Grabación y edición de video dinámico en formato vertical (9:16) con subtítulos y audio para la campaña ${selectedCampaign.code}.`,
        status: 'backlog',
        priority: 'alta',
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        dueDate: targetDueDate,
        memberId: targetMemberId,
        storyDescription: `Como editor audiovisual, producir el reel dinámico para la campaña ${selectedCampaign.code}.`,
        acceptanceCriteria: 'Video vertical en alta resolución con subtítulos y audio nivelado.',
        taskTemplate: 'design_video',
        plannedHours: 6,
        designData: {
          campaign: selectedCampaign.name,
          formats: 'Vertical 9:16 (Reel / TikTok)',
          elements: [],
          videoScenes: [
            { id: `vs-1-${Date.now()}`, time: '0:00 - 0:03', stage: 'Gancho Visual / Hook', visual: 'Toma llamativa o problema común', onScreenText: '¿Buscas la mejor calidad?', voiceOver: 'Si buscas innovación y resultados...', observations: 'Música enérgica' },
            { id: `vs-2-${Date.now()}`, time: '0:03 - 0:10', stage: 'Desarrollo / Solución', visual: 'Demostración del producto o servicio', onScreenText: 'Conoce Novagreen', voiceOver: 'Descubre nuestra línea completa...', observations: 'Planos dinámicos' },
            { id: `vs-3-${Date.now()}`, time: '0:10 - 0:15', stage: 'Llamado a la Acción (CTA)', visual: 'Logo final y contacto', onScreenText: '¡Cotiza hoy mismo!', voiceOver: 'Contáctanos en el enlace.', observations: 'Animación final' }
          ],
          references: []
        }
      });
    } else if (presetType === 'copy') {
      await onAddTaskForCampaign({
        title: `${campCode}_✍️ Redacción de copys y guiones - ${selectedCampaign.name}`,
        description: `Redactar textos persuasivos para pauta digital, variaciones de titulares para A/B testing y guión para reels/videos explicativos.`,
        status: 'backlog',
        priority: 'media',
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        dueDate: targetDueDate,
        memberId: targetMemberId,
        storyDescription: `Como copywriter, redactar los textos persuasivos y llamados a la acción para la campaña ${selectedCampaign.code}.`,
        acceptanceCriteria: 'Copys aprobados con al menos 3 variaciones de ganchos y llamadas a la acción.',
        taskTemplate: 'standard',
        plannedHours: 2
      });
    } else if (presetType === 'pauta') {
      await onAddTaskForCampaign({
        title: `${campCode}_📱 Montaje y segmentación de anuncios en Ads Manager - ${selectedCampaign.name}`,
        description: `Configuración de públicos personalizados, segmentación geográfica en ${selectedCampaign.city || 'Ecuador'}, eventos de conversión de píxel y presupuesto diario.`,
        status: 'backlog',
        priority: 'alta',
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        dueDate: targetDueDate,
        memberId: targetMemberId,
        storyDescription: `Como especialista en tráfico pago, configurar y encender los anuncios en Meta/Google Ads para ${selectedCampaign.code}.`,
        acceptanceCriteria: 'Conjuntos de anuncios activos y optimizados con píxel verificado.',
        taskTemplate: 'standard',
        plannedHours: 3
      });
    } else if (presetType === 'metricas') {
      await onAddTaskForCampaign({
        title: `${campCode}_📊 Monitoreo de KPIs y optimización de CPL - ${selectedCampaign.name}`,
        description: `Revisión periódica de tasa de clics (CTR), costo por lead (CPL) y ajuste de presupuestos hacia los creativos más rentables.`,
        status: 'backlog',
        priority: 'media',
        projectId: campProjectId,
        processId: mktProc?.id || 'proc-mkt',
        dueDate: targetDueDate,
        memberId: targetMemberId,
        storyDescription: `Como analista de métricas, realizar seguimiento al rendimiento y CPL de la campaña ${selectedCampaign.code}.`,
        acceptanceCriteria: 'Dashboard y reporte de métricas actualizado con optimizaciones ejecutadas.',
        taskTemplate: 'standard',
        plannedHours: 2
      });
    }
  };

  const handleGenerateFullTaskPackage = async () => {
    if (!selectedCampaign) return;
    await handleQuickAddPresetTask('post_estatico');
    await handleQuickAddPresetTask('carrusel');
    await handleQuickAddPresetTask('video');
    await handleQuickAddPresetTask('copy');
    await handleQuickAddPresetTask('pauta');
    await handleQuickAddPresetTask('metricas');
  };

  const handleCustomTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !taskForm.title) return;

    const campProjectId = await ensureCampaignProject(selectedCampaign);
    const mktProc = processes.find(p => p.id === selectedCampaign.processId) || processes[0];
    const campCode = selectedCampaign.code || selectedCampaign.name || 'CMP';
    
    // Ensure the title starts with the campaign code and underscore if not already present
    let finalTitle = taskForm.title.trim();
    if (!finalTitle.startsWith(`${campCode}_`) && !finalTitle.startsWith(`${campCode} `)) {
      finalTitle = `${campCode}_${finalTitle}`;
    }

    const template = taskForm.taskTemplate || (
      taskForm.category === 'carrusel' ? 'design_carousel' :
      taskForm.category === 'video' ? 'design_video' :
      taskForm.category === 'diseno_post' ? 'design_post' : 'standard'
    );

    const initialDesignData = template === 'design_post' ? {
      campaign: selectedCampaign.name,
      formats: 'Feed 1:1, Stories 9:16',
      elements: [
        { id: `el-1-${Date.now()}`, element: 'Imagen Principal', content: 'Creativo visual de alto impacto', visual: 'Fotografía/Render de alta calidad', observations: 'Cumplir guía de estilo de marca' },
        { id: `el-2-${Date.now()}`, element: 'Titular / Hook', content: selectedCampaign.name, visual: 'Tipografía destacada', observations: 'Llamado a la acción claro' }
      ],
      references: []
    } : template === 'design_carousel' ? {
      campaign: selectedCampaign.name,
      formats: 'Carrusel 1:1 / 4:5',
      elements: [
        { id: `el-car-1-${Date.now()}`, slideIndex: 1, element: 'Slide 1 (Portada)', content: selectedCampaign.name, visual: 'Hook visual', observations: 'Portada' },
        { id: `el-car-2-${Date.now()}`, slideIndex: 2, element: 'Slide 2 (Contenido)', content: 'Detalle de valor', visual: 'Gráfico', observations: 'Contenido' },
        { id: `el-car-3-${Date.now()}`, slideIndex: 3, element: 'Slide 3 (CTA)', content: 'Llamada a la acción', visual: 'Logo y contacto', observations: 'Cierre' }
      ],
      references: []
    } : template === 'design_video' ? {
      campaign: selectedCampaign.name,
      formats: 'Vertical 9:16',
      elements: [],
      videoScenes: [
        { id: `vs-1-${Date.now()}`, time: '0:00 - 0:03', stage: 'Gancho / Hook', visual: 'Toma llamativa', onScreenText: selectedCampaign.name, voiceOver: '', observations: '' },
        { id: `vs-2-${Date.now()}`, time: '0:03 - 0:10', stage: 'Desarrollo', visual: 'Demostración', onScreenText: 'Conoce Novagreen', voiceOver: '', observations: '' },
        { id: `vs-3-${Date.now()}`, time: '0:10 - 0:15', stage: 'CTA', visual: 'Logo final', onScreenText: '¡Contáctanos!', voiceOver: '', observations: '' }
      ],
      references: []
    } : undefined;

    await onAddTaskForCampaign({
      title: finalTitle,
      description: taskForm.description,
      status: 'backlog',
      priority: taskForm.priority,
      projectId: campProjectId,
      processId: mktProc?.id || 'proc-mkt',
      dueDate: taskForm.dueDate,
      memberId: taskForm.memberId || currentMember?.id,
      storyDescription: `Tarea desglosada para la campaña ${selectedCampaign.code}`,
      taskTemplate: template,
      designData: initialDesignData
    });

    setIsTaskModalOpen(false);
    setTaskForm({
      title: '',
      description: '',
      memberId: '',
      category: 'diseno_post',
      taskTemplate: 'design_post',
      priority: 'media',
      dueDate: new Date().toISOString().split('T')[0]
    });
  };

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.targetAudience || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate campaign related tasks
  const getCampaignTasks = (camp: MarketingCampaign) => {
    return tasks.filter(t => 
      (camp.projectId && t.projectId === camp.projectId) ||
      (camp.code && t.storyDescription && t.storyDescription.includes(camp.code)) ||
      (camp.code && t.description && t.description.includes(camp.code)) ||
      (camp.code && t.title && t.title.includes(camp.code))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-ng-lime/20 flex items-center justify-center text-ng-black">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Campañas de Marketing & Ventas</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Nomenclatura [AAMMDD] - Sincronización automática con Proyectos y Tareas
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
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 font-bold focus:outline-none focus:ring-2 focus:ring-ng-lime w-64 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime"
          >
            <option value="todos">Todos los Estados</option>
            <option value="activa">Activas</option>
            <option value="planificacion">En Planificación</option>
            <option value="en_pausa">En Pausa</option>
            <option value="completada">Completadas</option>
          </select>

          {!isReadOnly && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md shadow-ng-lime/20 shrink-0"
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
          const campTasks = getCampaignTasks(camp);
          const completedTasks = campTasks.filter(t => t.status === 'done').length;
          const taskProgress = campTasks.length > 0 ? Math.round((completedTasks / campTasks.length) * 100) : 0;
          const budgetPercent = camp.budget > 0 ? Math.min(Math.round((camp.spent / camp.budget) * 100), 100) : 0;
          const leader = members.find(m => m.id === camp.leaderMemberId);
          const linkedProj = projects.find(p => p.id === camp.projectId);

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
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
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
                  <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-ng-green transition-colors">
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
                  {/* Task progress */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-500" /> Tareas ({completedTasks}/{campTasks.length})</span>
                      <span>{taskProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${taskProgress}%` }} />
                    </div>
                  </div>

                  {/* Budget progress */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <span className="flex items-center gap-1"><DollarSign size={11} className="text-blue-500" /> Presupuesto (${camp.spent} / ${camp.budget})</span>
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

                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Calendar size={12} />
                  <span>{camp.startDate}</span>
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

      {/* CAMPAIGN DETAIL MODAL / DRAWER */}
      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
            >
              {/* Drawer Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ng-lime text-ng-black flex items-center justify-center font-black">
                    <Target size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ng-lime font-black bg-white/10 px-2.5 py-0.5 rounded">
                        {selectedCampaign.code}
                      </span>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-white/20 rounded">
                        {selectedCampaign.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-black mt-1">{selectedCampaign.name}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isReadOnly && (
                    <button
                      onClick={() => handleOpenEdit(selectedCampaign)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all text-xs font-bold flex items-center gap-1.5"
                      title="Editar Campaña"
                    >
                      <Edit size={14} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* Meta Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Presupuesto</span>
                    <span className="text-lg font-black text-slate-800">${selectedCampaign.budget}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Gastado: ${selectedCampaign.spent}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Fechas</span>
                    <span className="text-xs font-black text-slate-800 block">{selectedCampaign.startDate}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">al {selectedCampaign.endDate}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Objetivo</span>
                    <span className="text-xs font-black text-slate-800 uppercase block">{selectedCampaign.objective}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Meta: {selectedCampaign.targetKpis?.targetLeads || 0} leads</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Proyecto Vinculado</span>
                    <span className="text-xs font-black text-blue-600 truncate block">
                      {projects.find(p => p.id === selectedCampaign.projectId)?.name || 'Sincronizado'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">✓ Enlace Activo</span>
                  </div>
                </div>

                {/* Strategy Notes & Audience */}
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-black uppercase text-[10px] tracking-wider">
                    <Sparkles size={14} className="text-blue-600" />
                    Público Objetivo & Estrategia
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    <strong>Audiencia:</strong> {selectedCampaign.targetAudience || 'Público general definido para el producto.'}
                  </p>
                  {selectedCampaign.notes && (
                    <p className="text-slate-600 font-medium leading-relaxed">
                      <strong>Estrategia:</strong> {selectedCampaign.notes}
                    </p>
                  )}
                </div>

                {/* TASK BREAKDOWN SECTION */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <FolderKanban size={18} className="text-ng-green" />
                        Tareas Operativas de la Campaña
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        Sincronizadas en tiempo real con el módulo y tablero general de Tareas
                      </p>
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleGenerateFullTaskPackage}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all"
                          title="Crear paquete estándar: Diseño, Copy, Video, Pauta y Métricas"
                        >
                          <Sparkles size={13} className="text-amber-500" />
                          Generar Paquete Estándar
                        </button>

                        <button
                          onClick={handleOpenNewTaskForCampaign}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ng-lime text-ng-black rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-sm"
                        >
                          <Plus size={14} />
                          Nueva Tarea
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preset Quick Buttons */}
                  {!isReadOnly && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 flex items-center pr-1">
                        + Añadir rápido:
                      </span>
                      <button
                        onClick={() => handleQuickAddPresetTask('post_estatico')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold border border-slate-200 shadow-2xs text-[11px] transition-colors"
                        title="Crear tarea con plantilla Post Estático en Backlog"
                      >
                        <Palette size={13} className="text-pink-500" /> Post Estático
                      </button>
                      <button
                        onClick={() => handleQuickAddPresetTask('carrusel')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold border border-slate-200 shadow-2xs text-[11px] transition-colors"
                        title="Crear tarea con plantilla Diseño Carrusel en Backlog"
                      >
                        <Layers size={13} className="text-indigo-500" /> Carrusel
                      </button>
                      <button
                        onClick={() => handleQuickAddPresetTask('video')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold border border-slate-200 shadow-2xs text-[11px] transition-colors"
                        title="Crear tarea con plantilla Diseño Video en Backlog"
                      >
                        <Video size={13} className="text-purple-500" /> Video
                      </button>
                      <button
                        onClick={() => handleQuickAddPresetTask('copy')}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold border border-slate-200 shadow-2xs text-[11px] transition-colors"
                      >
                        <PenTool size={13} className="text-amber-500" /> Copy
                      </button>
                      <button
                        onClick={() => handleQuickAddPresetTask('pauta')}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold border border-slate-200 shadow-2xs text-[11px] transition-colors"
                      >
                        <Share2 size={13} className="text-blue-500" /> Pauta
                      </button>
                      <button
                        onClick={() => handleQuickAddPresetTask('metricas')}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold border border-slate-200 shadow-2xs text-[11px] transition-colors"
                      >
                        <BarChart2 size={13} className="text-emerald-500" /> Métricas
                      </button>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {getCampaignTasks(selectedCampaign).map((t, tIdx) => {
                      const assignee = members.find(m => m.id === t.memberId);
                      const priorityColor: Record<string, string> = {
                        meteoric_crash: 'bg-red-500 text-white',
                        alta: 'bg-red-50 text-red-600 border-red-200',
                        media: 'bg-amber-50 text-amber-600 border-amber-200',
                        baja: 'bg-blue-50 text-blue-600 border-blue-200'
                      };

                      return (
                        <div
                          key={`mkt_camp_task_${t.id || tIdx}_${tIdx}`}
                          onClick={() => onOpenTask && onOpenTask(t)}
                          className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-2xl hover:border-ng-lime hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.status === 'done' ? 'bg-emerald-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-slate-800 truncate leading-snug">{t.title}</h5>
                              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{t.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${priorityColor[t.priority || 'media']}`}>
                              {t.priority || 'media'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 capitalize bg-slate-100 px-2 py-0.5 rounded">
                              {t.status}
                            </span>
                            {assignee && (
                              <img
                                src={assignee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee.name)}`}
                                alt={assignee.name}
                                title={assignee.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {getCampaignTasks(selectedCampaign).length === 0 && (
                      <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <FolderKanban size={32} className="mx-auto text-slate-300" />
                        <p className="text-xs font-bold text-slate-500">No hay tareas creadas para esta campaña todavía.</p>
                        <p className="text-[11px] text-slate-400">Usa los botones de arriba para generar las actividades de diseño, copy o pauta.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
                {!isReadOnly ? (
                  <button
                    onClick={() => {
                      setCampaignToDelete(selectedCampaign);
                    }}
                    className="flex items-center gap-1.5 text-red-500 hover:text-red-700 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    Eliminar Campaña
                  </button>
                ) : <div />}
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <AnimatePresence>
        {isEditingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-6 text-left max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-ng-lime text-ng-black">
                    <Target size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingCampaign.id?.startsWith('camp-') ? 'Nueva Campaña de Marketing' : 'Editar Campaña'}
                  </h3>
                </div>
                <button onClick={() => setIsEditingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCampaignSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Nombre / Código de la Campaña *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 260801 - ASÍ virtual, Paneles Novagreen Pro..."
                      value={editingCampaign.name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingCampaign(prev => ({ ...prev, name: val, code: val }));
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Descripción de la Campaña
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Campaña de captación y posicionamiento para sector industrial..."
                      value={editingCampaign.description || ''}
                      onChange={(e) => setEditingCampaign(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Objetivo
                    </label>
                    <select
                      value={editingCampaign.objective || ''}
                      onChange={(e) => setEditingCampaign(prev => ({ ...prev, objective: e.target.value as any }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="">-- Seleccionar objetivo --</option>
                      <option value="leads">Captación de Leads</option>
                      <option value="ventas">Ventas Directas</option>
                      <option value="branding">Branding / Reconocimiento</option>
                      <option value="engagement">Interacción / Engagement</option>
                      <option value="evento">Evento / Webinar</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Estado
                    </label>
                    <select
                      value={editingCampaign.status || 'planificacion'}
                      onChange={(e) => setEditingCampaign(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="planificacion">En Planificación</option>
                      <option value="activa">Activa</option>
                      <option value="en_pausa">En Pausa</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Responsable / Líder
                    </label>
                    <select
                      value={editingCampaign.leaderMemberId || ''}
                      onChange={(e) => setEditingCampaign(prev => ({ ...prev, leaderMemberId: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {members.map((m, mIdx) => (
                        <option key={`mkt_camp_resp_opt_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={editingCampaign.startDate || ''}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setEditingCampaign(prev => ({ ...prev, startDate: newStart }));
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      value={editingCampaign.endDate || ''}
                      onChange={(e) => setEditingCampaign(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Presupuesto ($ USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={editingCampaign.budget ?? 55}
                      onChange={(e) => setEditingCampaign(prev => ({ ...prev, budget: Number(e.target.value) }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Público Objetivo & Segmentación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gerentes de Operaciones y Directores de Planta en Quito y Guayaquil..."
                    value={editingCampaign.targetAudience || ''}
                    onChange={(e) => setEditingCampaign(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Notas y Estrategia de Campaña
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detalles sobre ofertas, webinars, landings o canales a priorizar..."
                    value={editingCampaign.notes || ''}
                    onChange={(e) => setEditingCampaign(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                {/* Sincronización con Proyectos toggle */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="text-emerald-600" size={20} />
                    <div>
                      <h5 className="text-xs font-black text-slate-800">Sincronizar en Módulo de Proyectos</h5>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Crea automáticamente un Proyecto con el nombre de la campaña para gestionar sus tareas y seguimiento.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={createLinkedProject}
                    onChange={(e) => setCreateLinkedProject(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    {!isReadOnly && editingCampaign.id && !editingCampaign.id.startsWith('camp-') && (
                      <button
                        type="button"
                        onClick={() => {
                          const original = campaigns.find(c => c.id === editingCampaign.id);
                          if (original) {
                            setCampaignToDelete(original);
                          }
                        }}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-700 font-bold text-xs px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                        Eliminar Campaña
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingModalOpen(false)}
                      className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md shadow-ng-lime/20"
                    >
                      Guardar Campaña
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE NEW TASK MODAL FOR CAMPAIGN */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-ng-lime text-ng-black">
                    <Plus size={16} />
                  </div>
                  <h4 className="text-base font-black text-slate-900">Nueva Tarea de Campaña</h4>
                </div>
                <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCustomTaskSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Título de la Tarea *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Diseño de artes, Edición de reel, Montaje de pauta..."
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Descripción / Entregables requeridos
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Especificaciones de formato, copys o enlaces necesarios..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Plantilla / Formato
                    </label>
                    <select
                      value={taskForm.taskTemplate}
                      onChange={(e) => setTaskForm(prev => ({ 
                        ...prev, 
                        taskTemplate: e.target.value as any,
                        category: e.target.value 
                      }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="design_post">🖼️ Post Estático</option>
                      <option value="design_carousel">📑 Carrusel Informativo</option>
                      <option value="design_video">🎬 Video / Reel</option>
                      <option value="standard">📝 Tarea Estándar / Copy / Pauta / Métricas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Responsable
                    </label>
                    <select
                      value={taskForm.memberId}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, memberId: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="">Seleccionar miembro...</option>
                      {members.map((m, mIdx) => (
                        <option key={`mkt_camp_task_m_opt_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Prioridad
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="meteoric_crash">Meteoric Crash ⚡</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Fecha de Entrega
                    </label>
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90"
                  >
                    Crear Tarea Sincronizada
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDelete = campaignToDelete.id;
                    setCampaignToDelete(null);
                    if (selectedCampaign?.id === idToDelete) {
                      setSelectedCampaign(null);
                    }
                    if (editingCampaign?.id === idToDelete) {
                      setIsEditingModalOpen(false);
                    }
                    await onDeleteCampaign(idToDelete);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-red-600/20 transition-all"
                >
                  <Trash2 size={15} />
                  Sí, eliminar campaña
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
