import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Tag, 
  FileText, 
  ShieldCheck, 
  Award, 
  HardHat,
  CreditCard,
  Building
} from 'lucide-react';
import { Process, Company, Role, TeamMember } from '../../types';

interface MemberEditorViewProps {
  editingMember: TeamMember | null;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  processes: Process[];
  companies: Company[];
  roles: Role[];
  onCancel: () => void;
  onSave?: (e: React.FormEvent) => void;
}

export const MemberEditorView: React.FC<MemberEditorViewProps> = ({
  editingMember,
  newMemberData,
  setNewMemberData,
  processes,
  companies,
  roles,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'role' | 'companies' | 'profile'>('general');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyRoleInput, setCompanyRoleInput] = useState('');

  const availableCategories = [
    { id: 'miembro', label: 'Miembro de Equipo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'contacto', label: 'Contacto Externo', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'aliado', label: 'Aliado Estratégico', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'proveedor', label: 'Proveedor', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'cliente', label: 'Cliente', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ];

  const handleToggleCategory = (catId: string) => {
    const currentCats = Array.isArray(newMemberData.categories) ? newMemberData.categories : [];
    if (currentCats.includes(catId)) {
      setNewMemberData({
        ...newMemberData,
        categories: currentCats.filter((c: string) => c !== catId)
      });
    } else {
      setNewMemberData({
        ...newMemberData,
        categories: [...currentCats, catId]
      });
    }
  };

  const handleAddCompanyAssociation = () => {
    if (!selectedCompanyId) return;
    const currentAssocs = Array.isArray(newMemberData.companyAssociations) ? newMemberData.companyAssociations : [];
    if (currentAssocs.some((a: any) => a.companyId === selectedCompanyId)) return;

    setNewMemberData({
      ...newMemberData,
      companyAssociations: [
        ...currentAssocs,
        {
          companyId: selectedCompanyId,
          role: companyRoleInput.trim() || newMemberData.role || 'Representante'
        }
      ]
    });

    setSelectedCompanyId('');
    setCompanyRoleInput('');
  };

  const handleRemoveCompanyAssociation = (companyId: string) => {
    const currentAssocs = Array.isArray(newMemberData.companyAssociations) ? newMemberData.companyAssociations : [];
    setNewMemberData({
      ...newMemberData,
      companyAssociations: currentAssocs.filter((a: any) => a.companyId !== companyId)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-ng-lime text-ng-black flex items-center justify-center font-black text-lg shadow-md shadow-ng-lime/20">
            {newMemberData.name ? newMemberData.name.charAt(0).toUpperCase() : <User size={22} />}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {editingMember ? `Editar: ${editingMember.name}` : 'Añadir Nuevo Integrante / Contacto'}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Completa o modifica la información personal, profesional y corporativa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all flex items-center gap-2"
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!newMemberData.name?.trim()}
            className="px-6 py-2.5 bg-ng-lime text-ng-black rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-ng-lime/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {editingMember ? 'Guardar Cambios' : 'Registrar Persona'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-8 bg-white gap-2 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'general'
              ? 'border-ng-black text-ng-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <User size={15} />
          Datos Personales
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('role')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'role'
              ? 'border-ng-black text-ng-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Briefcase size={15} />
          Rol y Proceso
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'companies'
              ? 'border-ng-black text-ng-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Building2 size={15} />
          Compañías ({newMemberData.companyAssociations?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-ng-black text-ng-black'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Award size={15} />
          Habilidades y EPP
        </button>
      </div>

      {/* Form Body */}
      <div className="p-8">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User size={14} className="text-blue-500" />
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ing. Carlos Morales"
                  value={newMemberData.name || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-blue-500" />
                  Cédula / Identificación
                </label>
                <input
                  type="text"
                  placeholder="Ej: 0102030405"
                  value={newMemberData.identificationId || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, identificationId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Mail size={14} className="text-blue-500" />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={newMemberData.email || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone size={14} className="text-blue-500" />
                  Teléfono / Celular
                </label>
                <input
                  type="text"
                  placeholder="Ej: +593 99 123 4567"
                  value={newMemberData.phone || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Building size={14} className="text-blue-500" />
                  ¿Posee RUC Personal?
                </label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!newMemberData.hasRuc}
                      onChange={(e) => setNewMemberData({ ...newMemberData, hasRuc: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    Tiene RUC activo
                  </label>
                  {newMemberData.hasRuc && (
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      RUC: {newMemberData.identificationId ? `${newMemberData.identificationId}001` : 'Ingrese cédula'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Categorías */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Tag size={14} className="text-blue-500" />
                Categorías / Clasificación en el Directorio
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((cat, catIdx) => {
                  const isSelected = (newMemberData.categories || []).includes(cat.id);
                  return (
                    <button
                      key={`mem_edit_cat_btn_${cat.id || catIdx}_${catIdx}`}
                      type="button"
                      onClick={() => handleToggleCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? `${cat.color} ring-2 ring-offset-1 ring-blue-400 font-black shadow-sm`
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notas Generales */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-500" />
                Notas y Observaciones
              </label>
              <textarea
                rows={3}
                placeholder="Observaciones generales, horarios, notas de contacto..."
                value={newMemberData.notes || ''}
                onChange={(e) => setNewMemberData({ ...newMemberData, notes: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'role' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-blue-500" />
                  Cargo / Título Operativo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Gerente de Operaciones, Diseñador, Asesor Comercial"
                  value={newMemberData.role || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Building2 size={14} className="text-blue-500" />
                  Proceso Asignado
                </label>
                <select
                  value={newMemberData.processId || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, processId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option value="">Sin Proceso Asignado (General / Externo)</option>
                  {processes.map((p, pIdx) => (
                    <option key={`opt_proc_${p.id || pIdx}_${pIdx}`} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-500" />
                  Rol de Sistema (Permisos de Aplicación)
                </label>
                <select
                  value={newMemberData.systemRoleId || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, systemRoleId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                >
                  <option value="">Por defecto (Colaborador)</option>
                  {roles.map((r, rIdx) => (
                    <option key={`opt_role_${r.id || rIdx}_${rIdx}`} value={r.id}>
                      {r.name} - {r.description?.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 flex flex-col justify-end">
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isAdminCheck"
                    checked={!!newMemberData.isSystemAdmin}
                    onChange={(e) => setNewMemberData({ ...newMemberData, isSystemAdmin: e.target.checked })}
                    className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="isAdminCheck" className="text-xs font-bold text-red-900 cursor-pointer">
                    Acceso de Administrador Global
                    <p className="text-[10px] font-medium text-red-600/80">
                      Otorga control total para modificar todos los módulos, tareas y permisos.
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                Vincular a una Empresa o Cliente
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecciona una compañía...</option>
                    {companies.map((c, cIdx) => (
                      <option key={`opt_comp_${c.id || cIdx}_${cIdx}`} value={c.id}>
                        {c.name} {c.ruc ? `(${c.ruc})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <input
                    type="text"
                    placeholder="Cargo en esta empresa (opcional)"
                    value={companyRoleInput}
                    onChange={(e) => setCompanyRoleInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddCompanyAssociation}
                    disabled={!selectedCompanyId}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Vincular Empresa
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de empresas asociadas */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Empresas Asociadas ({newMemberData.companyAssociations?.length || 0})
              </h4>
              {(!newMemberData.companyAssociations || newMemberData.companyAssociations.length === 0) ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <Building2 size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400 font-medium">Esta persona figura como independiente o sin empresa asignada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newMemberData.companyAssociations.map((assoc: any, idx: number) => {
                    const comp = companies.find((c) => c.id === assoc.companyId);
                    return (
                      <div
                        key={`assoc_${assoc.companyId}_${idx}`}
                        className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800">{comp?.name || 'Compañía'}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{assoc.role || 'Sin cargo especificado'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCompanyAssociation(assoc.companyId)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Desvincular"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Award size={14} className="text-blue-500" />
                  Habilidades Principales (Separadas por comas)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Análisis de datos, Redacción técnica, ISO 9001, Figma"
                  value={newMemberData.skills || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, skills: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-blue-500" />
                  Responsabilidades Clave (Separadas por comas)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Elaboración de informes, Atención al cliente, Revisión de calidad"
                  value={newMemberData.responsibilities || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, responsibilities: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <HardHat size={14} className="text-blue-500" />
                  Equipos de Protección Personal (EPP)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Casco dieléctrico, Botas de seguridad punta de acero, Chaleco reflectivo"
                  value={newMemberData.epp || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, epp: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User size={14} className="text-blue-500" />
                  Perfil de Personalidad / Notas de Liderazgo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Proactivo, orientador al detalle, alta capacidad de resolución"
                  value={newMemberData.personality || ''}
                  onChange={(e) => setNewMemberData({ ...newMemberData, personality: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-slate-50/50">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!newMemberData.name?.trim()}
          className="px-8 py-2.5 bg-ng-lime text-ng-black rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-ng-lime/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {editingMember ? 'Guardar Cambios' : 'Registrar Persona'}
        </button>
      </div>
    </form>
  );
};
