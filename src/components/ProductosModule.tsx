import React, { useState, useMemo } from 'react';
import {
  Package,
  Award,
  GraduationCap,
  Shield,
  HardHat,
  Wrench,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText,
  DollarSign,
  Tag,
  CheckCircle2,
  Clock,
  User,
  Building2,
  X,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  FileCheck,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductItem, ProductCategory, TeamMember, Company } from '../types';
import { db, doc, setDoc, updateDoc, deleteDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { cleanFirestoreData } from './common/CompanyEditorView';

export type ProductSubTab = 'todos' | 'certificacion' | 'capacitacion' | 'qhse' | 'epp' | 'equipos';

interface ProductosModuleProps {
  currentMember: TeamMember | null;
  products: ProductItem[];
  members: TeamMember[];
  companies: Company[];
  activeSubTab: ProductSubTab;
  onSubTabChange: (subTab: ProductSubTab) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
}

const CATEGORY_CONFIG: Record<ProductCategory, { label: string; icon: React.ReactNode; color: string; bg: string; border: string; description: string }> = {
  certificacion: {
    label: 'Certificación',
    icon: <Award size={18} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'Servicios de certificación, auditorías, normas ISO y alcances acreditados'
  },
  capacitacion: {
    label: 'Capacitación',
    icon: <GraduationCap size={18} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'Cursos formativos, talleres técnicos, mallas académicas y modalidades'
  },
  qhse: {
    label: 'QHSE',
    icon: <Shield size={18} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Calidad, Seguridad, Salud Ocupacional y Medio Ambiente'
  },
  epp: {
    label: 'EPP',
    icon: <HardHat size={18} />,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    description: 'Equipos de Protección Personal, normativas de seguridad y tallas'
  },
  equipos: {
    label: 'Equipos',
    icon: <Wrench size={18} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    description: 'Maquinaria especializada, herramientas de inspección y medición'
  }
};

export const ProductosModule: React.FC<ProductosModuleProps> = ({
  currentMember,
  products = [],
  members = [],
  companies = [],
  activeSubTab,
  onSubTabChange,
  accessLevel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<{
    sku: string;
    name: string;
    category: ProductCategory;
    subcategory: string;
    description: string;
    technicalSpecs: string;
    benefits: string;
    status: 'activo' | 'en_desarrollo' | 'inactivo';
    basePrice: number;
    costPrice: number;
    currency: 'USD' | 'EUR';
    durationOrLeadTime: string;
    certificationsOrNorms: string;
    specialistId: string;
    companyAllyId: string;
    documentsUrl: string;
    imageUrl: string;
    tags: string;
    notes: string;
  }>({
    sku: '',
    name: '',
    category: activeSubTab !== 'todos' ? activeSubTab : 'certificacion',
    subcategory: '',
    description: '',
    technicalSpecs: '',
    benefits: '',
    status: 'activo',
    basePrice: 0,
    costPrice: 0,
    currency: 'USD',
    durationOrLeadTime: '',
    certificationsOrNorms: '',
    specialistId: '',
    companyAllyId: '',
    documentsUrl: '',
    imageUrl: '',
    tags: '',
    notes: ''
  });

  // Calculate effective permission for current subtab
  // Max(General_Productos, Submodule_Specific)
  const canEdit = accessLevel === 'colaborador' || accessLevel === 'lider' || accessLevel === 'administrador';
  const canDelete = accessLevel === 'lider' || accessLevel === 'administrador';

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeSubTab === 'todos' || p.category === activeSubTab;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.specialistName && p.specialistName.toLowerCase().includes(term)) ||
        (p.companyAllyName && p.companyAllyName.toLowerCase().includes(term));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [products, activeSubTab, statusFilter, searchTerm]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = products.length;
    const certCount = products.filter(p => p.category === 'certificacion').length;
    const capCount = products.filter(p => p.category === 'capacitacion').length;
    const qhseCount = products.filter(p => p.category === 'qhse').length;
    const eppCount = products.filter(p => p.category === 'epp').length;
    const equiposCount = products.filter(p => p.category === 'equipos').length;
    const activos = products.filter(p => p.status === 'activo').length;

    return { total, certCount, capCount, qhseCount, eppCount, equiposCount, activos };
  }, [products]);

  const handleOpenCreateModal = () => {
    const defaultCat: ProductCategory = activeSubTab !== 'todos' ? activeSubTab : 'certificacion';
    const prefix = defaultCat.substring(0, 4).toUpperCase();
    const count = products.filter(p => p.category === defaultCat).length + 1;
    const autoSku = `NG-${prefix}-${String(count).padStart(3, '0')}`;

    setFormData({
      sku: autoSku,
      name: '',
      category: defaultCat,
      subcategory: '',
      description: '',
      technicalSpecs: '',
      benefits: '',
      status: 'activo',
      basePrice: 0,
      costPrice: 0,
      currency: 'USD',
      durationOrLeadTime: '',
      certificationsOrNorms: '',
      specialistId: '',
      companyAllyId: '',
      documentsUrl: '',
      imageUrl: '',
      tags: '',
      notes: ''
    });
    setEditingProduct(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(p);
    setFormData({
      sku: p.sku || '',
      name: p.name || '',
      category: p.category,
      subcategory: p.subcategory || '',
      description: p.description || '',
      technicalSpecs: p.technicalSpecs || '',
      benefits: (p.benefits || []).join('\n'),
      status: p.status || 'activo',
      basePrice: p.basePrice || 0,
      costPrice: p.costPrice || 0,
      currency: p.currency || 'USD',
      durationOrLeadTime: p.durationOrLeadTime || '',
      certificationsOrNorms: (p.certificationsOrNorms || []).join(', '),
      specialistId: p.specialistId || '',
      companyAllyId: p.companyAllyId || '',
      documentsUrl: p.documentsUrl || '',
      imageUrl: p.imageUrl || '',
      tags: (p.tags || []).join(', '),
      notes: p.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Por favor ingresa el nombre del producto o servicio.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const specialist = members.find(m => m.id === formData.specialistId);
      const ally = companies.find(c => c.id === formData.companyAllyId);

      const benefitsArray = formData.benefits
        .split('\n')
        .map(b => b.trim())
        .filter(b => b.length > 0);

      const certsArray = formData.certificationsOrNorms
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const now = new Date().toISOString();

      if (editingProduct) {
        const rawUpdatedItem: Record<string, any> = {
          sku: formData.sku.trim() || editingProduct.sku,
          name: formData.name.trim(),
          category: formData.category,
          subcategory: formData.subcategory.trim() || '',
          description: formData.description.trim() || '',
          technicalSpecs: formData.technicalSpecs.trim() || '',
          benefits: benefitsArray,
          status: formData.status || 'activo',
          basePrice: Number(formData.basePrice) || 0,
          costPrice: Number(formData.costPrice) || 0,
          currency: formData.currency || 'USD',
          durationOrLeadTime: formData.durationOrLeadTime.trim() || '',
          certificationsOrNorms: certsArray,
          specialistId: formData.specialistId || '',
          specialistName: specialist?.name || '',
          companyAllyId: formData.companyAllyId || '',
          companyAllyName: ally?.name || '',
          documentsUrl: formData.documentsUrl.trim() || '',
          imageUrl: formData.imageUrl.trim() || '',
          tags: tagsArray,
          notes: formData.notes.trim() || '',
          updatedAt: now
        };
        const updatedItem = cleanFirestoreData(rawUpdatedItem);
        await setDoc(doc(db, 'products', editingProduct.id), { ...editingProduct, ...updatedItem }, { merge: true });
      } else {
        const id = `prod-${Date.now()}`;
        const rawNewItem: Record<string, any> = {
          id,
          sku: formData.sku.trim() || `NG-PRD-${Date.now().toString().slice(-4)}`,
          name: formData.name.trim(),
          category: formData.category,
          subcategory: formData.subcategory.trim() || '',
          description: formData.description.trim() || '',
          technicalSpecs: formData.technicalSpecs.trim() || '',
          benefits: benefitsArray,
          status: formData.status || 'activo',
          basePrice: Number(formData.basePrice) || 0,
          costPrice: Number(formData.costPrice) || 0,
          currency: formData.currency || 'USD',
          durationOrLeadTime: formData.durationOrLeadTime.trim() || '',
          certificationsOrNorms: certsArray,
          specialistId: formData.specialistId || '',
          specialistName: specialist?.name || '',
          companyAllyId: formData.companyAllyId || '',
          companyAllyName: ally?.name || '',
          documentsUrl: formData.documentsUrl.trim() || '',
          imageUrl: formData.imageUrl.trim() || '',
          tags: tagsArray,
          notes: formData.notes.trim() || '',
          createdAt: now,
          updatedAt: now
        };
        const newItem = cleanFirestoreData(rawNewItem);
        await setDoc(doc(db, 'products', id), newItem);
      }

      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setFormError(err?.message || 'Ocurrió un error al guardar el producto. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      setProductToDelete(null);
      if (selectedProduct?.id === productToDelete.id) {
        setSelectedProduct(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'products');
    }
  };

  return (
    <div id="productos-module-container" className="space-y-4">
      {/* Top Filter, Search and Action Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por SKU, nombre, especialista o descripción..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter size={13} /> Estado:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60">
              {[
                { val: 'all', label: 'Todos' },
                { val: 'activo', label: 'Activos' },
                { val: 'en_desarrollo', label: 'En Desarrollo' },
                { val: 'inactivo', label: 'Inactivos' }
              ].map((st, stIdx) => (
                <button
                  key={`prod_filter_st_${st.val}_${stIdx}`}
                  onClick={() => setStatusFilter(st.val)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    statusFilter === st.val
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {canEdit && (
            <button
              id="btn-nuevo-producto"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs font-black rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 uppercase tracking-wider transition-all shrink-0"
            >
              <Plus size={15} />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Products Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Package size={32} />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">No se encontraron productos</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              No hay registros que coincidan con los filtros actuales o aún no se han creado productos en este submódulo.
            </p>
            {canEdit && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-100 transition-all"
              >
                <Plus size={14} /> Crear Primer Producto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Código / SKU</th>
                  <th className="px-6 py-4">Producto / Servicio</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Especialista / Aliado</th>
                  <th className="px-6 py-4">Precio Base</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((prod, pIdx) => {
                  const catCfg = CATEGORY_CONFIG[prod.category] || CATEGORY_CONFIG.certificacion;

                  return (
                    <tr
                      key={`prod_row_${prod.id || pIdx}_${pIdx}`}
                      onClick={() => setSelectedProduct(prod)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* SKU */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-600">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200/60 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                          {prod.sku}
                        </span>
                      </td>

                      {/* Name & Subcategory */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 max-w-md">
                          <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {prod.name}
                          </p>
                          {prod.subcategory && (
                            <p className="text-[11px] text-slate-400 font-semibold truncate">
                              {prod.subcategory}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category Pill */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${catCfg.bg} ${catCfg.color} border ${catCfg.border}`}>
                          {catCfg.icon}
                          {catCfg.label}
                        </span>
                      </td>

                      {/* Specialist / Ally */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {prod.specialistName && (
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                              <User size={12} className="text-slate-400" />
                              <span className="truncate">{prod.specialistName}</span>
                            </div>
                          )}
                          {prod.companyAllyName && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                              <Building2 size={12} className="text-slate-400" />
                              <span className="truncate">{prod.companyAllyName}</span>
                            </div>
                          )}
                          {!prod.specialistName && !prod.companyAllyName && (
                            <span className="text-slate-400 italic text-[11px]">No asignado</span>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        {prod.basePrice > 0 ? (
                          <span>${prod.basePrice.toLocaleString('es-EC', { minimumFractionDigits: 2 })} {prod.currency || 'USD'}</span>
                        ) : (
                          <span className="text-slate-400 font-medium">A cotizar</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          prod.status === 'activo'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : prod.status === 'en_desarrollo'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            prod.status === 'activo' ? 'bg-emerald-500' : prod.status === 'en_desarrollo' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {prod.status === 'activo' ? 'Activo' : prod.status === 'en_desarrollo' ? 'Desarrollo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(prod);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                            title="Ver Ficha Técnica"
                          >
                            <Eye size={14} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={(e) => handleOpenEditModal(prod, e)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductToDelete(prod);
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
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
        )}
      </div>

      {/* DETAIL MODAL / DRAWER */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-lg text-[10px] font-black uppercase font-mono tracking-wider">
                      {selectedProduct.sku}
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-500/40 text-blue-200 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {CATEGORY_CONFIG[selectedProduct.category]?.label}
                    </span>
                  </div>
                  <h2 className="text-xl font-black">{selectedProduct.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content Body */}
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Description */}
                {selectedProduct.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Descripción General</h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Technical Specs & Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Precio Base / Moneda</span>
                    <p className="text-base font-black text-slate-900">
                      ${selectedProduct.basePrice?.toLocaleString('es-EC', { minimumFractionDigits: 2 }) || '0.00'} {selectedProduct.currency || 'USD'}
                    </p>
                    {selectedProduct.costPrice ? (
                      <p className="text-[10px] text-slate-400 font-semibold">Costo referencial: ${selectedProduct.costPrice.toFixed(2)}</p>
                    ) : null}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Duración / Plazo de Entrega</span>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-500" />
                      {selectedProduct.durationOrLeadTime || 'No especificado'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Especialista Responsable</span>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <User size={14} className="text-purple-500" />
                      {selectedProduct.specialistName || 'No asignado'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Compañía Aliada / Proveedor</span>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 size={14} className="text-emerald-500" />
                      {selectedProduct.companyAllyName || 'Interno / Propio'}
                    </p>
                  </div>
                </div>

                {/* Technical Specs */}
                {selectedProduct.technicalSpecs && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Especificaciones Técnicas & Alcance</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                      {selectedProduct.technicalSpecs}
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {selectedProduct.benefits && selectedProduct.benefits.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Beneficios Clave</h4>
                    <div className="space-y-1.5">
                      {selectedProduct.benefits.map((b, idx) => (
                        <div key={`prod_detail_b_${idx}`} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Norms & Certifications */}
                {selectedProduct.certificationsOrNorms && selectedProduct.certificationsOrNorms.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Normativas / Estándares</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.certificationsOrNorms.map((n, idx) => (
                        <span key={`prod_detail_norm_${idx}`} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-200/60">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents / Brochure Link */}
                {selectedProduct.documentsUrl && (
                  <div className="pt-2 border-t border-slate-100">
                    <a
                      href={selectedProduct.documentsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                    >
                      <FileText size={14} className="text-blue-600" />
                      Ver Ficha Técnica / Brochure
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Creado: {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString('es-EC') : 'N/A'}
                </span>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => {
                        const p = selectedProduct;
                        setSelectedProduct(null);
                        handleOpenEditModal(p);
                      }}
                      className="px-4 py-2 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20"
                    >
                      Editar Producto
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{editingProduct ? 'Editar Producto / Servicio' : 'Nuevo Producto / Servicio'}</h3>
                    <p className="text-xs text-slate-400">Completa los datos técnicos y comerciales del catálogo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Submódulo / Categoría *
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as ProductCategory }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="certificacion">Certificación</option>
                      <option value="capacitacion">Capacitación</option>
                      <option value="qhse">QHSE</option>
                      <option value="epp">EPP</option>
                      <option value="equipos">Equipos</option>
                    </select>
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Código / SKU *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="e.g. NG-CERT-001"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Estado Operativo *
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="activo">Activo</option>
                      <option value="en_desarrollo">En Desarrollo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Nombre del Producto o Servicio *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Certificación ISO 9001:2015 Sistemas de Gestión de Calidad"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Subtipo / Clasificación
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={e => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="e.g. Auditoría Externa, Taller In-Company, Calzado Dieléctrico..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Resumen del alcance y propósito del producto..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                {/* Pricing & Duration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Precio Base (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={e => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Costo Referencial (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={e => setFormData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Duración / Plazo de Entrega
                    </label>
                    <input
                      type="text"
                      value={formData.durationOrLeadTime}
                      onChange={e => setFormData(prev => ({ ...prev, durationOrLeadTime: e.target.value }))}
                      placeholder="e.g. 40 Horas, 3 días laborables"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Specialist & Ally Link */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Especialista Interno Responsable
                    </label>
                    <select
                      value={formData.specialistId}
                      onChange={e => setFormData(prev => ({ ...prev, specialistId: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      <option value="">-- Sin especialista asignado --</option>
                      {members.map((m, mIdx) => (
                        <option key={`prod_form_m_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Compañía Aliada / Proveedor
                    </label>
                    <select
                      value={formData.companyAllyId}
                      onChange={e => setFormData(prev => ({ ...prev, companyAllyId: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      <option value="">-- Interno (Novagreen) --</option>
                      {companies.map((c, cIdx) => (
                        <option key={`prod_form_c_${c.id || cIdx}_${cIdx}`} value={c.id}>{c.name} ({c.ruc})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Technical Specs */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Especificaciones Técnicas & Requisitos
                  </label>
                  <textarea
                    rows={3}
                    value={formData.technicalSpecs}
                    onChange={e => setFormData(prev => ({ ...prev, technicalSpecs: e.target.value }))}
                    placeholder="Detalles técnicos, materiales, prerrequisitos académicos o alcances normativos..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                {/* Benefits */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Beneficios Clave (uno por línea)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.benefits}
                    onChange={e => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
                    placeholder="Mayor competitividad en licitaciones&#10;Cumplimiento con el Ministerio del Trabajo..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                {/* Norms & Document URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Normativas / Estándares (separados por coma)
                    </label>
                    <input
                      type="text"
                      value={formData.certificationsOrNorms}
                      onChange={e => setFormData(prev => ({ ...prev, certificationsOrNorms: e.target.value }))}
                      placeholder="ISO 9001, OSHA 18001, ANSI Z87.1"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Enlace a Ficha Técnica / Brochure (PDF o URL)
                    </label>
                    <input
                      type="text"
                      value={formData.documentsUrl}
                      onChange={e => setFormData(prev => ({ ...prev, documentsUrl: e.target.value }))}
                      placeholder="https://drive.google.com/..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    {isSaving ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 text-center"
            >
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">¿Eliminar producto?</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Estás a punto de eliminar <strong className="text-slate-800">{productToDelete.name}</strong> ({productToDelete.sku}). Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-red-500/25 transition-all"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ProductosModule;
