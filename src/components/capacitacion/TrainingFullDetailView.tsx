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
  Receipt
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
  TrainingExpenseItem
} from '../../types';

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
  onSave,
  onDelete,
  onBack,
  isReadOnly = false,
  originTabLabel = 'Gestión de Capacitaciones'
}) => {
  // State for Management
  const [code, setCode] = useState(management?.code || '');
  const [status, setStatus] = useState<'pendiente' | 'ejecutada'>(management?.status || 'pendiente');
  const [clientId, setClientId] = useState(management?.clientId || '');
  const [marketingCampaignId, setMarketingCampaignId] = useState(management?.marketingCampaignId || '');
  const [selectedPlanId, setSelectedPlanId] = useState(management?.planId || plan?.id || '');

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
      return {
        ...s,
        id: s.id || `sess-${Date.now()}-${idx}`,
        topic: s.topic || `Módulo ${idx + 1}`,
        notes: s.notes || '',
        hourlyRate: rate,
        plannedHours: s.plannedHours !== undefined ? s.plannedHours : pHours,
        executedHours: s.executedHours !== undefined ? s.executedHours : (pHours || 0)
      };
    });
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
            return {
              ...s,
              id: s.id || `sess-${Date.now()}-${idx}`,
              topic: s.topic || `Módulo ${idx + 1}`,
              notes: s.notes || '',
              hourlyRate: s.hourlyRate !== undefined ? s.hourlyRate : getDefaultTrainerRate(s.trainerId),
              plannedHours: s.plannedHours !== undefined ? s.plannedHours : pHours,
              executedHours: s.executedHours !== undefined ? s.executedHours : pHours
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

    const grandTotal = totalTrainerC + totalLogisticsC + totalSpaceC + totalMarketingC;

    return {
      totalPlannedHours: Number(totalPlannedH.toFixed(1)),
      totalExecutedHours: Number(totalExecutedH.toFixed(1)),
      totalTrainerCost: Number(totalTrainerC.toFixed(2)),
      totalLogisticsCost: Number(totalLogisticsC.toFixed(2)),
      totalSpaceCost: Number(totalSpaceC.toFixed(2)),
      totalMarketingCost: Number(totalMarketingC.toFixed(2)),
      grandTotalCost: Number(grandTotal.toFixed(2))
    };
  }, [sessions, logisticsExpenses, spaceExpenses, marketingExpenses, trainers]);

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return 'Capacitador no asignado';
    const member = members.find(m => m.id === trainer.directoryId);
    return `${member?.name || 'Capacitador'} (${trainer.type})`;
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
      executedHours: pHours
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
      }
    }

    // If changing trainer, update hourlyRate if not manually modified
    if (field === 'trainerId') {
      target.hourlyRate = getDefaultTrainerRate(value);
    }

    updated[idx] = target;
    setSessions(updated);
  };

  // Generic Expense Handlers
  const handleAddExpenseItem = (category: 'logistics' | 'space' | 'marketing') => {
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
  };

  const handleUpdateExpenseItem = (
    category: 'logistics' | 'space' | 'marketing',
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
  };

  const handleRemoveExpenseItem = (category: 'logistics' | 'space' | 'marketing', idx: number) => {
    if (category === 'logistics') setLogisticsExpenses(logisticsExpenses.filter((_, i) => i !== idx));
    if (category === 'space') setSpaceExpenses(spaceExpenses.filter((_, i) => i !== idx));
    if (category === 'marketing') setMarketingExpenses(marketingExpenses.filter((_, i) => i !== idx));
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
      const sanitizedSessions = sortedSessions.map((s, idx) => ({
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
        executedHours: Number(s.executedHours) || 0
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
        clientId: clientId.trim() || '',
        marketingCampaignId: marketingCampaignId.trim() || '',
        totalHours: financialMetrics.totalPlannedHours,
        totalExecutedHours: financialMetrics.totalExecutedHours,
        totalTrainerCost: financialMetrics.totalTrainerCost,
        totalLogisticsCost: financialMetrics.totalLogisticsCost,
        totalSpaceCost: financialMetrics.totalSpaceCost,
        totalMarketingCost: financialMetrics.totalMarketingCost,
        totalCost: financialMetrics.grandTotalCost,
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
    category: 'logistics' | 'space' | 'marketing',
    items: TrainingExpenseItem[],
    categoryTotal: number,
    badgeColor: string
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
                        placeholder="Ej. Material didáctico, Alquiler sala..."
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
            {onDelete && management?.id && !isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Estás seguro de eliminar permanentemente la capacitación ${code}?`)) {
                    onDelete(management.id, selectedPlanId);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={15} />
                <span>Eliminar</span>
              </button>
            )}

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
                    <span>Guardar Cambios</span>
                  </>
                )}
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
              <span>¡Capacitación, cronograma y costos actualizados correctamente en el sistema!</span>
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-amber-500" /> Horas Planificadas
            </span>
            <div className="text-xl font-black text-slate-800">
              {financialMetrics.totalPlannedHours} <span className="text-xs text-slate-500 font-bold">hrs</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">De inicio a fin de sesiones</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-indigo-500" /> Horas Ejecutadas
            </span>
            <div className="text-xl font-black text-indigo-600">
              {financialMetrics.totalExecutedHours} <span className="text-xs text-slate-500 font-bold">hrs</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Horas reales dictadas</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-emerald-500" /> Honorarios Docentes
            </span>
            <div className="text-xl font-black text-emerald-600">
              ${financialMetrics.totalTrainerCost.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Sin IVA (Horas × Tarifa/h)</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt size={13} className="text-purple-500" /> Gastos Operativos
            </span>
            <div className="text-xl font-black text-purple-600">
              ${(financialMetrics.totalLogisticsCost + financialMetrics.totalSpaceCost + financialMetrics.totalMarketingCost).toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Logística, Aulas & Mkt</p>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-900 to-indigo-800 text-white p-4 rounded-2xl shadow-md shadow-indigo-950/20 space-y-1">
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={13} className="text-emerald-300" /> Costo Total Capacitación
            </span>
            <div className="text-2xl font-black text-white">
              ${financialMetrics.grandTotalCost.toFixed(2)}
            </div>
            <p className="text-[10px] text-indigo-200/80 font-medium">Gran Total sin IVA</p>
          </div>
        </div>

        {/* 3. Sección: Información de Gestión y Vínculos Comerciales */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-600" />
                1. Registro de Gestión y Vínculos Comerciales
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Identificador único, estados de control y relaciones con clientes B2B o campañas.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target size={14} className="text-indigo-600" /> Cliente Receptor (B2B / Particular)
              </label>
              <select
                disabled={isReadOnly}
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="">Capacitación Interna / Sin Cliente Asociado</option>
                {clients.map(c => (
                  <option key={`full_mgmt_client_${c.id}`} value={c.id}>
                    {getClientName(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Megaphone size={14} className="text-purple-600" /> Campaña de Marketing Vinculada
              </label>
              <select
                disabled={isReadOnly}
                value={marketingCampaignId}
                onChange={e => setMarketingCampaignId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="">Ninguna / No vinculada a campaña</option>
                {campaigns.map(camp => (
                  <option key={`full_mgmt_camp_${camp.id}`} value={camp.id}>
                    [{camp.code || 'CAMP'}] {camp.name || `Campaña ${camp.id}`}
                  </option>
                ))}
              </select>
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
                Jornadas multidía, capacitadores asignados, tarifas por hora y horas ejecutadas.
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
                Total Honorarios: ${financialMetrics.totalTrainerCost.toFixed(2)} sin IVA
              </span>
            </h4>

            {sessions.map((session, sIdx) => {
              const sessionSpace = getSpaceDetails(session.spaceId);
              const pHours = calcHours(session.startTime, session.endTime);
              const execH = session.executedHours !== undefined ? Number(session.executedHours) : pHours;
              const rate = session.hourlyRate !== undefined ? Number(session.hourlyRate) : getDefaultTrainerRate(session.trainerId);
              const sessionTrainerCost = execH * rate;

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
                      <select
                        disabled={isReadOnly}
                        value={session.trainerId || ''}
                        onChange={e => handleUpdateSession(sIdx, 'trainerId', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Seleccionar Docente...</option>
                        {trainers.map(tr => (
                          <option key={`sess_tr_${tr.id}`} value={tr.id}>
                            {getTrainerName(tr.id)}
                          </option>
                        ))}
                      </select>
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
                          className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 text-xs font-black text-right rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      <select
                        disabled={isReadOnly}
                        value={session.spaceId || ''}
                        onChange={e => handleUpdateSession(sIdx, 'spaceId', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Seleccionar Sala...</option>
                        {spaces.map(sp => (
                          <option key={`sess_sp_${sp.id}`} value={sp.id}>
                            {sp.type === 'virtual' ? '💻' : '🏢'} {sp.name} ({sp.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

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

        {/* 5. Sección: Desglose Estructurado de Costos y Gastos (Sin IVA) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 text-left">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-600" />
              3. Desglose Estructurado de Costos y Gastos Operativos (Sin IVA)
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Agrega y administra los costos de logística, pago por uso de aulas/Zoom y gastos de marketing.
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
              'bg-blue-600'
            )}

            {/* b) Pago de Uso de Aulas / Zoom */}
            {renderExpenseTable(
              'Pago por Uso de Aulas Físicas o Licencias Zoom/Meet',
              <Video size={16} />,
              'space',
              spaceExpenses,
              financialMetrics.totalSpaceCost,
              'bg-amber-600'
            )}

            {/* c) Gastos de Marketing */}
            {renderExpenseTable(
              'Gastos de Marketing y Promoción',
              <Megaphone size={16} />,
              'marketing',
              marketingExpenses,
              financialMetrics.totalMarketingCost,
              'bg-purple-600'
            )}
          </div>

          {/* Resumen Financiero Consolidado */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
            <h4 className="font-black text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Receipt size={16} className="text-emerald-400" />
              Resumen Consolidado de Costos de la Capacitación (Sin IVA)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Honorarios Docentes
                </span>
                <span className="text-lg font-black text-emerald-400">
                  ${financialMetrics.totalTrainerCost.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Logística & Materiales
                </span>
                <span className="text-lg font-black text-blue-400">
                  ${financialMetrics.totalLogisticsCost.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Aulas & Zoom
                </span>
                <span className="text-lg font-black text-amber-400">
                  ${financialMetrics.totalSpaceCost.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Gastos Marketing
                </span>
                <span className="text-lg font-black text-purple-400">
                  ${financialMetrics.totalMarketingCost.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <span className="text-xs font-bold text-slate-400">
                Total Horas Planificadas: <strong className="text-white">{financialMetrics.totalPlannedHours}h</strong> | Total Horas Ejecutadas: <strong className="text-white">{financialMetrics.totalExecutedHours}h</strong>
              </span>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Gran Total (Sin IVA):</span>
                <span className="text-2xl font-black text-emerald-400">
                  ${financialMetrics.grandTotalCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botonera Inferior de Guardado */}
        <div className="flex items-center justify-end gap-3 pt-4 pb-12">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Save size={16} />
              <span>Guardar Ficha y Cronograma Completo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
