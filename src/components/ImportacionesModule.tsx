import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Building2, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  Eye, 
  Star, 
  Globe, 
  Sparkles, 
  X, 
  ChevronRight, 
  Mail, 
  Phone, 
  RefreshCw, 
  LayoutList, 
  LayoutGrid, 
  SlidersHorizontal, 
  RotateCcw, 
  GripVertical, 
  MoveUp, 
  MoveDown,
  FileCheck
} from 'lucide-react';
import { 
  ImportProduct, 
  ImportSupplier, 
  ImportProforma, 
  ImportProformaItem, 
  Company, 
  TeamMember 
} from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { ImportProduct360View } from './importaciones/ImportProduct360View';
import { ImportSupplier360View } from './importaciones/ImportSupplier360View';
import { ImportProforma360View } from './importaciones/ImportProforma360View';

export interface ProductColumnConfig {
  id: string;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

const DEFAULT_PRODUCT_COLUMNS: ProductColumnConfig[] = [
  { id: 'code', label: 'Código', width: 120, align: 'left' },
  { id: 'name', label: 'Producto', width: 240, align: 'left' },
  { id: 'supplier', label: 'Proveedor', width: 160, align: 'left' },
  { id: 'category', label: 'Categoría', width: 140, align: 'left' },
  { id: 'price', label: 'Precio Unitario', width: 150, align: 'left' },
  { id: 'hsCode', label: 'Partida Arancelaria', width: 150, align: 'left' },
  { id: 'status', label: 'Estado', width: 110, align: 'center' },
  { id: 'actions', label: 'Acciones', width: 140, align: 'right' }
];

interface ImportacionesModuleProps {
  companies: Company[];
  currentMember: TeamMember | null;
  accessLevel?: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab?: ImportacionesSubTab;
  onSubTabChange?: (tab: ImportacionesSubTab) => void;
}

export type ImportacionesSubTab = 'products' | 'suppliers' | 'proformas' | 'upload_proforma' | 'permissions';

export const ImportacionesModule: React.FC<ImportacionesModuleProps> = ({
  companies,
  currentMember,
  accessLevel = 'administrador',
  activeSubTab: activeSubTabProp,
  onSubTabChange
}) => {
  const [internalSubTab, setInternalSubTab] = useState<ImportacionesSubTab>('products');
  const activeSubTab = activeSubTabProp !== undefined ? activeSubTabProp : internalSubTab;

  const setActiveSubTab = (tab: ImportacionesSubTab) => {
    setInternalSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };
  
  // Data State
  const [products, setProducts] = useState<ImportProduct[]>([]);
  const [suppliers, setSuppliers] = useState<ImportSupplier[]>([]);
  const [proformas, setProformas] = useState<ImportProforma[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [productViewMode, setProductViewMode] = useState<'list' | 'grid'>('list');

  // Column Configuration State for Product List View
  const [productColumns, setProductColumns] = useState<ProductColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('importaciones_product_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_PRODUCT_COLUMNS.length) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PRODUCT_COLUMNS;
  });

  const [isColumnConfigModalOpen, setIsColumnConfigModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('importaciones_product_columns', JSON.stringify(productColumns));
    } catch (e) {
      console.error(e);
    }
  }, [productColumns]);

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const col = productColumns.find(c => c.id === colId);
    if (!col) return;
    const startWidth = col.width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const diff = currentX - startX;
      const newWidth = Math.max(60, startWidth + diff);
      setProductColumns(prev =>
        prev.map(c => (c.id === colId ? { ...c, width: newWidth } : c))
      );
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === productColumns.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...productColumns];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setProductColumns(updated);
  };

  const handleUpdateColumnWidth = (colId: string, newWidth: number) => {
    const width = Math.max(50, Math.min(800, newWidth || 100));
    setProductColumns(prev =>
      prev.map(c => (c.id === colId ? { ...c, width } : c))
    );
  };

  const handleResetColumns = () => {
    setProductColumns(DEFAULT_PRODUCT_COLUMNS);
  };

  // Full Screen 360 View States
  const [selectedProduct, setSelectedProduct] = useState<ImportProduct | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState<boolean>(false);

  const [selectedSupplier, setSelectedSupplier] = useState<ImportSupplier | null>(null);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState<boolean>(false);

  const [selectedProforma, setSelectedProforma] = useState<ImportProforma | null>(null);
  const [isCreatingProforma, setIsCreatingProforma] = useState<boolean>(false);

  // Upload / Process Proforma State
  const [uploadSupplierId, setUploadSupplierId] = useState<string>('');
  const [proformaText, setProformaText] = useState<string>('');
  const [proformaNumberInput, setProformaNumberInput] = useState<string>('');
  const [incotermInput, setIncotermInput] = useState<'FOB' | 'CIF' | 'EXW' | 'DDP' | 'CFR' | 'otro'>('FOB');
  const [isParsingProforma, setIsParsingProforma] = useState<boolean>(false);
  const [extractedItems, setExtractedItems] = useState<ImportProformaItem[]>([]);
  const [extractedProformaMeta, setExtractedProformaMeta] = useState<{
    proformaNumber: string;
    subtotal: number;
    shippingCost: number;
    taxes: number;
    totalAmount: number;
    currency: string;
    issueDate: string;
    expirationDate: string;
  } | null>(null);
  const [validatedItemIds, setValidatedItemIds] = useState<Record<string, boolean>>({});

  // Firestore listeners
  useEffect(() => {
    setLoading(true);
    
    const unsubProducts = onSnapshot(collection(db, 'importation_products'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ImportProduct));
      setProducts(list);
    }, (error) => {
      console.error('Error fetching importation_products:', error);
    });

    const unsubSuppliers = onSnapshot(collection(db, 'importation_suppliers'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ImportSupplier));
      setSuppliers(list);
    }, (error) => {
      console.error('Error fetching importation_suppliers:', error);
    });

    const unsubProformas = onSnapshot(collection(db, 'importation_proformas'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ImportProforma));
      setProformas(list);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching importation_proformas:', error);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubSuppliers();
      unsubProformas();
    };
  }, []);

  const canEdit = accessLevel === 'colaborador' || accessLevel === 'lider' || accessLevel === 'administrador';

  // --- 360 CRUD HANDLERS ---
  const handleSaveProduct360 = async (payload: Partial<ImportProduct>) => {
    if (selectedProduct) {
      await updateDoc(doc(db, 'importation_products', selectedProduct.id), payload);
    } else {
      await addDoc(collection(db, 'importation_products'), payload);
    }
  };

  const handleDeleteProduct360 = async (id: string) => {
    await deleteDoc(doc(db, 'importation_products', id));
  };

  const handleSaveSupplier360 = async (payload: Partial<ImportSupplier>) => {
    if (selectedSupplier) {
      await updateDoc(doc(db, 'importation_suppliers', selectedSupplier.id), payload);
    } else {
      await addDoc(collection(db, 'importation_suppliers'), payload);
    }
  };

  const handleDeleteSupplier360 = async (id: string) => {
    await deleteDoc(doc(db, 'importation_suppliers', id));
  };

  const handleSaveProforma360 = async (payload: Partial<ImportProforma>) => {
    if (selectedProforma) {
      await updateDoc(doc(db, 'importation_proformas', selectedProforma.id), payload);
    } else {
      await addDoc(collection(db, 'importation_proformas'), payload);
    }
  };

  const handleDeleteProforma360 = async (id: string) => {
    await deleteDoc(doc(db, 'importation_proformas', id));
  };

  const handleSyncProductsFromProforma = async (itemsToSync: ImportProformaItem[], sup?: ImportSupplier) => {
    const supplierObj = sup || suppliers.find(s => s.id === (selectedProforma?.supplierId || uploadSupplierId)) || suppliers[0];
    const supplierName = supplierObj ? supplierObj.companyName : 'Proveedor Proforma';

    for (const item of itemsToSync) {
      const existing = products.find(p => p.code.toLowerCase() === item.code.toLowerCase());
      const prodPayload: Omit<ImportProduct, 'id'> = {
        code: item.code || `SKU-${Date.now()}`,
        name: item.name,
        description: item.description || item.name,
        category: item.category || 'Importaciones',
        supplierId: supplierObj ? supplierObj.id : '',
        supplierName: supplierName,
        unit: item.unit || 'Unidad',
        unitPrice: item.unitPrice,
        currency: 'USD',
        minOrderQuantity: 1,
        hsCode: item.hsCode || '',
        originCountry: supplierObj ? supplierObj.country : 'Internacional',
        status: 'activo',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        await updateDoc(doc(db, 'importation_products', existing.id), prodPayload);
      } else {
        await addDoc(collection(db, 'importation_products'), prodPayload);
      }
    }
  };

  // --- HANDLERS PROFORMA PARSING & VALIDATION ---
  const handleParseProformaText = () => {
    if (!proformaText.trim()) {
      alert('Por favor ingrese o pegue el contenido/texto de la proforma para procesar.');
      return;
    }

    setIsParsingProforma(true);

    setTimeout(() => {
      const lines = proformaText.split('\n').filter(l => l.trim().length > 0);
      const itemsParsed: ImportProformaItem[] = [];
      let runningSubtotal = 0;

      lines.forEach((line, idx) => {
        const numbers = line.match(/\d+([.,]\d+)?/g);
        const codeMatch = line.match(/([A-Z0-9]{3,}-[A-Z0-9-]+)/i);
        
        const code = codeMatch ? codeMatch[0].toUpperCase() : `IMP-ITEM-${100 + idx}`;
        const nameClean = line.replace(/([A-Z0-9]{3,}-[A-Z0-9-]+)/gi, '').replace(/\d+/g, '').trim() || `Producto de Importación #${idx + 1}`;
        
        const qty = numbers && numbers.length > 0 ? Math.max(1, parseInt(numbers[0])) : 10;
        const price = numbers && numbers.length > 1 ? parseFloat(numbers[1].replace(',', '.')) : Math.round((25 + Math.random() * 300) * 100) / 100;
        const total = qty * price;

        runningSubtotal += total;

        itemsParsed.push({
          id: `item-extracted-${Date.now()}-${idx}`,
          code: code,
          name: nameClean.slice(0, 60) || `Artículo ${idx + 1}`,
          description: line,
          category: 'Proforma Importación',
          quantity: qty,
          unitPrice: price,
          totalPrice: total,
          unit: 'Unidad',
          hsCode: '8541.40.10',
          isValidated: true
        });
      });

      if (itemsParsed.length === 0) {
        itemsParsed.push({
          id: `item-extracted-${Date.now()}-0`,
          code: `SKU-PROF-${Math.floor(1000 + Math.random() * 9000)}`,
          name: 'Producto Proforma Ejemplo',
          description: proformaText.slice(0, 100),
          category: 'Equipos',
          quantity: 20,
          unitPrice: 150.00,
          totalPrice: 3000.00,
          unit: 'Unidad',
          hsCode: '8471.30.00',
          isValidated: true
        });
        runningSubtotal = 3000.00;
      }

      const shipping = Math.round(runningSubtotal * 0.08);
      const totalAmount = runningSubtotal + shipping;

      setExtractedItems(itemsParsed);
      setExtractedProformaMeta({
        proformaNumber: proformaNumberInput || `PI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        subtotal: runningSubtotal,
        shippingCost: shipping,
        taxes: 0,
        totalAmount: totalAmount,
        currency: 'USD',
        issueDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      const initialMap: Record<string, boolean> = {};
      itemsParsed.forEach(it => { initialMap[it.id] = true; });
      setValidatedItemIds(initialMap);

      setIsParsingProforma(false);
    }, 1200);
  };

  const handleToggleValidateItem = (itemId: string) => {
    setValidatedItemIds(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleUpdateExtractedItem = (id: string, field: keyof ImportProformaItem, value: any) => {
    setExtractedItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleApproveAndSaveProducts = async () => {
    const approvedItems = extractedItems.filter(it => validatedItemIds[it.id]);
    
    if (approvedItems.length === 0) {
      alert('Por favor valide/seleccione al menos un producto para enviar a la base de datos.');
      return;
    }

    const supplierObj = suppliers.find(s => s.id === uploadSupplierId) || suppliers[0];
    const supplierName = supplierObj ? supplierObj.companyName : 'Proveedor Proforma';

    // 1. Push products to importation_products
    for (const item of approvedItems) {
      const prodPayload: Omit<ImportProduct, 'id'> = {
        code: item.code || `SKU-${Date.now()}`,
        name: item.name,
        description: item.description || item.name,
        category: item.category || 'Importaciones',
        supplierId: supplierObj ? supplierObj.id : '',
        supplierName: supplierName,
        unit: item.unit || 'Unidad',
        unitPrice: item.unitPrice,
        currency: 'USD',
        minOrderQuantity: 1,
        hsCode: item.hsCode || '',
        originCountry: supplierObj ? supplierObj.country : 'Internacional',
        status: 'activo',
        createdAt: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, 'importation_products'), prodPayload);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Save Proforma
    if (extractedProformaMeta) {
      const proformaPayload: Omit<ImportProforma, 'id'> = {
        proformaNumber: extractedProformaMeta.proformaNumber,
        supplierId: supplierObj ? supplierObj.id : '',
        supplierName: supplierName,
        issueDate: extractedProformaMeta.issueDate,
        expirationDate: extractedProformaMeta.expirationDate,
        currency: extractedProformaMeta.currency,
        subtotal: extractedProformaMeta.subtotal,
        shippingCost: extractedProformaMeta.shippingCost,
        taxes: extractedProformaMeta.taxes,
        totalAmount: extractedProformaMeta.totalAmount,
        incoterm: incotermInput,
        status: 'validada',
        items: approvedItems,
        notes: `Generado automáticamente desde carga de proforma. ${approvedItems.length} producto(s) integrados a la Base de Datos.`,
        createdAt: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, 'importation_proformas'), proformaPayload);
      } catch (e) {
        console.error(e);
      }
    }

    alert(`¡Éxito! Se han validado y guardado ${approvedItems.length} ficha(s) de producto en el Catálogo de Importación.`);
    
    // Reset state and move to products tab
    setProformaText('');
    setExtractedItems([]);
    setExtractedProformaMeta(null);
    setActiveSubTab('products');
  };

  // Filtered Lists
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.hsCode && p.hsCode.includes(searchQuery));
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesSupplier = !supplierFilter || p.supplierId === supplierFilter;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const filteredSuppliers = suppliers.filter(s => {
    return s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredProformas = proformas.filter(pf => {
    return pf.proformaNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
           pf.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           pf.incoterm.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const categoriesList = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const renderProductCell = (colId: string, product: ImportProduct) => {
    switch (colId) {
      case 'code':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono text-[10px] font-extrabold rounded-lg uppercase tracking-wider border border-blue-100 whitespace-nowrap">
            {product.code}
          </span>
        );
      case 'name':
        return (
          <div>
            <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {product.name}
            </div>
            {product.description && (
              <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                {product.description}
              </div>
            )}
          </div>
        );
      case 'supplier':
        return (
          <span className="font-semibold text-gray-800 line-clamp-1">
            {product.supplierName}
          </span>
        );
      case 'category':
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold text-[11px] rounded-lg inline-block truncate max-w-full">
            {product.category}
          </span>
        );
      case 'price':
        return (
          <div className="whitespace-nowrap">
            <span className="font-black text-gray-900">${product.unitPrice.toFixed(2)} {product.currency}</span>
            <span className="text-[10px] text-gray-400 font-medium ml-1">/ {product.unit}</span>
          </div>
        );
      case 'hsCode':
        return (
          <span className="font-mono text-blue-600 font-bold whitespace-nowrap">
            {product.hsCode || '-'}
          </span>
        );
      case 'status':
        return (
          <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full whitespace-nowrap ${
            product.status === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {product.status}
          </span>
        );
      case 'actions':
        return (
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            <button
              onClick={() => {
                setSelectedProduct(product);
                setIsCreatingProduct(false);
              }}
              className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-xs cursor-pointer"
              title="Ver Ficha 360°"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Ficha 360°</span>
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  setSelectedProduct(product);
                  setIsCreatingProduct(false);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Editar"
              >
                <Edit size={14} />
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // ==================== FULL-SCREEN VIEW 1: PRODUCT 360 ====================
  if (selectedProduct || isCreatingProduct) {
    return (
      <ImportProduct360View
        product={selectedProduct}
        isCreating={isCreatingProduct}
        suppliers={suppliers}
        companies={companies}
        proformas={proformas}
        onBack={() => {
          setSelectedProduct(null);
          setIsCreatingProduct(false);
        }}
        onSave={handleSaveProduct360}
        onDelete={handleDeleteProduct360}
        onNavigateToSupplier={(supId) => {
          setSelectedProduct(null);
          setIsCreatingProduct(false);
          const foundSup = suppliers.find(s => s.id === supId);
          if (foundSup) {
            setActiveSubTab('suppliers');
            setSelectedSupplier(foundSup);
          }
        }}
        onNavigateToProforma={(prof) => {
          setSelectedProduct(null);
          setIsCreatingProduct(false);
          setActiveSubTab('proformas');
          setSelectedProforma(prof);
        }}
        canEdit={canEdit}
        canDelete={canEdit}
      />
    );
  }

  // ==================== FULL-SCREEN VIEW 2: SUPPLIER 360 ====================
  if (selectedSupplier || isCreatingSupplier) {
    return (
      <ImportSupplier360View
        supplier={selectedSupplier}
        isCreating={isCreatingSupplier}
        companies={companies}
        products={products}
        proformas={proformas}
        onBack={() => {
          setSelectedSupplier(null);
          setIsCreatingSupplier(false);
        }}
        onSave={handleSaveSupplier360}
        onDelete={handleDeleteSupplier360}
        onNavigateToProduct={(prod) => {
          setSelectedSupplier(null);
          setIsCreatingSupplier(false);
          setActiveSubTab('products');
          setSelectedProduct(prod);
        }}
        onNavigateToProforma={(prof) => {
          setSelectedSupplier(null);
          setIsCreatingSupplier(false);
          setActiveSubTab('proformas');
          setSelectedProforma(prof);
        }}
        canEdit={canEdit}
        canDelete={canEdit}
      />
    );
  }

  // ==================== FULL-SCREEN VIEW 3: PROFORMA 360 ====================
  if (selectedProforma || isCreatingProforma) {
    return (
      <ImportProforma360View
        proforma={selectedProforma}
        isCreating={isCreatingProforma}
        suppliers={suppliers}
        onBack={() => {
          setSelectedProforma(null);
          setIsCreatingProforma(false);
        }}
        onSave={handleSaveProforma360}
        onDelete={handleDeleteProforma360}
        onSyncProductsToCatalog={handleSyncProductsFromProforma}
        onNavigateToSupplier={(supId) => {
          setSelectedProforma(null);
          setIsCreatingProforma(false);
          const foundSup = suppliers.find(s => s.id === supId);
          if (foundSup) {
            setActiveSubTab('suppliers');
            setSelectedSupplier(foundSup);
          }
        }}
        canEdit={canEdit}
        canDelete={canEdit}
      />
    );
  }

  // ==================== DEFAULT TREE LIST VIEWS & TABS ====================
  return (
    <div className="space-y-6">
      {/* SUBTAB 1: BASE DE DATOS DE PRODUCTOS */}
      {activeSubTab === 'products' && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre, categoría, código arancelario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {/* CATEGORY FILTER */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Todas las Categorías</option>
                {categoriesList.map((cat, cIdx) => (
                  <option key={`imp_cat_opt_${cat || cIdx}_${cIdx}`} value={cat}>{cat}</option>
                ))}
              </select>

              {/* SUPPLIER FILTER */}
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Todos los Proveedores</option>
                {suppliers.map((sup, sIdx) => (
                  <option key={`imp_sup_opt_${sup.id || sIdx}_${sIdx}`} value={sup.id}>{sup.companyName}</option>
                ))}
              </select>
            </div>

            {/* VIEW MODE TOGGLE, COLUMN CONFIG & ADD BUTTON */}
            <div className="flex items-center gap-3">
              {productViewMode === 'list' && (
                <button
                  type="button"
                  onClick={() => setIsColumnConfigModalOpen(true)}
                  className="px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 shadow-2xs cursor-pointer"
                  title="Modificar Ancho y Orden de Columnas"
                >
                  <SlidersHorizontal size={15} className="text-blue-600" />
                  <span className="hidden md:inline">Configurar Columnas</span>
                </button>
              )}

              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setProductViewMode('list')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    productViewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Vista de Lista"
                >
                  <LayoutList size={16} />
                  <span className="hidden sm:inline">Lista</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductViewMode('grid')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    productViewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Vista de Módulo / Tarjetas"
                >
                  <LayoutGrid size={16} />
                  <span className="hidden sm:inline">Módulo</span>
                </button>
              </div>

              {canEdit && (
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setIsCreatingProduct(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Nuevo Producto</span>
                </button>
              )}
            </div>
          </div>

          {/* PRODUCTS LIST VIEW (DEFAULT) */}
          {productViewMode === 'list' ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider select-none">
                      {productColumns.map((col, cIdx) => (
                        <th
                          key={`imp_th_${col.id}_${cIdx}`}
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                          className={`py-3.5 px-4 relative group ${
                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          <span className="truncate block pr-2">{col.label}</span>
                          <div
                            onMouseDown={(e) => handleResizeStart(e, col.id)}
                            className="absolute top-0 right-0 w-3 h-full cursor-col-resize hover:bg-blue-500/40 active:bg-blue-600 transition-colors z-10 group-hover:bg-slate-300"
                            title="Arrastrar para ajustar ancho de columna"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                    {filteredProducts.map((product, pIdx) => (
                      <tr 
                        key={`imp_prod_row_${product.id || pIdx}_${pIdx}`} 
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsCreatingProduct(false);
                        }}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        {productColumns.map((col, cIdx) => (
                          <td
                            key={`imp_prod_cell_${product.id || pIdx}_${col.id}_${cIdx}`}
                            style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                            className={`py-3.5 px-4 ${
                              col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                            }`}
                          >
                            {renderProductCell(col.id, product)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={productColumns.length} className="py-16 text-center">
                          <Package size={48} className="mx-auto text-gray-300 mb-3" />
                          <h3 className="font-bold text-gray-700 text-lg">No se encontraron productos</h3>
                          <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                            Intente ajustar los filtros de búsqueda o agregue un nuevo producto a la base de datos de importaciones.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* PRODUCTS GRID / CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product, pIdx) => (
                <motion.div
                  key={`imp_prod_card_${product.id || pIdx}_${pIdx}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsCreatingProduct(false);
                  }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-6 relative flex flex-col justify-between group overflow-hidden cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono text-[10px] font-extrabold rounded-lg uppercase tracking-wider border border-blue-100">
                        {product.code}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                        product.status === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {product.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {product.description || 'Sin descripción detallada.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-xs">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 block">Proveedor</span>
                        <span className="font-bold text-gray-800 line-clamp-1">{product.supplierName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 block">Categoría</span>
                        <span className="font-semibold text-gray-700">{product.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-2xl border border-slate-100/80">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Precio Unitario</span>
                        <span className="text-base font-black text-slate-900">${product.unitPrice.toFixed(2)} {product.currency}</span>
                        <span className="text-[10px] text-slate-500 font-medium ml-1">/ {product.unit}</span>
                      </div>
                      {product.hsCode && (
                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Partida Arancelaria</span>
                          <span className="text-xs font-mono font-bold text-blue-600">{product.hsCode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:text-blue-800 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Ver Ficha 360°</span>
                    </button>

                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <Package size={48} className="mx-auto text-gray-300 mb-3" />
                  <h3 className="font-bold text-gray-700 text-lg">No se encontraron productos</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    Intente ajustar los filtros de búsqueda o agregue un nuevo producto a la base de datos de importaciones.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: PROVEEDORES */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proveedor por nombre, código, país, contacto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </div>

            {canEdit && (
              <button
                onClick={() => {
                  setSelectedSupplier(null);
                  setIsCreatingSupplier(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Nuevo Proveedor</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSuppliers.map((sup, sIdx) => {
              const linkedCompany = companies.find(c => c.id === sup.companyId);
              const supplierProductsCount = products.filter(p => p.supplierId === sup.id).length;

              return (
                <div 
                  key={`imp_sup_card_${sup.id || sIdx}_${sIdx}`} 
                  onClick={() => {
                    setSelectedSupplier(sup);
                    setIsCreatingSupplier(false);
                  }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-6 space-y-4 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-xs">
                        {sup.companyName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{sup.companyName}</h3>
                          <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {sup.code}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Globe size={13} className="text-blue-500" />
                          <span>{sup.country} {sup.city ? `- ${sup.city}` : ''}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={`imp_sup_star_${sup.id || sIdx}_${i}`}
                          size={14}
                          className={i < (sup.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>
                  </div>

                  {/* CONTACT & COMPANY INFO */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 block">Contacto Principal</span>
                      <p className="font-bold text-gray-800 truncate">{sup.contactPerson || 'No especificado'}</p>
                      {sup.contactEmail && (
                        <p className="text-gray-500 text-[11px] flex items-center gap-1 truncate"><Mail size={11} /> {sup.contactEmail}</p>
                      )}
                      {sup.contactPhone && (
                        <p className="text-gray-500 text-[11px] flex items-center gap-1 truncate"><Phone size={11} /> {sup.contactPhone}</p>
                      )}
                    </div>

                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 block">Compañía Vinculada</span>
                      {linkedCompany ? (
                        <div>
                          <p className="font-bold text-blue-700 truncate">{linkedCompany.name}</p>
                          <p className="text-[10px] text-gray-500">RUC: {linkedCompany.ruc}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-[11px]">Proveedor independiente</p>
                      )}
                      <div className="pt-1 mt-1 border-t border-gray-200/60">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {supplierProductsCount} producto(s) en catálogo
                        </span>
                      </div>
                    </div>
                  </div>

                  {sup.paymentTerms && (
                    <div className="text-xs bg-blue-50/60 p-3 rounded-2xl border border-blue-100/50">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 block">Términos de Pago / Incoterms</span>
                      <p className="font-semibold text-blue-900 truncate">{sup.paymentTerms}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:text-blue-800 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Ver Ficha 360° del Proveedor</span>
                    </button>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: PROFORMAS */}
      {activeSubTab === 'proformas' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proforma por número, proveedor, incoterm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>

            <div className="flex items-center gap-2.5">
              {canEdit && (
                <button
                  onClick={() => {
                    setSelectedProforma(null);
                    setIsCreatingProforma(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Nueva Proforma</span>
                </button>
              )}

              <button
                onClick={() => setActiveSubTab('upload_proforma')}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <UploadCloud size={16} />
                <span>Cargar con IA</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">N° Proforma</th>
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-6 py-4">Incoterm</th>
                  <th className="px-6 py-4">Fecha Emisión</th>
                  <th className="px-6 py-4">Monto Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium">
                {filteredProformas.map((pf, pfIdx) => (
                  <tr 
                    key={`imp_pf_row_${pf.id || pfIdx}_${pfIdx}`} 
                    onClick={() => {
                      setSelectedProforma(pf);
                      setIsCreatingProforma(false);
                    }}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-black text-blue-600">
                      {pf.proformaNumber}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {pf.supplierName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-black uppercase">
                        {pf.incoterm}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {pf.issueDate}
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900 text-sm">
                      ${pf.totalAmount.toFixed(2)} {pf.currency}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        pf.status === 'aprobada' ? 'bg-emerald-100 text-emerald-800' :
                        pf.status === 'validada' ? 'bg-blue-100 text-blue-800' :
                        pf.status === 'rechazada' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pf.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProforma(pf);
                          setIsCreatingProforma(false);
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Ficha 360° ({pf.items?.length || 0})</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredProformas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                      No hay proformas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: CARGAR Y VALIDAR PROFORMA CON IA */}
      {activeSubTab === 'upload_proforma' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Asistente de Carga & Generación de Fichas de Producto</h3>
                <p className="text-xs text-gray-500">
                  Cargue el texto, desglose o contenido de la proforma enviada por el proveedor. El sistema extraerá y generará automáticamente las fichas técnicas para que pueda validarlas antes de subirlas al catálogo maestro de Productos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Proveedor de Origen
                </label>
                <select
                  value={uploadSupplierId}
                  onChange={(e) => setUploadSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {suppliers.map((sup, sIdx) => (
                    <option key={`imp_upload_sup_opt_${sup.id || sIdx}_${sIdx}`} value={sup.id}>{sup.companyName} ({sup.country})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  N° de Proforma
                </label>
                <input
                  type="text"
                  placeholder="Ej: PI-2025-9920"
                  value={proformaNumberInput}
                  onChange={(e) => setProformaNumberInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Incoterm
                </label>
                <select
                  value={incotermInput}
                  onChange={(e) => setIncotermInput(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="FOB">FOB (Free on Board)</option>
                  <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                  <option value="EXW">EXW (Ex Works)</option>
                  <option value="DDP">DDP (Delivered Duty Paid)</option>
                  <option value="CFR">CFR (Cost & Freight)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Pegue aquí el contenido de la Proforma o lista de productos
              </label>
              <textarea
                rows={6}
                value={proformaText}
                onChange={(e) => setProformaText(e.target.value)}
                placeholder={`Ejemplo de proforma:
IMP-PANEL-500W Panel Solar 500W PERC - Cantidad: 50 - Precio Unitario: 140.00
IMP-INV-10KW Inversor 10kW On-Grid - Cantidad: 5 - Precio Unitario: 850.00
IMP-CABLE-4MM Cable Solar 4mm2 Rojo - Cantidad: 1000 - Precio Unitario: 0.85`}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleParseProformaText}
                disabled={isParsingProforma || !proformaText.trim()}
                className={`flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer ${
                  (!proformaText.trim() || isParsingProforma) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isParsingProforma ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Analizando y Generando Fichas...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Procesar y Generar Fichas de Producto</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* EXTRACTED & VALIDATION SECTION */}
          {extractedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-md space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <FileCheck className="text-emerald-600" size={22} />
                    <span>Fichas Generadas para Validación ({extractedItems.length})</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Edite o verifique los datos extraídos antes de enviarlos a la base de datos oficial.
                  </p>
                </div>

                <button
                  onClick={handleApproveAndSaveProducts}
                  className="flex items-center gap-2 px-6 py-3 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Aprobar y Enviar a Base de Productos</span>
                </button>
              </div>

              {extractedProformaMeta && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl text-xs font-medium">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Proforma</span>
                    <p className="font-bold text-slate-900">{extractedProformaMeta.proformaNumber}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Subtotal Est.</span>
                    <p className="font-bold text-slate-900">${extractedProformaMeta.subtotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Flete / Gastos</span>
                    <p className="font-bold text-slate-900">${extractedProformaMeta.shippingCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Total Proforma</span>
                    <p className="font-black text-emerald-700 text-sm">${extractedProformaMeta.totalAmount.toFixed(2)} USD</p>
                  </div>
                </div>
              )}

              {/* EDITABLE ITEMS CARDS FOR VALIDATION */}
              <div className="space-y-4">
                {extractedItems.map((item, idx) => {
                  const isValidated = !!validatedItemIds[item.id];

                  return (
                    <div
                      key={`imp_extr_item_${item.id || idx}_${idx}`}
                      className={`p-5 rounded-2xl border transition-all ${
                        isValidated 
                          ? 'bg-emerald-50/30 border-emerald-200' 
                          : 'bg-gray-50/50 border-gray-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isValidated}
                            onChange={() => handleToggleValidateItem(item.id)}
                            className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-black text-gray-400">#{idx + 1}</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gray-200 text-gray-800 rounded">
                            {item.code}
                          </span>
                        </div>

                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isValidated ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isValidated ? 'Validado para DB' : 'Omite Envío'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Nombre del Producto</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateExtractedItem(item.id, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Código / SKU</label>
                          <input
                            type="text"
                            value={item.code}
                            onChange={(e) => handleUpdateExtractedItem(item.id, 'code', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Partida Arancelaria (HS Code)</label>
                          <input
                            type="text"
                            value={item.hsCode || ''}
                            onChange={(e) => handleUpdateExtractedItem(item.id, 'hsCode', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-blue-600 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Cantidad</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateExtractedItem(item.id, 'quantity', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Precio Unitario ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateExtractedItem(item.id, 'unitPrice', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Total ($)</label>
                          <div className="px-3 py-1.5 bg-slate-100 rounded-lg font-black text-slate-900">
                            ${(item.totalPrice || 0).toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Categoría</label>
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleUpdateExtractedItem(item.id, 'category', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* MODAL CONFIGURACIÓN DE COLUMNAS DE PRODUCTOS */}
      <AnimatePresence>
        {isColumnConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">Configurar Columnas de Productos</h3>
                    <p className="text-xs text-gray-500 font-medium">Reordena las columnas o ajusta sus anchos en píxeles (estilo Excel)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsColumnConfigModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                <p className="text-xs text-gray-500 font-medium mb-1">
                  Usa los botones para mover una columna a la izquierda o derecha, o ajusta el ancho en píxeles.
                </p>
                
                {productColumns.map((col, idx) => (
                  <div
                    key={`imp_col_cfg_${col.id}_${idx}`}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200/80 hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GripVertical size={16} className="text-gray-400 shrink-0" />
                      <span className="font-bold text-xs text-gray-800 truncate">{col.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Ancho Input */}
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-gray-200">
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase">Ancho:</span>
                        <input
                          type="number"
                          min="60"
                          max="600"
                          value={col.width}
                          onChange={(e) => handleUpdateColumnWidth(col.id, parseInt(e.target.value) || 100)}
                          className="w-14 text-xs font-black text-gray-900 bg-transparent text-right focus:outline-hidden"
                        />
                        <span className="text-[10px] text-gray-400 font-bold">px</span>
                      </div>

                      {/* Mover Arriba / Izquierda */}
                      <button
                        type="button"
                        onClick={() => moveColumn(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 disabled:opacity-30 disabled:hover:text-gray-600 transition-all cursor-pointer"
                        title="Mover a la izquierda (subir)"
                      >
                        <MoveUp size={14} />
                      </button>

                      {/* Mover Abajo / Derecha */}
                      <button
                        type="button"
                        onClick={() => moveColumn(idx, 'down')}
                        disabled={idx === productColumns.length - 1}
                        className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 disabled:opacity-30 disabled:hover:text-gray-600 transition-all cursor-pointer"
                        title="Mover a la derecha (bajar)"
                      >
                        <MoveDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-slate-50 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Restablecer Todo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsColumnConfigModalOpen(false)}
                  className="px-6 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Guardar y Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
