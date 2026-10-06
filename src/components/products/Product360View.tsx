import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Award,
  GraduationCap,
  Shield,
  HardHat,
  Wrench,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Layers,
  FileText,
  User,
  Building2,
  Clock,
  ExternalLink,
  Tag,
  Plus,
  Trash,
  Sparkles,
  Boxes,
  Truck,
  Check,
  X,
  TrendingUp,
  Percent,
  Info
} from 'lucide-react';
import { 
  ProductItem, 
  ProductCategory, 
  TeamMember, 
  Company, 
  Warehouse, 
  InventoryStockItem,
  ProductPriceTier
} from '../../types';
import { db, collection, onSnapshot, doc, setDoc } from '../../lib/firebase';
import { SearchableSelect } from '../common/SearchableSelect';

export interface Product360ViewProps {
  product?: ProductItem | null;
  isCreating?: boolean;
  initialCategory?: ProductCategory;
  members: TeamMember[];
  companies: Company[];
  onBack: () => void;
  onSave: (productData: Partial<ProductItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  canEdit?: boolean;
  canDelete?: boolean;
  onNavigateToMember?: (memberId: string) => void;
  onNavigateToCompany?: (companyId: string) => void;
}

const CATEGORY_CONFIG: Record<ProductCategory, { label: string; icon: React.ReactNode; color: string; bg: string; border: string; isGood: boolean }> = {
  certificacion: {
    label: 'Certificación & Auditoría',
    icon: <Award size={18} />,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    isGood: false
  },
  capacitacion: {
    label: 'Capacitación & Formación',
    icon: <GraduationCap size={18} />,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    isGood: false
  },
  qhse: {
    label: 'QHSE & Consultoría',
    icon: <Shield size={18} />,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    isGood: false
  },
  epp: {
    label: 'EPP & Seguridad Personal',
    icon: <HardHat size={18} />,
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    isGood: true
  },
  equipos: {
    label: 'Equipos & Maquinaria',
    icon: <Wrench size={18} />,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    isGood: true
  }
};

export const Product360View: React.FC<Product360ViewProps> = ({
  product,
  isCreating = false,
  initialCategory = 'certificacion',
  members,
  companies,
  onBack,
  onSave,
  onDelete,
  canEdit = true,
  canDelete = false,
  onNavigateToMember,
  onNavigateToCompany
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(isCreating);
  const [activeTab, setActiveTab] = useState<'general' | 'prices' | 'stock' | 'relations' | 'notes'>('general');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form State
  const [sku, setSku] = useState<string>(product?.sku || '');
  const [name, setName] = useState<string>(product?.name || '');
  const [category, setCategory] = useState<ProductCategory>(product?.category || initialCategory);
  const [subcategory, setSubcategory] = useState<string>(product?.subcategory || '');
  const [description, setDescription] = useState<string>(product?.description || '');
  const [technicalSpecs, setTechnicalSpecs] = useState<string>(product?.technicalSpecs || '');
  const [status, setStatus] = useState<'activo' | 'en_desarrollo' | 'inactivo'>(product?.status || 'activo');
  const [basePrice, setBasePrice] = useState<number>(product?.basePrice ?? 0);
  const [costPrice, setCostPrice] = useState<number>(product?.costPrice ?? 0);
  const [currency, setCurrency] = useState<'USD' | 'EUR'>(product?.currency || 'USD');
  const [durationOrLeadTime, setDurationOrLeadTime] = useState<string>(product?.durationOrLeadTime || '');
  const [certificationsOrNorms, setCertificationsOrNorms] = useState<string[]>(product?.certificationsOrNorms || []);
  const [newNormInput, setNewNormInput] = useState<string>('');
  const [benefits, setBenefits] = useState<string[]>(product?.benefits || []);
  const [newBenefitInput, setNewBenefitInput] = useState<string>('');
  const [specialistId, setSpecialistId] = useState<string>(product?.specialistId || '');
  const [companyAllyId, setCompanyAllyId] = useState<string>(product?.companyAllyId || '');
  const [documentsUrl, setDocumentsUrl] = useState<string>(product?.documentsUrl || '');
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || '');
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [notes, setNotes] = useState<string>(product?.notes || '');
  const [volumePricing, setVolumePricing] = useState<ProductPriceTier[]>(product?.volumePricing || []);

  // Real-time Inventory Data from Firestore
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockItems, setStockItems] = useState<InventoryStockItem[]>([]);

  useEffect(() => {
    const unsubWh = onSnapshot(collection(db, 'warehouses'), (snap) => {
      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)));
    });
    const unsubStock = onSnapshot(collection(db, 'inventory_stock'), (snap) => {
      setStockItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryStockItem)));
    });

    return () => {
      unsubWh();
      unsubStock();
    };
  }, []);

  // Generate automatic SKU if creating
  useEffect(() => {
    if (isCreating && !sku) {
      const prefix = category.substring(0, 3).toUpperCase();
      const randomNum = Math.floor(100 + Math.random() * 900);
      setSku(`PRD-${prefix}-${randomNum}`);
    }
  }, [category, isCreating, sku]);

  // Calculations
  const isPhysicalGood = category === 'epp' || category === 'equipos';
  
  // Matched stock items for this product
  const matchedStockItems = useMemo(() => {
    if (!product && !sku) return [];
    return stockItems.filter(s => 
      (product?.id && s.productId === product.id) || 
      (sku && s.productSku === sku) ||
      (product?.name && s.productName?.toLowerCase() === product.name.toLowerCase())
    );
  }, [stockItems, product, sku]);

  const totalStockCount = useMemo(() => {
    return matchedStockItems.reduce((acc, curr) => acc + (curr.currentStock || 0), 0);
  }, [matchedStockItems]);

  const marginPercentage = useMemo(() => {
    if (basePrice > 0 && costPrice > 0) {
      return (((basePrice - costPrice) / basePrice) * 100).toFixed(1);
    }
    return null;
  }, [basePrice, costPrice]);

  // Specialists and Ally Company helpers
  const assignedSpecialist = useMemo(() => {
    return members.find(m => m.id === specialistId);
  }, [members, specialistId]);

  const assignedCompany = useMemo(() => {
    return companies.find(c => c.id === companyAllyId);
  }, [companies, companyAllyId]);

  // Handlers for tags/norms
  const handleAddNorm = () => {
    if (newNormInput.trim() && !certificationsOrNorms.includes(newNormInput.trim())) {
      setCertificationsOrNorms([...certificationsOrNorms, newNormInput.trim()]);
      setNewNormInput('');
    }
  };

  const handleRemoveNorm = (normToRemove: string) => {
    setCertificationsOrNorms(certificationsOrNorms.filter(n => n !== normToRemove));
  };

  const handleAddBenefit = () => {
    if (newBenefitInput.trim()) {
      setBenefits([...benefits, newBenefitInput.trim()]);
      setNewBenefitInput('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddVolumeTier = () => {
    setVolumePricing([
      ...volumePricing,
      { id: `tier-${Date.now()}`, minQty: 10, maxQty: 50, price: basePrice > 0 ? Number((basePrice * 0.9).toFixed(2)) : 0, currency, description: '10% de descuento por volumen' }
    ]);
  };

  const handleRemoveVolumeTier = (index: number) => {
    setVolumePricing(volumePricing.filter((_, i) => i !== index));
  };

  const handleVolumeTierChange = (index: number, field: keyof ProductPriceTier, val: any) => {
    const updated = [...volumePricing];
    updated[index] = { ...updated[index], [field]: val };
    setVolumePricing(updated);
  };

  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('El nombre del producto/servicio es obligatorio.');
      return;
    }
    if (!sku.trim()) {
      setErrorMessage('El código SKU es obligatorio.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload: Partial<ProductItem> = {
        sku: sku.trim(),
        name: name.trim(),
        category,
        subcategory: subcategory.trim() || undefined,
        description: description.trim(),
        technicalSpecs: technicalSpecs.trim() || undefined,
        benefits: benefits.length > 0 ? benefits : undefined,
        status,
        basePrice: Number(basePrice) || 0,
        costPrice: Number(costPrice) || 0,
        currency,
        volumePricing: volumePricing.length > 0 ? volumePricing : undefined,
        durationOrLeadTime: durationOrLeadTime.trim() || undefined,
        certificationsOrNorms: certificationsOrNorms.length > 0 ? certificationsOrNorms : undefined,
        specialistId: specialistId || undefined,
        specialistName: assignedSpecialist?.name || undefined,
        companyAllyId: companyAllyId || undefined,
        companyAllyName: assignedCompany?.name || undefined,
        documentsUrl: documentsUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString()
      };

      if (isCreating) {
        payload.createdAt = new Date().toISOString();
      }

      await onSave(payload);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setErrorMessage(err.message || 'Error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentCategoryCfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.certificacion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 w-full"
    >
      {/* 🧭 TRYTON TOOLBAR & BREADCRUMB HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all flex items-center justify-center shadow-xs"
              title="Volver al Catálogo"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className="hover:text-slate-600 cursor-pointer" onClick={onBack}>Catálogo</span>
                <span>/</span>
                <span className="text-slate-600 uppercase font-mono">{sku || 'NUEVO-REGISTRO'}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
                <span className={`p-2 rounded-2xl ${currentCategoryCfg.bg} ${currentCategoryCfg.color}`}>
                  {currentCategoryCfg.icon}
                </span>
                {name || (isCreating ? 'Nuevo Producto / Servicio' : 'Ficha del Producto')}
              </h1>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2.5 self-stretch md:self-auto justify-end">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (isCreating) {
                      onBack();
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProduct()}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Ficha'}</span>
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    <span>Editar Ficha</span>
                  </button>
                )}
                {canDelete && product?.id && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar "${product.name}"?`)) {
                        onDelete(product.id);
                      }
                    }}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                    title="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ⚡ TRYTON SMART RELATIONAL BUTTONS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          
          {/* Smart Button 1: Stock Total */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isPhysicalGood 
              ? 'bg-amber-50/60 border-amber-200/80 text-amber-900' 
              : 'bg-slate-50 border-slate-100 text-slate-500'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider">
                {isPhysicalGood ? 'Existencias en Bodegas' : 'Tipo de Ítem'}
              </span>
              <Boxes size={14} className={isPhysicalGood ? 'text-amber-600' : 'text-slate-400'} />
            </div>
            <p className="text-lg font-black mt-0.5">
              {isPhysicalGood ? `${totalStockCount} Unidades` : 'Servicio / Intangible'}
            </p>
          </div>

          {/* Smart Button 2: PVP & Margen */}
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-emerald-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider">Precio Venta (PVP)</span>
              <DollarSign size={14} className="text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-lg font-black">
                ${basePrice > 0 ? basePrice.toFixed(2) : '0.00'} {currency}
              </p>
              {marginPercentage && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                  +{marginPercentage}%
                </span>
              )}
            </div>
          </div>

          {/* Smart Button 3: Especialista */}
          <div 
            onClick={() => assignedSpecialist && onNavigateToMember && onNavigateToMember(assignedSpecialist.id)}
            className={`p-3 rounded-2xl border transition-all ${
              assignedSpecialist 
                ? 'bg-indigo-50/60 border-indigo-200/80 text-indigo-900 cursor-pointer hover:bg-indigo-100/60' 
                : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider">Especialista Técnico</span>
              <User size={14} className={assignedSpecialist ? 'text-indigo-600' : 'text-slate-400'} />
            </div>
            <p className="text-xs font-bold mt-1 truncate">
              {assignedSpecialist ? assignedSpecialist.name : 'Sin asignar'}
            </p>
          </div>

          {/* Smart Button 4: Empresa Aliada */}
          <div 
            onClick={() => assignedCompany && onNavigateToCompany && onNavigateToCompany(assignedCompany.id)}
            className={`p-3 rounded-2xl border transition-all ${
              assignedCompany 
                ? 'bg-purple-50/60 border-purple-200/80 text-purple-900 cursor-pointer hover:bg-purple-100/60' 
                : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider">Aliado / Proveedor</span>
              <Building2 size={14} className={assignedCompany ? 'text-purple-600' : 'text-slate-400'} />
            </div>
            <p className="text-xs font-bold mt-1 truncate">
              {assignedCompany ? assignedCompany.name : 'Interno / Propio'}
            </p>
          </div>

        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 📑 NOTEBOOK TABS (TRYTON FORM ARCHITECTURE) */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'general', label: '1. Ficha General & Técnica', icon: <FileText size={16} /> },
          { id: 'prices', label: '2. Precios & Condiciones', icon: <DollarSign size={16} /> },
          { id: 'stock', label: isPhysicalGood ? '3. Inventario & Bodegas' : '3. Capacidad & Stock', icon: <Boxes size={16} /> },
          { id: 'relations', label: '4. Especialista & Alianzas', icon: <Building2 size={16} /> },
          { id: 'notes', label: '5. Notas & Bitácora', icon: <Tag size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 📄 ACTIVE TAB CONTENT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 min-h-[420px]">
        
        {/* ==================== TAB 1: GENERAL & FICHA TÉCNICA ==================== */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* SKU */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Código SKU / Referencia</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="Ej: EPP-CAS-001"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-2xl text-xs font-mono font-bold text-slate-800 border border-slate-100">
                    {sku || 'Sin SKU'}
                  </p>
                )}
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Categoría de Negocio</label>
                {isEditing ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="certificacion">Certificación & Auditoría (Servicio)</option>
                    <option value="capacitacion">Capacitación & Formación (Servicio)</option>
                    <option value="qhse">QHSE & Consultoría (Servicio)</option>
                    <option value="epp">EPP & Dotación (Bien Físico)</option>
                    <option value="equipos">Equipos & Maquinaria (Bien Físico)</option>
                  </select>
                ) : (
                  <div className={`px-4 py-3 rounded-2xl text-xs font-bold border ${currentCategoryCfg.bg} ${currentCategoryCfg.color} ${currentCategoryCfg.border} flex items-center gap-2`}>
                    {currentCategoryCfg.icon}
                    <span>{currentCategoryCfg.label}</span>
                  </div>
                )}
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Estado Operativo</label>
                {isEditing ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="activo">🟢 Activo en Catálogo</option>
                    <option value="en_desarrollo">🟡 En Desarrollo / Homologación</option>
                    <option value="inactivo">🔴 Inactivo / Descontinuado</option>
                  </select>
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold text-slate-800 border border-slate-100 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      status === 'activo' ? 'bg-emerald-500' : status === 'en_desarrollo' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                  </p>
                )}
              </div>

            </div>

            {/* Nombre y Subcategoría */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Nombre del Producto / Servicio *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Casco Dieléctrico con Barbuquejo 4 Puntos"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-2xl text-sm font-black text-slate-900 border border-slate-100">
                    {name || 'Sin nombre'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Subcategoría / Clasificación</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="Ej: Protección para la Cabeza / Línea Dieléctrica"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-800 border border-slate-100">
                    {subcategory || 'No especificada'}
                  </p>
                )}
              </div>
            </div>

            {/* Descripción General */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Descripción Comercial</label>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción comercial, propósito del producto o alcance del servicio..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {description || 'Sin descripción disponible.'}
                </div>
              )}
            </div>

            {/* Especificaciones Técnicas */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Especificaciones Técnicas & Alcance Detallado</label>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={technicalSpecs}
                  onChange={(e) => setTechnicalSpecs(e.target.value)}
                  placeholder="Especificaciones de ingeniería, material, tallas, voltaje máximo, requisitos previos..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
                  {technicalSpecs || 'Sin especificaciones técnicas registradas.'}
                </div>
              )}
            </div>

            {/* Normas y Certificaciones Aplicables */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Normas Técnicas & Certificaciones</label>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNormInput}
                      onChange={(e) => setNewNormInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNorm())}
                      placeholder="Ej: ANSI Z89.1, OSHA 1910.135, ISO 9001..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddNorm}
                      className="px-4 py-2.5 bg-slate-800 text-white text-xs font-black rounded-xl hover:bg-slate-900 transition-all flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Agregar</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {certificationsOrNorms.map((norm) => (
                      <span key={norm} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                        {norm}
                        <button type="button" onClick={() => handleRemoveNorm(norm)} className="hover:text-red-600">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-[46px] items-center">
                  {certificationsOrNorms.length > 0 ? (
                    certificationsOrNorms.map((norm) => (
                      <span key={norm} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                        {norm}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No se han registrado normas o certificaciones específicas.</span>
                  )}
                </div>
              )}
            </div>

            {/* Beneficios Clave */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Beneficios Principales</label>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBenefitInput}
                      onChange={(e) => setNewBenefitInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                      placeholder="Ej: Aprobación inmediata para licitaciones públicas..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddBenefit}
                      className="px-4 py-2.5 bg-slate-800 text-white text-xs font-black rounded-xl hover:bg-slate-900 transition-all flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Agregar</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {benefits.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          {b}
                        </span>
                        <button type="button" onClick={() => handleRemoveBenefit(idx)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {benefits.length > 0 ? (
                    benefits.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 font-medium">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No se han registrado beneficios comerciales.</span>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 2: PRECIOS & CONDICIONES COMERCIALES ==================== */}
        {activeTab === 'prices' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Precio Base */}
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Precio de Venta Base (PVP)</label>
                  <DollarSign size={16} className="text-emerald-600" />
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={basePrice}
                      onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-base font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="px-3 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:outline-hidden"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                ) : (
                  <p className="text-2xl font-black text-slate-900">
                    ${basePrice.toLocaleString('es-EC', { minimumFractionDigits: 2 })} {currency}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 font-medium">Precio público sugerido antes de impuestos.</p>
              </div>

              {/* Costo Referencial */}
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Costo Referencial / Adquisición</label>
                  <TrendingUp size={16} className="text-blue-600" />
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-base font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="text-2xl font-black text-slate-700">
                    ${costPrice.toLocaleString('es-EC', { minimumFractionDigits: 2 })} {currency}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 font-medium">Costo de importación, compra o ejecución por hora.</p>
              </div>

              {/* Plazo / Duración */}
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Plazo de Entrega / Duración</label>
                  <Clock size={16} className="text-purple-600" />
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={durationOrLeadTime}
                    onChange={(e) => setDurationOrLeadTime(e.target.value)}
                    placeholder="Ej: 3-5 días hábiles / 40 Horas"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="text-base font-black text-slate-800">
                    {durationOrLeadTime || 'Inmediato / No especificado'}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 font-medium">Tiempo estimado de despacho o ejecución.</p>
              </div>

            </div>

            {/* Volume Pricing Tiers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Descuentos por Escala y Volumen</h3>
                  <p className="text-xs text-slate-500 font-medium">Tarifas preferenciales por cantidad adquirida o grupos empresariales.</p>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddVolumeTier}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Agregar Escala</span>
                  </button>
                )}
              </div>

              {volumePricing.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5">Cantidad Mínima</th>
                        <th className="px-6 py-3.5">Cantidad Máxima</th>
                        <th className="px-6 py-3.5">Precio Unitario ({currency})</th>
                        <th className="px-6 py-3.5">% Descuento Aprox.</th>
                        {isEditing && <th className="px-6 py-3.5 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {volumePricing.map((tier, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3 font-bold text-slate-800">
                            {isEditing ? (
                              <input
                                type="number"
                                min="1"
                                value={tier.minQty}
                                onChange={(e) => handleVolumeTierChange(idx, 'minQty', parseInt(e.target.value) || 1)}
                                className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold"
                              />
                            ) : (
                              <span>Desde {tier.minQty} unidades</span>
                            )}
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-600">
                            {isEditing ? (
                              <input
                                type="number"
                                min="1"
                                value={tier.maxQty || ''}
                                placeholder="Sin límite"
                                onChange={(e) => handleVolumeTierChange(idx, 'maxQty', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold"
                              />
                            ) : (
                              <span>{tier.maxQty ? `Hasta ${tier.maxQty} unidades` : 'En adelante'}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 font-black text-emerald-700">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={tier.price}
                                onChange={(e) => handleVolumeTierChange(idx, 'price', parseFloat(e.target.value) || 0)}
                                className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-emerald-700"
                              />
                            ) : (
                              <span>${tier.price.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 font-semibold text-slate-600">
                            {basePrice > 0 ? `${(((basePrice - tier.price) / basePrice) * 100).toFixed(0)}% OFF` : 'N/A'}
                          </td>
                          {isEditing && (
                            <td className="px-6 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveVolumeTier(idx)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-400 font-medium">
                  No hay escalas de volumen configuradas para este producto.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 3: INVENTARIO & BODEGAS (TRYTON STOCK) ==================== */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            {!isPhysicalGood ? (
              <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-100 text-center space-y-3">
                <Info size={32} className="text-blue-600 mx-auto" />
                <h3 className="text-base font-black text-blue-900">Control de Existencias No Aplicable</h3>
                <p className="text-xs text-blue-700 max-w-xl mx-auto leading-relaxed">
                  Este registro pertenece a la categoría <strong>{currentCategoryCfg.label}</strong> (Servicio Intangible / Formación). Siguiendo la arquitectura de Tryton ERP, los servicios no generan movimientos físicos de bodega ni stock consolidado.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Consolidado Header */}
                <div className="p-6 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Total Consolidado</span>
                    <h2 className="text-3xl font-black">{totalStockCount} Unidades Disponibles</h2>
                    <p className="text-xs text-slate-300 font-medium">Distribuido en {matchedStockItems.length} registros de almacenamiento.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-mono font-bold">
                      SKU: {sku}
                    </span>
                  </div>
                </div>

                {/* Desglose por Bodega */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Existencias por Bodega</h3>
                  
                  {matchedStockItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchedStockItems.map((item) => {
                        const warehouse = warehouses.find(w => w.id === item.warehouseId);
                        const isLowStock = item.currentStock <= (item.minStock || 5);

                        return (
                          <div key={item.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                  <Boxes size={14} className="text-indigo-600" />
                                  {item.warehouseName || warehouse?.name || 'Bodega'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isLowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {isLowStock ? 'Stock Bajo' : 'Stock Normal'}
                                </span>
                              </div>
                              <p className="text-2xl font-black text-slate-900 mt-2">
                                {item.currentStock} <span className="text-xs font-bold text-slate-400 uppercase">{item.unit || 'uds'}</span>
                              </p>
                              {warehouse?.location && (
                                <p className="text-[11px] text-slate-500 font-medium mt-1">Ubicación: {warehouse.location}</p>
                              )}
                            </div>

                            {/* Desglose por Tallas si existe */}
                            {item.sizesStock && Object.keys(item.sizesStock).length > 0 && (
                              <div className="pt-3 border-t border-slate-200/60 space-y-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Desglose por Tallas:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(item.sizesStock).map(([sizeKey, sizeQty]) => (
                                    <span key={sizeKey} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                                      Talla {sizeKey}: <strong>{sizeQty}</strong>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                      <Boxes size={28} className="text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No hay existencias registradas para este SKU en las bodegas.</p>
                      <p className="text-[11px] text-slate-400">Puedes ingresar stock desde el módulo de Inventario &gt; Entrada de Mercadería.</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: ESPECIALISTA, ALIANZAS & DOCUMENTOS ==================== */}
        {activeTab === 'relations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Especialista Técnico */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900">Especialista Técnico Responsable</h3>
                  </div>
                </div>
                
                {isEditing ? (
                  <SearchableSelect
                    options={[
                      { value: '', label: 'Sin especialista asignado' },
                      ...members.map(m => ({ value: m.id, label: `${m.name} (${m.role})` }))
                    ]}
                    value={specialistId}
                    onChange={(val) => setSpecialistId(val)}
                    placeholder="Seleccionar especialista del Directorio..."
                  />
                ) : (
                  <div>
                    {assignedSpecialist ? (
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">
                            {assignedSpecialist.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{assignedSpecialist.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{assignedSpecialist.role}</p>
                          </div>
                        </div>
                        {onNavigateToMember && (
                          <button
                            type="button"
                            onClick={() => onNavigateToMember(assignedSpecialist.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black flex items-center gap-1 transition-all"
                          >
                            <span>Ver Ficha 360°</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No hay especialista asignado.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Empresa Aliada / Proveedor */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-purple-600" />
                    <h3 className="text-sm font-black text-slate-900">Empresa Aliada / Proveedor</h3>
                  </div>
                </div>

                {isEditing ? (
                  <SearchableSelect
                    options={[
                      { value: '', label: 'Interno / Propio de Novagreen' },
                      ...companies.map(c => ({ value: c.id, label: `${c.name} ${c.ruc ? `(RUC: ${c.ruc})` : ''}` }))
                    ]}
                    value={companyAllyId}
                    onChange={(val) => setCompanyAllyId(val)}
                    placeholder="Seleccionar empresa aliada del Directorio..."
                  />
                ) : (
                  <div>
                    {assignedCompany ? (
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-sm">
                            {assignedCompany.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{assignedCompany.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{assignedCompany.ruc || 'Empresa Aliada'}</p>
                          </div>
                        </div>
                        {onNavigateToCompany && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCompany(assignedCompany.id)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-black flex items-center gap-1 transition-all"
                          >
                            <span>Ver Ficha 360°</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Servicio o producto propio / sin aliado externo.</p>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Documentos & Enlaces */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">URL de Ficha Técnica / Brochure PDF</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={documentsUrl}
                    onChange={(e) => setDocumentsUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <div>
                    {documentsUrl ? (
                      <a
                        href={documentsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold text-blue-600 flex items-center justify-between transition-all"
                      >
                        <span className="truncate">{documentsUrl}</span>
                        <ExternalLink size={14} className="shrink-0 ml-2" />
                      </a>
                    ) : (
                      <p className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-400 italic border border-slate-100">Sin documento adjunto.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">URL de Imagen del Producto</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <div>
                    {imageUrl ? (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                        <img src={imageUrl} alt={name} className="w-12 h-12 object-cover rounded-xl" />
                        <span className="text-xs text-slate-600 font-mono truncate">{imageUrl}</span>
                      </div>
                    ) : (
                      <p className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-400 italic border border-slate-100">Sin imagen registrada.</p>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 5: NOTAS & BITÁCORA ==================== */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            
            {/* Etiquetas */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Etiquetas / Tags Comerciales</label>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Ej: B2B, Licitaciones, Alta Rotación..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2.5 bg-slate-800 text-white text-xs font-black rounded-xl hover:bg-slate-900 transition-all flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Agregar</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold">
                        #{t}
                        <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-600">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-[46px] items-center">
                  {tags.length > 0 ? (
                    tags.map((t) => (
                      <span key={t} className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold">
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No hay etiquetas registradas.</span>
                  )}
                </div>
              )}
            </div>

            {/* Notas Internas */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Notas Internas & Observaciones de Operación</label>
              {isEditing ? (
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones de proveedores, advertencias de stock, historial de revisiones..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed min-h-[120px]">
                  {notes || 'Sin notas internas registradas para este producto.'}
                </div>
              )}
            </div>

            {/* Metadatos de Auditoría */}
            {product?.createdAt && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Creado: {new Date(product.createdAt).toLocaleString('es-EC')}</span>
                {product.updatedAt && <span>Última modificación: {new Date(product.updatedAt).toLocaleString('es-EC')}</span>}
              </div>
            )}

          </div>
        )}

      </div>
    </motion.div>
  );
};
