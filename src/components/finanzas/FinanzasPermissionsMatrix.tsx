import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Send, 
  Save, 
  X, 
  Building2, 
  Landmark,
  Wallet,
  Receipt,
  Target,
  Scale,
  Settings,
  CheckCircle2, 
  Filter, 
  User, 
  Info, 
  ChevronDown, 
  Check,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, Role } from '../../types';
import { getModuleAccess, ModuleAccessLevel } from '../../lib/permissions';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../../lib/firebase';
import { commentService } from '../../services/commentService';

interface FinanzasPermissionsMatrixProps {
  currentMember?: TeamMember | null;
  members?: TeamMember[];
  processes?: Process[];
  roles?: Role[];
}

const ACCESS_LEVELS: { id: ModuleAccessLevel; label: string; shortLabel: string; desc: string; activeBg: string }[] = [
  { id: 'ninguno', label: 'Ninguno', shortLabel: 'Ninguno', desc: 'Sin acceso a este submódulo', activeBg: 'bg-red-500 text-white shadow-sm' },
  { id: 'lector', label: 'Lector', shortLabel: 'Lector', desc: 'Solo consulta y visualización de saldos y reportes', activeBg: 'bg-amber-500 text-white shadow-sm' },
  { id: 'colaborador', label: 'Colaborador', shortLabel: 'Colab.', desc: 'Registrar movimientos, comprobantes y conciliar', activeBg: 'bg-blue-600 text-white shadow-sm' },
  { id: 'lider', label: 'Líder', shortLabel: 'Líder', desc: 'Aprobación de pagos, gestión presupuestaria y supervisión', activeBg: 'bg-purple-600 text-white shadow-sm' },
  { id: 'administrador', label: 'Administrador', shortLabel: 'Admin.', desc: 'Control total de tesorería, cuentas bancarias y configuración contable', activeBg: 'bg-emerald-600 text-white shadow-sm' }
];

export const FINANZAS_SUBMODULES = [
  {
    key: 'finanzas_treasury',
    name: 'Dashboard de Tesorería & Liquidez',
    desc: 'Métricas de liquidez consolidada, saldos por cuenta, flujo neto y KPIs.',
    icon: TrendingUp,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
  },
  {
    key: 'finanzas_accounts',
    name: 'Cuentas Bancarias & Cajas Chicas',
    desc: 'Catálogo de cuentas corrientes, ahorros, cajas chicas y directorio de bancos.',
    icon: Landmark,
    color: 'text-blue-600 bg-blue-50 border-blue-100'
  },
  {
    key: 'finanzas_statements',
    name: 'Libro Mayor de Movimientos & Extractos',
    desc: 'Registro de cobros, pagos, IVA (15%/0%), facturas y extractos bancarios.',
    icon: Receipt,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
  },
  {
    key: 'finanzas_budgets',
    name: 'Control Presupuestario & Costos',
    desc: 'Presupuestos Planificados vs Ejecutados Reales y márgenes por centro de costo.',
    icon: Target,
    color: 'text-purple-600 bg-purple-50 border-purple-100'
  },
  {
    key: 'finanzas_reconciliation',
    name: 'Conciliación Bancaria',
    desc: 'Cotejo de extractos bancarios oficiales contra transacciones registradas.',
    icon: Scale,
    color: 'text-amber-600 bg-amber-50 border-amber-100'
  },
  {
    key: 'finanzas_config',
    name: 'Configuración Contable Tryton',
    desc: 'Plan General de Cuentas, Diarios Contables, Periodos Fiscales e Impuestos SRI.',
    icon: Settings,
    color: 'text-slate-600 bg-slate-50 border-slate-200'
  }
];

export const FinanzasPermissionsMatrix: React.FC<FinanzasPermissionsMatrixProps> = ({
  currentMember,
  members = [],
  processes = [],
  roles = []
}) => {
  const [search, setSearch] = useState('');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Borrador de cambios: { [memberId]: { [submoduleKey]: ModuleAccessLevel } }
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, ModuleAccessLevel>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Solicitud formal de permisos
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqSubmodule, setReqSubmodule] = useState<string>('finanzas_treasury');
  const [reqLevel, setReqLevel] = useState<ModuleAccessLevel>('colaborador');
  const [reqJustification, setReqJustification] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);

  const isAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
  const currentAccess = getModuleAccess(currentMember, roles, 'finanzas');
  const isLeader = currentAccess === 'lider' || currentAccess === 'administrador';

  // Filtrado de miembros
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !search || 
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
        (typeof m.role === 'string' && m.role.toLowerCase().includes(search.toLowerCase()));
      
      const matchProcess = processFilter === 'all' || m.processId === processFilter;
      const matchSelected = !selectedMemberId || m.id === selectedMemberId;

      return matchSearch && matchProcess && matchSelected;
    });
  }, [members, search, processFilter, selectedMemberId]);

  const totalPendingCount = useMemo(() => {
    return Object.values(pendingChanges).reduce((acc, subMap) => acc + Object.keys(subMap).length, 0);
  }, [pendingChanges]);

  const handleLevelSelect = (memberId: string, subKey: string, level: ModuleAccessLevel) => {
    if (!isAdmin) return;
    setPendingChanges(prev => {
      const memberChanges = { ...(prev[memberId] || {}) };
      const currentVal = getMemberSubmoduleAccess(members.find(m => m.id === memberId), subKey);
      
      if (level === currentVal) {
        delete memberChanges[subKey];
        if (Object.keys(memberChanges).length === 0) {
          const next = { ...prev };
          delete next[memberId];
          return next;
        }
        return { ...prev, [memberId]: memberChanges };
      }

      return {
        ...prev,
        [memberId]: { ...memberChanges, [subKey]: level }
      };
    });
  };

  const getMemberSubmoduleAccess = (member: TeamMember | undefined, subKey: string): ModuleAccessLevel => {
    if (!member) return 'ninguno';
    if (member.isSystemAdmin || member.systemRoleId === 'role-admin') return 'administrador';
    
    // Si hay cambio pendiente en borrador
    if (pendingChanges[member.id]?.[subKey]) {
      return pendingChanges[member.id][subKey];
    }

    return getModuleAccess(member, roles, subKey);
  };

  const handleSaveAll = async () => {
    if (!isAdmin || totalPendingCount === 0) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      for (const [memberId, subMap] of Object.entries(pendingChanges)) {
        const member = members.find(m => m.id === memberId);
        if (!member) continue;

        const currentAccessMap = { ...(member.moduleAccess || {}) };
        for (const [subKey, newLevel] of Object.entries(subMap)) {
          currentAccessMap[subKey] = newLevel;
        }

        // Si se asigna permiso en algún submódulo, asegurar acceso global al módulo finanzas
        const hasAnySubAccess = Object.keys(currentAccessMap)
          .filter(k => k.startsWith('finanzas_'))
          .some(k => currentAccessMap[k] !== 'ninguno');

        if (hasAnySubAccess && currentAccessMap['finanzas'] === 'ninguno') {
          currentAccessMap['finanzas'] = 'lector';
        }

        const memberRef = doc(db, 'members', memberId);
        await updateDoc(memberRef, {
          moduleAccess: currentAccessMap,
          updatedAt: new Date().toISOString()
        });
      }

      setPendingChanges({});
      setSaveSuccessMsg(`¡Permisos de Finanzas & Bancos guardados exitosamente! (${totalPendingCount} cambios aplicados)`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'Actualizar permisos de finanzas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember || !reqJustification.trim()) return;
    setIsSendingRequest(true);
    setRequestSuccessMsg(null);

    try {
      const admins = members.filter(m => m.isSystemAdmin || m.systemRoleId === 'role-admin');
      const subInfo = FINANZAS_SUBMODULES.find(s => s.key === reqSubmodule);

      for (const admin of admins) {
        await commentService.createDirectNotification({
          recipientId: admin.id,
          senderId: currentMember.id,
          senderName: currentMember.name,
          title: `Solicitud de Permisos: Finanzas - ${subInfo?.name || reqSubmodule}`,
          message: `${currentMember.name} ha solicitado nivel '${reqLevel}' para el submódulo "${subInfo?.name}".\n\nJustificación: "${reqJustification.trim()}"`,
          linkUrl: '/finanzas?tab=permissions'
        });
      }

      setRequestSuccessMsg('Solicitud enviada a los administradores del sistema.');
      setReqJustification('');
      setTimeout(() => {
        setRequestSuccessMsg(null);
        setIsRequestModalOpen(false);
      }, 3000);
    } catch (err) {
      console.error('Error al enviar solicitud de permisos:', err);
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior Explicativo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Shield size={13} />
              Gobernanza de Seguridad Contable Tryton ERP
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Landmark className="text-indigo-400" size={24} />
              Matriz de Permisos por Submódulo de Finanzas
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Configure los privilegios de acceso específicos a cada área financiera (Tesorería, Cuentas Bancarias, Movimientos con IVA, Presupuestos, Conciliación y Configuración Contable).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && totalPendingCount > 0 && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Guardando...' : `Guardar Cambios (${totalPendingCount})`}
              </motion.button>
            )}

            {!isAdmin && isLeader && (
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-sm font-semibold border border-indigo-400/30 transition-all flex items-center gap-2 shadow-sm"
              >
                <Send size={15} />
                Solicitar Ajuste de Permisos
              </button>
            )}
          </div>
        </div>

        {/* Mensaje de Éxito */}
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-medium flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            {saveSuccessMsg}
          </motion.div>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar miembro por nombre, correo o cargo..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="w-48 shrink-0">
            <select
              value={processFilter}
              onChange={e => setProcessFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos los Procesos</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Mostrando <span className="text-slate-900 dark:text-slate-200 font-bold">{filteredMembers.length}</span> colaboradores
        </div>
      </div>

      {/* Matriz de Permisos */}
      <div className="space-y-4">
        {filteredMembers.map(member => {
          const isUserAdmin = member.isSystemAdmin || member.systemRoleId === 'role-admin';
          const memberProcess = processes.find(p => p.id === member.processId);

          return (
            <div
              key={member.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all ${
                pendingChanges[member.id]
                  ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Cabecera del Miembro */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                        {member.name}
                      </h3>
                      {isUserAdmin && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                          Administrador del Sistema
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{member.role || 'Sin rol especificado'}</span>
                      {memberProcess && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {memberProcess.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isUserAdmin && (
                  <div className="text-xs text-slate-400 italic">
                    Acceso irrestricto por perfil de administrador global.
                  </div>
                )}
              </div>

              {/* Submódulos de Finanzas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                {FINANZAS_SUBMODULES.map(sub => {
                  const SubIcon = sub.icon;
                  const currentLevel = getMemberSubmoduleAccess(member, sub.key);
                  const isModified = Boolean(pendingChanges[member.id]?.[sub.key]);

                  return (
                    <div
                      key={sub.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isModified 
                          ? 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20' 
                          : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <div className={`p-1.5 rounded-lg border ${sub.color}`}>
                          <SubIcon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                            {sub.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1">
                            {sub.desc}
                          </p>
                        </div>
                      </div>

                      {/* Selector de Niveles de Acceso */}
                      <div className="grid grid-cols-5 gap-1">
                        {ACCESS_LEVELS.map(lvl => {
                          const isSelected = currentLevel === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              disabled={!isAdmin || isUserAdmin}
                              onClick={() => handleLevelSelect(member.id, sub.key, lvl.id)}
                              title={`${lvl.label}: ${lvl.desc}`}
                              className={`py-1 text-[11px] font-medium rounded-lg transition-all text-center ${
                                isSelected
                                  ? lvl.activeBg
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/60'
                              } ${(!isAdmin || isUserAdmin) ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                            >
                              {lvl.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <User className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron colaboradores</p>
            <p className="text-xs text-slate-400">Pruebe ajustando los términos de búsqueda o filtros.</p>
          </div>
        )}
      </div>

      {/* Modal de Solicitud de Permisos para Líderes */}
      <AnimatePresence>
        {isRequestModalOpen && (
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
                    <Send size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Solicitar Ajuste de Permisos</h3>
                    <p className="text-xs text-slate-500">Enviar petición formal a los administradores</p>
                  </div>
                </div>
                <button onClick={() => setIsRequestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendRequest} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Submódulo de Finanzas
                  </label>
                  <select
                    value={reqSubmodule}
                    onChange={e => setReqSubmodule(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {FINANZAS_SUBMODULES.map(s => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nivel de Acceso Requerido
                  </label>
                  <select
                    value={reqLevel}
                    onChange={e => setReqLevel(e.target.value as ModuleAccessLevel)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {ACCESS_LEVELS.filter(l => l.id !== 'ninguno').map(l => (
                      <option key={l.id} value={l.id}>{l.label} - {l.desc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Justificación / Motivo Operativo
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reqJustification}
                    onChange={e => setReqJustification(e.target.value)}
                    placeholder="Explique las razones operativas por las que requiere este nivel de acceso..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {requestSuccessMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {requestSuccessMsg}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingRequest || !reqJustification.trim()}
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={14} />
                    {isSendingRequest ? 'Enviando...' : 'Enviar Solicitud'}
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
