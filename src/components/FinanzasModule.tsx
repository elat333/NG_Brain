import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  Building,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Receipt,
  Layers,
  Sparkles,
  Calendar,
  Wallet,
  Landmark,
  FileCheck,
  RefreshCw,
  Clock,
  Trash2,
  Edit2,
  Percent,
  Download,
  ExternalLink,
  ShieldCheck,
  Building2,
  ArrowRightLeft,
  ChevronRight,
  ChevronDown,
  Scale,
  Target,
  Settings,
  Shield,
  BookOpen,
  PieChart,
  Sliders,
  Check,
  X,
  Lock,
  Eye,
  Info
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, sanitizeForFirestore, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BankAccount,
  BankTransaction,
  BankEntity,
  AccountChartNode,
  AccountJournal,
  FiscalYear,
  FiscalTaxConfig,
  BankStatement,
  FiscalTaxType,
  FiscalInvoiceType,
  FinancialStage,
  TeamMember,
  Company,
  TrainingManagement,
  TrainingPlan,
  Role,
  Process
} from '../types';
import { getModuleAccess, ModuleAccessLevel } from '../lib/permissions';
import { ModulePermissionsTab } from './common/ModulePermissionsTab';

export type FinanzasSubTab = 
  | 'treasury'
  | 'accounts'
  | 'bank_entities'
  | 'statements'
  | 'bank_statements'
  | 'budgets'
  | 'reconciliation'
  | 'config_chart'
  | 'config_journals'
  | 'config_fiscal'
  | 'config_taxes'
  | 'permissions';

interface FinanzasModuleProps {
  currentMember?: TeamMember | null;
  members: TeamMember[];
  companies: Company[];
  roles?: Role[];
  processes?: Process[];
  trainingManagements?: TrainingManagement[];
  trainingPlans?: TrainingPlan[];
  activeSubTab?: FinanzasSubTab;
  onSubTabChange?: (tab: FinanzasSubTab) => void;
}

// Catálogo Inicial del Plan General de Cuentas (Tryton Standard)
const DEFAULT_CHART_OF_ACCOUNTS: Omit<AccountChartNode, 'id'>[] = [
  { code: '1', name: 'ACTIVO', type: 'asset', level: 1, isActive: true },
  { code: '1.1', name: 'Activo Corriente', type: 'asset', parentCode: '1', level: 2, isActive: true },
  { code: '1.1.01', name: 'Efectivo y Equivalentes de Efectivo', type: 'asset', parentCode: '1.1', level: 3, isActive: true },
  { code: '1.1.01.01', name: 'Caja Chica Matriz', type: 'asset', parentCode: '1.1.01', level: 4, isActive: true, isReconcilable: true },
  { code: '1.1.01.02', name: 'Banco Pichincha Cta Cte', type: 'asset', parentCode: '1.1.01', level: 4, isActive: true, isReconcilable: true },
  { code: '1.1.01.03', name: 'Banco Guayaquil Cta Cte', type: 'asset', parentCode: '1.1.01', level: 4, isActive: true, isReconcilable: true },
  { code: '1.1.01.04', name: 'Banco Produbanco Ahorros', type: 'asset', parentCode: '1.1.01', level: 4, isActive: true, isReconcilable: true },
  { code: '1.1.02', name: 'Cuentas y Documentos por Cobrar Comerciales', type: 'asset', parentCode: '1.1', level: 3, isActive: true },
  { code: '1.1.03', name: 'Crédito Tributario IVA Compras', type: 'asset', parentCode: '1.1', level: 3, isActive: true },
  { code: '2', name: 'PASIVO', type: 'liability', level: 1, isActive: true },
  { code: '2.1', name: 'Pasivo Corriente', type: 'liability', parentCode: '2', level: 2, isActive: true },
  { code: '2.1.01', name: 'Cuentas y Documentos por Pagar Proveedores', type: 'liability', parentCode: '2.1', level: 3, isActive: true },
  { code: '2.1.02', name: 'Obligaciones con la Administración Tributaria (IVA por Pagar)', type: 'liability', parentCode: '2.1', level: 3, isActive: true },
  { code: '2.1.03', name: 'Retenciones en la Fuente por Pagar', type: 'liability', parentCode: '2.1', level: 3, isActive: true },
  { code: '3', name: 'PATRIMONIO NETO', type: 'equity', level: 1, isActive: true },
  { code: '3.1', name: 'Capital Social', type: 'equity', parentCode: '3', level: 2, isActive: true },
  { code: '3.2', name: 'Resultados Acumulados', type: 'equity', parentCode: '3', level: 2, isActive: true },
  { code: '4', name: 'INGRESOS', type: 'revenue', level: 1, isActive: true },
  { code: '4.1', name: 'Ingresos Operacionales de Actividades Ordinarias', type: 'revenue', parentCode: '4', level: 2, isActive: true },
  { code: '4.1.01', name: 'Ventas de Servicios de Capacitación & Formación', type: 'revenue', parentCode: '4.1', level: 3, isActive: true },
  { code: '4.1.02', name: 'Ventas de Servicios de Certificación & Acreditación', type: 'revenue', parentCode: '4.1', level: 3, isActive: true },
  { code: '4.1.03', name: 'Ventas de Productos y EPP', type: 'revenue', parentCode: '4.1', level: 3, isActive: true },
  { code: '5', name: 'COSTOS Y GASTOS', type: 'expense', level: 1, isActive: true },
  { code: '5.1', name: 'Costos Directos de Operación y Capacitación', type: 'expense', parentCode: '5', level: 2, isActive: true },
  { code: '5.1.01', name: 'Honorarios a Docentes e Instructores', type: 'expense', parentCode: '5.1', level: 3, isActive: true },
  { code: '5.1.02', name: 'Gastos de Logística, Catering y Aulas', type: 'expense', parentCode: '5.1', level: 3, isActive: true },
  { code: '5.1.03', name: 'Gastos de Certificados y Avales OEC', type: 'expense', parentCode: '5.1', level: 3, isActive: true },
  { code: '5.2', name: 'Gastos de Administración y Ventas', type: 'expense', parentCode: '5', level: 2, isActive: true },
  { code: '5.2.01', name: 'Gastos de Marketing y Publicidad', type: 'expense', parentCode: '5.2', level: 3, isActive: true }
];

// Diarios Contables Iniciales
const DEFAULT_JOURNALS: Omit<AccountJournal, 'id'>[] = [
  { code: 'BNK1', name: 'Diario Banco Pichincha', type: 'bank', isActive: true, createdAt: new Date().toISOString() },
  { code: 'BNK2', name: 'Diario Banco Guayaquil', type: 'bank', isActive: true, createdAt: new Date().toISOString() },
  { code: 'CAJA', name: 'Diario Caja Chica Matriz', type: 'cash', isActive: true, createdAt: new Date().toISOString() },
  { code: 'VENT', name: 'Diario de Ventas & Facturación', type: 'sale', isActive: true, createdAt: new Date().toISOString() },
  { code: 'COMP', name: 'Diario de Compras & Proveedores', type: 'purchase', isActive: true, createdAt: new Date().toISOString() },
  { code: 'GEN', name: 'Diario General de Operaciones', type: 'general', isActive: true, createdAt: new Date().toISOString() }
];

// Entidades Bancarias Iniciales de Ecuador
const DEFAULT_BANK_ENTITIES: Omit<BankEntity, 'id'>[] = [
  { code: 'BPICH', name: 'Banco Pichincha C.A.', bicSwift: 'PICHECEQ', country: 'Ecuador', website: 'https://www.pichincha.com', isActive: true, createdAt: new Date().toISOString() },
  { code: 'BGYE', name: 'Banco Guayaquil S.A.', bicSwift: 'GUAYECEG', country: 'Ecuador', website: 'https://www.bancoguayaquil.com', isActive: true, createdAt: new Date().toISOString() },
  { code: 'PROD', name: 'Banco Produbanco - Grupo Promerica', bicSwift: 'PRODECEQ', country: 'Ecuador', website: 'https://www.produbanco.com.ec', isActive: true, createdAt: new Date().toISOString() },
  { code: 'PACIF', name: 'Banco del Pacífico', bicSwift: 'PACIECEG', country: 'Ecuador', website: 'https://www.bancodelpacifico.com', isActive: true, createdAt: new Date().toISOString() },
  { code: 'INTER', name: 'Banco Internacional', bicSwift: 'INTECEQ', country: 'Ecuador', website: 'https://www.baninter.com.ec', isActive: true, createdAt: new Date().toISOString() }
];

// Impuestos y Retenciones SRI
const DEFAULT_TAXES: Omit<FiscalTaxConfig, 'id'>[] = [
  { code: 'IVA-15', name: 'IVA 15% General (Tarifa Vigente Ecuador)', type: 'iva', rate: 0.15, description: 'Impuesto al Valor Agregado tarifa general 15%', isActive: true },
  { code: 'IVA-0', name: 'IVA 0% (Tarifa Cero)', type: 'iva', rate: 0.00, description: 'Bienes y servicios gravados con tarifa 0%', isActive: true },
  { code: 'RET-IR-1.75', name: 'Retención IR 1.75% (Bienes y Servicios Generales)', type: 'retencion_renta', rate: 0.0175, description: 'Retención de Impuesto a la Renta en compras ordinarias', isActive: true },
  { code: 'RET-IR-2.75', name: 'Retención IR 2.75% (Servicios Profesionales/Docencia)', type: 'retencion_renta', rate: 0.0275, description: 'Retención de Impuesto a la Renta a capacitadores y profesionales', isActive: true },
  { code: 'RET-IVA-30', name: 'Retención IVA 30% (Bienes)', type: 'retencion_iva', rate: 0.30, description: 'Retención del 30% del IVA en adquisición de bienes', isActive: true },
  { code: 'RET-IVA-70', name: 'Retención IVA 70% (Servicios)', type: 'retencion_iva', rate: 0.70, description: 'Retención del 70% del IVA en prestación de servicios', isActive: true },
  { code: 'RET-IVA-100', name: 'Retención IVA 100% (Honorarios Profesionales)', type: 'retencion_iva', rate: 1.00, description: 'Retención del 100% del IVA en servicios profesionales', isActive: true }
];

export const FinanzasModule: React.FC<FinanzasModuleProps> = ({
  currentMember,
  members,
  companies,
  roles = [],
  processes = [],
  trainingManagements = [],
  trainingPlans = [],
  activeSubTab: controlledActiveSubTab,
  onSubTabChange
}) => {
  // Navigation State
  const [localActiveSubTab, setLocalActiveSubTab] = useState<FinanzasSubTab>('treasury');
  const activeSubTab = controlledActiveSubTab ?? localActiveSubTab;
  const setActiveSubTab = (tab: FinanzasSubTab) => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setLocalActiveSubTab(tab);
    }
  };

  // Real-time Firestore states
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [bankEntities, setBankEntities] = useState<BankEntity[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<AccountChartNode[]>([]);
  const [journals, setJournals] = useState<AccountJournal[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [fiscalTaxes, setFiscalTaxes] = useState<FiscalTaxConfig[]>([]);
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'ingreso' | 'egreso' | 'transferencia_interna'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modals state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<BankAccount> | null>(null);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<BankTransaction> | null>(null);

  const [showBankEntityModal, setShowBankEntityModal] = useState(false);
  const [editingBankEntity, setEditingBankEntity] = useState<Partial<BankEntity> | null>(null);

  const [showChartNodeModal, setShowChartNodeModal] = useState(false);
  const [editingChartNode, setEditingChartNode] = useState<Partial<AccountChartNode> | null>(null);

  const [showJournalModal, setShowJournalModal] = useState(false);
  const [editingJournal, setEditingJournal] = useState<Partial<AccountJournal> | null>(null);

  const [showStatementModal, setShowStatementModal] = useState(false);
  const [editingStatement, setEditingStatement] = useState<Partial<BankStatement> | null>(null);

  // User permissions evaluation
  const isAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
  const userTreasuryAccess = getModuleAccess(currentMember, roles, 'finanzas_treasury');
  const userAccountsAccess = getModuleAccess(currentMember, roles, 'finanzas_accounts');
  const userStatementsAccess = getModuleAccess(currentMember, roles, 'finanzas_statements');
  const userBudgetsAccess = getModuleAccess(currentMember, roles, 'finanzas_budgets');
  const userReconciliationAccess = getModuleAccess(currentMember, roles, 'finanzas_reconciliation');
  const userConfigAccess = getModuleAccess(currentMember, roles, 'finanzas_config');
  const isLeaderOrAdmin = isAdmin || userTreasuryAccess === 'lider' || userTreasuryAccess === 'administrador';

  // Toggle Section in Sidebar
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Firestore Subscriptions & Bootstrap
  useEffect(() => {
    setIsLoading(true);

    const unsubAccounts = onSnapshot(collection(db, 'bank_accounts'), snapshot => {
      const list: BankAccount[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as BankAccount));
      setBankAccounts(list);
    });

    const unsubTx = onSnapshot(query(collection(db, 'bank_transactions'), orderBy('date', 'desc')), snapshot => {
      const list: BankTransaction[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as BankTransaction));
      setTransactions(list);
      setIsLoading(false);
    });

    const unsubEntities = onSnapshot(collection(db, 'bank_entities'), snapshot => {
      const list: BankEntity[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as BankEntity));
      setBankEntities(list.length > 0 ? list : DEFAULT_BANK_ENTITIES.map((e, idx) => ({ id: `entity-${idx + 1}`, ...e })));
    });

    const unsubChart = onSnapshot(collection(db, 'account_charts'), snapshot => {
      const list: AccountChartNode[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as AccountChartNode));
      setChartOfAccounts(list.length > 0 ? list : DEFAULT_CHART_OF_ACCOUNTS.map((c, idx) => ({ id: `chart-${idx + 1}`, ...c })));
    });

    const unsubJournals = onSnapshot(collection(db, 'account_journals'), snapshot => {
      const list: AccountJournal[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as AccountJournal));
      setJournals(list.length > 0 ? list : DEFAULT_JOURNALS.map((j, idx) => ({ id: `journal-${idx + 1}`, ...j })));
    });

    const unsubTaxes = onSnapshot(collection(db, 'fiscal_taxes'), snapshot => {
      const list: FiscalTaxConfig[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as FiscalTaxConfig));
      setFiscalTaxes(list.length > 0 ? list : DEFAULT_TAXES.map((t, idx) => ({ id: `tax-${idx + 1}`, ...t })));
    });

    const unsubStatements = onSnapshot(collection(db, 'bank_statements'), snapshot => {
      const list: BankStatement[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as BankStatement));
      setBankStatements(list);
    });

    return () => {
      unsubAccounts();
      unsubTx();
      unsubEntities();
      unsubChart();
      unsubJournals();
      unsubTaxes();
      unsubStatements();
    };
  }, []);

  // Treasury KPIs
  const treasuryMetrics = useMemo(() => {
    const totalLiquidity = bankAccounts.reduce((acc, a) => acc + (Number(a.currentBalance) || 0), 0);
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let monthlyInflows = 0;
    let monthlyOutflows = 0;
    let pendingReconciliations = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(currentMonthPrefix)) {
        if (t.type === 'ingreso') monthlyInflows += (Number(t.amount) || 0);
        if (t.type === 'egreso') monthlyOutflows += (Number(t.amount) || 0);
      }
      if (!t.isReconciled) pendingReconciliations++;
    });

    return {
      totalLiquidity,
      monthlyInflows,
      monthlyOutflows,
      netCashFlow: monthlyInflows - monthlyOutflows,
      pendingReconciliations
    };
  }, [bankAccounts, transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = !searchQuery ||
        t.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.referenceNumber && t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.accountName && t.accountName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchAccount = selectedAccountId === 'all' || t.accountId === selectedAccountId;
      const matchType = selectedTypeFilter === 'all' || t.type === selectedTypeFilter;
      const matchCategory = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;

      return matchSearch && matchAccount && matchType && matchCategory;
    });
  }, [transactions, searchQuery, selectedAccountId, selectedTypeFilter, selectedCategoryFilter]);

  // CRUD Handlers for Bank Accounts
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount?.bankName || !editingAccount?.accountNumber) return;

    try {
      const accId = editingAccount.id || `bank-acc-${Date.now()}`;
      const payload: BankAccount = {
        id: accId,
        bankName: editingAccount.bankName,
        accountNumber: editingAccount.accountNumber,
        accountType: editingAccount.accountType || 'corriente',
        currency: editingAccount.currency || 'USD',
        holderName: editingAccount.holderName || 'Novagreen S.A.',
        holderTaxId: editingAccount.holderTaxId || '1790000000001',
        initialBalance: Number(editingAccount.initialBalance) || 0,
        currentBalance: editingAccount.currentBalance !== undefined ? Number(editingAccount.currentBalance) : (Number(editingAccount.initialBalance) || 0),
        isCompanyAccount: editingAccount.isCompanyAccount ?? true,
        status: editingAccount.status || 'activa',
        notes: editingAccount.notes || '',
        createdAt: editingAccount.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'bank_accounts', accId), sanitizeForFirestore(payload));
      setShowAccountModal(false);
      setEditingAccount(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'Guardar cuenta bancaria');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta cuenta bancaria?')) return;
    try {
      await deleteDoc(doc(db, 'bank_accounts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'Eliminar cuenta bancaria');
    }
  };

  // CRUD Handlers for Transactions
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction?.accountId || !editingTransaction?.amount || !editingTransaction?.concept) return;

    try {
      const txId = editingTransaction.id || `tx-${Date.now()}`;
      const selectedAccount = bankAccounts.find(a => a.id === editingTransaction.accountId);
      const subtotal = Number(editingTransaction.subtotal) || Number(editingTransaction.amount) || 0;
      const hasTax = editingTransaction.hasTax ?? false;
      const taxRate = hasTax ? 0.15 : 0;
      const taxAmount = hasTax ? subtotal * taxRate : 0;
      const totalAmount = subtotal + taxAmount;

      const payload: BankTransaction = {
        id: txId,
        accountId: editingTransaction.accountId,
        accountName: selectedAccount ? `${selectedAccount.bankName} (${selectedAccount.accountNumber})` : 'Cuenta General',
        type: editingTransaction.type || 'egreso',
        date: editingTransaction.date || new Date().toISOString().split('T')[0],
        amount: totalAmount,
        subtotal: subtotal,
        hasTax: hasTax,
        taxType: hasTax ? 'iva_15' : 'iva_0',
        taxAmount: taxAmount,
        category: editingTransaction.category || 'otro',
        concept: editingTransaction.concept,
        referenceNumber: editingTransaction.referenceNumber || '',
        voucherUrl: editingTransaction.voucherUrl || '',
        trainingPlanId: editingTransaction.trainingPlanId || '',
        projectId: editingTransaction.projectId || '',
        isReconciled: editingTransaction.isReconciled || false,
        registeredByMemberId: currentMember?.id || 'admin',
        registeredByName: currentMember?.name || 'Sistema',
        createdAt: editingTransaction.createdAt || new Date().toISOString()
      };

      await setDoc(doc(db, 'bank_transactions', txId), sanitizeForFirestore(payload));

      // Recalcular saldo de la cuenta bancaria asociada
      if (selectedAccount && !editingTransaction.id) {
        let delta = 0;
        if (payload.type === 'ingreso') delta = totalAmount;
        else if (payload.type === 'egreso') delta = -totalAmount;

        const newBalance = (Number(selectedAccount.currentBalance) || 0) + delta;
        await updateDoc(doc(db, 'bank_accounts', selectedAccount.id), {
          currentBalance: newBalance,
          updatedAt: new Date().toISOString()
        });
      }

      setShowTransactionModal(false);
      setEditingTransaction(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'Registrar transacción');
    }
  };

  const handleToggleReconciliation = async (tx: BankTransaction) => {
    try {
      await updateDoc(doc(db, 'bank_transactions', tx.id), {
        isReconciled: !tx.isReconciled,
        reconciledAt: !tx.isReconciled ? new Date().toISOString() : null,
        reconciledBy: !tx.isReconciled ? currentMember?.name || 'Administrador' : null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'Cambiar estado de conciliación');
    }
  };

  const handleDeleteTransaction = async (tx: BankTransaction) => {
    if (!window.confirm('¿Está seguro de eliminar este movimiento contable?')) return;
    try {
      await deleteDoc(doc(db, 'bank_transactions', tx.id));
      // Revertir saldo en la cuenta
      const account = bankAccounts.find(a => a.id === tx.accountId);
      if (account) {
        let revertDelta = 0;
        if (tx.type === 'ingreso') revertDelta = -Number(tx.amount);
        else if (tx.type === 'egreso') revertDelta = Number(tx.amount);
        const revertedBalance = (Number(account.currentBalance) || 0) + revertDelta;
        await updateDoc(doc(db, 'bank_accounts', account.id), {
          currentBalance: revertedBalance,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'Eliminar transacción');
    }
  };

  return (
    <div className="w-full flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950">

      {/* SUBTAB 1: DASHBOARD DE TESORERÍA */}
      {activeSubTab === 'treasury' && (
          <div className="space-y-6">
            {/* Header del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" size={26} />
                  Dashboard de Tesorería & Liquidez
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Consolidado financiero en tiempo real según el estándar contable Tryton ERP.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingTransaction({ type: 'ingreso', date: new Date().toISOString().split('T')[0] });
                    setShowTransactionModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <ArrowDownRight size={15} />
                  Registrar Cobro / Ingreso
                </button>
                <button
                  onClick={() => {
                    setEditingTransaction({ type: 'egreso', date: new Date().toISOString().split('T')[0] });
                    setShowTransactionModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <ArrowUpRight size={15} />
                  Registrar Pago / Egreso
                </button>
              </div>
            </div>

            {/* Tarjetas de Métricas de Liquidez */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Liquidez Consolidada */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Liquidez Total</span>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <Landmark size={18} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ${treasuryMetrics.totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span>En {bankAccounts.length} cuentas y cajas activas</span>
                </div>
              </div>

              {/* Ingresos del Mes */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos del Mes</span>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <ArrowDownRight size={18} />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  +${treasuryMetrics.monthlyInflows.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-emerald-600/80 mt-1">Cobros y recaudaciones efectivas</div>
              </div>

              {/* Egresos del Mes */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Egresos del Mes</span>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  -${treasuryMetrics.monthlyOutflows.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-rose-600/80 mt-1">Pagos operativos y honorarios</div>
              </div>

              {/* Flujo Neto de Caja */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flujo Neto</span>
                  <div className={`p-2 rounded-xl ${treasuryMetrics.netCashFlow >= 0 ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30'}`}>
                    <Scale size={18} />
                  </div>
                </div>
                <div className={`text-2xl font-black ${treasuryMetrics.netCashFlow >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {treasuryMetrics.netCashFlow >= 0 ? '+' : ''}${treasuryMetrics.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1">Superávit / Déficit de caja</div>
              </div>
            </div>

            {/* Posición de Cuentas Bancarias & Cajas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wallet size={18} className="text-indigo-600" />
                    Posición Consolidada por Cuenta
                  </h3>
                  <button
                    onClick={() => setActiveSubTab('accounts')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    Ver todas las cuentas →
                  </button>
                </div>

                <div className="space-y-3">
                  {bankAccounts.map(account => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                          {account.accountType === 'caja_chica' ? '💵' : '🏦'}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {account.bankName}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {account.accountType.toUpperCase()} • No. {account.accountNumber} • {account.holderName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          ${(Number(account.currentBalance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                          ● Activa
                        </span>
                      </div>
                    </div>
                  ))}

                  {bankAccounts.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No hay cuentas bancarias registradas. Haga clic en "+ Nueva Cuenta" para añadir la primera.
                    </div>
                  )}
                </div>
              </div>

              {/* Últimos Movimientos */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" />
                    Últimos Movimientos
                  </h3>
                  <button
                    onClick={() => setActiveSubTab('statements')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    Ver historial →
                  </button>
                </div>

                <div className="space-y-3">
                  {transactions.slice(0, 5).map(tx => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                          {tx.concept}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {tx.date} • {tx.accountName}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-bold ${tx.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'ingreso' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                        </span>
                        {tx.hasTax && (
                          <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">
                            IVA 15% incl.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Sin movimientos recientes registrados.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: CUENTAS BANCARIAS & CAJAS CHICAS */}
        {activeSubTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="text-blue-600" size={26} />
                  Cuentas Bancarias & Cajas Chicas (`bank.account`)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Administre las cuentas corrientes, cuentas de ahorro y cajas de efectivo de la organización.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingAccount({
                    bankName: 'Banco Pichincha',
                    accountType: 'corriente',
                    currency: 'USD',
                    holderName: 'Novagreen S.A.',
                    holderTaxId: '1790000000001',
                    initialBalance: 0,
                    currentBalance: 0,
                    status: 'activa'
                  });
                  setShowAccountModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={16} />
                Nueva Cuenta Bancaria / Caja
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bankAccounts.map(acc => (
                <div
                  key={acc.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                        {acc.accountType === 'caja_chica' ? '💵' : '🏦'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {acc.bankName}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {acc.accountNumber}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase">
                      {acc.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      Saldo Disponible (USD)
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      ${(Number(acc.currentBalance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Titular: <span className="font-semibold text-slate-700 dark:text-slate-300">{acc.holderName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-400 capitalize">
                      Tipo: <strong className="text-slate-700 dark:text-slate-300">{acc.accountType.replace('_', ' ')}</strong>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setShowAccountModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                        title="Editar cuenta"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 3: DIRECTORIO DE BANCOS (`bank`) */}
        {activeSubTab === 'bank_entities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="text-cyan-600" size={26} />
                  Directorio de Instituciones Bancarias (`bank`)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Catálogo oficial de bancos, códigos SWIFT/BIC para transferencias locales e internacionales.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingBankEntity({
                    name: '',
                    code: '',
                    bicSwift: '',
                    country: 'Ecuador',
                    isActive: true
                  });
                  setShowBankEntityModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md shadow-cyan-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={16} />
                Registrar Entidad Bancaria
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Institución Financiera</th>
                    <th className="p-4">Código Interno</th>
                    <th className="p-4">Código BIC / SWIFT</th>
                    <th className="p-4">País</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {bankEntities.map(entity => (
                    <tr key={entity.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                      <td className="p-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 size={16} className="text-cyan-600" />
                        {entity.name}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-400">{entity.code}</td>
                      <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{entity.bicSwift || '—'}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{entity.country || 'Ecuador'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase">
                          Activo
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setEditingBankEntity(entity);
                            setShowBankEntityModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-600"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 4: LIBRO DE MOVIMIENTOS CON IVA 15% */}
        {activeSubTab === 'statements' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="text-emerald-600" size={26} />
                  Libro Mayor de Movimientos & Extractos
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Registro de transacciones con Base Imponible, IVA 15%/0%, comprobantes y trazabilidad.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingTransaction({
                      type: 'egreso',
                      date: new Date().toISOString().split('T')[0],
                      hasTax: true,
                      category: 'gasto_logistica'
                    });
                    setShowTransactionModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Plus size={16} />
                  Nuevo Movimiento
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por concepto, no. de factura o referencia..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="all">Todas las Cuentas</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bankName} - {a.accountNumber}</option>
                  ))}
                </select>

                <select
                  value={selectedTypeFilter}
                  onChange={e => setSelectedTypeFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="all">Todos los Tipos</option>
                  <option value="ingreso">🟢 Ingresos</option>
                  <option value="egreso">🔴 Egresos</option>
                  <option value="transferencia_interna">🔄 Transferencias</option>
                </select>
              </div>
            </div>

            {/* Tabla de Movimientos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Concepto / Glosa</th>
                    <th className="p-4">Cuenta Bancaria</th>
                    <th className="p-4">Base Imponible</th>
                    <th className="p-4">IVA (15%)</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Conciliación</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                      <td className="p-4 text-slate-500 font-mono">{tx.date}</td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        <div>{tx.concept}</div>
                        {tx.referenceNumber && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            Ref / Factura: {tx.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{tx.accountName}</td>
                      <td className="p-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        ${(Number(tx.subtotal) || Number(tx.amount)).toFixed(2)}
                      </td>
                      <td className="p-4 font-mono">
                        {tx.hasTax ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                            +${(Number(tx.taxAmount) || 0).toFixed(2)} (15%)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">0.00 (0%)</span>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold">
                        <span className={tx.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}>
                          {tx.type === 'ingreso' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleReconciliation(tx)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                            tx.isReconciled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 size={12} />
                          {tx.isReconciled ? 'Conciliado' : 'Pendiente'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingTransaction(tx);
                              setShowTransactionModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No se encontraron movimientos con los filtros seleccionados.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 5: PLAN GENERAL DE CUENTAS (`account.account`) */}
        {activeSubTab === 'config_chart' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={26} />
                  Plan General de Cuentas Contables (`account.account`)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Estructura jerárquica de cuentas contables de partida doble según normativa ecuatoriana y NIIF.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingChartNode({
                    code: '',
                    name: '',
                    type: 'asset',
                    level: 4,
                    isActive: true
                  });
                  setShowChartNodeModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={16} />
                Añadir Cuenta Contable
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Código Contable</th>
                    <th className="p-4">Nombre de la Cuenta</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Nivel</th>
                    <th className="p-4">Conciliable</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                  {chartOfAccounts.map(node => (
                    <tr
                      key={node.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${
                        node.level === 1 ? 'font-bold bg-slate-50/50 dark:bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="p-4 text-indigo-600 dark:text-indigo-400 font-bold">{node.code}</td>
                      <td className="p-4 font-sans text-slate-900 dark:text-white" style={{ paddingLeft: `${node.level * 16}px` }}>
                        {node.name}
                      </td>
                      <td className="p-4 uppercase text-[10px] text-slate-500 font-sans">{node.type}</td>
                      <td className="p-4 text-slate-500 font-sans">Nivel {node.level}</td>
                      <td className="p-4 font-sans">
                        {node.isReconcilable ? (
                          <span className="text-emerald-600 font-bold">✓ Sí</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-sans">
                        <button
                          onClick={() => {
                            setEditingChartNode(node);
                            setShowChartNodeModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 6: DIARIOS CONTABLES (`account.journal`) */}
        {activeSubTab === 'config_journals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="text-slate-600" size={26} />
                  Diarios Contables (`account.journal`)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Defina los libros y diarios auxiliares para el registro de transacciones de caja, bancos y ventas.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingJournal({
                    code: '',
                    name: '',
                    type: 'general',
                    isActive: true
                  });
                  setShowJournalModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={16} />
                Nuevo Diario Contable
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {journals.map(j => (
                <div
                  key={j.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                      {j.code}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      {j.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {j.name}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Estado: <strong className="text-emerald-600">Activo</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 7: IMPUESTOS & RETENCIONES SRI (`account.tax`) */}
        {activeSubTab === 'config_taxes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent className="text-rose-600" size={26} />
                  Impuestos & Retenciones SRI (`account.tax`)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tarifas tributarias aplicables a compras, ventas, honorarios docentes y retenciones de ley.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Código</th>
                    <th className="p-4">Nombre del Impuesto / Retención</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Tarifa / Porcentaje</th>
                    <th className="p-4">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {fiscalTaxes.map(tax => (
                    <tr key={tax.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{tax.code}</td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">{tax.name}</td>
                      <td className="p-4 uppercase text-[10px] text-slate-500 font-semibold">{tax.type.replace('_', ' ')}</td>
                      <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {(tax.rate * 100).toFixed(2)}%
                      </td>
                      <td className="p-4 text-slate-500">{tax.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 8: CONTROL PRESUPUESTARIO (`account.budget`) */}
        {activeSubTab === 'budgets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="text-purple-600" size={26} />
                  Control Presupuestario & Rentabilidad (`account.budget`)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Comparativa de ingresos y gastos Proyectados vs Ejecutados Reales con cálculo de desviación.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales Planificados</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">$0.00</div>
                <p className="text-xs text-slate-500">Proyecciones de ventas y cursos</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos Totales Presupuestados</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">$0.00</div>
                <p className="text-xs text-slate-500">Honorarios, aulas y logística prevista</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Margen Operativo Promedio</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">0.0%</div>
                <p className="text-xs text-slate-500">Utilidad proyectada sobre ventas</p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 9: CONCILIACIÓN BANCARIA (`account.reconciliation`) */}
        {activeSubTab === 'reconciliation' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="text-amber-600" size={26} />
                  Conciliación Bancaria Automática (`account.reconciliation`)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Coteje los extractos oficiales del banco contra los comprobantes y transferencias registrados.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Transacciones Pendientes de Validación
                </h3>
                <span className="text-xs text-slate-500">
                  {treasuryMetrics.pendingReconciliations} transacciones por auditar
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.filter(t => !t.isReconciled).map(tx => (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{tx.concept}</div>
                      <div className="text-slate-400">{tx.date} • {tx.accountName} • Ref: {tx.referenceNumber || 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ${Number(tx.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleToggleReconciliation(tx)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <CheckCircle2 size={14} />
                        Validar & Conciliar
                      </button>
                    </div>
                  </div>
                ))}

                {transactions.filter(t => !t.isReconciled).length === 0 && (
                  <div className="text-center py-8 text-emerald-600 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    ¡Todas las transacciones bancarias se encuentran conciliadas y al día!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 10: PERMISOS DEL MÓDULO */}
        {activeSubTab === 'permissions' && (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <ModulePermissionsTab
              moduleId="finanzas"
              moduleName="Finanzas & Bancos"
              currentMember={currentMember}
              members={members}
              processes={processes}
              roles={roles}
            />
          </motion.div>
        )}

      {/* MODAL: CUENTA BANCARIA */}
      <AnimatePresence>
        {showAccountModal && editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Wallet size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {editingAccount.id ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria / Caja'}
                  </h3>
                </div>
                <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institución Bancaria / Nombre de Caja
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAccount.bankName || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, bankName: e.target.value })}
                    placeholder="ej. Banco Pichincha, Banco Guayaquil, Caja Chica Matriz"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Número de Cuenta
                    </label>
                    <input
                      type="text"
                      required
                      value={editingAccount.accountNumber || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })}
                      placeholder="ej. 2100123456"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={editingAccount.accountType || 'corriente'}
                      onChange={e => setEditingAccount({ ...editingAccount, accountType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="corriente">Cuenta Corriente</option>
                      <option value="ahorros">Cuenta de Ahorros</option>
                      <option value="caja_chica">Caja Chica (Efectivo)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Titular / Razón Social
                    </label>
                    <input
                      type="text"
                      value={editingAccount.holderName || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, holderName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      RUC del Titular
                    </label>
                    <input
                      type="text"
                      value={editingAccount.holderTaxId || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, holderTaxId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Saldo Inicial (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingAccount.initialBalance ?? 0}
                      onChange={e => setEditingAccount({ ...editingAccount, initialBalance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Saldo Actual (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingAccount.currentBalance ?? 0}
                      onChange={e => setEditingAccount({ ...editingAccount, currentBalance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAccountModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    Guardar Cuenta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MOVIMIENTO CONTABLE CON IVA */}
      <AnimatePresence>
        {showTransactionModal && editingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${editingTransaction.type === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <Receipt size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {editingTransaction.id ? 'Editar Movimiento Contable' : 'Registrar Nuevo Movimiento'}
                  </h3>
                </div>
                <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="space-y-4 pt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Operación
                    </label>
                    <select
                      value={editingTransaction.type || 'egreso'}
                      onChange={e => setEditingTransaction({ ...editingTransaction, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                    >
                      <option value="ingreso">🟢 Ingreso / Cobro</option>
                      <option value="egreso">🔴 Egreso / Pago</option>
                      <option value="transferencia_interna">🔄 Transferencia entre Cuentas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      required
                      value={editingTransaction.date || new Date().toISOString().split('T')[0]}
                      onChange={e => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cuenta Bancaria / Caja Afectada
                  </label>
                  <select
                    required
                    value={editingTransaction.accountId || ''}
                    onChange={e => setEditingTransaction({ ...editingTransaction, accountId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Seleccione una cuenta bancaria...</option>
                    {bankAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.bankName} - No. {a.accountNumber} (${(Number(a.currentBalance) || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Concepto / Glosa
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTransaction.concept || ''}
                    onChange={e => setEditingTransaction({ ...editingTransaction, concept: e.target.value })}
                    placeholder="ej. Cobro de curso ISO 9001 a Empresa XYZ, Pago de honorarios docente"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                {/* Desglose Fiscal con IVA */}
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Desglose Fiscal (Tryton Tax)
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTransaction.hasTax ?? false}
                        onChange={e => setEditingTransaction({ ...editingTransaction, hasTax: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        Grava IVA 15%
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Subtotal (Sin IVA)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editingTransaction.subtotal ?? editingTransaction.amount ?? ''}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingTransaction({
                            ...editingTransaction,
                            subtotal: val,
                            amount: editingTransaction.hasTax ? val * 1.15 : val
                          });
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        IVA Calculado
                      </label>
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        ${((editingTransaction.hasTax ? (Number(editingTransaction.subtotal) || 0) * 0.15 : 0)).toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Total a Registrar
                      </label>
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono font-bold text-slate-900 dark:text-white">
                        ${((Number(editingTransaction.subtotal) || 0) + (editingTransaction.hasTax ? (Number(editingTransaction.subtotal) || 0) * 0.15 : 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. Factura / Voucher
                    </label>
                    <input
                      type="text"
                      value={editingTransaction.referenceNumber || ''}
                      onChange={e => setEditingTransaction({ ...editingTransaction, referenceNumber: e.target.value })}
                      placeholder="ej. 001-002-000001234"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Categoría Operativa
                    </label>
                    <select
                      value={editingTransaction.category || 'otro'}
                      onChange={e => setEditingTransaction({ ...editingTransaction, category: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="cobro_capacitacion">Cobro Capacitación</option>
                      <option value="pago_honorarios_docente">Honorarios Docente</option>
                      <option value="cobro_ventas_b2b">Ventas Corporativas</option>
                      <option value="gasto_logistica">Logística y Aulas</option>
                      <option value="gasto_marketing">Publicidad & Marketing</option>
                      <option value="transferencia_interna">Transferencia entre Cuentas</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    Guardar Movimiento
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
