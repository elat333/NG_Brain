import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Save, Trash2, Building, User, Phone, Mail, DollarSign,
  TrendingUp, Calendar, Clock, CheckCircle2, AlertCircle, Plus,
  FileText, ExternalLink, MessageSquare, Layers, Shield, Tag,
  Briefcase, CheckSquare, Sparkles, X, ChevronRight, ChevronLeft,
  History, Edit2, RotateCcw, Send, ClipboardList
} from 'lucide-react';
import {
  SalesDeal, SalesDealLine, SalesClient, SalesQuote, SalesQuoteTemplate,
  Company, TeamMember, Task, Project, ProductItem, SalesWorkLogEntry
} from '../../types';
import { UniversalCommentsThread } from '../common/UniversalCommentsThread';
import { getCategoryMeta } from './QuoteTemplatesView';
import { SalesQuotesView } from './SalesQuotesView';

export type Opportunity360Tab = 'general' | 'lines' | 'stories' | 'quotes' | 'comments';

interface Opportunity360ViewProps {
  deal?: SalesDeal;
  isCreating?: boolean;
  clients: SalesClient[];
  companies: Company[];
  members: TeamMember[];
  projects: Project[];
  tasks: Task[];
  quotes: SalesQuote[];
  quoteTemplates: SalesQuoteTemplate[];
  products: ProductItem[];
  campaigns?: any[];
  currentMember: TeamMember | null;
  onBack: () => void;
  onSaveDeal: (dealData: Partial<SalesDeal>) => Promise<void>;
  onDeleteDeal?: (id: string) => Promise<void>;
  onOpenStory?: (story: Task) => void;
  onAddStory?: (storyData: Partial<Task>) => Promise<void>;
  onCreateQuote?: (quoteData: Partial<SalesQuote>) => Promise<void>;
  onDeleteQuote?: (id: string) => Promise<void>;
}

const STAGES: {
  id: SalesDeal['stage'];
  label: string;
  shortLabel: string;
  prob: number;
  badgeClass: string;
}[] = [
  { id: 'contacto', label: 'Contacto Inicial', shortLabel: 'Contacto Inicial', prob: 20, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'reunion', label: 'Diagnóstico / Reunión', shortLabel: 'Diagnóstico', prob: 40, badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'propuesta', label: 'Propuesta Presentada', shortLabel: 'Propuesta', prob: 60, badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'negociacion', label: 'Negociación', shortLabel: 'Negociación', prob: 80, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'seguimiento', label: 'Seguimiento Comercial', shortLabel: 'Seguimiento', prob: 90, badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'ganado', label: 'Ganado 🏆', shortLabel: 'Ganado 🏆', prob: 100, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'perdido', label: 'Perdido ❌', shortLabel: 'Perdido ❌', prob: 0, badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
];

// Orden lógico secuencial de trabajo (estilo Historias de Usuario)
const LINEAR_STAGE_ORDER: SalesDeal['stage'][] = [
  'contacto',
  'reunion',
  'propuesta',
  'negociacion',
  'seguimiento',
];

export const Opportunity360View: React.FC<Opportunity360ViewProps> = ({
  deal,
  isCreating = false,
  clients,
  companies,
  members,
  projects,
  tasks,
  quotes,
  quoteTemplates,
  products,
  campaigns = [],
  currentMember,
  onBack,
  onSaveDeal,
  onDeleteDeal,
  onOpenStory,
  onAddStory,
  onCreateQuote,
  onDeleteQuote,
}) => {
  const [activeTab, setActiveTab] = useState<Opportunity360Tab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Estado para abrir directamente el Formulario Tryton Completo de Proformas
  const [fullQuoteFormData, setFullQuoteFormData] = useState<Partial<SalesQuote> | null>(null);
  const [fullQuoteCreationMode, setFullQuoteCreationMode] = useState<'scratch' | 'template'>('scratch');

  // Estado para nota rápida de trabajo en la oportunidad
  const [workNoteInput, setWorkNoteInput] = useState('');

  // Estado para nota rápida por Proforma en Tab 4
  const [quickQuoteNoteById, setQuickQuoteNoteById] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState<Partial<SalesDeal>>(() => {
    if (deal) {
      return {
        ...deal,
        lines: deal.lines || [],
        workLog: deal.workLog || [],
        probability: deal.probability !== undefined ? deal.probability : (
          deal.stage === 'contacto' ? 20 :
          deal.stage === 'reunion' ? 40 :
          deal.stage === 'propuesta' ? 60 :
          deal.stage === 'negociacion' ? 80 :
          deal.stage === 'seguimiento' ? 90 :
          deal.stage === 'ganado' ? 100 : 0
        ),
      };
    }
    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(100 + Math.random() * 900);
    return {
      id: `deal-${Date.now()}`,
      code: `OPN-${currentYear}-${randomCode}`,
      title: '',
      clientId: clients[0]?.id || '',
      amount: 0,
      probability: 20,
      stage: 'contacto',
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      responsibleId: currentMember?.id || members[0]?.id || '',
      priority: 'media',
      channel: 'directo',
      paymentTerms: '50% anticipo, 50% contra entrega',
      deliveryTime: '15 días hábiles',
      lines: [],
      workLog: [],
      createdAt: new Date().toISOString(),
    };
  });

  // Helper para crear una entrada de registro de trabajo / auditoría
  const createLogEntry = (
    type: SalesWorkLogEntry['type'],
    action: string,
    details?: string,
    fromStage?: string,
    toStage?: string
  ): SalesWorkLogEntry => ({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toISOString(),
    memberId: currentMember?.id || 'system',
    memberName: currentMember?.name || 'Usuario',
    memberRole: currentMember?.role || 'Comercial',
    type,
    action,
    details,
    fromStage,
    toStage,
  });

  // Etapa actual y cálculo de transiciones lógicas (anterior / siguiente)
  const currentStageObj = useMemo(() => {
    return STAGES.find((s) => s.id === formData.stage) || STAGES[0];
  }, [formData.stage]);

  const { prevStageObj, nextStageObj } = useMemo(() => {
    const idx = LINEAR_STAGE_ORDER.indexOf(formData.stage || 'contacto');
    if (idx === -1) {
      return { prevStageObj: null, nextStageObj: null };
    }
    const prevId = idx > 0 ? LINEAR_STAGE_ORDER[idx - 1] : null;
    const nextId = idx < LINEAR_STAGE_ORDER.length - 1 ? LINEAR_STAGE_ORDER[idx + 1] : null;
    return {
      prevStageObj: prevId ? STAGES.find((s) => s.id === prevId) || null : null,
      nextStageObj: nextId ? STAGES.find((s) => s.id === nextId) || null : null,
    };
  }, [formData.stage]);

  // Client Details Resolution
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === formData.clientId);
  }, [clients, formData.clientId]);

  const clientInfo = useMemo(() => {
    if (!selectedClient) return null;
    if (selectedClient.clientType === 'B2B') {
      const comp = companies.find((c) => c.id === selectedClient.directoryId);
      return {
        type: 'B2B' as const,
        name: comp?.name || comp?.commercialName || 'Empresa Desconocida',
        idNumber: comp?.ruc || '',
        phone: comp?.phone || '',
        email: comp?.email || '',
        address: comp?.mainAddress || comp?.address || '',
        company: comp,
      };
    } else {
      const mem = members.find((m) => m.id === selectedClient.directoryId);
      return {
        type: 'B2C' as const,
        name: mem?.name || 'Persona Desconocida',
        idNumber: mem?.id || '',
        phone: mem?.phone || '',
        email: mem?.email || '',
        address: '',
        member: mem,
      };
    }
  }, [selectedClient, companies, members]);

  // Linked Scrum Stories (Tasks)
  const linkedStories = useMemo(() => {
    return tasks.filter((t) => {
      if (formData.id && t.dealId === formData.id) return true;
      if (formData.projectId && t.projectId === formData.projectId) return true;
      if (deal?.id && t.dealId === deal.id) return true;
      return false;
    });
  }, [tasks, formData.id, formData.projectId, deal?.id]);

  const completedStoriesCount = useMemo(() => {
    return linkedStories.filter((s) => s.status === 'done').length;
  }, [linkedStories]);

  // Linked Quotes (Proformas)
  const linkedQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (formData.id && q.dealId === formData.id) return true;
      if (deal?.id && q.dealId === deal.id) return true;
      if (formData.clientId && q.clientId === formData.clientId) return true;
      return false;
    });
  }, [quotes, formData.id, deal?.id, formData.clientId]);

  const totalQuotesAmount = useMemo(() => {
    return linkedQuotes.reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
  }, [linkedQuotes]);

  // Forecast Value Calculation
  const weightedAmount = useMemo(() => {
    const amt = Number(formData.amount) || 0;
    const prob = Number(formData.probability) || 0;
    return (amt * prob) / 100;
  }, [formData.amount, formData.probability]);

  // Days until close calculation
  const daysUntilClose = useMemo(() => {
    if (!formData.expectedCloseDate) return null;
    const target = new Date(formData.expectedCloseDate).getTime();
    const now = new Date().getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }, [formData.expectedCloseDate]);

  // Stage change handler with automatic workLog recording
  const handleStageSelect = async (stageId: SalesDeal['stage']) => {
    if (stageId === formData.stage) return;
    if (stageId === 'perdido') {
      setShowLostModal(true);
      return;
    }
    const prevObj = STAGES.find((s) => s.id === formData.stage);
    const nextObj = STAGES.find((s) => s.id === stageId);
    const logEntry = createLogEntry(
      'stage_change',
      `Cambió etapa: ${prevObj?.shortLabel || formData.stage} → ${nextObj?.shortLabel || stageId}`,
      `Probabilidad actualizada al ${nextObj?.prob ?? formData.probability}%`,
      prevObj?.shortLabel,
      nextObj?.shortLabel
    );
    const updatedData: Partial<SalesDeal> = {
      ...formData,
      stage: stageId,
      probability: nextObj ? nextObj.prob : formData.probability,
      workLog: [logEntry, ...(formData.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    setFormData(updatedData);
    if (!isCreating && (updatedData.id || deal?.id) && updatedData.title?.trim() && updatedData.clientId) {
      await onSaveDeal(updatedData);
    }
  };

  // Lost modal confirm with automatic workLog recording
  const handleConfirmLost = async (reason: SalesDeal['lostReason'], notes: string) => {
    const prevObj = STAGES.find((s) => s.id === formData.stage);
    const logEntry = createLogEntry(
      'stage_change',
      `Marcó oportunidad como Perdida (Motivo: ${reason || 'otro'})`,
      notes || 'Sin observaciones adicionales',
      prevObj?.shortLabel,
      'Perdido ❌'
    );
    const updatedData: Partial<SalesDeal> = {
      ...formData,
      stage: 'perdido',
      probability: 0,
      lostReason: reason,
      lostNotes: notes,
      workLog: [logEntry, ...(formData.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    setFormData(updatedData);
    setShowLostModal(false);
    if (!isCreating && (updatedData.id || deal?.id) && updatedData.title?.trim() && updatedData.clientId) {
      await onSaveDeal(updatedData);
    }
  };

  // Agregar una nota manual al registro de trabajo de la oportunidad
  const handleAddOpportunityWorkNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = workNoteInput.trim();
    if (!clean) return;
    const logEntry = createLogEntry(
      'work_note',
      `Registró avance comercial (${currentStageObj.shortLabel})`,
      clean
    );
    const updatedData: Partial<SalesDeal> = {
      ...formData,
      workLog: [logEntry, ...(formData.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    setFormData(updatedData);
    setWorkNoteInput('');
    if (!isCreating && (updatedData.id || deal?.id) && updatedData.title?.trim() && updatedData.clientId) {
      await onSaveDeal(updatedData);
    }
  };

  // Agregar nota rápida o guardar edición de una Proforma (Tab 4)
  const handleAddQuickQuoteNote = async (quote: SalesQuote) => {
    const noteText = (quickQuoteNoteById[quote.id] || '').trim();
    if (!noteText || !onCreateQuote) return;
    const entry = createLogEntry(
      'quote_update',
      `Avance en Proforma ${quote.quoteNumber}`,
      noteText
    );
    const updatedQuote: SalesQuote = {
      ...quote,
      workLog: [entry, ...(quote.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    await onCreateQuote(updatedQuote);
    // También dejar constancia en la bitácora de la Oportunidad
    const updatedDeal: Partial<SalesDeal> = {
      ...formData,
      workLog: [entry, ...(formData.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    setFormData(updatedDeal);
    setQuickQuoteNoteById((prev) => ({ ...prev, [quote.id]: '' }));
    if (!isCreating && (updatedDeal.id || deal?.id) && updatedDeal.title?.trim() && updatedDeal.clientId) {
      await onSaveDeal(updatedDeal);
    }
  };

  // Abrir directamente el Formulario Completo Tryton de Proformas precargado con la Oportunidad
  const handleOpenFullQuoteForm = (existingQuote?: SalesQuote, mode: 'scratch' | 'template' = 'scratch') => {
    setFullQuoteCreationMode(mode);
    if (existingQuote) {
      setFullQuoteFormData({
        ...existingQuote,
        lines: existingQuote.lines || [],
        workLog: existingQuote.workLog || [],
      });
      return;
    }

    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(100 + Math.random() * 900);
    const clonedLines: SalesDealLine[] = (formData.lines || []).map((l, idx) => ({
      ...l,
      id: `qline_${Date.now()}_${idx}`,
    }));

    setFullQuoteFormData({
      quoteNumber: `PF-${currentYear}-${randomCode}`,
      title: `Proforma: ${formData.title?.trim() || 'Oferta Comercial'}`,
      clientId: formData.clientId || clients[0]?.id || '',
      dealId: formData.id || deal?.id,
      amount: Number(formData.amount) || 0,
      status: 'borrador',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      responsibleId: formData.responsibleId || currentMember?.id || members[0]?.id || '',
      paymentTerms: formData.paymentTerms || '50% anticipo, 50% contra entrega',
      deliveryTime: formData.deliveryTime || '15 días hábiles',
      scopeSummary: formData.description || '',
      googleDocsUrl: '',
      excelSheetUrl: '',
      pdfUrl: '',
      lines: clonedLines,
      workLog: [],
    });
  };

  // Add line item
  const handleAddLine = (productId?: string) => {
    const foundProd = productId ? products.find((p) => p.id === productId) : undefined;
    const newLine: SalesDealLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: foundProd?.id,
      description: foundProd ? foundProd.name : 'Nueva partida de servicio / producto',
      quantity: 1,
      unitPrice: foundProd ? Number(foundProd.basePrice) || 0 : 0,
      total: foundProd ? Number(foundProd.basePrice) || 0 : 0,
    };
    const updatedLines = [...(formData.lines || []), newLine];
    const newAmount = updatedLines.reduce((acc, l) => acc + (Number(l.total) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      lines: updatedLines,
      amount: newAmount > 0 ? newAmount : prev.amount,
    }));
  };

  // Update line item
  const handleUpdateLine = (lineId: string, updates: Partial<SalesDealLine>) => {
    const updatedLines = (formData.lines || []).map((l) => {
      if (l.id !== lineId) return l;
      const updated = { ...l, ...updates };
      const q = Number(updated.quantity) || 0;
      const u = Number(updated.unitPrice) || 0;
      updated.total = q * u;
      return updated;
    });
    const newAmount = updatedLines.reduce((acc, l) => acc + (Number(l.total) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      lines: updatedLines,
      amount: newAmount,
    }));
  };

  // Remove line item
  const handleRemoveLine = (lineId: string) => {
    const updatedLines = (formData.lines || []).filter((l) => l.id !== lineId);
    const newAmount = updatedLines.reduce((acc, l) => acc + (Number(l.total) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      lines: updatedLines,
      amount: newAmount,
    }));
  };

  // Save Deal
  const handleSave = async () => {
    if (!formData.title?.trim()) {
      alert('Por favor ingresa un título descriptivo para la oportunidad.');
      return;
    }
    if (!formData.clientId) {
      alert('Por favor selecciona un cliente para la oportunidad.');
      return;
    }
    try {
      setIsSaving(true);
      const logEntry = createLogEntry(
        'edition',
        isCreating ? 'Creó la oportunidad comercial' : 'Guardó cambios en la ficha de oportunidad',
        `Monto: $${Number(formData.amount || 0).toFixed(2)} · Etapa: ${currentStageObj.shortLabel}`
      );
      const updatedToSave: Partial<SalesDeal> = {
        ...formData,
        workLog: [logEntry, ...(formData.workLog || [])],
        updatedAt: new Date().toISOString(),
      };
      setFormData(updatedToSave);
      await onSaveDeal(updatedToSave);
    } catch (error) {
      console.error('Error al guardar la oportunidad:', error);
      alert('Ocurrió un error al guardar la oportunidad. Por favor reintenta.');
    } finally {
      setIsSaving(false);
    }
  };

  // New Story state
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryMemberId, setNewStoryMemberId] = useState(currentMember?.id || '');
  const [newStoryDueDate, setNewStoryDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStoryPriority, setNewStoryPriority] = useState<Task['priority']>('media');

  const handleCreateStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle.trim()) return;
    if (onAddStory) {
      await onAddStory({
        title: newStoryTitle.trim(),
        description: `Historia comercial para la oportunidad ${formData.title} (${formData.code || ''})`,
        dealId: formData.id || deal?.id,
        projectId: formData.projectId,
        memberId: newStoryMemberId,
        dueDate: newStoryDueDate,
        priority: newStoryPriority,
        status: 'todo',
        taskTemplate: 'standard',
      });
      setNewStoryTitle('');
      setShowCreateStoryModal(false);
    }
  };

  // Si se abrió una Proforma (nueva o existente), mostrar directamente el Formulario Tryton Completo de Proformas
  if (fullQuoteFormData) {
    return (
      <SalesQuotesView
        quotes={quotes}
        quoteTemplates={quoteTemplates}
        clients={clients}
        companies={companies}
        members={members}
        deals={[formData as SalesDeal]}
        products={products}
        currentMember={currentMember}
        externalQuoteData={fullQuoteFormData}
        externalCreationMode={fullQuoteCreationMode}
        backLabel="Oportunidad"
        onCloseExternalForm={() => setFullQuoteFormData(null)}
        onSaveQuote={async (quoteData) => {
          if (!onCreateQuote) return;
          const isEditingExisting = Boolean(fullQuoteFormData.id);
          await onCreateQuote({
            ...quoteData,
            dealId: quoteData.dealId || formData.id || deal?.id,
          });
          const logEntry = createLogEntry(
            'quote_update',
            isEditingExisting
              ? `Actualizó Proforma ${quoteData.quoteNumber}`
              : `Emitió Proforma ${quoteData.quoteNumber}`,
            `${quoteData.title || 'Proforma Comercial'} · Monto: $${Number(quoteData.amount || 0).toFixed(2)}`
          );
          const updatedDeal: Partial<SalesDeal> = {
            ...formData,
            workLog: [logEntry, ...(formData.workLog || [])],
            updatedAt: new Date().toISOString(),
          };
          setFormData(updatedDeal);
          if (!isCreating && (updatedDeal.id || deal?.id) && updatedDeal.title?.trim() && updatedDeal.clientId) {
            await onSaveDeal(updatedDeal);
          }
          setActiveTab('quotes');
          setFullQuoteFormData(null);
        }}
        onDeleteQuote={async (id) => {
          if (onDeleteQuote) {
            await onDeleteQuote(id);
          }
          setFullQuoteFormData(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* ========================================================================= */}
      {/* CABECERA ULTRA-COMPACTA (2 FILAS) CON FLUJO DE ETAPAS ESTILO HISTORIAS   */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* FILA 1: Identidad + Transición Lógica Paso a Paso + Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Izquierda: Volver + Código sin salto de línea + Título */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={onBack}
                className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
                title="Volver al Embudo"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">Embudo</span>
              </button>
              <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px] font-bold border border-slate-200 whitespace-nowrap shrink-0">
                {formData.code || 'OPN-NUEVA'}
              </span>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate min-w-0">
                {formData.title || 'Nueva Oportunidad Comercial'}
              </h1>
            </div>

            {/* Centro / Derecha: Flujo Lógico de Etapa (Estilo Historias de Usuario) + Acciones */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Control de Flujo Lógico de Etapas */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
                {/* Botón Etapa Anterior */}
                {prevStageObj && (
                  <button
                    type="button"
                    onClick={() => handleStageSelect(prevStageObj.id)}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200/80 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                    title={`Regresar a ${prevStageObj.label} (${prevStageObj.prob}%)`}
                  >
                    <ChevronLeft size={13} />
                    <span className="hidden md:inline">{prevStageObj.shortLabel}</span>
                  </button>
                )}

                {/* Badge de Etapa Actual */}
                <div
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black border flex items-center gap-1.5 whitespace-nowrap ${currentStageObj.badgeClass}`}
                  title={`Etapa actual: ${currentStageObj.label}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>{currentStageObj.shortLabel}</span>
                  <span className="text-[10px] opacity-80 font-extrabold">({formData.probability ?? currentStageObj.prob}%)</span>
                </div>

                {/* Botón Avanzar a Siguiente Etapa */}
                {nextStageObj && (
                  <button
                    type="button"
                    onClick={() => handleStageSelect(nextStageObj.id)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                    title={`Avanzar a ${nextStageObj.label} (${nextStageObj.prob}%)`}
                  >
                    <span>{nextStageObj.shortLabel}</span>
                    <ChevronRight size={13} />
                  </button>
                )}

                {/* Si está cerrada (Ganado / Perdido), permitir Reabrir a Seguimiento */}
                {(formData.stage === 'ganado' || formData.stage === 'perdido') && (
                  <button
                    type="button"
                    onClick={() => handleStageSelect('seguimiento')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                    title="Reabrir en Seguimiento Comercial"
                  >
                    <RotateCcw size={12} />
                    <span>Reabrir</span>
                  </button>
                )}

                {/* Cierres Terminales: Ganado / Perdido */}
                {formData.stage !== 'ganado' && (
                  <button
                    type="button"
                    onClick={() => handleStageSelect('ganado')}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Marcar Oportunidad como Ganada"
                  >
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span className="hidden sm:inline">Ganado</span>
                  </button>
                )}

                {formData.stage !== 'perdido' && (
                  <button
                    type="button"
                    onClick={() => setShowLostModal(true)}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Marcar Oportunidad como Perdida"
                  >
                    <X size={12} className="text-rose-600" />
                    <span className="hidden sm:inline">Perdido</span>
                  </button>
                )}
              </div>

              {/* Botón Historial / Registro de Trabajo (Estilo Historias de Usuario) */}
              <button
                type="button"
                onClick={() => setShowHistoryDrawer((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  showHistoryDrawer
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Ver y registrar avances de quién trabajó en la oportunidad"
              >
                <History size={13} />
                <span>Registro ({formData.workLog?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Save size={13} />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>

              {onDeleteDeal && !isCreating && deal && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Deseas eliminar esta oportunidad comercial? Esta acción no se puede deshacer.')) {
                      onDeleteDeal(deal.id);
                      onBack();
                    }
                  }}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                  title="Eliminar Oportunidad"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* PANEL DESPLEGABLE DE REGISTRO RÁPIDO DE ACTIVIDAD / TRAZABILIDAD */}
          <AnimatePresence>
            {showHistoryDrawer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2.5 pb-1 border-t border-slate-100 bg-slate-50/90 rounded-2xl p-3 space-y-2.5">
                  <form onSubmit={handleAddOpportunityWorkNote} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={workNoteInput}
                      onChange={(e) => setWorkNoteInput(e.target.value)}
                      placeholder="¿Qué avance se realizó hoy? Ej: Envié revisión de alcance, llamada con cliente, ajuste de precios..."
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send size={12} />
                      <span>Registrar Avance</span>
                    </button>
                  </form>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {(!formData.workLog || formData.workLog.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        Aún no hay registros de actividad en esta oportunidad. Los cambios de etapa, proformas y notas de trabajo aparecerán aquí con autor y fecha.
                      </p>
                    ) : (
                      formData.workLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-2 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 mt-0.5 ${
                              entry.type === 'stage_change' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              entry.type === 'quote_update' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              entry.type === 'work_note' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {entry.type === 'stage_change' ? 'Etapa' :
                               entry.type === 'quote_update' ? 'Documento' :
                               entry.type === 'work_note' ? 'Trabajo' : 'Edición'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800">{entry.action}</span>
                              {entry.details && (
                                <p className="text-[11px] text-slate-600 leading-snug">{entry.details}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold shrink-0">
                            <span className="text-slate-600 font-bold">{entry.memberName}</span>
                            <span>•</span>
                            <span>{new Date(entry.date).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FILA 2: Pestañas + Píldoras KPI Ultra-Compactas en la misma barra */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/40">
          {/* Pestañas de Navegación */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Briefcase size={13} />
              <span>1. General & Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lines')}
              className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'lines'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tag size={13} />
              <span>2. Partidas ({formData.lines?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stories')}
              className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'stories'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckSquare size={13} />
              <span>3. Historias ({completedStoriesCount}/{linkedStories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'quotes'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={13} />
              <span>4. Proformas ({linkedQuotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'comments'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={13} />
              <span>5. Bitácora & Registro ({formData.workLog?.length || 0})</span>
            </button>
          </div>

          {/* Píldoras KPI Compactas en línea (Reemplazan las 5 tarjetas gigantes) */}
          <div className="hidden xl:flex items-center gap-2 py-1 text-[11px]">
            <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
              <DollarSign size={12} className="text-emerald-600" />
              <span className="text-slate-400 font-bold uppercase text-[9px]">Monto:</span>
              <span className="font-black text-slate-900">
                ${(Number(formData.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
              <TrendingUp size={12} className="text-blue-600" />
              <span className="text-slate-400 font-bold uppercase text-[9px]">Forecast:</span>
              <span className="font-black text-blue-900">
                ${weightedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
              <Calendar size={12} className={daysUntilClose !== null && daysUntilClose < 0 ? 'text-rose-600' : 'text-indigo-600'} />
              <span className="text-slate-400 font-bold uppercase text-[9px]">Cierre:</span>
              <span className="font-bold text-slate-800">{formData.expectedCloseDate || 'S/F'}</span>
              {daysUntilClose !== null && (
                <span className={`font-black text-[10px] ${daysUntilClose < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  ({daysUntilClose < 0 ? `-${Math.abs(daysUntilClose)}d` : `${daysUntilClose}d`})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ========================================================================= */}
        {/* TAB 1: FICHA GENERAL & CLIENTE */}
        {/* ========================================================================= */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Col 1 & 2: Oportunidad Data */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-600" />
                  Identificación de la Oportunidad
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título de la Oportunidad <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ej: Monitoreo Ocupacional y Dotación de EPPs para Schlumberger"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Código de Referencia
                      </label>
                      <input
                        type="text"
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="OPN-2026-001"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Asesor Comercial Responsable
                      </label>
                      <select
                        value={formData.responsibleId || ''}
                        onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role || 'Asesor'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Monto Estimado ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount ?? 0}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Probabilidad de Cierre (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.probability ?? 20}
                        onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Fecha Prevista de Cierre
                      </label>
                      <input
                        type="date"
                        value={formData.expectedCloseDate || ''}
                        onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descripción y Alcance Inicial
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detalles de la reunión comercial, necesidades detectadas, plantas a intervenir..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Origen & Atribución de Marketing */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  Atribución Comercial & Origen
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Canal de Captación
                    </label>
                    <select
                      value={formData.channel || 'directo'}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      <option value="directo">Venta Directa / Prospección</option>
                      <option value="referido">Cliente Referido / Recomendación</option>
                      <option value="web">Sitio Web Novagreen</option>
                      <option value="meta_ads">Campaña Meta Ads (Facebook/Instagram)</option>
                      <option value="google_ads">Campaña Google Ads / Búsqueda</option>
                      <option value="licitacion">Licitación / Portal de Compras</option>
                      <option value="evento">Feria / Conferencia / Evento</option>
                      <option value="otro">Otro Canal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Campaña de Marketing de Origen
                    </label>
                    <select
                      value={formData.campaignId || ''}
                      onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      <option value="">-- Sin campaña asociada --</option>
                      {campaigns.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.code ? `[${c.code}] ` : ''}{c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nivel de Prioridad
                    </label>
                    <select
                      value={formData.priority || 'media'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente 🔥</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Proyecto Scrum Vinculado
                    </label>
                    <select
                      value={formData.projectId || ''}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      <option value="">-- Sin proyecto Scrum vinculado --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Condiciones Comerciales Tryton */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Shield size={16} className="text-emerald-600" />
                  Condiciones Comerciales (Tryton Standard)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Forma y Términos de Pago
                    </label>
                    <input
                      type="text"
                      value={formData.paymentTerms || ''}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="Ej: 50% anticipo, 50% contra entrega de informes"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tiempo de Ejecución / Entrega
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryTime || ''}
                      onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                      placeholder="Ej: 15 días laborables tras orden de compra"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Cliente & Persona de Contacto */}
            <div className="space-y-6">
              {/* Cliente Selector & Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <Building size={16} className="text-blue-600" />
                    Cliente Vinculado
                  </h3>
                  {clientInfo && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      clientInfo.type === 'B2B' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {clientInfo.type === 'B2B' ? 'Empresa B2B' : 'Persona B2C'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seleccionar Cliente <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.clientId || ''}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clients.map((c) => {
                      let label = 'Cliente';
                      if (c.clientType === 'B2B') {
                        const comp = companies.find((comp) => comp.id === c.directoryId);
                        label = `🏢 ${comp?.name || 'Empresa'} (B2B)`;
                      } else {
                        const mem = members.find((m) => m.id === c.directoryId);
                        label = `👤 ${mem?.name || 'Persona'} (B2C)`;
                      }
                      return (
                        <option key={c.id} value={c.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {clientInfo && (
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                    <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                      {clientInfo.type === 'B2B' ? <Building size={16} className="text-indigo-600" /> : <User size={16} className="text-emerald-600" />}
                      <span className="truncate">{clientInfo.name}</span>
                    </div>

                    {clientInfo.idNumber && (
                      <div className="text-xs text-slate-600 font-mono">
                        <span className="font-bold text-slate-400">RUC/ID:</span> {clientInfo.idNumber}
                      </div>
                    )}

                    {clientInfo.address && (
                      <div className="text-xs text-slate-600">
                        <span className="font-bold text-slate-400">Dirección:</span> {clientInfo.address}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                      {clientInfo.phone && (
                        <a
                          href={`https://wa.me/${clientInfo.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Phone size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {clientInfo.email && (
                        <a
                          href={`mailto:${clientInfo.email}`}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Mail size={13} />
                          <span>Correo</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Persona de Contacto Específica */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <User size={16} className="text-purple-600" />
                  Contacto Clave (Interlocutor)
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.contactName || ''}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Ej: Ing. Carlos Zambrano"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cargo / Área
                    </label>
                    <input
                      type="text"
                      value={formData.contactRole || ''}
                      onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                      placeholder="Ej: Jefe de Seguridad y Salud Ocupacional"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Teléfono / Celular
                      </label>
                      <input
                        type="text"
                        value={formData.contactPhone || ''}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        placeholder="+593 99..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={formData.contactEmail || ''}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="contacto@empresa.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PARTIDAS & PRODUCTOS DE INTERÉS */}
        {/* ========================================================================= */}
        {activeTab === 'lines' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Tag size={18} className="text-blue-600" />
                    Partidas de Productos & Servicios Cotizados
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Desglose de partidas conforme al estándar Tryton Lines con actualización automática del monto total.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector rápido de catálogo */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddLine(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">+ Agregar del Catálogo Novagreen...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku ? `[${p.sku}] ` : ''}{p.name} - ${Number(p.basePrice || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleAddLine()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Partida Personalizada</span>
                  </button>
                </div>
              </div>

              {/* Table of Lines */}
              {(!formData.lines || formData.lines.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <Tag size={36} className="mx-auto text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Sin partidas registradas aún</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Agrega los productos o servicios de interés para desglosar la oferta económica del cliente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3">Descripción / Servicio</th>
                        <th className="py-3 px-3 w-28 text-center">Cantidad</th>
                        <th className="py-3 px-3 w-36 text-right">Precio Unitario ($)</th>
                        <th className="py-3 px-3 w-36 text-right">Subtotal ($)</th>
                        <th className="py-3 px-3 w-16 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {formData.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleUpdateLine(line.id, { description: e.target.value })}
                              placeholder="Descripción del ítem o servicio"
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => handleUpdateLine(line.id, { quantity: parseFloat(e.target.value) || 1 })}
                              className="w-20 px-2 py-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => handleUpdateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                              className="w-28 px-2 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            ${(Number(line.total) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Eliminar partida"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-black">
                        <td colSpan={3} className="py-4 px-3 text-right uppercase text-slate-500 text-xs">
                          Monto Total de la Oferta:
                        </td>
                        <td className="py-4 px-3 text-right text-base text-slate-900">
                          ${(Number(formData.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HISTORIAS SCRUM DE VENTA (ESTÁNDAR TASK) */}
        {/* ========================================================================= */}
        {activeTab === 'stories' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <CheckSquare size={18} className="text-purple-600" />
                    Historias de Scrum Vinculadas a la Venta
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Actividades y compromisos de venta ejecutados por el equipo bajo metodología Scrum estándar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateStoryModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Nueva Historia Scrum</span>
                </button>
              </div>

              {linkedStories.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <CheckSquare size={36} className="mx-auto text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No hay historias vinculadas</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Crea historias estándar para agendar visitas comerciales, elaboración de propuestas, envío de muestras o reuniones de negociación.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedStories.map((story) => {
                    const member = members.find((m) => m.id === story.memberId);
                    const isDone = story.status === 'done';
                    return (
                      <div
                        key={story.id}
                        onClick={() => onOpenStory && onOpenStory(story)}
                        className="p-4 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-2xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl mt-0.5 ${
                            isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            <CheckSquare size={16} />
                          </div>
                          <div>
                            <h4 className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {story.title}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {story.description || 'Sin descripción'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap justify-end">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            story.status === 'done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            story.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {story.status}
                          </span>

                          {story.dueDate && (
                            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                              <Calendar size={13} className="text-slate-400" />
                              {story.dueDate}
                            </span>
                          )}

                          {member && (
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                              <User size={12} className="text-slate-400" />
                              {member.name.split(' ')[0]}
                            </span>
                          )}

                          <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COTIZACIONES, TRÍADA DOCUMENTAL & REGISTRO DE TRABAJO              */}
        {/* ========================================================================= */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    Proformas & Documentos Comerciales Vinculados
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Edita los enlaces de la tríada documental (Google Docs, Excel/Sheets, PDF), actualiza el estado y lleva el registro de quién elaboró o revisó cada documento.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenFullQuoteForm(undefined, 'template')}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>✨ Proforma desde Modelo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenFullQuoteForm(undefined, 'scratch')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={15} />
                    <span>Nueva Proforma</span>
                  </button>
                </div>
              </div>

              {linkedQuotes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Sin proformas emitidas aún</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Genera una proforma a partir de un modelo corporativo (🔬 QHSE, 🦺 EPPs, 🎓 Capacitación, 📟 Equipos de Medición, 🏗️ PRO - Proyectos, 📦 Otros) o en blanco.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkedQuotes.map((q) => {
                    const responsibleMember = members.find((m) => m.id === q.responsibleId);
                    return (
                      <div
                        key={q.id}
                        className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 hover:border-blue-200/80 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono text-xs font-bold border border-slate-200 whitespace-nowrap">
                              {q.quoteNumber}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">
                              {q.title || `Proforma para ${clientInfo?.name || 'Cliente'}`}
                            </h4>
                            {responsibleMember && (
                              <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                                <User size={10} className="text-slate-400" />
                                {responsibleMember.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900 mr-1">
                              ${(Number(q.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>

                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              q.status === 'aprobada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              q.status === 'enviada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              q.status === 'rechazada' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {q.status}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleOpenFullQuoteForm(q)}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              title="Abrir Proforma completa (Líneas, Enlaces de Docs/Excel/PDF, Condiciones y Estado)"
                            >
                              <Edit2 size={12} />
                              <span>Abrir / Editar Proforma</span>
                            </button>

                            {onDeleteQuote && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`¿Eliminar la proforma ${q.quoteNumber}?`)) {
                                    await onDeleteQuote(q.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Eliminar Proforma"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {q.scopeSummary && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {q.scopeSummary}
                          </p>
                        )}

                        {/* TRÍADA DOCUMENTAL BUTTONS */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                            Documentos de Oferta:
                          </span>

                          {q.googleDocsUrl ? (
                            <a
                              href={q.googleDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            >
                              <FileText size={13} className="text-blue-600" />
                              <span>Propuesta Google Docs</span>
                              <ExternalLink size={11} className="text-blue-400" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenFullQuoteForm(q)}
                              className="px-2.5 py-1 text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold rounded-lg border border-dashed border-blue-200 transition-all cursor-pointer"
                            >
                              + Vincular Google Docs
                            </button>
                          )}

                          {q.excelSheetUrl ? (
                            <a
                              href={q.excelSheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            >
                              <TrendingUp size={13} className="text-emerald-600" />
                              <span>Cálculo Excel / Sheets</span>
                              <ExternalLink size={11} className="text-emerald-400" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenFullQuoteForm(q)}
                              className="px-2.5 py-1 text-[11px] text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 font-semibold rounded-lg border border-dashed border-emerald-200 transition-all cursor-pointer"
                            >
                              + Vincular Excel / Sheets
                            </button>
                          )}

                          {q.pdfUrl ? (
                            <a
                              href={q.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            >
                              <FileText size={13} className="text-rose-600" />
                              <span>PDF Formal</span>
                              <ExternalLink size={11} className="text-rose-400" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenFullQuoteForm(q)}
                              className="px-2.5 py-1 text-[11px] text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-semibold rounded-lg border border-dashed border-rose-200 transition-all cursor-pointer"
                            >
                              + Vincular PDF Formal
                            </button>
                          )}
                        </div>

                        {/* REGISTRO DE TRABAJO POR PROFORMA / DOCUMENTO */}
                        <div className="pt-3 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-4 rounded-b-2xl space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                              <ClipboardList size={13} className="text-blue-600" />
                              Registro de Trabajo en el Documento ({q.workLog?.length || 0})
                            </span>

                            <div className="flex items-center gap-1.5 flex-1 max-w-md">
                              <input
                                type="text"
                                value={quickQuoteNoteById[q.id] || ''}
                                onChange={(e) =>
                                  setQuickQuoteNoteById((prev) => ({
                                    ...prev,
                                    [q.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddQuickQuoteNote(q);
                                  }
                                }}
                                placeholder="¿Qué se trabajó en este documento? (Ej: Ajusté tarifas en Excel, revisé alcance...)"
                                className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddQuickQuoteNote(q)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                              >
                                <Send size={11} />
                                <span>Anotar</span>
                              </button>
                            </div>
                          </div>

                          {q.workLog && q.workLog.length > 0 && (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {q.workLog.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-bold text-[10px] border border-blue-200 whitespace-nowrap">
                                      {entry.memberName}
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                      {entry.action}
                                    </span>
                                    {entry.details && (
                                      <span className="text-slate-600 truncate">
                                        — {entry.details}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                                    {new Date(entry.date).toLocaleString('es-EC', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BITÁCORA COMERCIAL, REGISTRO DE AVANCES & COMENTARIOS              */}
        {/* ========================================================================= */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Registro estructurado de quién hizo qué en la Oportunidad */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <History size={18} className="text-blue-600" />
                    Registro de Trabajo y Auditoría de la Oportunidad ({formData.workLog?.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Historial cronológico de cambios de etapa, documentos emitidos/editados y avances registrados por cada miembro del equipo.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddOpportunityWorkNote} className="flex items-center gap-2">
                <input
                  type="text"
                  value={workNoteInput}
                  onChange={(e) => setWorkNoteInput(e.target.value)}
                  placeholder="Registrar gestión realizada (ej: Llamada de seguimiento con gerencia, envío de alcance técnico, ajuste de precios...)"
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Send size={13} />
                  <span>Registrar Avance</span>
                </button>
              </form>

              {(!formData.workLog || formData.workLog.length === 0) ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                  Aún no hay movimientos registrados. Al cambiar de etapa, editar proformas o anotar avances aparecerán aquí con autor y fecha.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {formData.workLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase shrink-0 border ${
                          entry.type === 'stage_change'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : entry.type === 'quote_update'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : entry.type === 'work_note'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {entry.memberName}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900">{entry.action}</span>
                          {entry.details && (
                            <p className="text-slate-600 text-xs mt-0.5">{entry.details}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                        {new Date(entry.date).toLocaleString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hilo de Comentarios Universal */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <UniversalCommentsThread
                entityType="deal"
                entityId={formData.id || deal?.id || 'new-deal'}
                entityTitle={`Oportunidad: ${formData.title || 'Sin título'}`}
                currentMember={currentMember}
                members={members}
                title={`Bitácora Comercial & Acuerdos (${formData.title || 'Oportunidad'})`}
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: MARCAR COMO PERDIDO (MOTIVOS TRYTON) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showLostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <X size={18} />
                  </div>
                  <h3 className="font-black text-slate-800 text-base">Registrar Motivo de Pérdida</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLostModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Selecciona la causa principal de la pérdida de esta oportunidad comercial para la retroalimentación del equipo:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motivo Principal</label>
                  <select
                    id="lost-reason-select"
                    defaultValue="precio"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="precio">Precio / Tarifa elevada</option>
                    <option value="competencia">Ganó un Competidor</option>
                    <option value="presupuesto">Falta de Presupuesto del Cliente</option>
                    <option value="plazos">Tiempos de entrega / Plazos no convenientes</option>
                    <option value="tecnico">Requerimiento técnico fuera de alcance</option>
                    <option value="desinteres">Cliente desistió / No responde</option>
                    <option value="otro">Otro motivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Observaciones</label>
                  <textarea
                    id="lost-notes-textarea"
                    rows={3}
                    placeholder="Detalles adicionales sobre qué ocurrió..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLostModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sel = (document.getElementById('lost-reason-select') as HTMLSelectElement)?.value as any;
                    const notes = (document.getElementById('lost-notes-textarea') as HTMLTextAreaElement)?.value || '';
                    handleConfirmLost(sel, notes);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-rose-600/20"
                >
                  Confirmar Pérdida
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: NUEVA HISTORIA SCRUM (TASK ESTÁNDAR) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCreateStoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <CheckSquare size={18} />
                  </div>
                  <h3 className="font-black text-slate-800 text-base">Nueva Historia Scrum de Venta</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateStoryModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateStorySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título de la Historia <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoryTitle}
                    onChange={(e) => setNewStoryTitle(e.target.value)}
                    placeholder="Ej: Visita técnica a planta de Durán para levantamiento"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Responsable</label>
                    <select
                      value={newStoryMemberId}
                      onChange={(e) => setNewStoryMemberId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prioridad</label>
                    <select
                      value={newStoryPriority}
                      onChange={(e) => setNewStoryPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="meteoric_crash">Crítica 🔥</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={newStoryDueDate}
                    onChange={(e) => setNewStoryDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateStoryModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-purple-600/20"
                  >
                    Crear Historia
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
