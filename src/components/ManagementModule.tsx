/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TeamMember, 
  Process, 
  ManagementNote, 
  ManagementStrategyData, 
  ManagementAIGovernanceData, 
  ManagementChatMessage,
  SwotItem,
  OKRGoal,
  StrategicRisk,
  AIGuardrail,
  AICalibrationRecord
} from '../types';
import { sendManagementChatMessage } from '../services/aiService';

interface ManagementModuleProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  processes: Process[];
  notes: ManagementNote[];
  strategy: ManagementStrategyData;
  governance: ManagementAIGovernanceData;
  onUpdateNotes: (notes: ManagementNote[]) => void;
  onUpdateStrategy: (strategy: ManagementStrategyData) => void;
  onUpdateGovernance: (governance: ManagementAIGovernanceData) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab?: 'consultant' | 'notes' | 'strategy' | 'governance';
  setActiveSubTab?: (subTab: 'consultant' | 'notes' | 'strategy' | 'governance') => void;
}

export default function ManagementModule({
  currentMember,
  members,
  processes,
  notes,
  strategy,
  governance,
  onUpdateNotes,
  onUpdateStrategy,
  onUpdateGovernance,
  accessLevel,
  activeSubTab: propActiveSubTab,
  setActiveSubTab: propSetActiveSubTab
}: ManagementModuleProps) {
  const [internalSubTab, setInternalSubTab] = useState<'consultant' | 'notes' | 'strategy' | 'governance'>('consultant');
  const activeSubTab = propActiveSubTab !== undefined ? propActiveSubTab : internalSubTab;
  const setActiveSubTab = propSetActiveSubTab || setInternalSubTab;

  // --- State for Consultant Chat ---
  const [chatMessages, setChatMessages] = useState<ManagementChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Saludos, **${currentMember?.name || 'Gerente'}**. Soy su **Consultor y Asistente Ejecutivo de Gerencia** en Novagreen. Estoy configurado bajo su gobernanza en tono *${
        governance.tone === 'ejecutivo_analitico' ? 'Ejecutivo Analítico' :
        governance.tone === 'consultor_iso' ? 'Consultor de Gestión Integrada (ISO)' :
        governance.tone === 'estratega_conservador' ? 'Estratega Conservador de Riesgo' : 'Mentor Innovador'
      }*. ¿En qué tema estratégico o decisión de dirección trabajamos hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  // --- State for Calibration Modal from Chat ---
  const [calibrationModalMessage, setCalibrationModalMessage] = useState<ManagementChatMessage | null>(null);
  const [calibrationCorrectionText, setCalibrationCorrectionText] = useState('');
  const [calibrationTopic, setCalibrationTopic] = useState('');

  // --- State for Notes Subtab ---
  const [noteFilterCategory, setNoteFilterCategory] = useState<string>('todos');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<Partial<ManagementNote> | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);

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
        processes
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

  // --- Note Modal Handlers ---
  const handleSaveNote = () => {
    if (!editingNote?.title?.trim() || !editingNote?.content?.trim()) return;

    if (editingNote.id) {
      // Update
      const updated = notes.map(n => n.id === editingNote.id ? {
        ...n,
        title: editingNote.title!,
        content: editingNote.content!,
        category: (editingNote.category as any) || 'general',
        tags: editingNote.tags || [],
        updatedAt: new Date().toISOString()
      } : n);
      onUpdateNotes(updated);
    } else {
      // Create
      const newNote: ManagementNote = {
        id: `note-${Date.now()}`,
        title: editingNote.title!,
        content: editingNote.content!,
        category: (editingNote.category as any) || 'general',
        tags: editingNote.tags || ['Gerencia'],
        authorMemberId: currentMember?.id || 'admin',
        authorName: currentMember?.name || 'Gerente Directivo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onUpdateNotes([newNote, ...notes]);
    }

    setShowNoteModal(false);
    setEditingNote(null);
  };

  const handleDeleteNote = (id: string) => {
    onUpdateNotes(notes.filter(n => n.id !== id));
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
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Módulo de Alta Dirección & Gobernanza Novagreen</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Módulo de Gerencia
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-medium">
                Nivel {accessLevel.toUpperCase()}
              </span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Centro de comando ejecutivo para la toma de decisiones, supervisión estratégica, bitácora directiva y calibración en tiempo real del Consultor de Inteligencia Artificial.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700">
            <Bot className="w-6 h-6 text-indigo-400 animate-pulse" />
            <div className="text-xs">
              <div className="text-slate-400 font-medium">Estado del Consultor IA</div>
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Calibrado ({governance.guardrails.filter(g => g.isEnabled).length} Guardrails activos)
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Subtabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-700/60 pt-4">
          <button
            id="tab-gerencia-consultor"
            onClick={() => setActiveSubTab('consultant')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSubTab === 'consultant'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Consultor & Asistente IA</span>
          </button>

          <button
            id="tab-gerencia-bitacora"
            onClick={() => setActiveSubTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSubTab === 'notes'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bitácora & Notas Ejecutivas ({notes.length})</span>
          </button>

          <button
            id="tab-gerencia-estrategia"
            onClick={() => setActiveSubTab('strategy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSubTab === 'strategy'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Estrategia & Objetivos</span>
          </button>

          <button
            id="tab-gerencia-gobernanza"
            onClick={() => setActiveSubTab('governance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSubTab === 'governance'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Gobernanza & Calibración IA</span>
          </button>
        </div>
      </div>

      {/* --- SUBTAB 1: CONSULTOR & ASISTENTE IA --- */}
      {activeSubTab === 'consultant' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                >
                  Cambiar
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-slate-500 block mb-0.5">Estilo de Asesoramiento:</span>
                  <span className="font-semibold text-indigo-900 capitalize">
                    {governance.tone.replace('_', ' ')}
                  </span>
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
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px]">
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
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
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
                      <div className="whitespace-pre-wrap">{msg.text}</div>

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
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  id="input-gerencia-chat"
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Escriba su consulta o instrucción ejecutiva..."
                  disabled={isSending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                <button
                  id="btn-send-gerencia-chat"
                  type="submit"
                  disabled={isSending || !inputQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: BITÁCORA & NOTAS EJECUTIVAS --- */}
      {activeSubTab === 'notes' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  id="input-search-notes"
                  type="text"
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  placeholder="Buscar en bitácora..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                id="select-filter-category"
                value={noteFilterCategory}
                onChange={(e) => setNoteFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 font-medium"
              >
                <option value="todos">Todas las categorías</option>
                <option value="decisión">Decisiones</option>
                <option value="estrategia">Estrategia</option>
                <option value="reunión">Reuniones</option>
                <option value="análisis">Análisis</option>
                <option value="acuerdo">Acuerdos</option>
                <option value="general">General</option>
              </select>
            </div>

            {canEdit && (
              <button
                id="btn-add-management-note"
                onClick={() => {
                  setEditingNote({
                    title: '',
                    content: '',
                    category: 'decisión',
                    tags: ['Gerencia']
                  });
                  setShowNoteModal(true);
                }}
                className="w-full md:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Nota de Bitácora</span>
              </button>
            )}
          </div>

          {/* Notes List */}
          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-700 text-base">No hay notas registradas en este filtro</h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Cree notas para documentar acuerdos estratégicos de la junta o pídale al Consultor IA que sintetice un informe en la bitácora.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                        note.category === 'decisión' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        note.category === 'estrategia' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        note.category === 'acuerdo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {note.category}
                      </span>

                      {note.isAiGenerated && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          IA
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-800 text-base leading-snug">{note.title}</h3>
                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>{note.authorName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>

                      {canEdit && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            id={`btn-edit-note-${note.id}`}
                            onClick={() => {
                              setEditingNote(note);
                              setShowNoteModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`btn-delete-note-${note.id}`}
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                  {strategy.swotItems.filter(s => s.category === 'fortaleza').map(item => (
                    <div key={item.id} className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs flex items-start justify-between gap-2">
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
                  {strategy.swotItems.filter(s => s.category === 'oportunidad').map(item => (
                    <div key={item.id} className="p-3 bg-white rounded-xl border border-sky-100 shadow-2xs flex items-start justify-between gap-2">
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
                  {strategy.swotItems.filter(s => s.category === 'debilidad').map(item => (
                    <div key={item.id} className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs flex items-start justify-between gap-2">
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
                  {strategy.swotItems.filter(s => s.category === 'amenaza').map(item => (
                    <div key={item.id} className="p-3 bg-white rounded-xl border border-rose-100 shadow-2xs flex items-start justify-between gap-2">
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
              {strategy.okrGoals.map(okr => (
                <div key={okr.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
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
              {strategy.strategicRisks.map(risk => (
                <div key={risk.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
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
          {/* Tone & Style Selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Tono & Estilo del Consultor IA
              </h3>
              <p className="text-xs text-slate-500">Seleccione la personalidad con la que el asistente responderá a las consultas ejecutivas</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[
                { id: 'ejecutivo_analitico', title: 'Ejecutivo Analítico', desc: 'Enfoque cuantitativo, ROI, brevedad directiva y viñetas.' },
                { id: 'consultor_iso', title: 'Consultor ISO', desc: 'Sistemas integrados de gestión, auditoría, trazabilidad y procesos.' },
                { id: 'estratega_conservador', title: 'Estratega Conservador', desc: 'Mitigación de riesgos, cautela en recursos y resiliencia.' },
                { id: 'mentor_innovador', title: 'Mentor Innovador', desc: 'Transformación digital, agilidad, visión de tecnología e innovación.' }
              ].map(item => (
                <button
                  key={item.id}
                  disabled={isReadOnly}
                  onClick={() => onUpdateGovernance({ ...governance, tone: item.id as any, updatedAt: new Date().toISOString() })}
                  className={`p-4 rounded-2xl text-left border transition-all ${
                    governance.tone === item.id
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                    {governance.tone === item.id && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </button>
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
                Seleccione la versión del motor Gemini recomendada por Google AI Studio para procesar sus consultas directivas
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
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
                },
                { 
                  id: 'gemini-1.5-flash', 
                  title: 'Gemini 1.5 Flash', 
                  badge: 'Estándar', 
                  desc: 'Modelo ligero estándar de alta velocidad para tareas rápidas y resúmenes ejecutivos rutinarios.' 
                }
              ].map(modelItem => {
                const isSelected = (governance.selectedModel || 'gemini-2.5-flash') === modelItem.id;
                return (
                  <button
                    key={modelItem.id}
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
              {governance.guardrails.map(guard => (
                <div key={guard.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-4">
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
                {governance.calibrationHistory.map(rec => (
                  <div key={rec.id} className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1 text-xs">
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

      {/* --- MODAL: Add/Edit Note --- */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">
              {editingNote?.id ? 'Editar Nota de Bitácora' : 'Nueva Nota de Bitácora Ejecutiva'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título de la Nota</label>
                <input
                  type="text"
                  value={editingNote?.title || ''}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Acuerdo de inversión en automatización ISO"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={editingNote?.category || 'decisión'}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="decisión">Decisión</option>
                  <option value="estrategia">Estrategia</option>
                  <option value="reunión">Reunión</option>
                  <option value="análisis">Análisis</option>
                  <option value="acuerdo">Acuerdo</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contenido de la Nota</label>
                <textarea
                  rows={5}
                  value={editingNote?.content || ''}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escriba los detalles de la resolución o acuerdo directivo..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowNoteModal(false); setEditingNote(null); }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Guardar Nota
              </button>
            </div>
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
    </div>
  );
}
