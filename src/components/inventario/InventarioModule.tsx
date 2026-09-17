import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Building2,
  FileCheck,
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
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  X,
  Truck,
  HardHat,
  Shield,
  Download,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Receipt,
  Upload,
  Sparkles,
  DollarSign,
  Calendar,
  Tag,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Warehouse, 
  InventoryStockItem, 
  InventoryUpdateRequest, 
  InventoryInvoice,
  InventoryInvoiceItem,
  ProductItem, 
  TeamMember 
} from '../../types';
import { InventarioSubTabType } from '../../hooks/useAppNavigation';
import { EppExcelImporterModal } from './EppExcelImporterModal';
import { EppDeliveryModal } from './EppDeliveryModal';
import { EppDeliveryPrintModal } from './EppDeliveryPrintModal';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from '../../lib/firebase';

export interface InventarioModuleProps {
  currentMember: TeamMember | null | undefined;
  products: ProductItem[];
  members: TeamMember[];
  activeSubTab: InventarioSubTabType;
  onSubTabChange: (subTab: InventarioSubTabType) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
}

export const InventarioModule: React.FC<InventarioModuleProps> = ({
  currentMember,
  products = [],
  members = [],
  activeSubTab,
  onSubTabChange,
  accessLevel
}) => {
  // Firestore Collections State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockItems, setStockItems] = useState<InventoryStockItem[]>([]);
  const [updateRequests, setUpdateRequests] = useState<InventoryUpdateRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [requestsStatusFilter, setRequestsStatusFilter] = useState<'todos' | 'pendiente' | 'aprobada' | 'rechazada'>('todos');

  // Modals State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseFormData, setWarehouseFormData] = useState({
    name: '',
    code: '',
    type: 'fija' as 'fija' | 'movil' | 'campo',
    location: '',
    responsibleMemberId: '',
    description: '',
    status: 'activa' as 'activa' | 'inactiva'
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isEppImporterOpen, setIsEppImporterOpen] = useState(false);
  const [stockFormData, setStockFormData] = useState({
    warehouseId: '',
    productId: '',
    quantity: 0,
    minStock: 5,
    unit: 'unidad',
    sizesText: '' // ej. "39: 5, 40: 10, 41: 8"
  });

  // Request Inspection Modal
  const [selectedRequest, setSelectedRequest] = useState<InventoryUpdateRequest | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // EPP Delivery & Print States
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [requestToPrint, setRequestToPrint] = useState<InventoryUpdateRequest | null>(null);

  // Invoices Subtab State
  const [invoices, setInvoices] = useState<InventoryInvoice[]>([]);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<InventoryInvoice | null>(null);

  // New Invoice Form State
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceFileBase64, setInvoiceFileBase64] = useState<string | null>(null);
  const [selectedWarehouseForInvoice, setSelectedWarehouseForInvoice] = useState<string>('');
  const [isAnalyzingInvoice, setIsAnalyzingInvoice] = useState<boolean>(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState<boolean>(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoiceNumber: '',
    supplierName: '',
    supplierRuc: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    totalAmount: 0
  });
  const [parsedInvoiceItems, setParsedInvoiceItems] = useState<Array<{
    tempId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    size: string;
    matchedProductId: string;
  }>>([]);

  // 1. Listen to Firestore
  useEffect(() => {
    setLoading(true);
    const unsubWarehouses = onSnapshot(collection(db, 'warehouses'), (snap) => {
      const list: Warehouse[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Warehouse));
      setWarehouses(list);
    });

    const unsubStock = onSnapshot(collection(db, 'inventory_stock'), (snap) => {
      const list: InventoryStockItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as InventoryStockItem));
      setStockItems(list);
    });

    const unsubRequests = onSnapshot(collection(db, 'inventory_update_requests'), (snap) => {
      const list: InventoryUpdateRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as InventoryUpdateRequest));
      // Ordenar por fecha descendente
      list.sort((a, b) => new Date(b.createdAt || b.deliveryDate).getTime() - new Date(a.createdAt || a.deliveryDate).getTime());
      setUpdateRequests(list);
      setLoading(false);
    });

    const unsubInvoices = onSnapshot(collection(db, 'inventory_invoices'), (snap) => {
      const list: InventoryInvoice[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as InventoryInvoice));
      list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setInvoices(list);
    });

    return () => {
      unsubWarehouses();
      unsubStock();
      unsubRequests();
      unsubInvoices();
    };
  }, []);

  // Pending requests count
  const pendingRequestsCount = useMemo(() => {
    return updateRequests.filter(r => r.status === 'pendiente').length;
  }, [updateRequests]);

  // Overall Inventory Stats
  const stats = useMemo(() => {
    const totalWarehouses = warehouses.filter(w => w.status === 'activa').length;
    const totalSKUs = stockItems.length;
    const totalUnits = stockItems.reduce((acc, curr) => acc + (Number(curr.currentStock) || 0), 0);
    const lowStockAlerts = stockItems.filter(item => item.currentStock <= item.minStock).length;
    return { totalWarehouses, totalSKUs, totalUnits, lowStockAlerts, pendingRequests: pendingRequestsCount };
  }, [warehouses, stockItems, pendingRequestsCount]);

  // Filtered stock items
  const filteredStock = useMemo(() => {
    return stockItems.filter(item => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productSku && item.productSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.warehouseName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesWarehouse = selectedWarehouseFilter === 'all' || item.warehouseId === selectedWarehouseFilter;
      const matchesCategory = selectedCategoryFilter === 'all' || item.productCategory === selectedCategoryFilter;

      return matchesSearch && matchesWarehouse && matchesCategory;
    });
  }, [stockItems, searchTerm, selectedWarehouseFilter, selectedCategoryFilter]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return updateRequests.filter(r => {
      const matchesSearch = 
        r.requestCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.warehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.deliveredByName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = requestsStatusFilter === 'todos' || r.status === requestsStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [updateRequests, searchTerm, requestsStatusFilter]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!invoiceSearchTerm.trim()) return true;
      const term = invoiceSearchTerm.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.supplierName.toLowerCase().includes(term) ||
        (inv.supplierRuc && inv.supplierRuc.toLowerCase().includes(term)) ||
        inv.warehouseName.toLowerCase().includes(term)
      );
    });
  }, [invoices, invoiceSearchTerm]);

  // Handle Save Warehouse
  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseFormData.name.trim() || !warehouseFormData.code.trim()) return;

    try {
      const responsible = members.find(m => m.id === warehouseFormData.responsibleMemberId);
      const payload: Partial<Warehouse> = {
        name: warehouseFormData.name.trim(),
        code: warehouseFormData.code.trim().toUpperCase(),
        type: warehouseFormData.type,
        location: warehouseFormData.location.trim(),
        responsibleMemberId: warehouseFormData.responsibleMemberId || '',
        responsibleMemberName: responsible ? responsible.name : '',
        description: warehouseFormData.description.trim(),
        status: warehouseFormData.status,
        updatedAt: new Date().toISOString()
      };

      if (editingWarehouse) {
        await updateDoc(doc(db, 'warehouses', editingWarehouse.id), payload);
      } else {
        const newDocRef = doc(collection(db, 'warehouses'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          ...payload,
          createdAt: new Date().toISOString()
        });
      }

      setIsWarehouseModalOpen(false);
      setEditingWarehouse(null);
    } catch (error: any) {
      console.error('Error saving warehouse:', error);
      const msg = error?.message || String(error);
      if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
        alert('Error de Permisos en la Nube de Google Firebase:\n\nTu usuario tiene rol de Administrador en la aplicación, pero la base de datos Firestore en Google Cloud aún no tiene publicadas las reglas de seguridad para la nueva colección "warehouses".\n\nPor favor publica las reglas en la Consola de Firebase o ejecuta "npm run deploy:rules" en la terminal.');
      } else {
        alert('Error al guardar la bodega: ' + msg);
      }
    }
  };

  // Handle Delete Warehouse
  const handleDeleteWarehouse = async (wId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta bodega?')) return;
    try {
      await deleteDoc(doc(db, 'warehouses', wId));
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      const msg = error?.message || String(error);
      alert('Error al eliminar bodega: ' + msg);
    }
  };

  // Handle Save / Adjust Stock
  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockFormData.warehouseId || !stockFormData.productId) return;

    try {
      const selectedWh = warehouses.find(w => w.id === stockFormData.warehouseId);
      const selectedProd = products.find(p => p.id === stockFormData.productId);
      if (!selectedWh || !selectedProd) return;

      const stockId = `${selectedWh.id}_${selectedProd.id}`;

      // Parse sizesText if present, e.g. "39: 5, 40: 10"
      const sizesStock: Record<string, number> = {};
      if (stockFormData.sizesText.trim()) {
        const parts = stockFormData.sizesText.split(',');
        parts.forEach(part => {
          const [size, qty] = part.split(':').map(s => s.trim());
          if (size && qty && !isNaN(Number(qty))) {
            sizesStock[size] = Number(qty);
          }
        });
      }

      const payload: InventoryStockItem = {
        id: stockId,
        warehouseId: selectedWh.id,
        warehouseName: selectedWh.name,
        productId: selectedProd.id,
        productName: selectedProd.name,
        productSku: selectedProd.sku || '',
        productCategory: selectedProd.category || 'epp',
        currentStock: Number(stockFormData.quantity) || 0,
        minStock: Number(stockFormData.minStock) || 5,
        unit: stockFormData.unit || 'unidad',
        sizesStock: Object.keys(sizesStock).length > 0 ? sizesStock : undefined,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'inventory_stock', stockId), payload, { merge: true });
      setIsStockModalOpen(false);
    } catch (error: any) {
      console.error('Error saving stock:', error);
      const msg = error?.message || String(error);
      if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
        alert('Error de Permisos en la Nube de Google Firebase:\n\nLa base de datos Firestore en Google Cloud aún no tiene publicadas las reglas de seguridad para la colección "inventory_stock".\n\nPor favor publica las reglas en la Consola de Firebase o ejecuta "npm run deploy:rules".');
      } else {
        alert('Error al actualizar el stock: ' + msg);
      }
    }
  };

  // Approve Request & Deduct from Warehouse Stock
  const handleApproveRequest = async (request: InventoryUpdateRequest) => {
    if (!request || request.status !== 'pendiente') return;
    setIsProcessingAction(true);

    try {
      const batch = writeBatch(db);

      // 1. Deduct items from stock
      for (const item of request.items) {
        const stockDocId = `${request.warehouseId}_${item.productId}`;
        const existingStock = stockItems.find(s => s.id === stockDocId);

        if (existingStock) {
          const newQty = Math.max(0, existingStock.currentStock - item.quantity);
          const updateData: any = {
            currentStock: newQty,
            updatedAt: new Date().toISOString()
          };

          // Also deduct from size if specified
          if (item.size && existingStock.sizesStock && existingStock.sizesStock[item.size] !== undefined) {
            const currentSizeQty = existingStock.sizesStock[item.size] || 0;
            updateData[`sizesStock.${item.size}`] = Math.max(0, currentSizeQty - item.quantity);
          }

          batch.update(doc(db, 'inventory_stock', stockDocId), updateData);
        }
      }

      // 2. Mark request as approved
      const currentUserName = currentMember ? currentMember.name : 'Administrador';
      batch.update(doc(db, 'inventory_update_requests', request.id), {
        status: 'aprobada',
        approvedById: currentMember?.id || 'admin',
        approvedByName: currentUserName,
        approvedAt: new Date().toISOString()
      });

      await batch.commit();
      const updatedApproved: InventoryUpdateRequest = { 
        ...request, 
        status: 'aprobada', 
        approvedById: currentMember?.id || 'admin',
        approvedByName: currentUserName,
        approvedAt: new Date().toISOString()
      };
      setSelectedRequest(updatedApproved);
      setRequestToPrint(updatedApproved);
      alert('¡Solicitud de Entrega aprobada y stock de bodega descontado con éxito!\n\nSe ha abierto la vista oficial del Acta para que puedas imprimirla o guardarla en PDF.');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Hubo un error al procesar el descuento de inventario.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Reject Request
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    setIsProcessingAction(true);
    try {
      const currentUserName = currentMember ? currentMember.name : 'Administrador';
      await updateDoc(doc(db, 'inventory_update_requests', selectedRequest.id), {
        status: 'rechazada',
        rejectionReason: rejectionReason.trim(),
        approvedById: currentMember?.id || 'admin',
        approvedByName: currentUserName,
        approvedAt: new Date().toISOString()
      });

      setSelectedRequest(prev => prev ? { ...prev, status: 'rechazada', rejectionReason: rejectionReason.trim() } : null);
      setRejectionModalOpen(false);
      setRejectionReason('');
      alert('Solicitud rechazada.');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error al rechazar solicitud.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Facturas Handlers
  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo en formato PDF.');
      return;
    }
    setInvoiceFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeInvoice = async () => {
    if (!invoiceFileBase64) {
      alert('Por favor selecciona un archivo PDF de la factura primero.');
      return;
    }
    setIsAnalyzingInvoice(true);
    try {
      const res = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: invoiceFileBase64,
          existingProducts: products
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al procesar la factura con IA');
      }
      const data = await res.json();
      setInvoiceFormData({
        invoiceNumber: data.invoiceNumber || '',
        supplierName: data.supplierName || '',
        supplierRuc: data.supplierRuc || '',
        invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
        totalAmount: Number(data.totalAmount) || 0
      });
      if (Array.isArray(data.items)) {
        setParsedInvoiceItems(data.items.map((it: any, idx: number) => ({
          tempId: `item-${Date.now()}-${idx}`,
          description: it.description || '',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: Number(it.totalPrice) || ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
          size: it.suggestedSize || 'Estándar',
          matchedProductId: it.matchedProductId || ''
        })));
      }
    } catch (err: any) {
      console.error('Error analyzing invoice:', err);
      alert(err.message || 'Error al analizar la factura.');
    } finally {
      setIsAnalyzingInvoice(false);
    }
  };

  const handleAddManualInvoiceItem = () => {
    setParsedInvoiceItems(prev => [
      ...prev,
      {
        tempId: `item-manual-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        size: 'Estándar',
        matchedProductId: ''
      }
    ]);
  };

  const handleUpdateInvoiceItem = (tempId: string, field: string, value: any) => {
    setParsedInvoiceItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
        updated.totalPrice = Math.round((qty * price) * 100) / 100;
      }
      if (field === 'matchedProductId' && value) {
        const prod = products.find(p => p.id === value);
        if (prod && !item.description) {
          updated.description = prod.name;
        }
      }
      return updated;
    }));
  };

  const handleDeleteInvoiceItem = (tempId: string) => {
    setParsedInvoiceItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleConfirmAndSaveInvoice = async () => {
    if (!selectedWarehouseForInvoice) {
      alert('Por favor selecciona la bodega de destino donde ingresará el inventario.');
      return;
    }
    if (parsedInvoiceItems.length === 0) {
      alert('No hay productos para ingresar al inventario.');
      return;
    }
    if (!invoiceFormData.invoiceNumber.trim()) {
      alert('Por favor ingresa el número de la factura.');
      return;
    }
    if (!invoiceFormData.supplierName.trim()) {
      alert('Por favor ingresa el nombre del proveedor.');
      return;
    }

    const targetWarehouse = warehouses.find(w => w.id === selectedWarehouseForInvoice);
    if (!targetWarehouse) {
      alert('Bodega de destino no encontrada.');
      return;
    }

    setIsSavingInvoice(true);
    try {
      // 1. Subir PDF a Firebase Storage si existe archivo
      let pdfDownloadUrl = '';
      let storagePath = '';
      if (invoiceFile) {
        const invoiceDocId = `inv_${Date.now()}`;
        storagePath = `invoices/${invoiceDocId}_${invoiceFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, invoiceFile);
        pdfDownloadUrl = await getDownloadURL(fileRef);
      }

      // 2. Preparar batch atómico de Firestore
      const batch = writeBatch(db);
      const invoiceRef = doc(collection(db, 'inventory_invoices'));

      const savedItems: InventoryInvoiceItem[] = parsedInvoiceItems.map(it => {
        const matchedProd = products.find(p => p.id === it.matchedProductId);
        return {
          productId: it.matchedProductId || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productName: matchedProd ? matchedProd.name : it.description,
          productSku: matchedProd?.sku || '',
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: Number(it.totalPrice) || 0,
          size: it.size || 'Estándar'
        };
      });

      const calculatedTotal = savedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

      const invoicePayload: InventoryInvoice = {
        id: invoiceRef.id,
        invoiceNumber: invoiceFormData.invoiceNumber.trim(),
        supplierName: invoiceFormData.supplierName.trim(),
        supplierRuc: invoiceFormData.supplierRuc.trim(),
        invoiceDate: invoiceFormData.invoiceDate,
        totalAmount: Number(invoiceFormData.totalAmount) || calculatedTotal,
        warehouseId: targetWarehouse.id,
        warehouseName: targetWarehouse.name,
        items: savedItems,
        pdfUrl: pdfDownloadUrl,
        pdfStoragePath: storagePath,
        status: 'cargada',
        uploadedById: currentMember?.id || 'admin',
        uploadedByName: currentMember?.name || 'Administrador',
        createdAt: new Date().toISOString()
      };

      batch.set(invoiceRef, invoicePayload);

      // 3. Incrementar o crear el stock en la bodega de destino
      for (const item of savedItems) {
        const stockDocId = `${targetWarehouse.id}_${item.productId}`;
        const existingStock = stockItems.find(s => s.id === stockDocId || (s.warehouseId === targetWarehouse.id && s.productId === item.productId));

        if (existingStock) {
          const currentQty = existingStock.currentStock || 0;
          const newQty = currentQty + item.quantity;
          const updatedSizes = { ...(existingStock.sizesStock || {}) };
          if (item.size && item.size !== 'Estándar') {
            updatedSizes[item.size] = (updatedSizes[item.size] || 0) + item.quantity;
          }
          batch.update(doc(db, 'inventory_stock', existingStock.id), {
            currentStock: newQty,
            sizesStock: updatedSizes,
            updatedAt: new Date().toISOString()
          });
        } else {
          const matchedProd = products.find(p => p.id === item.productId);
          const initialSizes: Record<string, number> = {};
          if (item.size && item.size !== 'Estándar') {
            initialSizes[item.size] = item.quantity;
          }
          const newStockDoc: InventoryStockItem = {
            id: stockDocId,
            warehouseId: targetWarehouse.id,
            warehouseName: targetWarehouse.name,
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku || matchedProd?.sku || '',
            productCategory: matchedProd?.category || 'epp',
            currentStock: item.quantity,
            minStock: 5,
            unit: 'unidad',
            sizesStock: initialSizes,
            updatedAt: new Date().toISOString()
          };
          batch.set(doc(db, 'inventory_stock', stockDocId), newStockDoc);
        }
      }

      await batch.commit();

      alert(`¡Factura ${invoicePayload.invoiceNumber} registrada exitosamente! Se agregaron ${savedItems.reduce((a, b) => a + b.quantity, 0)} unidades a ${targetWarehouse.name}.`);

      // Limpiar formulario
      setInvoiceFile(null);
      setInvoiceFileBase64(null);
      setInvoiceFormData({
        invoiceNumber: '',
        supplierName: '',
        supplierRuc: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        totalAmount: 0
      });
      setParsedInvoiceItems([]);
    } catch (error: any) {
      console.error('Error saving invoice and updating stock:', error);
      alert('Error al guardar la factura e ingresar al inventario: ' + (error?.message || error));
    } finally {
      setIsSavingInvoice(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Boxes size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Módulo de Inventario & Bodegas
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Multi-Bodega
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Control de existencias, almacenes físicos/móviles y sincronización de actas EPP desde campo.
            </p>
          </div>
        </div>

        {/* Global Stats Badges */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center min-w-[90px]">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bodegas</p>
            <p className="text-lg font-black text-slate-800 dark:text-white">{stats.totalWarehouses}</p>
          </div>
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center min-w-[100px]">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unidades</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.totalUnits}</p>
          </div>
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-center min-w-[100px]">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Stock Bajo</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.lowStockAlerts}</p>
          </div>
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 text-center min-w-[110px]">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Por Revisar</p>
            <p className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.pendingRequests}</p>
          </div>
        </div>
      </div>

      {/* Subtab Navigation Pills & Quick Importer Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/70 w-fit overflow-x-auto">
          <button
            onClick={() => onSubTabChange('existencias')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'existencias'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers size={16} />
            Existencias & Stock
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {stockItems.length}
            </span>
          </button>

          <button
            onClick={() => onSubTabChange('bodegas')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'bodegas'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 size={16} />
            Gestión de Bodegas
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {warehouses.length}
            </span>
          </button>

          <button
            onClick={() => onSubTabChange('solicitudes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'solicitudes'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCheck size={16} />
            Entrega de EPP & Actas
            {pendingRequestsCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-extrabold animate-pulse">
                {pendingRequestsCount} pendientes
              </span>
            )}
          </button>

          <button
            onClick={() => onSubTabChange('facturas')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'facturas'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt size={16} />
            Carga por Factura
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {invoices.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsEppImporterOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 w-fit"
        >
          <FileSpreadsheet size={16} />
          Importar EPP desde Excel / Sheets
        </button>
      </div>

      {/* SUBTAB 1: EXISTENCIAS & STOCK */}
      {activeSubTab === 'existencias' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto, SKU o bodega..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Warehouse Filter */}
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas las Bodegas (Consolidado)</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas las Categorías</option>
                <option value="epp">EPP (Equipos de Protección)</option>
                <option value="equipos">Equipos & Maquinaria</option>
                <option value="qhse">QHSE</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsEppImporterOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <FileSpreadsheet size={16} />
                Importar Excel
              </button>
              <button
                onClick={() => {
                  setStockFormData({
                    warehouseId: warehouses[0]?.id || '',
                    productId: products[0]?.id || '',
                    quantity: 10,
                    minStock: 5,
                    unit: 'unidad',
                    sizesText: ''
                  });
                  setIsStockModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
              >
                <Plus size={16} />
                Ingresar / Ajustar Stock
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Producto & SKU</th>
                    <th className="py-4 px-6">Bodega</th>
                    <th className="py-4 px-6 text-center">Stock Actual</th>
                    <th className="py-4 px-6 text-center">Stock Mínimo</th>
                    <th className="py-4 px-6">Tallas / Variantes</th>
                    <th className="py-4 px-6 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Boxes size={36} className="mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-slate-700 dark:text-slate-200">No se encontraron existencias en el inventario.</p>
                        <p className="text-xs text-slate-500 mt-1 mb-4">
                          Haz clic en "Ingresar / Ajustar Stock" o carga tu catálogo de EPP desde un archivo Excel o Google Sheets.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEppImporterOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                        >
                          <FileSpreadsheet size={16} />
                          Importar Productos EPP desde Excel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map(item => {
                      const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
                      const isOut = item.currentStock === 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {item.productName}
                              {item.productCategory === 'epp' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 font-semibold">
                                  EPP
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">SKU: {item.productSku || 'S/N'}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {item.warehouseName}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-base">
                            <span className={isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}>
                              {item.currentStock}
                            </span>{' '}
                            <span className="text-xs font-normal text-slate-400">{item.unit || 'uds'}</span>
                          </td>
                          <td className="py-4 px-6 text-center text-slate-500 font-medium">
                            {item.minStock} {item.unit || 'uds'}
                          </td>
                          <td className="py-4 px-6">
                            {item.sizesStock && Object.keys(item.sizesStock).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {Object.entries(item.sizesStock).map(([size, qty]) => (
                                  <span key={size} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    T.{size}: <strong className="text-slate-900 dark:text-white">{qty}</strong>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Estándar (sin tallas)</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800">
                                <AlertTriangle size={12} /> Agotado
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <AlertCircle size={12} /> Stock Crítico
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <Check size={12} /> En Existencia
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: GESTIÓN DE BODEGAS */}
      {activeSubTab === 'bodegas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Almacenes y Bodegas Registradas</h2>
              <p className="text-xs text-slate-500">Configura los puntos de almacenamiento físicos, bodegas móviles o de obra.</p>
            </div>
            <button
              onClick={() => {
                setEditingWarehouse(null);
                setWarehouseFormData({
                  name: '',
                  code: '',
                  type: 'fija',
                  location: '',
                  responsibleMemberId: members[0]?.id || '',
                  description: '',
                  status: 'activa'
                });
                setIsWarehouseModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <Plus size={16} />
              Crear Nueva Bodega
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouses.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Building2 size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">No hay bodegas registradas</h3>
                <p className="text-xs text-slate-400 mt-1">Crea tu primera bodega para comenzar a gestionar el inventario.</p>
              </div>
            ) : (
              warehouses.map(w => {
                const stockInThisWh = stockItems.filter(s => s.warehouseId === w.id);
                const totalUnits = stockInThisWh.reduce((a, b) => a + (Number(b.currentStock) || 0), 0);

                return (
                  <div
                    key={w.id}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white ${
                            w.type === 'movil' ? 'bg-amber-500' : w.type === 'campo' ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}>
                            {w.type === 'movil' ? <Truck size={20} /> : <Building2 size={20} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{w.name}</h3>
                            <span className="text-[11px] font-mono text-slate-400">{w.code}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          w.status === 'activa' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {w.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800/80 my-3">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span>Tipo:</span>
                          <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{w.type}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span>Ubicación:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{w.location || 'No especificada'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span>Custodio / Responsable:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{w.responsibleMemberName || 'Sin asignar'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-around bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-center">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">Líneas SKU</p>
                          <p className="text-sm font-extrabold text-slate-800 dark:text-white">{stockInThisWh.length}</p>
                        </div>
                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">Unidades Totales</p>
                          <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{totalUnits}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setEditingWarehouse(w);
                          setWarehouseFormData({
                            name: w.name,
                            code: w.code,
                            type: w.type,
                            location: w.location || '',
                            responsibleMemberId: w.responsibleMemberId || '',
                            description: w.description || '',
                            status: w.status
                          });
                          setIsWarehouseModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteWarehouse(w.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SOLICITUDES DE ACTUALIZACIÓN */}
      {activeSubTab === 'solicitudes' && (
        <div className="space-y-4">
          {/* Status Filters Bar & Action Button */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-2">Filtrar por estado:</span>
              {(['todos', 'pendiente', 'aprobada', 'rechazada'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setRequestsStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    requestsStatusFilter === st
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st}
                  {st === 'pendiente' && pendingRequestsCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white text-emerald-700 text-[10px]">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, trabajador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/25 shrink-0"
              >
                <Plus size={16} />
                Nueva Entrega de EPP
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Código / Fecha</th>
                    <th className="py-4 px-6">Trabajador Receptor</th>
                    <th className="py-4 px-6">Bodega Origen</th>
                    <th className="py-4 px-6">Supervisor / Entrega</th>
                    <th className="py-4 px-6 text-center">Items EPP</th>
                    <th className="py-4 px-6 text-center">Evidencias</th>
                    <th className="py-4 px-6 text-center">Estado</th>
                    <th className="py-4 px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileCheck size={36} className="mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No hay entregas en esta bandeja.</p>
                        <p className="text-xs text-slate-500 mt-1 mb-4">
                          Puedes registrar una entrega directamente desde la computadora o recibir actas desde la app móvil.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsDeliveryModalOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                        >
                          <Plus size={15} />
                          Registrar Entrega de EPP
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map(req => {
                      const totalQty = req.items.reduce((a, b) => a + (Number(b.quantity) || 0), 0);

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">{req.requestCode}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400">
                                {new Date(req.deliveryDate || req.createdAt).toLocaleDateString('es-EC')}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                req.source === 'web' 
                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
                                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                              }`}>
                                {req.source === 'web' ? 'Web ERP' : 'App Móvil'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 dark:text-white">{req.workerName}</div>
                            {req.workerIdNumber && (
                              <span className="text-[11px] text-slate-400">CI: {req.workerIdNumber}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-700 dark:text-slate-300">
                            {req.warehouseName}
                          </td>
                          <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                            {req.deliveredByName}
                          </td>
                          <td className="py-4 px-6 text-center font-bold">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {totalQty} uds
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {req.photoEquipmentUrl && (
                                <button 
                                  onClick={() => setImageModalUrl(req.photoEquipmentUrl || null)}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300" 
                                  title="Foto del EPP"
                                >
                                  <ImageIcon size={14} />
                                </button>
                              )}
                              {req.photoWorkerUrl && (
                                <button 
                                  onClick={() => setImageModalUrl(req.photoWorkerUrl || null)}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300" 
                                  title="Foto del Colaborador"
                                >
                                  <User size={14} />
                                </button>
                              )}
                              {req.signatureUrl && (
                                <span className="p-1 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold" title="Firma Registrada">
                                  ✍️
                                </span>
                              )}
                              {req.pdfReportUrl && (
                                <a 
                                  href={req.pdfReportUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
                                  title="Descargar Acta PDF"
                                >
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              req.status === 'aprobada'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : req.status === 'rechazada'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}>
                              {req.status === 'aprobada' ? <Check size={12} /> : req.status === 'rechazada' ? <X size={12} /> : <Clock size={12} />}
                              <span className="capitalize">{req.status}</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {req.status === 'aprobada' && (
                                <button
                                  type="button"
                                  onClick={() => setRequestToPrint(req)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all shadow-sm"
                                  title="Imprimir Acta Oficial"
                                >
                                  <Printer size={13} />
                                  <span className="hidden sm:inline">Acta</span>
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedRequest(req)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  req.status === 'pendiente'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {req.status === 'pendiente' ? 'Revisar y Conciliar' : 'Ver Detalle'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: CARGA POR FACTURA CON IA */}
      {activeSubTab === 'facturas' && (
        <div className="space-y-8">
          {/* Main Upload & AI Processing Card */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Receipt size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Cargar Factura de Compra de EPP
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1">
                      <Sparkles size={10} /> Gemini 2.5 Flash
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sube la factura electrónica o física en PDF. La IA extraerá los ítems, cantidades, tallas y precios para ingresarlos automáticamente al stock.
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs: Bodega & PDF File */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Select Warehouse */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-500" />
                  Bodega de Destino *
                </label>
                <select
                  value={selectedWarehouseForInvoice}
                  onChange={(e) => setSelectedWarehouseForInvoice(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">-- Selecciona la bodega donde ingresará el stock --</option>
                  {warehouses
                    .filter(w => w.status === 'activa')
                    .map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code}) {w.location ? `- ${w.location}` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Las cantidades cargadas aumentarán las existencias físicas de esta bodega.
                </p>
              </div>

              {/* Upload PDF */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Upload size={14} className="text-indigo-500" />
                  Archivo PDF de la Factura *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="invoice-pdf-upload"
                    accept="application/pdf"
                    onChange={handleInvoiceFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="invoice-pdf-upload"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-all"
                  >
                    <Upload size={16} className="text-slate-400" />
                    {invoiceFile ? invoiceFile.name : 'Seleccionar archivo PDF'}
                  </label>

                  {invoiceFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceFile(null);
                        setInvoiceFileBase64(null);
                      }}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                      title="Quitar archivo"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {invoiceFile && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Archivo listo: {invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            {/* AI Action Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                {isAnalyzingInvoice ? (
                  <span className="flex items-center gap-2 text-indigo-600 font-bold animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    Analizando factura y cotejando productos con IA...
                  </span>
                ) : (
                  <span>Puedes procesar el PDF con IA o rellenar las líneas de producto manualmente.</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!invoiceFile || isAnalyzingInvoice}
                  onClick={handleAnalyzeInvoice}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/25"
                >
                  <Sparkles size={16} />
                  {isAnalyzingInvoice ? 'Procesando...' : 'Analizar Factura con IA'}
                </button>
              </div>
            </div>

            {/* Extracted Data & Item Editing Section */}
            {(parsedInvoiceItems.length > 0 || invoiceFormData.invoiceNumber) && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Datos Extraídos y Conciliación de Ítems
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddManualInvoiceItem}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus size={14} /> Agregar Fila
                  </button>
                </div>

                {/* General Invoice Info Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">N° Factura *</label>
                    <input
                      type="text"
                      placeholder="001-002-000012345"
                      value={invoiceFormData.invoiceNumber}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Proveedor *</label>
                    <input
                      type="text"
                      placeholder="Nombre comercial o razón social"
                      value={invoiceFormData.supplierName}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, supplierName: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">RUC Proveedor</label>
                    <input
                      type="text"
                      placeholder="ej. 1790012345001"
                      value={invoiceFormData.supplierRuc}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, supplierRuc: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Fecha Emisión</label>
                    <input
                      type="date"
                      value={invoiceFormData.invoiceDate}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoiceDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="py-3 px-4">Descripción en Factura</th>
                        <th className="py-3 px-4">Vincular a Catálogo Novagreen</th>
                        <th className="py-3 px-3 w-24">Talla</th>
                        <th className="py-3 px-3 w-20 text-center">Cant.</th>
                        <th className="py-3 px-3 w-24 text-right">P. Unit ($)</th>
                        <th className="py-3 px-3 w-24 text-right">Total ($)</th>
                        <th className="py-3 px-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedInvoiceItems.map((item) => (
                        <tr key={item.tempId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          {/* Invoice description */}
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateInvoiceItem(item.tempId, 'description', e.target.value)}
                              placeholder="Nombre del producto..."
                              className="w-full px-2.5 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:bg-white dark:focus:bg-slate-900"
                            />
                          </td>

                          {/* Catalog Link */}
                          <td className="py-2.5 px-4 min-w-[200px]">
                            <select
                              value={item.matchedProductId}
                              onChange={(e) => handleUpdateInvoiceItem(item.tempId, 'matchedProductId', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                            >
                              <option value="">-- Sin vincular (usar nombre original) --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.sku ? `(${p.sku})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Size */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.size}
                              onChange={(e) => handleUpdateInvoiceItem(item.tempId, 'size', e.target.value)}
                              placeholder="ej. 39, L..."
                              className="w-full px-2 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center font-bold text-slate-700 dark:text-slate-300"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateInvoiceItem(item.tempId, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center font-black text-emerald-600 dark:text-emerald-400"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateInvoiceItem(item.tempId, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right font-medium"
                            />
                          </td>

                          {/* Total */}
                          <td className="py-2.5 px-3 text-right font-black text-slate-800 dark:text-white">
                            ${Number(item.totalPrice).toFixed(2)}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoiceItem(item.tempId)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                              title="Descartar ítem"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary and Save Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Total Líneas: </span>
                      <strong className="text-slate-900 dark:text-white font-black">{parsedInvoiceItems.length}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Total Unidades Físicas: </span>
                      <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                        {parsedInvoiceItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)} u.
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Monto Factura: </span>
                      <strong className="text-slate-900 dark:text-white font-black">
                        ${parsedInvoiceItems.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedInvoiceItems([]);
                        setInvoiceFile(null);
                        setInvoiceFileBase64(null);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Descartar Todo
                    </button>

                    <button
                      type="button"
                      disabled={isSavingInvoice}
                      onClick={handleConfirmAndSaveInvoice}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/25"
                    >
                      {isSavingInvoice ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Ingresando al Inventario...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Confirmar e Ingresar al Inventario
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoices History Table */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-emerald-500" />
                  Historial de Facturas de Compra Ingresadas
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {invoices.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registro de facturas procesadas con respaldo de PDF y desglose de existencias ingresadas.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° factura o proveedor..."
                  value={invoiceSearchTerm}
                  onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">N° Factura</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Bodega Destino</th>
                    <th className="py-3 px-3 text-center">Fecha Emisión</th>
                    <th className="py-3 px-3 text-center">Ítems</th>
                    <th className="py-3 px-3 text-right">Total ($)</th>
                    <th className="py-3 px-4">Registrado Por</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        No se han registrado facturas de compra aún.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {inv.supplierName}
                          {inv.supplierRuc && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              RUC: {inv.supplierRuc}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Building2 size={12} className="text-emerald-500" />
                            {inv.warehouseName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                          {inv.invoiceDate || '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {inv.items?.length || 0}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          ${Number(inv.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {inv.uploadedByName}
                          <span className="block text-[10px] text-slate-400">
                            {new Date(inv.createdAt).toLocaleDateString('es-EC')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.pdfUrl && (
                              <a
                                href={inv.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                                title="Ver Factura PDF"
                              >
                                <FileText size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => setViewingInvoice(inv)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                            >
                              Ver Detalle
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: NUEVA / EDITAR BODEGA */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                {editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega de Almacenamiento'}
              </h3>
              <button onClick={() => setIsWarehouseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nombre de la Bodega *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Bodega Matriz Quito, Bodega Planta..."
                  value={warehouseFormData.name}
                  onChange={(e) => setWarehouseFormData({ ...warehouseFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Código Identificador *</label>
                  <input
                    type="text"
                    required
                    placeholder="BOD-01, MATRIZ..."
                    value={warehouseFormData.code}
                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo de Bodega</label>
                  <select
                    value={warehouseFormData.type}
                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="fija">Fija (Edificio / Almacén)</option>
                    <option value="movil">Móvil (Vehículo / Camioneta)</option>
                    <option value="campo">Campo / Obra Temporal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Ubicación / Dirección / Placa</label>
                <input
                  type="text"
                  placeholder="ej. Av. 10 de Agosto, o Placa PBB-1234..."
                  value={warehouseFormData.location}
                  onChange={(e) => setWarehouseFormData({ ...warehouseFormData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Custodio / Responsable</label>
                <select
                  value={warehouseFormData.responsibleMemberId}
                  onChange={(e) => setWarehouseFormData({ ...warehouseFormData, responsibleMemberId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar Responsable --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  Guardar Bodega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AJUSTAR STOCK */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">Ingresar / Ajustar Stock</h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Bodega de Destino *</label>
                <select
                  required
                  value={stockFormData.warehouseId}
                  onChange={(e) => setStockFormData({ ...stockFormData, warehouseId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar Bodega --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Producto del Catálogo *</label>
                <select
                  required
                  value={stockFormData.productId}
                  onChange={(e) => setStockFormData({ ...stockFormData, productId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar Producto --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || 'N/A'} - {p.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={stockFormData.minStock}
                    onChange={(e) => setStockFormData({ ...stockFormData, minStock: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Unidad</label>
                  <input
                    type="text"
                    value={stockFormData.unit}
                    onChange={(e) => setStockFormData({ ...stockFormData, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Desglose por Tallas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. 39: 5, 40: 10, 41: 8"
                  value={stockFormData.sizesText}
                  onChange={(e) => setStockFormData({ ...stockFormData, sizesText: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Formato: Talla: Cantidad separado por comas.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  Actualizar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DETALLE DE SOLICITUD DE ACTUALIZACIÓN & EVIDENCIAS */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedRequest.requestCode}
                </span>
                <h3 className="font-black text-xl text-slate-900 dark:text-white">
                  Acta de Entrega EPP en Campo
                </h3>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 mt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-medium">Trabajador</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedRequest.workerName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedRequest.workerIdNumber}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-medium">Bodega de Salida</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedRequest.warehouseName}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-medium">Entregado Por</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedRequest.deliveredByName}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-medium">Fecha de Entrega</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {new Date(selectedRequest.deliveryDate || selectedRequest.createdAt).toLocaleDateString('es-EC')}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Equipos de Protección Entregados
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                      <tr>
                        <th className="py-2.5 px-4">Equipo / Producto</th>
                        <th className="py-2.5 px-4 text-center">Talla</th>
                        <th className="py-2.5 px-4 text-center">Cantidad</th>
                        <th className="py-2.5 px-4 text-center">Condición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedRequest.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                            {item.productName}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-400 font-bold">
                            {item.size || 'N/A'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {item.quantity} uds
                          </td>
                          <td className="py-2.5 px-4 text-center text-[11px] capitalize text-slate-500">
                            {item.condition || 'nuevo'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Photographic Evidences & Digital Signature */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Evidencia 1: Foto EPP */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">Foto del EPP Entregado</p>
                  {selectedRequest.photoEquipmentUrl ? (
                    <img
                      src={selectedRequest.photoEquipmentUrl}
                      alt="Foto EPP"
                      onClick={() => setImageModalUrl(selectedRequest.photoEquipmentUrl || null)}
                      className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-full h-32 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <ImageIcon size={24} className="mb-1 opacity-50" />
                      Sin foto adjunta
                    </div>
                  )}
                </div>

                {/* Evidencia 2: Foto Trabajador */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">Foto con el Trabajador</p>
                  {selectedRequest.photoWorkerUrl ? (
                    <img
                      src={selectedRequest.photoWorkerUrl}
                      alt="Foto Trabajador"
                      onClick={() => setImageModalUrl(selectedRequest.photoWorkerUrl || null)}
                      className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-full h-32 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <User size={24} className="mb-1 opacity-50" />
                      Sin foto adjunta
                    </div>
                  )}
                </div>

                {/* Evidencia 3: Firma Digital */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">Firma Digital del Colaborador</p>
                  {selectedRequest.signatureUrl ? (
                    <div className="w-full h-32 rounded-xl bg-white p-2 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <img
                        src={selectedRequest.signatureUrl}
                        alt="Firma Digital"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-xs">
                      Sin firma registrada
                    </div>
                  )}
                </div>
              </div>

              {/* Official Delivery Act & PDF */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Acta Oficial de Entrega de EPP</p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400">Documento legal membretado con firmas y evidencias</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestToPrint(selectedRequest)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
                  >
                    <Printer size={14} /> Ver e Imprimir Acta
                  </button>
                  {selectedRequest.pdfReportUrl && (
                    <a
                      href={selectedRequest.pdfReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                      title="Descargar archivo PDF externo"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>
              </div>

              {/* Status & Approvals Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500">
                  {selectedRequest.status === 'aprobada' && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Aprobado por {selectedRequest.approvedByName} ({new Date(selectedRequest.approvedAt || '').toLocaleDateString('es-EC')})
                    </span>
                  )}
                  {selectedRequest.status === 'rechazada' && (
                    <span className="text-red-500 font-bold flex items-center gap-1.5">
                      <AlertCircle size={16} /> Rechazado: {selectedRequest.rejectionReason || 'Sin motivo especificado'}
                    </span>
                  )}
                  {selectedRequest.status === 'pendiente' && (
                    <span className="text-amber-600 font-medium">
                      Esta solicitud está pendiente de conciliar y descontar del inventario.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {selectedRequest.status === 'pendiente' && (
                    <>
                      <button
                        disabled={isProcessingAction}
                        onClick={() => setRejectionModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        Rechazar
                      </button>
                      <button
                        disabled={isProcessingAction}
                        onClick={() => handleApproveRequest(selectedRequest)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/25"
                      >
                        <Check size={16} />
                        {isProcessingAction ? 'Procesando...' : 'Aprobar y Descontar de Bodega'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECHAZO DE SOLICITUD */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Rechazar Solicitud de Entrega</h3>
            <p className="text-xs text-slate-500 mb-4">Indica la razón por la que no se conciliará esta entrega en el inventario:</p>
            <textarea
              required
              rows={3}
              placeholder="ej. Fotos no legibles, error en la cantidad seleccionada, duplicado..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectRequest}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ZOOM DE IMÁGENES */}
      {imageModalUrl && (
        <div 
          onClick={() => setImageModalUrl(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <div className="max-w-3xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img 
              src={imageModalUrl} 
              alt="Evidencia ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
            />
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-lg font-bold"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: DETALLE DE FACTURA DE COMPRA */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    Factura {viewingInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proveedor: <span className="font-semibold text-slate-700 dark:text-slate-300">{viewingInvoice.supplierName}</span>
                    {viewingInvoice.supplierRuc && ` · RUC: ${viewingInvoice.supplierRuc}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Bodega Destino</span>
                <p className="text-xs font-black text-slate-800 dark:text-white mt-1 truncate">
                  {viewingInvoice.warehouseName}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Fecha Emisión</span>
                <p className="text-xs font-black text-slate-800 dark:text-white mt-1">
                  {viewingInvoice.invoiceDate || '-'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Unidades</span>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {viewingInvoice.items?.reduce((a, b) => a + (Number(b.quantity) || 0), 0) || 0} u.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Monto Total</span>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-1">
                  ${Number(viewingInvoice.totalAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Products Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Desglose de Ítems Ingresados ({viewingInvoice.items?.length || 0})
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Producto</th>
                      <th className="py-2.5 px-3 text-center">Talla</th>
                      <th className="py-2.5 px-3 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">P. Unit ($)</th>
                      <th className="py-2.5 px-4 text-right">Total ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {viewingInvoice.items?.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {it.productName}
                          {it.productSku && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              SKU: {it.productSku}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {it.size || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                          ${Number(it.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                          ${Number(it.totalPrice || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer with metadata and PDF link */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">
                Registrado por <strong>{viewingInvoice.uploadedByName}</strong> el {new Date(viewingInvoice.createdAt).toLocaleString('es-EC')}
              </span>

              <div className="flex items-center gap-3">
                {viewingInvoice.pdfUrl && (
                  <a
                    href={viewingInvoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold transition-colors"
                  >
                    <FileText size={15} />
                    Ver Factura Original (PDF)
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: IMPORTADOR MASIVO DE EPP DESDE EXCEL / SHEETS */}
      <EppExcelImporterModal
        isOpen={isEppImporterOpen}
        onClose={() => setIsEppImporterOpen(false)}
        warehouses={warehouses}
        existingProducts={products}
        existingStockItems={stockItems}
        currentMember={currentMember}
      />

      {/* MODAL 8: REGISTRO DE ENTREGA DE EPP (SOLICITUD WEB) */}
      {isDeliveryModalOpen && (
        <EppDeliveryModal
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          warehouses={warehouses}
          products={products}
          stockItems={stockItems}
          members={members}
          currentMember={currentMember}
          onSuccess={(createdReq) => {
            // Se puede seleccionar inmediatamente para revisión si se desea
            setSelectedRequest(createdReq);
          }}
        />
      )}

      {/* MODAL 9: ACTA OFICIAL DE ENTREGA DE EPP (IMPRESIÓN / PDF) */}
      {requestToPrint && (
        <EppDeliveryPrintModal
          isOpen={!!requestToPrint}
          onClose={() => setRequestToPrint(null)}
          request={requestToPrint}
          products={products}
        />
      )}
    </div>
  );
};
