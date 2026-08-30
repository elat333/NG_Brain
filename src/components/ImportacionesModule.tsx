import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Building2, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  Eye, 
  Star, 
  Globe, 
  DollarSign, 
  Filter, 
  Sparkles, 
  ArrowRight, 
  FileCheck, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Check, 
  ExternalLink, 
  Calendar, 
  Hash, 
  Tag, 
  Mail, 
  Phone, 
  User,
  Layers,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Download,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  RotateCcw,
  GripVertical,
  MoveUp,
  MoveDown
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

export type ImportacionesSubTab = 'products' | 'suppliers' | 'proformas' | 'upload_proforma';

const SAMPLE_PRODUCTS: ImportProduct[] = [
  {
    id: 'prod-1',
    code: 'IMP-PANEL-500W',
    name: 'Panel Solar Monocristalino 500W High-Efficiency',
    description: 'Panel fotovoltaico de alta eficiencia con tecnología PERC y vidrio templado antirreflejo.',
    category: 'Energía Solar',
    supplierId: 'sup-1',
    supplierName: 'Suntech Power Overseas Ltd.',
    unit: 'Unidad',
    unitPrice: 145.50,
    currency: 'USD',
    minOrderQuantity: 50,
    hsCode: '8541.40.10',
    originCountry: 'China',
    specifications: {
      'Eficiencia': '21.3%',
      'Garantía': '25 años',
      'Dimensiones': '2094 x 1038 x 35 mm'
    },
    status: 'activo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    code: 'IMP-[#INV-30KW]',
    name: 'Inversor Trifásico Híbrido 30kW',
    description: 'Inversor solar híbrido industrial con monitoreo en nube y protección IP65.',
    category: 'Inversores',
    supplierId: 'sup-1',
    supplierName: 'Suntech Power Overseas Ltd.',
    unit: 'Unidad',
    unitPrice: 2450.00,
    currency: 'USD',
    minOrderQuantity: 2,
    hsCode: '8504.40.90',
    originCountry: 'China',
    specifications: {
      'Voltaje máx DC': '1000V',
      'Eficiencia Máxima': '98.6%',
      'Protección': 'IP65'
    },
    status: 'activo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    code: 'IMP-BATT-LFP-10K',
    name: 'Batería de Litio LiFePO4 10.24kWh Rack',
    description: 'Módulo de almacenamiento de energía LiFePO4 con BMS inteligente y 6000 ciclos.',
    category: 'Almacenamiento',
    supplierId: 'sup-2',
    supplierName: 'GreenTech Energy Solutions Inc.',
    unit: 'Unidad',
    unitPrice: 1890.00,
    currency: 'USD',
    minOrderQuantity: 5,
    hsCode: '8507.60.00',
    originCountry: 'Alemania',
    specifications: {
      'Capacidad': '200Ah / 51.2V',
      'Ciclos de Vida': '6000+',
      'BMS Integrado': 'Sí'
    },
    status: 'activo',
    createdAt: new Date().toISOString()
  }
];

const SAMPLE_SUPPLIERS: ImportSupplier[] = [
  {
    id: 'sup-1',
    companyId: '',
    companyName: 'Suntech Power Overseas Ltd.',
    code: 'PROV-CN-001',
    contactPerson: 'Chen Wei (International Sales Manager)',
    contactEmail: 'sales@suntech-power.cn',
    contactPhone: '+86 510 8531 8888',
    country: 'China',
    city: 'Wuxi, Jiangsu',
    paymentTerms: '30% TT Adelantado, 70% contra B/L',
    rating: 5,
    notes: 'Proveedor principal de paneles fotovoltaicos. Excelente tiempo de entrega y calidad certicada TUV/CE.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-2',
    companyId: '',
    companyName: 'GreenTech Energy Solutions Inc.',
    code: 'PROV-DE-002',
    contactPerson: 'Hans Muller',
    contactEmail: 'h.muller@greentech-de.com',
    contactPhone: '+49 30 1234 5678',
    country: 'Alemania',
    city: 'Berlín',
    paymentTerms: 'LC a la vista 100%',
    rating: 4,
    notes: 'Especialista en sistemas de baterías de alta densidad y tecnología alemana certificada.',
    createdAt: new Date().toISOString()
  }
];

const SAMPLE_PROFORMAS: ImportProforma[] = [
  {
    id: 'prof-1',
    proformaNumber: 'PI-2025-0891',
    supplierId: 'sup-1',
    supplierName: 'Suntech Power Overseas Ltd.',
    issueDate: '2025-08-01',
    expirationDate: '2025-09-01',
    currency: 'USD',
    subtotal: 14750.00,
    shippingCost: 1800.00,
    taxes: 0.00,
    totalAmount: 16550.00,
    incoterm: 'FOB',
    status: 'aprobada',
    notes: 'Proforma para el proyecto de electrificación rural de la zona norte.',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        code: 'IMP-PANEL-500W',
        name: 'Panel Solar Monocristalino 500W High-Efficiency',
        description: 'Panel fotovoltaico PERC 500W TUV',
        category: 'Energía Solar',
        quantity: 100,
        unitPrice: 145.50,
        totalPrice: 14550.00,
        unit: 'Unidad',
        hsCode: '8541.40.10',
        isValidated: true
      }
    ]
  }
];

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

  // Modals & Selection
  const [selectedProduct, setSelectedProduct] = useState<ImportProduct | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState<boolean>(false);
  const [productForm, setProductForm] = useState<Partial<ImportProduct>>({});

  const [selectedSupplier, setSelectedSupplier] = useState<ImportSupplier | null>(null);
  const [isEditingSupplier, setIsEditingSupplier] = useState<boolean>(false);
  const [supplierForm, setSupplierForm] = useState<Partial<ImportSupplier>>({});

  const [selectedProforma, setSelectedProforma] = useState<ImportProforma | null>(null);

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
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportProduct));
      setProducts(list);
    }, (error) => {
      console.error('Error fetching importation_products:', error);
    });

    const unsubSuppliers = onSnapshot(collection(db, 'importation_suppliers'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportSupplier));
      setSuppliers(list);
    }, (error) => {
      console.error('Error fetching importation_suppliers:', error);
    });

    const unsubProformas = onSnapshot(collection(db, 'importation_proformas'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportProforma));
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

  // --- HANDLERS PRODUCT ---
  const handleOpenAddProduct = () => {
    setProductForm({
      code: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      description: '',
      category: 'General',
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.companyName || '',
      unit: 'Unidad',
      unitPrice: 0,
      currency: 'USD',
      minOrderQuantity: 1,
      hsCode: '',
      originCountry: '',
      status: 'activo'
    });
    setSelectedProduct(null);
    setIsEditingProduct(true);
  };

  const handleOpenEditProduct = (prod: ImportProduct) => {
    setProductForm({ ...prod });
    setSelectedProduct(prod);
    setIsEditingProduct(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.code) {
      alert('Por favor ingrese al menos el código y nombre del producto.');
      return;
    }

    const supplierObj = suppliers.find(s => s.id === productForm.supplierId);
    const supplierName = supplierObj ? supplierObj.companyName : productForm.supplierName || 'Proveedor Desconocido';

    const payload: Omit<ImportProduct, 'id'> = {
      code: productForm.code || '',
      name: productForm.name || '',
      description: productForm.description || '',
      category: productForm.category || 'General',
      supplierId: productForm.supplierId || '',
      supplierName: supplierName,
      unit: productForm.unit || 'Unidad',
      unitPrice: Number(productForm.unitPrice) || 0,
      currency: productForm.currency || 'USD',
      minOrderQuantity: Number(productForm.minOrderQuantity) || 1,
      hsCode: productForm.hsCode || '',
      originCountry: productForm.originCountry || '',
      specifications: productForm.specifications || {},
      status: (productForm.status as any) || 'activo',
      createdAt: selectedProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (selectedProduct) {
        await updateDoc(doc(db, 'importation_products', selectedProduct.id), payload);
      } else {
        await addDoc(collection(db, 'importation_products'), payload);
      }
      setIsEditingProduct(false);
      setSelectedProduct(null);
    } catch (e) {
      console.error(e);
      // Fallback local
      if (selectedProduct) {
        setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, ...payload } : p));
      } else {
        setProducts(prev => [{ id: `prod-${Date.now()}`, ...payload }, ...prev]);
      }
      setIsEditingProduct(false);
      setSelectedProduct(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este producto de la base de datos?')) return;
    try {
      await deleteDoc(doc(db, 'importation_products', id));
    } catch (e) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  // --- HANDLERS SUPPLIER ---
  const handleOpenAddSupplier = () => {
    setSupplierForm({
      code: `PROV-${Math.floor(100 + Math.random() * 900)}`,
      companyId: companies[0]?.id || '',
      companyName: companies[0]?.name || '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      country: 'China',
      city: '',
      paymentTerms: 'FOB - 30% Adelantado, 70% contra B/L',
      rating: 5,
      notes: ''
    });
    setSelectedSupplier(null);
    setIsEditingSupplier(true);
  };

  const handleOpenEditSupplier = (sup: ImportSupplier) => {
    setSupplierForm({ ...sup });
    setSelectedSupplier(sup);
    setIsEditingSupplier(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.companyName) {
      alert('Por favor ingrese el nombre de la compañía o proveedor.');
      return;
    }

    const companyObj = companies.find(c => c.id === supplierForm.companyId);
    const companyName = companyObj ? companyObj.name : supplierForm.companyName;

    const payload: Omit<ImportSupplier, 'id'> = {
      code: supplierForm.code || `PROV-${Date.now()}`,
      companyId: supplierForm.companyId || '',
      companyName: companyName,
      contactPerson: supplierForm.contactPerson || '',
      contactEmail: supplierForm.contactEmail || '',
      contactPhone: supplierForm.contactPhone || '',
      country: supplierForm.country || 'Internacional',
      city: supplierForm.city || '',
      paymentTerms: supplierForm.paymentTerms || '',
      rating: Number(supplierForm.rating) || 5,
      notes: supplierForm.notes || '',
      createdAt: selectedSupplier?.createdAt || new Date().toISOString()
    };

    try {
      if (selectedSupplier) {
        await updateDoc(doc(db, 'importation_suppliers', selectedSupplier.id), payload);
      } else {
        await addDoc(collection(db, 'importation_suppliers'), payload);
      }
      setIsEditingSupplier(false);
      setSelectedSupplier(null);
    } catch (e) {
      console.error(e);
      if (selectedSupplier) {
        setSuppliers(prev => prev.map(s => s.id === selectedSupplier.id ? { ...s, ...payload } : s));
      } else {
        setSuppliers(prev => [{ id: `sup-${Date.now()}`, ...payload }, ...prev]);
      }
      setIsEditingSupplier(false);
      setSelectedSupplier(null);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este proveedor?')) return;
    try {
      await deleteDoc(doc(db, 'importation_suppliers', id));
    } catch (e) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
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
      // Intelligent mock parsing logic
      const lines = proformaText.split('\n').filter(l => l.trim().length > 0);
      const itemsParsed: ImportProformaItem[] = [];

      let runningSubtotal = 0;

      lines.forEach((line, idx) => {
        // Try to parse quantities and prices
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

      // Initial validation map
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
    const newProductsPushed: ImportProduct[] = [];
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
        const ref = await addDoc(collection(db, 'importation_products'), prodPayload);
        newProductsPushed.push({ id: ref.id, ...prodPayload });
      } catch (e) {
        newProductsPushed.push({ id: `prod-${Date.now()}-${Math.random()}`, ...prodPayload });
      }
    }

    // Update local state fallback
    if (newProductsPushed.length > 0) {
      setProducts(prev => [...newProductsPushed, ...prev]);
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
        setProformas(prev => [{ id: `prof-${Date.now()}`, ...proformaPayload }, ...prev]);
      }
    }

    alert(`¡Éxito! Se han validado y guardado ${approvedItems.length} ficha(s) de producto en la Base de Datos de Productos de Importación.`);
    
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
                setIsEditingProduct(false);
              }}
              className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-xs"
              title="Ver Ficha Completa"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Ficha</span>
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => handleOpenEditProduct(product)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash size={14} />
                </button>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* SUBTAB 1: BASE DE DATOS DE PRODUCTOS */}
      {activeSubTab === 'products' && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre, categoría, código arancelario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {/* CATEGORY FILTER */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Todas las Categorías</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* SUPPLIER FILTER */}
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Todos los Proveedores</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.companyName}</option>
                ))}
              </select>
            </div>

            {/* VIEW MODE TOGGLE, COLUMN CONFIG & ADD BUTTON */}
            <div className="flex items-center gap-3">
              {productViewMode === 'list' && (
                <button
                  type="button"
                  onClick={() => setIsColumnConfigModalOpen(true)}
                  className="px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 shadow-2xs"
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
                  className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    productViewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
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
                  className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    productViewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
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
                  onClick={handleOpenAddProduct}
                  className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
                >
                  <Plus size={16} />
                  <span>Nuevo Producto</span>
                </button>
              )}
            </div>
          </div>

          {/* PRODUCTS LIST VIEW (DEFAULT) */}
          {productViewMode === 'list' ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider select-none">
                      {productColumns.map((col) => (
                        <th
                          key={col.id}
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                          className={`py-3.5 px-4 relative group ${
                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          <span className="truncate block pr-2">{col.label}</span>
                          {/* Excel style draggable handle */}
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
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                        {productColumns.map(col => (
                          <td
                            key={col.id}
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
              {filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 relative flex flex-col justify-between group overflow-hidden"
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
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsEditingProduct(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Ver Ficha Completa</span>
                    </button>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditProduct(product)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    )}
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
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proveedor por nombre, código, país, contacto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </div>

            {canEdit && (
              <button
                onClick={handleOpenAddSupplier}
                className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus size={16} />
                <span>Nuevo Proveedor</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSuppliers.map(sup => {
              const linkedCompany = companies.find(c => c.id === sup.companyId);
              const supplierProductsCount = products.filter(p => p.supplierId === sup.id).length;

              return (
                <div key={sup.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                        {sup.companyName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-gray-900 text-lg">{sup.companyName}</h3>
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
                          key={i}
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
                      <p className="font-bold text-gray-800">{sup.contactPerson || 'No especificado'}</p>
                      {sup.contactEmail && (
                        <p className="text-gray-500 text-[11px] flex items-center gap-1"><Mail size={11} /> {sup.contactEmail}</p>
                      )}
                      {sup.contactPhone && (
                        <p className="text-gray-500 text-[11px] flex items-center gap-1"><Phone size={11} /> {sup.contactPhone}</p>
                      )}
                    </div>

                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 block">Compañía Vinculada</span>
                      {linkedCompany ? (
                        <div>
                          <p className="font-bold text-blue-700">{linkedCompany.name}</p>
                          <p className="text-[10px] text-gray-500">RUC: {linkedCompany.ruc}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-[11px]">No enlazada al directorio principal</p>
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
                      <p className="font-semibold text-blue-900">{sup.paymentTerms}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedSupplier(sup);
                        setIsEditingSupplier(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Ver Ficha del Proveedor</span>
                    </button>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSupplier(sup)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(sup.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    )}
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
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proforma por número, proveedor, incoterm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>

            <button
              onClick={() => setActiveSubTab('upload_proforma')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <UploadCloud size={16} />
              <span>Cargar Nueva Proforma</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
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
                {filteredProformas.map(pf => (
                  <tr key={pf.id} className="hover:bg-slate-50/50 transition-colors">
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
                        onClick={() => setSelectedProforma(pf)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>Detalles ({pf.items?.length || 0})</span>
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

      {/* SUBTAB 4: CARGAR Y VALIDAR PROFORMA */}
      {activeSubTab === 'upload_proforma' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
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
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.companyName} ({sup.country})</option>
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
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleParseProformaText}
                disabled={isParsingProforma || !proformaText.trim()}
                className={`flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 ${
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
                  className="flex items-center gap-2 px-6 py-3 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
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
                      key={item.id}
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
                            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-black text-gray-400">#{idx + 1}</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gray-200 text-gray-800 rounded">
                            {item.code}
                          </span>
                        </div>

                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isValidated ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isValidated ? 'Validado para DB' : 'Omite Envo'}
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

      {/* MODAL EDIT / CREATE PRODUCT */}
      <AnimatePresence>
        {isEditingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-lg font-extrabold text-gray-900">
                  {selectedProduct ? 'Editar Ficha de Producto' : 'Crear Nuevo Producto'}
                </h3>
                <button
                  onClick={() => setIsEditingProduct(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Código / SKU</label>
                  <input
                    type="text"
                    value={productForm.code || ''}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nombre del Producto</label>
                  <input
                    type="text"
                    value={productForm.name || ''}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    value={productForm.description || ''}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Proveedor</label>
                  <select
                    value={productForm.supplierId || ''}
                    onChange={(e) => {
                      const sup = suppliers.find(s => s.id === e.target.value);
                      setProductForm({ 
                        ...productForm, 
                        supplierId: e.target.value,
                        supplierName: sup?.companyName || '' 
                      });
                    }}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="">Seleccionar Proveedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.companyName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={productForm.category || ''}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Precio Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.unitPrice || 0}
                    onChange={(e) => setProductForm({ ...productForm, unitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Unidad de Medida</label>
                  <input
                    type="text"
                    placeholder="Ej: Unidad, Caja, Metro, Kg"
                    value={productForm.unit || ''}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Partida Arancelaria (HS Code)</label>
                  <input
                    type="text"
                    placeholder="Ej: 8541.40.10"
                    value={productForm.hsCode || ''}
                    onChange={(e) => setProductForm({ ...productForm, hsCode: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-blue-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">País de Origen</label>
                  <input
                    type="text"
                    value={productForm.originCountry || ''}
                    onChange={(e) => setProductForm({ ...productForm, originCountry: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsEditingProduct(false)}
                  className="px-4 py-2 text-gray-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-6 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md"
                >
                  Guardar Ficha
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDIT / CREATE SUPPLIER */}
      <AnimatePresence>
        {isEditingSupplier && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-lg font-extrabold text-gray-900">
                  {selectedSupplier ? 'Editar Ficha del Proveedor' : 'Registrar Nuevo Proveedor'}
                </h3>
                <button
                  onClick={() => setIsEditingSupplier(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Compañía Vinculada (Directorio)</label>
                  <select
                    value={supplierForm.companyId || ''}
                    onChange={(e) => {
                      const comp = companies.find(c => c.id === e.target.value);
                      setSupplierForm({
                        ...supplierForm,
                        companyId: e.target.value,
                        companyName: comp?.name || supplierForm.companyName
                      });
                    }}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="">Seleccionar del Directorio de Compañías...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (RUC: {c.ruc})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nombre Comercial / Razón Social</label>
                  <input
                    type="text"
                    value={supplierForm.companyName || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contacto Principal</label>
                  <input
                    type="text"
                    placeholder="Ej: John Doe (Gerente de Exportaciones)"
                    value={supplierForm.contactPerson || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={supplierForm.contactEmail || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactEmail: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={supplierForm.contactPhone || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPhone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">País de Origen</label>
                  <input
                    type="text"
                    value={supplierForm.country || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Términos de Pago / Incoterms habituales</label>
                  <input
                    type="text"
                    placeholder="Ej: FOB - 30% TT, 70% B/L"
                    value={supplierForm.paymentTerms || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Notas / Observaciones</label>
                  <textarea
                    rows={3}
                    value={supplierForm.notes || ''}
                    onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsEditingSupplier(false)}
                  className="px-4 py-2 text-gray-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSupplier}
                  className="px-6 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md"
                >
                  Guardar Proveedor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETALLES PRODUCTO */}
      <AnimatePresence>
        {selectedProduct && !isEditingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-6"
            >
              <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-mono font-extrabold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md uppercase">
                    {selectedProduct.code}
                  </span>
                  <h3 className="text-xl font-extrabold text-gray-900 mt-2">{selectedProduct.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 block">Descripción</span>
                  <p className="text-gray-700 font-medium leading-relaxed mt-1">
                    {selectedProduct.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Proveedor</span>
                    <p className="font-extrabold text-slate-800">{selectedProduct.supplierName}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Precio Unitario</span>
                    <p className="font-extrabold text-emerald-700 text-sm">
                      ${selectedProduct.unitPrice.toFixed(2)} {selectedProduct.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Partida Arancelaria</span>
                    <p className="font-mono font-bold text-blue-600">{selectedProduct.hsCode || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">País de Origen</span>
                    <p className="font-bold text-slate-800">{selectedProduct.originCountry || 'N/A'}</p>
                  </div>
                </div>

                {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-2">Especificaciones Técnicas</span>
                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-gray-200/50 py-1 last:border-none">
                          <span className="font-bold text-gray-600">{k}:</span>
                          <span className="font-semibold text-gray-900">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-6 py-2.5 bg-gray-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl"
                >
                  Cerrar Ficha
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETALLES PROFORMA */}
      <AnimatePresence>
        {selectedProforma && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {selectedProforma.proformaNumber}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedProforma.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 mt-2">{selectedProforma.supplierName}</h3>
                </div>
                <button
                  onClick={() => setSelectedProforma(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl text-xs">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400">Incoterm</span>
                  <p className="font-bold text-slate-800">{selectedProforma.incoterm}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400">Fecha Emisión</span>
                  <p className="font-bold text-slate-800">{selectedProforma.issueDate}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400">Subtotal</span>
                  <p className="font-bold text-slate-800">${selectedProforma.subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400">Total Proforma</span>
                  <p className="font-black text-emerald-700 text-sm">${selectedProforma.totalAmount.toFixed(2)} USD</p>
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-800 mb-3 uppercase tracking-wider">
                  Detalle de Productos en Proforma
                </h4>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase">
                        <th className="p-3">Código</th>
                        <th className="p-3">Producto</th>
                        <th className="p-3 text-center">Cant.</th>
                        <th className="p-3 text-right">Precio Unit.</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {selectedProforma.items?.map(it => (
                        <tr key={it.id}>
                          <td className="p-3 font-mono font-bold text-gray-700">{it.code}</td>
                          <td className="p-3 font-bold text-gray-900">{it.name}</td>
                          <td className="p-3 text-center font-bold">{it.quantity}</td>
                          <td className="p-3 text-right">${it.unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-slate-900">${it.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedProforma.notes && (
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100/50 text-xs">
                  <span className="text-[9px] font-black uppercase text-amber-700 block">Observaciones</span>
                  <p className="text-amber-900 font-medium">{selectedProforma.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedProforma(null)}
                  className="px-6 py-2.5 bg-gray-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl"
                >
                  Cerrar Proforma
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETALLES PROVEEDOR */}
      <AnimatePresence>
        {selectedSupplier && !isEditingSupplier && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {selectedSupplier.companyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">{selectedSupplier.companyName}</h3>
                    <p className="text-xs text-gray-500 font-mono">Código: {selectedSupplier.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Contacto</span>
                    <p className="font-extrabold text-slate-800">{selectedSupplier.contactPerson || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">País / Ubicación</span>
                    <p className="font-extrabold text-slate-800">{selectedSupplier.country} {selectedSupplier.city ? `- ${selectedSupplier.city}` : ''}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Correo Electrónico</span>
                    <p className="font-bold text-blue-600">{selectedSupplier.contactEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Teléfono</span>
                    <p className="font-bold text-slate-800">{selectedSupplier.contactPhone || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold text-gray-800 mb-2 uppercase tracking-wider">
                    Productos Ofrecidos por este Proveedor ({products.filter(p => p.supplierId === selectedSupplier.id).length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {products.filter(p => p.supplierId === selectedSupplier.id).map(p => (
                      <div key={p.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                        <div>
                          <span className="font-bold text-gray-900 block">{p.name}</span>
                          <span className="text-[10px] font-mono text-gray-400">{p.code}</span>
                        </div>
                        <span className="font-extrabold text-emerald-700">${p.unitPrice.toFixed(2)} {p.currency}</span>
                      </div>
                    ))}
                    {products.filter(p => p.supplierId === selectedSupplier.id).length === 0 && (
                      <p className="text-gray-400 italic text-xs">No hay productos registrados de este proveedor aún.</p>
                    )}
                  </div>
                </div>

                {selectedSupplier.notes && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Notas</span>
                    <p className="p-3 bg-gray-50 rounded-2xl text-gray-700 leading-relaxed">{selectedSupplier.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="px-6 py-2.5 bg-gray-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl"
                >
                  Cerrar Ficha
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all"
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
                    key={col.id}
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
                          className="w-14 text-xs font-black text-gray-900 bg-transparent text-right focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 font-bold">px</span>
                      </div>

                      {/* Mover Arriba / Izquierda */}
                      <button
                        type="button"
                        onClick={() => moveColumn(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 disabled:opacity-30 disabled:hover:text-gray-600 transition-all"
                        title="Mover a la izquierda (subir)"
                      >
                        <MoveUp size={14} />
                      </button>

                      {/* Mover Abajo / Derecha */}
                      <button
                        type="button"
                        onClick={() => moveColumn(idx, 'down')}
                        disabled={idx === productColumns.length - 1}
                        className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 disabled:opacity-30 disabled:hover:text-gray-600 transition-all"
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
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <RotateCcw size={14} />
                  <span>Restablecer Todo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsColumnConfigModalOpen(false)}
                  className="px-6 py-2.5 bg-ng-lime hover:bg-[#d4eb3f] text-ng-black font-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20"
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
