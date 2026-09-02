import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  UserPlus,
  Check,
  ChevronDown,
  MapPin,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AcreditationAlly, Company, Industry, TeamMember } from '../../types';
import { CompanyEditorView, normalizeText, cleanFirestoreData } from '../common/CompanyEditorView';

interface AcreditacionAlliesViewProps {
  allies: AcreditationAlly[];
  companies: Company[];
  industries?: Industry[];
  members: TeamMember[];
  currentMember: TeamMember | null;
  loading?: boolean;
  onCompanyCreated?: (company: Company) => void;
  onMemberCreated?: (member: TeamMember) => void;
}

export const AcreditacionAlliesView: React.FC<AcreditacionAlliesViewProps> = ({
  allies,
  companies = [],
  industries = [],
  members = [],
  currentMember,
  loading = false,
  onCompanyCreated,
  onMemberCreated,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal state for Ally
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAlly, setEditingAlly] = useState<AcreditationAlly | null>(null);
  const [allyToDelete, setAllyToDelete] = useState<AcreditationAlly | null>(null);

  // Official Company Editor Modal (Exact same as Directory)
  const [isAddingCompany, setIsAddingCompany] = useState<boolean>(false);
  const [newCompanyData, setNewCompanyData] = useState<any>({
    name: '',
    ruc: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    mainAddress: '',
    branchAddresses: [],
    industries: [],
    notes: ''
  });
  const [isSavingCompany, setIsSavingCompany] = useState<boolean>(false);

  // Quick create member/contact modal
  const [showCreateMemberModal, setShowCreateMemberModal] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  const [isSavingMember, setIsSavingMember] = useState<boolean>(false);
  const [memberError, setMemberError] = useState<string>('');

  // Form state for Ally
  const [name, setName] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companySearchQuery, setCompanySearchQuery] = useState<string>('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState<boolean>(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'in_progress' | 'inactive'>('active');
  const [agreementDate, setAgreementDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Selected company object in form
  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  // Filtered companies for the company selector
  const filteredCompanies = useMemo(() => {
    const q = normalizeText(companySearchQuery);
    if (!q) return companies;
    return companies.filter(c => 
      normalizeText(c.name).includes(q) ||
      normalizeText(c.ruc).includes(q) ||
      normalizeText(c.industry || '').includes(q) ||
      (c.industries || []).some(ind => normalizeText(ind).includes(q))
    );
  }, [companies, companySearchQuery]);

  // All contacts categorized: those belonging to the selected company and other directory contacts
  const categorizedContacts = useMemo(() => {
    const companyContacts: TeamMember[] = [];
    const otherContacts: TeamMember[] = [];

    members.forEach(m => {
      const isAssociated = selectedCompanyId && m.companyAssociations && m.companyAssociations.some(a => a.companyId === selectedCompanyId);
      if (isAssociated) {
        companyContacts.push(m);
      } else {
        otherContacts.push(m);
      }
    });

    return { companyContacts, otherContacts };
  }, [members, selectedCompanyId]);

  const filteredAllies = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return allies.filter(ally => {
      const matchSearch = 
        !term ||
        ally.name?.toLowerCase().includes(term) ||
        ally.companyName?.toLowerCase().includes(term) ||
        ally.contactName?.toLowerCase().includes(term) ||
        ally.contactEmail?.toLowerCase().includes(term) ||
        ally.notes?.toLowerCase().includes(term);

      const matchStatus = statusFilter === 'all' || ally.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allies, searchTerm, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingAlly(null);
    setName('');
    setSelectedCompanyId('');
    setCompanySearchQuery('');
    setIsCompanyDropdownOpen(false);
    setSelectedContactId('');
    setStatus('active');
    setAgreementDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ally: AcreditationAlly) => {
    setEditingAlly(ally);
    setName(ally.name || '');
    setSelectedCompanyId(ally.companyId || '');
    const comp = companies.find(c => c.id === ally.companyId);
    setCompanySearchQuery(comp ? comp.name : '');
    setIsCompanyDropdownOpen(false);
    setSelectedContactId(ally.contactId || '');
    setStatus(ally.status || 'active');
    setAgreementDate(ally.agreementDate || '');
    setNotes(ally.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompanyId(company.id);
    setCompanySearchQuery(company.name);
    setIsCompanyDropdownOpen(false);
    // Autofill ally name if empty or previous company name
    if (!name.trim()) {
      setName(company.name);
    }
  };

  const handleClearCompanySelection = () => {
    setSelectedCompanyId('');
    setCompanySearchQuery('');
    setIsCompanyDropdownOpen(false);
  };

  // Open Official Company Editor
  const handleOpenNewCompanyEditor = () => {
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
      notes: ''
    });
    setIsAddingCompany(true);
  };

  // Save new company in Directory using official flow
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.name || !newCompanyData.ruc) return;
    setIsSavingCompany(true);

    try {
      // Manage industries list
      const companyIndustries = newCompanyData.industries || [];
      for (const indName of companyIndustries) {
        if (!industries.some(i => normalizeText(i.name) === normalizeText(indName))) {
          const id = `ind-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await setDoc(doc(db, 'industries', id), {
            id,
            name: indName,
            createdAt: new Date().toISOString()
          });
        }
      }

      const id = `comp-${Date.now()}`;
      const newCompany: Company = {
        id,
        ...newCompanyData,
        address: newCompanyData.mainAddress, // for backwards compatibility
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', id), newCompany);
      if (onCompanyCreated) {
        onCompanyCreated(newCompany);
      }

      // Automatically select newly created company
      setSelectedCompanyId(id);
      setCompanySearchQuery(newCompany.name);
      if (!name.trim()) {
        setName(newCompany.name);
      }

      setIsAddingCompany(false);
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
        notes: ''
      });
    } catch (err: any) {
      console.error('Error saving company from accreditation allies:', err);
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Quick Create Member / Contact
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      setMemberError('Ingresa el nombre de la persona');
      return;
    }
    setIsSavingMember(true);
    setMemberError('');

    try {
      const newId = `mem-${Date.now()}`;
      const newMem: any = cleanFirestoreData({
        id: newId,
        name: newMemberName.trim(),
        role: newMemberRole.trim() || 'Contacto de Certificaciones',
        categories: ['aliado', 'contacto'],
        skills: [],
        responsibilities: [],
        recentAchievements: [],
        email: newMemberEmail.trim() || undefined,
        phone: newMemberPhone.trim() || undefined,
        companyAssociations: selectedCompanyId ? [
          { companyId: selectedCompanyId, role: newMemberRole.trim() || 'Representante / Contacto' }
        ] : []
      });

      await setDoc(doc(db, 'members', newId), newMem);
      if (onMemberCreated) {
        onMemberCreated(newMem as TeamMember);
      }

      // Auto select newly created member
      setSelectedContactId(newId);

      // Reset & close submodal
      setNewMemberName('');
      setNewMemberRole('');
      setNewMemberEmail('');
      setNewMemberPhone('');
      setShowCreateMemberModal(false);
    } catch (err: any) {
      console.error('Error creating member:', err);
      setMemberError('Error al crear la persona. Por favor intenta de nuevo.');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const allyName = (name || selectedCompany?.name || '').trim();
    if (!allyName) {
      setFormError('Por favor ingresa un nombre para el aliado o selecciona una empresa.');
      return;
    }
    if (!selectedCompanyId) {
      setFormError('Es obligatorio vincular al aliado con una Empresa del Directorio.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const company = companies.find(c => c.id === selectedCompanyId);
      const contact = members.find(m => m.id === selectedContactId);

      const allyId = editingAlly ? editingAlly.id : `ally-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      const rawAllyData: Record<string, any> = {
        id: allyId,
        name: allyName,
        companyId: selectedCompanyId,
        companyName: company?.name || selectedCompany?.name || '',
        contactId: selectedContactId || '',
        contactName: contact?.name || '',
        contactEmail: contact?.email || company?.email || '',
        contactPhone: contact?.phone || company?.phone || '',
        status: status || 'active',
        agreementDate: agreementDate || '',
        notes: notes.trim() || '',
        createdAt: editingAlly ? editingAlly.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const allyData = cleanFirestoreData(rawAllyData);

      await setDoc(doc(db, 'acreditation_allies', allyId), allyData);
      setIsModalOpen(false);
      setEditingAlly(null);
    } catch (err: any) {
      console.error('Error saving ally:', err);
      setFormError(err?.message || 'Ocurrió un error al guardar el aliado. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!allyToDelete) return;
    try {
      await deleteDoc(doc(db, 'acreditation_allies', allyToDelete.id));
      setAllyToDelete(null);
    } catch (err) {
      console.error('Error deleting ally:', err);
    }
  };

  return (
    <div className="space-y-5 text-left">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100 shadow-xs">
            <Building2 size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                Aliados Estratégicos de Acreditación
              </h2>
              <span className="px-2 py-0.5 bg-indigo-100/70 text-indigo-800 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
                {allies.length} Registrados
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Gestión de entidades acreditadoras, convenios y proveedores vinculados directamente con el Directorio general de empresas.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="btn-add-acreditation-ally"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-slate-900/10 hover:shadow-md cursor-pointer shrink-0"
        >
          <Plus size={15} className="stroke-[2.5]" />
          <span>Nuevo Aliado</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-allies"
            type="text"
            placeholder="Buscar por aliado, empresa, contacto o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({allies.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'in_progress' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En Proceso
          </button>
        </div>
      </div>

      {/* LIST VIEW (Table format) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-slate-800 mb-3" />
            <p className="text-xs font-bold text-slate-500">Cargando aliados estratégicos...</p>
          </div>
        ) : filteredAllies.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <Building2 size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {searchTerm || statusFilter !== 'all' ? 'No se encontraron aliados' : 'No hay aliados registrados'}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mb-4">
              Registra los proveedores u organismos de acreditación vinculándolos a las empresas de tu directorio.
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Agregar Primer Aliado</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Aliado / Entidad</th>
                  <th className="py-3.5 px-4">Empresa (Directorio)</th>
                  <th className="py-3.5 px-4">Persona de Contacto</th>
                  <th className="py-3.5 px-4">Convenio</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredAllies.map((ally, allyIdx) => {
                  return (
                    <tr key={`ally_row_${ally.id || allyIdx}_${allyIdx}`} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {ally.name}
                        </div>
                        {ally.notes && (
                          <div className="text-[11px] text-slate-400 font-normal line-clamp-1 max-w-xs">
                            {ally.notes}
                          </div>
                        )}
                      </td>

                      {/* Company Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span>{ally.companyName || 'Sin empresa'}</span>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4">
                        {ally.contactName ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <User size={13} className="text-indigo-500 shrink-0" />
                              <span>{ally.contactName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                              {ally.contactEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail size={11} /> {ally.contactEmail}
                                </span>
                              )}
                              {ally.contactPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} /> {ally.contactPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : ally.contactEmail || ally.contactPhone ? (
                          <div className="text-[11px] text-slate-500">
                            {ally.contactEmail && (
                              <div className="flex items-center gap-1">
                                <Mail size={11} /> {ally.contactEmail}
                              </div>
                            )}
                            {ally.contactPhone && (
                              <div className="flex items-center gap-1">
                                <Phone size={11} /> {ally.contactPhone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No especificado</span>
                        )}
                      </td>

                      {/* Agreement Date */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {ally.agreementDate ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar size={12} className="text-slate-400" />
                            <span>{ally.agreementDate}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {ally.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-md text-[10px] font-bold">
                            <CheckCircle2 size={11} /> Activo
                          </span>
                        )}
                        {ally.status === 'in_progress' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md text-[10px] font-bold">
                            <Clock size={11} /> En Proceso
                          </span>
                        )}
                        {ally.status === 'inactive' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold">
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(ally)}
                            title="Editar Aliado"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setAllyToDelete(ally)}
                            title="Eliminar Aliado"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT ALLY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-black text-slate-900">
                      {editingAlly ? 'Editar Aliado Estratégico' : 'Nuevo Aliado de Acreditación'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Vincula una empresa registrada del directorio general
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                {/* Company Selection from Directory */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Empresa del Directorio <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenNewCompanyEditor}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      Añadir Nueva Compañía
                    </button>
                  </div>

                  {/* Selected Company Card OR Search Selector */}
                  {selectedCompany ? (
                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-2xs shrink-0 border border-indigo-100">
                          <Building2 size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {selectedCompany.name}
                            </span>
                            {selectedCompany.ruc && (
                              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">
                                RUC: {selectedCompany.ruc}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
                            {selectedCompany.industry && (
                              <span>Sector: {selectedCompany.industry}</span>
                            )}
                            {selectedCompany.email && (
                              <span className="flex items-center gap-1">
                                <Mail size={10} /> {selectedCompany.email}
                              </span>
                            )}
                            {selectedCompany.mainAddress && (
                              <span className="flex items-center gap-1">
                                <MapPin size={10} /> {selectedCompany.mainAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearCompanySelection}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-200 shrink-0 transition-colors cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar empresa por nombre, RUC o industria..."
                          value={companySearchQuery}
                          onChange={(e) => {
                            setCompanySearchQuery(e.target.value);
                            setIsCompanyDropdownOpen(true);
                          }}
                          onFocus={() => setIsCompanyDropdownOpen(true)}
                          className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        {companySearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompanySearchQuery('');
                              setIsCompanyDropdownOpen(false);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown suggestions */}
                      {isCompanyDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsCompanyDropdownOpen(false)}
                          />
                          <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 divide-y divide-slate-100">
                            {filteredCompanies.length > 0 ? (
                              filteredCompanies.map((comp, compIdx) => (
                                <button
                                  key={`acred_ally_comp_btn_${comp.id || compIdx}_${compIdx}`}
                                  type="button"
                                  onClick={() => handleSelectCompany(comp)}
                                  className="w-full text-left p-2 hover:bg-indigo-50/70 rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                                >
                                  <div>
                                    <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600">
                                      {comp.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      {comp.ruc && <span>RUC: {comp.ruc}</span>}
                                      {comp.industry && <span>• {comp.industry}</span>}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Seleccionar
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400">
                                No se encontraron empresas registradas con ese término.
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setIsCompanyDropdownOpen(false);
                                handleOpenNewCompanyEditor();
                              }}
                              className="w-full text-left p-2.5 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mt-1"
                            >
                              <Plus size={14} />
                              <span>Registrar nueva empresa en el Directorio</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Obligatorio: Vincula este aliado a una empresa registrada en tu Directorio o crea una nueva con la ventana oficial.
                  </p>
                </div>

                {/* Ally Commercial Display Name */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Nombre Comercial del Aliado / Certificadora <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Instituto Técnico / Certificadora Internacional..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Contact Selection with Quick Add */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Persona de Contacto (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMemberError('');
                        setShowCreateMemberModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <UserPlus size={12} />
                      Nueva Persona
                    </button>
                  </div>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Sin persona de contacto asignada (Opcional)</option>
                    {categorizedContacts.companyContacts.length > 0 && (
                      <optgroup label="Contactos vinculados a la Empresa">
                        {categorizedContacts.companyContacts.map((contact, cIdx) => (
                          <option key={`ally_co_cnt_${contact.id || cIdx}_${cIdx}`} value={contact.id}>
                            ⭐ {contact.name} {contact.role ? `(${contact.role})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {categorizedContacts.otherContacts.length > 0 && (
                      <optgroup label="Otras personas del Directorio General">
                        {categorizedContacts.otherContacts.map((contact, cIdx) => (
                          <option key={`ally_oth_cnt_${contact.id || cIdx}_${cIdx}`} value={contact.id}>
                            {contact.name} {contact.role ? `(${contact.role})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Status & Agreement Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Estado
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="active">Activo</option>
                      <option value="in_progress">En Proceso</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Fecha de Convenio / Registro
                    </label>
                    <input
                      type="date"
                      value={agreementDate}
                      onChange={(e) => setAgreementDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Notas y Condiciones del Convenio
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detalles del acuerdo, comisiones, tiempos de respuesta, etc..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {isSaving ? 'Guardando...' : editingAlly ? 'Actualizar Aliado' : 'Guardar Aliado'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {allyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-left"
            >
              <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3.5 border border-rose-100">
                <Trash2 size={22} />
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1">¿Eliminar aliado estratégico?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-5">
                Se eliminará el aliado <strong className="text-slate-800">"{allyToDelete.name}"</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAllyToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFICIAL COMPANY EDITOR MODAL (Exact same component as Directory) */}
      <AnimatePresence>
        {isAddingCompany && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
            <div className="max-w-5xl w-full my-auto">
              <CompanyEditorView
                editingCompany={null}
                newCompanyData={newCompanyData}
                setNewCompanyData={setNewCompanyData}
                allIndustries={industries}
                onCancel={() => setIsAddingCompany(false)}
                onSave={handleSaveCompany}
                isSaving={isSavingCompany}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK CREATE MEMBER/CONTACT MODAL */}
      <AnimatePresence>
        {showCreateMemberModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Crear Persona en Directorio</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedCompany ? `Vinculando a: ${selectedCompany.name}` : 'Registra un nuevo contacto general'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateMemberModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {memberError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{memberError}</span>
                </div>
              )}

              <form onSubmit={handleCreateMember} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Nombres y Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Carlos Mendoza"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Cargo / Rol de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Director de Certificaciones / Gestor de Acreditación"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="carlos@empresa.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="0987654321"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateMemberModal(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingMember}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {isSavingMember ? 'Guardando...' : 'Crear y Seleccionar'}
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
