import React from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Users,
  Search,
  BrainCircuit,
  Zap,
  Sliders,
  Shield,
  Briefcase,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { TeamMember, Process, SystemRole } from '../../types';

interface SettingsViewProps {
  settingsSubTab: 'general' | 'roles' | 'processes' | 'members';
  sortedMembers: TeamMember[];
  processes: Process[];
  roles: SystemRole[];
  selectedMemberId: string | null;
  permSearch: string;
  setPermSearch: (val: string) => void;
  handleMemberClick: (memberId: string) => void;
  selectedMember: TeamMember | undefined;
  hasUnsavedPermissionsChanges: boolean;
  handleDiscardPermissionsChanges: () => void;
  handleSavePermissions: () => void;
  isSavingPermissions: boolean;
  tempIsAdmin: boolean;
  handleToggleAdmin: () => void;
  tempRoleId: string;
  handleRoleSelect: (roleId: string) => void;
  tempModuleAccess: Record<string, 'all' | 'assigned' | 'none'>;
  handleModuleAccessChange: (moduleId: string, level: 'all' | 'assigned' | 'none') => void;
  MODULE_CONFIG: { id: string; name: string; description: string; icon: any }[];
  isReadOnly: boolean;
  normalizeText: (text: string) => string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settingsSubTab,
  sortedMembers,
  processes,
  roles,
  selectedMemberId,
  permSearch,
  setPermSearch,
  handleMemberClick,
  selectedMember,
  hasUnsavedPermissionsChanges,
  handleDiscardPermissionsChanges,
  handleSavePermissions,
  isSavingPermissions,
  tempIsAdmin,
  handleToggleAdmin,
  tempRoleId,
  handleRoleSelect,
  tempModuleAccess,
  handleModuleAccessChange,
  MODULE_CONFIG,
  isReadOnly,
  normalizeText,
}) => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {settingsSubTab === 'general' && (
        <div className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] shadow-xl text-center space-y-6 max-w-4xl mx-auto">
          <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto text-blue-600 shadow-inner">
            <Settings size={48} className="animate-[spin_10s_linear_infinite]" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Configuración del Sistema</h2>
            <p className="text-gray-500 max-w-sm mx-auto font-medium">
              Personaliza los parámetros globales de Novagreen IA y gestiona las integraciones de Gemini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left group hover:bg-white hover:shadow-md transition-all cursor-not-allowed opacity-60">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 mb-4 shadow-sm">
                <BrainCircuit size={20} />
              </div>
              <h4 className="font-bold text-gray-800 mb-1">Modelo de IA</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gemini 2.5 Flash</p>
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
                  onChange={e => setPermSearch(e.target.value)}
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
                  return <div className="text-center py-8 text-gray-400 font-medium text-xs">No se encontraron integrantes</div>;
                }

                return filtered.map((member, mIdx) => {
                  const isAdmin = member.isSystemAdmin || member.systemRoleId === 'role-admin';
                  const isSelected = selectedMemberId ? selectedMemberId === member.id : member.id === filtered[0]?.id;
                  const processName = processes.find(p => p.id === member.processId)?.name || 'Sin Proceso';

                  return (
                    <button
                      key={`set_mem_${member.id || mIdx}_${mIdx}`}
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
                          className="w-9 h-9 rounded-xl object-cover shrink-0"
                          alt={member.name}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate leading-snug">{member.name}</p>
                          <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                            {member.role || 'Sin Rol'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {isAdmin && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Admin
                          </span>
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedMember ? (
              <div className="bg-white p-8 rounded-[2.5rem] border border-[#E5E7EB] shadow-xl space-y-6">
                <div className="flex items-start justify-between pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedMember.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember.name)}`}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md"
                      alt={selectedMember.name}
                    />
                    <div>
                      <h3 className="text-xl font-black text-gray-900">{selectedMember.name}</h3>
                      <p className="text-xs font-bold text-gray-500">{selectedMember.role || 'Miembro de equipo'}</p>
                    </div>
                  </div>

                  {hasUnsavedPermissionsChanges && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDiscardPermissionsChanges}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={handleSavePermissions}
                        disabled={isSavingPermissions}
                        className="px-4 py-2 bg-ng-lime text-ng-black rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-ng-lime/20 flex items-center gap-1.5"
                      >
                        {isSavingPermissions ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="text-blue-600" size={18} />
                        <h4 className="text-sm font-black text-gray-900">Acceso de Administrador Global</h4>
                      </div>
                      <p className="text-xs text-gray-500">Otorga control total y bypass de restricciones sobre todos los módulos.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={tempIsAdmin} onChange={handleToggleAdmin} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {!tempIsAdmin && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Rol Predeterminado del Sistema</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {roles.map((role, rIdx) => {
                          const isSelected = tempRoleId === role.id;
                          return (
                            <button
                              key={`set_role_${role.id || rIdx}_${rIdx}`}
                              onClick={() => handleRoleSelect(role.id)}
                              className={`p-4 rounded-2xl border text-left transition-all ${
                                isSelected ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-white'
                              }`}
                            >
                              <p className="text-xs font-black mb-1">{role.name}</p>
                              <p className="text-[10px] text-gray-500 leading-snug">{role.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!tempIsAdmin && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Permisos Específicos por Módulo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {MODULE_CONFIG.map((mod, modIdx) => {
                          const access = tempModuleAccess[mod.id] || 'assigned';
                          const IconComp = mod.icon;
                          return (
                            <div key={`set_mod_${mod.id || modIdx}_${modIdx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white rounded-xl text-slate-700 shadow-2xs">
                                  <IconComp size={16} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">{mod.name}</p>
                                  <p className="text-[10px] text-gray-400">{mod.description}</p>
                                </div>
                              </div>
                              <select
                                value={access}
                                onChange={e => handleModuleAccessChange(mod.id, e.target.value as any)}
                                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="all">Total (Todo)</option>
                                <option value="assigned">Solo Asignadas</option>
                                <option value="none">Sin Acceso</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 bg-white rounded-[2.5rem] border border-gray-100 text-gray-400 text-xs font-bold">
                Selecciona un integrante a la izquierda para configurar sus permisos.
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SettingsView;
