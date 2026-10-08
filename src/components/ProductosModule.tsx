import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Briefcase,
  Boxes
} from 'lucide-react';
import { ProductItem, ProductCategory, TeamMember, Company, Process, Role } from '../types';
import { db, doc, setDoc, updateDoc, deleteDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { cleanFirestoreData } from './common/CompanyEditorView';
import { ModulePermissionsTab } from './common/ModulePermissionsTab';
import { Product360View } from './products/Product360View';

export type ProductSubTab = 'todos' | 'certificacion' | 'capacitacion' | 'qhse' | 'epp' | 'equipos' | 'permissions';

interface ProductosModuleProps {
  currentMember: TeamMember | null;
  products: ProductItem[];
  members: TeamMember[];
  companies: Company[];
  processes?: Process[];
  roles?: Role[];
  activeSubTab: ProductSubTab;
  onSubTabChange: (subTab: ProductSubTab) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  onNavigateToMember?: (memberId: string) => void;
  onNavigateToCompany?: (companyId: string) => void;
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
  processes = [],
  roles = [],
  activeSubTab,
  onSubTabChange,
  accessLevel,
  onNavigateToMember,
  onNavigateToCompany
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Tryton View State: Tree (list) vs Form (360 View)
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);

  // Calculate effective permission for current subtab
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

      // Verificación granular de permisos por submódulo
      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
      if (!isUserAdmin && currentMember) {
        const submodPerm = currentMember.moduleAccess?.[`productos_${p.category}`];
        if (submodPerm === 'ninguno') return false;
      }

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [products, activeSubTab, statusFilter, searchTerm, currentMember]);

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

  // Handle Save in Tryton 360 View Form
  const handleSaveProduct360 = async (productData: Partial<ProductItem>) => {
    try {
      const now = new Date().toISOString();
      if (selectedProduct?.id) {
        // Update existing product
        const cleanPayload = cleanFirestoreData({
          ...selectedProduct,
          ...productData,
          updatedAt: now
        });
        await setDoc(doc(db, 'products', selectedProduct.id), cleanPayload, { merge: true });
        setSelectedProduct({ ...selectedProduct, ...cleanPayload } as ProductItem);
      } else {
        // Create new product
        const newId = `prod-${Date.now()}`;
        const cleanPayload = cleanFirestoreData({
          id: newId,
          ...productData,
          createdAt: now,
          updatedAt: now
        });
        await setDoc(doc(db, 'products', newId), cleanPayload);
        setIsCreatingNew(false);
        setSelectedProduct(null);
      }
    } catch (err: any) {
      console.error('Error saving product in Firestore:', err);
      throw err;
    }
  };

  // Handle Delete in Tryton 360 View
  const handleDeleteProduct360 = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setSelectedProduct(null);
      setIsCreatingNew(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'products');
    }
  };

  // Render Permissions Matrix if selected
  if (activeSubTab === 'permissions') {
    return (
      <ModulePermissionsTab
        moduleId="productos"
        moduleName="Catálogo de Productos & Soluciones"
        currentMember={currentMember}
        members={members}
        processes={processes}
        roles={roles}
      />
    );
  }

  // 🏛️ TRYTON FORM VIEW: FULL-SCREEN PRODUCT 360 VIEW
  if (selectedProduct || isCreatingNew) {
    return (
      <Product360View
        product={selectedProduct}
        isCreating={isCreatingNew}
        initialCategory={activeSubTab !== 'todos' ? activeSubTab : 'certificacion'}
        members={members}
        companies={companies}
        onBack={() => {
          setSelectedProduct(null);
          setIsCreatingNew(false);
        }}
        onSave={handleSaveProduct360}
        onDelete={handleDeleteProduct360}
        canEdit={canEdit}
        canDelete={canDelete}
        onNavigateToMember={onNavigateToMember}
        onNavigateToCompany={onNavigateToCompany}
      />
    );
  }

  // 🏛️ TRYTON TREE VIEW: LIST OF PRODUCTS
  return (
    <div id="productos-module-container" className="space-y-6">
      
      {/* Top Filter, Search and Action Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por SKU, nombre, especialista o descripción..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters and New Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter size={13} /> Estado:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200/60">
              {[
                { val: 'all', label: 'Todos' },
                { val: 'activo', label: 'Activos' },
                { val: 'en_desarrollo', label: 'En Desarrollo' },
                { val: 'inactivo', label: 'Inactivos' }
              ].map((st, stIdx) => (
                <button
                  key={`prod_filter_st_${st.val}_${stIdx}`}
                  onClick={() => setStatusFilter(st.val)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
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
              onClick={() => setIsCreatingNew(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 uppercase tracking-wider transition-all shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              <span>Nuevo Producto / Servicio</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Table List (Tryton Tree View) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
              <Package size={32} />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">No se encontraron productos</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              No hay registros que coincidan con los filtros actuales o aún no se han creado productos en esta categoría.
            </p>
            {canEdit && (
              <button
                onClick={() => setIsCreatingNew(true)}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-blue-100 transition-all"
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
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((prod, pIdx) => {
                  const catCfg = CATEGORY_CONFIG[prod.category] || CATEGORY_CONFIG.certificacion;

                  return (
                    <tr
                      key={`prod_row_${prod.id || pIdx}_${pIdx}`}
                      onClick={() => setSelectedProduct(prod)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* SKU */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-600">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-xl border border-slate-200/60 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
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
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                            title="Abrir Ficha 360°"
                          >
                            <span>Ver Ficha</span>
                            <ChevronRight size={14} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductToDelete(prod);
                              }}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
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
                  onClick={async () => {
                    if (productToDelete) {
                      await handleDeleteProduct360(productToDelete.id);
                      setProductToDelete(null);
                    }
                  }}
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
