import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  Edit,
  Printer,
  Plus,
  Trash2,
  ExternalLink,
  MessageSquare,
  Briefcase,
  Layers,
  GraduationCap,
  HardHat,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Save,
  X,
  Check
} from 'lucide-react';
import { Company, TeamMember, Industry, PartyRelation, PartyRelationType } from '../../types';
import { validateRucEcuador, checkIdentificationDuplicate } from '../../lib/fiscalValidators';
import { SearchableSelect } from '../common/SearchableSelect';
import { normalizeText } from '../../lib/textUtils';

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'member' | 'company';
}

interface Company360ViewProps {
  company?: Company | null;
  isCreating?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  allCompanies: Company[];
  allMembers: TeamMember[];
  allIndustries?: Industry[];
  onBack: () => void;
  onNavigateBreadcrumb?: (index: number) => void;
  onNavigateToMember: (member: TeamMember) => void;
  onNavigateToCompany: (company: Company) => void;
  onSaveCompany: (data: Partial<Company>) => Promise<void> | void;
  onCancel?: () => void;
  onDeleteCompany?: (id: string) => void;
  canDelete?: boolean;
}

export const Company360View: React.FC<Company360ViewProps> = ({
  company,
  isCreating = false,
  breadcrumbs = [],
  allCompanies = [],
  allMembers = [],
  allIndustries = [],
  onBack,
  onNavigateBreadcrumb,
  onNavigateToMember,
  onNavigateToCompany,
  onSaveCompany,
  onCancel,
  onDeleteCompany,
  canDelete = false,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(isCreating);
  const [activeTab, setActiveTab] = useState<'general' | 'locations' | 'members' | 'relations' | 'fiscal' | 'notes'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const defaultCompanyData = useMemo(() => ({
    name: company?.name || '',
    ruc: company?.ruc || '',
    commercialName: company?.commercialName || '',
    description: company?.description || '',
    email: company?.email || '',
    phone: company?.phone || '',
    website: company?.website || '',
    mainAddress: company?.mainAddress || company?.address || '',
    branchAddresses: company?.branchAddresses || [],
    industries: company?.industries || (company?.industry ? [company.industry] : []),
    industry: company?.industry || 'General',
    requiresEpp: !!company?.requiresEpp,
    notes: company?.notes || '',
    relations: company?.relations || [],
  }), [company]);

  const [formData, setFormData] = useState<any>(defaultCompanyData);

  useEffect(() => {
    setFormData(defaultCompanyData);
    setIsEditing(isCreating);
  }, [defaultCompanyData, isCreating]);

  // Branch Address inline creation state
  const [newBranchInput, setNewBranchInput] = useState('');

  // Industry tag input state
  const [industryInput, setIndustryInput] = useState('');
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);

  // Relations Modal / Inline state
  const [isAddingRelation, setIsAddingRelation] = useState(false);
  const [relationTargetType, setRelationTargetType] = useState<'company' | 'person'>('company');
  const [relationTargetId, setRelationTargetId] = useState('');
  const [relationType, setRelationType] = useState<PartyRelationType>('filial');
  const [relationRole, setRelationRole] = useState('');
  const [relationNotes, setRelationNotes] = useState('');

  // RUC Validation and Duplicate Check
  const rucValidation = useMemo(() => {
    const rucVal = isEditing ? formData.ruc : company?.ruc;
    if (!rucVal) return null;
    return validateRucEcuador(rucVal);
  }, [isEditing, formData.ruc, company?.ruc]);

  const duplicateCheck = useMemo(() => {
    const rucVal = isEditing ? formData.ruc : company?.ruc;
    if (!rucVal) return { isDuplicate: false };
    return checkIdentificationDuplicate(
      rucVal,
      allMembers,
      allCompanies,
      company?.id
    );
  }, [isEditing, formData.ruc, company?.ruc, allMembers, allCompanies, company?.id]);

  // Associated Members List
  const associatedMembers = useMemo(() => {
    if (!company) return [];
    return allMembers.filter(m =>
      m.companyAssociations && m.companyAssociations.some(ca => ca.companyId === company.id)
    );
  }, [company, allMembers]);

  // Branch Addresses Add/Remove
  const handleAddBranch = () => {
    const trimmed = newBranchInput.trim();
    if (!trimmed) return;
    const currentBranches = Array.isArray(formData.branchAddresses) ? formData.branchAddresses : [];
    if (!currentBranches.includes(trimmed)) {
      setFormData({
        ...formData,
        branchAddresses: [...currentBranches, trimmed]
      });
    }
    setNewBranchInput('');
  };

  const handleRemoveBranch = (index: number) => {
    const currentBranches = Array.isArray(formData.branchAddresses) ? formData.branchAddresses : [];
    setFormData({
      ...formData,
      branchAddresses: currentBranches.filter((_, i) => i !== index)
    });
  };

  // Industries Add/Remove
  const handleAddIndustry = (indName: string) => {
    const trimmed = indName.trim();
    if (!trimmed) return;
    const currentInds = Array.isArray(formData.industries) ? formData.industries : [];
    if (!currentInds.includes(trimmed)) {
      setFormData({
        ...formData,
        industries: [...currentInds, trimmed],
        industry: currentInds[0] || trimmed
      });
    }
    setIndustryInput('');
    setShowIndustrySuggestions(false);
  };

  const handleRemoveIndustry = (indName: string) => {
    const currentInds = Array.isArray(formData.industries) ? formData.industries : [];
    const filtered = currentInds.filter(i => i !== indName);
    setFormData({
      ...formData,
      industries: filtered,
      industry: filtered[0] || 'General'
    });
  };

  const filteredIndustrySuggestions = allIndustries
    .filter(ind => normalizeText(ind.name).includes(normalizeText(industryInput)))
    .filter(ind => !(formData.industries || []).includes(ind.name));

  // Cross-Relations Add/Remove
  const handleSaveRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationTargetId) return;

    let targetName = '';
    if (relationTargetType === 'company') {
      const comp = allCompanies.find(c => c.id === relationTargetId);
      targetName = comp?.name || 'Empresa';
    } else {
      const mem = allMembers.find(m => m.id === relationTargetId);
      targetName = mem?.name || 'Persona';
    }

    const newRel: PartyRelation = {
      id: `rel-${Date.now()}`,
      sourceId: company?.id || 'new',
      sourceType: 'company',
      targetId: relationTargetId,
      targetType: relationTargetType,
      targetName,
      relationType,
      roleOrPosition: relationRole,
      notes: relationNotes,
      createdAt: new Date().toISOString(),
    };

    const updatedRelations = [...(formData.relations || []), newRel];
    const updatedData = { ...formData, relations: updatedRelations };
    setFormData(updatedData);

    if (!isEditing && company) {
      await onSaveCompany(updatedData);
    }

    setIsAddingRelation(false);
    setRelationTargetId('');
    setRelationRole('');
    setRelationNotes('');
  };

  const handleDeleteRelation = async (relId: string) => {
    const updatedRelations = (formData.relations || []).filter((r: PartyRelation) => r.id !== relId);
    const updatedData = { ...formData, relations: updatedRelations };
    setFormData(updatedData);

    if (!isEditing && company) {
      await onSaveCompany(updatedData);
    }
  };

  // Submit Handler
  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!formData.name?.trim()) {
      setErrorMessage('La razón social o nombre de la empresa es obligatorio.');
      return;
    }
    if (!formData.ruc?.trim()) {
      setErrorMessage('El RUC de la empresa es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveCompany(formData);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar los datos de la compañía.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    if (isCreating && onCancel) {
      onCancel();
    } else {
      setFormData(defaultCompanyData);
      setIsEditing(false);
      setErrorMessage(null);
    }
  };

  const currentCompanyName = formData.name || company?.name || 'Nueva Compañía';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6 pb-12 max-w-7xl mx-auto"
    >
      {/* Top Action Bar & Interactive Breadcrumbs */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Breadcrumbs Trail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold text-gray-500">
          <button
            onClick={() => onNavigateBreadcrumb ? onNavigateBreadcrumb(-1) : onBack()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-ng-black transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Directorio</span>
          </button>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={`crumb_comp_${crumb.id}_${idx}`}>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
              <button
                onClick={() => onNavigateBreadcrumb && onNavigateBreadcrumb(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  idx === breadcrumbs.length - 1 && !isEditing
                    ? 'bg-blue-50 text-blue-700 font-black'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {crumb.type === 'company' ? <Building2 size={13} /> : <Users size={13} />}
                <span className="truncate max-w-[140px]">{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}

          {isEditing && (
            <>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-ng-lime/20 text-ng-black font-black text-[11px] uppercase tracking-wider shrink-0">
                {isCreating ? 'Creando Compañía' : 'Modo Edición'}
              </span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X size={15} />
                {isCreating ? 'Descartar' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-ng-black bg-ng-lime hover:brightness-105 shadow-md shadow-ng-lime/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={15} />
                {isSaving ? 'Guardando...' : isCreating ? 'Crear Empresa' : 'Guardar Cambios'}
              </button>
            </>
          ) : (
            <>
              {company?.phone && (
                <a
                  href={`https://wa.me/${company.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                >
                  <MessageSquare size={14} />
                  WhatsApp
                </a>
              )}
              {company?.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
                >
                  <Mail size={14} />
                  Correo
                </a>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all cursor-pointer"
              >
                <Printer size={14} />
                Imprimir
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-ng-black bg-ng-lime hover:brightness-105 shadow-md shadow-ng-lime/20 transition-all cursor-pointer"
              >
                <Edit size={14} />
                Editar Ficha
              </button>
              {canDelete && company && onDeleteCompany && (
                <button
                  onClick={() => onDeleteCompany(company.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  title="Eliminar compañía"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Corporate Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl relative overflow-hidden text-left">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
            <Building2 size={40} />
          </div>

          <div className="space-y-3 flex-1 w-full">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                    Razón Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Consorcio Ambiental del Ecuador S.A."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                    Nombre Comercial (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.commercialName}
                    onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                    placeholder="Ej. Novagreen Ecuador"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {company?.name || 'Compañía sin nombre'}
                </h1>
                {company?.commercialName && (
                  <p className="text-sm font-bold text-gray-500 mt-0.5">
                    Nombre Comercial: <span className="text-gray-800">{company.commercialName}</span>
                  </p>
                )}
              </div>
            )}

            {/* Quick summary badges */}
            {!isEditing && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-600 pt-1">
                <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-blue-900">
                  <Building2 size={14} className="text-blue-600" />
                  <span>RUC: <strong>{company?.ruc}</strong></span>
                  {rucValidation?.isValid && (
                    <span title="RUC válido SRI">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                  <Users size={14} className="text-gray-500" />
                  <span>{associatedMembers.length} persona(s) vinculada(s)</span>
                </div>

                {company?.branchAddresses && company.branchAddresses.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                    <MapPin size={14} className="text-gray-500" />
                    <span>{company.branchAddresses.length + 1} sedes / sucursales</span>
                  </div>
                )}
              </div>
            )}

            {/* Industries Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(formData.industries || []).map((ind: string, idx: number) => (
                <span
                  key={`ind_${ind}_${idx}`}
                  className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200 flex items-center gap-1"
                >
                  <Briefcase size={11} className="text-slate-400" />
                  {ind}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIndustry(ind)}
                      className="ml-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200">
        {[
          { id: 'general', label: 'Datos & Contacto', icon: Building2 },
          { id: 'locations', label: 'Matriz & Sucursales', icon: MapPin, count: ((formData.branchAddresses?.length || 0) + (formData.mainAddress ? 1 : 0)) || undefined },
          { id: 'members', label: 'Nómina de Personas', icon: Users, count: associatedMembers.length || undefined },
          { id: 'relations', label: 'Alianzas & Estructura', icon: Layers, count: formData.relations?.length || undefined },
          { id: 'fiscal', label: 'SRI & Sectores', icon: CreditCard, count: rucValidation?.isValid ? '✓' : undefined },
          { id: 'notes', label: 'Notas & Bitácora', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={`tab_comp_${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-ng-black text-white shadow-lg'
                  : 'text-gray-500 hover:bg-white hover:text-gray-900'
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-ng-lime text-ng-black' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {activeTab === 'general' && (
          <motion.div
            key="general_comp_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
          >
            {/* Contact Information */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={14} className="text-blue-500" /> Canales de Contacto Corporativo
              </h3>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Correo Electrónico</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contacto@empresa.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Teléfono Matriz / PBX</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="022123456 / 0991234567"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Sitio Web / Portal</label>
                    <div className="relative">
                      <Globe size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="www.empresa.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block">Correo Institucional</span>
                        <span className="text-xs font-bold text-gray-800">{company?.email || 'No registrado'}</span>
                      </div>
                    </div>
                    {company?.email && (
                      <a href={`mailto:${company.email}`} className="text-xs font-black text-blue-600 hover:underline">
                        Contactar
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block">Teléfono / PBX</span>
                        <span className="text-xs font-bold text-gray-800">{company?.phone || 'No registrado'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Globe size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block">Sitio Web</span>
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[200px]">
                          {company?.website || 'No registrado'}
                        </span>
                      </div>
                    </div>
                    {company?.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-black text-purple-600 hover:underline"
                      >
                        Visitar
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Corporate Overview & Policies */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} className="text-emerald-500" /> Resumen & Políticas de Seguridad
              </h3>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Descripción de Actividades</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Breve reseña de la actividad económica de la compañía..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Política de Dotación de EPP</span>
                      <span className="text-[10px] text-gray-500 block">
                        Si está activa, todos los colaboradores de esta empresa tendrán habilitado el control y entrega de EPP.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.requiresEpp}
                      onChange={(e) => setFormData({ ...formData, requiresEpp: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 min-h-[90px]">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Actividad Empresarial</span>
                    <p className="text-xs text-gray-700">{company?.description || 'Sin descripción corporativa registrada.'}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Dotación Obligatoria de EPP</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      company?.requiresEpp ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {company?.requiresEpp ? 'Habilitada' : 'No requerida'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'locations' && (
          <motion.div
            key="locations_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6 text-left"
          >
            <div>
              <h3 className="text-base font-black text-gray-900">Sedes, Oficinas y Sucursales</h3>
              <p className="text-xs text-gray-500">Dirección matriz registrada y establecimientos autorizados SRI.</p>
            </div>

            {/* Matriz */}
            <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-2">
              <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest block flex items-center gap-1.5">
                <MapPin size={13} className="text-blue-600" /> Sede Matriz Principal
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.mainAddress}
                  onChange={(e) => setFormData({ ...formData, mainAddress: e.target.value })}
                  placeholder="Ej. Av. República del Salvador N36-140 y Naciones Unidas, Edificio Titanium, Piso 5"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <p className="text-xs font-bold text-gray-800">{company?.mainAddress || company?.address || 'No registrada'}</p>
              )}
            </div>

            {/* Sucursales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Sucursales Secundarias</span>
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBranchInput}
                    onChange={(e) => setNewBranchInput(e.target.value)}
                    placeholder="Agregar dirección de sucursal o planta..."
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddBranch}
                    disabled={!newBranchInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
                  >
                    Agregar Sucursal
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(formData.branchAddresses || []).map((branch: string, bIdx: number) => (
                  <div
                    key={`branch_${bIdx}`}
                    className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs font-bold text-gray-700 truncate">{branch}</span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBranch(bIdx)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {(formData.branchAddresses || []).length === 0 && (
                  <p className="text-xs text-gray-400 italic col-span-2">No hay sucursales secundarias registradas.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'members' && (
          <motion.div
            key="members_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6 text-left"
          >
            <div>
              <h3 className="text-base font-black text-gray-900">Nómina de Personas Vinculadas ({associatedMembers.length})</h3>
              <p className="text-xs text-gray-500">Personal, representantes y contactos asociados a esta empresa.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {associatedMembers.map((mem) => {
                const assoc = (mem.companyAssociations || []).find(ca => ca.companyId === company?.id);
                return (
                  <div
                    key={`assoc_mem_${mem.id}`}
                    onClick={() => onNavigateToMember(mem)}
                    className="p-4 rounded-2xl bg-gray-50 hover:bg-blue-50/40 border border-gray-100 hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={mem.avatar || `https://picsum.photos/seed/${mem.name.replace(/\s/g, '')}/100/100`}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0"
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors block truncate">
                          {mem.name}
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          {assoc?.role || mem.role || 'Colaborador'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {associatedMembers.length === 0 && (
                <div className="col-span-3 py-10 text-center">
                  <Users size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-500">No hay personas vinculadas directamente a esta empresa.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'relations' && (
          <motion.div
            key="relations_comp_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Estructura Empresarial & Alianzas Cruzadas</h3>
                <p className="text-xs text-gray-500">Relaciones corporativas entre empresas (matriz, filial, proveedor, consorcios).</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingRelation(!isAddingRelation)}
                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Nueva Relación
              </button>
            </div>

            {isAddingRelation && (
              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tipo de Destino</label>
                    <select
                      value={relationTargetType}
                      onChange={(e) => {
                        setRelationTargetType(e.target.value as any);
                        setRelationTargetId('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                    >
                      <option value="company">Otra Empresa</option>
                      <option value="person">Persona</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Seleccionar Entidad</label>
                    {relationTargetType === 'company' ? (
                      <SearchableSelect
                        options={allCompanies.filter(c => c.id !== company?.id).map(c => ({ value: c.id, label: `${c.name} (RUC: ${c.ruc})` }))}
                        value={relationTargetId}
                        onChange={setRelationTargetId}
                        placeholder="Buscar empresa..."
                      />
                    ) : (
                      <SearchableSelect
                        options={allMembers.map(m => ({ value: m.id, label: `${m.name} - ${m.role || 'Contacto'}` }))}
                        value={relationTargetId}
                        onChange={setRelationTargetId}
                        placeholder="Buscar persona..."
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tipo de Vínculo</label>
                    <select
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                    >
                      <option value="filial">Empresa Filial / Subsidiaria</option>
                      <option value="matriz">Empresa Matriz / Holding</option>
                      <option value="socio">Consorcio / Alianza</option>
                      <option value="proveedor">Proveedor de Servicios</option>
                      <option value="cliente">Cliente Corporativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Detalle / Proyecto</label>
                    <input
                      type="text"
                      value={relationRole}
                      onChange={(e) => setRelationRole(e.target.value)}
                      placeholder="Ej. Consorcio Vía Costa..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingRelation(false)}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRelation}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                  >
                    Guardar Vínculo
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(formData.relations || []).map((rel: PartyRelation) => (
                <div
                  key={rel.id}
                  className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3"
                >
                  <div
                    onClick={() => {
                      if (rel.targetType === 'company') {
                        const c = allCompanies.find(comp => comp.id === rel.targetId);
                        if (c) onNavigateToCompany(c);
                      } else {
                        const m = allMembers.find(mem => mem.id === rel.targetId);
                        if (m) onNavigateToMember(m);
                      }
                    }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      {rel.targetType === 'company' ? <Building2 size={20} /> : <Users size={20} />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 hover:text-indigo-600 block">
                        {rel.targetName}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                        {rel.relationType.replace('_', ' ')} {rel.roleOrPosition ? `• ${rel.roleOrPosition}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRelation(rel.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'fiscal' && (
          <motion.div
            key="fiscal_comp_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6 text-left"
          >
            <div>
              <h3 className="text-base font-black text-gray-900">Perfil Fiscal & Clasificación Sectorial (SRI)</h3>
              <p className="text-xs text-gray-500">Validación de RUC de Sociedad (Privada / Pública) y sectores productivos.</p>
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Número de RUC (13 dígitos) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building size={16} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      maxLength={13}
                      value={formData.ruc}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, ruc: val });
                      }}
                      placeholder="Ej. 1792345678001"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                    />
                  </div>
                  {rucValidation && (
                    <p className={`text-[11px] font-bold mt-1.5 flex items-center gap-1 ${
                      rucValidation.isValid ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {rucValidation.isValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {rucValidation.message}
                    </p>
                  )}
                  {duplicateCheck.isDuplicate && (
                    <p className="text-[11px] font-bold mt-1 text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
                      <AlertTriangle size={13} />
                      ¡Advertencia de duplicado! Ya existe una entidad registrada con este RUC.
                    </p>
                  )}
                </div>

                {/* Industries Suggestion / Add input */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Agregar Sectores o Industrias
                  </label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={industryInput}
                        onChange={(e) => {
                          setIndustryInput(e.target.value);
                          setShowIndustrySuggestions(true);
                        }}
                        placeholder="Escribe un sector (ej. Construcción, Minería, Farmacéutica)..."
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddIndustry(industryInput)}
                        disabled={!industryInput.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-40"
                      >
                        Añadir
                      </button>
                    </div>

                    {showIndustrySuggestions && industryInput && filteredIndustrySuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 max-h-40 overflow-y-auto p-2">
                        {filteredIndustrySuggestions.map((ind) => (
                          <button
                            key={ind.id}
                            type="button"
                            onClick={() => handleAddIndustry(ind.name)}
                            className="w-full text-left px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-slate-100 rounded-lg"
                          >
                            {ind.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                  RUC de la Compañía
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-gray-900">{company?.ruc || 'No registrado'}</span>
                  {rucValidation?.isValid && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      RUC Válido SRI
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'notes' && (
          <motion.div
            key="notes_comp_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-4 text-left"
          >
            <h3 className="text-base font-black text-gray-900">Bitácora & Notas Internas</h3>

            {isEditing ? (
              <textarea
                rows={6}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observaciones corporativas, antecedentes o acuerdos con esta empresa..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
              />
            ) : (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 min-h-[120px]">
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{company?.notes || 'No hay notas internas registradas.'}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
