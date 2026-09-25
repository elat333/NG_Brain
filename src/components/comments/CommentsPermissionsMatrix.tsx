import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Search, 
  Send, 
  KeyRound, 
  Save, 
  X, 
  Building2, 
  MessageSquare,
  FileText,
  Link as LinkIcon,
  CheckCircle2,
  Filter,
  Check,
  User,
  Info,
  Bookmark,
  Eye,
  EyeOff,
  GraduationCap,
  Award,
  ShieldAlert,
  Megaphone,
  DollarSign,
  Globe,
  Boxes,
  Layers,
  LayoutGrid,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, Role } from '../../types';
import { getModuleAccess, ModuleAccessLevel } from '../../lib/permissions';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../../lib/firebase';
import { commentService } from '../../services/commentService';

interface CommentsPermissionsMatrixProps {
  currentMember?: TeamMember | null;
  members?: TeamMember[];
  processes?: Process[];
  roles?: Role[];
}

const ACCESS_LEVELS: { id: ModuleAccessLevel; label: string; shortLabel: string; desc: string; activeBg: string }[] = [
  { id: 'ninguno', label: 'Ninguno', shortLabel: 'Ninguno', desc: 'Sin acceso a comentarios de este tipo o proceso', activeBg: 'bg-red-500 text-white shadow-sm' },
  { id: 'lector', label: 'Lector', shortLabel: 'Lector', desc: 'Solo lectura de comentarios donde sea responsable, auxiliar, revisor o esté compartido', activeBg: 'bg-amber-500 text-white shadow-sm' },
  { id: 'colaborador', label: 'Colaborador', shortLabel: 'Colab.', desc: 'Leer y comentar en tareas, notas o enlaces donde sea responsable, auxiliar, revisor o esté compartido', activeBg: 'bg-blue-600 text-white shadow-sm' },
  { id: 'lider', label: 'Líder', shortLabel: 'Líder', desc: 'Moderar, resolver comentarios y menciones de su área', activeBg: 'bg-purple-600 text-white shadow-sm' },
  { id: 'administrador', label: 'Administrador', shortLabel: 'Admin.', desc: 'Control total de comentarios y auditoría', activeBg: 'bg-emerald-600 text-white shadow-sm' }
];

const SYSTEM_MODULES_FOR_VISIBILITY: { id: string; name: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'gerencia', name: 'Gerencia General', icon: Building2 },
  { id: 'acreditacion', name: 'Acreditación', icon: Award },
  { id: 'capacitacion', name: 'Capacitación', icon: GraduationCap },
  { id: 'qhse', name: 'QHSE', icon: ShieldAlert },
  { id: 'marketing', name: 'Marketing', icon: Megaphone },
  { id: 'ventas', name: 'Ventas', icon: DollarSign },
  { id: 'importaciones', name: 'Importaciones', icon: Globe },
  { id: 'productos', name: 'Productos', icon: Boxes },
  { id: 'inventario', name: 'Inventario', icon: Layers },
];

export const CommentsPermissionsMatrix: React.FC<CommentsPermissionsMatrixProps> = ({
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

  const [matrixTab, setMatrixTab] = useState<'comments' | 'notes' | 'links'>('comments');

  // Borrador de cambios: memberId -> { [moduleKey]: ModuleAccessLevel }
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, ModuleAccessLevel>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Modal de solicitud para el líder
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqComponent, setReqComponent] = useState<string>('comments');
  const [reqComponentName, setReqComponentName] = useState<string>('Módulo de Comentarios');
  const [reqLevel, setReqLevel] = useState<ModuleAccessLevel>('colaborador');
  const [reqJustification, setReqJustification] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);

  const isAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
  const userCommentsAccess = getModuleAccess(currentMember, roles, 'comments');
  const isLeader = userCommentsAccess === 'lider' || userCommentsAccess === 'administrador';

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

  // Determinar visibilidad de un submenú en un módulo específico
  const isSubnavItemVisible = (member: TeamMember, type: 'notes' | 'links', modKey: string): boolean => {
    const fullKey = `vis_${type}_${modKey}`;
    if (pendingChanges[member.id] && pendingChanges[member.id][fullKey] !== undefined) {
      return pendingChanges[member.id][fullKey] !== 'ninguno';
    }
    const val = member.moduleAccess ? member.moduleAccess[fullKey] : undefined;
    if (val === 'ninguno' || (val as any) === 'hidden' || (val as any) === false || (val as any) === 'false') {
      return false;
    }
    return true;
  };

  // Alternar visibilidad de submenú para el usuario seleccionado
  const handleToggleSubnavVisibility = (memberId: string, type: 'notes' | 'links', modKey: string) => {
    if (!isAdmin) return;
    const currentVisible = selectedMember ? isSubnavItemVisible(selectedMember, type, modKey) : true;
    const newLevel: ModuleAccessLevel = currentVisible ? 'ninguno' : 'colaborador';
    handleLevelChange(memberId, `vis_${type}_${modKey}`, newLevel);
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

      setSaveSuccessMsg(`¡Permisos de comentarios de ${member.name} actualizados exitosamente!`);
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

  const selectedMemberEffectiveAccess = selectedMember 
    ? getMemberEffectiveLevel(selectedMember, 'comments') 
    : 'ninguno';

  return (
    <div className="space-y-6">
      {/* Barra Superior Fija (Sticky) con Combobox Unificado y Selector de Pestañas */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200 shadow-md space-y-3">
        {/* Fila 1: Combobox Unificado + Filtro + Ficha Miembro + Botón Guardar */}
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
                      const currentLevel = getMemberEffectiveLevel(m, 'comments');

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
                  {processes.map(proc => (
                    <option key={proc.id} value={proc.id}>{proc.name}</option>
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
                    onClick={() => openRequestModal('comments', 'Módulo de Comentarios', 'colaborador')}
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

        {/* Fila 2: Selector de Sub-Matriz con Colores Distintivos (Sticky e Inmóvil) */}
        <div className="flex items-center gap-2 p-1 bg-gray-100/80 rounded-xl border border-gray-200/60">
          <button
            onClick={() => setMatrixTab('comments')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              matrixTab === 'comments'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/25'
                : 'bg-white/60 text-indigo-900 hover:bg-indigo-50 border-transparent'
            }`}
          >
            <MessageSquare size={14} className={matrixTab === 'comments' ? 'text-white' : 'text-indigo-600'} />
            <span>Permisos de Comentarios</span>
          </button>
          
          <button
            onClick={() => setMatrixTab('notes')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              matrixTab === 'notes'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/25'
                : 'bg-white/60 text-amber-900 hover:bg-amber-50 border-transparent'
            }`}
          >
            <FileText size={14} className={matrixTab === 'notes' ? 'text-white' : 'text-amber-600'} />
            <span>Permisos de Notas</span>
          </button>
          
          <button
            onClick={() => setMatrixTab('links')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              matrixTab === 'links'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25'
                : 'bg-white/60 text-blue-900 hover:bg-blue-50 border-transparent'
            }`}
          >
            <Bookmark size={14} className={matrixTab === 'links' ? 'text-white' : 'text-blue-600'} />
            <span>Permisos de Enlaces</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal de Permisos a Ancho Completo */}
      {selectedMember ? (
        <div className="space-y-6">
          {/* VISTA 1: PERMISOS DE COMENTARIOS */}
          {matrixTab === 'comments' && (
            <div className="space-y-6">
              {/* SECCIÓN 1: Acceso Global al Módulo de Comentarios */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900">Acceso General a Comentarios</h4>
                      <p className="text-xs text-gray-500 font-medium">
                        Determina si el integrante puede acceder a la bandeja global de comentarios.
                      </p>
                    </div>
                  </div>
                  {isLeader && !isAdmin && (
                    <button
                      onClick={() => openRequestModal('comments', 'Módulo General de Comentarios', selectedMemberEffectiveAccess)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
                    >
                      <Send size={12} />
                      Solicitar
                    </button>
                  )}
                </div>

                {/* Selector de 5 píldoras */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  {ACCESS_LEVELS.map(level => {
                    const isCurrent = selectedMemberEffectiveAccess === level.id;
                    return (
                      <button
                        key={level.id}
                        disabled={!isAdmin}
                        onClick={() => handleLevelChange(selectedMember.id, 'comments', level.id)}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
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

              {/* SECCIÓN 2: Permisos por Tipo de Contenido (Formato Horizontal Tabular) */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-indigo-600" />
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Permisos por Tipo de Contenido
                  </h4>
                </div>
                <p className="text-xs text-gray-500 font-medium -mt-2">
                  Configura si este integrante puede ver y participar en comentarios según el tipo de registro donde se originan.
                </p>

                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                  {/* Tipo: Historias / Scrum */}
                  {(() => {
                    const effLevel = getMemberEffectiveLevel(selectedMember, 'comments_tasks');
                    return (
                      <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="min-w-0 md:w-1/3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <CheckCircle2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">Comentarios en Historias (Scrum)</p>
                            <p className="text-[10px] text-gray-400 truncate">Tarjetas de actividades y tareas Scrum</p>
                          </div>
                        </div>

                        <div className="flex-1 max-w-md">
                          <div className="grid grid-cols-5 gap-1.5">
                            {ACCESS_LEVELS.map(level => {
                              const isCurrent = effLevel === level.id;
                              return (
                                <button
                                  key={level.id}
                                  disabled={!isAdmin}
                                  onClick={() => handleLevelChange(selectedMember.id, 'comments_tasks', level.id)}
                                  className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                                    isCurrent
                                      ? `${level.activeBg} border-transparent font-bold`
                                      : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                  } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  <span className="text-[10px]">{level.shortLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {isLeader && !isAdmin && (
                          <button
                            onClick={() => openRequestModal('comments_tasks', 'Comentarios en Historias', effLevel)}
                            className="text-[11px] text-purple-600 hover:text-purple-700 font-bold self-end md:self-auto shrink-0 flex items-center gap-1"
                          >
                            <Send size={11} /> Solicitar
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tipo: Notas / Minutas */}
                  {(() => {
                    const effLevel = getMemberEffectiveLevel(selectedMember, 'comments_notes');
                    return (
                      <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="min-w-0 md:w-1/3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">Comentarios en Notas & Minutas</p>
                            <p className="text-[10px] text-gray-400 truncate">Minutas de reuniones y notas departamentales</p>
                          </div>
                        </div>

                        <div className="flex-1 max-w-md">
                          <div className="grid grid-cols-5 gap-1.5">
                            {ACCESS_LEVELS.map(level => {
                              const isCurrent = effLevel === level.id;
                              return (
                                <button
                                  key={level.id}
                                  disabled={!isAdmin}
                                  onClick={() => handleLevelChange(selectedMember.id, 'comments_notes', level.id)}
                                  className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                                    isCurrent
                                      ? `${level.activeBg} border-transparent font-bold`
                                      : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                  } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  <span className="text-[10px]">{level.shortLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {isLeader && !isAdmin && (
                          <button
                            onClick={() => openRequestModal('comments_notes', 'Comentarios en Notas', effLevel)}
                            className="text-[11px] text-purple-600 hover:text-purple-700 font-bold self-end md:self-auto shrink-0 flex items-center gap-1"
                          >
                            <Send size={11} /> Solicitar
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tipo: Enlaces de Interés */}
                  {(() => {
                    const effLevel = getMemberEffectiveLevel(selectedMember, 'comments_links');
                    return (
                      <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="min-w-0 md:w-1/3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <LinkIcon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">Comentarios en Enlaces de Interés</p>
                            <p className="text-[10px] text-gray-400 truncate">Recursos y enlaces corporativos</p>
                          </div>
                        </div>

                        <div className="flex-1 max-w-md">
                          <div className="grid grid-cols-5 gap-1.5">
                            {ACCESS_LEVELS.map(level => {
                              const isCurrent = effLevel === level.id;
                              return (
                                <button
                                  key={level.id}
                                  disabled={!isAdmin}
                                  onClick={() => handleLevelChange(selectedMember.id, 'comments_links', level.id)}
                                  className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                                    isCurrent
                                      ? `${level.activeBg} border-transparent font-bold`
                                      : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                  } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  <span className="text-[10px]">{level.shortLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {isLeader && !isAdmin && (
                          <button
                            onClick={() => openRequestModal('comments_links', 'Comentarios en Enlaces', effLevel)}
                            className="text-[11px] text-purple-600 hover:text-purple-700 font-bold self-end md:self-auto shrink-0 flex items-center gap-1"
                          >
                            <Send size={11} /> Solicitar
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

                    {/* SECCIÓN 3: Permisos por Proceso Departamental */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600" />
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                          Permisos de Comentarios por Proceso
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 font-medium -mt-2">
                        Define qué procesos departamentales puede consultar o en cuáles puede comentar el integrante.
                      </p>

                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                        {processes.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-xs">
                            No hay procesos registrados en el sistema.
                          </div>
                        ) : (
                          processes.map(proc => {
                            const modKey = `comments_${proc.id}`;
                            const effLevel = getMemberEffectiveLevel(selectedMember, modKey);

                            return (
                              <div key={proc.id} className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                                <div className="min-w-0 md:w-1/3">
                                  <p className="text-xs font-bold text-gray-900 truncate">{proc.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{proc.description || 'Área operativa'}</p>
                                </div>

                                <div className="flex-1 max-w-md">
                                  <div className="grid grid-cols-5 gap-1.5">
                                    {ACCESS_LEVELS.map(level => {
                                      const isCurrent = effLevel === level.id;
                                      return (
                                        <button
                                          key={level.id}
                                          disabled={!isAdmin}
                                          onClick={() => handleLevelChange(selectedMember.id, modKey, level.id)}
                                          className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                                            isCurrent
                                              ? `${level.activeBg} border-transparent font-bold`
                                              : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                          } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                          <span className="text-[10px]">{level.shortLabel}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {isLeader && !isAdmin && (
                                  <button
                                    onClick={() => openRequestModal(modKey, `Comentarios: ${proc.name}`, effLevel)}
                                    className="text-[11px] text-purple-600 hover:text-purple-700 font-bold self-end md:self-auto shrink-0 flex items-center gap-1"
                                  >
                                    <Send size={11} /> Solicitar
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* VISTA 2: PERMISOS DE NOTAS */}
                {matrixTab === 'notes' && (
                  <div className="space-y-6">
                    {/* SECCIÓN NOTAS: Acceso Global a Notas */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-gray-900">Acceso General a Notas & Bitácora</h4>
                            <p className="text-xs text-gray-500 font-medium">
                              Determina el nivel de acceso del colaborador a las notas del sistema.
                            </p>
                          </div>
                        </div>
                        {isLeader && !isAdmin && (
                          <button
                            onClick={() => openRequestModal('notes', 'Módulo General de Notas', getMemberEffectiveLevel(selectedMember, 'notes'))}
                            className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
                          >
                            <Send size={12} /> Solicitar
                          </button>
                        )}
                      </div>

                      {/* Selector de 5 píldoras */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                        {ACCESS_LEVELS.map(level => {
                          const effNotes = getMemberEffectiveLevel(selectedMember, 'notes');
                          const isCurrent = effNotes === level.id;
                          return (
                            <button
                              key={level.id}
                              disabled={!isAdmin}
                              onClick={() => handleLevelChange(selectedMember.id, 'notes', level.id)}
                              className={`p-2.5 rounded-2xl border text-center transition-all ${
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

                    {/* SECCIÓN NOTAS POR PROCESO */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600" />
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                          Permisos de Notas por Proceso
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 font-medium -mt-2">
                        Define qué procesos departamentales puede consultar o en cuáles puede redactar y gestionar notas.
                      </p>

                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                        {processes.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-xs">
                            No hay procesos registrados en el sistema.
                          </div>
                        ) : (
                          processes.map(proc => {
                            const modKey = `notes_${proc.id}`;
                            const effLevel = getMemberEffectiveLevel(selectedMember, modKey);

                            return (
                              <div key={proc.id} className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                                <div className="min-w-0 md:w-1/3">
                                  <p className="text-xs font-bold text-gray-900 truncate">{proc.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{proc.description || 'Área operativa'}</p>
                                </div>

                                <div className="flex-1 max-w-md">
                                  <div className="grid grid-cols-5 gap-1.5">
                                    {ACCESS_LEVELS.map(level => {
                                      const isCurrent = effLevel === level.id;
                                      return (
                                        <button
                                          key={level.id}
                                          disabled={!isAdmin}
                                          onClick={() => handleLevelChange(selectedMember.id, modKey, level.id)}
                                          className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                                            isCurrent
                                              ? `${level.activeBg} border-transparent font-bold`
                                              : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                          } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                          <span className="text-[10px]">{level.shortLabel}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {isLeader && !isAdmin && (
                                  <button
                                    onClick={() => openRequestModal(modKey, `Notas: ${proc.name}`, effLevel)}
                                    className="text-[11px] text-purple-600 hover:text-purple-700 font-bold self-end md:self-auto shrink-0 flex items-center gap-1"
                                  >
                                    <Send size={11} /> Solicitar
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* SECCIÓN NOTAS: Visibilidad del Submenú 'Notas' por Módulo */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <LayoutGrid size={16} className="text-indigo-600" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                            Visibilidad del Submenú "Notas" en Módulos
                          </h4>
                          <p className="text-xs text-gray-500 font-medium">
                            Selecciona en qué módulos de la barra lateral se mostrará u ocultará la pestaña de Notas para este usuario.
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                        {SYSTEM_MODULES_FOR_VISIBILITY.map(mod => {
                          const IconComp = mod.icon;
                          const isVisible = isSubnavItemVisible(selectedMember, 'notes', mod.id);

                          return (
                            <div 
                              key={mod.id}
                              className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                            >
                              <div className="min-w-0 md:w-5/12 flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl border shrink-0 ${isVisible ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                  <IconComp size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">{mod.name}</p>
                                  <p className="text-[11px] text-gray-500">Módulo de la barra lateral</p>
                                </div>
                              </div>

                              <div className="flex-1 max-w-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    disabled={!isAdmin}
                                    onClick={() => {
                                      if (!isVisible) handleToggleSubnavVisibility(selectedMember.id, 'notes', mod.id);
                                    }}
                                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                                      isVisible
                                        ? 'bg-emerald-600 border-transparent text-white font-bold ring-2 ring-offset-1 ring-emerald-500 shadow-xs'
                                        : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <Eye size={13} />
                                    <span className="text-xs font-bold">Mostrar</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!isAdmin}
                                    onClick={() => {
                                      if (isVisible) handleToggleSubnavVisibility(selectedMember.id, 'notes', mod.id);
                                    }}
                                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                                      !isVisible
                                        ? 'bg-rose-600 border-transparent text-white font-bold ring-2 ring-offset-1 ring-rose-500 shadow-xs'
                                        : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <EyeOff size={13} />
                                    <span className="text-xs font-bold">Ocultar</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* VISTA 3: PERMISOS DE ENLACES DE INTERÉS */}
                {matrixTab === 'links' && (
                  <div className="space-y-6">
                    {/* SECCIÓN ENLACES: Acceso Global a Enlaces */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                            <Bookmark size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-gray-900">Acceso General a Enlaces de Interés</h4>
                            <p className="text-xs text-gray-500 font-medium">
                              Determina el nivel de acceso del colaborador al repositorio de enlaces y accesos directos.
                            </p>
                          </div>
                        </div>
                        {isLeader && !isAdmin && (
                          <button
                            onClick={() => openRequestModal('links', 'Módulo General de Enlaces', getMemberEffectiveLevel(selectedMember, 'links'))}
                            className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
                          >
                            <Send size={12} /> Solicitar
                          </button>
                        )}
                      </div>

                      {/* Selector de 5 píldoras */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                        {ACCESS_LEVELS.map(level => {
                          const effLinks = getMemberEffectiveLevel(selectedMember, 'links');
                          const isCurrent = effLinks === level.id;
                          return (
                            <button
                              key={level.id}
                              disabled={!isAdmin}
                              onClick={() => handleLevelChange(selectedMember.id, 'links', level.id)}
                              className={`p-2.5 rounded-2xl border text-center transition-all ${
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

                    {/* SECCIÓN ENLACES POR PROCESO */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600" />
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                          Permisos de Enlaces por Proceso
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 font-medium -mt-2">
                        Define qué enlaces de procesos departamentales puede consultar o gestionar el colaborador.
                      </p>

                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                        {processes.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-xs">
                            No hay procesos registrados en el sistema.
                          </div>
                        ) : (
                          processes.map(proc => {
                            const modKey = `links_${proc.id}`;
                            const effLevel = getMemberEffectiveLevel(selectedMember, modKey);

                            return (
                              <div key={proc.id} className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                                <div className="min-w-0 md:w-1/3">
                                  <p className="text-xs font-bold text-gray-900 truncate">{proc.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{proc.description || 'Área operativa'}</p>
                                </div>

                                <div className="flex-1 max-w-md">
                                  <div className="grid grid-cols-5 gap-1.5">
                                    {ACCESS_LEVELS.map(level => {
                                      const isCurrent = effLevel === level.id;
                                      return (
                                        <button
                                          key={level.id}
                                          disabled={!isAdmin}
                                          onClick={() => handleLevelChange(selectedMember.id, modKey, level.id)}
                                          className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                                            isCurrent
                                              ? `${level.activeBg} border-transparent font-bold`
                                              : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                          } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                          <span className="text-[10px]">{level.shortLabel}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {isLeader && !isAdmin && (
                                  <button
                                    onClick={() => openRequestModal(modKey, `Enlaces: ${proc.name}`, effLevel)}
                                    className="text-[11px] text-purple-600 hover:text-purple-700 font-bold self-end md:self-auto shrink-0 flex items-center gap-1"
                                  >
                                    <Send size={11} /> Solicitar
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* SECCIÓN ENLACES: Visibilidad del Submenú 'Enlaces de Interés' por Módulo */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <LayoutGrid size={16} className="text-indigo-600" />
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                            Visibilidad del Submenú "Enlaces de Interés" en Módulos
                          </h4>
                          <p className="text-xs text-gray-500 font-medium">
                            Selecciona en qué módulos de la barra lateral se mostrará u ocultará la pestaña de Enlaces de Interés para este usuario.
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                        {SYSTEM_MODULES_FOR_VISIBILITY.map(mod => {
                          const IconComp = mod.icon;
                          const isVisible = isSubnavItemVisible(selectedMember, 'links', mod.id);

                          return (
                            <div 
                              key={mod.id}
                              className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                            >
                              <div className="min-w-0 md:w-5/12 flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl border shrink-0 ${isVisible ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                  <IconComp size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">{mod.name}</p>
                                  <p className="text-[11px] text-gray-500">Módulo de la barra lateral</p>
                                </div>
                              </div>

                              <div className="flex-1 max-w-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    disabled={!isAdmin}
                                    onClick={() => {
                                      if (!isVisible) handleToggleSubnavVisibility(selectedMember.id, 'links', mod.id);
                                    }}
                                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                                      isVisible
                                        ? 'bg-emerald-600 border-transparent text-white font-bold ring-2 ring-offset-1 ring-emerald-500 shadow-xs'
                                        : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <Eye size={13} />
                                    <span className="text-xs font-bold">Mostrar</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!isAdmin}
                                    onClick={() => {
                                      if (isVisible) handleToggleSubnavVisibility(selectedMember.id, 'links', mod.id);
                                    }}
                                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                                      !isVisible
                                        ? 'bg-rose-600 border-transparent text-white font-bold ring-2 ring-offset-1 ring-rose-500 shadow-xs'
                                        : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <EyeOff size={13} />
                                    <span className="text-xs font-bold">Ocultar</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
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
                  <label className="text-xs font-bold text-gray-700">Integrante de destino:</label>
                  <p className="text-xs text-gray-900 font-black mt-0.5">{selectedMember.name} ({selectedMember.email})</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">Nivel solicitado:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {ACCESS_LEVELS.map(lvl => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setReqLevel(lvl.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          reqLevel === lvl.id
                            ? `${lvl.activeBg} border-transparent font-bold`
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <p className="text-[11px] font-bold">{lvl.shortLabel}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Justificación para el Administrador:</label>
                  <textarea
                    rows={3}
                    value={reqJustification}
                    onChange={e => setReqJustification(e.target.value)}
                    placeholder="Describe por qué este integrante necesita este nivel de acceso a comentarios..."
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendRequest}
                  disabled={isSendingRequest || !reqJustification.trim()}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
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
