import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, Search, Edit2, Trash2, X, Building, DollarSign,
  Calendar, Tag, ExternalLink, TrendingUp, Sparkles, User, Briefcase,
  ArrowLeft, Save, History, Send, Phone, Mail, Clock, CheckCircle2,
  Layers, MessageSquare, ChevronRight, ChevronLeft, RotateCcw
} from 'lucide-react';
import {
  SalesQuote, SalesClient, Company, TeamMember,
  SalesQuoteTemplate, SalesDeal, ProductItem, SalesDealLine, SalesWorkLogEntry
} from '../../types';
import { SearchableSelect } from '../common/SearchableSelect';
import { UniversalCommentsThread } from '../common/UniversalCommentsThread';
import {
  TEMPLATE_CATEGORIES,
  normalizeTemplateCategory,
  getCategoryMeta,
  OfficialTemplateCategory,
} from './QuoteTemplatesView';

interface SalesQuotesViewProps {
  companies: Company[];
  members: TeamMember[];
  quotes: SalesQuote[];
  clients: SalesClient[];
  quoteTemplates?: SalesQuoteTemplate[];
  deals?: SalesDeal[];
  products?: ProductItem[];
  currentMember?: TeamMember | null;
  onSaveQuote: (quote: Partial<SalesQuote>) => Promise<void>;
  onDeleteQuote: (id: string) => Promise<void>;
  onOpenDeal?: (deal: SalesDeal) => void;
  externalQuoteData?: Partial<SalesQuote> | null;
  externalCreationMode?: 'scratch' | 'template';
  onCloseExternalForm?: () => void;
  backLabel?: string;
}

type StatusFilter = 'all' | 'borrador' | 'enviada' | 'aprobada' | 'rechazada';
type ClientTypeFilter = 'all' | 'B2B' | 'B2C';
type QuoteFormTab = 'general' | 'lines' | 'worklog';

const QUOTE_STATUSES: {
  id: SalesQuote['status'];
  label: string;
  shortLabel: string;
  badgeClass: string;
}[] = [
  { id: 'borrador', label: '📝 Borrador', shortLabel: 'Borrador', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'enviada', label: '📤 Enviada al Cliente', shortLabel: 'Enviada', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'aprobada', label: '🏆 Aprobada', shortLabel: 'Aprobada 🏆', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'rechazada', label: '❌ Rechazada', shortLabel: 'Rechazada ❌', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const SalesQuotesView: React.FC<SalesQuotesViewProps> = ({
  quotes,
  clients,
  companies,
  members,
  quoteTemplates = [],
  deals = [],
  products = [],
  currentMember = null,
  onSaveQuote,
  onDeleteQuote,
  onOpenDeal,
  externalQuoteData = null,
  externalCreationMode,
  onCloseExternalForm,
  backLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [clientTypeFilter, setClientTypeFilter] = useState<ClientTypeFilter>('all');

  // Tryton Form View state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(() => Boolean(externalQuoteData));
  const [activeTab, setActiveTab] = useState<QuoteFormTab>('general');
  const [editingQuote, setEditingQuote] = useState<Partial<SalesQuote> | null>(() => externalQuoteData || null);
  const [creationMode, setCreationMode] = useState<'scratch' | 'template'>(() =>
    externalCreationMode || (externalQuoteData?.templateId ? 'template' : 'scratch')
  );
  const [templateCatFilter, setTemplateCatFilter] = useState<'all' | OfficialTemplateCategory>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [workNoteInput, setWorkNoteInput] = useState('');

  // Helper para crear una entrada en la bitácora de la proforma
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

  // Filtered Quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const client = clients.find((cl) => cl.id === q.clientId);
      const isB2B = client?.clientType === 'B2B';
      const isB2C = client?.clientType === 'B2C';

      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (clientTypeFilter === 'B2B' && !isB2B) return false;
      if (clientTypeFilter === 'B2C' && !isB2C) return false;

      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();

      const numMatch = q.quoteNumber?.toLowerCase().includes(query);
      const titleMatch = q.title?.toLowerCase().includes(query);

      let clientName = '';
      if (client) {
        if (isB2B) {
          const comp = companies.find((comp) => comp.id === client.directoryId);
          clientName = (comp?.name || comp?.commercialName || '').toLowerCase();
        } else {
          const mem = members.find((m) => m.id === client.directoryId);
          clientName = (mem?.name || '').toLowerCase();
        }
      }

      return numMatch || titleMatch || clientName.includes(query);
    });
  }, [quotes, clients, companies, members, statusFilter, clientTypeFilter, searchQuery]);

  // Open Tryton Form View for creating or editing a quote
  const handleOpenForm = (quote?: SalesQuote, initialMode?: 'scratch' | 'template') => {
    if (quote) {
      setEditingQuote({
        ...quote,
        lines: quote.lines || [],
        workLog: quote.workLog || [],
      });
      setCreationMode(quote.templateId ? 'template' : 'scratch');
    } else {
      const currentYear = new Date().getFullYear();
      const randomQuote = Math.floor(100 + Math.random() * 900);
      setEditingQuote({
        quoteNumber: `PF-${currentYear}-${randomQuote}`,
        title: '',
        clientId: clients[0]?.id || '',
        dealId: '',
        templateId: '',
        amount: 0,
        status: 'borrador',
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        responsibleId: currentMember?.id || members[0]?.id || '',
        googleDocsUrl: '',
        excelSheetUrl: '',
        pdfUrl: '',
        scopeSummary: '',
        paymentTerms: '50% anticipo, 50% contra entrega',
        deliveryTime: '15 días laborables',
        lines: [],
        workLog: [],
      });
      setCreationMode(initialMode || 'scratch');
    }
    setTemplateCatFilter('all');
    setActiveTab('general');
    setShowHistoryDrawer(false);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingQuote(null);
    if (onCloseExternalForm) {
      onCloseExternalForm();
    }
  };

  // Client Details Resolution in Form View
  const selectedClientInfo = useMemo(() => {
    if (!editingQuote?.clientId) return null;
    const cl = clients.find((c) => c.id === editingQuote.clientId);
    if (!cl) return null;
    if (cl.clientType === 'B2B') {
      const comp = companies.find((c) => c.id === cl.directoryId);
      return {
        type: 'B2B' as const,
        name: comp?.name || comp?.commercialName || 'Empresa Desconocida',
        idNumber: comp?.ruc || '',
        phone: comp?.phone || '',
        email: comp?.email || '',
        address: comp?.mainAddress || comp?.address || '',
      };
    } else {
      const mem = members.find((m) => m.id === cl.directoryId);
      return {
        type: 'B2C' as const,
        name: mem?.name || 'Persona Desconocida',
        idNumber: mem?.id || '',
        phone: mem?.phone || '',
        email: mem?.email || '',
        address: '',
      };
    }
  }, [editingQuote?.clientId, clients, companies, members]);

  // Lines total calculation in Form View
  const linesTotal = useMemo(() => {
    if (!editingQuote?.lines) return 0;
    return editingQuote.lines.reduce(
      (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
      0
    );
  }, [editingQuote?.lines]);

  // Triad count in Form View
  const triadCount = useMemo(() => {
    if (!editingQuote) return 0;
    return [editingQuote.googleDocsUrl, editingQuote.excelSheetUrl, editingQuote.pdfUrl].filter(Boolean).length;
  }, [editingQuote]);

  // Filtered Proformas Modelo in Form View by selected category
  const filteredTemplatesForQuote = useMemo(() => {
    if (templateCatFilter === 'all') return quoteTemplates;
    return quoteTemplates.filter(
      (t) => normalizeTemplateCategory(t.category) === templateCatFilter
    );
  }, [quoteTemplates, templateCatFilter]);

  // Select a Proforma Modelo in Form View (autocompletes triad, terms, and suggestedLines)
  const handleSelectTemplate = (templateId: string) => {
    const tmpl = quoteTemplates.find((t) => t.id === templateId);
    if (!tmpl) {
      setEditingQuote((prev) => ({ ...prev, templateId: '' }));
      return;
    }
    const clonedLines: SalesDealLine[] = (tmpl.suggestedLines || []).map((ln, idx) => ({
      id: ln.id || `qline_${Date.now()}_${idx}`,
      productId: ln.productId,
      description: ln.description,
      quantity: Number(ln.quantity) || 1,
      unitPrice: Number(ln.unitPrice) || 0,
      total: (Number(ln.quantity) || 1) * (Number(ln.unitPrice) || 0),
    }));
    const clonedTotal = clonedLines.reduce((sum, l) => sum + l.total, 0);

    setEditingQuote((prev) => ({
      ...prev,
      templateId: tmpl.id,
      title: prev?.title || `Cotización: ${tmpl.name}`,
      amount: clonedTotal > 0 ? clonedTotal : prev?.amount && prev.amount > 0 ? prev.amount : tmpl.baseAmount || 0,
      googleDocsUrl: tmpl.masterGoogleDocsUrl || prev?.googleDocsUrl || '',
      excelSheetUrl: tmpl.masterExcelSheetUrl || prev?.excelSheetUrl || '',
      pdfUrl: tmpl.masterPdfUrl || prev?.pdfUrl || '',
      scopeSummary: tmpl.description || prev?.scopeSummary || '',
      paymentTerms: tmpl.defaultPaymentTerms || prev?.paymentTerms || '',
      deliveryTime: tmpl.defaultDeliveryTime || prev?.deliveryTime || '',
      lines: clonedLines.length > 0 ? clonedLines : prev?.lines || [],
    }));
  };

  // Add a quote line from catalog or custom
  const handleAddLine = (productId?: string) => {
    if (!editingQuote) return;
    const product = productId ? products.find((p) => p.id === productId) : undefined;
    const newLine: SalesDealLine = {
      id: `qline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: product?.id || undefined,
      description: product ? `${product.sku ? `[${product.sku}] ` : ''}${product.name}` : 'Nuevo servicio / partida cotizada',
      quantity: 1,
      unitPrice: product ? Number(product.basePrice || 0) : 0,
      total: product ? Number(product.basePrice || 0) : 0,
    };
    const nextLines = [...(editingQuote.lines || []), newLine];
    const nextTotal = nextLines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    setEditingQuote({
      ...editingQuote,
      lines: nextLines,
      amount: nextTotal > 0 ? nextTotal : editingQuote.amount,
    });
  };

  const handleUpdateLine = (
    idx: number,
    field: 'description' | 'quantity' | 'unitPrice' | 'productId',
    value: string | number
  ) => {
    if (!editingQuote) return;
    const nextLines = [...(editingQuote.lines || [])];
    const current = { ...nextLines[idx] };
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      current.productId = prod?.id || undefined;
      if (prod) {
        current.description = `${prod.sku ? `[${prod.sku}] ` : ''}${prod.name}`;
        current.unitPrice = Number(prod.basePrice || 0);
      }
    } else if (field === 'description') {
      current.description = String(value);
    } else if (field === 'quantity') {
      current.quantity = Number(value) || 0;
    } else if (field === 'unitPrice') {
      current.unitPrice = Number(value) || 0;
    }
    current.total = (Number(current.quantity) || 0) * (Number(current.unitPrice) || 0);
    nextLines[idx] = current;
    const nextTotal = nextLines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    setEditingQuote({
      ...editingQuote,
      lines: nextLines,
      amount: nextTotal > 0 ? nextTotal : editingQuote.amount,
    });
  };

  const handleRemoveLine = (idx: number) => {
    if (!editingQuote) return;
    const nextLines = (editingQuote.lines || []).filter((_, i) => i !== idx);
    const nextTotal = nextLines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    setEditingQuote({
      ...editingQuote,
      lines: nextLines,
      amount: nextLines.length > 0 ? nextTotal : editingQuote.amount,
    });
  };

  // Status workflow change handler with automatic workLog recording
  const handleStatusChange = async (newStatus: SalesQuote['status']) => {
    if (!editingQuote || editingQuote.status === newStatus) return;
    const prevObj = QUOTE_STATUSES.find((s) => s.id === editingQuote.status);
    const nextObj = QUOTE_STATUSES.find((s) => s.id === newStatus);
    const entry = createLogEntry(
      'stage_change',
      `Estado de Proforma: ${prevObj?.shortLabel || editingQuote.status} → ${nextObj?.shortLabel || newStatus}`,
      `Proforma ${editingQuote.quoteNumber} actualizada a estado "${nextObj?.label || newStatus}"`,
      prevObj?.shortLabel,
      nextObj?.shortLabel
    );
    const updated: Partial<SalesQuote> = {
      ...editingQuote,
      status: newStatus,
      workLog: [entry, ...(editingQuote.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    setEditingQuote(updated);
    if (updated.id && updated.clientId) {
      await onSaveQuote(updated);
    }
  };

  // Quick work note handler
  const handleAddWorkNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote || !workNoteInput.trim()) return;
    const entry = createLogEntry('work_note', 'Avance / Revisión en Proforma', workNoteInput.trim());
    const updated: Partial<SalesQuote> = {
      ...editingQuote,
      workLog: [entry, ...(editingQuote.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    setEditingQuote(updated);
    setWorkNoteInput('');
    if (updated.id && updated.clientId) {
      await onSaveQuote(updated);
    }
  };

  // Save Quote from Tryton Form
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingQuote) return;
    if (!editingQuote.clientId) {
      alert('Por favor selecciona un cliente destinatario para la cotización.');
      return;
    }
    try {
      setIsSaving(true);
      const isNew = !editingQuote.id;
      const logEntry = createLogEntry(
        'quote_update',
        isNew ? 'Emisión de Proforma Comercial' : 'Actualización de Ficha de Proforma',
        `${editingQuote.quoteNumber} • ${editingQuote.title || 'Sin título'} — Importe: $${Number(editingQuote.amount || 0).toFixed(2)}`
      );
      const toSave: Partial<SalesQuote> = {
        ...editingQuote,
        workLog: [logEntry, ...(editingQuote.workLog || [])],
        updatedAt: new Date().toISOString(),
      };
      await onSaveQuote(toSave);
      handleCloseForm();
    } catch (error) {
      console.error('Error al guardar cotización:', error);
      alert('Ocurrió un error al guardar la cotización.');
    } finally {
      setIsSaving(false);
    }
  };

  // ===========================================================================
  // RENDER: TRYTON FORM VIEW (FICHA COMPLETA DE COTIZACIÓN / PROFORMA)
  // ===========================================================================
  if (isFormOpen && editingQuote) {
    const currentStatusObj = QUOTE_STATUSES.find((s) => s.id === editingQuote.status) || QUOTE_STATUSES[0];
    const linkedDeal = deals.find((d) => d.id === editingQuote.dealId);

    return (
      <div className="min-h-screen bg-slate-50/70 pb-16 text-left">
        {/* CABECERA COMPACTA TRYTON (2 FILAS) */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Izquierda: Volver + Nº Proforma + Título Editable */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-xs font-bold pr-2.5"
                  title={`Volver a ${backLabel || 'la lista de Proformas'}`}
                >
                  <ArrowLeft size={15} />
                  <span className="hidden sm:inline">{backLabel || 'Lista'}</span>
                </button>

                <input
                  type="text"
                  value={editingQuote.quoteNumber || ''}
                  onChange={(e) => setEditingQuote({ ...editingQuote, quoteNumber: e.target.value })}
                  className="w-28 px-2 py-0.5 bg-slate-900 text-ng-lime rounded-md text-[10px] font-mono font-black tracking-wider shrink-0 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-ng-lime"
                  title="Número de Proforma"
                />

                <input
                  type="text"
                  value={editingQuote.title || ''}
                  onChange={(e) => setEditingQuote({ ...editingQuote, title: e.target.value })}
                  placeholder="Título de la Proforma / Oferta Comercial..."
                  className="text-sm sm:text-base font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5 truncate flex-1 min-w-[180px]"
                />
              </div>

              {/* Centro: Flujo de Estado paso a paso */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {editingQuote.status === 'borrador' && (
                  <>
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border ${currentStatusObj.badgeClass}`}>
                      📝 Borrador
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('enviada')}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <span>Marcar Enviada</span>
                      <ChevronRight size={13} />
                    </button>
                  </>
                )}

                {editingQuote.status === 'enviada' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('borrador')}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                      <span className="hidden md:inline">Borrador</span>
                    </button>
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border ${currentStatusObj.badgeClass}`}>
                      📤 Enviada
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('aprobada')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={12} />
                      <span>Aprobar 🏆</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('rechazada')}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X size={12} />
                      <span>Rechazada</span>
                    </button>
                  </>
                )}

                {(editingQuote.status === 'aprobada' || editingQuote.status === 'rechazada') && (
                  <>
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border ${currentStatusObj.badgeClass}`}>
                      {currentStatusObj.label}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('enviada')}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={11} />
                      <span>Reabrir</span>
                    </button>
                  </>
                )}

                {/* Botón Historial Desplegable */}
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    showHistoryDrawer
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title="Ver bitácora de esta proforma"
                >
                  <History size={12} />
                  <span className="hidden md:inline">Historial</span>
                  <span className="px-1 py-0.2 bg-slate-200/80 text-slate-800 rounded text-[9px] font-black">
                    {editingQuote.workLog?.length || 0}
                  </span>
                </button>
              </div>

              {/* Derecha: Eliminar + Guardar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {editingQuote.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`¿Está seguro de eliminar la proforma ${editingQuote.quoteNumber}?`)) {
                        await onDeleteQuote(editingQuote.id!);
                        handleCloseForm();
                      }
                    }}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                    title="Eliminar Proforma"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-sm shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Proforma'}</span>
                </button>
              </div>
            </div>

            {/* CAJÓN DESPLEGABLE DE HISTORIAL RÁPIDO */}
            <AnimatePresence>
              {showHistoryDrawer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200 bg-slate-50/90 rounded-2xl p-3 space-y-2.5">
                    <form onSubmit={handleAddWorkNote} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={workNoteInput}
                        onChange={(e) => setWorkNoteInput(e.target.value)}
                        placeholder="Registrar avance o revisión de la proforma (ej. Se aplicó 5% de descuento por pronto pago)..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send size={12} />
                        <span>Registrar Avance</span>
                      </button>
                    </form>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {!editingQuote.workLog || editingQuote.workLog.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-1">
                          Aún no hay registros en la bitácora de esta proforma.
                        </p>
                      ) : (
                        editingQuote.workLog.map((entry) => (
                          <div
                            key={entry.id}
                            className="p-2 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{entry.action}</span>
                              {entry.details && <p className="text-[11px] text-slate-600">{entry.details}</p>}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold shrink-0">
                              <span className="text-slate-600 font-bold">{entry.memberName}</span> •{' '}
                              {new Date(entry.date).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
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

          {/* FILA 2: Pestañas Tryton + Píldoras KPI en línea */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/40">
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
                <span>1. Datos Generales, Cliente & Tríada Documental ({triadCount}/3)</span>
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
                <span>2. Partidas Cotizadas ({editingQuote.lines?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('worklog')}
                className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'worklog'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={13} />
                <span>3. Bitácora & Historial ({editingQuote.workLog?.length || 0})</span>
              </button>
            </div>

            {/* Píldoras KPI Compactas */}
            <div className="hidden lg:flex items-center gap-2 py-1 text-[11px]">
              <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <DollarSign size={12} className="text-emerald-600" />
                <span className="text-slate-400 font-bold uppercase text-[9px]">Importe Total:</span>
                <span className="font-black text-slate-900">
                  ${(Number(editingQuote.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <Calendar size={12} className="text-blue-600" />
                <span className="text-slate-400 font-bold uppercase text-[9px]">Fecha:</span>
                <span className="font-bold text-slate-800">{editingQuote.date || 'S/F'}</span>
              </div>

              <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <FileText size={12} className="text-indigo-600" />
                <span className="text-slate-400 font-bold uppercase text-[9px]">Tríada Cloud:</span>
                <span className="font-black text-slate-800">{triadCount}/3 enlaces</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL DEL FORMULARIO TRYTON */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* ========================================================================= */}
          {/* TAB 1: DATOS GENERALES, CLIENTE, PROFORMA MODELO & TRÍADA DOCUMENTAL */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda (2/3): Modalidad de Creación, Ficha Principal y Condiciones */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        Datos de la Proforma / Cotización Comercial
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400 font-bold">
                        {editingQuote.quoteNumber}
                      </span>
                    </div>

                    {/* SELECTOR DE MODALIDAD: DESDE CERO VS A PARTIR DE PROFORMA MODELO */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-amber-500" />
                          Modalidad de Creación / Origen de la Oferta
                        </label>

                        <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setCreationMode('scratch');
                              setEditingQuote((prev) => ({ ...prev, templateId: '' }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              creationMode === 'scratch'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <FileText size={13} />
                            <span>📄 Desde Cero / Personalizada</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCreationMode('template')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              creationMode === 'template'
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'text-slate-600 hover:bg-amber-50'
                            }`}
                          >
                            <Sparkles size={13} />
                            <span>✨ A partir de Proforma Modelo</span>
                          </button>
                        </div>
                      </div>

                      {creationMode === 'template' ? (
                        <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-3">
                          {/* Píldoras de las 6 Líneas de Negocio Oficiales */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                            {TEMPLATE_CATEGORIES.map((cat) => {
                              const isSelected = templateCatFilter === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setTemplateCatFilter(cat.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                    isSelected
                                      ? 'bg-amber-600 text-white font-black shadow-2xs'
                                      : 'bg-white hover:bg-amber-100/60 text-slate-700 border border-amber-200/80'
                                  }`}
                                >
                                  <span>{cat.icon}</span>
                                  <span>{cat.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-amber-900 mb-1">
                              Selecciona la Proforma Modelo para clonar su Tríada Documental, Alcance, Condiciones y Partidas:
                            </label>
                            <select
                              value={editingQuote.templateId || ''}
                              onChange={(e) => handleSelectTemplate(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">
                                -- Seleccionar Proforma Modelo ({filteredTemplatesForQuote.length} disponibles) --
                              </option>
                              {filteredTemplatesForQuote.map((t) => {
                                const catMeta = getCategoryMeta(t.category);
                                return (
                                  <option key={t.id} value={t.id}>
                                    {catMeta.icon} [{t.code}] {t.name} — Base: ${Number(t.baseAmount || 0).toFixed(2)} ({t.suggestedLines?.length || 0} partidas)
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {editingQuote.templateId && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-amber-900 font-bold">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                Plantilla aplicada: Tríada documental ({triadCount}/3), alcance y {editingQuote.lines?.length || 0} partidas precargadas.
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('lines')}
                                className="text-blue-700 hover:underline font-black cursor-pointer"
                              >
                                Revisar Partidas ({editingQuote.lines?.length || 0}) →
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Modo libre activo: ingresa manualmente los datos de la oferta, enlaces de la Tríada Documental y partidas a medida.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nº Proforma <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingQuote.quoteNumber || ''}
                          onChange={(e) => setEditingQuote({ ...editingQuote, quoteNumber: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Fecha de Emisión <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={editingQuote.date || ''}
                          onChange={(e) => setEditingQuote({ ...editingQuote, date: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Válida Hasta (Vigencia)
                        </label>
                        <input
                          type="date"
                          value={editingQuote.validUntil || ''}
                          onChange={(e) => setEditingQuote({ ...editingQuote, validUntil: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Título / Referencia de la Oferta <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingQuote.title || ''}
                          onChange={(e) => setEditingQuote({ ...editingQuote, title: e.target.value })}
                          placeholder="Ej: Monitoreo de Ruido Ocupacional e Iluminación - Planta Industrial"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Importe Total ($) <span className="text-rose-500">*</span>
                          </label>
                          {linesTotal > 0 && linesTotal !== Number(editingQuote.amount) && (
                            <button
                              type="button"
                              onClick={() => setEditingQuote({ ...editingQuote, amount: linesTotal })}
                              className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer"
                            >
                              Usar partidas (${linesTotal.toFixed(2)})
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={editingQuote.amount ?? 0}
                          onChange={(e) => setEditingQuote({ ...editingQuote, amount: Number(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Condiciones de Pago
                        </label>
                        <input
                          type="text"
                          value={editingQuote.paymentTerms || ''}
                          onChange={(e) => setEditingQuote({ ...editingQuote, paymentTerms: e.target.value })}
                          placeholder="Ej: 50% anticipo, 50% contra entrega de informe"
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Plazo de Entrega
                        </label>
                        <input
                          type="text"
                          value={editingQuote.deliveryTime || ''}
                          onChange={(e) => setEditingQuote({ ...editingQuote, deliveryTime: e.target.value })}
                          placeholder="Ej: 15 días hábiles tras Orden de Compra"
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Resumen del Alcance Técnico-Comercial
                      </label>
                      <textarea
                        rows={4}
                        value={editingQuote.scopeSummary || ''}
                        onChange={(e) => setEditingQuote({ ...editingQuote, scopeSummary: e.target.value })}
                        placeholder="Describe el alcance técnico cotizado, entregables incluidos y consideraciones operativas..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha (1/3): Cliente & Oportunidad Vinculada */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Building size={16} className="text-indigo-600" />
                      Cliente & Oportunidad Vinculada
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cliente Destinatario <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        required
                        value={editingQuote.clientId}
                        onChange={(val) => setEditingQuote({ ...editingQuote, clientId: val })}
                        placeholder="Seleccione cliente..."
                        searchPlaceholder="Buscar cliente o empresa..."
                        isClearable
                        options={clients.map((c) => {
                          const name =
                            c.clientType === 'B2B'
                              ? companies.find((comp) => comp.id === c.directoryId)?.name || 'Empresa'
                              : members.find((mem) => mem.id === c.directoryId)?.name || 'Persona';
                          return {
                            value: c.id,
                            label: name,
                            badge: c.clientType,
                            badgeColor: c.clientType === 'B2B' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700',
                          };
                        })}
                        buttonClassName="p-2.5 bg-slate-50 border-slate-200 text-xs font-semibold"
                      />
                    </div>

                    {selectedClientInfo && (
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                        <div className="font-black text-slate-900 text-xs flex items-center gap-2">
                          {selectedClientInfo.type === 'B2B' ? (
                            <Building size={15} className="text-indigo-600 shrink-0" />
                          ) : (
                            <User size={15} className="text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate">{selectedClientInfo.name}</span>
                        </div>

                        {selectedClientInfo.idNumber && (
                          <div className="text-[11px] text-slate-600 font-mono">
                            <span className="font-bold text-slate-400">RUC/ID:</span> {selectedClientInfo.idNumber}
                          </div>
                        )}

                        <div className="pt-1 flex flex-wrap gap-2">
                          {selectedClientInfo.phone && (
                            <a
                              href={`https://wa.me/${selectedClientInfo.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                            >
                              <Phone size={11} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          {selectedClientInfo.email && (
                            <a
                              href={`mailto:${selectedClientInfo.email}`}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                            >
                              <Mail size={11} />
                              <span>Correo</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Oportunidad Comercial (Pipeline)
                      </label>
                      <select
                        value={editingQuote.dealId || ''}
                        onChange={(e) => setEditingQuote({ ...editingQuote, dealId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="">-- Sin oportunidad vinculada (Venta directa) --</option>
                        {deals
                          .filter((d) => !editingQuote.clientId || d.clientId === editingQuote.clientId)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.code ? `[${d.code}] ` : ''}{d.title}
                            </option>
                          ))}
                      </select>

                      {linkedDeal && onOpenDeal && (
                        <button
                          type="button"
                          onClick={() => onOpenDeal(linkedDeal)}
                          className="mt-2 w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Briefcase size={13} />
                          <span>Abrir Oportunidad 360°: {linkedDeal.code || linkedDeal.title}</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Responsable Comercial
                      </label>
                      <select
                        value={editingQuote.responsibleId || ''}
                        onChange={(e) => setEditingQuote({ ...editingQuote, responsibleId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="">-- Sin asignar --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN INFERIOR INTEGRADA EN LA 1RA FICHA: TRÍADA DOCUMENTAL DE LA OFERTA */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Layers size={18} className="text-blue-600" />
                      Tríada Documental de la Oferta Comercial (Enlaces Cloud)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gestiona y abre directamente desde la ficha principal los 3 documentos vivos de esta cotización: Propuesta en Google Docs, Calculadora en Sheets y PDF formal emitido.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-black self-start sm:self-center">
                    {triadCount}/3 Documentos Vinculados
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* 1. Google Docs */}
                  <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/30 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black uppercase">
                          1. Propuesta Técnica
                        </span>
                        {editingQuote.googleDocsUrl ? (
                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Vinculado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Pendiente</span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">🟦 Documento Google Docs</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Documento editable de la oferta técnica personalizada para el cliente.
                      </p>
                      <input
                        type="url"
                        value={editingQuote.googleDocsUrl || ''}
                        onChange={(e) => setEditingQuote({ ...editingQuote, googleDocsUrl: e.target.value })}
                        placeholder="https://docs.google.com/document/d/..."
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {editingQuote.googleDocsUrl && (
                      <a
                        href={editingQuote.googleDocsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>Abrir Google Docs</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* 2. Google Sheets */}
                  <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase">
                          2. Memoria de Cálculo
                        </span>
                        {editingQuote.excelSheetUrl ? (
                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Vinculado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Pendiente</span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">🟩 Hoja de Costos / APU</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Presupuesto interno en Google Sheets o Excel con análisis de costos y rentabilidad.
                      </p>
                      <input
                        type="url"
                        value={editingQuote.excelSheetUrl || ''}
                        onChange={(e) => setEditingQuote({ ...editingQuote, excelSheetUrl: e.target.value })}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {editingQuote.excelSheetUrl && (
                      <a
                        href={editingQuote.excelSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <TrendingUp size={14} />
                        <span>Abrir Hoja de Costos</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* 3. PDF Formal */}
                  <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[10px] font-black uppercase">
                          3. PDF Emitido
                        </span>
                        {editingQuote.pdfUrl ? (
                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Vinculado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Pendiente</span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">🟥 PDF Formal para Cliente</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Archivo PDF firmado y enviado formalmente al cliente destinatario.
                      </p>
                      <input
                        type="url"
                        value={editingQuote.pdfUrl || ''}
                        onChange={(e) => setEditingQuote({ ...editingQuote, pdfUrl: e.target.value })}
                        placeholder="https://drive.google.com/file/d/.../view"
                        className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    {editingQuote.pdfUrl && (
                      <a
                        href={editingQuote.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>Abrir PDF Formal</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PARTIDAS COTIZADAS (TRYTON LINES) */}
          {/* ========================================================================= */}
          {activeTab === 'lines' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Tag size={18} className="text-blue-600" />
                    Partidas de la Cotización (Tryton Lines)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Desglose de productos y servicios incluidos en esta proforma con cálculo automático del importe total.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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

              {!editingQuote.lines || editingQuote.lines.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <Tag size={36} className="mx-auto text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Sin partidas detalladas en esta cotización</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Agrega ítems del catálogo de productos o selecciona una Proforma Modelo en la pestaña general para precargar las partidas sugeridas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3">Producto / Servicio (Catálogo)</th>
                        <th className="py-3 px-3">Descripción en Proforma</th>
                        <th className="py-3 px-3 w-28 text-center">Cantidad</th>
                        <th className="py-3 px-3 w-36 text-right">Precio Unitario ($)</th>
                        <th className="py-3 px-3 w-36 text-right">Subtotal ($)</th>
                        <th className="py-3 px-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editingQuote.lines.map((line, idx) => {
                        const rowTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                        return (
                          <tr key={line.id || idx} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 w-64">
                              <select
                                value={line.productId || ''}
                                onChange={(e) => handleUpdateLine(idx, 'productId', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                              >
                                <option value="">-- Libre / Personalizado --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.sku ? `[${p.sku}] ` : ''}{p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleUpdateLine(idx, 'description', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={line.quantity}
                                onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => handleUpdateLine(idx, 'unitPrice', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              ${rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar partida"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                        <td colSpan={4} className="py-3 px-4 text-right font-black uppercase text-xs text-slate-600">
                          Importe Total de Partidas:
                        </td>
                        <td className="py-3 px-3 text-right font-black text-base text-emerald-700">
                          ${linesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: BITÁCORA & HISTORIAL DEL DOCUMENTO */}
          {/* ========================================================================= */}
          {activeTab === 'worklog' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <History size={16} className="text-blue-600" />
                  Bitácora de Revisiones de la Proforma ({editingQuote.workLog?.length || 0})
                </h3>

                <form onSubmit={handleAddWorkNote} className="flex gap-2">
                  <input
                    type="text"
                    value={workNoteInput}
                    onChange={(e) => setWorkNoteInput(e.target.value)}
                    placeholder="Registrar ajuste de alcance, descuento o comentario del cliente..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send size={13} />
                    <span>Registrar</span>
                  </button>
                </form>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {!editingQuote.workLog || editingQuote.workLog.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">
                      No hay registros de actividad en esta cotización todavía.
                    </p>
                  ) : (
                    editingQuote.workLog.map((entry) => (
                      <div key={entry.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-800">{entry.action}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(entry.date).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        {entry.details && <p className="text-xs text-slate-600">{entry.details}</p>}
                        <div className="text-[10px] text-slate-500 font-bold">Por: {entry.memberName}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                {editingQuote.id ? (
                  <UniversalCommentsThread
                    entityType="quote"
                    entityId={editingQuote.id}
                    entityTitle={`${editingQuote.quoteNumber} - ${editingQuote.title || 'Cotización'}`}
                    currentMember={currentMember}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Guarda la Cotización primero para habilitar el hilo de comentarios colaborativos.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER: VISTA LISTA DE TRYTON (POR DEFECTO)
  // ===========================================================================
  return (
    <div className="space-y-6">
      {/* 1. HEADER & METRICS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-blue-600" />
              Gestor Documental Tryton
            </span>
            <span className="text-xs text-slate-400 font-bold">• {quotes.length} emitidas</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Proformas Comerciales
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestión integral de proformas técnico-económicas con su Tríada Documental, desglose de partidas y bitácora de negociación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenForm(undefined, 'template')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Sparkles size={15} className="text-amber-600" />
            <span>✨ Proforma desde Modelo</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenForm(undefined, 'scratch')}
            className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Nueva Proforma</span>
          </button>
        </div>
      </div>

      {/* 2. FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {(
              [
                { id: 'all', label: 'Todas' },
                { id: 'borrador', label: '📝 Borrador' },
                { id: 'enviada', label: '📤 Enviada' },
                { id: 'aprobada', label: '🏆 Aprobada' },
                { id: 'rechazada', label: '❌ Rechazada' },
              ] as { id: StatusFilter; label: string }[]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Client Type Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase text-slate-400 mr-1 hidden sm:inline">Tipo:</span>
            <button
              type="button"
              onClick={() => setClientTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clientTypeFilter === 'all'
                  ? 'bg-slate-800 text-white font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setClientTypeFilter('B2B')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                clientTypeFilter === 'B2B'
                  ? 'bg-indigo-600 text-white font-black'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Building size={12} />
              <span>B2B Empresas</span>
            </button>
            <button
              type="button"
              onClick={() => setClientTypeFilter('B2C')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                clientTypeFilter === 'B2C'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <User size={12} />
              <span>B2C Personas</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nº proforma, cliente, título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. TABLE OF QUOTES (TRYTON LIST VIEW) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-wider">
              <tr>
                <th className="p-4">Nº Proforma & Título</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Oportunidad / Modelo</th>
                <th className="p-4 text-center">Partidas</th>
                <th className="p-4 text-center">Tríada Documental</th>
                <th className="p-4 text-right">Monto</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredQuotes.map((quote, qIdx) => {
                const client = clients.find((c) => c.id === quote.clientId);
                let clientName = 'Cliente no encontrado';
                let isB2B = false;
                if (client) {
                  if (client.clientType === 'B2B') {
                    isB2B = true;
                    clientName =
                      companies.find((c) => c.id === client.directoryId)?.name || 'Empresa Desconocida';
                  } else {
                    clientName =
                      members.find((m) => m.id === client.directoryId)?.name || 'Persona Desconocida';
                  }
                }

                const deal = deals.find((d) => d.id === quote.dealId);
                const template = quoteTemplates.find((t) => t.id === quote.templateId);
                const linesCount = quote.lines?.length || 0;

                return (
                  <tr
                    key={`sales_quote_row_${quote.id || qIdx}`}
                    onClick={() => handleOpenForm(quote)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Proforma Code & Title */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {quote.quoteNumber}
                        </span>
                        <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors text-xs line-clamp-1 mt-0.5">
                          {quote.title || 'Cotización de Servicios'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar size={11} /> {quote.date}
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          {isB2B ? <Building size={14} className="text-indigo-600 shrink-0" /> : <User size={14} className="text-emerald-600 shrink-0" />}
                          <span className="truncate max-w-[180px]">{clientName}</span>
                        </div>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isB2B ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isB2B ? 'B2B Empresa' : 'B2C Persona'}
                        </span>
                      </div>
                    </td>

                    {/* Deal or Template */}
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        {deal ? (
                          <button
                            type="button"
                            onClick={() => onOpenDeal && onOpenDeal(deal)}
                            className="text-left font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate max-w-[160px] cursor-pointer"
                            title={`Abrir oportunidad: ${deal.title}`}
                          >
                            <Briefcase size={12} className="shrink-0" />
                            <span className="truncate">{deal.title}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Venta directa</span>
                        )}

                        {template && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Sparkles size={10} className="text-amber-500" />
                            <span className="truncate max-w-[150px]">Modelo: {template.name}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Partidas count */}
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px]">
                        {linesCount} {linesCount === 1 ? 'ítem' : 'ítems'}
                      </span>
                    </td>

                    {/* TRÍADA DOCUMENTAL BUTTONS */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {quote.googleDocsUrl ? (
                          <a
                            href={quote.googleDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all cursor-pointer"
                            title="Abrir Propuesta en Google Docs"
                          >
                            <FileText size={15} />
                          </a>
                        ) : (
                          <span className="p-1.5 text-slate-300 border border-slate-100 rounded-lg cursor-not-allowed" title="Docs no vinculado">
                            <FileText size={15} />
                          </span>
                        )}

                        {quote.excelSheetUrl ? (
                          <a
                            href={quote.excelSheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all cursor-pointer"
                            title="Abrir Cálculo en Google Sheets / Excel"
                          >
                            <TrendingUp size={15} />
                          </a>
                        ) : (
                          <span className="p-1.5 text-slate-300 border border-slate-100 rounded-lg cursor-not-allowed" title="Excel no vinculado">
                            <TrendingUp size={15} />
                          </span>
                        )}

                        {quote.pdfUrl ? (
                          <a
                            href={quote.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer"
                            title="Abrir PDF Formal"
                          >
                            <FileText size={15} className="text-rose-600" />
                          </a>
                        ) : (
                          <span className="p-1.5 text-slate-300 border border-slate-100 rounded-lg cursor-not-allowed" title="PDF no emitido">
                            <FileText size={15} />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-4 text-right">
                      <span className="font-black text-slate-900 text-sm">
                        ${(Number(quote.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          quote.status === 'aprobada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : quote.status === 'enviada'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : quote.status === 'rechazada'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {quote.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenForm(quote)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Abrir Ficha Tryton"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Está seguro de eliminar la cotización ${quote.quoteNumber}?`)) {
                              onDeleteQuote(quote.id);
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar Cotización"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No se encontraron cotizaciones</p>
                    <p className="text-xs mt-1">Ajusta los filtros o haz clic en "+ Nueva Cotización" para abrir el formulario Tryton.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
