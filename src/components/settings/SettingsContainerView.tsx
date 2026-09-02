import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  BrainCircuit, 
  Zap, 
  Users, 
  Search, 
  ChevronRight, 
  User, 
  Save, 
  Check, 
  Shield, 
  Lock, 
  TrendingUp, 
  Briefcase, 
  Megaphone, 
  DollarSign, 
  Boxes, 
  Award, 
  ShieldCheck, 
  Package, 
  GraduationCap, 
  CheckCircle2, 
  Calendar, 
  FolderKanban, 
  Activity, 
  Contact, 
  Sparkles, 
  Bookmark, 
  X, 
  Building2, 
  Plus, 
  Edit, 
  Trash2 
} from 'lucide-react';
import { TeamMember, Process, Company, Role, SystemRole } from '../../types';
import { MemberEditorView } from '../common/MemberEditorView';

interface ProcessDetailCardProps {
  proc: Process;
  members: TeamMember[];
  onEdit: (p: Process) => void;
  onDelete: (id: string) => void;
}

const ProcessDetailCard: React.FC<ProcessDetailCardProps> = ({ proc, members, onEdit, onDelete }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group">
    <div>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{proc.name}</h3>
            <span className="text-xs text-gray-400">{proc.goals?.length ? `${proc.goals.length} objetivos` : 'Proceso Activo'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(proc)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
            <Edit size={14} />
          </button>
          <button onClick={() => onDelete(proc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {proc.description && (
        <p className="text-xs text-gray-500 mt-3">{proc.description}</p>
      )}
    </div>
    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
      <span>{members.length} miembros</span>
      <span className="font-bold text-purple-600">Activo</span>
    </div>
  </div>
);

interface MemberProfileCardProps {
  member: TeamMember;
  processName?: string;
  companies?: Company[];
  roles?: Role[];
}

const MemberProfileCard: React.FC<MemberProfileCardProps> = ({ member, processName }) => (
  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-black text-lg flex items-center justify-center shrink-0">
      {member.name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-gray-900 text-sm truncate">{member.name}</h4>
      <p className="text-xs text-gray-400 truncate">{member.role || 'Sin cargo'}</p>
      {processName && (
        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md truncate max-w-full">
          {processName}
        </span>
      )}
    </div>
  </div>
);

interface SettingsContainerViewProps {
  settingsSubTab: 'roles' | 'processes' | 'members' | 'general';
  
  // Members and processes data
  members: TeamMember[];
  sortedMembers: TeamMember[];
  processes: Process[];
  companies: Company[];
  roles: Role[];
  
  // Permissions & Selection State
  permSearch: string;
  setPermSearch: (val: string) => void;
  selectedMemberId: string;
  handleMemberClick: (id: string) => void;
  draftIsSystemAdmin: boolean;
  setDraftIsSystemAdmin: (val: boolean) => void;
  draftModuleAccess: Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>;
  setDraftModuleAccess: React.Dispatch<React.SetStateAction<Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>>>;
  hasUnsavedPermissionsChanges: boolean;
  savePermissions: (memberId: string) => Promise<void>;
  setLastInitializedMemberId: (val: string) => void;
  
  // Links Visibility State
  draftCanViewAllCompanyLinks: boolean;
  setDraftCanViewAllCompanyLinks: React.Dispatch<React.SetStateAction<boolean>>;
  draftSupervisedMembersForLinks: string[];
  setDraftSupervisedMembersForLinks: React.Dispatch<React.SetStateAction<string[]>>;
  linksSupervisorSearch: string;
  setLinksSupervisorSearch: (val: string) => void;
  
  // Process CRUD
  setIsAddingProcess: (val: boolean) => void;
  setEditingProcess: (proc: Process | null) => void;
  setNewProcessData: (data: { name: string; description: string; goals: string }) => void;
  openEditProcess: (proc: Process) => void;
  handleDeleteProcess: (id: string) => void;
  
  // Member CRUD
  isAddingMember: boolean;
  setIsAddingMember: (val: boolean) => void;
  editingMember: TeamMember | null;
  setEditingMember: (m: TeamMember | null) => void;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  handleAddMember: (e: React.FormEvent) => void;
  openEditMember: (m: TeamMember) => void;
  handleDeleteMember: (m: TeamMember) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  
  // Helpers
  normalizeText: (text: string) => string;
}

export const SettingsContainerView: React.FC<SettingsContainerViewProps> = ({
  settingsSubTab,
  members,
  sortedMembers,
  processes,
  companies,
  roles,
  permSearch,
  setPermSearch,
  selectedMemberId,
  handleMemberClick,
  draftIsSystemAdmin,
  setDraftIsSystemAdmin,
  draftModuleAccess,
  setDraftModuleAccess,
  hasUnsavedPermissionsChanges,
  savePermissions,
  setLastInitializedMemberId,
  draftCanViewAllCompanyLinks,
  setDraftCanViewAllCompanyLinks,
  draftSupervisedMembersForLinks,
  setDraftSupervisedMembersForLinks,
  linksSupervisorSearch,
  setLinksSupervisorSearch,
  setIsAddingProcess,
  setEditingProcess,
  setNewProcessData,
  openEditProcess,
  handleDeleteProcess,
  isAddingMember,
  setIsAddingMember,
  editingMember,
  setEditingMember,
  newMemberData,
  setNewMemberData,
  handleAddMember,
  openEditMember,
  handleDeleteMember,
  searchQuery,
  setSearchQuery,
  normalizeText
}) => {
  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {settingsSubTab === 'general' && (
        <div className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] shadow-xl text-center space-y-6">
          <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto text-blue-600 shadow-inner">
            <Settings size={48} className="animate-[spin_10s_linear_infinite]" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Configuración del Sistema</h2>
            <p className="text-gray-500 max-w-sm mx-auto font-medium">Personaliza los parámetros globales de Novagreen IA y gestiona las integraciones de Gemini.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left group hover:bg-white hover:shadow-md transition-all cursor-not-allowed opacity-60">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 mb-4 shadow-sm">
                <BrainCircuit size={20} />
              </div>
              <h4 className="font-bold text-gray-800 mb-1">Modelo de IA</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gemini 1.5 Flash</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left group hover:bg-white hover:shadow-md transition-all cursor-not-allowed opacity-60">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 mb-4 shadow-sm">
                <Zap size={20} />
              </div>
              <h4 className="font-bold text-gray-800 mb-1">Frecuencia de Análisis</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tiempo Real (Streaming)</p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Módulo de Configuración v1.0.4</p>
          </div>
        </div>
      )}

      {settingsSubTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-xl space-y-5 flex flex-col h-[75vh]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 leading-tight">Integrantes del Equipo</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Ajuste de permisos</p>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar integrante..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-bold text-gray-700 w-full placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {(() => {
                const filtered = sortedMembers.filter(m => {
                  if (!m.name) return false;
                  const isMember = (m.categories || []).includes('miembro');
                  return isMember && normalizeText(m.name).includes(normalizeText(permSearch));
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400 font-medium text-xs">
                      No se encontraron integrantes
                    </div>
                  );
                }

                return filtered.map((member, mIdx) => {
                  const isAdmin = member.isSystemAdmin || member.systemRoleId === 'role-admin';
                  const isSelected = selectedMemberId ? selectedMemberId === member.id : member.id === filtered[0]?.id;

                  return (
                    <button
                      key={`settings_member_sidebar_${member.id || mIdx}_${mIdx}`}
                      onClick={() => handleMemberClick(member.id)}
                      className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                          : 'bg-gray-50 border-transparent text-gray-800 hover:bg-white hover:border-gray-100 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                          className="w-9 h-9 rounded-xl object-cover flex-shrink-0" 
                          alt={member.name} 
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-black truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {member.name}
                          </p>
                          <p className={`text-[9px] uppercase font-bold tracking-wider truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {member.role || 'Sin Cargo'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isAdmin ? (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
                          }`}>
                            Admin
                          </span>
                        ) : (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            isSelected ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'
                          }`}>
                            Custom
                          </span>
                        )}
                        <ChevronRight size={12} className={isSelected ? 'text-white' : 'text-gray-300'} />
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#E5E7EB] shadow-2xl relative overflow-hidden h-[75vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
            
            {(() => {
              const filteredMembers = sortedMembers.filter(m => (m.categories || []).includes('miembro'));
              const member = sortedMembers.find(m => m.id === selectedMemberId) || filteredMembers[0];
              
              if (!member) {
                return (
                  <div className="text-center py-20 text-gray-400 font-medium text-sm">
                    Por favor, agrega un miembro al equipo en la pestaña "Equipo" para poder configurar sus permisos.
                  </div>
                );
              }
              
              const processName = processes.find(p => p.id === member.processId)?.name || 'Sin Proceso Asignado';

              return (
                <div className="space-y-8 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <img 
                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                        alt={member.name} 
                        className="w-16 h-16 rounded-2xl object-cover shadow-sm border-2 border-slate-50 flex-shrink-0" 
                      />
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-gray-900 leading-tight truncate">{member.name}</h3>
                        <p className="text-gray-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 mt-0.5">
                          <User size={12} className="text-blue-500" /> {member.role || 'Sin Cargo'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Proceso: <span className="text-slate-700">{processName}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-2xl text-center flex flex-col justify-center hidden sm:flex">
                        <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest mb-0.5">Tipo de Cuenta</span>
                        <span className={`text-xs font-black uppercase ${draftIsSystemAdmin ? 'text-red-600' : 'text-blue-600'}`}>
                          {draftIsSystemAdmin ? 'Administrador' : 'Acceso Personalizado'}
                        </span>
                      </div>
                      
                      <div>
                        {hasUnsavedPermissionsChanges ? (
                          <button
                            type="button"
                            onClick={() => savePermissions(member.id)}
                            className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all flex items-center gap-2"
                          >
                            <Save size={14} className="animate-pulse" /> Guardar permisos
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="px-5 py-3 bg-slate-100 text-slate-400 text-[10px] font-semibold uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-not-allowed"
                          >
                            <Check size={14} /> Guardar permisos
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Global Role Select Card */}
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield size={14} className={draftIsSystemAdmin ? 'text-red-500' : 'text-blue-500'} /> Configuración de Rol Global
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-relaxed">
                        Determina si este integrante tiene privilegios ilimitados de administración en todo el sistema.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftIsSystemAdmin(true);
                        }}
                        className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                          draftIsSystemAdmin 
                            ? 'bg-white border-red-500 ring-2 ring-red-50 text-slate-800 shadow-sm'
                            : 'bg-white/40 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <div className={`p-1 rounded ${draftIsSystemAdmin ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Shield size={12} />
                          </div>
                          <span className="font-extrabold text-[10px] uppercase tracking-wider">Administrador Global</span>
                        </div>
                        <p className="text-[9px] font-bold leading-relaxed text-slate-400">
                          Acceso total para hacer y deshacer. Control operativo en todos los módulos sin restricciones.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDraftIsSystemAdmin(false);
                          if (Object.keys(draftModuleAccess || {}).length === 0) {
                            setDraftModuleAccess(member.moduleAccess || {
                              dashboard: 'lector',
                              tasks: 'colaborador',
                              planner: 'lector',
                              projects: 'ninguno',
                              directory: 'lector',
                              transcript: 'lector',
                              settings: 'ninguno'
                            });
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                          !draftIsSystemAdmin 
                            ? 'bg-white border-blue-500 ring-2 ring-blue-50 text-slate-800 shadow-sm'
                            : 'bg-white/40 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <div className={`p-1 rounded ${!draftIsSystemAdmin ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Settings size={12} />
                          </div>
                          <span className="font-extrabold text-[10px] uppercase tracking-wider">Acceso por Módulos</span>
                        </div>
                        <p className="text-[9px] font-bold leading-relaxed text-slate-400">
                          Matriz de permisos granulados. El usuario puede tener privilegios únicos por módulo del sistema.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Module access matrix */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Lock size={12} className="text-blue-500" /> Matriz de Niveles de Acceso por Módulo
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Define el perfil de permisos operativos (Ninguno, Lector, Colaborador, Líder o Administrador) para cada área.
                      </p>
                    </div>

                    {draftIsSystemAdmin ? (
                      <div className="p-6 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-center space-y-2">
                        <Shield size={32} className="mx-auto text-amber-500" />
                        <div>
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Modo Administrador Global Activo</h5>
                          <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-semibold">
                            Este integrante posee acceso sin límites para "hacer y deshacer". Todos los módulos se encuentran asignados a nivel total.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
                        {/* Desktop Table Headers */}
                        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <div className="col-span-5 flex items-center">Módulo o Área del Sistema</div>
                          <div className="col-span-7 flex justify-end pr-8">Nivel de Acceso Asignado</div>
                        </div>

                        {[
                          { id: 'dashboard', name: 'Resumen o Dashboard', desc: 'Panel de control con métricas generales del equipo.', icon: <TrendingUp size={16} /> },
                          { id: 'gerencia', name: 'Módulo de Gerencia', desc: 'Asistente IA consultor, bitácora directiva, planificación estratégica (FODA/OKRs) y gobernanza de IA.', icon: <Briefcase size={16} /> },
                          { id: 'marketing', name: 'Módulo de Marketing', desc: 'Campañas estandarizadas [AAMMDD], proyectos vinculados, calendario de contenidos, CRM y métricas.', icon: <Megaphone size={16} /> },
                          { id: 'ventas', name: 'Módulo de Ventas', desc: 'CRM de Clientes, Embudo de Ventas (Pipeline), Cotizaciones y Metas.', icon: <DollarSign size={16} /> },
                          { id: 'productos', name: 'Módulo de Productos', desc: 'Catálogo de soluciones comerciales, fichas técnicas y precios de Certificación, Capacitación, QHSE, EPP y Equipos.', icon: <Boxes size={16} />, isProductosParent: true },
                          { id: 'acreditacion', name: 'Módulo de Acreditación', desc: 'Enlaces, aliados y programas de acreditación internacional.', icon: <Award size={16} /> },
                          { id: 'qhse', name: 'Módulo de QHSE', desc: 'Gestión de Calidad, Salud, Seguridad Ocupacional y Medio Ambiente.', icon: <ShieldCheck size={16} /> },
                          { id: 'importaciones', name: 'Módulo de Importaciones', desc: 'Base de productos, catálogo de proveedores internacionales y órdenes de importación.', icon: <Package size={16} /> },
                          { id: 'capacitacion', name: 'Módulo de Capacitación', desc: 'Gestión de capacitadores, aulas, lugares, calendario y liquidación de costos.', icon: <GraduationCap size={16} /> },
                          { id: 'tasks', name: 'Seguimiento de Tareas', desc: 'Permisos de tareas gestionados individualmente para cada proceso específico.', icon: <CheckCircle2 size={16} />, isTasksParent: true },
                          { id: 'planner', name: 'Planificador Inteligente IA', desc: 'Planificación inteligente asistida por modelos Gemini.', icon: <Calendar size={16} /> },
                          { id: 'projects', name: 'Gestión de Proyectos', desc: 'Administración de campañas y portafolio de proyectos.', icon: <FolderKanban size={16} />, isProjectsParent: true },
                          { id: 'process_dashboard', name: 'Gestión XD (Procesos)', desc: 'Administración y seguimiento de horas, enlaces, bases y minutas por proceso.', icon: <Activity size={16} />, isProcessDashboardParent: true },
                          { id: 'directory', name: 'Directorio de Contactos', desc: 'Información técnica de contactos y ficha de integrante.', icon: <Contact size={16} /> },
                          { id: 'transcript', name: 'Analizador de Minutas IA', desc: 'Procesamiento de audios de reuniones and minutas.', icon: <Sparkles size={16} /> },
                          { id: 'settings', name: 'Configuración y Procesos', desc: 'Permisos de equipo y control administrativo general.', icon: <Settings size={16} /> },
                        ].map((mod, modIdx) => {
                          const currentAccessVal = draftModuleAccess[mod.id] || 'ninguno';

                          return (
                            <div key={`settings_main_mod_${mod.id}_${modIdx}`} className="p-5 md:px-6 md:py-4 bg-white hover:bg-slate-50/20 transition-all">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                <div className="md:col-span-5 flex items-start gap-3">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                                    {mod.icon}
                                  </div>
                                  <div className="min-w-0 pr-2">
                                    <h5 className="text-[11px] font-black text-slate-800 leading-tight uppercase tracking-wider">{mod.name}</h5>
                                    <p className="text-[9px] text-slate-400 mt-0.5 leading-snug font-semibold">{mod.desc}</p>
                                  </div>
                                </div>

                                <div className="md:col-span-7 flex justify-end w-full">
                                  {mod.id === 'tasks' || mod.id === 'projects' || mod.id === 'process_dashboard' ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm select-none">
                                      <Sparkles size={11} className="text-blue-500 animate-pulse" /> Resuelto por Proceso
                                    </div>
                                  ) : (
                                    <div className="flex bg-slate-100 p-0.5 rounded-xl w-full max-w-md gap-0.5 border border-slate-200/40">
                                      {[
                                        { val: 'ninguno', label: 'Ninguno' },
                                        { val: 'lector', label: 'Lector' },
                                        { val: 'colaborador', label: 'Colab.' },
                                        { val: 'lider', label: 'Líder' },
                                        { val: 'administrador', label: 'Admin.' }
                                      ].map((opt, optIdx) => {
                                        const isSelected = currentAccessVal === opt.val;
                                        return (
                                          <button
                                            key={`settings_mod_opt_${mod.id}_${opt.val}_${optIdx}`}
                                            type="button"
                                            onClick={() => {
                                              setDraftModuleAccess(prev => ({
                                                ...prev,
                                                [mod.id]: opt.val as any
                                              }));
                                            }}
                                            className={`flex-1 text-center py-2 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                              isSelected
                                                ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                  opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                  opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                  opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                  'bg-green-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                            }`}
                                          >
                                            {opt.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {mod.isTasksParent && (
                                <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                  <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                      <Sparkles size={11} className="text-blue-500" /> Permisos por Proceso Activo
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 italic">
                                      * Los integrantes heredarán acceso a la sección de Tareas de acuerdo al rol configurado en cada proceso.
                                    </span>
                                  </div>

                                  <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-dashed border-slate-200/60 pb-3">
                                      <div className="md:col-span-5 flex items-center gap-2">
                                        <span className="text-slate-400 font-bold text-xs">↳</span>
                                        <div className="flex flex-col min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">Tareas Sin Proceso o sin Asignar</span>
                                            <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-200/50 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Global / General</span>
                                          </div>
                                          <span className="text-[8px] text-slate-400 font-bold leading-normal mt-0.5">Controla el acceso de las personas a tareas que no tienen un proceso o asignado específico</span>
                                        </div>
                                      </div>
                                      <div className="md:col-span-7 flex justify-end w-full">
                                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                          {[
                                            { val: 'ninguno', label: 'Ninguno' },
                                            { val: 'lector', label: 'Lector' },
                                            { val: 'colaborador', label: 'Colab.' },
                                            { val: 'lider', label: 'Líder' },
                                            { val: 'administrador', label: 'Admin.' }
                                          ].map((opt, optIdx) => {
                                            const isSelected = (draftModuleAccess['tasks'] || 'ninguno') === opt.val;
                                            return (
                                              <button
                                                key={`settings_perm_task_opt_${opt.val}_${optIdx}`}
                                                type="button"
                                                onClick={() => {
                                                  setDraftModuleAccess(prev => ({
                                                    ...prev,
                                                    tasks: opt.val as any
                                                  }));
                                                }}
                                                className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                  isSelected
                                                    ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                      opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                      opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                      opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                      'bg-green-600 text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                }`}
                                              >
                                                {opt.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>

                                    {processes.length === 0 ? (
                                      <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                    ) : (
                                      processes.map((proc, pIdx) => {
                                        const procModId = `tasks_${proc.id}`;
                                        const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                        return (
                                          <div key={`settings_tasks_proc_row_${proc.id || pIdx}_${pIdx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                            <div className="md:col-span-5 flex items-center gap-2">
                                              <span className="text-slate-400 font-bold text-xs">↳</span>
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                              </div>
                                            </div>
                                            <div className="md:col-span-7 flex justify-end w-full">
                                              <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                {[
                                                  { val: 'ninguno', label: 'Ninguno' },
                                                  { val: 'lector', label: 'Lector' },
                                                  { val: 'colaborador', label: 'Colab.' },
                                                  { val: 'lider', label: 'Líder' },
                                                  { val: 'administrador', label: 'Admin.' }
                                                ].map((opt, optIdx) => {
                                                  const isSelected = currentProcAccessVal === opt.val;
                                                  return (
                                                    <button
                                                      key={`settings_tasks_opt_${proc.id}_${opt.val}_${optIdx}`}
                                                      type="button"
                                                      onClick={() => {
                                                        setDraftModuleAccess(prev => ({
                                                          ...prev,
                                                          [procModId]: opt.val as any
                                                        }));
                                                      }}
                                                      className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                        isSelected
                                                          ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                            opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                            opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                            opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                            'bg-green-600 text-white shadow-sm'
                                                          : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                      }`}
                                                    >
                                                      {opt.label}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}

                              {mod.isProcessDashboardParent && (
                                <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                  <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                      <Sparkles size={11} className="text-blue-500" /> Permisos de Gestión XD por Proceso Activo
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 italic">
                                      * Los integrantes heredarán acceso a la sección de Gestión XD de acuerdo al rol configurado en cada proceso.
                                    </span>
                                  </div>

                                  <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                    {processes.length === 0 ? (
                                      <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                    ) : (
                                      processes.map((proc, pIdx) => {
                                        const procModId = `process_dashboard_${proc.id}`;
                                        const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                        return (
                                          <div key={`settings_p_dash_row_${proc.id || pIdx}_${pIdx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                            <div className="md:col-span-5 flex items-center gap-2">
                                              <span className="text-slate-400 font-bold text-xs">↳</span>
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                              </div>
                                            </div>
                                            <div className="md:col-span-7 flex justify-end w-full">
                                              <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                {[
                                                  { val: 'ninguno', label: 'Ninguno' },
                                                  { val: 'lector', label: 'Lector' },
                                                  { val: 'colaborador', label: 'Colab.' },
                                                  { val: 'lider', label: 'Líder' },
                                                  { val: 'administrador', label: 'Admin.' }
                                                ].map((opt, optIdx) => {
                                                  const isSelected = currentProcAccessVal === opt.val;
                                                  return (
                                                    <button
                                                      key={`settings_pdash_opt_${proc.id}_${opt.val}_${optIdx}`}
                                                      type="button"
                                                      onClick={() => {
                                                        setDraftModuleAccess(prev => ({
                                                          ...prev,
                                                          [procModId]: opt.val as any
                                                        }));
                                                      }}
                                                      className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                        isSelected
                                                          ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                            opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                            opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                            opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                            'bg-green-600 text-white shadow-sm'
                                                          : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                      }`}
                                                    >
                                                      {opt.label}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}

                              {mod.isProjectsParent && (
                                <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                  <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                      <Sparkles size={11} className="text-blue-500" /> Permisos de Proyectos por Proceso Activo
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 italic">
                                      * Los integrantes heredarán acceso a la sección de Proyectos de acuerdo al rol configurado en cada proceso.
                                    </span>
                                  </div>

                                  <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                    {processes.length === 0 ? (
                                      <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                    ) : (
                                      processes.map((proc, pIdx) => {
                                        const procModId = `projects_${proc.id}`;
                                        const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                        return (
                                          <div key={`settings_proj_proc_row_${proc.id || pIdx}_${pIdx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                            <div className="md:col-span-5 flex items-center gap-2">
                                              <span className="text-slate-400 font-bold text-xs">↳</span>
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                              </div>
                                            </div>
                                            <div className="md:col-span-7 flex justify-end w-full">
                                              <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                {[
                                                  { val: 'ninguno', label: 'Ninguno' },
                                                  { val: 'lector', label: 'Lector' },
                                                  { val: 'colaborador', label: 'Colab.' },
                                                  { val: 'lider', label: 'Líder' },
                                                  { val: 'administrador', label: 'Admin.' }
                                                ].map((opt, optIdx) => {
                                                  const isSelected = currentProcAccessVal === opt.val;
                                                  return (
                                                    <button
                                                      key={`settings_proj_opt_${proc.id}_${opt.val}_${optIdx}`}
                                                      type="button"
                                                      onClick={() => {
                                                        setDraftModuleAccess(prev => ({
                                                          ...prev,
                                                          [procModId]: opt.val as any
                                                        }));
                                                      }}
                                                      className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                        isSelected
                                                          ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                            opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                            opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                            opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                            'bg-green-600 text-white shadow-sm'
                                                          : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                      }`}
                                                    >
                                                      {opt.label}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}

                              {(mod as any).isProductosParent && (
                                <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                  <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                      <Boxes size={11} className="text-blue-500" /> Permisos por Submódulo de Productos
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 italic">
                                      * Permite asignar permisos específicos a cada categoría o heredar del permiso general de Productos.
                                    </span>
                                  </div>

                                  <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                    {[
                                      { id: 'certificacion', name: 'Certificación', icon: '🏅' },
                                      { id: 'capacitacion', name: 'Capacitación', icon: '📚' },
                                      { id: 'qhse', name: 'QHSE', icon: '🛡️' },
                                      { id: 'epp', name: 'EPP', icon: '🦺' },
                                      { id: 'equipos', name: 'Equipos', icon: '⚙️' }
                                    ].map((sub, subIdx) => {
                                      const subModId = `productos_${sub.id}`;
                                      const currentSubAccessVal = draftModuleAccess[subModId] || 'ninguno';

                                      return (
                                        <div key={`settings_subprod_row_${sub.id}_${subIdx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                          <div className="md:col-span-5 flex items-center gap-2">
                                            <span className="text-slate-400 font-bold text-xs">↳</span>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="text-xs">{sub.icon}</span>
                                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{sub.name}</span>
                                              <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Submódulo</span>
                                            </div>
                                          </div>
                                          <div className="md:col-span-7 flex justify-end w-full">
                                            <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                              {[
                                                { val: 'ninguno', label: 'Ninguno' },
                                                { val: 'lector', label: 'Lector' },
                                                { val: 'colaborador', label: 'Colab.' },
                                                { val: 'lider', label: 'Líder' },
                                                { val: 'administrador', label: 'Admin.' }
                                              ].map((opt, optIdx) => {
                                                const isSelected = currentSubAccessVal === opt.val;
                                                return (
                                                  <button
                                                    key={`settings_subprod_opt_${sub.id}_${opt.val}_${optIdx}`}
                                                    type="button"
                                                    onClick={() => {
                                                      setDraftModuleAccess(prev => ({
                                                        ...prev,
                                                        [subModId]: opt.val as any
                                                      }));
                                                    }}
                                                    className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                      isSelected
                                                        ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                          opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                          opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                          opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                          'bg-green-600 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                    }`}
                                                  >
                                                    {opt.label}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECCION: SUPERVISION Y VISIBILIDAD DE ENLACES DE INTERES */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0 mt-0.5">
                          <Bookmark size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <span>Enlaces de Interés: Supervisión y Visibilidad</span>
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Gestión Centralizada</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            Define de qué otras personas puede ver y supervisar los enlaces de interés en todos los módulos (ej: Líderes de Gestión).
                          </p>
                        </div>
                      </div>
                    </div>

                    {draftIsSystemAdmin ? (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-3">
                        <Shield size={18} className="text-emerald-600 shrink-0" />
                        <p className="text-xs font-bold text-emerald-800">
                          Como Administrador Global, este usuario tiene visibilidad y control total sobre todos los enlaces de todas las personas de la empresa.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                          <div>
                            <h5 className="text-xs font-bold text-slate-800">Ver todos los enlaces de la organización</h5>
                            <p className="text-[10px] text-slate-400 font-medium">Permite ver los enlaces de interés de todas las personas sin restricción.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDraftCanViewAllCompanyLinks(prev => !prev)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              draftCanViewAllCompanyLinks ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                draftCanViewAllCompanyLinks ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        {!draftCanViewAllCompanyLinks && (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-700">
                                Personas supervisadas asignadas ({draftSupervisedMembersForLinks.length}):
                              </span>
                              <div className="relative w-full sm:w-64">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Buscar integrante para supervisar..."
                                  value={linksSupervisorSearch}
                                  onChange={(e) => setLinksSupervisorSearch(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                            </div>

                            {draftSupervisedMembersForLinks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 p-2 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                                {draftSupervisedMembersForLinks.map((supId, supIdx) => {
                                  const supMember = members.find(m => m.id === supId);
                                  return (
                                    <span
                                      key={`settings_sup_chip_${supId}_${supIdx}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold shadow-2xs"
                                    >
                                      <span>{supMember?.name || supId}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDraftSupervisedMembersForLinks(prev => prev.filter(id => id !== supId));
                                        }}
                                        className="text-indigo-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            <div className="max-h-56 overflow-y-auto border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-slate-50/30">
                              {members
                                .filter(m => m.id !== member.id)
                                .filter(m => {
                                  if (!linksSupervisorSearch.trim()) return true;
                                  return m.name.toLowerCase().includes(linksSupervisorSearch.toLowerCase().trim()) ||
                                    (m.email && m.email.toLowerCase().includes(linksSupervisorSearch.toLowerCase().trim()));
                                })
                                .map((targetM, tmIdx) => {
                                  const isSupervised = draftSupervisedMembersForLinks.includes(targetM.id);
                                  return (
                                    <div
                                      key={`settings_sup_target_${targetM.id || tmIdx}_${tmIdx}`}
                                      onClick={() => {
                                        if (isSupervised) {
                                          setDraftSupervisedMembersForLinks(prev => prev.filter(id => id !== targetM.id));
                                        } else {
                                          setDraftSupervisedMembersForLinks(prev => [...prev, targetM.id]);
                                        }
                                      }}
                                      className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                                        isSupervised ? "bg-indigo-50/70 hover:bg-indigo-100/70" : "hover:bg-slate-100/70"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                          isSupervised ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                                        }`}>
                                          {targetM.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-slate-800 truncate">{targetM.name}</p>
                                          <p className="text-[10px] text-slate-400 truncate">{targetM.email || "Sin email"}</p>
                                        </div>
                                      </div>
                                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                        isSupervised
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                          : "bg-white text-slate-500 border-slate-200"
                                      }`}>
                                        {isSupervised ? "Supervisando" : "+ Agregar"}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {hasUnsavedPermissionsChanges && (
                    <div className="sticky bottom-0 left-0 right-0 py-3.5 px-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 shadow-2xl z-20 animate-fade-in-up mt-6">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-800 text-amber-500 rounded-lg animate-pulse">
                          <Sparkles size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-wide">Cambios sin guardar</p>
                          <p className="text-[9px] font-bold text-slate-400 truncate">Tienes modificaciones de permisos pendientes en {member.name}.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setLastInitializedMemberId('');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={() => savePermissions(member.id)}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Save size={12} /> Guardar permisos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {settingsSubTab === 'processes' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-white p-8 rounded-[3rem] border border-[#E5E7EB] shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ng-lime/10 text-ng-green rounded-2xl">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-ng-black">Gestión de Procesos</h2>
                <p className="text-ng-black/40 text-sm font-medium">Estructura operativa y departamentos de la organización.</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setEditingProcess(null);
                setNewProcessData({ name: '', description: '', goals: '' });
                setIsAddingProcess(true);
              }}
              className="px-6 py-3 bg-ng-lime text-ng-black font-black rounded-2xl shadow-lg shadow-ng-lime/20 hover:opacity-90 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
            >
              <Plus size={18} />
              Añadir Proceso
            </button>
          </div>
          
          <div className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] shadow-xl">
            <div className="space-y-8">
              {processes.map((proc, pIdx) => (
                <ProcessDetailCard 
                  key={`settings_proc_card_${proc.id || pIdx}_${pIdx}`} 
                  proc={proc} 
                  members={sortedMembers.filter(m => m.processId === proc.id)}
                  onEdit={openEditProcess}
                  onDelete={handleDeleteProcess}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === 'members' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-8 rounded-[3rem] border border-[#E5E7EB] shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ng-lime/10 text-ng-green rounded-2xl">
                <Users size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-ng-black">Gestión de Equipo</h2>
                  <span className="text-xs font-black bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    {members.filter(m => (m.categories || []).includes('miembro')).length} Integrantes
                  </span>
                </div>
                <p className="text-ng-black/40 text-sm font-medium">Control operativo y perfiles de los integrantes del equipo.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {searchQuery && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                  <span className="text-[11px] font-bold text-blue-700">
                    Filtrado por: <strong>"{searchQuery}"</strong>
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    Limpiar
                  </button>
                </div>
              )}
              <button 
                onClick={() => setIsAddingMember(true)}
                className="px-6 py-3 bg-ng-lime text-ng-black font-black rounded-2xl shadow-lg shadow-ng-lime/20 hover:opacity-90 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
              >
                <Plus size={18} />
                Añadir Integrante
              </button>
            </div>
          </div>

          {(isAddingMember || editingMember) ? (
            <MemberEditorView 
              editingMember={editingMember}
              newMemberData={newMemberData}
              setNewMemberData={setNewMemberData}
              processes={processes}
              companies={companies}
              roles={roles}
              onCancel={() => {
                setIsAddingMember(false);
                setEditingMember(null);
                setNewMemberData({
                  name: '', 
                  role: '', 
                  systemRoleId: '', 
                  categories: ['miembro'], 
                  processId: '', 
                  companyAssociations: [], 
                  identificationId: '',
                  hasRuc: false,
                  ruc: '',
                  skills: '', 
                  responsibilities: '', 
                  personality: '', 
                  notes: '', 
                  email: '', 
                  phone: '', 
                  epp: '',
                  isSystemAdmin: false as boolean,
                  moduleAccess: {} as Record<string, "ninguno" | "lector" | "colaborador" | "lider" | "administrador">
                });
              }}
              onSave={handleAddMember}
            />
          ) : (
            <div className="space-y-12">
              {processes.map((process, pIdx) => {
                const processMembers = members.filter(m => {
                  const matchesProcess = m.processId === process.id && (m.categories || []).includes('miembro');
                  const matchesSearch = 
                    normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                    normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                    (m.companyAssociations || []).some(assoc => {
                      const comp = companies.find(c => c.id === assoc.companyId);
                      return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                             normalizeText(assoc.role).includes(normalizeText(searchQuery));
                    }) ||
                    m.identificationId?.includes(searchQuery);
                  return matchesProcess && matchesSearch;
                });
                if (processMembers.length === 0) return null;
                
                return (
                  <div key={`settings_grouped_proc_${process.id || pIdx}_${pIdx}`} className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                      <div className="w-2 h-8 bg-ng-green rounded-full" />
                      <h3 className="text-xl font-black text-ng-black uppercase tracking-wider">{process.name}</h3>
                      <span className="text-sm font-bold text-ng-black/40 bg-gray-100 px-3 py-1 rounded-full">
                        {processMembers.length} integrante{processMembers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {processMembers.map((member, mIdx) => (
                        <div key={`settings_grouped_m_${member.id || mIdx}_${mIdx}`} className="relative group">
                          <div onClick={() => openEditMember(member)} className="cursor-pointer h-full">
                            <MemberProfileCard 
                              member={member} 
                              processName={process.name}
                              companies={companies}
                              roles={roles}
                            />
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditMember(member);
                              }}
                              className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-blue-600 hover:bg-white transition-all"
                              title="Editar Perfil"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMember(member);
                              }}
                              className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-white transition-all"
                              title="Eliminar Miembro"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned members */}
              {members.filter(m => {
                const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                const matchesSearch = 
                  normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                  normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                  m.companyAssociations?.some(assoc => {
                    const comp = companies.find(c => c.id === assoc.companyId);
                    return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                           normalizeText(assoc.role).includes(normalizeText(searchQuery));
                  }) ||
                  m.identificationId?.includes(searchQuery);
                return matchesProcess && matchesSearch;
              }).length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-2 h-8 bg-gray-400 rounded-full" />
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-wider">Sin Proceso Asignado</h3>
                    <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {members.filter(m => {
                        const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                        const matchesSearch = 
                          normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                          normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                          m.companyAssociations?.some(assoc => {
                            const comp = companies.find(c => c.id === assoc.companyId);
                            return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                   normalizeText(assoc.role).includes(normalizeText(searchQuery));
                          }) ||
                          m.identificationId?.includes(searchQuery);
                        return matchesProcess && matchesSearch;
                      }).length} integrante(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.filter(m => {
                      const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                      const matchesSearch = 
                        normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                        normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                        m.companyAssociations?.some(assoc => {
                          const comp = companies.find(c => c.id === assoc.companyId);
                          return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                 normalizeText(assoc.role).includes(normalizeText(searchQuery));
                        }) ||
                        m.identificationId?.includes(searchQuery);
                      return matchesProcess && matchesSearch;
                    }).map((member, mIdx) => (
                      <div key={`settings_unassigned_m_${member.id || mIdx}_${mIdx}`} className="relative group">
                        <div onClick={() => openEditMember(member)} className="cursor-pointer h-full">
                          <MemberProfileCard 
                            member={member} 
                            processName="Sin Proceso"
                            companies={companies}
                            roles={roles}
                          />
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditMember(member);
                            }}
                            className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-blue-600 hover:bg-white transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMember(member);
                            }}
                            className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-white transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
