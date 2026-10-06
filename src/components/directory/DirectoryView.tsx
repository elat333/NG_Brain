import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import * as XLSX from 'xlsx';
import {
  Users,
  Building2,
  Layers,
  Search,
  Mail,
  Phone,
  Edit,
  Trash,
  Download,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Truck,
  HeartHandshake,
  Tag,
  Plus
} from 'lucide-react';
import { TeamMember, Company, Industry, Process, SystemRole, PersonCategory } from '../../types';
import { getModuleAccess } from '../../lib/permissions';
import { ModulePermissionsTab } from '../common/ModulePermissionsTab';
import { Member360View, BreadcrumbItem } from './Member360View';
import { Company360View } from './Company360View';
import { validateIdentification } from '../../lib/fiscalValidators';

interface DirectoryViewProps {
  currentMember?: TeamMember | null;
  directorySubTab: 'people' | 'companies' | 'industries' | 'permissions';
  setDirectorySubTab: (tab: 'people' | 'companies' | 'industries' | 'permissions') => void;
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
  navigateWithUnsavedCheck?: (action: any) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  currentMember,
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
  navigateWithUnsavedCheck,
}) => {
  const isSysAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
  const directoryAccess = getModuleAccess(currentMember, roles, 'directory');
  const canDelete = isSysAdmin || directoryAccess === 'administrador';
  const canEdit = isSysAdmin || directoryAccess === 'colaborador' || directoryAccess === 'lider' || directoryAccess === 'administrador';

  // Segment Filter for People (Tryton Party Categories)
  const [personSegmentFilter, setPersonSegmentFilter] = useState<'all' | 'colaborador' | 'alumno' | 'docente' | 'cliente' | 'proveedor' | 'aliado' | 'contacto'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fullscreen 360 Views State (Tryton Party 360)
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [viewingCompanyState, setViewingCompanyState] = useState<Company | null>(null);

  // Navigation History Stack (Breadcrumb Trail)
  const [navHistory, setNavHistory] = useState<BreadcrumbItem[]>([]);

  // Navigation Stack Handlers
  const handleOpenMember360 = (member: TeamMember) => {
    setNavHistory([{ id: member.id, name: member.name, type: 'member' }]);
    setViewingMember(member);
    setViewingCompanyState(null);
    setIsAddingMember(false);
    setIsAddingCompany(false);
  };

  const handleOpenCompany360 = (company: Company) => {
    setNavHistory([{ id: company.id, name: company.name, type: 'company' }]);
    setViewingCompanyState(company);
    setViewingMember(null);
    setIsAddingMember(false);
    setIsAddingCompany(false);
  };

  const handleNavigateToMember = (targetMember: TeamMember) => {
    setNavHistory(prev => [...prev, { id: targetMember.id, name: targetMember.name, type: 'member' }]);
    setViewingMember(targetMember);
    setViewingCompanyState(null);
    setIsAddingMember(false);
    setIsAddingCompany(false);
  };

  const handleNavigateToCompany = (targetCompany: Company) => {
    setNavHistory(prev => [...prev, { id: targetCompany.id, name: targetCompany.name, type: 'company' }]);
    setViewingCompanyState(targetCompany);
    setViewingMember(null);
    setIsAddingMember(false);
    setIsAddingCompany(false);
  };

  const handlePopNav = () => {
    if (navHistory.length <= 1) {
      setNavHistory([]);
      setViewingMember(null);
      setViewingCompanyState(null);
      setIsAddingMember(false);
      setIsAddingCompany(false);
      return;
    }
    const nextHistory = navHistory.slice(0, navHistory.length - 1);
    const target = nextHistory[nextHistory.length - 1];
    setNavHistory(nextHistory);
    if (target.type === 'member') {
      const mem = members.find(m => m.id === target.id);
      if (mem) {
        setViewingMember(mem);
        setViewingCompanyState(null);
      }
    } else {
      const comp = companies.find(c => c.id === target.id);
      if (comp) {
        setViewingCompanyState(comp);
        setViewingMember(null);
      }
    }
  };

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === -1) {
      setNavHistory([]);
      setViewingMember(null);
      setViewingCompanyState(null);
      setIsAddingMember(false);
      setIsAddingCompany(false);
      return;
    }
    const nextHistory = navHistory.slice(0, index + 1);
    const target = nextHistory[nextHistory.length - 1];
    setNavHistory(nextHistory);
    if (target.type === 'member') {
      const mem = members.find(m => m.id === target.id);
      if (mem) {
        setViewingMember(mem);
        setViewingCompanyState(null);
      }
    } else {
      const comp = companies.find(c => c.id === target.id);
      if (comp) {
        setViewingCompanyState(comp);
        setViewingMember(null);
      }
    }
  };

  // Direct Firestore Persistence Handlers for 360 In-Place Edit / Create
  const handleSaveMemberDirect = async (data: Partial<TeamMember>) => {
    const isNew = isAddingMember || !viewingMember;
    const targetId = isNew ? `mem_${Date.now()}` : (viewingMember?.id || data.id || `mem_${Date.now()}`);
    const cleanData: TeamMember = {
      ...data,
      id: targetId,
      name: data.name?.trim() || 'Sin Nombre',
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {}),
    } as TeamMember;

    await setDoc(doc(db, 'members', targetId), cleanData);
    setViewingMember(cleanData);
    setIsAddingMember(false);
  };

  const handleSaveCompanyDirect = async (data: Partial<Company>) => {
    const isNew = isAddingCompany || !viewingCompanyState;
    const targetId = isNew ? `comp_${Date.now()}` : (viewingCompanyState?.id || data.id || `comp_${Date.now()}`);
    const cleanData: Company = {
      ...data,
      id: targetId,
      name: data.name?.trim() || 'Sin Nombre',
      ruc: data.ruc?.trim() || '',
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {}),
    } as Company;

    await setDoc(doc(db, 'companies', targetId), cleanData);
    setViewingCompanyState(cleanData);
    setIsAddingCompany(false);
  };

  // Category counts for quick tabs
  const categoryCounts = useMemo(() => {
    const counts = {
      all: members.length,
      colaborador: 0,
      alumno: 0,
      docente: 0,
      cliente: 0,
      proveedor: 0,
      aliado: 0,
      contacto: 0,
    };

    members.forEach(m => {
      const cats = m.categories || [];
      if (cats.includes('miembro') || cats.includes('colaborador')) counts.colaborador++;
      if (cats.includes('alumno')) counts.alumno++;
      if (cats.includes('docente')) counts.docente++;
      if (cats.includes('cliente')) counts.cliente++;
      if (cats.includes('proveedor')) counts.proveedor++;
      if (cats.includes('aliado')) counts.aliado++;
      if (cats.includes('contacto')) counts.contacto++;
    });

    return counts;
  }, [members]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return sortedMembers.filter(m => {
      const matchesSearch = 
        !searchQuery ||
        normalizeText(m.name).includes(normalizeText(searchQuery)) ||
        normalizeText(m.role || '').includes(normalizeText(searchQuery)) ||
        normalizeText(m.identificationId || '').includes(normalizeText(searchQuery)) ||
        normalizeText(m.ruc || '').includes(normalizeText(searchQuery)) ||
        normalizeText(m.email || '').includes(normalizeText(searchQuery)) ||
        normalizeText(m.phone || '').includes(normalizeText(searchQuery)) ||
        (m.categories || []).some(cat => normalizeText(cat).includes(normalizeText(searchQuery))) ||
        normalizeText(m.notes || '').includes(normalizeText(searchQuery));

      if (!matchesSearch) return false;

      if (personSegmentFilter === 'all') return true;
      const cats = m.categories || [];
      if (personSegmentFilter === 'colaborador') {
        return cats.includes('miembro') || cats.includes('colaborador');
      }
      return cats.includes(personSegmentFilter as PersonCategory);
    });
  }, [sortedMembers, searchQuery, personSegmentFilter, normalizeText]);

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(
      c =>
        !searchQuery ||
        normalizeText(c.name).includes(normalizeText(searchQuery)) ||
        normalizeText(c.ruc).includes(normalizeText(searchQuery)) ||
        normalizeText(c.industry || '').includes(normalizeText(searchQuery)) ||
        (c.industries || []).some(ind => normalizeText(ind).includes(normalizeText(searchQuery))) ||
        normalizeText(c.description || '').includes(normalizeText(searchQuery)) ||
        normalizeText(c.notes || '').includes(normalizeText(searchQuery))
    );
  }, [companies, searchQuery, normalizeText]);

  // Paginated Slices
  const totalMemberPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const totalCompanyPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, personSegmentFilter, directorySubTab]);

  // Export to Excel
  const exportToExcel = () => {
    if (directorySubTab === 'people') {
      const data = filteredMembers.map(m => {
        const company = companies.find(
          c => m.companyAssociations && m.companyAssociations.some(ca => ca.companyId === c.id)
        );
        return {
          'Nombre Completo': m.name,
          'Cédula': m.identificationId || '',
          'RUC Personal': m.ruc || '',
          'Categorías': (m.categories || []).join(', '),
          'Cargo': m.role || '',
          'Empresa': company?.name || 'Independiente',
          'Correo': m.email || '',
          'Teléfono': m.phone || '',
          'Notas': m.notes || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personas');
      XLSX.writeFile(wb, `Directorio_Personas_${personSegmentFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (directorySubTab === 'companies') {
      const data = filteredCompanies.map(c => ({
        'Razón Social': c.name,
        'RUC': c.ruc,
        'Sectores': (c.industries || []).join(', ') || c.industry || '',
        'Dirección Matriz': c.mainAddress || c.address || '',
        'Sucursales': (c.branchAddresses || []).length,
        'Correo': c.email || '',
        'Teléfono': c.phone || '',
        'Sitio Web': c.website || '',
        'Notas': c.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Compañías');
      XLSX.writeFile(wb, `Directorio_Companias_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  return (
    <motion.div
      key="directory"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* 1. Fullscreen / In-Place Unified Member 360 View */}
      {viewingMember || isAddingMember ? (
        <Member360View
          member={viewingMember}
          isCreating={isAddingMember}
          breadcrumbs={navHistory}
          allMembers={members}
          companies={companies}
          processes={processes}
          roles={roles}
          onBack={handlePopNav}
          onNavigateBreadcrumb={handleNavigateBreadcrumb}
          onNavigateToMember={handleNavigateToMember}
          onNavigateToCompany={handleNavigateToCompany}
          onSaveMember={handleSaveMemberDirect}
          onCancel={() => {
            setIsAddingMember(false);
            setViewingMember(null);
            setNavHistory([]);
          }}
          onDeleteMember={handleDeleteMember}
          canDelete={canDelete}
        />
      ) : viewingCompanyState || isAddingCompany ? (
        /* 2. Fullscreen / In-Place Unified Company 360 View */
        <Company360View
          company={viewingCompanyState}
          isCreating={isAddingCompany}
          breadcrumbs={navHistory}
          allCompanies={companies}
          allMembers={members}
          allIndustries={industries}
          onBack={handlePopNav}
          onNavigateBreadcrumb={handleNavigateBreadcrumb}
          onNavigateToMember={handleNavigateToMember}
          onNavigateToCompany={handleNavigateToCompany}
          onSaveCompany={handleSaveCompanyDirect}
          onCancel={() => {
            setIsAddingCompany(false);
            setViewingCompanyState(null);
            setNavHistory([]);
          }}
          onDeleteCompany={handleDeleteCompany}
          canDelete={canDelete}
        />
      ) : (
        /* 3. Main Directory Tables & Directory Sub-tabs */
        <>
          {/* Main Top Navigation */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setDirectorySubTab('people')}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  directorySubTab === 'people'
                    ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <Users size={16} />
                Personas ({members.length})
              </button>
              <button
                onClick={() => setDirectorySubTab('companies')}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  directorySubTab === 'companies'
                    ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <Building2 size={16} />
                Compañías ({companies.length})
              </button>
              <button
                onClick={() => setDirectorySubTab('industries')}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  directorySubTab === 'industries'
                    ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <Layers size={16} />
                Industrias ({industries.length})
              </button>
              <button
                onClick={() => setDirectorySubTab('permissions')}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  directorySubTab === 'permissions'
                    ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <ShieldCheck size={16} />
                Permisos
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Add New Record Buttons */}
              {canEdit && directorySubTab === 'people' && (
                <button
                  onClick={() => {
                    setNavHistory([{ id: 'new', name: 'Nueva Persona', type: 'member' }]);
                    setIsAddingMember(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-ng-black bg-ng-lime hover:brightness-105 shadow-md shadow-ng-lime/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus size={15} />
                  Nueva Persona
                </button>
              )}

              {canEdit && directorySubTab === 'companies' && (
                <button
                  onClick={() => {
                    setNavHistory([{ id: 'new', name: 'Nueva Compañía', type: 'company' }]);
                    setIsAddingCompany(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-ng-black bg-ng-lime hover:brightness-105 shadow-md shadow-ng-lime/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus size={15} />
                  Nueva Compañía
                </button>
              )}

              {(directorySubTab === 'people' || directorySubTab === 'companies') && (
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  title="Exportar a Excel (.xlsx)"
                >
                  <Download size={14} className="text-emerald-600" />
                  Exportar Excel
                </button>
              )}

              {searchQuery && directorySubTab !== 'permissions' && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] font-bold text-blue-700">
                    Filtrado por: <strong>"{searchQuery}"</strong>
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Category Chips (Only on People Tab) */}
          {directorySubTab === 'people' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'all', label: 'Todos', count: categoryCounts.all, icon: Users },
                { id: 'colaborador', label: 'Colaboradores', count: categoryCounts.colaborador, icon: UserCheck },
                { id: 'alumno', label: 'Alumnos / Capacitados', count: categoryCounts.alumno, icon: GraduationCap },
                { id: 'docente', label: 'Docentes / Instructores', count: categoryCounts.docente, icon: Briefcase },
                { id: 'cliente', label: 'Clientes (CRM)', count: categoryCounts.cliente, icon: Building2 },
                { id: 'proveedor', label: 'Proveedores', count: categoryCounts.proveedor, icon: Truck },
                { id: 'aliado', label: 'Aliados', count: categoryCounts.aliado, icon: HeartHandshake },
                { id: 'contacto', label: 'Contactos', count: categoryCounts.contacto, icon: Tag },
              ].map(chip => {
                const isSelected = personSegmentFilter === chip.id;
                const IconComponent = chip.icon;
                return (
                  <button
                    key={`seg_chip_${chip.id}`}
                    onClick={() => setPersonSegmentFilter(chip.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    <IconComponent size={13} className={isSelected ? 'text-ng-lime' : 'text-gray-400'} />
                    <span>{chip.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {directorySubTab === 'permissions' ? (
            <ModulePermissionsTab
              moduleId="directory"
              moduleName="Directorio Organizacional"
              currentMember={currentMember}
              members={members}
              processes={processes}
              roles={roles as any}
            />
          ) : directorySubTab === 'people' ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden text-left">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Persona</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identificación / RUC</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Categoría</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cargo & Empresa</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedMembers.map((member, mIdx) => {
                      const company = companies.find(
                        c => member.companyAssociations && member.companyAssociations.some(ca => ca.companyId === c.id)
                      );
                      const idVal = member.identificationId ? validateIdentification(member.identificationId) : null;

                      return (
                        <tr key={`dir_mem_${member.id || mIdx}_${mIdx}`} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-3.5">
                            <div
                              className="flex items-center gap-3 cursor-pointer group/name"
                              onClick={() => handleOpenMember360(member)}
                              title="Ver Ficha 360°"
                            >
                              <img
                                src={member.avatar || `https://picsum.photos/seed/${member.name.replace(/\s/g, '')}/100/100`}
                                className="w-9 h-9 rounded-xl object-cover shadow-sm shrink-0 ring-2 ring-transparent group-hover/name:ring-blue-400 transition-all"
                                alt=""
                              />
                              <div>
                                <span className="font-bold text-gray-800 text-sm block group-hover/name:text-blue-600 transition-colors">
                                  {member.name}
                                </span>
                                {member.personality && (
                                  <span className="text-[10px] text-gray-400 italic block truncate max-w-[180px]">
                                    {member.personality}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="space-y-0.5">
                              {member.identificationId ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-gray-700">
                                    {member.identificationId}
                                  </span>
                                  {idVal && idVal.isValid && (
                                    <span title={idVal.message} className="cursor-help">
                                      <CheckCircle2 size={13} className="text-emerald-500" />
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300 italic">Sin Cédula</span>
                              )}
                              {member.ruc && (
                                <p className="text-[10px] font-medium text-blue-600 bg-blue-50/50 px-1.5 py-0.2 rounded w-fit">
                                  RUC: {member.ruc}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {(member.categories || []).map((cat, cIdx) => (
                                <span
                                  key={`member_cat_${cat}_${cIdx}`}
                                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${
                                    cat === 'miembro' || cat === 'colaborador'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : cat === 'alumno'
                                      ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                      : cat === 'docente'
                                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                                      : cat === 'cliente'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : cat === 'proveedor'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-gray-800 block">{member.role || '-'}</span>
                              <p className="text-[11px] text-gray-500">{company?.name || 'Independiente'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="space-y-1">
                              {member.email && (
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                  <Mail size={12} className="text-gray-400 shrink-0" />
                                  <span className="truncate max-w-[160px]">{member.email}</span>
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                  <Phone size={12} className="text-gray-400 shrink-0" />
                                  <span>{member.phone}</span>
                                </div>
                              )}
                              {!member.email && !member.phone && (
                                <span className="text-xs text-gray-300 italic">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleOpenMember360(member)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm cursor-pointer"
                                title="Ver y editar ficha 360°"
                              >
                                <Edit size={15} />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteMember(member)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm cursor-pointer"
                                  title="Eliminar persona"
                                >
                                  <Trash size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredMembers.length === 0 && (
                <div className="py-16 text-center">
                  <Users size={44} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 font-bold text-sm">No se encontraron personas con los filtros seleccionados.</p>
                  <p className="text-gray-400 text-xs mt-1">Prueba cambiando el segmento o el término de búsqueda.</p>
                </div>
              )}

              {/* Pagination Controls */}
              {filteredMembers.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-slate-50/50 text-xs font-bold text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Mostrando {paginatedMembers.length} de {filteredMembers.length} personas</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 cursor-pointer"
                    >
                      <option value={10}>10 por pág.</option>
                      <option value={25}>25 por pág.</option>
                      <option value={50}>50 por pág.</option>
                      <option value={100}>100 por pág.</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Página {currentPage} de {totalMemberPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalMemberPages, p + 1))}
                      disabled={currentPage === totalCompanyPages}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : directorySubTab === 'companies' ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden text-left">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Compañía</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">RUC</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sectores / Industrias</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Dirección & Sucursales</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedCompanies.map((company, cIdx) => (
                      <tr key={`dir_comp_${company.id || cIdx}_${cIdx}`} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div
                            className="flex items-center gap-3 cursor-pointer group/name"
                            onClick={() => handleOpenCompany360(company)}
                            title="Ver Ficha 360°"
                          >
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0 ring-2 ring-transparent group-hover/name:ring-blue-400 group-hover/name:bg-blue-50 group-hover/name:text-blue-600 transition-all">
                              <Building2 size={20} />
                            </div>
                            <span className="font-bold text-gray-800 group-hover/name:text-blue-600 transition-colors text-sm">
                              {company.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">{company.ruc}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {company.industries && company.industries.length > 0 ? (
                              company.industries.slice(0, 2).map((ind, i) => (
                                <span
                                  key={`comp_ind_${ind}_${i}`}
                                  className="text-[9px] font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 uppercase tracking-wider"
                                >
                                  {ind}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] font-bold text-gray-400 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 uppercase tracking-wider">
                                {company.industry || 'General'}
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
                            <p className="text-xs font-bold text-gray-700 max-w-[220px] truncate">
                              {company.mainAddress || company.address || '-'}
                            </p>
                            {company.branchAddresses && company.branchAddresses.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                <Building2 size={11} />
                                {company.branchAddresses.length} sucursal(es)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {company.email && (
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                <Mail size={12} className="text-gray-400 shrink-0" />
                                <span className="truncate max-w-[160px]">{company.email}</span>
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                <Phone size={12} className="text-gray-400 shrink-0" />
                                <span>{company.phone}</span>
                              </div>
                            )}
                            {!company.email && !company.phone && (
                              <span className="text-xs text-gray-300 italic">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleOpenCompany360(company)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm cursor-pointer"
                              title="Ver y editar ficha 360°"
                            >
                              <Edit size={16} />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteCompany(company.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm cursor-pointer"
                                title="Eliminar compañía"
                              >
                                <Trash size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCompanies.length === 0 && (
                <div className="py-20 text-center">
                  <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-bold text-sm">No se encontraron compañías con los filtros actuales.</p>
                </div>
              )}

              {/* Pagination Controls for Companies */}
              {filteredCompanies.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-slate-50/50 text-xs font-bold text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Mostrando {paginatedCompanies.length} de {filteredCompanies.length} compañías</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 cursor-pointer"
                    >
                      <option value={10}>10 por pág.</option>
                      <option value={25}>25 por pág.</option>
                      <option value={50}>50 por pág.</option>
                      <option value={100}>100 por pág.</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Página {currentPage} de {totalCompanyPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalCompanyPages, p + 1))}
                      disabled={currentPage === totalCompanyPages}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
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
                        {canDelete && (
                          <button
                            onClick={async () => {
                              if (window.confirm('¿Deseas eliminar este sector? Solo se eliminará de la lista maestra.')) {
                                setIndustries(prev => prev.filter(ind => ind.id !== industry.id));
                                try {
                                  await deleteDoc(doc(db, 'industries', industry.id));
                                } catch (e) {
                                  console.error('Error al borrar industria de Firestore:', e);
                                }
                              }
                            }}
                            className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Eliminar sector"
                          >
                            <Trash size={14} />
                          </button>
                        )}
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
