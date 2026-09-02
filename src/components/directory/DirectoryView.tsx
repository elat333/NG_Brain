import React from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Building2,
  Layers,
  Search,
  Mail,
  Phone,
  Edit,
  Trash,
} from 'lucide-react';
import { TeamMember, Company, Industry, Process, SystemRole } from '../../types';
import { MemberEditorView } from '../common/MemberEditorView';
import { CompanyEditorView } from '../common/CompanyEditorView';

interface DirectoryViewProps {
  directorySubTab: 'people' | 'companies' | 'industries';
  setDirectorySubTab: (tab: 'people' | 'companies' | 'industries') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  members: TeamMember[];
  sortedMembers: TeamMember[];
  companies: Company[];
  industries: Industry[];
  setIndustries: React.Dispatch<React.SetStateAction<Industry[]>>;
  processes: Process[];
  roles: SystemRole[];
  isAddingMember: boolean;
  setIsAddingMember: (val: boolean) => void;
  editingMember: TeamMember | null;
  setEditingMember: (member: TeamMember | null) => void;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  handleAddMember: (e?: React.FormEvent) => void | Promise<void>;
  openEditMember: (member: TeamMember) => void;
  handleDeleteMember: (member: TeamMember) => void;
  isAddingCompany: boolean;
  setIsAddingCompany: (val: boolean) => void;
  editingCompany: Company | null;
  setEditingCompany: (company: Company | null) => void;
  newCompanyData: any;
  setNewCompanyData: (data: any) => void;
  handleAddCompany: (e?: React.FormEvent) => void | Promise<void>;
  openEditCompany: (company: Company) => void;
  handleDeleteCompany: (id: string) => void;
  setViewingCompany: (company: Company) => void;
  normalizeText: (text: string) => string;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  directorySubTab,
  setDirectorySubTab,
  searchQuery,
  setSearchQuery,
  members,
  sortedMembers,
  companies,
  industries,
  setIndustries,
  processes,
  roles,
  isAddingMember,
  setIsAddingMember,
  editingMember,
  setEditingMember,
  newMemberData,
  setNewMemberData,
  handleAddMember,
  openEditMember,
  handleDeleteMember,
  isAddingCompany,
  setIsAddingCompany,
  editingCompany,
  setEditingCompany,
  newCompanyData,
  setNewCompanyData,
  handleAddCompany,
  openEditCompany,
  handleDeleteCompany,
  setViewingCompany,
  normalizeText,
}) => {
  return (
    <motion.div
      key="directory"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {isAddingMember || editingMember ? (
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
              isSystemAdmin: false,
              moduleAccess: undefined,
              categories: ['contacto'],
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
            });
          }}
          onSave={handleAddMember}
        />
      ) : isAddingCompany || editingCompany ? (
        <CompanyEditorView
          editingCompany={editingCompany}
          newCompanyData={newCompanyData}
          setNewCompanyData={setNewCompanyData}
          allIndustries={industries}
          onCancel={() => {
            setIsAddingCompany(false);
            setEditingCompany(null);
            setNewCompanyData({
              name: '',
              ruc: '',
              description: '',
              email: '',
              phone: '',
              website: '',
              mainAddress: '',
              branchAddresses: [],
              industries: [],
              notes: '',
            });
          }}
          onSave={handleAddCompany}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDirectorySubTab('people')}
                className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  directorySubTab === 'people'
                    ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20'
                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                Personas ({members.length})
              </button>
              <button
                onClick={() => setDirectorySubTab('companies')}
                className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  directorySubTab === 'companies'
                    ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20'
                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                Compañías ({companies.length})
              </button>
              <button
                onClick={() => setDirectorySubTab('industries')}
                className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  directorySubTab === 'industries'
                    ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20'
                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                Industrias ({industries.length})
              </button>
            </div>

            {searchQuery && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
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
          </div>

          {directorySubTab === 'people' ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Persona</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Categoría</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cargo</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Empresa / RUC</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedMembers
                    .filter(
                      m =>
                        normalizeText(m.name).includes(normalizeText(searchQuery)) ||
                        normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                        (m.categories || []).some(cat => normalizeText(cat).includes(normalizeText(searchQuery))) ||
                        normalizeText(m.notes || '').includes(normalizeText(searchQuery))
                    )
                    .map((member, mIdx) => {
                      const company = companies.find(
                        c => member.companyAssociations && member.companyAssociations.some(ca => ca.companyId === c.id)
                      );
                      return (
                        <tr key={`dir_mem_${member.id || mIdx}_${mIdx}`} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatar || `https://picsum.photos/seed/${member.name.replace(/\s/g, '')}/100/100`}
                                className="w-10 h-10 rounded-xl object-cover shadow-sm"
                                alt=""
                              />
                              <span className="font-bold text-gray-800">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(member.categories || []).map((cat, cIdx) => (
                                <span
                                  key={`member_cat_${cat}_${cIdx}`}
                                  className="px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-50 bg-white text-blue-600"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-500">{member.role || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-gray-700">{company?.name || 'Independiente'}</p>
                              {member.ruc && <p className="text-[10px] font-medium text-gray-400">RUC: {member.ruc}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {member.email && (
                                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                  <Mail size={12} className="text-gray-300" />
                                  {member.email}
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                  <Phone size={12} className="text-gray-300" />
                                  {member.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => openEditMember(member)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : directorySubTab === 'companies' ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Compañía</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">RUC</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sector</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Dirección</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companies
                    .filter(
                      c =>
                        normalizeText(c.name).includes(normalizeText(searchQuery)) ||
                        normalizeText(c.ruc).includes(normalizeText(searchQuery)) ||
                        normalizeText(c.industry || '').includes(normalizeText(searchQuery)) ||
                        (c.industries || []).some(ind => normalizeText(ind).includes(normalizeText(searchQuery))) ||
                        normalizeText(c.description || '').includes(normalizeText(searchQuery)) ||
                        normalizeText(c.notes || '').includes(normalizeText(searchQuery))
                    )
                    .map((company, cIdx) => (
                      <tr key={`dir_comp_${company.id || cIdx}_${cIdx}`} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingCompany(company)}>
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                              <Building2 size={20} />
                            </div>
                            <span className="font-bold text-gray-800 hover:text-blue-600 transition-colors">{company.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">{company.ruc}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {company.industries && company.industries.length > 0 ? (
                              company.industries.slice(0, 2).map((ind, i) => (
                                <span
                                  key={`comp_ind_${ind}_${i}`}
                                  className="text-[9px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100 uppercase tracking-widest"
                                >
                                  {ind}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] font-bold text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 uppercase tracking-widest">
                                N/A
                              </span>
                            )}
                            {company.industries && company.industries.length > 2 && (
                              <span className="text-[9px] font-bold text-slate-400 px-1.5 py-0.5">
                                + {company.industries.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-700 max-w-[200px] truncate">
                              {company.mainAddress || company.address || '-'}
                            </p>
                            {company.branchAddresses && company.branchAddresses.length > 0 && (
                              <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                <Building2 size={10} />
                                {company.branchAddresses.length} sucursal(es)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {company.email && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <Mail size={12} className="text-gray-300" />
                                {company.email}
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <Phone size={12} className="text-gray-300" />
                                {company.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => openEditCompany(company)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {companies.length === 0 && (
                <div className="py-20 text-center">
                  <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-medium">No hay compañías registradas.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {industries
                .filter(ind => normalizeText(ind.name).includes(normalizeText(searchQuery)))
                .map((industry, indIdx) => {
                  const associatedCompaniesCount = companies.filter(c => c.industries?.includes(industry.name)).length;
                  return (
                    <div
                      key={`dir_ind_${industry.id || indIdx}_${indIdx}`}
                      className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                          <Layers size={20} />
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('¿Deseas eliminar este sector? Solo se eliminará de la lista maestra.')) {
                              setIndustries(prev => prev.filter(ind => ind.id !== industry.id));
                            }
                          }}
                          className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">{industry.name}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 size={12} />
                        {associatedCompaniesCount} compañía(s) vinculada(s)
                      </p>
                    </div>
                  );
                })}
              {industries.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <Layers size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-medium">No hay industrias o sectores registrados.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default DirectoryView;
