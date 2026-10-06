import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  HardHat,
  FileText,
  Edit,
  Printer,
  Plus,
  Trash2,
  ExternalLink,
  MessageSquare,
  UserCheck,
  Truck,
  HeartHandshake,
  Tag,
  MapPin,
  Globe,
  Share2,
  Award,
  Link as LinkIcon,
  X,
  CreditCard,
  Building,
  Save,
  ChevronRight,
  User,
  Sparkles,
  Lock
} from 'lucide-react';
import { TeamMember, Company, PartyRelation, PartyRelationType, Process, Role, SystemRole, PersonCategory } from '../../types';
import { validateIdentification, validateRucEcuador, checkIdentificationDuplicate } from '../../lib/fiscalValidators';
import { SearchableSelect } from '../common/SearchableSelect';

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'member' | 'company';
}

interface Member360ViewProps {
  member?: TeamMember | null;
  isCreating?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  allMembers: TeamMember[];
  companies: Company[];
  processes?: Process[];
  roles?: Role[] | SystemRole[];
  onBack: () => void;
  onNavigateBreadcrumb?: (index: number) => void;
  onNavigateToMember: (member: TeamMember) => void;
  onNavigateToCompany: (company: Company) => void;
  onSaveMember: (data: Partial<TeamMember>) => Promise<void> | void;
  onCancel?: () => void;
  onDeleteMember?: (member: TeamMember) => void;
  canDelete?: boolean;
}

export const Member360View: React.FC<Member360ViewProps> = ({
  member,
  isCreating = false,
  breadcrumbs = [],
  allMembers = [],
  companies = [],
  processes = [],
  roles = [],
  onBack,
  onNavigateBreadcrumb,
  onNavigateToMember,
  onNavigateToCompany,
  onSaveMember,
  onCancel,
  onDeleteMember,
  canDelete = false,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(isCreating);
  const [activeTab, setActiveTab] = useState<'general' | 'fiscal' | 'relations' | 'training' | 'epp' | 'notes'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const defaultMemberData = useMemo(() => ({
    name: member?.name || '',
    role: member?.role || '',
    systemRoleId: member?.systemRoleId || '',
    isSystemAdmin: !!member?.isSystemAdmin,
    categories: (member?.categories && member.categories.length > 0) ? member.categories : ['contacto'],
    processId: member?.processId || '',
    companyAssociations: member?.companyAssociations || [],
    identificationId: member?.identificationId || '',
    hasRuc: !!member?.hasRuc,
    ruc: member?.ruc || '',
    commercialName: member?.commercialName || '',
    skills: member?.skills || '',
    responsibilities: member?.responsibilities || '',
    personality: member?.personality || '',
    notes: member?.notes || '',
    email: member?.email || '',
    phone: member?.phone || '',
    epp: member?.epp || '',
    requiresEpp: !!member?.requiresEpp,
    avatar: member?.avatar || '',
    relations: member?.relations || [],
  }), [member]);

  const [formData, setFormData] = useState<any>(defaultMemberData);

  useEffect(() => {
    setFormData(defaultMemberData);
    setIsEditing(isCreating);
  }, [defaultMemberData, isCreating]);

  // Relation Modal / Inline Form State
  const [isAddingRelation, setIsAddingRelation] = useState(false);
  const [relationTargetType, setRelationTargetType] = useState<'company' | 'person'>('company');
  const [relationTargetId, setRelationTargetId] = useState('');
  const [relationType, setRelationType] = useState<PartyRelationType>('empleado');
  const [relationRole, setRelationRole] = useState('');
  const [relationNotes, setRelationNotes] = useState('');

  // Company Association selector state for Edit mode
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyRoleInput, setCompanyRoleInput] = useState('');

  // Real-time Fiscal Identification & Duplicate Validation
  const idValidation = useMemo(() => {
    const val = isEditing ? formData.identificationId : member?.identificationId;
    if (!val) return null;
    return validateIdentification(val);
  }, [isEditing, formData.identificationId, member?.identificationId]);

  const rucValidation = useMemo(() => {
    const val = isEditing ? formData.ruc : member?.ruc;
    if (!val) return null;
    return validateRucEcuador(val);
  }, [isEditing, formData.ruc, member?.ruc]);

  const duplicateCheck = useMemo(() => {
    const val = isEditing ? formData.identificationId : member?.identificationId;
    if (!val) return { isDuplicate: false };
    return checkIdentificationDuplicate(
      val,
      allMembers,
      companies,
      member?.id
    );
  }, [isEditing, formData.identificationId, member?.identificationId, allMembers, companies, member?.id]);

  // Available Categories (Tryton Party Model)
  const availableCategories = [
    { id: 'colaborador', label: 'Colaborador Interno', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: UserCheck },
    { id: 'alumno', label: 'Alumno / Capacitado', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: GraduationCap },
    { id: 'docente', label: 'Docente / Instructor', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: Briefcase },
    { id: 'cliente', label: 'Cliente', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Building2 },
    { id: 'proveedor', label: 'Proveedor', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck },
    { id: 'aliado', label: 'Aliado Estratégico', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: HeartHandshake },
    { id: 'contacto', label: 'Contacto Externo', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Tag },
  ];

  const handleToggleCategory = (catId: string) => {
    const currentCats = Array.isArray(formData.categories) ? formData.categories : [];
    if (currentCats.includes(catId)) {
      setFormData({
        ...formData,
        categories: currentCats.filter((c: string) => c !== catId)
      });
    } else {
      setFormData({
        ...formData,
        categories: [...currentCats, catId]
      });
    }
  };

  const handleAddCompanyAssociation = () => {
    if (!selectedCompanyId) return;
    const currentAssocs = Array.isArray(formData.companyAssociations) ? formData.companyAssociations : [];
    if (currentAssocs.some((a: any) => a.companyId === selectedCompanyId)) return;

    setFormData({
      ...formData,
      companyAssociations: [
        ...currentAssocs,
        {
          companyId: selectedCompanyId,
          role: companyRoleInput.trim() || formData.role || 'Vinculado'
        }
      ]
    });

    setSelectedCompanyId('');
    setCompanyRoleInput('');
  };

  const handleRemoveCompanyAssociation = (companyId: string) => {
    const currentAssocs = Array.isArray(formData.companyAssociations) ? formData.companyAssociations : [];
    setFormData({
      ...formData,
      companyAssociations: currentAssocs.filter((a: any) => a.companyId !== companyId)
    });
  };

  // Is Eligible for EPP?
  const isEppEligible = useMemo(() => {
    const cats = isEditing ? (formData.categories || []) : (member?.categories || []);
    if (cats.includes('colaborador') || cats.includes('miembro')) return true;
    if (isEditing ? formData.requiresEpp : member?.requiresEpp) return true;
    const assocCompanyIds = ((isEditing ? formData.companyAssociations : member?.companyAssociations) || []).map((ca: any) => ca.companyId);
    return companies.some(c => assocCompanyIds.includes(c.id) && c.requiresEpp);
  }, [isEditing, formData, member, companies]);

  // Linked Companies
  const linkedCompanies = useMemo(() => {
    const list: { company: Company; role: string }[] = [];
    const assocs = (isEditing ? formData.companyAssociations : member?.companyAssociations) || [];
    assocs.forEach((ca: any) => {
      const comp = companies.find(c => c.id === ca.companyId);
      if (comp) {
        list.push({ company: comp, role: ca.role || 'Vinculado' });
      }
    });
    return list;
  }, [isEditing, formData.companyAssociations, member?.companyAssociations, companies]);

  // Add / Delete Relation Handler
  const handleSaveRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationTargetId) return;

    let targetName = '';
    if (relationTargetType === 'company') {
      const comp = companies.find(c => c.id === relationTargetId);
      targetName = comp?.name || 'Compañía';
    } else {
      const mem = allMembers.find(m => m.id === relationTargetId);
      targetName = mem?.name || 'Persona';
    }

    const newRel: PartyRelation = {
      id: `rel-${Date.now()}`,
      sourceId: member?.id || 'new',
      sourceType: 'person',
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

    if (relationTargetType === 'company') {
      const existsInAssoc = (updatedData.companyAssociations || []).some((ca: any) => ca.companyId === relationTargetId);
      if (!existsInAssoc) {
        updatedData.companyAssociations = [
          ...(updatedData.companyAssociations || []),
          { companyId: relationTargetId, role: relationRole || relationType }
        ];
      }
    }

    setFormData(updatedData);

    if (!isEditing && member) {
      await onSaveMember(updatedData);
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

    if (!isEditing && member) {
      await onSaveMember(updatedData);
    }
  };

  // Submit Handler for Edit / Create Mode
  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!formData.name?.trim()) {
      setErrorMessage('El nombre de la persona es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveMember(formData);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar los datos de la persona.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    if (isCreating && onCancel) {
      onCancel();
    } else {
      setFormData(defaultMemberData);
      setIsEditing(false);
      setErrorMessage(null);
    }
  };

  const currentName = formData.name || member?.name || 'Nueva Persona';
  const currentAvatar = formData.avatar || member?.avatar || `https://picsum.photos/seed/${currentName.replace(/\s/g, '')}/200/200`;

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
            <React.Fragment key={`crumb_${crumb.id}_${idx}`}>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
              <button
                onClick={() => onNavigateBreadcrumb && onNavigateBreadcrumb(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  idx === breadcrumbs.length - 1 && !isEditing
                    ? 'bg-blue-50 text-blue-700 font-black'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {crumb.type === 'company' ? <Building2 size={13} /> : <User size={13} />}
                <span className="truncate max-w-[140px]">{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}

          {isEditing && (
            <>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-ng-lime/20 text-ng-black font-black text-[11px] uppercase tracking-wider shrink-0">
                {isCreating ? 'Creando Persona' : 'Modo Edición'}
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
                {isSaving ? 'Guardando...' : isCreating ? 'Crear Persona' : 'Guardar Cambios'}
              </button>
            </>
          ) : (
            <>
              {member?.phone && (
                <a
                  href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                >
                  <MessageSquare size={14} />
                  WhatsApp
                </a>
              )}
              {member?.email && (
                <a
                  href={`mailto:${member.email}`}
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
                Imprimir Ficha
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-ng-black bg-ng-lime hover:brightness-105 shadow-md shadow-ng-lime/20 transition-all cursor-pointer"
              >
                <Edit size={14} />
                Editar Ficha
              </button>
              {canDelete && member && onDeleteMember && (
                <button
                  onClick={() => onDeleteMember(member)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  title="Eliminar persona"
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

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl relative overflow-hidden text-left">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative group shrink-0">
            <img
              src={currentAvatar}
              alt={currentName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-md border-2 border-white ring-4 ring-gray-50"
            />
            {isEditing && (
              <div className="mt-2 text-center">
                <input
                  type="text"
                  placeholder="URL del Avatar..."
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="w-28 text-[10px] px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 truncate"
                  title="Pega una URL de imagen para el avatar"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1 w-full">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Ing. Juan Fernando Pérez"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                    Nombre Comercial / Alias (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.commercialName}
                    onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                    placeholder="Ej. Consultor Ambiental Juan Pérez"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none transition-all"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {member?.name || 'Persona sin nombre'}
                  </h1>
                  {member?.hasRuc && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      <Building size={12} />
                      Persona Natural con RUC
                    </span>
                  )}
                </div>
                {member?.commercialName && (
                  <p className="text-sm font-bold text-gray-500 mt-1">
                    Nombre Comercial: <span className="text-gray-800">{member.commercialName}</span>
                  </p>
                )}
              </div>
            )}

            {/* Quick summary badges in view mode */}
            {!isEditing && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-600 pt-1">
                {member?.identificationId && (
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                    <CreditCard size={14} className="text-blue-500" />
                    <span>Cédula: <strong>{member.identificationId}</strong></span>
                    {idValidation?.isValid && (
                      <span title="Cédula válida SRI">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                      </span>
                    )}
                  </div>
                )}

                {member?.ruc && (
                  <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-blue-900">
                    <Building2 size={14} className="text-blue-600" />
                    <span>RUC: <strong>{member.ruc}</strong></span>
                    {rucValidation?.isValid && (
                      <span title="RUC válido SRI">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                  <Briefcase size={14} className="text-gray-500" />
                  <span>{member?.role || 'Sin cargo asignado'}</span>
                </div>
              </div>
            )}

            {/* Categories Chips */}
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                Categorías de la Entidad {isEditing && '(Haz clic para activar/desactivar)'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableCategories.map((cat) => {
                  const isSelected = (formData.categories || []).includes(cat.id);
                  const Icon = cat.icon;

                  if (!isEditing && !isSelected) return null;

                  return (
                    <button
                      key={`cat_chip_${cat.id}`}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => isEditing && handleToggleCategory(cat.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? `${cat.color} shadow-sm font-black`
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 opacity-60'
                      } ${isEditing ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                    >
                      <Icon size={13} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200">
        {[
          { id: 'general', label: 'Expediente & Contacto', icon: User },
          { id: 'fiscal', label: 'Perfil Tributario SRI', icon: CreditCard, count: (idValidation?.isValid || rucValidation?.isValid) ? '✓' : undefined },
          { id: 'relations', label: 'Empresas & Relaciones', icon: Building2, count: ((formData.companyAssociations?.length || 0) + (formData.relations?.length || 0)) || undefined },
          { id: 'training', label: 'Historial Académico', icon: GraduationCap },
          { id: 'epp', label: 'Dotación EPP', icon: HardHat, hidden: !isEppEligible && !isEditing },
          { id: 'notes', label: 'Notas & Bitácora', icon: FileText },
        ].filter(t => !t.hidden).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={`tab_${tab.id}`}
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
            key="general_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
          >
            {/* Contact Channels */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={14} className="text-blue-500" /> Canales de Contacto
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
                        placeholder="ejemplo@correo.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Teléfono / WhatsApp</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0991234567"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Cargo / Función</label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="Ej. Coordinador de SST / Inspector"
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
                        <span className="text-[10px] font-bold text-gray-400 block">Correo Electrónico</span>
                        <span className="text-xs font-bold text-gray-800">{member?.email || 'No registrado'}</span>
                      </div>
                    </div>
                    {member?.email && (
                      <a href={`mailto:${member.email}`} className="text-xs font-black text-blue-600 hover:underline">
                        Enviar
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block">Teléfono / Celular</span>
                        <span className="text-xs font-bold text-gray-800">{member?.phone || 'No registrado'}</span>
                      </div>
                    </div>
                    {member?.phone && (
                      <a
                        href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-black text-emerald-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Organizational Assignment */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Asignación Organizacional & Roles
              </h3>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Proceso Asignado</label>
                    <select
                      value={formData.processId || ''}
                      onChange={(e) => setFormData({ ...formData, processId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                    >
                      <option value="">Sin proceso asignado</option>
                      {processes.map((proc) => (
                        <option key={`proc_opt_${proc.id}`} value={proc.id}>
                          {proc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Rol de Permisos del Sistema</label>
                    <select
                      value={formData.systemRoleId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          systemRoleId: val,
                          isSystemAdmin: val === 'role-admin',
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                    >
                      <option value="">Acceso Estándar / Sin Rol Especial</option>
                      {roles.map((r) => (
                        <option key={`role_opt_${r.id}`} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 block">Proceso Asignado</span>
                    <span className="text-xs font-bold text-gray-800">
                      {processes.find(p => p.id === member?.processId)?.name || 'Sin proceso asignado'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 block">Rol y Permisos</span>
                    <span className="text-xs font-bold text-gray-800">
                      {roles.find(r => r.id === member?.systemRoleId)?.name || (member?.isSystemAdmin ? 'Administrador del Sistema' : 'Usuario Estándar')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bio & Skills */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-md space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" /> Perfil Profesional, Habilidades y Responsabilidades
              </h3>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Personalidad / Descripción Breve</label>
                    <textarea
                      rows={2}
                      value={formData.personality}
                      onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                      placeholder="Ej. Persona proactiva, orientada al detalle..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Habilidades Clave (Skills)</label>
                    <textarea
                      rows={2}
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      placeholder="Ej. Auditorías ISO 45001, Primeros Auxilios..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Responsabilidades Asignadas</label>
                    <textarea
                      rows={2}
                      value={formData.responsibilities}
                      onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                      placeholder="Ej. Supervisión de brigadas de emergencia..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Perfil / Personalidad</span>
                    <p className="text-xs text-gray-700 italic">{member?.personality || 'No registrado'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Habilidades</span>
                    <p className="text-xs text-gray-700">{member?.skills || 'No registradas'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Responsabilidades</span>
                    <p className="text-xs text-gray-700">{member?.responsibilities || 'No registradas'}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'fiscal' && (
          <motion.div
            key="fiscal_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Perfil Fiscal & Tributario (SRI Ecuador)</h3>
                <p className="text-xs text-gray-500">Validador de Cédula y RUC con algoritmo Módulo 10 y Módulo 11 (estándar Tryton party).</p>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cédula input */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Cédula de Identidad (10 dígitos)
                    </label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.identificationId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, identificationId: val });
                        }}
                        placeholder="Ej. 1712345678"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                      />
                    </div>
                    {idValidation && (
                      <p className={`text-[11px] font-bold mt-1.5 flex items-center gap-1 ${
                        idValidation.isValid ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {idValidation.isValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        {idValidation.message}
                      </p>
                    )}
                    {duplicateCheck.isDuplicate && (
                      <p className="text-[11px] font-bold mt-1 text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
                        <AlertTriangle size={13} />
                        ¡Advertencia de duplicado! Ya existe una entidad registrada con este número.
                      </p>
                    )}
                  </div>

                  {/* RUC Toggle and Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">
                        ¿Actúa como Persona Natural con RUC?
                      </label>
                      <input
                        type="checkbox"
                        checked={formData.hasRuc}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData({
                            ...formData,
                            hasRuc: checked,
                            ruc: checked && formData.identificationId ? `${formData.identificationId}001` : formData.ruc
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {formData.hasRuc ? (
                      <div>
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
                            placeholder="Ej. 1712345678001"
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
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic pt-2">
                        Si esta persona emite facturas como consultor/proveedor o actúa como entidad comercial, activa la casilla para registrar su RUC (001).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                    Cédula de Identidad
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">{member?.identificationId || 'No registrada'}</span>
                    {idValidation?.isValid && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Válida SRI
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                    RUC Persona Natural
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">{member?.ruc || 'No registrado'}</span>
                    {rucValidation?.isValid && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        RUC Activo SRI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'relations' && (
          <motion.div
            key="relations_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6 text-left"
          >
            {/* Associated Companies */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900">Empresas Vinculadas</h3>
                  <p className="text-xs text-gray-500">Organizaciones a las que pertenece o presta servicios.</p>
                </div>
              </div>

              {isEditing && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Vincular a Empresa</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <SearchableSelect
                        options={companies.map(c => ({ value: c.id, label: `${c.name} (RUC: ${c.ruc})` }))}
                        value={selectedCompanyId}
                        onChange={setSelectedCompanyId}
                        placeholder="Seleccionar empresa..."
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={companyRoleInput}
                        onChange={(e) => setCompanyRoleInput(e.target.value)}
                        placeholder="Cargo en la empresa..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCompanyAssociation}
                    disabled={!selectedCompanyId}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
                  >
                    Agregar Vinculación
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {linkedCompanies.map(({ company, role }) => (
                  <div
                    key={`comp_link_${company.id}`}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 group"
                  >
                    <div
                      onClick={() => onNavigateToCompany(company)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors block">
                          {company.name}
                        </span>
                        <span className="text-[10px] font-medium text-gray-500">
                          {role} • RUC: {company.ruc}
                        </span>
                      </div>
                    </div>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveCompanyAssociation(company.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigateToCompany(company)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Ver Ficha <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {linkedCompanies.length === 0 && (
                  <p className="text-xs text-gray-400 italic col-span-2">No hay empresas vinculadas.</p>
                )}
              </div>
            </div>

            {/* Custom Cross Relations (Tryton Party Relations) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900">Red de Relaciones Cruzadas (Party Relations)</h3>
                  <p className="text-xs text-gray-500">Vínculos directos con otras entidades (jefes, apoderados, contactos clave).</p>
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
                        <option value="company">Empresa / Compañía</option>
                        <option value="person">Otra Persona</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Seleccionar Entidad</label>
                      {relationTargetType === 'company' ? (
                        <SearchableSelect
                          options={companies.map(c => ({ value: c.id, label: `${c.name} (RUC: ${c.ruc})` }))}
                          value={relationTargetId}
                          onChange={setRelationTargetId}
                          placeholder="Buscar empresa..."
                        />
                      ) : (
                        <SearchableSelect
                          options={allMembers.filter(m => m.id !== member?.id).map(m => ({ value: m.id, label: `${m.name} - ${m.role || 'Contacto'}` }))}
                          value={relationTargetId}
                          onChange={setRelationTargetId}
                          placeholder="Buscar persona..."
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tipo de Relación</label>
                      <select
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                      >
                        <option value="empleado">Empleado / Colaborador</option>
                        <option value="representante_legal">Representante Legal</option>
                        <option value="socio">Socio / Accionista</option>
                        <option value="auditor_sst">Auditor SST</option>
                        <option value="instructor">Instructor / Docente</option>
                        <option value="contacto_clave">Contacto Clave</option>
                        <option value="familiar">Familiar / Contacto de Emergencia</option>
                        <option value="jefe_directo">Jefe Directo</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Cargo / Detalle del Vínculo</label>
                      <input
                        type="text"
                        value={relationRole}
                        onChange={(e) => setRelationRole(e.target.value)}
                        placeholder="Ej. Gerente Técnico / Apoderado"
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
                      Vincular Entidad
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
                          const c = companies.find(comp => comp.id === rel.targetId);
                          if (c) onNavigateToCompany(c);
                        } else {
                          const m = allMembers.find(mem => mem.id === rel.targetId);
                          if (m) onNavigateToMember(m);
                        }
                      }}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        {rel.targetType === 'company' ? <Building2 size={20} /> : <User size={20} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 hover:text-purple-600 block">
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
            </div>
          </motion.div>
        )}

        {activeTab === 'training' && (
          <motion.div
            key="training_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6 text-left"
          >
            <div>
              <h3 className="text-base font-black text-gray-900">Historial de Capacitaciones & Certificaciones</h3>
              <p className="text-xs text-gray-500">Registro pedagógico como alumno o instructor en programas de formación SST.</p>
            </div>

            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <GraduationCap size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-600">Historial de cursos y certificaciones sincronizado.</p>
              <p className="text-[11px] text-gray-400 mt-1">Los certificados emitidos para esta persona se vinculan automáticamente desde el módulo de Capacitaciones.</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'epp' && (
          <motion.div
            key="epp_tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-6 text-left"
          >
            <div>
              <h3 className="text-base font-black text-gray-900">Dotación de Equipos de Protección Personal (EPP)</h3>
              <p className="text-xs text-gray-500">Control de tallas y entregas de equipos de seguridad.</p>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="req_epp"
                    checked={formData.requiresEpp}
                    onChange={(e) => setFormData({ ...formData, requiresEpp: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="req_epp" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Habilitar política obligatoria de dotación de EPP para esta persona
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Detalle de Tallas y Dotaciones de EPP
                  </label>
                  <textarea
                    rows={4}
                    value={formData.epp}
                    onChange={(e) => setFormData({ ...formData, epp: e.target.value })}
                    placeholder="Ej. Casco Dielectrico Talla M, Chaleco reflectivo, Botas Punta de Acero Talla 41..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-2">Dotaciones Asignadas</span>
                <p className="text-xs font-bold text-gray-800 whitespace-pre-wrap">{member?.epp || 'Sin registros de EPP asignados.'}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'notes' && (
          <motion.div
            key="notes_tab"
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
                placeholder="Observaciones internas, acuerdos o comentarios sobre esta persona..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-ng-lime outline-none"
              />
            ) : (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 min-h-[120px]">
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{member?.notes || 'No hay notas internas registradas.'}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
