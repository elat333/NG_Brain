import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Plus, X, Trash, Check } from 'lucide-react';
import { Company, Industry } from '../../types';

export const normalizeText = (text: string): string => {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const cleanFirestoreData = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      if (typeof val === 'string' && val.trim() === '') {
        // Leave empty string or skip if needed, but do not set undefined
        result[key] = '';
      } else if (Array.isArray(val)) {
        result[key] = val.filter((item) => item !== undefined && item !== null);
      } else if (typeof val === 'object' && !(val instanceof Date)) {
        result[key] = cleanFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
};

export interface CompanyEditorViewProps {
  editingCompany: Company | null;
  newCompanyData: any;
  setNewCompanyData: (data: any) => void;
  allIndustries: Industry[];
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
  isSaving?: boolean;
}

export const CompanyEditorView: React.FC<CompanyEditorViewProps> = ({
  editingCompany,
  newCompanyData,
  setNewCompanyData,
  allIndustries = [],
  onCancel,
  onSave,
  isSaving = false,
}) => {
  const [industryInput, setIndustryInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addIndustry = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!(newCompanyData.industries || []).includes(trimmed)) {
      setNewCompanyData({
        ...newCompanyData,
        industries: [...(newCompanyData.industries || []), trimmed],
      });
    }
    setIndustryInput('');
    setShowSuggestions(false);
  };

  const removeIndustry = (name: string) => {
    setNewCompanyData({
      ...newCompanyData,
      industries: (newCompanyData.industries || []).filter((i: string) => i !== name),
    });
  };

  const filteredSuggestions = allIndustries
    .filter((ind) => normalizeText(ind.name).includes(normalizeText(industryInput)))
    .filter((ind) => !(newCompanyData.industries || []).includes(ind.name));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden text-left"
    >
      <div className="p-8 md:p-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-3xl ${
                editingCompany ? 'bg-slate-50 text-slate-600' : 'bg-green-50 text-green-600'
              }`}
            >
              {editingCompany ? <Building2 size={28} /> : <Plus size={28} />}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {editingCompany ? 'Editar Compañía' : 'Añadir Nueva Compañía'}
              </h2>
              <p className="text-gray-500">Registra una entidad jurídica o persona con RUC.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSave} className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          <div className="space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
              Identificación Legal
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                Razón Social / Nombre Comercial <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Multinacional S.A."
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                value={newCompanyData.name || ''}
                onChange={(e) =>
                  setNewCompanyData({ ...newCompanyData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  RUC <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1790000000001"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                  value={newCompanyData.ruc || ''}
                  onChange={(e) =>
                    setNewCompanyData({ ...newCompanyData, ruc: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  Industrias / Sectores
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-transparent rounded-[1.5rem] focus-within:ring-4 focus-within:ring-slate-50 focus-within:bg-white focus-within:border-slate-100 transition-all min-h-[58px]">
                  {(newCompanyData.industries || []).map((ind: string) => (
                    <span
                      key={ind}
                      className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 group"
                    >
                      {ind}
                      <button
                        type="button"
                        onClick={() => removeIndustry(ind)}
                        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={
                      (newCompanyData.industries || []).length > 0 ? '' : 'Ej: Tecnología'
                    }
                    className="flex-1 bg-transparent border-none outline-none text-gray-700 font-medium p-2 text-sm min-w-[100px]"
                    value={industryInput}
                    onChange={(e) => {
                      setIndustryInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIndustry(industryInput);
                      }
                    }}
                  />
                </div>

                {showSuggestions && (industryInput || filteredSuggestions.length > 0) && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {filteredSuggestions.map((ind) => (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => addIndustry(ind.name)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl text-sm font-bold text-gray-700 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        {ind.name}
                        <Plus size={14} className="text-gray-300 group-hover:text-blue-500" />
                      </button>
                    ))}
                    {industryInput &&
                      !allIndustries.some(
                        (i) => normalizeText(i.name) === normalizeText(industryInput)
                      ) && (
                        <button
                          type="button"
                          onClick={() => addIndustry(industryInput)}
                          className="w-full text-left px-4 py-3 bg-blue-50/50 hover:bg-blue-50 rounded-xl text-sm font-bold text-blue-600 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Plus size={14} /> Añadir nueva industria: "{industryInput}"
                        </button>
                      )}
                    {filteredSuggestions.length === 0 && !industryInput && (
                      <div className="px-4 py-3 text-xs text-gray-400">
                        Escribe para buscar o añadir...
                      </div>
                    )}
                  </div>
                )}
                {showSuggestions && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSuggestions(false)}
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                Descripción de la Compañía
              </label>
              <textarea
                placeholder="Describe la actividad principal, historia o propuesta de valor de la empresa..."
                className="w-full h-32 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium resize-none"
                value={newCompanyData.description || ''}
                onChange={(e) =>
                  setNewCompanyData({ ...newCompanyData, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                Dirección Matriz
              </label>
              <input
                type="text"
                placeholder="Ej: Av. Amazonas N32-123..."
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                value={newCompanyData.mainAddress || ''}
                onChange={(e) =>
                  setNewCompanyData({ ...newCompanyData, mainAddress: e.target.value })
                }
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  Sucursales
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setNewCompanyData({
                      ...newCompanyData,
                      branchAddresses: [...(newCompanyData.branchAddresses || []), ''],
                    })
                  }
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus size={12} /> Añadir Sucursal
                </button>
              </div>
              <div className="space-y-3">
                {(newCompanyData.branchAddresses || []).map((branch: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Sucursal ${idx + 1}`}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-gray-100 transition-all text-sm"
                      value={branch}
                      onChange={(e) => {
                        const updated = [...newCompanyData.branchAddresses];
                        updated[idx] = e.target.value;
                        setNewCompanyData({ ...newCompanyData, branchAddresses: updated });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = newCompanyData.branchAddresses.filter(
                          (_: any, i: number) => i !== idx
                        );
                        setNewCompanyData({ ...newCompanyData, branchAddresses: updated });
                      }}
                      className="p-2 text-gray-300 hover:text-red-500 cursor-pointer"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
              Contacto y Web
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  Email Corporativo
                </label>
                <input
                  type="email"
                  placeholder="admin@compania.com"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                  value={newCompanyData.email || ''}
                  onChange={(e) =>
                    setNewCompanyData({ ...newCompanyData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="+593 ..."
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                  value={newCompanyData.phone || ''}
                  onChange={(e) =>
                    setNewCompanyData({ ...newCompanyData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                Sitio Web
              </label>
              <input
                type="text"
                placeholder="ej: novagreen.ec"
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                value={newCompanyData.website || ''}
                onChange={(e) =>
                  setNewCompanyData({ ...newCompanyData, website: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                Notas Adicionales
              </label>
              <textarea
                placeholder="Información relevante sobre la compañía..."
                className="w-full h-32 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium resize-none"
                value={newCompanyData.notes || ''}
                onChange={(e) =>
                  setNewCompanyData({ ...newCompanyData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <div className="lg:col-span-2 pt-6 flex flex-col md:flex-row gap-4 border-t border-gray-50 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-10 py-5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all order-2 md:order-1 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-5 bg-slate-800 disabled:opacity-50 text-white font-bold rounded-[1.5rem] shadow-xl shadow-slate-100 hover:bg-slate-900 transition-all order-1 md:order-2 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Check size={20} />
              {isSaving
                ? 'Guardando...'
                : editingCompany
                ? 'Actualizar Compañía'
                : 'Registrar Compañía'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
