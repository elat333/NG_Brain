import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Award, 
  Building2, 
  DollarSign, 
  Calendar, 
  Edit3, 
  Trash2, 
  X, 
  Layers, 
  TrendingUp, 
  Clock, 
  User, 
  FileText, 
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Boxes
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  AcreditationCertification, 
  AcreditationAlly, 
  VolumePriceTier, 
  TeamMember,
  Company,
  ProductItem
} from '../../types';
import { cleanFirestoreData } from '../common/CompanyEditorView';
import { ProductCombobox } from './ProductCombobox';

interface AcreditacionCertificationsViewProps {
  certifications: AcreditationCertification[];
  allies: AcreditationAlly[];
  companies: Company[];
  products?: ProductItem[];
  currentMember: TeamMember | null;
  loading?: boolean;
}

export const AcreditacionCertificationsView: React.FC<AcreditacionCertificationsViewProps> = ({
  certifications,
  allies,
  companies,
  products = [],
  currentMember,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [allyFilter, setAllyFilter] = useState<string>('all');

  // Drawer / Detail modal state (when tapping on name)
  const [selectedDetailCert, setSelectedDetailCert] = useState<AcreditationCertification | null>(null);

  // Modal Add/Edit state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCert, setEditingCert] = useState<AcreditationCertification | null>(null);
  const [certToDelete, setCertToDelete] = useState<AcreditationCertification | null>(null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductSku, setSelectedProductSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [type, setType] = useState<'OEC' | 'CI' | 'OC'>('OEC');
  const [selectedAllyId, setSelectedAllyId] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [price1, setPrice1] = useState<string>('');
  const [validityDate, setValidityDate] = useState<string>('');
  const [academicHours, setAcademicHours] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [requirements, setRequirements] = useState<string>('');
  const [volumePrices, setVolumePrices] = useState<VolumePriceTier[]>([]);
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filter certifications
  const filteredCertifications = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return certifications.filter(cert => {
      const matchSearch =
        !term ||
        cert.name.toLowerCase().includes(term) ||
        (cert.code && cert.code.toLowerCase().includes(term)) ||
        (cert.productSku && cert.productSku.toLowerCase().includes(term)) ||
        (cert.allyName && cert.allyName.toLowerCase().includes(term)) ||
        (cert.companyName && cert.companyName.toLowerCase().includes(term)) ||
        (cert.description && cert.description.toLowerCase().includes(term));

      const matchType = typeFilter === 'all' || cert.type === typeFilter;
      const matchAlly = allyFilter === 'all' || cert.allyId === allyFilter;

      return matchSearch && matchType && matchAlly;
    });
  }, [certifications, searchTerm, typeFilter, allyFilter]);

  // Handle auto-population when selecting a catalog product
  const handleSelectCatalogProduct = (product: ProductItem | null) => {
    if (!product) {
      setSelectedProductId('');
      setSelectedProductSku('');
      return;
    }

    setSelectedProductId(product.id);
    setSelectedProductSku(product.sku || '');
    setName(product.name || '');
    setCode(product.sku || '');

    // Map category to tipology if applicable
    if (product.category === 'capacitacion') {
      setType('OC');
    } else {
      setType('OEC');
    }

    if (product.durationOrLeadTime) {
      const parsedHours = parseInt(product.durationOrLeadTime.replace(/\D/g, ''), 10);
      if (!isNaN(parsedHours) && parsedHours > 0) {
        setAcademicHours(parsedHours.toString());
      }
    }

    if (product.description) {
      setDescription(product.description);
    }
    if (product.technicalSpecs) {
      setRequirements(product.technicalSpecs);
    }
    if (product.costPrice && product.costPrice > 0) {
      setPurchasePrice(product.costPrice.toString());
    }
    if (product.basePrice && product.basePrice > 0) {
      setPrice1(product.basePrice.toString());
    }
  };

  // Handle open add modal
  const handleOpenAddModal = () => {
    setEditingCert(null);
    setSelectedProductId('');
    setSelectedProductSku('');
    setName('');
    setCode('');
    setType('OEC');
    setSelectedAllyId(allies.length > 0 ? allies[0].id : '');
    setPurchasePrice('');
    setPrice1('');
    setValidityDate('');
    setAcademicHours('');
    setDescription('');
    setRequirements('');
    setVolumePrices([]);
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (cert: AcreditationCertification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCert(cert);
    setSelectedProductId(cert.productId || '');
    setSelectedProductSku(cert.productSku || '');
    setName(cert.name || '');
    setCode(cert.code || '');
    setType(cert.type || 'OEC');
    setSelectedAllyId(cert.allyId || '');
    setPurchasePrice(cert.purchasePrice !== undefined && cert.purchasePrice !== null ? cert.purchasePrice.toString() : '');
    setPrice1(cert.price1 !== undefined && cert.price1 !== null ? cert.price1.toString() : '');
    setValidityDate(cert.validityDate || '');
    setAcademicHours(cert.academicHours?.toString() || '');
    setDescription(cert.description || '');
    setRequirements(cert.requirements || '');
    setVolumePrices(cert.volumePrices || []);
    setFormError('');
    setIsModalOpen(true);
  };

  // Add volume price tier
  const handleAddVolumeTier = () => {
    const newTier: VolumePriceTier = {
      id: `tier-${Date.now()}`,
      minQty: volumePrices.length > 0 ? (volumePrices[volumePrices.length - 1].maxQty || volumePrices[volumePrices.length - 1].minQty) + 1 : 2,
      maxQty: undefined,
      price: Number(price1) ? Number(price1) * 0.9 : 0,
      note: '',
    };
    setVolumePrices([...volumePrices, newTier]);
  };

  const handleUpdateVolumeTier = (index: number, field: keyof VolumePriceTier, value: any) => {
    const updated = [...volumePrices];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setVolumePrices(updated);
  };

  const handleRemoveVolumeTier = (index: number) => {
    setVolumePrices(volumePrices.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Por favor ingresa el nombre de la certificación/capacitación.');
      return;
    }
    if (!selectedAllyId) {
      setFormError('Es obligatorio vincular la certificación con un Aliado Estratégico.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const ally = allies.find(a => a.id === selectedAllyId);
      const certId = editingCert ? editingCert.id : `cert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const numPurchasePrice = purchasePrice && !isNaN(Number(purchasePrice)) ? Number(purchasePrice) : 0;
      const numPrice1 = price1 && !isNaN(Number(price1)) ? Number(price1) : 0;

      const rawCertData: Record<string, any> = {
        id: certId,
        name: name.trim(),
        code: code.trim() || '',
        productId: selectedProductId || '',
        productSku: selectedProductSku || '',
        type: type || 'OEC',
        allyId: selectedAllyId,
        allyName: ally?.name || '',
        companyName: ally?.companyName || '',
        purchasePrice: numPurchasePrice,
        price1: numPrice1,
        volumePrices: volumePrices.length > 0 ? volumePrices : [],
        validityDate: validityDate || '',
        academicHours: academicHours ? Number(academicHours) : 0,
        description: description.trim() || '',
        requirements: requirements.trim() || '',
        status: 'active',
        createdAt: editingCert ? editingCert.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const certData = cleanFirestoreData(rawCertData);

      await setDoc(doc(db, 'acreditation_certifications', certId), certData);
      setIsModalOpen(false);
      setEditingCert(null);

      // If detail modal was open, refresh it
      if (selectedDetailCert?.id === certId) {
        setSelectedDetailCert(certData as AcreditationCertification);
      }
    } catch (err: any) {
      console.error('Error saving certification:', err);
      setFormError(err?.message || 'Ocurrió un error al guardar. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!certToDelete) return;
    try {
      await deleteDoc(doc(db, 'acreditation_certifications', certToDelete.id));
      if (selectedDetailCert?.id === certToDelete.id) {
        setSelectedDetailCert(null);
      }
      setCertToDelete(null);
    } catch (err) {
      console.error('Error deleting certification:', err);
    }
  };

  // Helper for tipology badge styling
  const getTypeBadge = (certType: 'OEC' | 'CI' | 'OC') => {
    switch (certType) {
      case 'OEC':
        return {
          label: 'OEC - Conformidad',
          fullTitle: 'Organismo Evaluador de la Conformidad',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
        };
      case 'CI':
        return {
          label: 'CI - Indep.',
          fullTitle: 'Evaluador Independiente',
          color: 'bg-blue-50 text-blue-700 border-blue-200/70',
        };
      case 'OC':
        return {
          label: 'OC - Capacitador',
          fullTitle: 'Operador de Capacitación',
          color: 'bg-purple-50 text-purple-700 border-purple-200/70',
        };
      default:
        return {
          label: certType,
          fullTitle: certType,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const getCertAllyDetails = (cert: AcreditationCertification) => {
    const ally = allies.find(a => a.id === cert.allyId);
    const company = companies.find(c => c.id === ally?.companyId);
    return { ally, company };
  };

  return (
    <div className="space-y-5 text-left">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
            <Award size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                Capacitación y Certificación Acreditada
              </h2>
              <span className="px-2 py-0.5 bg-emerald-100/70 text-emerald-800 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
                {certifications.length} Ofertas
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Catálogo de avales, certificaciones y esquemas OEC / CI / OC con matriz de precios y costos.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="btn-add-acreditation-cert"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-slate-900/10 hover:shadow-md cursor-pointer shrink-0"
        >
          <Plus size={15} className="stroke-[2.5]" />
          <span>Nueva Oferta</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-certs"
            type="text"
            placeholder="Buscar por certificación, código, aliado o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tipology Filter Pills */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({certifications.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('OEC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'OEC' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            OEC
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('CI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'CI' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CI
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('OC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'OC' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            OC
          </button>
        </div>

        {/* Ally Selector Filter */}
        <div className="w-full sm:w-auto min-w-[170px]">
          <select
            value={allyFilter}
            onChange={(e) => setAllyFilter(e.target.value)}
            className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
          >
            <option value="all">Todos los aliados</option>
            {allies.map((ally, aIdx) => (
              <option key={`acred_cert_ally_opt_${ally.id || aIdx}_${aIdx}`} value={ally.id}>
                {ally.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LIST VIEW (Table with click on name for full detail) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-slate-800 mb-3" />
            <p className="text-xs font-bold text-slate-500">Cargando catálogo acreditado...</p>
          </div>
        ) : filteredCertifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <Award size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {searchTerm || typeFilter !== 'all' || allyFilter !== 'all'
                ? 'No se encontraron certificaciones con los filtros seleccionados'
                : 'Aún no hay certificaciones registradas'}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mb-4">
              Crea tu oferta de certificaciones indicando el tipo de aval, aliado proveedor y costos de compra y venta.
            </p>
            {!searchTerm && typeFilter === 'all' && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Plus size={14} />
                <span>Agregar Primera Oferta</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Certificación / Esquema</th>
                  <th className="py-3.5 px-4">Tipología</th>
                  <th className="py-3.5 px-4">Proveedor / Aliado</th>
                  <th className="py-3.5 px-4">Vigencia</th>
                  <th className="py-3.5 px-4 text-right">Costo (Compra)</th>
                  <th className="py-3.5 px-4 text-right">Precio 1 (Venta)</th>
                  <th className="py-3.5 px-4 text-right">Margen</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredCertifications.map((cert, certIdx) => {
                  const badge = getTypeBadge(cert.type);
                  const margin = (cert.price1 || 0) - (cert.purchasePrice || 0);
                  const marginPercent = cert.price1 > 0 ? ((margin / cert.price1) * 100).toFixed(0) : 0;
                  const hasVolumePrices = cert.volumePrices && cert.volumePrices.length > 0;

                  return (
                    <tr 
                      key={`cert_row_${cert.id || certIdx}_${certIdx}`} 
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDetailCert(cert)}
                    >
                      {/* Name - Clickable for details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetailCert(cert);
                            }}
                            className="font-bold text-slate-900 hover:text-emerald-700 text-left transition-colors flex items-center gap-1.5"
                          >
                            <span>{cert.name}</span>
                            <ChevronRight size={13} className="text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cert.code && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                              {cert.code}
                            </span>
                          )}
                          {cert.productId && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded" title="Enlazado al catálogo de productos">
                              <Boxes size={9} />
                              <span>Catálogo</span>
                            </span>
                          )}
                          {hasVolumePrices && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                              <Layers size={9} />
                              <span>{cert.volumePrices?.length} Escalas</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Typology Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          title={badge.fullTitle}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Supplier / Ally */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{cert.allyName || 'Sin aliado'}</span>
                        </div>
                        {cert.companyName && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[170px]">
                            {cert.companyName}
                          </div>
                        )}
                      </td>

                      {/* Dates / Validity */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {cert.validityDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="text-slate-400" />
                            <span>{cert.validityDate}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-600">
                        ${(cert.purchasePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Price 1 (Selling) */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                        ${(cert.price1 || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-emerald-700">
                          +${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600">
                          {marginPercent}% margen
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Editar oferta"
                            onClick={(e) => handleOpenEditModal(cert, e)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            title="Eliminar oferta"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCertToDelete(cert);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* FULL DETAIL VIEW MODAL / DRAWER (Triggered by clicking on the name) */}
      <AnimatePresence>
        {selectedDetailCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto"
            >
              {/* Top Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
                    <Award size={24} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          getTypeBadge(selectedDetailCert.type).color
                        }`}
                      >
                        {getTypeBadge(selectedDetailCert.type).fullTitle} ({selectedDetailCert.type})
                      </span>
                      {selectedDetailCert.code && (
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-mono font-bold">
                          {selectedDetailCert.code}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mt-1.5">
                      {selectedDetailCert.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    title="Editar certificación"
                    onClick={() => handleOpenEditModal(selectedDetailCert)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedDetailCert(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body Content */}
              <div className="space-y-6 pt-5">
                {/* 1. Supplier & Ally Information Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                    <Building2 size={13} className="text-slate-400" />
                    <span>Proveedor / Aliado Estratégico Asociado</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Entidad Aliada</span>
                      <span className="text-sm font-black text-slate-900">{selectedDetailCert.allyName || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Empresa en Directorio</span>
                      <span className="text-sm font-bold text-slate-800">{selectedDetailCert.companyName || 'Sin empresa'}</span>
                    </div>
                  </div>

                  {/* Extract contact if available */}
                  {(() => {
                    const { ally } = getCertAllyDetails(selectedDetailCert);
                    if (ally?.contactName || ally?.contactEmail || ally?.contactPhone) {
                      return (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                          {ally.contactName && (
                            <span className="flex items-center gap-1 font-bold">
                              <User size={12} className="text-slate-400" />
                              <span>{ally.contactName}</span>
                            </span>
                          )}
                          {ally.contactEmail && (
                            <span className="flex items-center gap-1">
                              <span>✉️ {ally.contactEmail}</span>
                            </span>
                          )}
                          {ally.contactPhone && (
                            <span className="flex items-center gap-1">
                              <span>📞 {ally.contactPhone}</span>
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* 2. Economic & Pricing Matrix */}
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <DollarSign size={13} className="text-slate-400" />
                    <span>Matriz de Costos y Precios</span>
                  </div>

                  {/* Primary Cards: Purchase vs Selling vs Profit */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Precio de Compra (Costo)
                      </span>
                      <div className="text-base md:text-lg font-black text-slate-800 font-mono mt-1">
                        ${(selectedDetailCert.purchasePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Pago neto al aliado</span>
                    </div>

                    <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-3.5 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Precio 1 (Venta Base)
                      </span>
                      <div className="text-base md:text-lg font-black text-white font-mono mt-1">
                        ${(selectedDetailCert.price1 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-slate-300 font-medium">Precio unitario base</span>
                    </div>

                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Margen Unitario
                      </span>
                      <div className="text-base md:text-lg font-black text-emerald-700 font-mono mt-1">
                        +${((selectedDetailCert.price1 || 0) - (selectedDetailCert.purchasePrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        {selectedDetailCert.price1 > 0
                          ? `${(((selectedDetailCert.price1 - selectedDetailCert.purchasePrice) / selectedDetailCert.price1) * 100).toFixed(1)}% rentabilidad`
                          : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Volume Price Matrix Table */}
                  {selectedDetailCert.volumePrices && selectedDetailCert.volumePrices.length > 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                          Escalas de Precio por Volumen / Cantidad
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {selectedDetailCert.volumePrices.length} rangos definidos
                        </span>
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-2.5 px-3.5">Rango de Cantidad</th>
                            <th className="py-2.5 px-3.5 text-right">Precio Unitario Negociado</th>
                            <th className="py-2.5 px-3.5 text-right">Margen por Unidad</th>
                            <th className="py-2.5 px-3.5">Notas / Escala</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {selectedDetailCert.volumePrices.map((tier, idx) => {
                            const tierMargin = tier.price - (selectedDetailCert.purchasePrice || 0);
                            return (
                              <tr key={`cert_detail_tier_${tier.id || idx}_${idx}`} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3.5 font-bold text-slate-900">
                                  {tier.minQty} {tier.maxQty ? `a ${tier.maxQty} unidades` : 'unidades o más'}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono font-black text-slate-900">
                                  ${tier.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700">
                                  +${tierMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                                  {tier.note || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                      No se han configurado escalas de precio por volumen para esta certificación.
                    </div>
                  )}
                </div>

                {/* 3. Dates & Technical Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Fecha de Vigencia / Validez
                    </span>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{selectedDetailCert.validityDate || 'Sin fecha de vigencia establecida'}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Carga Horaria / Horas Académicas
                    </span>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>{selectedDetailCert.academicHours ? `${selectedDetailCert.academicHours} horas` : 'No especificado'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Description & Requirements */}
                {selectedDetailCert.description && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Descripción y Alcance del Aval
                    </span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3.5 border border-slate-200 rounded-xl">
                      {selectedDetailCert.description}
                    </p>
                  </div>
                )}

                {selectedDetailCert.requirements && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Requisitos de Emisión / Acreditación
                    </span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3.5 border border-slate-200 rounded-xl">
                      {selectedDetailCert.requirements}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: {selectedDetailCert.id}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDetailCert(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar Ficha
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT CERTIFICATION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingCert ? 'Editar Oferta Acreditada' : 'Registrar Oferta de Certificación'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Configura el aval, tipología, aliado emisor y matriz de precios
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                {/* Product Catalog Link & Auto-Population */}
                <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <Boxes size={14} className="text-emerald-700" />
                      <span>Vincular con Producto del Catálogo (Opcional)</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      Capacitación / Certificación
                    </span>
                  </div>
                  <ProductCombobox
                    products={products}
                    selectedProductId={selectedProductId}
                    onSelectProduct={handleSelectCatalogProduct}
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                    💡 Al seleccionar un producto del catálogo, se autocompletarán automáticamente el nombre, código SKU, horas, descripción y requisitos base.
                  </p>
                </div>

                {/* Name & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Nombre de la Certificación / Curso <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Auditor Líder ISO 9001 / Prevención de Riesgos..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Código / Ref
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. CERT-001"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Typology & Supplier Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Tipología de Acreditación <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      required
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="OEC">OEC (Organismo Evaluador de la Conformidad)</option>
                      <option value="CI">CI (Evaluador Independiente)</option>
                      <option value="OC">OC (Operador de Capacitación)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Aliado Proveedor <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedAllyId}
                      onChange={(e) => setSelectedAllyId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Selecciona el aliado emisor...</option>
                      {allies.map((ally, allyIdx) => (
                        <option key={`cert_opt_ally_${ally.id || allyIdx}_${allyIdx}`} value={ally.id}>
                          {ally.name} {ally.companyName ? `(${ally.companyName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing: Purchase & Selling Price (Optional) */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Matriz de Precios Base
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-200/70 px-1.5 py-0.2 rounded">
                        Opcional
                      </span>
                    </div>
                    {Number(price1) > 0 && Number(purchasePrice) > 0 && (
                      <span className="text-[11px] font-bold text-emerald-700 font-mono">
                        Margen: +${(Number(price1) - Number(purchasePrice)).toFixed(2)} ({(((Number(price1) - Number(purchasePrice)) / Number(price1)) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Precio de Compra (Costo Neto)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Se puede registrar más adelante</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Precio 1 (Venta Base Unitario)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={price1}
                          onChange={(e) => setPrice1(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Se puede registrar más adelante</span>
                    </div>
                  </div>
                </div>

                {/* Volume Prices Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Precios Escalonados por Volumen / Cantidad
                    </label>
                    <button
                      type="button"
                      onClick={handleAddVolumeTier}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Agregar Escala</span>
                    </button>
                  </div>

                  {volumePrices.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      Opcional: Si ofreces descuentos por cantidad de certificados, puedes agregar escalas parametrizables.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {volumePrices.map((tier, idx) => (
                        <div key={`cert_form_tier_${tier.id || idx}_${idx}`} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                          <div className="w-24">
                            <span className="text-[9px] text-slate-400 block font-bold">Min Uds</span>
                            <input
                              type="number"
                              value={tier.minQty}
                              onChange={(e) => handleUpdateVolumeTier(idx, 'minQty', Number(e.target.value))}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono"
                            />
                          </div>

                          <div className="w-24">
                            <span className="text-[9px] text-slate-400 block font-bold">Max Uds</span>
                            <input
                              type="number"
                              placeholder="+"
                              value={tier.maxQty || ''}
                              onChange={(e) => handleUpdateVolumeTier(idx, 'maxQty', e.target.value ? Number(e.target.value) : undefined)}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono"
                            />
                          </div>

                          <div className="w-28">
                            <span className="text-[9px] text-slate-400 block font-bold">Precio Unitario</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.price}
                                onChange={(e) => handleUpdateVolumeTier(idx, 'price', Number(e.target.value))}
                                className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex-1">
                            <span className="text-[9px] text-slate-400 block font-bold">Nota / Condición</span>
                            <input
                              type="text"
                              placeholder="Ej. Corporativo..."
                              value={tier.note || ''}
                              onChange={(e) => handleUpdateVolumeTier(idx, 'note', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveVolumeTier(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors mt-3"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Validity & Academic Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Fecha de Vigencia / Validez
                    </label>
                    <input
                      type="date"
                      value={validityDate}
                      onChange={(e) => setValidityDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                      Horas Académicas
                    </label>
                    <input
                      type="number"
                      placeholder="Ej. 40"
                      value={academicHours}
                      onChange={(e) => setAcademicHours(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Description & Requirements */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Descripción y Alcance
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Resumen del aval, perfil del egresado, etc..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Requisitos para la Acreditación
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Documentos requeridos, requisitos previos o de titulación..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {isSaving ? 'Guardando...' : editingCert ? 'Actualizar Oferta' : 'Guardar Oferta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {certToDelete && (
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
              <h3 className="text-sm font-black text-slate-900 mb-1">¿Eliminar oferta de certificación?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-5">
                Se eliminará la oferta <strong className="text-slate-800">"{certToDelete.name}"</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCertToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
