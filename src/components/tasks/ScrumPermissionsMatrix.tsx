import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  Search, 
  Send, 
  KeyRound, 
  Save, 
  X, 
  Building2, 
  CheckSquare,
  FolderKanban,
  Calendar,
  Download,
  UploadCloud,
  Sparkles,
  ChevronDown,
  Filter,
  Check,
  User,
  Kanban,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, Role } from '../../types';
import { getModuleAccess, ModuleAccessLevel } from '../../lib/permissions';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../../lib/firebase';
import { commentService } from '../../services/commentService';

interface ScrumPermissionsMatrixProps {
  currentMember?: TeamMember | null;
  members?: TeamMember[];
  processes?: Process[];
  roles?: Role[];
}

const ACCESS_LEVELS: { id: ModuleAccessLevel; label: string; shortLabel: string; desc: string; activeBg: string }[] = [
  { id: 'ninguno', label: 'Ninguno', shortLabel: 'Ninguno', desc: 'Sin acceso a este elemento', activeBg: 'bg-red-500 text-white shadow-sm' },
  { id: 'lector', label: 'Lector', shortLabel: 'Lector', desc: 'Solo consulta y lectura', activeBg: 'bg-amber-500 text-white shadow-sm' },
  { id: 'colaborador', label: 'Colaborador', shortLabel: 'Colab.', desc: 'Creación y movimiento operativo de historias', activeBg: 'bg-blue-600 text-white shadow-sm' },
  { id: 'lider', label: 'Líder', shortLabel: 'Líder', desc: 'Gestión y asignación de historias del área', activeBg: 'bg-purple-600 text-white shadow-sm' },
  { id: 'administrador', label: 'Administrador', shortLabel: 'Admin.', desc: 'Control y configuración total', activeBg: 'bg-emerald-600 text-white shadow-sm' }
];

const SCRUM_SUBMODULES: { id: string; name: string; desc: string; icon: React.ReactNode; color: string; bg: string }[] = [
  {
    id: 'tasks',
    name: 'Tablero de Historias Ágiles',
    desc: 'Flujo Kanban/Scrum, estados (Backlog, To Do, In Progress, Review, Done).',
    icon: <CheckSquare size={18} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200'
  },
  {
    id: 'projects',
    name: 'Gestión de Proyectos',
    desc: 'Portafolio de iniciativas, hitos estratégicos y vinculación con historias.',
    icon: <FolderKanban size={18} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200'
  },
  {
    id: 'planner',
    name: 'Planificador Inteligente IA',
    desc: 'Estructuración y sugerencias de sprints con modelos de Gemini.',
    icon: <Calendar size={18} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200'
  },
  {
    id: 'tasks_export',
    name: 'Exportación de Tareas & Historias',
    desc: 'Permiso para descargar y exportar backups del backlog en JSON / Excel.',
    icon: <Download size={18} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200'
  },
  {
    id: 'tasks_import',
    name: 'Importación Masiva de Historias',
    desc: 'Permiso para cargar y restaurar tareas e historias desde archivos externos.',
    icon: <UploadCloud size={18} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200'
  }
];

export const ScrumPermissionsMatrix: React.FC<ScrumPermissionsMatrixProps> = ({
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
  const [reqComponent, setReqComponent] = useState<string>('tasks');
  const [reqComponentName, setReqComponentName] = useState<string>('Tablero de Historias');
  const [reqLevel, setReqLevel] = useState<ModuleAccessLevel>('colaborador');
  const [reqJustification, setReqJustification] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);

  const isAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
  const userTasksAccess = getModuleAccess(currentMember, roles, 'tasks');
  const isLeader = userTasksAccess === 'lider' || userTasksAccess === 'administrador';

  // Filtrado de miembros
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

      setSaveSuccessMsg(`¡Permisos de Scrum de ${member.name} actualizados exitosamente!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'members');
      alert('Error al guardar los permisos de Scrum. Verifica la consola.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enviar solicitud de cambio de permisos (Modo Líder)
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember || !selectedMember || !reqJustification.trim()) return;

    setIsSendingRequest(true);
    try {
      await commentService.requestPermissionChange({
        requesterId: currentMember.id,
        requesterName: currentMember.name,
        targetMemberId: selectedMember.id,
        targetMemberName: selectedMember.name,
        moduleId: reqComponent,
        moduleName: `Scrum: ${reqComponentName}`,
        requestedLevel: reqLevel,
        justification: reqJustification.trim()
      });

      setRequestSuccessMsg(`Solicitud formal enviada al Administrador para ${selectedMember.name}.`);
      setIsRequestModalOpen(false);
      setReqJustification('');
      setTimeout(() => setRequestSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error al enviar solicitud de permisos Scrum:', err);
      alert('No se pudo enviar la solicitud. Intenta nuevamente.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const openRequestModal = (compKey: string, compName: string, defaultLvl: ModuleAccessLevel = 'colaborador') => {
    if (!selectedMember) return;
    setReqComponent(compKey);
    setReqComponentName(compName);
    setReqLevel(defaultLvl);
    setReqJustification('');
    setIsRequestModalOpen(true);
  };

  const getMemberProcessName = (procId?: string) => {
    if (!procId) return 'Sin proceso';
    const found = processes.find(p => p.id === procId);
    return found ? found.name : procId;
  };

  const selectedMemberEffectiveAccess = selectedMember 
    ? getMemberEffectiveLevel(selectedMember, 'tasks') 
    : 'ninguno';

  return (
    <div className="space-y-6">
      {/* Barra Superior Fija (Sticky) con Combobox Unificado y Acciones */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Izquierda: Combobox Unificado + Filtro de Proceso */}
          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1" ref={comboboxRef}>
              <div 
                onClick={() => setIsComboboxOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 bg-gray-50 border rounded-xl transition-all cursor-pointer ${
                  isComboboxOpen ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white' : 'border-gray-200 hover:border-gray-300'
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
                      const currentLevel = getMemberEffectiveLevel(m, 'tasks');

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
                            isSelected ? 'bg-blue-50/80 text-blue-950 font-bold' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
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
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Filtro de Procesos */}
            <select
              value={processFilter}
              onChange={(e) => setProcessFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-hidden hover:border-gray-300 transition-colors shrink-0"
            >
              <option value="all">🏢 Todos los procesos</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Derecha: Ficha Rápida del Miembro + Botones de Acción */}
          {selectedMember && (
            <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-900 truncate">{selectedMember.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                      {selectedMemberEffectiveAccess}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{selectedMember.role || 'Sin cargo'}</p>
                </div>
              </div>

              {/* Botón Guardar / Solicitar */}
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin ? (
                  <button
                    onClick={() => handleSaveMember(selectedMember)}
                    disabled={!hasMemberUnsavedChanges || isSaving}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      hasMemberUnsavedChanges
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'Guardando...' : hasMemberUnsavedChanges ? 'Guardar Permisos' : 'Al Día'}</span>
                  </button>
                ) : isLeader ? (
                  <button
                    onClick={() => openRequestModal('tasks', 'Scrum / General')}
                    className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Solicitar Acceso</span>
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes de Notificación Flotantes */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-xs"
          >
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </motion.div>
        )}
        {requestSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-xs"
          >
            <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
            <span>{requestSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUERPO PRINCIPAL: Tabular Horizontal a Ancho Completo */}
      {selectedMember ? (
        <div className="space-y-6">
          {/* SECCIÓN 1: Submódulos Principales de Scrum */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Kanban size={15} className="text-blue-600" />
                Submódulos Principales de Scrum ({SCRUM_SUBMODULES.length})
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Privilegios para el Tablero de Historias Kanban, Proyectos y Planificador Inteligente IA
              </p>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
              {SCRUM_SUBMODULES.map(submod => {
                const currentVal = getMemberEffectiveLevel(selectedMember, submod.id);

                return (
                  <div
                    key={submod.id}
                    className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Lado Izquierdo: Icono + Título + Descripción */}
                    <div className="flex items-center gap-3 min-w-0 md:max-w-md">
                      <div className={`p-2 rounded-xl border shrink-0 ${submod.bg} ${submod.color}`}>
                        {submod.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 truncate">{submod.name}</span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                            {currentVal}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">
                          {submod.desc}
                        </p>
                      </div>
                    </div>

                    {/* Lado Derecho: 5 Botones de Nivel en Línea Horizontal + Botón Solicitar */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="grid grid-cols-5 gap-1 bg-gray-100/70 p-1 rounded-xl">
                        {ACCESS_LEVELS.map(lvl => {
                          const isActive = currentVal === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              disabled={!isAdmin}
                              onClick={() => handleLevelChange(selectedMember.id, submod.id, lvl.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                                isActive
                                  ? `${lvl.activeBg} font-black`
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                              } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                              title={lvl.desc}
                            >
                              {lvl.shortLabel}
                            </button>
                          );
                        })}
                      </div>

                      {isLeader && !isAdmin && (
                        <button
                          onClick={() => openRequestModal(submod.id, submod.name, currentVal)}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1 transition-colors shrink-0"
                          title="Solicitar cambio al administrador"
                        >
                          <Send size={11} />
                          <span>Solicitar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 2: Permisos de Scrum por Proceso Departamental */}
          {processes.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Building2 size={15} className="text-blue-600" />
                  Permisos de Historias Scrum por Proceso ({processes.length})
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Controla la visualización, creación y edición de historias específicas pertenecientes a cada departamento
                </p>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
                {processes.map(proc => {
                  const procKey = `tasks_${proc.id}`;
                  const currentVal = getMemberEffectiveLevel(selectedMember, procKey);

                  return (
                    <div
                      key={proc.id}
                      className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Lado Izquierdo: Proceso */}
                      <div className="flex items-center gap-3 min-w-0 md:max-w-md">
                        <div className="p-2 rounded-xl border bg-blue-50 border-blue-200 text-blue-600 shrink-0">
                          <Building2 size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900 truncate">{proc.name}</span>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {currentVal}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">
                            {proc.description || `Historias y actividades asignadas al proceso ${proc.name}`}
                          </p>
                        </div>
                      </div>

                      {/* Lado Derecho: 5 Niveles */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="grid grid-cols-5 gap-1 bg-gray-100/70 p-1 rounded-xl">
                          {ACCESS_LEVELS.map(lvl => {
                            const isActive = currentVal === lvl.id;
                            return (
                              <button
                                key={lvl.id}
                                disabled={!isAdmin}
                                onClick={() => handleLevelChange(selectedMember.id, procKey, lvl.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                                  isActive
                                    ? `${lvl.activeBg} font-black`
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                title={lvl.desc}
                              >
                                {lvl.shortLabel}
                              </button>
                            );
                          })}
                        </div>

                        {isLeader && !isAdmin && (
                          <button
                            onClick={() => openRequestModal(procKey, `Historias de ${proc.name}`, currentVal)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1 transition-colors shrink-0"
                            title="Solicitar cambio para este proceso"
                          >
                            <Send size={11} />
                            <span>Solicitar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: Permisos de Proyectos por Proceso (Gestión de Proyectos) */}
          {processes.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <FolderKanban size={15} className="text-blue-600" />
                  Permisos de Proyectos por Proceso ({processes.length})
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Controla la visualización, creación y gestión de proyectos e iniciativas asignadas a cada departamento
                </p>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
                {processes.map(proc => {
                  const procKey = `projects_${proc.id}`;
                  const currentVal = getMemberEffectiveLevel(selectedMember, procKey);

                  return (
                    <div
                      key={`scrum_matrix_proj_${proc.id}`}
                      className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Lado Izquierdo: Proceso */}
                      <div className="flex items-center gap-3 min-w-0 md:max-w-md">
                        <div className="p-2 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-600 shrink-0">
                          <FolderKanban size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900 truncate">{proc.name}</span>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {currentVal}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">
                            Proyectos e iniciativas del departamento de {proc.name}
                          </p>
                        </div>
                      </div>

                      {/* Lado Derecho: 5 Niveles */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="grid grid-cols-5 gap-1 bg-gray-100/70 p-1 rounded-xl">
                          {ACCESS_LEVELS.map(lvl => {
                            const isActive = currentVal === lvl.id;
                            return (
                              <button
                                key={lvl.id}
                                disabled={!isAdmin}
                                onClick={() => handleLevelChange(selectedMember.id, procKey, lvl.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                                  isActive
                                    ? `${lvl.activeBg} font-black`
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                title={lvl.desc}
                              >
                                {lvl.shortLabel}
                              </button>
                            );
                          })}
                        </div>

                        {isLeader && !isAdmin && (
                          <button
                            onClick={() => openRequestModal(procKey, `Proyectos de ${proc.name}`, currentVal)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1 transition-colors shrink-0"
                            title="Solicitar cambio para este proceso"
                          >
                            <Send size={11} />
                            <span>Solicitar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center text-xs text-gray-400">
          Selecciona un integrante en el buscador superior para ver y configurar sus permisos.
        </div>
      )}

      {/* Modal de Solicitud Formal para Líder */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-purple-700 font-black text-sm">
                  <Send size={16} />
                  <span>Solicitar Ajuste de Permisos Scrum</span>
                </div>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-xs text-purple-900 space-y-1">
                <p>
                  <strong>Integrante:</strong> {selectedMember?.name}
                </p>
                <p>
                  <strong>Submódulo / Proceso:</strong> {reqComponentName}
                </p>
              </div>

              <form onSubmit={handleSendRequest} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Nivel de Acceso Solicitado
                  </label>
                  <select
                    value={reqLevel}
                    onChange={(e) => setReqLevel(e.target.value as ModuleAccessLevel)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {ACCESS_LEVELS.map(lvl => (
                      <option key={lvl.id} value={lvl.id}>{lvl.label} - {lvl.desc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Justificación del requerimiento
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explica por qué este integrante necesita este nivel de acceso en Scrum..."
                    value={reqJustification}
                    onChange={(e) => setReqJustification(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingRequest || !reqJustification.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send size={13} />
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
