import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Laptop,
  Users,
  DollarSign,
  Layers,
  MessageSquare,
  Award,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  ExternalLink,
  Building2,
  Receipt,
  Calculator,
  TrendingUp,
  TrendingDown,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Percent,
  CreditCard,
  FileText
} from 'lucide-react';
import {
  TrainingManagement,
  TrainingPlan,
  TrainingSession,
  TrainingParticipant,
  TrainingExpenseItem,
  TrainingIncomeItem,
  Trainer,
  TrainingSpace,
  TeamMember,
  Company,
  SalesClient,
  MarketingCampaign,
  Project,
  FiscalTaxType,
  FiscalInvoiceType
} from '../../types';
import { SearchableSelect } from '../common/SearchableSelect';

interface TrainingPlan360ViewProps {
  management?: TrainingManagement | null;
  plan?: TrainingPlan | null;
  plans: TrainingPlan[];
  trainers: Trainer[];
  spaces: TrainingSpace[];
  members: TeamMember[];
  companies?: Company[];
  clients: SalesClient[];
  campaigns: MarketingCampaign[];
  projects?: Project[];
  onSave: (mgmt: Partial<TrainingManagement>, planData?: Partial<TrainingPlan>) => Promise<void>;
  onDelete?: (mgmtId: string, planId?: string) => Promise<void>;
  onBack: () => void;
  isReadOnly?: boolean;
}

export const TrainingPlan360View: React.FC<TrainingPlan360ViewProps> = ({
  management,
  plan,
  plans,
  trainers,
  spaces,
  members,
  companies = [],
  clients,
  campaigns,
  projects = [],
  onSave,
  onDelete,
  onBack,
  isReadOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'participants' | 'finances' | 'stories' | 'notes'>('overview');
  const [isSaving, setIsSaving] = useState(false);

  // Form States - Training Management & Plan
  const [code, setCode] = useState(management?.code || `CAP-${new Date().getFullYear()}-001`);
  const [title, setTitle] = useState(plan?.title || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [status, setStatus] = useState<'pendiente' | 'ejecutada'>(management?.status || 'pendiente');
  const [planStatus, setPlanStatus] = useState<'programada' | 'completada' | 'cancelada'>(plan?.status || 'programada');

  // Origin
  const [originType, setOriginType] = useState(management?.originType || 'internal_initiative');
  const [clientId, setClientId] = useState(management?.clientId || '');
  const [campaignId, setCampaignId] = useState(management?.marketingCampaignId || '');
  const [projectId, setProjectId] = useState(management?.projectId || '');
  const [originDetails, setOriginDetails] = useState(management?.originDetails || '');

  // Main Trainer & Space
  const [mainTrainerId, setMainTrainerId] = useState(plan?.trainerId || (trainers[0]?.id || ''));
  const [mainSpaceId, setMainSpaceId] = useState(plan?.spaceId || (spaces[0]?.id || ''));
  const [date, setDate] = useState(plan?.date || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(plan?.endDate || '');
  const [startTime, setStartTime] = useState(plan?.startTime || '09:00');
  const [endTime, setEndTime] = useState(plan?.endTime || '13:00');

  // Sessions & Participants
  const [sessions, setSessions] = useState<TrainingSession[]>(plan?.sessions || []);
  const [participants, setParticipants] = useState<TrainingParticipant[]>(plan?.participants || []);

  // Tryton Financial Items (Incomes & Expenses with Taxes)
  const [incomes, setIncomes] = useState<TrainingIncomeItem[]>(management?.incomes || [
    {
      id: 'inc-1',
      concept: 'Inscripción de Participantes',
      quantity: 10,
      unitPrice: 150,
      subtotal: 1500,
      hasIva: true,
      taxType: 'iva_15',
      taxRate: 0.15,
      taxAmount: 225,
      total: 1725,
      isPlanned: false,
      paymentStatus: 'cobrado',
      invoiceType: 'factura_emitida'
    }
  ]);

  const [expenses, setExpenses] = useState<TrainingExpenseItem[]>(() => {
    const list: TrainingExpenseItem[] = [];
    if (management?.logisticsExpenses) list.push(...management.logisticsExpenses.map(e => ({ ...e, category: 'logistica' as const })));
    if (management?.spaceExpenses) list.push(...management.spaceExpenses.map(e => ({ ...e, category: 'aulas' as const })));
    if (management?.marketingExpenses) list.push(...management.marketingExpenses.map(e => ({ ...e, category: 'marketing' as const })));
    if (management?.certificateExpenses) list.push(...management.certificateExpenses.map(e => ({ ...e, category: 'certificados' as const })));
    
    if (list.length === 0) {
      return [
        {
          id: 'exp-1',
          description: 'Honorarios Docente',
          category: 'honorarios',
          quantity: 16,
          unitPrice: 35,
          subtotal: 560,
          hasIva: false,
          taxType: 'iva_0',
          taxRate: 0,
          taxAmount: 0,
          total: 560,
          isPlanned: false,
          invoiceType: 'factura_recibida'
        }
      ];
    }
    return list;
  });

  // Calculate Hours
  const totalPlannedHours = useMemo(() => {
    if (sessions.length > 0) {
      return sessions.reduce((acc, s) => acc + (s.plannedHours || 0), 0);
    }
    // Calculate from start and end time
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (!isNaN(sh) && !isNaN(eh)) {
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return diff > 0 ? parseFloat((diff / 60).toFixed(1)) : 0;
    }
    return 0;
  }, [sessions, startTime, endTime]);

  const totalExecutedHours = useMemo(() => {
    if (sessions.length > 0) {
      return sessions.reduce((acc, s) => acc + (s.executedHours || s.plannedHours || 0), 0);
    }
    return totalPlannedHours;
  }, [sessions, totalPlannedHours]);

  // Tryton Financial Analysis (Budget vs Real & Taxes)
  const financialAnalysis = useMemo(() => {
    let plannedIncomeSubtotal = 0;
    let plannedIncomeTotal = 0;
    let realIncomeSubtotal = 0;
    let realIncomeTotal = 0;

    incomes.forEach(inc => {
      const sub = inc.subtotal || (inc.quantity * inc.unitPrice);
      const tax = inc.hasIva ? sub * (inc.taxRate || 0.15) : 0;
      const tot = inc.total || (sub + tax);

      if (inc.isPlanned) {
        plannedIncomeSubtotal += sub;
        plannedIncomeTotal += tot;
      } else {
        realIncomeSubtotal += sub;
        realIncomeTotal += tot;
      }
    });

    // If no explicit planned income, take real as base
    if (plannedIncomeSubtotal === 0 && realIncomeSubtotal > 0) {
      plannedIncomeSubtotal = realIncomeSubtotal;
      plannedIncomeTotal = realIncomeTotal;
    }

    let plannedExpenseSubtotal = 0;
    let plannedExpenseTotal = 0;
    let realExpenseSubtotal = 0;
    let realExpenseTotal = 0;

    expenses.forEach(exp => {
      const sub = exp.subtotal || (exp.quantity * exp.unitPrice);
      const tax = exp.hasIva ? sub * (exp.taxRate || 0.15) : 0;
      const tot = exp.total || (sub + tax);

      if (exp.isPlanned) {
        plannedExpenseSubtotal += sub;
        plannedExpenseTotal += tot;
      } else {
        realExpenseSubtotal += sub;
        realExpenseTotal += tot;
      }
    });

    if (plannedExpenseSubtotal === 0 && realExpenseSubtotal > 0) {
      plannedExpenseSubtotal = realExpenseSubtotal;
      plannedExpenseTotal = realExpenseTotal;
    }

    const plannedProfit = plannedIncomeSubtotal - plannedExpenseSubtotal;
    const realProfit = realIncomeSubtotal - realExpenseSubtotal;
    const realMarginPercent = realIncomeSubtotal > 0 ? (realProfit / realIncomeSubtotal) * 100 : 0;
    const plannedMarginPercent = plannedIncomeSubtotal > 0 ? (plannedProfit / plannedIncomeSubtotal) * 100 : 0;

    return {
      plannedIncomeSubtotal,
      plannedIncomeTotal,
      realIncomeSubtotal,
      realIncomeTotal,
      plannedExpenseSubtotal,
      plannedExpenseTotal,
      realExpenseSubtotal,
      realExpenseTotal,
      plannedProfit,
      realProfit,
      realMarginPercent,
      plannedMarginPercent,
      varianceProfit: realProfit - plannedProfit
    };
  }, [incomes, expenses]);

  // Helpers
  const getTrainerName = (trId: string) => {
    const tr = trainers.find(t => t.id === trId);
    if (!tr) return 'No asignado';
    const mem = members.find(m => m.id === tr.directoryId);
    return mem ? mem.name : 'Capacitador';
  };

  const getSpaceName = (spId: string) => {
    const sp = spaces.find(s => s.id === spId);
    return sp ? sp.name : 'Espacio no definido';
  };

  const getClientName = (cId?: string) => {
    if (!cId) return null;
    const c = clients.find(cl => cl.id === cId);
    if (!c) return null;
    if (c.clientType === 'B2B') {
      const comp = companies.find(cp => cp.id === c.directoryId);
      return comp ? comp.name : 'Empresa Cliente';
    }
    const mem = members.find(m => m.id === c.directoryId);
    return mem ? mem.name : 'Cliente Persona';
  };

  // Add Item Handlers
  const handleAddSession = () => {
    const newSession: TrainingSession = {
      id: `sess-${Date.now()}`,
      date,
      startTime: '09:00',
      endTime: '13:00',
      trainerId: mainTrainerId,
      spaceId: mainSpaceId,
      topic: `Módulo ${sessions.length + 1}: `,
      plannedHours: 4,
      executedHours: 4,
      hourlyRate: trainers.find(t => t.id === mainTrainerId)?.hourlyRate || 35
    };
    setSessions([...sessions, newSession]);
  };

  const handleAddParticipant = () => {
    const newPart: TrainingParticipant = {
      id: `part-${Date.now()}`,
      name: '',
      identification: '',
      email: '',
      companyName: getClientName(clientId) || '',
      attendancePercent: 100,
      finalGrade: 10,
      status: 'inscrito',
      paymentStatus: 'pendiente'
    };
    setParticipants([...participants, newPart]);
  };

  const handleAddIncome = () => {
    const newInc: TrainingIncomeItem = {
      id: `inc-${Date.now()}`,
      concept: 'Venta de Cupo / Curso',
      quantity: 1,
      unitPrice: 150,
      subtotal: 150,
      hasIva: true,
      taxType: 'iva_15',
      taxRate: 0.15,
      taxAmount: 22.5,
      total: 172.5,
      isPlanned: false,
      paymentStatus: 'pendiente',
      invoiceType: 'factura_emitida'
    };
    setIncomes([...incomes, newInc]);
  };

  const handleAddExpense = () => {
    const newExp: TrainingExpenseItem = {
      id: `exp-${Date.now()}`,
      description: 'Gasto Operativo',
      category: 'logistica',
      quantity: 1,
      unitPrice: 50,
      subtotal: 50,
      hasIva: true,
      taxType: 'iva_15',
      taxRate: 0.15,
      taxAmount: 7.5,
      total: 57.5,
      isPlanned: false,
      invoiceType: 'factura_recibida'
    };
    setExpenses([...expenses, newExp]);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const planData: Partial<TrainingPlan> = {
        title,
        description,
        trainerId: mainTrainerId,
        spaceId: mainSpaceId,
        date,
        endDate,
        startTime,
        endTime,
        totalHours: totalPlannedHours,
        totalExecutedHours,
        status: planStatus,
        sessions,
        participants
      };

      const mgmtData: Partial<TrainingManagement> = {
        code,
        status,
        originType: originType as any,
        clientId: clientId || undefined,
        marketingCampaignId: campaignId || undefined,
        projectId: projectId || undefined,
        originDetails,
        totalHours: totalPlannedHours,
        totalExecutedHours,
        
        // Tryton Budget & Real Totals
        plannedTotalIncome: financialAnalysis.plannedIncomeSubtotal,
        plannedTotalCost: financialAnalysis.plannedExpenseSubtotal,
        plannedNetProfit: financialAnalysis.plannedProfit,
        plannedProfitMargin: financialAnalysis.plannedMarginPercent,

        totalIncome: financialAnalysis.realIncomeSubtotal,
        totalCost: financialAnalysis.realExpenseSubtotal,
        netProfit: financialAnalysis.realProfit,
        profitMargin: financialAnalysis.realMarginPercent,

        incomes,
        logisticsExpenses: expenses.filter(e => e.category === 'logistica'),
        spaceExpenses: expenses.filter(e => e.category === 'aulas'),
        marketingExpenses: expenses.filter(e => e.category === 'marketing'),
        certificateExpenses: expenses.filter(e => e.category === 'certificados')
      };

      await onSave(mgmtData, planData);
    } catch (error) {
      console.error('Error saving training plan:', error);
      alert('Hubo un error al guardar. Verifique los datos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-20">
      {/* Top Action Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Volver a Capacitaciones</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                Plan 360° Tryton
              </span>
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {code}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isReadOnly && (
              <>
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Plan'}</span>
                </button>
                {management?.id && onDelete && (
                  <button
                    onClick={() => {
                      if (confirm('¿Estás seguro de que deseas eliminar esta gestión de capacitación?')) {
                        onDelete(management.id, management.planId);
                      }
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Eliminar capacitación"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Título del Plan de Formación..."
                  className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full sm:w-auto min-w-[300px]"
                />
                <select
                  value={planStatus}
                  onChange={e => setPlanStatus(e.target.value as any)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border outline-none ${
                    planStatus === 'completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <option value="programada">Programada</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" />
                  <strong>{date}</strong> {endDate && `al ${endDate}`}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-600" />
                  Instructor: <strong className="text-slate-800">{getTrainerName(mainTrainerId)}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-amber-600" />
                  {getSpaceName(mainSpaceId)}
                </span>
                {clientId && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                      {getClientName(clientId)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Smart KPI Buttons (Tryton Pattern) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-indigo-600 mb-1">
                  <Users size={18} />
                </div>
                <div className="text-lg font-black text-slate-900">{participants.length}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alumnos</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-emerald-600 mb-1">
                  <Clock size={18} />
                </div>
                <div className="text-lg font-black text-slate-900">{totalExecutedHours}h</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Horas</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-blue-600 mb-1">
                  <DollarSign size={18} />
                </div>
                <div className="text-lg font-black text-emerald-600">${financialAnalysis.realProfit.toLocaleString()}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Utilidad Neta</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center min-w-[110px]">
                <div className="flex items-center justify-center text-purple-600 mb-1">
                  <Percent size={18} />
                </div>
                <div className="text-lg font-black text-slate-900">{financialAnalysis.realMarginPercent.toFixed(1)}%</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Margen Real</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 mt-8 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'overview'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={16} />
              <span>Estructura & Objetivos</span>
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'sessions'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={16} />
              <span>Cronograma & Sesiones ({sessions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'participants'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={16} />
              <span>Participantes ({participants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('finances')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'finances'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <DollarSign size={16} />
              <span>Finanzas Tryton (Plan vs Real)</span>
            </button>

            <button
              onClick={() => setActiveTab('stories')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'stories'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={16} />
              <span>Historias de Aprendizaje</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'notes'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={16} />
              <span>Comentarios & Auditoría</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <BookOpen size={18} className="text-emerald-600" />
                  <span>Descripción y Contenido Temático</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Resumen del Programa Académico
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Detalla los objetivos, módulos temáticos y competencias a desarrollar en este curso..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* General Schedule & Instructors */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <span>Configuración General de Fechas y Docente</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Capacitador Principal
                    </label>
                    <select
                      value={mainTrainerId}
                      onChange={e => setMainTrainerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {trainers.map(tr => {
                        const m = members.find(mem => mem.id === tr.directoryId);
                        return (
                          <option key={tr.id} value={tr.id}>
                            {m?.name || 'Capacitador'} ({tr.type}) - ${tr.hourlyRate || 0}/h
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Espacio Principal (Aula / Virtual)
                    </label>
                    <select
                      value={mainSpaceId}
                      onChange={e => setMainSpaceId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {spaces.map(sp => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({sp.type === 'virtual' ? 'Virtual' : 'Presencial'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha Fin (Opcional)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Hora Inicio
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Hora Fin
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Origin & Client Association */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Building2 size={18} className="text-amber-600" />
                  <span>Origen & Asociación Comercial</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tipo de Origen
                    </label>
                    <select
                      value={originType}
                      onChange={e => setOriginType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="internal_initiative">Iniciativa Interna / Calendario Abierto</option>
                      <option value="direct_client">Cliente Directo / In-Company</option>
                      <option value="marketing_campaign">Campaña de Marketing / Captación</option>
                      <option value="project">Proyecto Empresarial</option>
                    </select>
                  </div>

                  {originType === 'direct_client' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Cliente / Empresa
                      </label>
                      <select
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">Seleccione un cliente...</option>
                        {clients.map(c => {
                          const name = getClientName(c.id);
                          return <option key={c.id} value={c.id}>{name || c.id}</option>;
                        })}
                      </select>
                    </div>
                  )}

                  {originType === 'marketing_campaign' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Campaña de Marketing
                      </label>
                      <select
                        value={campaignId}
                        onChange={e => setCampaignId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">Seleccione una campaña...</option>
                        {campaigns.map(camp => (
                          <option key={camp.id} value={camp.id}>{camp.name} ({camp.code})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {originType === 'project' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Proyecto
                      </label>
                      <select
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">Seleccione un proyecto...</option>
                        {projects.map(prj => (
                          <option key={prj.id} value={prj.id}>{prj.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Notas del Origen
                    </label>
                    <textarea
                      rows={2}
                      value={originDetails}
                      onChange={e => setOriginDetails(e.target.value)}
                      placeholder="Observaciones de la propuesta comercial o contrato..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sessions & Cronograma */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cronograma de Sesiones de Clase</h3>
                <p className="text-sm text-slate-500">Módulos, horarios, docentes y aulas físicas o virtuales</p>
              </div>
              <button
                onClick={handleAddSession}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus size={16} />
                <span>Agregar Sesión</span>
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar size={40} className="mx-auto mb-2 opacity-30 text-indigo-600" />
                <p className="text-sm font-bold text-slate-700">Sin sesiones multidía creadas</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Este curso utilizará la fecha y horario principal ({date} de {startTime} a {endTime}).
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((sess, idx) => (
                  <div key={sess.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-center">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Módulo / Tema</label>
                        <input
                          type="text"
                          value={sess.topic || ''}
                          onChange={e => {
                            const copy = [...sessions];
                            copy[idx].topic = e.target.value;
                            setSessions(copy);
                          }}
                          placeholder="Nombre del tema..."
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha</label>
                        <input
                          type="date"
                          value={sess.date}
                          onChange={e => {
                            const copy = [...sessions];
                            copy[idx].date = e.target.value;
                            setSessions(copy);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horario</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={sess.startTime}
                            onChange={e => {
                              const copy = [...sessions];
                              copy[idx].startTime = e.target.value;
                              setSessions(copy);
                            }}
                            className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={sess.endTime}
                            onChange={e => {
                              const copy = [...sessions];
                              copy[idx].endTime = e.target.value;
                              setSessions(copy);
                            }}
                            className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Docente</label>
                        <select
                          value={sess.trainerId}
                          onChange={e => {
                            const copy = [...sessions];
                            copy[idx].trainerId = e.target.value;
                            setSessions(copy);
                          }}
                          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                        >
                          {trainers.map(tr => {
                            const m = members.find(mem => mem.id === tr.directoryId);
                            return <option key={tr.id} value={tr.id}>{m?.name || 'Docente'}</option>;
                          })}
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Aula</label>
                          <select
                            value={sess.spaceId}
                            onChange={e => {
                              const copy = [...sessions];
                              copy[idx].spaceId = e.target.value;
                              setSessions(copy);
                            }}
                            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                          >
                            {spaces.map(sp => (
                              <option key={sp.id} value={sp.id}>{sp.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => setSessions(sessions.filter((_, sidx) => sidx !== idx))}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg mt-4"
                          title="Eliminar sesión"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Participants */}
        {activeTab === 'participants' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Alumnos & Participantes Inscritos</h3>
                <p className="text-sm text-slate-500">Control de asistencia, calificaciones y certificados emitidos</p>
              </div>
              <button
                onClick={handleAddParticipant}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus size={16} />
                <span>Inscribir Alumno</span>
              </button>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users size={40} className="mx-auto mb-2 opacity-30 text-emerald-600" />
                <p className="text-sm font-bold text-slate-700">Sin alumnos inscritos aún</p>
                <p className="text-xs text-slate-500 mt-0.5">Agrega los participantes para emitir certificados y controlar asistencia.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Nombre Completo</th>
                      <th className="py-3 px-3">Cédula / RUC</th>
                      <th className="py-3 px-3">Empresa</th>
                      <th className="py-3 px-3 text-center">% Asistencia</th>
                      <th className="py-3 px-3 text-center">Nota Final</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-3 text-center">Certificado</th>
                      <th className="py-3 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {participants.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={p.name}
                            onChange={e => {
                              const copy = [...participants];
                              copy[idx].name = e.target.value;
                              setParticipants(copy);
                            }}
                            placeholder="Nombre del Alumno"
                            className="w-full font-bold text-slate-900 bg-transparent outline-none focus:border-b focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          <input
                            type="text"
                            value={p.identification || ''}
                            onChange={e => {
                              const copy = [...participants];
                              copy[idx].identification = e.target.value;
                              setParticipants(copy);
                            }}
                            placeholder="1720012345"
                            className="w-full bg-transparent outline-none focus:border-b focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <input
                            type="text"
                            value={p.companyName || ''}
                            onChange={e => {
                              const copy = [...participants];
                              copy[idx].companyName = e.target.value;
                              setParticipants(copy);
                            }}
                            placeholder="Empresa..."
                            className="w-full bg-transparent outline-none focus:border-b focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            value={p.attendancePercent || 100}
                            onChange={e => {
                              const copy = [...participants];
                              copy[idx].attendancePercent = parseFloat(e.target.value) || 0;
                              setParticipants(copy);
                            }}
                            className="w-16 text-center font-bold px-2 py-1 bg-slate-100 rounded-lg outline-none"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            value={p.finalGrade || 10}
                            onChange={e => {
                              const copy = [...participants];
                              copy[idx].finalGrade = parseFloat(e.target.value) || 0;
                              setParticipants(copy);
                            }}
                            className="w-16 text-center font-bold px-2 py-1 bg-emerald-50 text-emerald-800 rounded-lg outline-none"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <select
                            value={p.status}
                            onChange={e => {
                              const copy = [...participants];
                              copy[idx].status = e.target.value as any;
                              setParticipants(copy);
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold bg-white"
                          >
                            <option value="inscrito">Inscrito</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="reprobado">Reprobado</option>
                            <option value="retirado">Retirado</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              const copy = [...participants];
                              copy[idx].certificateIssued = !copy[idx].certificateIssued;
                              setParticipants(copy);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              p.certificateIssued ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {p.certificateIssued ? 'Emitido ✓' : 'Pendiente'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setParticipants(participants.filter((_, pidx) => pidx !== idx))}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Tryton Financial Analysis (Incomes & Expenses with Taxes) */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-emerald-600">
                  <span className="text-xs font-black uppercase tracking-wider">Ingresos Totales (sin IVA)</span>
                  <DollarSign size={20} />
                </div>
                <div className="text-2xl font-black text-slate-900">${financialAnalysis.realIncomeSubtotal.toLocaleString()}</div>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Con IVA: <strong>${financialAnalysis.realIncomeTotal.toLocaleString()}</strong></span>
                  <span className="text-emerald-600 font-bold">Plan: ${financialAnalysis.plannedIncomeSubtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-rose-600">
                  <span className="text-xs font-black uppercase tracking-wider">Costos Totales (sin IVA)</span>
                  <Receipt size={20} />
                </div>
                <div className="text-2xl font-black text-slate-900">${financialAnalysis.realExpenseSubtotal.toLocaleString()}</div>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Con IVA: <strong>${financialAnalysis.realExpenseTotal.toLocaleString()}</strong></span>
                  <span className="text-slate-500 font-bold">Plan: ${financialAnalysis.plannedExpenseSubtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-indigo-600">
                  <span className="text-xs font-black uppercase tracking-wider">Utilidad Neta & Margen</span>
                  <TrendingUp size={20} />
                </div>
                <div className="text-2xl font-black text-indigo-600">${financialAnalysis.realProfit.toLocaleString()}</div>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Margen Real: <strong>{financialAnalysis.realMarginPercent.toFixed(1)}%</strong></span>
                  <span className={financialAnalysis.varianceProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {financialAnalysis.varianceProfit >= 0 ? '+' : ''}${financialAnalysis.varianceProfit.toLocaleString()} vs Plan
                  </span>
                </div>
              </div>
            </div>

            {/* Incomes Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Ingresos (Ventas / Cobros de Alumnos)</h3>
                    <p className="text-xs text-slate-500">Desglose de bases imponibles, IVA y comprobantes fiscales</p>
                  </div>
                </div>

                <button
                  onClick={handleAddIncome}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus size={14} />
                  <span>Agregar Ingreso</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Concepto</th>
                      <th className="py-2.5 px-2 text-center">Fase</th>
                      <th className="py-2.5 px-2 text-right">Cant.</th>
                      <th className="py-2.5 px-2 text-right">P. Unit (sin IVA)</th>
                      <th className="py-2.5 px-2 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 text-center">IVA</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                      <th className="py-2.5 px-3">Comprobante Fiscal</th>
                      <th className="py-2.5 px-2 text-center">Cobro</th>
                      <th className="py-2.5 px-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {incomes.map((inc, idx) => {
                      const sub = inc.quantity * inc.unitPrice;
                      const tax = inc.hasIva ? sub * (inc.taxRate || 0.15) : 0;
                      const tot = sub + tax;

                      return (
                        <tr key={inc.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={inc.concept}
                              onChange={e => {
                                const copy = [...incomes];
                                copy[idx].concept = e.target.value;
                                setIncomes(copy);
                              }}
                              className="w-full font-bold text-slate-900 bg-transparent outline-none focus:border-b focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => {
                                const copy = [...incomes];
                                copy[idx].isPlanned = !copy[idx].isPlanned;
                                setIncomes(copy);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                inc.isPlanned ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {inc.isPlanned ? 'Plan' : 'Real'}
                            </button>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              value={inc.quantity}
                              onChange={e => {
                                const copy = [...incomes];
                                copy[idx].quantity = parseFloat(e.target.value) || 0;
                                copy[idx].subtotal = copy[idx].quantity * copy[idx].unitPrice;
                                copy[idx].total = copy[idx].hasIva ? copy[idx].subtotal * 1.15 : copy[idx].subtotal;
                                setIncomes(copy);
                              }}
                              className="w-14 text-right px-1.5 py-0.5 rounded bg-slate-100 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              value={inc.unitPrice}
                              onChange={e => {
                                const copy = [...incomes];
                                copy[idx].unitPrice = parseFloat(e.target.value) || 0;
                                copy[idx].subtotal = copy[idx].quantity * copy[idx].unitPrice;
                                copy[idx].total = copy[idx].hasIva ? copy[idx].subtotal * 1.15 : copy[idx].subtotal;
                                setIncomes(copy);
                              }}
                              className="w-16 text-right px-1.5 py-0.5 rounded bg-slate-100 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-800">
                            ${sub.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!inc.hasIva}
                                onChange={e => {
                                  const copy = [...incomes];
                                  copy[idx].hasIva = e.target.checked;
                                  copy[idx].taxRate = e.target.checked ? 0.15 : 0;
                                  copy[idx].taxAmount = e.target.checked ? sub * 0.15 : 0;
                                  copy[idx].total = sub + (copy[idx].taxAmount || 0);
                                  setIncomes(copy);
                                }}
                                className="rounded text-emerald-600"
                              />
                              <span className="text-[11px] font-bold text-slate-600">{inc.hasIva ? '15%' : '0%'}</span>
                            </label>
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-emerald-600">
                            ${tot.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={inc.invoiceType || 'factura_emitida'}
                                onChange={e => {
                                  const copy = [...incomes];
                                  copy[idx].invoiceType = e.target.value as any;
                                  setIncomes(copy);
                                }}
                                className="px-1.5 py-1 rounded border border-slate-200 text-[11px] bg-white font-medium"
                              >
                                <option value="factura_emitida">Factura Emitida</option>
                                <option value="nota_venta_rimpe">Nota Venta (RIMPE)</option>
                                <option value="sin_comprobante">Sin Factura</option>
                              </select>
                              <input
                                type="text"
                                value={inc.invoiceOrReceiptNumber || ''}
                                onChange={e => {
                                  const copy = [...incomes];
                                  copy[idx].invoiceOrReceiptNumber = e.target.value;
                                  setIncomes(copy);
                                }}
                                placeholder="No. Factura"
                                className="w-24 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <select
                              value={inc.paymentStatus || 'pendiente'}
                              onChange={e => {
                                const copy = [...incomes];
                                copy[idx].paymentStatus = e.target.value as any;
                                setIncomes(copy);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                inc.paymentStatus === 'cobrado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <option value="cobrado">Cobrado</option>
                              <option value="pendiente">Pendiente</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => setIncomes(incomes.filter((_, iidx) => iidx !== idx))}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Gastos & Costos (Docentes, Logística, Aulas)</h3>
                    <p className="text-xs text-slate-500">Control presupuestario y facturación recibida de proveedores</p>
                  </div>
                </div>

                <button
                  onClick={handleAddExpense}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus size={14} />
                  <span>Agregar Gasto</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-2">Categoría</th>
                      <th className="py-2.5 px-2 text-center">Fase</th>
                      <th className="py-2.5 px-2 text-right">Cant.</th>
                      <th className="py-2.5 px-2 text-right">P. Unit (sin IVA)</th>
                      <th className="py-2.5 px-2 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 text-center">IVA</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                      <th className="py-2.5 px-3">Comprobante Recibido</th>
                      <th className="py-2.5 px-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {expenses.map((exp, idx) => {
                      const sub = exp.quantity * exp.unitPrice;
                      const tax = exp.hasIva ? sub * (exp.taxRate || 0.15) : 0;
                      const tot = sub + tax;

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={exp.description}
                              onChange={e => {
                                const copy = [...expenses];
                                copy[idx].description = e.target.value;
                                setExpenses(copy);
                              }}
                              className="w-full font-bold text-slate-900 bg-transparent outline-none focus:border-b focus:border-rose-500"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <select
                              value={exp.category || 'logistica'}
                              onChange={e => {
                                const copy = [...expenses];
                                copy[idx].category = e.target.value as any;
                                setExpenses(copy);
                              }}
                              className="px-2 py-1 rounded border border-slate-200 text-[11px] bg-white font-medium"
                            >
                              <option value="honorarios">Honorarios</option>
                              <option value="logistica">Logística</option>
                              <option value="aulas">Aulas / Espacios</option>
                              <option value="marketing">Marketing</option>
                              <option value="certificados">Certificados</option>
                              <option value="materiales">Materiales</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => {
                                const copy = [...expenses];
                                copy[idx].isPlanned = !copy[idx].isPlanned;
                                setExpenses(copy);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                exp.isPlanned ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {exp.isPlanned ? 'Plan' : 'Real'}
                            </button>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              value={exp.quantity}
                              onChange={e => {
                                const copy = [...expenses];
                                copy[idx].quantity = parseFloat(e.target.value) || 0;
                                copy[idx].subtotal = copy[idx].quantity * copy[idx].unitPrice;
                                copy[idx].total = copy[idx].hasIva ? copy[idx].subtotal * 1.15 : copy[idx].subtotal;
                                setExpenses(copy);
                              }}
                              className="w-14 text-right px-1.5 py-0.5 rounded bg-slate-100 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              value={exp.unitPrice}
                              onChange={e => {
                                const copy = [...expenses];
                                copy[idx].unitPrice = parseFloat(e.target.value) || 0;
                                copy[idx].subtotal = copy[idx].quantity * copy[idx].unitPrice;
                                copy[idx].total = copy[idx].hasIva ? copy[idx].subtotal * 1.15 : copy[idx].subtotal;
                                setExpenses(copy);
                              }}
                              className="w-16 text-right px-1.5 py-0.5 rounded bg-slate-100 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-800">
                            ${sub.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!exp.hasIva}
                                onChange={e => {
                                  const copy = [...expenses];
                                  copy[idx].hasIva = e.target.checked;
                                  copy[idx].taxRate = e.target.checked ? 0.15 : 0;
                                  copy[idx].taxAmount = e.target.checked ? sub * 0.15 : 0;
                                  copy[idx].total = sub + (copy[idx].taxAmount || 0);
                                  setExpenses(copy);
                                }}
                                className="rounded text-rose-600"
                              />
                              <span className="text-[11px] font-bold text-slate-600">{exp.hasIva ? '15%' : '0%'}</span>
                            </label>
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-rose-600">
                            ${tot.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={exp.invoiceType || 'factura_recibida'}
                                onChange={e => {
                                  const copy = [...expenses];
                                  copy[idx].invoiceType = e.target.value as any;
                                  setExpenses(copy);
                                }}
                                className="px-1.5 py-1 rounded border border-slate-200 text-[11px] bg-white font-medium"
                              >
                                <option value="factura_recibida">Factura Recibida</option>
                                <option value="nota_venta_rimpe">Nota Venta (RIMPE)</option>
                                <option value="sin_comprobante">Sin Factura</option>
                              </select>
                              <input
                                type="text"
                                value={exp.invoiceNumber || ''}
                                onChange={e => {
                                  const copy = [...expenses];
                                  copy[idx].invoiceNumber = e.target.value;
                                  setExpenses(copy);
                                }}
                                placeholder="No. Factura"
                                className="w-24 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => setExpenses(expenses.filter((_, eidx) => eidx !== idx))}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Stories */}
        {activeTab === 'stories' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Historias de Aprendizaje & Tareas Prácticas</h3>
                <p className="text-sm text-slate-500">Entregables, proyectos de evaluación y actividades asignadas</p>
              </div>
            </div>

            <div className="text-center py-12 text-slate-400">
              <Layers size={40} className="mx-auto mb-2 opacity-30 text-emerald-600" />
              <p className="text-sm font-bold text-slate-700">Sin historias asignadas a este plan</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea historias prácticas para que los participantes suban sus evidencias de aprendizaje.
              </p>
            </div>
          </div>
        )}

        {/* Tab 6: Notes & Feedback */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Muro de Observaciones & Auditoría</h3>
                <p className="text-sm text-slate-500">Historial interno de seguimiento del plan de capacitación</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Utiliza este espacio para registrar minutas de reuniones de coordinación con el cliente o requerimientos de los participantes.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
