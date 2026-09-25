import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Send, 
  Save, 
  X, 
  Building2, 
  GraduationCap,
  Calendar,
  BarChart2,
  Users,
  MapPin,
  Laptop,
  CheckCircle2,
  Filter,
  User,
  Info,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, Role } from '../../types';
import { getModuleAccess, ModuleAccessLevel } from '../../lib/permissions';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../../lib/firebase';
import { commentService } from '../../services/commentService';

interface CapacitacionPermissionsMatrixProps {
  currentMember?: TeamMember | null;
  members?: TeamMember[];
  processes?: Process[];
  roles?: Role[];
}

const ACCESS_LEVELS: { id: ModuleAccessLevel; label: string; shortLabel: string; desc: string; activeBg: string }[] = [
  { id: 'ninguno', label: 'Ninguno', shortLabel: 'Ninguno', desc: 'Sin acceso a este submódulo', activeBg: 'bg-red-500 text-white shadow-sm' },
  { id: 'lector', label: 'Lector', shortLabel: 'Lector', desc: 'Solo consulta y visualización (sin permisos de edición)', activeBg: 'bg-amber-500 text-white shadow-sm' },
  { id: 'colaborador', label: 'Colaborador', shortLabel: 'Colab.', desc: 'Crear, editar y participar en las capacitaciones', activeBg: 'bg-blue-600 text-white shadow-sm' },
  { id: 'lider', label: 'Líder', shortLabel: 'Líder', desc: 'Gestión integral del área de capacitación', activeBg: 'bg-purple-600 text-white shadow-sm' },
  { id: 'administrador', label: 'Administrador', shortLabel: 'Admin.', desc: 'Control total y auditoría de capacitación', activeBg: 'bg-emerald-600 text-white shadow-sm' }
];

const CAPACITACION_SUBMODULES = [
  {
    key: 'capacitacion_calendar',
    name: 'Calendario de Capacitaciones',
    desc: 'Visualización de agenda, programación de cursos y fechas en calendario.',
    icon: Calendar,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
  },
  {
    key: 'capacitacion_management',
    name: 'Gestión de Capacitaciones',
    desc: 'Administración de planes formativos, clientes, campañas y seguimiento de participantes.',
    icon: BarChart2,
    color: 'text-blue-600 bg-blue-50 border-blue-100'
  },
  {
    key: 'capacitacion_trainers',
    name: 'Capacitadores & Instructores',
    desc: 'Registro de docentes, instructores externos e internos y perfiles profesionales.',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
  },
  {
    key: 'capacitacion_physical_spaces',
    name: 'Lugares Físicos / Sedes',
    desc: 'Gestión de aulas físicas, sedes operativas, capacidades y direcciones.',
    icon: MapPin,
    color: 'text-amber-600 bg-amber-50 border-amber-100'
  },
  {
    key: 'capacitacion_virtual_spaces',
    name: 'Aulas / Salas Virtuales',
    desc: 'Gestión de enlaces Zoom, Google Meet, Teams y plataformas virtuales.',
    icon: Laptop,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-100'
  }
];

export const CapacitacionPermissionsMatrix: React.FC<CapacitacionPermissionsMatrixProps> = ({
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

  // Borrador de cambios: memberId -> { [moduleKey]: ModuleAccessLevel }
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, ModuleAccessLevel>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Modal de solicitud para el líder
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqComponent, setReqComponent] = useState<string>('capacitacion');
  const [reqComponentName, setReqComponentName] = useState<string>('Módulo de Capacitación');
  const [reqLevel, setReqLevel] = useState<ModuleAccessLevel>('colaborador');
  const [reqJustification, setReqJustification] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);

  const isAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
  const userCapAccess = getModuleAccess(currentMember, roles, 'capacitacion');
  const isLeader = userCapAccess === 'lider' || userCapAccess === 'administrador';

  // Filtrado de miembros de la lista izquierda
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !search || 
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
        (m.role && m.role.toLowerCase().includes(search.toLowerCase()));

      const matchProcess = processFilter === 'all' || m.processId === processFilter;
      return matchSearch && matchProcess;
    });
  }, [members, search, processFilter]);

  // Miembro actualmente seleccionado
  const selectedMember = useMemo(() => {
    if (selectedMemberId) {
      const found = members.find(m => m.id === selectedMemberId);
      if (found) return found;
    }
    return filteredMembers[0] || members[0] || null;
  }, [members, filteredMembers, selectedMemberId]);

  // Manejar cambio de nivel para el miembro seleccionado
  const handleLevelChange = (memberId: string, modKey: string, level: ModuleAccessLevel) => {
    if (!isAdmin) return;
    setPendingChanges(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [modKey]: level
      }
    }));
  };

  // Obtener valor actual o pendiente
  const getMemberEffectiveLevel = (member: TeamMember, modKey: string): ModuleAccessLevel => {
    if (pendingChanges[member.id] && pendingChanges[member.id][modKey] !== undefined) {
      return pendingChanges[member.id][modKey];
    }
    return getModuleAccess(member, roles, modKey);
  };

  // Determinar si el integrante seleccionado tiene cambios pendientes
  const hasMemberUnsavedChanges = useMemo(() => {
    if (!selectedMember) return false;
    const memberPending = pendingChanges[selectedMember.id];
    return Boolean(memberPending && Object.keys(memberPending).length > 0);
  }, [pendingChanges, selectedMember]);

  // Guardar cambios en Firestore
  const handleSaveMember = async (member: TeamMember) => {
    const memberChanges = pendingChanges[member.id];
    if (!memberChanges || Object.keys(memberChanges).length === 0) return;

    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const currentAccess = { ...(member.moduleAccess || {}) };
      const updatedAccess = { ...currentAccess, ...memberChanges };

      const memberRef = doc(db, 'members', member.id);
      await updateDoc(memberRef, {
        moduleAccess: updatedAccess,
        updatedAt: new Date().toISOString()
      });

      member.moduleAccess = updatedAccess;

      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[member.id];
        return next;
      });

      setSaveSuccessMsg(`¡Permisos de capacitación de ${member.name} actualizados exitosamente!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'members');
      alert('Error al guardar los permisos. Verifica la consola.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enviar solicitud de cambio de permisos (Líder)
  const handleSendRequest = async () => {
    if (!selectedMember || !reqJustification.trim()) {
      alert('Por favor ingresa una justificación para la solicitud.');
      return;
    }

    setIsSendingRequest(true);
    try {
      const currentVal = getMemberEffectiveLevel(selectedMember, reqComponent);
      await commentService.requestPermissionChange({
        requesterId: currentMember?.id || 'unknown',
        requesterName: currentMember?.name || 'Líder',
        targetMemberId: selectedMember.id,
        targetMemberName: selectedMember.name,
        moduleId: reqComponent,
        moduleName: reqComponentName,
        currentLevel: currentVal,
        requestedLevel: reqLevel,
        justification: reqJustification.trim()
      });

      setIsRequestModalOpen(false);
      setReqJustification('');
      setRequestSuccessMsg(`Solicitud enviada a los administradores para ${selectedMember.name}.`);
      setTimeout(() => setRequestSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error al enviar solicitud de permisos:', err);
      alert('Error al enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const openRequestModal = (componentKey: string, componentName: string, defaultLevel: ModuleAccessLevel) => {
    setReqComponent(componentKey);
    setReqComponentName(componentName);
    setReqLevel(defaultLevel);
    setReqJustification('');
    setIsRequestModalOpen(true);
  };

  const getMemberProcessName = (procId?: string) => {
    if (!procId) return 'Sin proceso';
    const found = processes.find(p => p.id === procId);
    return found ? found.name : procId;
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior Fija (Sticky) con Combobox Unificado en Una Sola Fila */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Izquierda: Combobox Unificado + Filtro de Proceso */}
          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1" ref={comboboxRef}>
              <div 
                onClick={() => setIsComboboxOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 bg-gray-50 border rounded-xl transition-all cursor-pointer ${
                  isComboboxOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder={selectedMember ? `${selectedMember.name} — ${selectedMember.role || getMemberProcessName(selectedMember.processId)}` : "Buscar o seleccionar colaborador..."}
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setIsComboboxOpen(true);
                  }}
                  onFocus={() => setIsComboboxOpen(true)}
                  className="w-full bg-transparent text-xs font-bold text-gray-900 placeholder:text-gray-700 placeholder:font-bold focus:outline-hidden"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch('');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isComboboxOpen ? 'rotate-180' : ''}`} />
                )}
              </div>

              {/* Menú Desplegable Flotante */}
              {isComboboxOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-gray-50 p-1.5">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      No se encontraron colaboradores coincidentes.
                    </div>
                  ) : (
                    filteredMembers.map(m => {
                      const isSelected = selectedMember?.id === m.id;
                      const hasPending = Boolean(pendingChanges[m.id] && Object.keys(pendingChanges[m.id]).length > 0);
                      const currentLevel = getMemberEffectiveLevel(m, 'capacitacion');

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberId(m.id);
                            setIsComboboxOpen(false);
                            setSearch('');
                          }}
                          className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50/80 text-indigo-950 font-bold' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                m.name.substring(0, 2)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-gray-900 truncate">{m.name}</p>
                                {hasPending && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Cambios pendientes" />
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate">
                                {getMemberProcessName(m.processId)} • {m.role || 'Miembro'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {currentLevel}
                            </span>
                            {isSelected && <Check size={14} className="text-indigo-600" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Filtro por proceso (compacto) */}
            {processes.length > 0 && (
              <div className="relative w-40 shrink-0">
                <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={processFilter}
                  onChange={e => setProcessFilter(e.target.value)}
                  className="w-full pl-8 pr-6 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden appearance-none cursor-pointer"
                >
                  <option value="all">Todos los procesos</option>
                  {processes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Derecha: Ficha Rápida del Colaborador Seleccionado + Botón Guardar / Solicitar */}
          {selectedMember && (
            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 shadow-xs">
                  {selectedMember.avatar ? (
                    <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    selectedMember.name.substring(0, 2)
                  )}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-xs font-black text-gray-900 truncate leading-tight">{selectedMember.name}</p>
                  <p className="text-[10px] text-gray-500 truncate leading-tight">{selectedMember.role || getMemberProcessName(selectedMember.processId)}</p>
                </div>
              </div>

              <div>
                {isAdmin ? (
                  <button
                    onClick={() => handleSaveMember(selectedMember)}
                    disabled={!hasMemberUnsavedChanges || isSaving}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      hasMemberUnsavedChanges
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 cursor-pointer animate-pulse'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Save size={13} />
                    <span>{isSaving ? 'Guardando...' : hasMemberUnsavedChanges ? 'Guardar' : 'Sin cambios'}</span>
                  </button>
                ) : isLeader ? (
                  <button
                    onClick={() => openRequestModal('capacitacion', 'Módulo de Capacitación', 'colaborador')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Solicitar</span>
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal de Permisos a Ancho Completo */}
      {selectedMember ? (
        <div className="space-y-6">
          {/* SECCIÓN 1: Acceso General a Capacitación */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">Nivel General del Módulo de Capacitación</h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Nivel base por defecto para todo el módulo si no se define un submódulo específico.
                  </p>
                </div>
              </div>
              {isLeader && !isAdmin && (
                <button
                  onClick={() => openRequestModal('capacitacion', 'Módulo General de Capacitación', getMemberEffectiveLevel(selectedMember, 'capacitacion'))}
                  className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
                >
                  <Send size={12} /> Solicitar
                </button>
              )}
            </div>

            {/* Selector de 5 píldoras */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              {ACCESS_LEVELS.map(level => {
                const effCap = getMemberEffectiveLevel(selectedMember, 'capacitacion');
                const isCurrent = effCap === level.id;
                return (
                  <button
                    key={level.id}
                    disabled={!isAdmin}
                    onClick={() => handleLevelChange(selectedMember.id, 'capacitacion', level.id)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isCurrent
                        ? `${level.activeBg} border-transparent ring-2 ring-offset-2 ring-indigo-500`
                        : 'bg-gray-50/70 border-gray-200 text-gray-700 hover:bg-gray-100'
                    } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <p className="text-xs font-bold">{level.shortLabel}</p>
                    <p className={`text-[10px] mt-0.5 line-clamp-1 ${isCurrent ? 'text-white/90' : 'text-gray-400'}`}>
                      {level.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 2: Permisos Granulares por Submódulo */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-indigo-600" />
              <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Permisos Granulares por Submódulo
                </h4>
                <p className="text-xs text-gray-500 font-medium">
                  Controla individualmente quién puede ver el calendario (Lector), editar capacitaciones (Colaborador/Líder) o gestionar lugares y salas.
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
              {CAPACITACION_SUBMODULES.map(sub => {
                const IconComp = sub.icon;
                const effLevel = getMemberEffectiveLevel(selectedMember, sub.key);

                return (
                  <div key={sub.key} className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="min-w-0 md:w-5/12 flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${sub.color}`}>
                        <IconComp size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{sub.name}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-2">{sub.desc}</p>
                      </div>
                    </div>

                    <div className="flex-1 max-w-lg">
                      <div className="grid grid-cols-5 gap-1.5">
                        {ACCESS_LEVELS.map(level => {
                          const isCurrent = effLevel === level.id;
                          return (
                            <button
                              key={level.id}
                              disabled={!isAdmin}
                              onClick={() => handleLevelChange(selectedMember.id, sub.key, level.id)}
                              className={`py-2 px-1 rounded-xl border text-center transition-all ${
                                isCurrent
                                  ? `${level.activeBg} border-transparent font-bold ring-2 ring-offset-1 ring-indigo-500`
                                  : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                              } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                              title={level.desc}
                            >
                              <span className="text-[10px]">{level.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isLeader && !isAdmin && (
                      <button
                        onClick={() => openRequestModal(sub.key, sub.name, effLevel)}
                        className="text-[11px] text-purple-600 hover:text-purple-700 font-bold self-end md:self-auto shrink-0 flex items-center gap-1"
                      >
                        <Send size={11} /> Solicitar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-gray-400 bg-white rounded-3xl border border-gray-100 shadow-sm">
          No se encontraron integrantes que coincidan con la búsqueda.
        </div>
      )}

      {/* Modal de Solicitud de Ajuste de Permisos (para Líderes) */}
      <AnimatePresence>
        {isRequestModalOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Send size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Solicitar Cambio de Permiso</h3>
                    <p className="text-[11px] text-gray-400">{reqComponentName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Colaborador Objetivo:</p>
                  <p className="text-xs font-bold text-gray-900">{selectedMember.name} ({selectedMember.email})</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Nivel de Acceso Solicitado
                  </label>
                  <select
                    value={reqLevel}
                    onChange={e => setReqLevel(e.target.value as ModuleAccessLevel)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  >
                    {ACCESS_LEVELS.map(l => (
                      <option key={l.id} value={l.id}>{l.label} - {l.desc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Justificación del Requerimiento
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explica detalladamente por qué este colaborador requiere dicho nivel de acceso..."
                    value={reqJustification}
                    onChange={e => setReqJustification(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={isSendingRequest || !reqJustification.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <Send size={13} />
                  {isSendingRequest ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
