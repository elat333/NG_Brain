import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Laptop, 
  User, 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  DollarSign, 
  Layers, 
  Target, 
  Briefcase, 
  Info,
  ExternalLink,
  Truck,
  Video,
  Megaphone,
  Calculator,
  Receipt,
  Award,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  Sun,
  Moon,
  Shuffle,
  CreditCard,
  Building2,
  Sparkles,
  LogOut
} from 'lucide-react';
import { 
  TrainingManagement, 
  TrainingPlan, 
  TrainingSession, 
  Trainer, 
  TrainingSpace, 
  TeamMember, 
  SalesClient, 
  MarketingCampaign,
  Company,
  Project,
  TrainingExpenseItem,
  TrainingIncomeItem
} from '../../types';
import { SearchableSelect } from '../common/SearchableSelect';

export interface TrainingFullDetailViewProps {
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
  originTabLabel?: string;
}

export const TrainingFullDetailView: React.FC<TrainingFullDetailViewProps> = ({
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
  isReadOnly = false,
  originTabLabel = 'Gestión de Capacitaciones'
}) => {
  // State for Management
  const [code, setCode] = useState(management?.code || '');
  const [status, setStatus] = useState<'pendiente' | 'ejecutada'>(management?.status || 'pendiente');
  const [selectedPlanId, setSelectedPlanId] = useState(management?.planId || plan?.id || '');

  // Origin State
  const [originType, setOriginType] = useState<'marketing_campaign' | 'project' | 'direct_client' | 'internal_initiative' | 'other'>(() => {
    if (management?.originType) return management.originType;
    if (management?.marketingCampaignId) return 'marketing_campaign';
    if (management?.projectId) return 'project';
    if (management?.clientId) return 'direct_client';
    return 'internal_initiative';
  });
  const [clientId, setClientId] = useState(management?.clientId || '');
  const [marketingCampaignId, setMarketingCampaignId] = useState(management?.marketingCampaignId || '');
  const [projectId, setProjectId] = useState(management?.projectId || '');
  const [originDetails, setOriginDetails] = useState(management?.originDetails || '');

  // State for Training Plan & Schedule
  const [planTitle, setPlanTitle] = useState(plan?.title || '');
  const [planDescription, setPlanDescription] = useState(plan?.description || '');
  const [planStatus, setPlanStatus] = useState<'programada' | 'completada' | 'cancelada'>(plan?.status || 'programada');

  // Helper to calculate planned hours from start and end time
  const calcHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return Math.max(0, (eH + (eM || 0) / 60) - (sH + (sM || 0) / 60));
  };

  // Helper to get default trainer hourly rate
  const getDefaultTrainerRate = (trainerId: string): number => {
    const tr = trainers.find(t => t.id === trainerId);
    return tr?.hourlyRate || 0;
  };

  // Sessions state
  const [sessions, setSessions] = useState<TrainingSession[]>(() => {
    const initialRaw = (plan?.sessions && plan.sessions.length > 0)
      ? plan.sessions
      : plan 
        ? [{
            id: `sess-${Date.now()}-0`,
            date: plan.date || new Date().toISOString().split('T')[0],
            startTime: plan.startTime || '09:00',
            endTime: plan.endTime || '12:00',
            trainerId: plan.trainerId || (trainers[0]?.id || ''),
            spaceId: plan.spaceId || (spaces[0]?.id || ''),
            topic: 'Módulo 1: Introducción',
            notes: ''
          }]
        : [{
            id: `sess-${Date.now()}-0`,
            date: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '12:00',
            trainerId: trainers[0]?.id || '',
            spaceId: spaces[0]?.id || '',
            topic: 'Módulo 1: Introducción',
            notes: ''
          }];

    return initialRaw.map((s, idx) => {
      const pHours = Number(calcHours(s.startTime, s.endTime).toFixed(1));
      const rate = s.hourlyRate !== undefined ? s.hourlyRate : getDefaultTrainerRate(s.trainerId);
      const execH = s.executedHours !== undefined ? s.executedHours : (pHours || 0);
      return {
        ...s,
        id: s.id || `sess-${Date.now()}-${idx}`,
        topic: s.topic || `Módulo ${idx + 1}`,
        notes: s.notes || '',
        hourlyRate: rate,
        plannedHours: s.plannedHours !== undefined ? s.plannedHours : pHours,
        executedHours: execH,
        workScheduleType: s.workScheduleType || 'horario_laboral',
        workHoursInSchedule: s.workHoursInSchedule !== undefined ? s.workHoursInSchedule : execH,
        workHoursOutSchedule: s.workHoursOutSchedule !== undefined ? s.workHoursOutSchedule : 0
      };
    });
  });

  // State for Incomes (sin IVA)
  const [incomes, setIncomes] = useState<TrainingIncomeItem[]>(() => {
    return (management?.incomes || []).map(item => ({
      ...item,
      id: item.id || `inc-${Date.now()}-${Math.random()}`,
      subtotal: Number(((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toFixed(2))
    }));
  });

  // State for Expenses (sin IVA)
  const [logisticsExpenses, setLogisticsExpenses] = useState<TrainingExpenseItem[]>(() => {
    return (management?.logisticsExpenses || []).map(item => ({
      ...item,
      id: item.id || `log-${Date.now()}-${Math.random()}`,
      subtotal: Number((item.quantity * item.unitPrice).toFixed(2))
    }));
  });

  const [spaceExpenses, setSpaceExpenses] = useState<TrainingExpenseItem[]>(() => {
    return (management?.spaceExpenses || []).map(item => ({
      ...item,
      id: item.id || `spc-${Date.now()}-${Math.random()}`,
      subtotal: Number((item.quantity * item.unitPrice).toFixed(2))
    }));
  });

  const [marketingExpenses, setMarketingExpenses] = useState<TrainingExpenseItem[]>(() => {
    return (management?.marketingExpenses || []).map(item => ({
      ...item,
      id: item.id || `mkt-${Date.now()}-${Math.random()}`,
      subtotal: Number((item.quantity * item.unitPrice).toFixed(2))
    }));
  });

  const [certificateExpenses, setCertificateExpenses] = useState<TrainingExpenseItem[]>(() => {
    return (management?.certificateExpenses || []).map(item => ({
      ...item,
      id: item.id || `cert-${Date.now()}-${Math.random()}`,
      subtotal: Number((item.quantity * item.unitPrice).toFixed(2))
    }));
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Sync if plan changes externally or when selecting an existing plan
  useEffect(() => {
    if (selectedPlanId && selectedPlanId !== plan?.id) {
      const foundPlan = plans.find(p => p.id === selectedPlanId);
      if (foundPlan) {
        setPlanTitle(foundPlan.title);
        setPlanDescription(foundPlan.description || '');
        setPlanStatus(foundPlan.status || 'programada');
        if (foundPlan.sessions && foundPlan.sessions.length > 0) {
          setSessions(foundPlan.sessions.map((s, idx) => {
            const pHours = Number(calcHours(s.startTime, s.endTime).toFixed(1));
            const execH = s.executedHours !== undefined ? s.executedHours : pHours;
            return {
              ...s,
              id: s.id || `sess-${Date.now()}-${idx}`,
              topic: s.topic || `Módulo ${idx + 1}`,
              notes: s.notes || '',
              hourlyRate: s.hourlyRate !== undefined ? s.hourlyRate : getDefaultTrainerRate(s.trainerId),
              plannedHours: s.plannedHours !== undefined ? s.plannedHours : pHours,
              executedHours: execH,
              workScheduleType: s.workScheduleType || 'horario_laboral',
              workHoursInSchedule: s.workHoursInSchedule !== undefined ? s.workHoursInSchedule : execH,
              workHoursOutSchedule: s.workHoursOutSchedule !== undefined ? s.workHoursOutSchedule : 0
            };
          }));
        }
      }
    }
  }, [selectedPlanId, plans]);

  // Recalculate all financial metrics in real time (Sin IVA)
  const financialMetrics = useMemo(() => {
    let totalPlannedH = 0;
    let totalExecutedH = 0;
    let totalTrainerC = 0;

    sessions.forEach(session => {
      const pHours = calcHours(session.startTime, session.endTime);
      totalPlannedH += pHours;

      const execH = session.executedHours !== undefined ? Number(session.executedHours) : pHours;
      totalExecutedH += execH;

      const rate = session.hourlyRate !== undefined ? Number(session.hourlyRate) : getDefaultTrainerRate(session.trainerId);
      totalTrainerC += (execH * rate);
    });

    const totalLogisticsC = logisticsExpenses.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    const totalSpaceC = spaceExpenses.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    const totalMarketingC = marketingExpenses.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    const totalCertificateC = certificateExpenses.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);

    const grandTotalCost = totalTrainerC + totalLogisticsC + totalSpaceC + totalMarketingC + totalCertificateC;

    // Income calculations
    let totalInc = 0;
    let totalIncCollected = 0;
    let totalIncPending = 0;

    incomes.forEach(item => {
      const sub = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      totalInc += sub;
      if (item.paymentStatus === 'cobrado') {
        totalIncCollected += sub;
      } else {
        totalIncPending += sub;
      }
    });

    const netProfit = totalInc - grandTotalCost;
    const profitMargin = totalInc > 0 ? (netProfit / totalInc) * 100 : 0;

    return {
      totalPlannedHours: Number(totalPlannedH.toFixed(1)),
      totalExecutedHours: Number(totalExecutedH.toFixed(1)),
      totalTrainerCost: Number(totalTrainerC.toFixed(2)),
      totalLogisticsCost: Number(totalLogisticsC.toFixed(2)),
      totalSpaceCost: Number(totalSpaceC.toFixed(2)),
      totalMarketingCost: Number(totalMarketingC.toFixed(2)),
      totalCertificateCost: Number(totalCertificateC.toFixed(2)),
      grandTotalCost: Number(grandTotalCost.toFixed(2)),
      totalIncome: Number(totalInc.toFixed(2)),
      totalIncomeCollected: Number(totalIncCollected.toFixed(2)),
      totalIncomePending: Number(totalIncPending.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(1))
    };
  }, [sessions, logisticsExpenses, spaceExpenses, marketingExpenses, certificateExpenses, incomes, trainers]);

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return 'Capacitador no asignado';
    const member = members.find(m => m.id === trainer.directoryId);
    return `${member?.name || 'Capacitador'} (${trainer.type === 'interno' ? 'Interno' : 'Externo'})`;
  };

  const getSpaceDetails = (spaceId: string) => {
    return spaces.find(s => s.id === spaceId);
  };

  const getClientName = (c: SalesClient) => {
    if (c.clientType === 'B2B') {
      const comp = companies.find(cp => cp.id === c.directoryId);
      return comp ? `${comp.name} (B2B)` : `Empresa (${c.id})`;
    } else {
      const mem = members.find(m => m.id === c.directoryId);
      return mem ? `${mem.name} (B2C)` : `Cliente (${c.id})`;
    }
  };

  // Session Handlers
  const handleAddSession = () => {
    const lastSession = sessions[sessions.length - 1];
    let nextDate = new Date().toISOString().split('T')[0];

    if (lastSession && lastSession.date) {
      try {
        const parts = lastSession.date.split('-');
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split('T')[0];
      } catch {
        nextDate = lastSession.date;
      }
    }

    const defaultTrainerId = lastSession?.trainerId || (trainers[0]?.id || '');
    const startTime = lastSession?.startTime || '09:00';
    const endTime = lastSession?.endTime || '12:00';
    const pHours = Number(calcHours(startTime, endTime).toFixed(1));

    const newSession: TrainingSession = {
      id: `sess-${Date.now()}-${sessions.length}`,
      date: nextDate,
      startTime,
      endTime,
      trainerId: defaultTrainerId,
      spaceId: lastSession?.spaceId || (spaces[0]?.id || ''),
      topic: `Módulo ${sessions.length + 1}`,
      notes: '',
      hourlyRate: getDefaultTrainerRate(defaultTrainerId),
      plannedHours: pHours,
      executedHours: pHours,
      workScheduleType: 'horario_laboral',
      workHoursInSchedule: pHours,
      workHoursOutSchedule: 0
    };

    setSessions([...sessions, newSession]);
  };

  const handleDuplicateSession = (idx: number) => {
    const source = sessions[idx];
    const newSession: TrainingSession = {
      ...source,
      id: `sess-${Date.now()}-${sessions.length}`,
      topic: `${source.topic || 'Módulo'} (Copia)`
    };
    const updated = [...sessions];
    updated.splice(idx + 1, 0, newSession);
    setSessions(updated);
  };

  const handleRemoveSession = (idx: number) => {
    if (sessions.length <= 1) {
      setFormError('La capacitación debe tener al menos una sesión o jornada programada.');
      return;
    }
    setFormError('');
    setSessions(sessions.filter((_, i) => i !== idx));
  };

  const handleUpdateSession = (idx: number, field: keyof TrainingSession, value: any) => {
    const updated = [...sessions];
    const target = { ...updated[idx], [field]: value };

    // If changing times, update plannedHours
    if (field === 'startTime' || field === 'endTime') {
      const sT = field === 'startTime' ? value : target.startTime;
      const eT = field === 'endTime' ? value : target.endTime;
      const pHours = Number(calcHours(sT, eT).toFixed(1));
      target.plannedHours = pHours;
      if (target.executedHours === undefined || target.executedHours === updated[idx].plannedHours) {
        target.executedHours = pHours;
        if (target.workScheduleType === 'horario_laboral') {
          target.workHoursInSchedule = pHours;
          target.workHoursOutSchedule = 0;
        } else if (target.workScheduleType === 'fuera_horario_laboral') {
          target.workHoursInSchedule = 0;
          target.workHoursOutSchedule = pHours;
        }
      }
    }

    // If changing executed hours, adjust schedule hours default if not mixto
    if (field === 'executedHours') {
      const execVal = Number(value) || 0;
      if (target.workScheduleType === 'horario_laboral') {
        target.workHoursInSchedule = execVal;
        target.workHoursOutSchedule = 0;
      } else if (target.workScheduleType === 'fuera_horario_laboral') {
        target.workHoursInSchedule = 0;
        target.workHoursOutSchedule = execVal;
      }
    }

    // If changing schedule type
    if (field === 'workScheduleType') {
      const currentExec = Number(target.executedHours) || 0;
      if (value === 'horario_laboral') {
        target.workHoursInSchedule = currentExec;
        target.workHoursOutSchedule = 0;
      } else if (value === 'fuera_horario_laboral') {
        target.workHoursInSchedule = 0;
        target.workHoursOutSchedule = currentExec;
      } else if (value === 'mixto') {
        if (!target.workHoursInSchedule && !target.workHoursOutSchedule) {
          target.workHoursInSchedule = Number((currentExec / 2).toFixed(1));
          target.workHoursOutSchedule = Number((currentExec - (currentExec / 2)).toFixed(1));
        }
      }
    }

    // If changing trainer, update hourlyRate if not manually modified
    if (field === 'trainerId') {
      target.hourlyRate = getDefaultTrainerRate(value);
    }

    updated[idx] = target;
    setSessions(updated);
  };

  // Incomes Handlers
  const handleAddIncomeItem = () => {
    const newItem: TrainingIncomeItem = {
      id: `inc-${Date.now()}-${Math.random()}`,
      concept: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      paymentStatus: 'cobrado',
      invoiceOrReceiptNumber: '',
      notes: ''
    };
    setIncomes([...incomes, newItem]);
  };

  const handleUpdateIncomeItem = (idx: number, field: keyof TrainingIncomeItem, value: any) => {
    const updated = [...incomes];
    const target = { ...updated[idx], [field]: value };
    const qty = field === 'quantity' ? Number(value) : Number(target.quantity || 0);
    const price = field === 'unitPrice' ? Number(value) : Number(target.unitPrice || 0);
    target.subtotal = Number((qty * price).toFixed(2));
    updated[idx] = target;
    setIncomes(updated);
  };

  const handleRemoveIncomeItem = (idx: number) => {
    setIncomes(incomes.filter((_, i) => i !== idx));
  };

  // Generic Expense Handlers
  const handleAddExpenseItem = (category: 'logistics' | 'space' | 'marketing' | 'certificates') => {
    const newItem: TrainingExpenseItem = {
      id: `exp-${category}-${Date.now()}-${Math.random()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0
    };

    if (category === 'logistics') setLogisticsExpenses([...logisticsExpenses, newItem]);
    if (category === 'space') setSpaceExpenses([...spaceExpenses, newItem]);
    if (category === 'marketing') setMarketingExpenses([...marketingExpenses, newItem]);
    if (category === 'certificates') setCertificateExpenses([...certificateExpenses, newItem]);
  };

  const handleUpdateExpenseItem = (
    category: 'logistics' | 'space' | 'marketing' | 'certificates',
    idx: number,
    field: keyof TrainingExpenseItem,
    value: any
  ) => {
    const updateList = (list: TrainingExpenseItem[]) => {
      const updated = [...list];
      const target = { ...updated[idx], [field]: value };
      const qty = field === 'quantity' ? Number(value) : Number(target.quantity || 0);
      const price = field === 'unitPrice' ? Number(value) : Number(target.unitPrice || 0);
      target.subtotal = Number((qty * price).toFixed(2));
      updated[idx] = target;
      return updated;
    };

    if (category === 'logistics') setLogisticsExpenses(updateList(logisticsExpenses));
    if (category === 'space') setSpaceExpenses(updateList(spaceExpenses));
    if (category === 'marketing') setMarketingExpenses(updateList(marketingExpenses));
    if (category === 'certificates') setCertificateExpenses(updateList(certificateExpenses));
  };

  const handleRemoveExpenseItem = (category: 'logistics' | 'space' | 'marketing' | 'certificates', idx: number) => {
    if (category === 'logistics') setLogisticsExpenses(logisticsExpenses.filter((_, i) => i !== idx));
    if (category === 'space') setSpaceExpenses(spaceExpenses.filter((_, i) => i !== idx));
    if (category === 'marketing') setMarketingExpenses(marketingExpenses.filter((_, i) => i !== idx));
    if (category === 'certificates') setCertificateExpenses(certificateExpenses.filter((_, i) => i !== idx));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setFormError('Por favor ingresa un código para el registro de capacitación.');
      return;
    }
    if (!planTitle.trim()) {
      setFormError('Por favor ingresa el título de la capacitación o curso.');
      return;
    }
    if (sessions.length === 0) {
      setFormError('Debes tener al menos una sesión de capacitación en el cronograma.');
      return;
    }

    // Validate sessions
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.date) {
        setFormError(`Por favor define la fecha en la sesión #${i + 1}.`);
        return;
      }
      if (!s.startTime || !s.endTime) {
        setFormError(`Por favor define el horario completo en la sesión #${i + 1}.`);
        return;
      }
      if (!s.trainerId) {
        setFormError(`Por favor asigna un capacitador en la sesión #${i + 1}.`);
        return;
      }
      if (!s.spaceId) {
        setFormError(`Por favor selecciona una sala o espacio en la sesión #${i + 1}.`);
        return;
      }
    }

    try {
      setIsSaving(true);
      setFormError('');

      // Sort sessions chronologically
      const sortedSessions = [...sessions].sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

      const firstSession = sortedSessions[0];
      const lastSession = sortedSessions[sortedSessions.length - 1];
      const targetPlanId = selectedPlanId || plan?.id || `pl-${Date.now()}`;

      // Clean sessions to guarantee no undefined values
      const sanitizedSessions: TrainingSession[] = sortedSessions.map((s, idx) => ({
        id: s.id || `sess-${Date.now()}-${idx}`,
        date: s.date || '',
        startTime: s.startTime || '',
        endTime: s.endTime || '',
        trainerId: s.trainerId || '',
        spaceId: s.spaceId || '',
        topic: s.topic || '',
        notes: s.notes || '',
        hourlyRate: Number(s.hourlyRate) || 0,
        plannedHours: Number(s.plannedHours) || Number(calcHours(s.startTime, s.endTime).toFixed(1)),
        executedHours: Number(s.executedHours) || 0,
        workScheduleType: s.workScheduleType || 'horario_laboral',
        workHoursInSchedule: Number(s.workHoursInSchedule) || 0,
        workHoursOutSchedule: Number(s.workHoursOutSchedule) || 0
      }));

      const planData: Partial<TrainingPlan> = {
        id: targetPlanId,
        title: planTitle.trim(),
        description: planDescription.trim() || '',
        status: planStatus,
        sessions: sanitizedSessions,
        date: firstSession.date || '',
        endDate: lastSession.date || firstSession.date || '',
        startTime: firstSession.startTime || '',
        endTime: firstSession.endTime || '',
        trainerId: firstSession.trainerId || '',
        spaceId: firstSession.spaceId || '',
        totalHours: financialMetrics.totalPlannedHours,
        totalExecutedHours: financialMetrics.totalExecutedHours
      };

      const mgmtData: Partial<TrainingManagement> = {
        ...(management || {}),
        code: code.trim(),
        status,
        planId: targetPlanId,
        originType,
        clientId: originType === 'direct_client' ? clientId.trim() : (clientId.trim() || ''),
        marketingCampaignId: originType === 'marketing_campaign' ? marketingCampaignId.trim() : '',
        projectId: originType === 'project' ? projectId.trim() : '',
        originDetails: originDetails.trim(),
        totalHours: financialMetrics.totalPlannedHours,
        totalExecutedHours: financialMetrics.totalExecutedHours,
        totalTrainerCost: financialMetrics.totalTrainerCost,
        totalLogisticsCost: financialMetrics.totalLogisticsCost,
        totalSpaceCost: financialMetrics.totalSpaceCost,
        totalMarketingCost: financialMetrics.totalMarketingCost,
        totalCertificateCost: financialMetrics.totalCertificateCost,
        totalCost: financialMetrics.grandTotalCost,
        incomes: incomes.map(item => ({
          id: item.id || `inc-${Date.now()}`,
          concept: item.concept || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal: Number((Number(item.quantity || 1) * Number(item.unitPrice || 0)).toFixed(2)),
          paymentStatus: item.paymentStatus || 'cobrado',
          invoiceOrReceiptNumber: item.invoiceOrReceiptNumber || '',
          notes: item.notes || ''
        })),
        totalIncome: financialMetrics.totalIncome,
        netProfit: financialMetrics.netProfit,
        profitMargin: financialMetrics.profitMargin,
        logisticsExpenses: logisticsExpenses.map(item => ({
          id: item.id || `log-${Date.now()}`,
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal: Number((Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2))
        })),
        spaceExpenses: spaceExpenses.map(item => ({
          id: item.id || `spc-${Date.now()}`,
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal: Number((Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2))
        })),
        marketingExpenses: marketingExpenses.map(item => ({
          id: item.id || `mkt-${Date.now()}`,
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal: Number((Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2))
        })),
        certificateExpenses: certificateExpenses.map(item => ({
          id: item.id || `cert-${Date.now()}`,
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          subtotal: Number((Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2))
        }))
      };

      await onSave(mgmtData, planData);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error guardando capacitación:', err);
      setFormError(err?.message || 'Error al guardar los datos de la capacitación.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderExpenseTable = (
    title: string,
    icon: React.ReactNode,
    category: 'logistics' | 'space' | 'marketing' | 'certificates',
    items: TrainingExpenseItem[],
    categoryTotal: number,
    badgeColor: string,
    placeholderText: string = "Material didáctico, Alquiler sala..."
  ) => {
    return (
      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl text-white ${badgeColor}`}>
              {icon}
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm tracking-tight">{title}</h4>
              <p className="text-[11px] text-slate-400 font-medium">Costos unitarios y cantidades (Sin IVA)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-700 flex items-center gap-1.5 shadow-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Subtotal:</span>
              <span className="text-emerald-600">${categoryTotal.toFixed(2)}</span>
            </div>

            {!isReadOnly && (
              <button
                type="button"
                onClick={() => handleAddExpenseItem(category)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus size={14} className="text-indigo-600" />
                <span>Añadir Fila</span>
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No hay gastos registrados en este rubro. Presiona "+ Añadir Fila" para desglosar costos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 min-w-[200px]">Descripción del Gasto</th>
                  <th className="p-2.5 w-24 text-center">Cantidad</th>
                  <th className="p-2.5 w-32 text-right">Valor Unit. ($ sin IVA)</th>
                  <th className="p-2.5 w-32 text-right">Subtotal ($ sin IVA)</th>
                  {!isReadOnly && <th className="p-2.5 w-12 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-2.5 text-center text-slate-400 font-bold text-[11px]">{idx + 1}</td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={item.description}
                        onChange={e => handleUpdateExpenseItem(category, idx, 'description', e.target.value)}
                        placeholder={placeholderText}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={isReadOnly}
                        value={item.quantity}
                        onChange={e => handleUpdateExpenseItem(category, idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={isReadOnly}
                          value={item.unitPrice}
                          onChange={e => handleUpdateExpenseItem(category, idx, 'unitPrice', e.target.value)}
                          className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                        />
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-black text-slate-800">
                      ${(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
                    </td>
                    {!isReadOnly && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveExpenseItem(category, idx)}
                          title="Eliminar fila"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* 1. Header Sticky de Navegación y Acciones */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer hover:shadow-xs"
            >
              <ArrowLeft size={16} />
              <span>Volver a {originTabLabel}</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200/70 rounded-xl text-xs font-black tracking-wider flex items-center gap-1.5">
                <Briefcase size={13} />
                {code || 'NUEVA-CAP'}
              </span>

              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                status === 'ejecutada' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {status === 'ejecutada' ? 'Ejecutada' : 'Pendiente'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95 hover:shadow-xs"
            >
              <LogOut size={15} />
              <span>Salir</span>
            </button>

            {onDelete && management?.id && !isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Estás seguro de eliminar permanentemente la capacitación ${code}?`)) {
                    onDelete(management.id, selectedPlanId);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={15} />
                <span>Eliminar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner de Éxito / Error */}
        <AnimatePresence>
          {showSaveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs"
            >
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <span>¡Capacitación, ingresos, costos y cronograma guardados exitosamente!</span>
            </motion.div>
          )}

          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm font-semibold shadow-xs"
            >
              <AlertCircle size={20} className="text-rose-600 shrink-0" />
              <span>{formError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Tarjetas de Métricas en Vivo y Resumen Financiero Total */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Horas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-indigo-500" /> Horas Ejecutadas
            </span>
            <div className="text-xl font-black text-slate-800">
              {financialMetrics.totalExecutedHours} <span className="text-xs text-slate-400 font-bold">/ {financialMetrics.totalPlannedHours}h</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Reales vs Planificadas</p>
          </div>

          {/* Honorarios Docentes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-blue-500" /> Honorarios Docentes
            </span>
            <div className="text-xl font-black text-blue-600">
              ${financialMetrics.totalTrainerCost.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Horas × Tarifa sin IVA</p>
          </div>

          {/* Gastos Operativos & Certificados */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt size={13} className="text-amber-500" /> Gastos Operativos
            </span>
            <div className="text-xl font-black text-amber-600">
              ${(financialMetrics.totalLogisticsCost + financialMetrics.totalSpaceCost + financialMetrics.totalMarketingCost + financialMetrics.totalCertificateCost).toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Logística, Aulas & Certif.</p>
          </div>

          {/* Costo Total */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={13} className="text-rose-500" /> Costo Total
            </span>
            <div className="text-xl font-black text-rose-600">
              ${financialMetrics.grandTotalCost.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Docentes + Operativos</p>
          </div>

          {/* Ingresos Totales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={13} className="text-emerald-500" /> Ingresos Totales
            </span>
            <div className="text-xl font-black text-emerald-600">
              ${financialMetrics.totalIncome.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Cobrado: ${financialMetrics.totalIncomeCollected.toFixed(2)}
            </p>
          </div>

          {/* Utilidad Neta & Margen */}
          <div className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
            financialMetrics.netProfit >= 0 
              ? 'bg-gradient-to-br from-emerald-900 to-emerald-800 text-white border-emerald-700/60' 
              : 'bg-gradient-to-br from-rose-900 to-rose-800 text-white border-rose-700/60'
          }`}>
            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
              {financialMetrics.netProfit >= 0 ? <TrendingUp size={13} className="text-emerald-300" /> : <TrendingDown size={13} className="text-rose-300" />}
              Utilidad Neta
            </span>
            <div className="text-xl font-black text-white">
              ${financialMetrics.netProfit.toFixed(2)}
            </div>
            <p className="text-[10px] text-emerald-200/90 font-bold">
              Margen: {financialMetrics.profitMargin}%
            </p>
          </div>
        </div>

        {/* 3. Sección: Información de Gestión y Origen de la Capacitación */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-600" />
                1. Registro de Gestión y Origen de la Capacitación
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Identificador único, estados de control y vinculación con Campañas de Marketing, Proyectos o Clientes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Código de Capacitación *
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Ej. CAP-2026-001"
                className="w-full bg-slate-50 border border-slate-200 text-sm font-black p-3 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Estado de Ejecución
              </label>
              <select
                disabled={isReadOnly}
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 text-sm font-bold p-3 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="ejecutada">✅ Ejecutada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Estado de Planificación
              </label>
              <select
                disabled={isReadOnly}
                value={planStatus}
                onChange={e => setPlanStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 text-sm font-bold p-3 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="programada">📅 Programada</option>
                <option value="completada">🎉 Completada</option>
                <option value="cancelada">❌ Cancelada</option>
              </select>
            </div>
          </div>

          {/* Selector de Origen de la Capacitación */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ¿Cuál es el origen o fruto de esta capacitación?
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setOriginType('marketing_campaign')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  originType === 'marketing_campaign'
                    ? 'bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Megaphone size={16} className={originType === 'marketing_campaign' ? 'text-purple-600' : 'text-slate-400'} />
                <span>Campaña Marketing</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setOriginType('project')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  originType === 'project'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FolderKanban size={16} className={originType === 'project' ? 'text-blue-600' : 'text-slate-400'} />
                <span>Proyecto</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setOriginType('direct_client')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  originType === 'direct_client'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 size={16} className={originType === 'direct_client' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Cliente Directo</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setOriginType('internal_initiative')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  originType === 'internal_initiative'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles size={16} className={originType === 'internal_initiative' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Iniciativa Interna</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setOriginType('other')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  originType === 'other'
                    ? 'bg-amber-50 border-amber-300 text-amber-700 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Target size={16} className={originType === 'other' ? 'text-amber-600' : 'text-slate-400'} />
                <span>Otro Origen</span>
              </button>
            </div>

            {/* Campos condicionales según el origen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70">
              {originType === 'marketing_campaign' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Megaphone size={13} className="text-purple-600" /> Seleccionar Campaña de Marketing *
                  </label>
                  <SearchableSelect
                    disabled={isReadOnly}
                    value={marketingCampaignId}
                    onChange={val => setMarketingCampaignId(val)}
                    placeholder="Selecciona la campaña de origen..."
                    searchPlaceholder="Buscar campaña..."
                    isClearable
                    options={campaigns.map(camp => ({
                      value: camp.id,
                      label: camp.name || `Campaña ${camp.id}`,
                      sublabel: camp.code ? `[${camp.code}]` : undefined,
                      badge: camp.status || 'activa',
                      badgeColor: camp.status === 'activa' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }))}
                    buttonClassName="py-2.5 bg-white border-slate-200 text-xs font-bold"
                  />
                </div>
              )}

              {originType === 'project' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FolderKanban size={13} className="text-blue-600" /> Seleccionar Proyecto Empresarial *
                  </label>
                  <SearchableSelect
                    disabled={isReadOnly}
                    value={projectId}
                    onChange={val => setProjectId(val)}
                    placeholder="Selecciona el proyecto..."
                    searchPlaceholder="Buscar proyecto..."
                    isClearable
                    options={projects.map(proj => ({
                      value: proj.id,
                      label: proj.name || `Proyecto ${proj.id}`,
                      sublabel: proj.city ? `Ciudad: ${proj.city}` : undefined
                    }))}
                    buttonClassName="py-2.5 bg-white border-slate-200 text-xs font-bold"
                  />
                </div>
              )}

              {originType === 'direct_client' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 size={13} className="text-indigo-600" /> Seleccionar Cliente Corporativo / Particular *
                  </label>
                  <SearchableSelect
                    disabled={isReadOnly}
                    value={clientId}
                    onChange={val => setClientId(val)}
                    placeholder="Selecciona el cliente..."
                    searchPlaceholder="Buscar cliente o RUC..."
                    isClearable
                    options={clients.map(c => ({
                      value: c.id,
                      label: getClientName(c),
                      sublabel: (c as any).ruc || (c as any).email || undefined
                    }))}
                    buttonClassName="py-2.5 bg-white border-slate-200 text-xs font-bold"
                  />
                </div>
              )}

              <div className={originType === 'internal_initiative' || originType === 'other' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas / Detalles del Origen
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={originDetails}
                  onChange={e => setOriginDetails(e.target.value)}
                  placeholder="Ej. Fruto de la campaña de LinkedIn Q1 2026 / Requerimiento del proyecto Minería Fase 2..."
                  className="w-full bg-white border border-slate-200 text-xs font-medium p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Sección: Planificación y Cronograma de Sesiones por Módulo */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <CalendarIcon size={18} className="text-indigo-600" />
                2. Planificación y Cronograma de Sesiones por Módulo
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Jornadas multidía, docentes internos/externos, mix de horarios laborales y horas dictadas.
              </p>
            </div>

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddSession}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus size={16} />
                <span>+ Añadir Sesión / Jornada</span>
              </button>
            )}
          </div>

          {/* Datos Generales del Curso */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Título del Curso / Capacitación *
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={planTitle}
                onChange={e => setPlanTitle(e.target.value)}
                placeholder="Ej. Certificación en Prevención de Riesgos y QHSE 2026"
                className="w-full bg-slate-50 border border-slate-200 text-base font-black p-3.5 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Descripción y Objetivos Pedagógicos
              </label>
              <textarea
                disabled={isReadOnly}
                value={planDescription}
                onChange={e => setPlanDescription(e.target.value)}
                rows={2}
                placeholder="Detalla los alcances, temas principales o requisitos del curso..."
                className="w-full bg-slate-50 border border-slate-200 text-xs font-medium p-3 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 resize-none"
              />
            </div>
          </div>

          {/* Lista de Sesiones / Jornadas Detalladas */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Cronograma de Jornadas ({sessions.length})</span>
              <span className="text-[11px] font-bold text-indigo-600">
                Total Honorarios Docentes: ${financialMetrics.totalTrainerCost.toFixed(2)} sin IVA
              </span>
            </h4>

            {sessions.map((session, sIdx) => {
              const sessionSpace = getSpaceDetails(session.spaceId);
              const pHours = calcHours(session.startTime, session.endTime);
              const execH = session.executedHours !== undefined ? Number(session.executedHours) : pHours;
              const rate = session.hourlyRate !== undefined ? Number(session.hourlyRate) : getDefaultTrainerRate(session.trainerId);
              const sessionTrainerCost = execH * rate;

              // Check if selected trainer is internal
              const trainerObj = trainers.find(t => t.id === session.trainerId);
              const isInternalTrainer = trainerObj?.type === 'interno';

              const scheduleType = session.workScheduleType || 'horario_laboral';
              const inScheduleH = Number(session.workHoursInSchedule || 0);
              const outScheduleH = Number(session.workHoursOutSchedule || 0);
              const isMixBalanced = Number((inScheduleH + outScheduleH).toFixed(1)) === Number(execH.toFixed(1));

              return (
                <div
                  key={session.id || sIdx}
                  className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 transition-all space-y-4 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                        {sIdx + 1}
                      </span>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={session.topic || ''}
                        onChange={e => handleUpdateSession(sIdx, 'topic', e.target.value)}
                        placeholder={`Módulo / Jornada ${sIdx + 1}`}
                        className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white px-2 py-1 text-sm font-black text-slate-800 rounded focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-emerald-600">
                        ${sessionTrainerCost.toFixed(2)} sin IVA
                      </span>

                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDuplicateSession(sIdx)}
                            title="Duplicar esta sesión"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSession(sIdx)}
                            title="Eliminar sesión"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fila de Controles: Fecha, Horas Planificadas, Horas Ejecutadas, Capacitador, Tarifa por Hora y Espacio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
                    {/* Fecha */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        disabled={isReadOnly}
                        value={session.date || ''}
                        onChange={e => handleUpdateSession(sIdx, 'date', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Horario (Inicio y Fin) */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Horario *</span>
                        <span className="text-amber-600 font-bold">{pHours.toFixed(1)}h plan</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          disabled={isReadOnly}
                          value={session.startTime || ''}
                          onChange={e => handleUpdateSession(sIdx, 'startTime', e.target.value)}
                          className="w-1/2 bg-white border border-slate-200 text-xs font-bold p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-slate-400 text-xs">-</span>
                        <input
                          type="time"
                          disabled={isReadOnly}
                          value={session.endTime || ''}
                          onChange={e => handleUpdateSession(sIdx, 'endTime', e.target.value)}
                          className="w-1/2 bg-white border border-slate-200 text-xs font-bold p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Horas Ejecutadas Reales */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock size={11} className="text-indigo-600" /> Horas Ejecutadas
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={isReadOnly}
                        value={execH}
                        onChange={e => handleUpdateSession(sIdx, 'executedHours', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Capacitador Asignado */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Capacitador *
                      </label>
                      <SearchableSelect
                        disabled={isReadOnly}
                        value={session.trainerId || ''}
                        onChange={val => handleUpdateSession(sIdx, 'trainerId', val)}
                        placeholder="Seleccionar Docente..."
                        searchPlaceholder="Buscar docente o especialidad..."
                        isClearable
                        options={trainers.map(tr => ({
                          value: tr.id,
                          label: getTrainerName(tr.id),
                          sublabel: tr.type === 'interno' ? 'Interno' : 'Externo',
                          badge: tr.type === 'interno' ? 'Interno' : 'Externo',
                          badgeColor: tr.type === 'interno' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                        }))}
                        buttonClassName="py-2.5 bg-white border-slate-200 text-xs font-bold"
                      />
                    </div>

                    {/* Costo / Tarifa por Hora */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Costo / Hora ($)</span>
                        <span className="text-[10px] text-slate-400">Editable</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          disabled={isReadOnly}
                          value={rate}
                          onChange={e => handleUpdateSession(sIdx, 'hourlyRate', parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2.5 bg-white border-slate-200 text-xs font-black text-right rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Sala Física / Espacio Virtual */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Sala / Espacio *</span>
                        {sessionSpace?.link && (
                          <a
                            href={sessionSpace.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[10px]"
                          >
                            <ExternalLink size={10} /> Link
                          </a>
                        )}
                      </label>
                      <SearchableSelect
                        disabled={isReadOnly}
                        value={session.spaceId || ''}
                        onChange={val => handleUpdateSession(sIdx, 'spaceId', val)}
                        placeholder="Seleccionar Sala..."
                        searchPlaceholder="Buscar sala o espacio..."
                        isClearable
                        options={spaces.map(sp => ({
                          value: sp.id,
                          label: sp.name,
                          sublabel: sp.city || sp.platform || sp.link,
                          badge: sp.type === 'virtual' ? 'Virtual' : 'Físico',
                          badgeColor: sp.type === 'virtual' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }))}
                        buttonClassName="py-2.5 bg-white border-slate-200 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Configuración de Horario para Capacitador Interno */}
                  {isInternalTrainer && (
                    <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          <User size={13} className="text-indigo-600" />
                          Régimen de Horario del Capacitador Interno:
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleUpdateSession(sIdx, 'workScheduleType', 'horario_laboral')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              scheduleType === 'horario_laboral'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-indigo-100/60 border border-slate-200'
                            }`}
                          >
                            <Sun size={12} />
                            <span>Horario Laboral</span>
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleUpdateSession(sIdx, 'workScheduleType', 'fuera_horario_laboral')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              scheduleType === 'fuera_horario_laboral'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-indigo-100/60 border border-slate-200'
                            }`}
                          >
                            <Moon size={12} />
                            <span>Fuera de Horario</span>
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleUpdateSession(sIdx, 'workScheduleType', 'mixto')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              scheduleType === 'mixto'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-indigo-100/60 border border-slate-200'
                            }`}
                          >
                            <Shuffle size={12} />
                            <span>Mix de Horarios</span>
                          </button>
                        </div>
                      </div>

                      {/* Inputs detallados si es MIXTO */}
                      {scheduleType === 'mixto' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-indigo-100/80 items-center">
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            <Sun size={13} className="text-amber-500" />
                            <span className="text-[11px] font-bold text-slate-600">Horas en Jornada:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              disabled={isReadOnly}
                              value={inScheduleH}
                              onChange={e => handleUpdateSession(sIdx, 'workHoursInSchedule', parseFloat(e.target.value) || 0)}
                              className="w-16 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded p-1 focus:bg-white focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">h</span>
                          </div>

                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            <Moon size={13} className="text-indigo-500" />
                            <span className="text-[11px] font-bold text-slate-600">Horas Fuera de Jornada:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              disabled={isReadOnly}
                              value={outScheduleH}
                              onChange={e => handleUpdateSession(sIdx, 'workHoursOutSchedule', parseFloat(e.target.value) || 0)}
                              className="w-16 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded p-1 focus:bg-white focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">h</span>
                          </div>

                          <div className="text-right">
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-md border ${
                              isMixBalanced 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              Suma: {(inScheduleH + outScheduleH).toFixed(1)}h / {execH}h {isMixBalanced ? '✓' : '(Descuadre)'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notas Pedagógicas de la Sesión */}
                  <div>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={session.notes || ''}
                      onChange={e => handleUpdateSession(sIdx, 'notes', e.target.value)}
                      placeholder="Observaciones pedagógicas, materiales requeridos o requerimientos para este día..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Sección: Registro de Ingresos de la Capacitación (Sin IVA) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                3. Ingresos de Dinero por Capacitación (Sin IVA)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Venta de cupos, inscripciones individuales, contratos corporativos y control de pagos recibidos.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-black text-emerald-700 flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Total Ingresos:</span>
                <span>${financialMetrics.totalIncome.toFixed(2)}</span>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddIncomeItem}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus size={14} />
                  <span>+ Añadir Ingreso / Cupo</span>
                </button>
              )}
            </div>
          </div>

          {incomes.length === 0 ? (
            <div className="bg-slate-50/60 p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <CreditCard size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-500">
                No hay ingresos registrados para esta capacitación.
              </p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddIncomeItem}
                  className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  Haz clic aquí para agregar el primer registro de cobro o cupos vendidos.
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 min-w-[200px]">Concepto / Detalle del Ingreso</th>
                    <th className="p-2.5 w-24 text-center">Cantidad / Cupos</th>
                    <th className="p-2.5 w-32 text-right">Precio Unit. ($ sin IVA)</th>
                    <th className="p-2.5 w-32 text-right">Subtotal ($ sin IVA)</th>
                    <th className="p-2.5 w-36">Nº Factura / Recibo</th>
                    <th className="p-2.5 w-32 text-center">Estado Cobro</th>
                    {!isReadOnly && <th className="p-2.5 w-12 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {incomes.map((inc, idx) => (
                    <tr key={inc.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-2.5 text-center text-slate-400 font-bold text-[11px]">{idx + 1}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={inc.concept}
                          onChange={e => handleUpdateIncomeItem(idx, 'concept', e.target.value)}
                          placeholder="Ej. Inscripción 10 alumnos, Contrato B2B Minera..."
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          disabled={isReadOnly}
                          value={inc.quantity}
                          onChange={e => handleUpdateIncomeItem(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={isReadOnly}
                            value={inc.unitPrice}
                            onChange={e => handleUpdateIncomeItem(idx, 'unitPrice', e.target.value)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                          />
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-black text-emerald-700">
                        ${(Number(inc.quantity || 0) * Number(inc.unitPrice || 0)).toFixed(2)}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={inc.invoiceOrReceiptNumber || ''}
                          onChange={e => handleUpdateIncomeItem(idx, 'invoiceOrReceiptNumber', e.target.value)}
                          placeholder="Ej. F001-00234"
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <select
                          disabled={isReadOnly}
                          value={inc.paymentStatus || 'cobrado'}
                          onChange={e => handleUpdateIncomeItem(idx, 'paymentStatus', e.target.value)}
                          className={`text-xs font-bold px-2 py-1.5 rounded-lg border focus:outline-none ${
                            inc.paymentStatus === 'cobrado' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="cobrado">✅ Cobrado</option>
                          <option value="pendiente">⏳ Pendiente</option>
                        </select>
                      </td>
                      {!isReadOnly && (
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveIncomeItem(idx)}
                            title="Eliminar ingreso"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 6. Sección: Desglose Estructurado de Costos y Gastos (Sin IVA) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 text-left">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Calculator size={18} className="text-rose-600" />
              4. Desglose Estructurado de Costos y Gastos Operativos (Sin IVA)
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Costos directos de ejecución: logística, aulas/Zoom, campañas y acreditaciones/certificados.
            </p>
          </div>

          <div className="space-y-6">
            {/* a) Logística */}
            {renderExpenseTable(
              'Costos de Logística y Materiales',
              <Truck size={16} />,
              'logistics',
              logisticsExpenses,
              financialMetrics.totalLogisticsCost,
              'bg-blue-600',
              'Ej. Material didáctico impreso, refrigerios...'
            )}

            {/* b) Pago de Uso de Aulas / Zoom */}
            {renderExpenseTable(
              'Pago por Uso de Aulas Físicas o Licencias Zoom/Meet',
              <Video size={16} />,
              'space',
              spaceExpenses,
              financialMetrics.totalSpaceCost,
              'bg-amber-600',
              'Ej. Alquiler aula física, licencia Zoom Business...'
            )}

            {/* c) Gastos de Marketing */}
            {renderExpenseTable(
              'Gastos de Marketing y Promoción',
              <Megaphone size={16} />,
              'marketing',
              marketingExpenses,
              financialMetrics.totalMarketingCost,
              'bg-purple-600',
              'Ej. Pauta digital Meta/Google, folletos...'
            )}

            {/* d) Gastos de Certificados y Acreditaciones */}
            {renderExpenseTable(
              'Gastos en Certificados, Acreditaciones y Avales',
              <Award size={16} />,
              'certificates',
              certificateExpenses,
              financialMetrics.totalCertificateCost,
              'bg-indigo-600',
              'Ej. Emisión carnets OEC, sellos de certificación, diplomas físicos...'
            )}
          </div>

          {/* Resumen Financiero Consolidado y Balance de Rentabilidad */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
            <h4 className="font-black text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Receipt size={16} className="text-emerald-400" />
              Balance Consolidado de Rentabilidad de la Capacitación (Sin IVA)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Honorarios Docentes
                </span>
                <span className="text-base font-black text-blue-400">
                  ${financialMetrics.totalTrainerCost.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Logística & Aulas
                </span>
                <span className="text-base font-black text-amber-400">
                  ${(financialMetrics.totalLogisticsCost + financialMetrics.totalSpaceCost).toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Marketing & Certificados
                </span>
                <span className="text-base font-black text-purple-400">
                  ${(financialMetrics.totalMarketingCost + financialMetrics.totalCertificateCost).toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Ingresos
                </span>
                <span className="text-base font-black text-emerald-400">
                  ${financialMetrics.totalIncome.toFixed(2)}
                </span>
              </div>

              <div className={`p-3.5 rounded-xl border ${
                financialMetrics.netProfit >= 0 ? 'bg-emerald-950/60 border-emerald-500/50' : 'bg-rose-950/60 border-rose-500/50'
              }`}>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Utilidad Neta ({financialMetrics.profitMargin}%)
                </span>
                <span className={`text-lg font-black ${financialMetrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${financialMetrics.netProfit.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <span className="text-xs font-bold text-slate-400">
                Total Horas Dictadas: <strong className="text-white">{financialMetrics.totalExecutedHours}h</strong> (de {financialMetrics.totalPlannedHours}h planificadas)
              </span>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Costo Total:</span>
                <span className="text-xl font-black text-rose-400">
                  ${financialMetrics.grandTotalCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botonera Inferior de Guardado */}
        <div className="flex items-center justify-end gap-3 pt-4 pb-12">
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </button>

          {onDelete && management?.id && !isReadOnly && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Estás seguro de eliminar permanentemente la capacitación ${code}?`)) {
                  onDelete(management.id, selectedPlanId);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer active:scale-95"
            >
              <Trash2 size={15} />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
