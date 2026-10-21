import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy, Plus, FileText, ExternalLink, Edit2, Trash2, Tag,
  TrendingUp, Sparkles, Building, User, X, Clock, DollarSign,
  ArrowLeft, Save, LayoutGrid, List, History, Send, Briefcase,
  CheckCircle2, MessageSquare, Layers
} from 'lucide-react';
import {
  SalesQuoteTemplate, SalesClient, Company, TeamMember,
  SalesDeal, ProductItem, SalesWorkLogEntry
} from '../../types';
import { UniversalCommentsThread } from '../common/UniversalCommentsThread';

interface QuoteTemplatesViewProps {
  templates: SalesQuoteTemplate[];
  clients: SalesClient[];
  companies: Company[];
  members: TeamMember[];
  products: ProductItem[];
  deals?: SalesDeal[];
  currentMember: TeamMember | null;
  onSaveTemplate: (templateData: Partial<SalesQuoteTemplate>) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onUseTemplateToQuote: (
    template: SalesQuoteTemplate,
    targetClientId: string,
    targetDealId?: string,
    customTitle?: string,
    customAmount?: number
  ) => Promise<void>;
}

export type OfficialTemplateCategory =
  | 'qhse'
  | 'epp'
  | 'capacitacion'
  | 'equipos_medicion'
  | 'proyectos'
  | 'otros';

type CategoryFilter = 'all' | OfficialTemplateCategory;
type TemplateFormTab = 'general' | 'lines' | 'worklog';

export const TEMPLATE_CATEGORIES: {
  id: CategoryFilter;
  label: string;
  shortLabel: string;
  prefix: string;
  badge: string;
  icon: string;
}[] = [
  { id: 'all', label: 'Todos los Modelos', shortLabel: 'Todos', prefix: 'MOD', badge: 'bg-slate-100 text-slate-800 border-slate-200', icon: '📑' },
  { id: 'qhse', label: 'QHSE', shortLabel: 'QHSE', prefix: 'MOD-QHSE', badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🔬' },
  { id: 'epp', label: 'EPPs', shortLabel: 'EPPs', prefix: 'MOD-EPP', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🦺' },
  { id: 'capacitacion', label: 'Capacitación y Certificación', shortLabel: 'Capacitación', prefix: 'MOD-CAP', badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎓' },
  { id: 'equipos_medicion', label: 'Equipos de Medición', shortLabel: 'Eq. Medición', prefix: 'MOD-EQM', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: '📟' },
  { id: 'proyectos', label: 'PRO - Proyectos', shortLabel: 'PRO - Proyectos', prefix: 'MOD-PRO', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🏗️' },
  { id: 'otros', label: 'Otros', shortLabel: 'Otros', prefix: 'MOD-OTR', badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: '📦' },
];

export const normalizeTemplateCategory = (cat?: string): OfficialTemplateCategory => {
  switch (cat) {
    case 'qhse':
    case 'mediciones':
      return 'qhse';
    case 'epp':
      return 'epp';
    case 'capacitacion':
      return 'capacitacion';
    case 'equipos_medicion':
      return 'equipos_medicion';
    case 'proyectos':
    case 'consultoria':
      return 'proyectos';
    case 'otros':
    case 'general':
    default:
      return 'otros';
  }
};

export const getCategoryMeta = (cat?: string) => {
  const norm = normalizeTemplateCategory(cat);
  return TEMPLATE_CATEGORIES.find((c) => c.id === norm) || TEMPLATE_CATEGORIES[1];
};

export const QuoteTemplatesView: React.FC<QuoteTemplatesViewProps> = ({
  templates,
  clients,
  companies,
  members,
  products,
  deals = [],
  currentMember,
  onSaveTemplate,
  onDeleteTemplate,
  onUseTemplateToQuote,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  // Tryton Form View state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TemplateFormTab>('general');
  const [editingTemplate, setEditingTemplate] = useState<Partial<SalesQuoteTemplate> | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [workNoteInput, setWorkNoteInput] = useState('');

  // Use Template Modal state
  const [useModalTemplate, setUseModalTemplate] = useState<SalesQuoteTemplate | null>(null);
  const [targetClientId, setTargetClientId] = useState('');
  const [targetDealId, setTargetDealId] = useState('');
  const [quoteCustomTitle, setQuoteCustomTitle] = useState('');
  const [quoteCustomAmount, setQuoteCustomAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper para crear una entrada en la bitácora del modelo
  const createLogEntry = (
    type: SalesWorkLogEntry['type'],
    action: string,
    details?: string
  ): SalesWorkLogEntry => ({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toISOString(),
    memberId: currentMember?.id || 'system',
    memberName: currentMember?.name || 'Usuario',
    memberRole: currentMember?.role || 'Comercial',
    type,
    action,
    details,
  });

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const normalizedCat = normalizeTemplateCategory(t.category);
      const matchCat = selectedCategory === 'all' || normalizedCat === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Helper para generar código sugerido según la categoría
  const buildTemplateCode = (cat: OfficialTemplateCategory, currentCode?: string) => {
    const meta = getCategoryMeta(cat);
    const currentYear = new Date().getFullYear();
    const count = templates.length + 1;
    if (!currentCode) {
      return `${meta.prefix}-${currentYear}-${count.toString().padStart(3, '0')}`;
    }
    // Si el código actual sigue el patrón estándar MOD-..., actualizamos su prefijo
    const match = currentCode.match(/^MOD(?:-[A-Z]+)?-(\d{4}-\d+)$/);
    if (match) {
      return `${meta.prefix}-${match[1]}`;
    }
    return currentCode;
  };

  // Cambiar categoría actualizando el prefijo del código si aplica
  const handleCategoryChange = (newCat: OfficialTemplateCategory) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      category: newCat,
      code: buildTemplateCode(newCat, editingTemplate.code),
    });
  };

  // Open Tryton Form for creating a new Proforma Modelo
  const handleOpenCreate = () => {
    const initialCat: OfficialTemplateCategory =
      selectedCategory !== 'all' ? selectedCategory : 'qhse';
    setEditingTemplate({
      code: buildTemplateCode(initialCat),
      name: '',
      category: initialCat,
      description: '',
      baseAmount: 0,
      masterGoogleDocsUrl: '',
      masterExcelSheetUrl: '',
      masterPdfUrl: '',
      defaultPaymentTerms: '50% anticipo, 50% contra entrega de informe',
      defaultDeliveryTime: '15 días laborables tras orden de compra',
      suggestedLines: [],
      workLog: [],
    });
    setActiveTab('general');
    setShowHistoryDrawer(false);
    setIsFormOpen(true);
  };

  // Open Tryton Form for editing an existing Proforma Modelo
  const handleOpenEdit = (template: SalesQuoteTemplate) => {
    const normalizedCat = normalizeTemplateCategory(template.category);
    setEditingTemplate({
      ...template,
      category: normalizedCat,
      suggestedLines: (template.suggestedLines || []).map((ln, idx) => ({
        ...ln,
        id: ln.id || `tline-${idx}-${Date.now()}`,
        total: (Number(ln.quantity) || 0) * (Number(ln.unitPrice) || 0),
      })),
      workLog: template.workLog || [],
    });
    setActiveTab('general');
    setShowHistoryDrawer(false);
    setIsFormOpen(true);
  };

  // Lines total calculation in Form View
  const linesTotal = useMemo(() => {
    if (!editingTemplate?.suggestedLines) return 0;
    return editingTemplate.suggestedLines.reduce(
      (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
      0
    );
  }, [editingTemplate?.suggestedLines]);

  // Triad count in Form View
  const triadCount = useMemo(() => {
    if (!editingTemplate) return 0;
    return [
      editingTemplate.masterGoogleDocsUrl,
      editingTemplate.masterExcelSheetUrl,
      editingTemplate.masterPdfUrl,
    ].filter(Boolean).length;
  }, [editingTemplate]);

  // Add a suggested line from catalog or custom
  const handleAddLine = (productId?: string) => {
    if (!editingTemplate) return;
    const product = productId ? products.find((p) => p.id === productId) : undefined;
    const newLine = {
      id: `tline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: product?.id || undefined,
      description: product ? `${product.sku ? `[${product.sku}] ` : ''}${product.name}` : 'Nuevo servicio / partida del modelo',
      quantity: 1,
      unitPrice: product ? Number(product.basePrice || 0) : 0,
      total: product ? Number(product.basePrice || 0) : 0,
    };
    const nextLines = [...(editingTemplate.suggestedLines || []), newLine];
    const nextTotal = nextLines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    setEditingTemplate({
      ...editingTemplate,
      suggestedLines: nextLines,
      baseAmount: nextTotal > 0 ? nextTotal : editingTemplate.baseAmount,
    });
  };

  const handleUpdateLine = (
    idx: number,
    field: 'description' | 'quantity' | 'unitPrice' | 'productId',
    value: string | number
  ) => {
    if (!editingTemplate) return;
    const nextLines = [...(editingTemplate.suggestedLines || [])];
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
    setEditingTemplate({
      ...editingTemplate,
      suggestedLines: nextLines,
      baseAmount: nextTotal > 0 ? nextTotal : editingTemplate.baseAmount,
    });
  };

  const handleRemoveLine = (idx: number) => {
    if (!editingTemplate) return;
    const nextLines = (editingTemplate.suggestedLines || []).filter((_, i) => i !== idx);
    const nextTotal = nextLines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    setEditingTemplate({
      ...editingTemplate,
      suggestedLines: nextLines,
      baseAmount: nextLines.length > 0 ? nextTotal : editingTemplate.baseAmount,
    });
  };

  // Add a quick work note to template workLog
  const handleAddWorkNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !workNoteInput.trim()) return;
    const entry = createLogEntry('work_note', 'Nota de revisión en Proforma Modelo', workNoteInput.trim());
    const updated: Partial<SalesQuoteTemplate> = {
      ...editingTemplate,
      workLog: [entry, ...(editingTemplate.workLog || [])],
      updatedAt: new Date().toISOString(),
    };
    setEditingTemplate(updated);
    setWorkNoteInput('');
    if (updated.id && updated.name?.trim()) {
      await onSaveTemplate(updated);
    }
  };

  // Save Template from Tryton Form
  const handleSaveSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingTemplate?.name?.trim()) {
      alert('Por favor ingresa un nombre para la proforma modelo.');
      return;
    }
    try {
      setIsSubmitting(true);
      const isNew = !editingTemplate.id;
      const logEntry = createLogEntry(
        'edition',
        isNew ? 'Creación de Proforma Modelo' : 'Actualización de Ficha de Proforma Modelo',
        `${editingTemplate.code} • ${editingTemplate.name} — Monto Base: $${Number(editingTemplate.baseAmount || 0).toFixed(2)}`
      );
      const toSave: Partial<SalesQuoteTemplate> = {
        ...editingTemplate,
        workLog: [logEntry, ...(editingTemplate.workLog || [])],
        updatedAt: new Date().toISOString(),
      };
      await onSaveTemplate(toSave);
      setIsFormOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error al guardar proforma modelo:', error);
      alert('Ocurrió un error al guardar el modelo. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Use Template modal
  const handleOpenUseTemplate = (template: SalesQuoteTemplate) => {
    setUseModalTemplate(template);
    setTargetClientId(clients[0]?.id || '');
    setTargetDealId('');
    setQuoteCustomTitle(`Cotización: ${template.name}`);
    setQuoteCustomAmount(template.baseAmount || 0);
  };

  // Confirm Use Template
  const handleConfirmUseTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useModalTemplate || !targetClientId) {
      alert('Por favor selecciona un cliente para generar la cotización.');
      return;
    }
    try {
      setIsSubmitting(true);
      await onUseTemplateToQuote(
        useModalTemplate,
        targetClientId,
        targetDealId || undefined,
        quoteCustomTitle,
        quoteCustomAmount
      );
      setUseModalTemplate(null);
      alert('¡Cotización generada con éxito a partir de la proforma modelo!');
    } catch (error) {
      console.error('Error al clonar plantilla:', error);
      alert('Error al generar la cotización. Por favor reintenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===========================================================================
  // RENDER: TRYTON FORM VIEW (FICHA COMPLETA DE PROFORMA MODELO)
  // ===========================================================================
  if (isFormOpen && editingTemplate) {
    const currentCat = getCategoryMeta(editingTemplate.category);

    return (
      <div className="min-h-screen bg-slate-50/70 pb-16 text-left">
        {/* CABECERA COMPACTA TRYTON (2 FILAS) */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Izquierda: Volver + Código + Nombre Editable */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingTemplate(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-xs font-bold pr-2.5"
                  title="Volver a la lista de Proformas Modelo"
                >
                  <ArrowLeft size={15} />
                  <span className="hidden sm:inline">Lista</span>
                </button>

                <input
                  type="text"
                  value={editingTemplate.code || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                  className="w-36 px-2 py-0.5 bg-slate-900 text-ng-lime rounded-md text-[10px] font-mono font-black tracking-wider shrink-0 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-ng-lime"
                  title="Código de la Proforma Modelo"
                />

                <input
                  type="text"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Nombre de la Proforma Modelo (Ej: Monitoreo de Ruido Ocupacional)..."
                  className="text-sm sm:text-base font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5 truncate flex-1 min-w-[200px]"
                />
              </div>

              {/* Centro: Selector rápido de Categoría (6 Líneas de Negocio Oficiales) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={normalizeTemplateCategory(editingTemplate.category)}
                  onChange={(e) => handleCategoryChange(e.target.value as OfficialTemplateCategory)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border cursor-pointer focus:outline-none ${currentCat.badge}`}
                >
                  <option value="qhse">🔬 QHSE</option>
                  <option value="epp">🦺 EPPs</option>
                  <option value="capacitacion">🎓 Capacitación y Certificación</option>
                  <option value="equipos_medicion">📟 Equipos de Medición</option>
                  <option value="proyectos">🏗️ PRO - Proyectos</option>
                  <option value="otros">📦 Otros</option>
                </select>

                {/* Botón Historial Desplegable */}
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    showHistoryDrawer
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title="Ver historial de cambios del modelo"
                >
                  <History size={12} />
                  <span className="hidden md:inline">Historial</span>
                  <span className="px-1 py-0.2 bg-slate-200/80 text-slate-800 rounded text-[9px] font-black">
                    {editingTemplate.workLog?.length || 0}
                  </span>
                </button>
              </div>

              {/* Derecha: Emitir Cotización + Eliminar + Guardar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {editingTemplate.id && (
                  <button
                    type="button"
                    onClick={() => handleOpenUseTemplate(editingTemplate as SalesQuoteTemplate)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Generar una cotización real a partir de este modelo"
                  >
                    <Sparkles size={13} className="text-amber-600" />
                    <span className="hidden sm:inline">⚡ Cotizar con Modelo</span>
                  </button>
                )}

                {editingTemplate.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`¿Deseas eliminar la proforma modelo "${editingTemplate.name}"?`)) {
                        await onDeleteTemplate(editingTemplate.id!);
                        setIsFormOpen(false);
                        setEditingTemplate(null);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                    title="Eliminar Proforma Modelo"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveSubmit()}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-sm shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar Modelo'}</span>
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
                        placeholder="Registrar nota de versión o ajuste del modelo (ej. Actualización de tarifas 2026)..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send size={12} />
                        <span>Registrar Nota</span>
                      </button>
                    </form>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {!editingTemplate.workLog || editingTemplate.workLog.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-1">
                          Sin registros aún en la bitácora de esta proforma modelo.
                        </p>
                      ) : (
                        editingTemplate.workLog.map((entry) => (
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
                <span>1. Datos Generales & Tríada Documental ({triadCount}/3)</span>
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
                <span>2. Partidas Sugeridas ({editingTemplate.suggestedLines?.length || 0})</span>
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
                <span>3. Bitácora & Comentarios ({editingTemplate.workLog?.length || 0})</span>
              </button>
            </div>

            {/* Píldoras KPI Compactas */}
            <div className="hidden lg:flex items-center gap-2 py-1 text-[11px]">
              <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <DollarSign size={12} className="text-emerald-600" />
                <span className="text-slate-400 font-bold uppercase text-[9px]">Precio Base:</span>
                <span className="font-black text-slate-900">
                  ${(Number(editingTemplate.baseAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <Tag size={12} className="text-blue-600" />
                <span className="text-slate-400 font-bold uppercase text-[9px]">Partidas:</span>
                <span className="font-black text-blue-900">{editingTemplate.suggestedLines?.length || 0} ítems</span>
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
          {/* TAB 1: DATOS GENERALES, CONDICIONES & TRÍADA DOCUMENTAL MAESTRA */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda (2/3): Ficha Principal y Alcance */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                        <Copy size={16} className="text-blue-600" />
                        Identificación de la Proforma Modelo (Tryton Standard)
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400 font-bold">
                        {editingTemplate.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Código del Modelo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingTemplate.code || ''}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nombre Oficial de la Proforma Modelo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingTemplate.name || ''}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                          placeholder="Ej: Monitoreo & Mediciones de Higiene Ocupacional"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Categoría / Línea de Negocio (6 Líneas Oficiales)
                        </label>
                        <select
                          value={normalizeTemplateCategory(editingTemplate.category)}
                          onChange={(e) => handleCategoryChange(e.target.value as OfficialTemplateCategory)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        >
                          <option value="qhse">🔬 QHSE (Higiene, Seguridad & Ambiente)</option>
                          <option value="epp">🦺 EPPs (Equipos de Protección Personal)</option>
                          <option value="capacitacion">🎓 Capacitación y Certificación</option>
                          <option value="equipos_medicion">📟 Equipos de Medición (Instrumentación Técnica)</option>
                          <option value="proyectos">🏗️ PRO - Proyectos (Ingeniería & Consultoría)</option>
                          <option value="otros">📦 Otros (Servicios Generales)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Monto Base de Referencia ($)
                          </label>
                          {linesTotal > 0 && linesTotal !== Number(editingTemplate.baseAmount) && (
                            <button
                              type="button"
                              onClick={() => setEditingTemplate({ ...editingTemplate, baseAmount: linesTotal })}
                              className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer"
                            >
                              Usar suma de partidas (${linesTotal.toFixed(2)})
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={editingTemplate.baseAmount ?? 0}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, baseAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Alcance Técnico Estándar / Entregables y Normativa Aplicable
                      </label>
                      <textarea
                        rows={4}
                        value={editingTemplate.description || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                        placeholder="Detalla qué incluye esta propuesta estándar: metodología, equipos acreditados, informes técnicos, normativa legal y entregables..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha (1/3): Condiciones Comerciales y Partidas */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Clock size={16} className="text-amber-600" />
                      Condiciones Comerciales Base
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Condiciones de Pago Habituales
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.defaultPaymentTerms || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, defaultPaymentTerms: e.target.value })}
                        placeholder="Ej: 50% anticipo, 50% contra entrega"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tiempo de Entrega Habitual
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.defaultDeliveryTime || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, defaultDeliveryTime: e.target.value })}
                        placeholder="Ej: 15 días laborables tras OC"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">
                        Partidas Sugeridas: <strong className="text-blue-700">{editingTemplate.suggestedLines?.length || 0} ítems</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('lines')}
                        className="text-[11px] font-black text-blue-600 hover:underline cursor-pointer"
                      >
                        Editar partidas →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN INTEGRADA EN LA 1RA FICHA: TRÍADA DOCUMENTAL MAESTRA (GOOGLE DOCS, SHEETS & PDF) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                      <Layers size={17} className="text-blue-600" />
                      Tríada Documental Maestra en la Nube (Google Drive / Cloud)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configura aquí mismo los 3 enlaces maestros. Se clonarán automáticamente cuando generes una cotización a partir de esta Proforma Modelo.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black shrink-0">
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
                        {editingTemplate.masterGoogleDocsUrl ? (
                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Vinculado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Pendiente</span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">🟦 Plantilla Google Docs</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Documento base con la estructura formal, metodología técnica, alcance y cláusulas de Novagreen.
                      </p>
                      <input
                        type="url"
                        value={editingTemplate.masterGoogleDocsUrl || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, masterGoogleDocsUrl: e.target.value })}
                        placeholder="https://docs.google.com/document/d/..."
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {editingTemplate.masterGoogleDocsUrl && (
                      <a
                        href={editingTemplate.masterGoogleDocsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>Abrir Plantilla Google Docs</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* 2. Google Sheets / Excel */}
                  <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase">
                          2. Memoria de Cálculo
                        </span>
                        {editingTemplate.masterExcelSheetUrl ? (
                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Vinculado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Pendiente</span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">🟩 Calculadora Sheets / Excel</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Hoja de costos unitarios (APU), viáticos, horas-hombre, margen bruto y desglose económico.
                      </p>
                      <input
                        type="url"
                        value={editingTemplate.masterExcelSheetUrl || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, masterExcelSheetUrl: e.target.value })}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {editingTemplate.masterExcelSheetUrl && (
                      <a
                        href={editingTemplate.masterExcelSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <TrendingUp size={14} />
                        <span>Abrir Calculadora Sheets</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* 3. PDF Muestra / Brochure */}
                  <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[10px] font-black uppercase">
                          3. PDF de Muestra
                        </span>
                        {editingTemplate.masterPdfUrl ? (
                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Vinculado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Pendiente</span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">🟥 PDF Modelo / Brochure</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ejemplo de proforma finalizada o brochure comercial listo para presentar al cliente.
                      </p>
                      <input
                        type="url"
                        value={editingTemplate.masterPdfUrl || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, masterPdfUrl: e.target.value })}
                        placeholder="https://drive.google.com/file/d/.../view"
                        className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    {editingTemplate.masterPdfUrl && (
                      <a
                        href={editingTemplate.masterPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>Abrir PDF de Muestra</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PARTIDAS & ÍTEMS SUGERIDOS (TRYTON LINES) */}
          {/* ========================================================================= */}
          {activeTab === 'lines' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Tag size={18} className="text-blue-600" />
                    Partidas Base del Modelo (Tryton Lines)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define los ítems, análisis o servicios que se cargarán automáticamente al emitir una cotización desde este modelo.
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

              {!editingTemplate.suggestedLines || editingTemplate.suggestedLines.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <Tag size={36} className="mx-auto text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Sin partidas base configuradas</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Agrega productos o servicios del catálogo para que esta Proforma Modelo tenga su desglose técnico-económico listo para cotizar.
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
                      {editingTemplate.suggestedLines.map((line, idx) => {
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
                          Total Acumulado de Partidas Sugeridas:
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
          {/* TAB 3: BITÁCORA DE VERSIONES & COMENTARIOS */}
          {/* ========================================================================= */}
          {activeTab === 'worklog' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <History size={16} className="text-blue-600" />
                  Bitácora de Versiones del Modelo ({editingTemplate.workLog?.length || 0})
                </h3>

                <form onSubmit={handleAddWorkNote} className="flex gap-2">
                  <input
                    type="text"
                    value={workNoteInput}
                    onChange={(e) => setWorkNoteInput(e.target.value)}
                    placeholder="Registrar ajuste de precios, alcance o enlaces..."
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
                  {!editingTemplate.workLog || editingTemplate.workLog.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">
                      No hay registros de cambios en esta proforma modelo todavía.
                    </p>
                  ) : (
                    editingTemplate.workLog.map((entry) => (
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
                {editingTemplate.id ? (
                  <UniversalCommentsThread
                    entityType="quote_template"
                    entityId={editingTemplate.id}
                    entityTitle={editingTemplate.name || editingTemplate.code || 'Proforma Modelo'}
                    currentMember={currentMember}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Guarda la Proforma Modelo primero para habilitar el hilo de comentarios colaborativos.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL: EMITIR COTIZACIÓN DESDE MODELO */}
        <AnimatePresence>
          {useModalTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-base">Emitir Cotización desde Modelo</h3>
                      <p className="text-xs text-slate-500">Clonando: {useModalTemplate.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseModalTemplate(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleConfirmUseTemplate} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Cliente Destinatario <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={targetClientId}
                      onChange={(e) => setTargetClientId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
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

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Oportunidad Vinculada <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <select
                      value={targetDealId}
                      onChange={(e) => setTargetDealId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">-- Sin oportunidad vinculada (Directa) --</option>
                      {deals
                        .filter((d) => !targetClientId || d.clientId === targetClientId)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code ? `[${d.code}] ` : ''}{d.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Título de la Cotización</label>
                    <input
                      type="text"
                      required
                      value={quoteCustomTitle}
                      onChange={(e) => setQuoteCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Monto Cotizado ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={quoteCustomAmount}
                      onChange={(e) => setQuoteCustomAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setUseModalTemplate(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Generando...' : 'Crear Cotización'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ===========================================================================
  // RENDER: VISTA LISTA / TARJETAS DE TRYTON (POR DEFECTO)
  // ===========================================================================
  return (
    <div className="space-y-6">
      {/* 1. HEADER & BANNER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              Biblioteca Corporativa Tryton
            </span>
            <span className="text-xs text-slate-400 font-bold">• {templates.length} plantillas activas</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Copy size={22} className="text-blue-600" />
            Proformas Modelo Estandarizadas
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Modelos oficiales de propuestas técnico-económicas con su Tríada Documental (Google Docs, Excel de Costos y PDF de muestra) y partidas preconfiguradas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus size={16} />
          <span>Nueva Proforma Modelo</span>
        </button>
      </div>

      {/* 2. CATEGORY PILLS, SEARCH & VIEW MODE TOGGLE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {TEMPLATE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, nombre..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista Lista Tryton"
            >
              <List size={14} />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista Tarjetas"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. TEMPLATES LIST (TRYTON TABLE) OR CARDS */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white text-center py-16 px-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <Copy size={44} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron proformas modelo</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No hay plantillas que coincidan con los criterios de búsqueda ingresados.'
              : 'Aún no has registrado modelos en esta categoría. Haz clic en "+ Nueva Proforma Modelo" para abrir el formulario Tryton.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* VISTA TABLA TRYTON */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                <tr>
                  <th className="p-4">Código & Nombre del Modelo</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4 text-center">Partidas Base</th>
                  <th className="p-4 text-center">Tríada Documental Maestra</th>
                  <th className="p-4">Condiciones Habituales</th>
                  <th className="p-4 text-right">Precio Base</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTemplates.map((template) => {
                  const catInfo = getCategoryMeta(template.category);
                  const linesCount = template.suggestedLines?.length || 0;
                  return (
                    <tr
                      key={template.id}
                      onClick={() => handleOpenEdit(template)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {template.code}
                          </span>
                          <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors text-xs mt-1">
                            {template.name}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 max-w-md">
                            {template.description || 'Sin descripción de alcance registrada.'}
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1 ${catInfo.badge}`}>
                          <span>{catInfo.icon}</span>
                          <span>{catInfo.label}</span>
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px]">
                          {linesCount} {linesCount === 1 ? 'partida' : 'partidas'}
                        </span>
                      </td>

                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {template.masterGoogleDocsUrl ? (
                            <a
                              href={template.masterGoogleDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all"
                              title="Abrir Plantilla Google Docs"
                            >
                              <FileText size={15} />
                            </a>
                          ) : (
                            <span className="p-1.5 text-slate-300 border border-slate-100 rounded-lg" title="Sin Docs">
                              <FileText size={15} />
                            </span>
                          )}

                          {template.masterExcelSheetUrl ? (
                            <a
                              href={template.masterExcelSheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all"
                              title="Abrir Calculadora Sheets"
                            >
                              <TrendingUp size={15} />
                            </a>
                          ) : (
                            <span className="p-1.5 text-slate-300 border border-slate-100 rounded-lg" title="Sin Sheets">
                              <TrendingUp size={15} />
                            </span>
                          )}

                          {template.masterPdfUrl ? (
                            <a
                              href={template.masterPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all"
                              title="Abrir PDF Muestra"
                            >
                              <FileText size={15} className="text-rose-600" />
                            </a>
                          ) : (
                            <span className="p-1.5 text-slate-300 border border-slate-100 rounded-lg" title="Sin PDF">
                              <FileText size={15} />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-[11px] text-slate-600 space-y-0.5 max-w-[200px]">
                          <div className="truncate" title={template.defaultPaymentTerms}>
                            <span className="font-bold text-slate-400">Pago:</span> {template.defaultPaymentTerms || 'Estándar'}
                          </div>
                          <div className="truncate" title={template.defaultDeliveryTime}>
                            <span className="font-bold text-slate-400">Plazo:</span> {template.defaultDeliveryTime || 'A convenir'}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs">
                          ${(Number(template.baseAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenUseTemplate(template)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Emitir Cotización con este Modelo"
                          >
                            <Sparkles size={12} className="text-amber-300" />
                            <span>Cotizar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(template)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Abrir Ficha Tryton"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Deseas eliminar la proforma modelo "${template.name}"?`)) {
                                onDeleteTemplate(template.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Modelo"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA TARJETAS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => {
            const catInfo = getCategoryMeta(template.category);
            return (
              <div
                key={template.id}
                onClick={() => handleOpenEdit(template)}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px] font-bold border border-slate-200">
                      {template.code}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${catInfo.badge}`}>
                      {catInfo.icon} {catInfo.label}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {template.name}
                  </h3>

                  {template.baseAmount !== undefined && template.baseAmount > 0 && (
                    <div className="mt-2 text-xs font-black text-slate-900 flex items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Precio Sugerido:</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        ${template.baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {template.description || 'Sin descripción técnica registrada.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleOpenUseTemplate(template)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={14} className="text-amber-300" />
                    <span>⚡ Cotizar con Modelo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(template)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                    title="Abrir Ficha Tryton"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: COTIZAR CON ESTE MODELO */}
      <AnimatePresence>
        {useModalTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base">Emitir Cotización desde Modelo</h3>
                    <p className="text-xs text-slate-500">Clonando: {useModalTemplate.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseModalTemplate(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmUseTemplate} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Cliente Destinatario <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={targetClientId}
                    onChange={(e) => setTargetClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
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

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Oportunidad Vinculada <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <select
                    value={targetDealId}
                    onChange={(e) => setTargetDealId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Sin oportunidad vinculada (Directa) --</option>
                    {deals
                      .filter((d) => !targetClientId || d.clientId === targetClientId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code ? `[${d.code}] ` : ''}{d.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Título de la Cotización</label>
                  <input
                    type="text"
                    required
                    value={quoteCustomTitle}
                    onChange={(e) => setQuoteCustomTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Monto Cotizado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteCustomAmount}
                    onChange={(e) => setQuoteCustomAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm"
                  />
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-800 text-[11px] leading-relaxed">
                  ℹ️ Se clonará la tríada documental (Google Docs y Sheets de cálculo) y las partidas base para personalizar la oferta económica.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUseModalTemplate(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Generando...' : 'Crear Cotización'}
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
