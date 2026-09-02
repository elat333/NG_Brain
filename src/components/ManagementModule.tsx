/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  BookOpen, 
  Target, 
  Sliders, 
  Send, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Settings2, 
  Tag, 
  Calendar, 
  User, 
  Flame, 
  TrendingUp, 
  HelpCircle, 
  RefreshCw, 
  ThumbsUp, 
  MessageSquare, 
  FileText,
  Lock,
  Eye,
  Check,
  X,
  Shield,
  Layers,
  ChevronRight,
  Info,
  Mic,
  MicOff,
  ArrowLeft,
  Maximize2,
  Save,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TeamMember, 
  Process, 
  ManagementNote, 
  ManagementStrategyData, 
  ManagementAIGovernanceData,  Task,
  AIStyleProfile, 
  ManagementChatMessage,
  SwotItem,
  OKRGoal,
  StrategicRisk,
  AIGuardrail,
  AICalibrationRecord
} from '../types';
import { sendManagementChatMessage } from '../services/aiService';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';

interface ManagementModuleProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  processes: Process[];
  notes: ManagementNote[];
  strategy: ManagementStrategyData;
  governance: ManagementAIGovernanceData;
  tasks?: Task[];
  onUpdateNotes: (notes: ManagementNote[]) => void;
  onUpdateStrategy: (strategy: ManagementStrategyData) => void;
  onUpdateGovernance: (governance: ManagementAIGovernanceData) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab?: 'consultant' | 'notes' | 'strategy' | 'governance' | 'links';
  setActiveSubTab?: (subTab: 'consultant' | 'notes' | 'strategy' | 'governance' | 'links') => void;
}

export default function ManagementModule({
  currentMember,
  members,
  processes,
  notes,
  strategy,
  governance,
  tasks,
  onUpdateNotes,
  onUpdateStrategy,
  onUpdateGovernance,
  accessLevel,
  activeSubTab: propActiveSubTab,
  setActiveSubTab: propSetActiveSubTab
}: ManagementModuleProps) {
  
  const [internalSubTab, setInternalSubTab] = useState<'consultant' | 'notes' | 'strategy' | 'governance' | 'links'>('consultant');
  
  const [marketingData, setMarketingData] = useState<any>({
    campaigns: [],
    contents: [],
    leads: [],
    metrics: []
  });

  useEffect(() => {
    let unsubCampaigns = () => {};
    let unsubContents = () => {};
    let unsubLeads = () => {};
    let unsubMetrics = () => {};

    try {
      const campCol = collection(db, 'marketing_campaigns');
      unsubCampaigns = onSnapshot(campCol, (snapshot) => {
        setMarketingData(prev => ({ ...prev, campaigns: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
      }, () => {});

      const contentCol = collection(db, 'marketing_contents');
      unsubContents = onSnapshot(contentCol, (snapshot) => {
        setMarketingData(prev => ({ ...prev, contents: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
      }, () => {});

      const leadsCol = collection(db, 'marketing_leads');
      unsubLeads = onSnapshot(leadsCol, (snapshot) => {
        setMarketingData(prev => ({ ...prev, leads: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
      }, () => {});
      
      const metricsCol = collection(db, 'marketing_metrics');
      unsubMetrics = onSnapshot(metricsCol, (snapshot) => {
        setMarketingData(prev => ({ ...prev, metrics: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
      }, () => {});

    } catch (error) {
      console.warn("Could not fetch marketing data for AI consultant context");
    }

    return () => {
      unsubCampaigns();
      unsubContents();
      unsubLeads();
      unsubMetrics();
    };
  }, []);

  const activeSubTab = propActiveSubTab !== undefined ? propActiveSubTab : internalSubTab;
  const setActiveSubTab = propSetActiveSubTab || setInternalSubTab;

  // --- State for Consultant Chat ---
  const [chatMessages, setChatMessages] = useState<ManagementChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Saludos, **${currentMember?.name || 'Gerente'}**. Soy su **Consultor y Asistente Ejecutivo de Gerencia** en Novagreen. Estoy configurado bajo su gobernanza en tono *${
        governance.tone === 'estructuracion_descripcion' ? 'Estructuración & Descripción de Empresa' :
        governance.tone === 'consultor_iso' ? 'Consultor de Gestión Integrada (ISO)' : 'Gobernanza, Riesgos & Estrategia'
      }*. ¿En qué tema estratégico o decisión de dirección trabajamos hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (activeSubTab === 'consultant') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeSubTab]);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRefreshingNotes, setIsRefreshingNotes] = useState(false);
  
  const handleRefreshNotes = () => {
    setIsRefreshingNotes(true);
    // Simular tiempo de sincronización para feedback visual del snapshot de Firebase
    setTimeout(() => setIsRefreshingNotes(false), 800);
  };

  const handleToggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Su navegador no soporta el dictado por voz directo. Se recomienda usar Google Chrome, Microsoft Edge o Safari.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = true;

      // Keep track of the initial query text when dictation starts
      const baseInputText = inputQuery.trim();

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentSessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentSessionTranscript += event.results[i][0].transcript;
        }
        
        const cleanSessionTranscript = currentSessionTranscript.trim();
        if (cleanSessionTranscript) {
          setInputQuery(baseInputText ? `${baseInputText} ${cleanSessionTranscript}` : cleanSessionTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Error al iniciar el reconocimiento de voz:', err);
      setIsListening(false);
    }
  };

  // --- State for Calibration Modal from Chat ---
  const [calibrationModalMessage, setCalibrationModalMessage] = useState<ManagementChatMessage | null>(null);
  const [calibrationCorrectionText, setCalibrationCorrectionText] = useState('');
  const [calibrationTopic, setCalibrationTopic] = useState('');

  // --- Custom Markdown Components for Rich Gemini Formatting ---
  const markdownComponents = {
    h1: ({ children }: any) => <h1 className="text-xl font-bold text-slate-900 mt-5 mb-2 pb-1 border-b border-slate-200">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-bold text-slate-800 mt-4 mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-base font-bold text-slate-800 mt-3 mb-1">{children}</h3>,
    p: ({ children }: any) => <p className="mb-3 leading-relaxed text-slate-700 text-sm whitespace-pre-wrap">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-sm text-slate-700">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 my-3 space-y-1.5 text-sm text-slate-700">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold text-slate-900">{children}</strong>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-3 text-slate-600 bg-indigo-50/50 py-2 rounded-r-xl text-sm">
        {children}
      </blockquote>
    ),
    code: ({ inline, children }: any) => inline 
      ? <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-200">{children}</code>
      : <code className="block bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto my-3">{children}</code>,
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">{children}</thead>,
    th: ({ children }: any) => <th className="p-3 border-r border-slate-200 last:border-r-0">{children}</th>,
    td: ({ children }: any) => <td className="p-3 border-b border-slate-100 border-r border-slate-200 last:border-r-0">{children}</td>
  };

  // --- State for Notes Subtab ---
  const [noteFilterCategory, setNoteFilterCategory] = useState<string>('todos');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineContent, setInlineContent] = useState('');
  const [inlineCategory, setInlineCategory] = useState<ManagementNote['category']>('general');
  const [inlineEditTab, setInlineEditTab] = useState<'editor' | 'preview'>('editor');

  // --- State for Strategy Subtab ---
  const [swotTab, setSwotTab] = useState<'fortaleza' | 'oportunidad' | 'debilidad' | 'amenaza'>('fortaleza');
  const [showSwotModal, setShowSwotModal] = useState(false);
  const [newSwotText, setNewSwotText] = useState('');
  const [newSwotImpact, setNewSwotImpact] = useState<'alto' | 'medio' | 'bajo'>('alto');
  const [newSwotStrategy, setNewSwotStrategy] = useState('');

  const [showOkrModal, setShowOkrModal] = useState(false);
  const [newOkrTitle, setNewOkrTitle] = useState('');
  const [newOkrDesc, setNewOkrDesc] = useState('');
  const [newOkrArea, setNewOkrArea] = useState('Estratégica');
  const [newOkrQuarter, setNewOkrQuarter] = useState('2026-Q3');
  const [newOkrTarget, setNewOkrTarget] = useState('100%');
  const [newOkrCurrent, setNewOkrCurrent] = useState('0%');

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [newRiskTitle, setNewRiskTitle] = useState('');
  const [newRiskDesc, setNewRiskDesc] = useState('');
  const [newRiskProb, setNewRiskProb] = useState<'alta' | 'media' | 'baja'>('media');
  const [newRiskImpact, setNewRiskImpact] = useState<'critico' | 'alto' | 'medio' | 'bajo'>('alto');
  const [newRiskMitigation, setNewRiskMitigation] = useState('');

  // Read-only guard
  
  const [editingProfile, setEditingProfile] = useState<AIStyleProfile | null>(null);
  const [localDirectives, setLocalDirectives] = useState(governance?.systemDirectives || '');
  
  const defaultProfiles: AIStyleProfile[] = [
    {
      id: 'estructuracion_descripcion',
      name: 'Estructuración & Descripción de Empresa',
      description: 'Enfocado en estructurar la empresa, describir sus procesos e interacciones entre áreas.',
      prompt: 'Enfócate en estructurar la empresa, describir detalladamente lo que hace Novagreen, analizar los procesos corporativos y cómo se interconectan e interactúan sus partes operativas y administrativas.',
      activeContexts: { notes: true, strategy: true, processes: true, members: true },
      activeGuardrails: governance.guardrails.map(g => g.id)
    },
    {
      id: 'consultor_iso',
      name: 'Consultor ISO & Gestión Integrada',
      description: 'Auditoría de procesos, trazabilidad, calidad y mejora continua bajo normas ISO.',
      prompt: 'Enmarca cada análisis bajo los principios de la Gestión Integrada de Calidad, Medio Ambiente y Seguridad (ISO 9001/14001/45001), trazabilidad, evidencia auditable y mejora continua.',
      activeContexts: { notes: true, strategy: false, processes: true, members: false },
      activeGuardrails: governance.guardrails.map(g => g.id)
    },
    {
      id: 'gobernanza_riesgos',
      name: 'Gobernanza, Riesgos & Estrategia',
      description: 'Supervisión de riesgos directivos, resiliencia financiera y control de OKRs.',
      prompt: 'Prioriza la matriz de riesgos directivos, resiliencia financiera, cumplimiento normativo y seguimiento riguroso de OKRs estratégicos.',
      activeContexts: { notes: true, strategy: true, processes: false, members: false },
      activeGuardrails: governance.guardrails.map(g => g.id)
    }
  ];

  const currentProfiles = governance.styleProfiles && governance.styleProfiles.length > 0 ? governance.styleProfiles : defaultProfiles;

  React.useEffect(() => { setLocalDirectives(governance?.systemDirectives || ''); }, [governance?.systemDirectives]);
  const isReadOnly = accessLevel === 'lector';
  const canEdit = accessLevel === 'colaborador' || accessLevel === 'lider' || accessLevel === 'administrador';

  // --- Chat Handlers ---
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ManagementChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsSending(true);

    try {
      const res = await sendManagementChatMessage({
        userQuery: textToSend,
        messages: chatMessages,
        notes,
        strategy,
        governance,
        members,
        processes,
        tasks: tasks || [],
        marketing: marketingData || {}
      });

      const aiMsg: ManagementChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedNote: res.suggestedNote,
        suggestedAction: res.suggestedAction
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Error en la consulta:** ${err.message || 'No se pudo completar el análisis del asistente.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenNote = (note: ManagementNote) => {
    setExpandedNoteId(note.id);
    setIsEditingInline(false);
    setInlineTitle(note.title);
    setInlineContent(note.content);
    setInlineCategory(note.category);
    setInlineEditTab('editor');
  };

  const handleSaveSuggestedNote = (suggested: { title: string; content: string; category: ManagementNote['category'] }) => {
    const newNote: ManagementNote = {
      id: `note-${Date.now()}`,
      title: suggested.title,
      content: suggested.content,
      category: suggested.category,
      tags: ['IA-Sugerida', 'Gerencia'],
      authorMemberId: currentMember?.id || 'ia-consultant',
      authorName: `${currentMember?.name || 'Gerencia'} (vía Consultor IA)`,
      isAiGenerated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onUpdateNotes([newNote, ...notes]);
    handleOpenNote(newNote);
    setActiveSubTab('notes');
  };

  const handleApplySuggestedAction = (action: { type: string; data: any }) => {
    if (action.type === 'add_swot' && action.data) {
      const item: SwotItem = {
        id: `swot-${Date.now()}`,
        category: action.data.category || 'fortaleza',
        text: action.data.text || 'Item estratégico sugerido',
        impactLevel: action.data.impactLevel || 'alto',
        strategy: action.data.strategy || ''
      };
      onUpdateStrategy({
        ...strategy,
        swotItems: [...strategy.swotItems, item],
        lastUpdated: new Date().toISOString()
      });
      setActiveSubTab('strategy');
    } else if (action.type === 'add_okr' && action.data) {
      const okr: OKRGoal = {
        id: `okr-${Date.now()}`,
        title: action.data.title || 'Objetivo Clave',
        description: action.data.description || '',
        objectiveArea: action.data.objectiveArea || 'Gerencia',
        progress: action.data.progress || 0,
        targetValue: action.data.targetValue || '100%',
        currentValue: action.data.currentValue || '0%',
        status: 'en_camino',
        quarter: '2026-Q3',
        keyResults: action.data.keyResults || []
      };
      onUpdateStrategy({
        ...strategy,
        okrGoals: [...strategy.okrGoals, okr],
        lastUpdated: new Date().toISOString()
      });
      setActiveSubTab('strategy');
    } else if (action.type === 'add_risk' && action.data) {
      const risk: StrategicRisk = {
        id: `risk-${Date.now()}`,
        title: action.data.title || 'Riesgo Identificado',
        description: action.data.description || '',
        probability: action.data.probability || 'media',
        impact: action.data.impact || 'alto',
        mitigationPlan: action.data.mitigationPlan || 'Evaluación de control directivo',
        status: 'identificado'
      };
      onUpdateStrategy({
        ...strategy,
        strategicRisks: [...strategy.strategicRisks, risk],
        lastUpdated: new Date().toISOString()
      });
      setActiveSubTab('strategy');
    }
  };

  // --- Calibration Feedback Handlers ---
  const handleSaveCalibrationCorrection = () => {
    if (!calibrationModalMessage || !calibrationCorrectionText.trim()) return;

    const record: AICalibrationRecord = {
      id: `calib-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      promptOrTopic: calibrationTopic || 'Respuesta de Chat',
      aiResponseSnippet: calibrationModalMessage.text.slice(0, 150) + '...',
      rating: 'needs_tuning',
      managerCorrection: calibrationCorrectionText.trim()
    };

    onUpdateGovernance({
      ...governance,
      calibrationHistory: [record, ...governance.calibrationHistory],
      updatedAt: new Date().toISOString()
    });

    setCalibrationModalMessage(null);
    setCalibrationCorrectionText('');
    setCalibrationTopic('');
  };

  // --- Inline Bitácora Document Handlers ---
  const handleCreateNewNoteInline = () => {
    const newNoteId = `note-${Date.now()}`;
    const newNote: ManagementNote = {
      id: newNoteId,
      title: 'Nueva Bitácora - Descripción de Empresa',
      content: `## Descripción General y Alcance
Describa aquí la estructura corporativa, los objetivos principales y los procesos de la empresa...

### Procesos Principales y Áreas Operativas
1. **Área Operativa / Producción:** Descripción de funciones e interacción.
2. **Gestión Directiva & Calidad:** Coordinación de estándares e indicadores.
3. **Comercial & Servicios:** Relación con clientes y proveedores.

---
> *Nota: Esta información será utilizada automáticamente por el Consultor IA para contextualizar sus recomendaciones.*`,
      category: 'general',
      tags: ['Gerencia', 'Estructuración'],
      authorMemberId: currentMember?.id || 'admin',
      authorName: currentMember?.name || 'Gerente Directivo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onUpdateNotes([newNote, ...notes]);
    setExpandedNoteId(newNoteId);
    setIsEditingInline(true);
    setInlineTitle(newNote.title);
    setInlineContent(newNote.content);
    setInlineCategory(newNote.category);
    setInlineEditTab('editor');
  };

  const handleSaveInlineNote = () => {
    if (!expandedNoteId || !inlineTitle.trim()) return;
    const updatedNotes = notes.map(n => {
      if (n.id === expandedNoteId) {
        return {
          ...n,
          title: inlineTitle.trim(),
          content: inlineContent,
          category: inlineCategory,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    onUpdateNotes(updatedNotes);
    setIsEditingInline(false);
  };

  const handleDeleteInlineNote = (idToDelete?: string) => {
    const targetId = idToDelete || expandedNoteId;
    if (!targetId) return;
    onUpdateNotes(notes.filter(n => n.id !== targetId));
    if (expandedNoteId === targetId) {
      setExpandedNoteId(null);
      setIsEditingInline(false);
    }
  };

  // --- Strategy Handlers ---
  const handleAddSwotItem = () => {
    if (!newSwotText.trim()) return;
    const item: SwotItem = {
      id: `swot-${Date.now()}`,
      category: swotTab,
      text: newSwotText.trim(),
      impactLevel: newSwotImpact,
      strategy: newSwotStrategy.trim()
    };
    onUpdateStrategy({
      ...strategy,
      swotItems: [...strategy.swotItems, item],
      lastUpdated: new Date().toISOString()
    });
    setNewSwotText('');
    setNewSwotStrategy('');
    setShowSwotModal(false);
  };

  const handleDeleteSwotItem = (id: string) => {
    onUpdateStrategy({
      ...strategy,
      swotItems: strategy.swotItems.filter(s => s.id !== id),
      lastUpdated: new Date().toISOString()
    });
  };

  const handleAddOkr = () => {
    if (!newOkrTitle.trim()) return;
    const okr: OKRGoal = {
      id: `okr-${Date.now()}`,
      title: newOkrTitle.trim(),
      description: newOkrDesc.trim(),
      objectiveArea: newOkrArea,
      progress: 0,
      targetValue: newOkrTarget,
      currentValue: newOkrCurrent,
      quarter: newOkrQuarter,
      status: 'en_camino',
      keyResults: []
    };
    onUpdateStrategy({
      ...strategy,
      okrGoals: [...strategy.okrGoals, okr],
      lastUpdated: new Date().toISOString()
    });
    setNewOkrTitle('');
    setNewOkrDesc('');
    setShowOkrModal(false);
  };

  const handleUpdateOkrProgress = (id: string, newProgress: number) => {
    const updated = strategy.okrGoals.map(o => {
      if (o.id === id) {
        let status: OKRGoal['status'] = 'en_camino';
        if (newProgress >= 100) status = 'logrado';
        else if (newProgress < 30) status = 'en_riesgo';
        return { ...o, progress: newProgress, status };
      }
      return o;
    });
    onUpdateStrategy({ ...strategy, okrGoals: updated, lastUpdated: new Date().toISOString() });
  };

  const handleDeleteOkr = (id: string) => {
    onUpdateStrategy({
      ...strategy,
      okrGoals: strategy.okrGoals.filter(o => o.id !== id),
      lastUpdated: new Date().toISOString()
    });
  };

  const handleAddRisk = () => {
    if (!newRiskTitle.trim()) return;
    const risk: StrategicRisk = {
      id: `risk-${Date.now()}`,
      title: newRiskTitle.trim(),
      description: newRiskDesc.trim(),
      probability: newRiskProb,
      impact: newRiskImpact,
      mitigationPlan: newRiskMitigation.trim(),
      status: 'identificado'
    };
    onUpdateStrategy({
      ...strategy,
      strategicRisks: [...strategy.strategicRisks, risk],
      lastUpdated: new Date().toISOString()
    });
    setNewRiskTitle('');
    setNewRiskDesc('');
    setNewRiskMitigation('');
    setShowRiskModal(false);
  };

  const handleDeleteRisk = (id: string) => {
    onUpdateStrategy({
      ...strategy,
      strategicRisks: strategy.strategicRisks.filter(r => r.id !== id),
      lastUpdated: new Date().toISOString()
    });
  };

  // --- Governance Toggles ---
  const handleToggleGuardrail = (id: string) => {
    const updated = governance.guardrails.map(g => g.id === id ? { ...g, isEnabled: !g.isEnabled } : g);
    onUpdateGovernance({ ...governance, guardrails: updated, updatedAt: new Date().toISOString() });
  };

  const handleAddCustomGuardrail = () => {
    const title = prompt('Ingrese el nombre de la regla anti-alucinación / directiva:');
    if (!title?.trim()) return;
    const desc = prompt('Ingrese la descripción precisa de la regla que la IA debe cumplir:');
    if (!desc?.trim()) return;

    const newGuardrail: AIGuardrail = {
      id: `guard-${Date.now()}`,
      title: title.trim(),
      ruleDescription: desc.trim(),
      isEnabled: true,
      category: 'anti_alucinacion'
    };

    onUpdateGovernance({
      ...governance,
      guardrails: [...governance.guardrails, newGuardrail],
      updatedAt: new Date().toISOString()
    });
  };

  // Filtered Notes
  const filteredNotes = notes.filter(n => {
    const matchesCategory = noteFilterCategory === 'todos' || n.category === noteFilterCategory;
    const matchesQuery = !noteSearchQuery || 
      n.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(noteSearchQuery.toLowerCase())));
    return matchesCategory && matchesQuery;
  });

  return (
    <div className={`w-full max-w-7xl mx-auto ${activeSubTab === 'consultant' ? 'h-full flex flex-col' : 'space-y-4 pb-6'}`}>
      {/* --- SUBTAB 1: CONSULTOR & ASISTENTE IA --- */}
      {activeSubTab === 'consultant' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Left Panel: Active AI Controls & Quick Prompts */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-600" />
                  Calibración Actual
                </h3>
                <button
                  onClick={() => setActiveSubTab('governance')}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                  title="Configurar Perfiles"
                >
                  Ver Perfiles
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-slate-500 block mb-1">Perfiles de consultor:</span>
                  <select
                    className="w-full bg-white border border-indigo-200 rounded-lg py-1.5 px-2 text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={governance.tone}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      onUpdateGovernance({ ...governance, tone: e.target.value as any, updatedAt: new Date().toISOString() });
                    }}
                  >
                    {currentProfiles.map((p, pIdx) => (
                      <option key={`mgmt_prof_opt_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">Guardrails Anti-Alucinación:</span>
                  <span className="font-medium text-slate-700 block">
                    {governance.guardrails.filter(g => g.isEnabled).length} de {governance.guardrails.length} Reglas Activas
                  </span>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <span className="font-semibold block mb-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Contexto de Base
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Sincronizado con {notes.length} notas de bitácora y matriz de estrategia corporativa.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Preguntas Ejecutivas Rápidas
              </h3>

              <div className="space-y-2 text-xs">
                <button
                  id="btn-prompt-estado-estrategico"
                  onClick={() => handleSendMessage('¿Cuál es la evaluación actual de nuestro avance en OKRs y qué riesgos debemos atender de inmediato?')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
                >
                  📊 Evaluar avance de OKRs y matriz de riesgos
                </button>

                <button
                  id="btn-prompt-foda"
                  onClick={() => handleSendMessage('Revisa nuestras notas y dame una actualización sugerida de la matriz FODA para el comité gerencial.')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
                >
                  🎯 Sugerir actualización de FODA estratégica
                </button>

                <button
                  id="btn-prompt-sintesis-bitacora"
                  onClick={() => handleSendMessage('Sintetiza las últimas notas de la bitácora en un resumen de acuerdos clave y decisiones tomadas.')}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
                >
                  📝 Sintetizar bitácora ejecutiva reciente
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Chat Stream */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-0">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Consultor Ejecutivo IA</h3>
                  <p className="text-xs text-slate-500">Respuesta contextualizada con parámetros de gobernanza y guardrails activos</p>
                </div>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200">
                Gobernanza Activa
              </span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.map((msg, mIdx) => (
                <div
                  key={`mgmt_chat_msg_${msg.id || mIdx}_${mIdx}`}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-none'
                      }`}
                    >
                      {msg.sender === 'assistant' ? (
                        <div className="prose prose-indigo max-w-none text-sm leading-relaxed">
                          <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      )}

                      <div className={`text-[10px] mt-2 flex items-center gap-1 ${msg.sender === 'user' ? 'text-indigo-200 justify-end' : 'text-slate-400'}`}>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* AI Actions attached to response */}
                    {msg.sender === 'assistant' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {msg.suggestedNote && (
                          <button
                            id={`btn-save-note-${msg.id}`}
                            onClick={() => handleSaveSuggestedNote(msg.suggestedNote!)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Guardar en Bitácora: "{msg.suggestedNote.title}"</span>
                          </button>
                        )}

                        {msg.suggestedAction && (
                          <button
                            id={`btn-apply-action-${msg.id}`}
                            onClick={() => handleApplySuggestedAction(msg.suggestedAction!)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Aplicar a Matriz Estratégica ({msg.suggestedAction.type.replace('add_', '').toUpperCase()})</span>
                          </button>
                        )}

                        <button
                          id={`btn-calibrate-${msg.id}`}
                          onClick={() => {
                            setCalibrationModalMessage(msg);
                            setCalibrationTopic('Respuesta sobre: ' + msg.text.slice(0, 40));
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                          title="Calibrar respuesta de la IA si requirió corrección"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Calibrar Respuesta</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex gap-3 items-center text-slate-500 text-xs italic">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>El Consultor IA está analizando los guardrails y el contexto corporativo...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isListening) setIsListening(false);
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1 flex items-center">
                  <input
                    id="input-gerencia-chat"
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={isListening ? "Escuchando dictado ejecutivo..." : "Escriba su consulta o dictado ejecutivo..."}
                    disabled={isSending}
                    className={`w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white transition-all ${
                      isListening
                        ? 'border-red-400 ring-2 ring-red-300 text-red-900 font-medium placeholder-red-400'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    id="btn-voice-dictate-gerencia"
                    onClick={handleToggleListening}
                    title={isListening ? "Detener dictado por voz" : "Dictar por voz al Consultor IA"}
                    className={`absolute right-2 p-1.5 rounded-lg transition-all ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                        : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  id="btn-send-gerencia-chat"
                  type="submit"
                  disabled={isSending || !inputQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>

              {isListening && (
                <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1.5 px-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  <span>Micrófono activo: Dictando instrucción al Consultor IA... Hable con claridad.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: BITÁCORA Y NOTAS OBSIDIAN --- */}
      {activeSubTab === "notes" && (
        <motion.div
          key="management_notes_tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full"
        >
          <PersonalNotesView
            currentMember={currentMember}
            members={members}
            moduleName="Gestión Gerencial"
            accentColor="indigo"
          />
        </motion.div>
      )}

      {/* --- SUBTAB 3: ESTRATEGIA & OBJETIVOS --- */}
      {activeSubTab === 'strategy' && (
        <div className="space-y-8">
          {/* Section 1: FODA / SWOT */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Matriz Estratégica FODA / PESTEL
                </h3>
                <p className="text-xs text-slate-500">Diagnóstico interno y externo del entorno empresarial</p>
              </div>

              {canEdit && (
                <button
                  id="btn-add-swot"
                  onClick={() => setShowSwotModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Elemento FODA</span>
                </button>
              )}
            </div>

            {/* SWOT Quadrants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fortalezas */}
              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Fortalezas Internas ({strategy.swotItems.filter(s => s.category === 'fortaleza').length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {strategy.swotItems.filter(s => s.category === 'fortaleza').map((item, idx) => (
                    <div key={`mgmt_swot_f_${item.id || idx}_${idx}`} className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs flex items-start justify-between gap-2">
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-semibold block">{item.text}</span>
                        {item.strategy && <span className="text-[11px] text-emerald-700 block mt-1">Estrategia: {item.strategy}</span>}
                      </div>
                      {canEdit && (
                        <button onClick={() => handleDeleteSwotItem(item.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Oportunidades */}
              <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sky-900 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    Oportunidades de Mercado ({strategy.swotItems.filter(s => s.category === 'oportunidad').length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {strategy.swotItems.filter(s => s.category === 'oportunidad').map((item, idx) => (
                    <div key={`mgmt_swot_o_${item.id || idx}_${idx}`} className="p-3 bg-white rounded-xl border border-sky-100 shadow-2xs flex items-start justify-between gap-2">
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-semibold block">{item.text}</span>
                        {item.strategy && <span className="text-[11px] text-sky-700 block mt-1">Estrategia: {item.strategy}</span>}
                      </div>
                      {canEdit && (
                        <button onClick={() => handleDeleteSwotItem(item.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Debilidades */}
              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Debilidades a Corregir ({strategy.swotItems.filter(s => s.category === 'debilidad').length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {strategy.swotItems.filter(s => s.category === 'debilidad').map((item, idx) => (
                    <div key={`mgmt_swot_d_${item.id || idx}_${idx}`} className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs flex items-start justify-between gap-2">
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-semibold block">{item.text}</span>
                        {item.strategy && <span className="text-[11px] text-amber-700 block mt-1">Plan de Mejora: {item.strategy}</span>}
                      </div>
                      {canEdit && (
                        <button onClick={() => handleDeleteSwotItem(item.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenazas */}
              <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-600" />
                    Amenazas Externas ({strategy.swotItems.filter(s => s.category === 'amenaza').length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {strategy.swotItems.filter(s => s.category === 'amenaza').map((item, idx) => (
                    <div key={`mgmt_swot_a_${item.id || idx}_${idx}`} className="p-3 bg-white rounded-xl border border-rose-100 shadow-2xs flex items-start justify-between gap-2">
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-semibold block">{item.text}</span>
                        {item.strategy && <span className="text-[11px] text-rose-700 block mt-1">Mitigación: {item.strategy}</span>}
                      </div>
                      {canEdit && (
                        <button onClick={() => handleDeleteSwotItem(item.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: OKRs & Objectives */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  Cuadro de Mandos & Objetivos Clave (OKRs)
                </h3>
                <p className="text-xs text-slate-500">Supervisión trimestral de metas directivas</p>
              </div>

              {canEdit && (
                <button
                  id="btn-add-okr"
                  onClick={() => setShowOkrModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Objetivo OKR</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategy.okrGoals.map((okr, oIdx) => (
                <div key={`mgmt_okr_${okr.id || oIdx}_${oIdx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {okr.objectiveArea} • {okr.quarter}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">{okr.title}</h4>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      okr.status === 'logrado' ? 'bg-emerald-100 text-emerald-800' :
                      okr.status === 'en_riesgo' ? 'bg-rose-100 text-rose-800' :
                      'bg-sky-100 text-sky-800'
                    }`}>
                      {okr.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{okr.description}</p>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Progreso Actual: {okr.currentValue} / Meta: {okr.targetValue}</span>
                      <span>{okr.progress}%</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          okr.progress >= 100 ? 'bg-emerald-500' :
                          okr.progress < 30 ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, okr.progress))}%` }}
                      />
                    </div>
                  </div>

                  {canEdit && (
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-500">
                        <span>Ajustar %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={okr.progress}
                          onChange={(e) => handleUpdateOkrProgress(okr.id, parseInt(e.target.value) || 0)}
                          className="w-14 px-2 py-0.5 rounded border border-slate-300 bg-white font-medium"
                        />
                      </div>

                      <button onClick={() => handleDeleteOkr(okr.id)} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Strategic Risks */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Mapa de Riesgos Directivos & Mitigación
                </h3>
                <p className="text-xs text-slate-500">Supervisión de contingencias operativas e institucionales</p>
              </div>

              {canEdit && (
                <button
                  id="btn-add-risk"
                  onClick={() => setShowRiskModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Riesgo</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategy.strategicRisks.map((risk, rIdx) => (
                <div key={`mgmt_risk_${risk.id || rIdx}_${rIdx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">{risk.title}</h4>
                    <div className="flex gap-1 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        Prob: {risk.probability}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
                        Impacto: {risk.impact}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">{risk.description}</p>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-700 block mb-0.5">Plan de Mitigación Directiva:</span>
                    <span className="text-slate-600">{risk.mitigationPlan}</span>
                  </div>

                  {canEdit && (
                    <div className="flex justify-end pt-1">
                      <button onClick={() => handleDeleteRisk(risk.id)} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 4: GOBERNANZA & CALIBRACIÓN IA --- */}
      {activeSubTab === 'governance' && (
        <div className="space-y-8">
          {/* Dynamic Tone & Style Selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 relative">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                  Perfiles de Consultores IA
                </h3>
                <p className="text-xs text-slate-500">Seleccione el perfil o cree uno nuevo con contextos y reglas específicas</p>
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => setEditingProfile({
                    id: `profile-${Date.now()}`,
                    name: 'Nuevo Consultor',
                    description: '',
                    prompt: '',
                    activeContexts: { strategy: true, processes: true, members: true },
                    selectedNotes: [],
                    activeGuardrails: governance.guardrails.map(g => g.id)
                  })}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo Perfil
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {currentProfiles.map((profile, pIdx) => (
                <div
                  key={`mgmt_prof_card_${profile.id || pIdx}_${pIdx}`}
                  className={`relative flex flex-col p-4 rounded-2xl text-left border transition-all ${
                    governance.tone === profile.id
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    disabled={isReadOnly}
                    onClick={() => onUpdateGovernance({ ...governance, tone: profile.id, styleProfiles: currentProfiles, updatedAt: new Date().toISOString() })}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 text-sm">{profile.name}</span>
                      {governance.tone === profile.id && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{profile.description || "Sin descripción"}</p>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {profile.activeContexts.strategy && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Estrategia</span>}
                      {profile.activeContexts.processes && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Procesos</span>}
                      {profile.activeContexts.members && <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">Equipo</span>}
                      {profile.activeContexts.tasks && <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Tareas</span>}
                      {profile.activeContexts.marketing && <span className="text-[10px] bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded">Marketing</span>}
                      {profile.selectedNotes && profile.selectedNotes.length > 0 && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">{profile.selectedNotes.length} Notas</span>}
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">{profile.activeGuardrails.length} reglas</span>
                    </div>
                  </button>
                  
                  {!isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProfile(profile);
                      }}
                      className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                      title="Editar perfil"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gemini AI Model Selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Modelo de Inteligencia Artificial Gemini
              </h3>
              <p className="text-xs text-slate-500">
                Seleccione la versión del motor Gemini recomendada para procesar sus consultas ejecutivas
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {[
                { 
                  id: 'gemini-2.5-flash', 
                  title: 'Gemini 2.5 Flash', 
                  badge: 'Recomendado (Rápido)', 
                  desc: 'Motor predeterminado ultrarrápido y multimodal con excelente razonamiento para análisis directivo en tiempo real.' 
                },
                { 
                  id: 'gemini-2.5-pro', 
                  title: 'Gemini 2.5 Pro', 
                  badge: 'Razonamiento Complejo', 
                  desc: 'Ideal para auditorías profundas, planificación financiera compleja y síntesis de matrices multidimensionales.' 
                }
              ].map((modelItem, mIdx) => {
                const isSelected = (governance.selectedModel || 'gemini-2.5-flash') === modelItem.id;
                return (
                  <button
                    key={`mgmt_model_${modelItem.id}_${mIdx}`}
                    disabled={isReadOnly}
                    onClick={() => onUpdateGovernance({ ...governance, selectedModel: modelItem.id, updatedAt: new Date().toISOString() })}
                    className={`p-4 rounded-2xl text-left border transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 text-sm">{modelItem.title}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <span className={`inline-block px-2 py-0.5 mb-2 rounded text-[10px] font-extrabold ${
                      isSelected ? 'bg-indigo-200/60 text-indigo-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {modelItem.badge}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">{modelItem.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Directives / System Instruction Prompt */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Directivas Maestras de la Gerencia (System Prompt Custom)
              </h3>
              <p className="text-xs text-slate-500">
                Instrucciones permanentes de la empresa que la IA incorporará obligatoriamente en cada respuesta.
              </p>
            </div>

            <textarea
              id="textarea-system-directives"
              rows={4}
              disabled={isReadOnly}
              value={governance.systemDirectives}
              onChange={(e) => onUpdateGovernance({ ...governance, systemDirectives: e.target.value, updatedAt: new Date().toISOString() })}
              placeholder="Ejemplo: Priorizar la norma ISO 9001 de calidad. Exigir siempre justificación de costos en recomendaciones de proveedores..."
              className="w-full p-4 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-slate-50"
            />
          </div>

          {/* Anti-Hallucination Guardrails */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Reglas Anti-Alucinación & Guardrails
                </h3>
                <p className="text-xs text-slate-500">Restricciones lógicas activables para garantizar respuestas certeras</p>
              </div>

              {canEdit && (
                <button
                  id="btn-add-guardrail"
                  onClick={handleAddCustomGuardrail}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Regla</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {governance.guardrails.map((guard, gIdx) => (
                <div key={`mgmt_guard_${guard.id || gIdx}_${gIdx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{guard.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{guard.ruleDescription}</p>
                  </div>

                  <button
                    disabled={isReadOnly}
                    onClick={() => handleToggleGuardrail(guard.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      guard.isEnabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {guard.isEnabled ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Calibration History */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                Historial de Calibración & Correcciones en Tiempo Real
              </h3>
              <p className="text-xs text-slate-500">
                Correcciones realizadas por el gerente que la IA utiliza para retroalimentar sus respuestas futuras.
              </p>
            </div>

            {governance.calibrationHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay registros de calibración directiva guardados.</p>
            ) : (
              <div className="space-y-3">
                {governance.calibrationHistory.map((rec, recIdx) => (
                  <div key={`mgmt_calib_${rec.id || recIdx}_${recIdx}`} className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-amber-900 font-semibold">
                      <span>{rec.promptOrTopic}</span>
                      <span className="text-[10px] text-amber-700">{rec.timestamp}</span>
                    </div>
                    <p className="text-slate-700"><strong>Corrección Directiva:</strong> {rec.managerCorrection}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}



      {/* --- MODAL: Add SWOT Item --- */}
      {showSwotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Agregar Elemento FODA</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={swotTab}
                  onChange={(e) => setSwotTab(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="fortaleza">Fortaleza Interna</option>
                  <option value="oportunidad">Oportunidad de Mercado</option>
                  <option value="debilidad">Debilidad Interna</option>
                  <option value="amenaza">Amenaza Externa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={newSwotText}
                  onChange={(e) => setNewSwotText(e.target.value)}
                  placeholder="Ej: Liderazgo en certificaciones ISO en la región"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estrategia o Acción Asociada</label>
                <input
                  type="text"
                  value={newSwotStrategy}
                  onChange={(e) => setNewSwotStrategy(e.target.value)}
                  placeholder="Ej: Explotar en propuesta comercial para ganar licitaciones"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSwotModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSwotItem}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add OKR --- */}
      {showOkrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Nuevo Objetivo Clave (OKR)</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Objetivo</label>
                <input
                  type="text"
                  value={newOkrTitle}
                  onChange={(e) => setNewOkrTitle(e.target.value)}
                  placeholder="Ej: Expandir cobertura operacional con cero hallazgos ISO"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Área / Proceso</label>
                <input
                  type="text"
                  value={newOkrArea}
                  onChange={(e) => setNewOkrArea(e.target.value)}
                  placeholder="Ej: Calidad y Operaciones"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Actual</label>
                  <input
                    type="text"
                    value={newOkrCurrent}
                    onChange={(e) => setNewOkrCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Meta</label>
                  <input
                    type="text"
                    value={newOkrTarget}
                    onChange={(e) => setNewOkrTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOkrModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddOkr}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Guardar OKR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Risk --- */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Registrar Riesgo Directivo</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Riesgo</label>
                <input
                  type="text"
                  value={newRiskTitle}
                  onChange={(e) => setNewRiskTitle(e.target.value)}
                  placeholder="Ej: Interrupción de cadena de suministros"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Probabilidad</label>
                  <select
                    value={newRiskProb}
                    onChange={(e) => setNewRiskProb(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Impacto</label>
                  <select
                    value={newRiskImpact}
                    onChange={(e) => setNewRiskImpact(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="critico">Crítico</option>
                    <option value="alto">Alto</option>
                    <option value="medio">Medio</option>
                    <option value="bajo">Bajo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan de Mitigación</label>
                <textarea
                  rows={3}
                  value={newRiskMitigation}
                  onChange={(e) => setNewRiskMitigation(e.target.value)}
                  placeholder="Describa la acción preventiva o de contingencia..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRiskModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddRisk}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Guardar Riesgo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Calibration Feedback Form --- */}
      {calibrationModalMessage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600">
              <Settings2 className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-800">Calibración & Corrección Directiva</h3>
            </div>

            <p className="text-xs text-slate-500">
              Proporcione la directiva o corrección precisa. La IA adaptará sus algoritmos y guardrails en tiempo real.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 line-clamp-3">
              "{calibrationModalMessage.text}"
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Directiva de Corrección del Gerente</label>
              <textarea
                rows={4}
                value={calibrationCorrectionText}
                onChange={(e) => setCalibrationCorrectionText(e.target.value)}
                placeholder="Ej: Para proyecciones operativas, considerar siempre el factor de contingencia del 15%..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCalibrationModalMessage(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCalibrationCorrection}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Guardar Corrección en Tiempo Real
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Profile Editor Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {currentProfiles.some(p => p.id === editingProfile.id) ? 'Editar Perfil de Consultor' : 'Nuevo Perfil de Consultor'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Perfil</label>
                <input
                  type="text"
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Breve</label>
                <input
                  type="text"
                  value={editingProfile.description}
                  onChange={(e) => setEditingProfile({ ...editingProfile, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prompt / Instrucción Base (Directiva del Asistente)</label>
                <textarea
                  value={editingProfile.prompt}
                  onChange={(e) => setEditingProfile({ ...editingProfile, prompt: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono bg-slate-50"
                  placeholder="Ej: Eres un consultor experto en legal..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Contextos Base Adicionales</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(editingProfile.activeContexts).map((ctxKey, cIdx) => {
                    const labels: any = {
                      strategy: 'Matriz Estratégica',
                      processes: 'Procesos',
                      members: 'Equipo',
                      tasks: 'Tareas Activas',
                      marketing: 'Info. Marketing'
                    };
                    return (
                    <label key={`mgmt_ctx_${ctxKey}_${cIdx}`} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={(editingProfile.activeContexts as any)[ctxKey]}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          activeContexts: { ...editingProfile.activeContexts, [ctxKey]: e.target.checked }
                        })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium truncate">{labels[ctxKey] || ctxKey}</span>
                    </label>
                  )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Notas de Bitácora Vinculadas</span>
                  <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{(editingProfile.selectedNotes || []).length} seleccionadas</span>
                </label>
                
                <div className="mb-3 flex gap-2">
                  <select 
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                    onChange={(e) => {
                      const noteId = e.target.value;
                      if (noteId && !(editingProfile.selectedNotes || []).includes(noteId)) {
                        setEditingProfile({ ...editingProfile, selectedNotes: [...(editingProfile.selectedNotes || []), noteId] });
                      }
                      e.target.value = ""; // reset
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Seleccionar una nota de la bitácora para agregar...</option>
                    {notes.filter(n => !(editingProfile.selectedNotes || []).includes(n.id)).map((note, nIdx) => (
                      <option key={`mgmt_note_opt_${note.id || nIdx}_${nIdx}`} value={note.id}>{note.title} ({note.category})</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-40 overflow-y-auto border rounded-xl p-2 bg-slate-50 space-y-1">
                  {(editingProfile.selectedNotes || []).map((noteId, nIdx) => {
                    const note = notes.find(n => n.id === noteId);
                    if (!note) return null;
                    return (
                      <div key={`mgmt_note_sel_${noteId}_${nIdx}`} className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex-1 truncate">
                          <span className="text-xs font-bold text-slate-800 block truncate">{note.title}</span>
                          <span className="text-[10px] text-slate-500 truncate block capitalize">{note.category}</span>
                        </div>
                        <button
                          onClick={() => {
                            const newNotes = (editingProfile.selectedNotes || []).filter(id => id !== noteId);
                            setEditingProfile({ ...editingProfile, selectedNotes: newNotes });
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                          title="Quitar nota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {(editingProfile.selectedNotes || []).length === 0 && (
                    <span className="text-xs text-slate-500 p-2 block text-center">No has agregado ninguna nota a este consultor.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Reglas Anti-alucinación Vinculadas</label>
                <div className="max-h-40 overflow-y-auto border rounded-xl p-2 bg-slate-50 space-y-1">
                  {governance.guardrails.map((g, gIdx) => (
                    <label key={`mgmt_modal_guard_${g.id || gIdx}_${gIdx}`} className="flex items-start gap-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={editingProfile.activeGuardrails.includes(g.id)}
                        onChange={(e) => {
                          const newGuards = e.target.checked 
                            ? [...editingProfile.activeGuardrails, g.id]
                            : editingProfile.activeGuardrails.filter(id => id !== g.id);
                          setEditingProfile({ ...editingProfile, activeGuardrails: newGuards });
                        }}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{g.title}</span>
                        <span className="text-[10px] text-slate-500 leading-tight block">{g.ruleDescription}</span>
                      </div>
                    </label>
                  ))}
                  {governance.guardrails.length === 0 && <span className="text-xs text-slate-500 p-2">No hay reglas creadas.</span>}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  if (confirm("¿Eliminar este perfil? Si está en uso, el sistema volverá al primero de la lista.")) {
                    const newProfiles = currentProfiles.filter(p => p.id !== editingProfile.id);
                    const newTone = governance.tone === editingProfile.id && newProfiles.length > 0 ? newProfiles[0].id : governance.tone;
                    onUpdateGovernance({ ...governance, styleProfiles: newProfiles, tone: newTone, updatedAt: new Date().toISOString() });
                    setEditingProfile(null);
                  }
                }}
                className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                Eliminar
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const isExisting = currentProfiles.some(p => p.id === editingProfile.id);
                    const newProfiles = isExisting 
                      ? currentProfiles.map(p => p.id === editingProfile.id ? editingProfile : p)
                      : [...currentProfiles, editingProfile];
                      
                    onUpdateGovernance({ 
                      ...governance, 
                      styleProfiles: newProfiles, 
                      updatedAt: new Date().toISOString() 
                    });
                    setEditingProfile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Guardar Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeSubTab === 'links' && (
        <motion.div
          key="links"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full"
        >
          <PersonalLinksView
            currentMember={currentMember}
            members={members}
            moduleName="Gestión Gerencial"
            accentColor="indigo"
          />
        </motion.div>
      )}
    </div>
  );
}
