import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  HardHat, 
  Plus, 
  Trash2, 
  Camera, 
  Upload, 
  PenTool, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  User, 
  Calendar, 
  Layers,
  FileCheck,
  Video,
  VideoOff
} from 'lucide-react';
import { 
  Warehouse, 
  ProductItem, 
  InventoryStockItem, 
  TeamMember, 
  InventoryUpdateRequest, 
  EPPItemDelivered 
} from '../../types';
import { db, collection, setDoc, doc } from '../../lib/firebase';

interface EppDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  products: ProductItem[];
  stockItems: InventoryStockItem[];
  members: TeamMember[];
  currentMember: TeamMember | null | undefined;
  onSuccess: (request: InventoryUpdateRequest) => void;
}

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = sanitizeForFirestore(val);
    } else if (Array.isArray(val)) {
      result[key] = val.map(item => (typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item));
    } else {
      result[key] = val;
    }
  }
  return result;
}

export const EppDeliveryModal: React.FC<EppDeliveryModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  products,
  stockItems,
  members,
  currentMember,
  onSuccess
}) => {
  // Filter active warehouses
  const activeWarehouses = warehouses.filter(w => w.status !== 'inactiva');

  // Form states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [workerMode, setWorkerMode] = useState<'member' | 'external'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [externalWorkerName, setExternalWorkerName] = useState<string>('');
  const [workerIdNumber, setWorkerIdNumber] = useState<string>('');
  const [workerRole, setWorkerRole] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [deliveryReason, setDeliveryReason] = useState<
    'dotacion_inicial' | 'reposicion_desgaste' | 'perdida_dano' | 'prestamo_temporal'
  >('dotacion_inicial');
  const [notes, setNotes] = useState<string>('');

  // Selected items list
  const [items, setItems] = useState<EPPItemDelivered[]>([]);

  // Item selector in progress
  const [itemProductId, setItemProductId] = useState<string>('');
  const [itemSize, setItemSize] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemCondition, setItemCondition] = useState<'nuevo' | 'reacondicionado'>('nuevo');

  // Photographic evidences (optional)
  const [photoEquipmentFile, setPhotoEquipmentFile] = useState<File | null>(null);
  const [photoEquipmentPreview, setPhotoEquipmentPreview] = useState<string | null>(null);
  const [photoWorkerFile, setPhotoWorkerFile] = useState<File | null>(null);
  const [photoWorkerPreview, setPhotoWorkerPreview] = useState<string | null>(null);

  // Webcam capture state
  const [isCameraOpen, setIsCameraOpen] = useState<'equipment' | 'worker' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Loading & error
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formContainerRef = useRef<HTMLFormElement | null>(null);

  // Initialize warehouse
  useEffect(() => {
    if (activeWarehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(activeWarehouses[0].id);
    }
  }, [activeWarehouses, selectedWarehouseId]);

  // When selectedMemberId changes, autofill CI and Role
  useEffect(() => {
    if (workerMode === 'member' && selectedMemberId) {
      const mem = members.find(m => m.id === selectedMemberId);
      if (mem) {
        setWorkerIdNumber(mem.identificationId || '');
        setWorkerRole(mem.role || '');
      }
    }
  }, [workerMode, selectedMemberId, members]);

  // Available EPP products
  const eppProducts = products.filter(p => p.category === 'epp' && p.status === 'activo');

  // Stock items in the selected warehouse
  const currentWarehouseStock = stockItems.filter(s => s.warehouseId === selectedWarehouseId);

  // When itemProductId changes, check available sizes and reset quantity
  const selectedProductObj = products.find(p => p.id === itemProductId);
  const stockForSelectedProduct = currentWarehouseStock.find(s => s.productId === itemProductId);

  const availableSizes = stockForSelectedProduct?.sizesStock
    ? Object.keys(stockForSelectedProduct.sizesStock)
    : [];

  const maxAvailableStock = stockForSelectedProduct
    ? (itemSize && stockForSelectedProduct.sizesStock?.[itemSize] !== undefined
        ? stockForSelectedProduct.sizesStock[itemSize]
        : stockForSelectedProduct.currentStock)
    : 0;

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Webcam Handlers
  const startCamera = async (target: 'equipment' | 'worker') => {
    try {
      setIsCameraOpen(target);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      alert('No se pudo acceder a la cámara web. Puedes subir una foto desde tus archivos.');
      setIsCameraOpen(null);
    }
  };

  const capturePhoto = (target: 'equipment' | 'worker') => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Scale down to max 640px dimension for ultra-lightweight storage (~30-40KB)
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    const MAX_DIM = 640;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = Math.round((h * MAX_DIM) / w);
        w = MAX_DIM;
      } else {
        w = Math.round((w * MAX_DIM) / h);
        h = MAX_DIM;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

    if (target === 'equipment') {
      setPhotoEquipmentPreview(dataUrl);
    } else {
      setPhotoWorkerPreview(dataUrl);
    }

    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(null);
  };

  // Add Item to delivery list
  const handleAddItem = () => {
    if (!itemProductId) {
      setFormError('Por favor selecciona un producto de EPP.');
      return;
    }
    if (itemQuantity <= 0) {
      setFormError('La cantidad debe ser mayor a 0.');
      return;
    }

    const prod = products.find(p => p.id === itemProductId);
    if (!prod) return;

    // Check if item already in list
    const existingIndex = items.findIndex(
      it => it.productId === itemProductId && (it.size || '') === (itemSize || '')
    );

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += itemQuantity;
      setItems(updated);
    } else {
      const newItem: EPPItemDelivered = {
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku || '',
        quantity: itemQuantity,
        size: itemSize ? itemSize.trim() : '',
        condition: itemCondition
      };
      setItems([...items, newItem]);
    }

    // Reset item selector
    setItemProductId('');
    setItemSize('');
    setItemQuantity(1);
    setFormError(null);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Handle Photo File selection with compression
  const handleFileSelect = (target: 'equipment' | 'worker', file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const MAX_DIM = 640;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          if (target === 'equipment') {
            setPhotoEquipmentPreview(compressedDataUrl);
          } else {
            setPhotoWorkerPreview(compressedDataUrl);
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!selectedWarehouseId) {
      const msg = 'Debes seleccionar una bodega de origen.';
      setFormError(msg);
      alert(msg);
      formContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let finalWorkerId = '';
    let finalWorkerName = '';
    if (workerMode === 'member') {
      if (!selectedMemberId) {
        const msg = 'Debes seleccionar un colaborador del equipo.';
        setFormError(msg);
        alert(msg);
        formContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const mem = members.find(m => m.id === selectedMemberId);
      finalWorkerId = mem?.id || selectedMemberId;
      finalWorkerName = mem?.name || 'Colaborador';
    } else {
      if (!externalWorkerName.trim()) {
        const msg = 'Debes ingresar el nombre del colaborador o contratista.';
        setFormError(msg);
        alert(msg);
        formContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      finalWorkerId = `ext-${Date.now().toString().slice(-6)}`;
      finalWorkerName = externalWorkerName.trim();
    }

    // Auto-incorporate item if user selected a product in dropdown but didn't click "Agregar al Acta"
    let deliveryItems = [...items];
    if (deliveryItems.length === 0 && itemProductId) {
      const prod = products.find(p => p.id === itemProductId);
      if (prod) {
        deliveryItems.push({
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku || '',
          quantity: itemQuantity > 0 ? itemQuantity : 1,
          size: itemSize ? itemSize.trim() : '',
          condition: itemCondition || 'nuevo'
        });
        setItems(deliveryItems);
      }
    }

    if (deliveryItems.length === 0) {
      const msg = 'Debes seleccionar y agregar al menos un ítem de EPP a la lista de entrega.';
      setFormError(msg);
      alert(msg);
      formContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedWh = warehouses.find(w => w.id === selectedWarehouseId);
      const whName = selectedWh ? selectedWh.name : 'Bodega';

      // 1. Process signature data URL if present
      let signatureUrl = '';
      if (hasSignature && canvasRef.current) {
        signatureUrl = canvasRef.current.toDataURL('image/png');
      }

      // 2. Photos: use lightweight optimized data URLs directly (instant save, zero storage hanging)
      const photoEquipmentUrl = photoEquipmentPreview || '';
      const photoWorkerUrl = photoWorkerPreview || '';

      // 3. Generate Request Code (SOL-EPP-YYYY-XXXX)
      const currentYear = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const requestCode = `SOL-EPP-${currentYear}-${randomSuffix}`;
      const docId = `req-epp-${Date.now()}`;

      const cleanItems = deliveryItems.map(it => ({
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku || '',
        quantity: Number(it.quantity) || 1,
        size: it.size ? String(it.size).trim() : '',
        condition: it.condition || 'nuevo'
      }));

      const newRequestRaw: InventoryUpdateRequest = {
        id: docId,
        requestCode,
        warehouseId: selectedWarehouseId,
        warehouseName: whName,
        workerId: finalWorkerId,
        workerName: finalWorkerName,
        workerIdNumber: workerIdNumber.trim() || '',
        workerRole: workerRole.trim() || '',
        deliveredById: currentMember?.id || 'admin',
        deliveredByName: currentMember ? currentMember.name : 'Administrador',
        deliveryDate: deliveryDate || new Date().toISOString(),
        deliveryReason,
        items: cleanItems,
        photoEquipmentUrl: photoEquipmentUrl || '',
        photoWorkerUrl: photoWorkerUrl || '',
        signatureUrl: signatureUrl || '',
        status: 'pendiente', // Explicit 2-step requirement: must be approved before stock deduction
        notes: notes.trim() || '',
        source: 'web',
        createdAt: new Date().toISOString()
      };

      const newRequest = sanitizeForFirestore(newRequestRaw);

      // 4. Save to Firestore
      await setDoc(doc(db, 'inventory_update_requests', docId), newRequest);

      // 5. Notify parent & reset
      onSuccess(newRequest as InventoryUpdateRequest);
      onClose();
      alert(`¡Solicitud de Entrega ${requestCode} registrada con éxito!\n\nSe encuentra en estado PENDIENTE en la bandeja de "Entrega de EPP". El custodio o administrador deberá revisarla y presionar "Aprobar y Descontar de Bodega" para actualizar el stock físico e imprimir el acta oficial.`);
    } catch (err: any) {
      console.error('Error saving EPP delivery request:', err);
      const errMsg = 'Hubo un error al guardar la entrega: ' + (err.message || String(err));
      setFormError(errMsg);
      alert(errMsg);
      formContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/25">
              <HardHat size={22} />
            </div>
            <div>
              <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                Nueva Solicitud / Entrega de EPP
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Web ERP
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registra la dotación o reposición de equipos. Pasará a la bandeja para aprobación y descuento de stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form ref={formContainerRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Error Banner */}
          {formError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* SECTION 1: Warehouse & Worker Information */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Building2 size={16} className="text-emerald-600" />
              1. Datos de Origen y Colaborador Receptor
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Warehouse selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bodega de Origen *
                </label>
                <select
                  required
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {activeWarehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha y Hora de Entrega *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Delivery Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo de Entrega *
                </label>
                <select
                  required
                  value={deliveryReason}
                  onChange={(e: any) => setDeliveryReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="dotacion_inicial">Dotación Inicial</option>
                  <option value="reposicion_desgaste">Reposición por Desgaste Normal</option>
                  <option value="perdida_dano">Reposición por Pérdida / Daño</option>
                  <option value="prestamo_temporal">Préstamo Temporal / Por Proyecto</option>
                </select>
              </div>
            </div>

            {/* Worker Selection Tabs: Member or External */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Tipo de Receptor:</span>
                <button
                  type="button"
                  onClick={() => setWorkerMode('member')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    workerMode === 'member'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Colaborador Novagreen
                </button>
                <button
                  type="button"
                  onClick={() => setWorkerMode('external')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    workerMode === 'external'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Externo / Contratista
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {workerMode === 'member' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Seleccionar Colaborador *
                    </label>
                    <select
                      required
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Seleccionar de la nómina --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.identificationId ? `(${m.identificationId})` : ''} - {m.role}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Juan Carlos Pérez"
                      value={externalWorkerName}
                      onChange={(e) => setExternalWorkerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Cédula / Identificación
                  </label>
                  <input
                    type="text"
                    placeholder="17xxxxxxxx"
                    value={workerIdNumber}
                    onChange={(e) => setWorkerIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Cargo / Puesto de Trabajo
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Técnico de Campo / Inspector"
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Select EPP Items */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <HardHat size={16} className="text-emerald-600" />
                2. Equipos de Protección a Entregar
              </h3>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {items.length} {items.length === 1 ? 'ítem agregado' : 'ítems agregados'}
              </span>
            </div>

            {/* Item Selector Form Row */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Product Dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Producto EPP
                  </label>
                  <select
                    value={itemProductId}
                    onChange={(e) => {
                      setItemProductId(e.target.value);
                      setItemSize('');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccionar EPP del Catálogo --</option>
                    {eppProducts.map(p => {
                      const st = currentWarehouseStock.find(s => s.productId === p.id);
                      const stockQty = st ? st.currentStock : 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''} - Stock en bodega: {stockQty} u.
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Size Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Talla / Medida
                  </label>
                  {availableSizes.length > 0 ? (
                    <select
                      value={itemSize}
                      onChange={(e) => setItemSize(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Talla Estándar / Única</option>
                      {availableSizes.map(sz => (
                        <option key={sz} value={sz}>
                          Talla {sz} ({stockForSelectedProduct?.sizesStock?.[sz] || 0} disponibles)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="ej. M, L, 41, Única"
                      value={itemSize}
                      onChange={(e) => setItemSize(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Cantidad a Entregar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxAvailableStock > 0 ? maxAvailableStock : 999}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Condition & Add Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[10px] font-bold text-slate-500">Condición:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="condition"
                      checked={itemCondition === 'nuevo'}
                      onChange={() => setItemCondition('nuevo')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Nuevo</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="condition"
                      checked={itemCondition === 'reacondicionado'}
                      onChange={() => setItemCondition('reacondicionado')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Reacondicionado</span>
                  </label>

                  {itemProductId && (
                    <span className={`text-[11px] font-bold ml-2 ${maxAvailableStock > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      Stock en bodega: {maxAvailableStock} u.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!itemProductId}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus size={14} />
                  Agregar al Acta
                </button>
              </div>
            </div>

            {/* Added Items Table */}
            {items.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center">Talla</th>
                      <th className="py-2.5 px-3 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-right">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {it.productName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {it.productSku || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {it.size || 'Única'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-center capitalize text-[11px] text-slate-600 dark:text-slate-400">
                          {it.condition || 'nuevo'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Eliminar ítem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={3} className="py-2.5 px-3 text-right text-[10px] uppercase text-slate-500">
                        Total Unidades a Entregar:
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                        {items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-center py-4 text-xs text-slate-400 italic">
                Aún no has agregado ningún producto EPP a la lista.
              </p>
            )}
          </div>

          {/* SECTION 3: Optional Evidences & Webcam */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Camera size={16} className="text-emerald-600" />
                3. Evidencias Fotográficas (Opcionales en PC / Laptop)
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                Opcional desde computadora
              </span>
            </div>

            {/* Webcam Stream Modal/Drawer if active */}
            {isCameraOpen && (
              <div className="p-4 bg-black rounded-2xl text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-2">
                    <Video size={16} className="text-red-500 animate-pulse" />
                    Cámara Web Activa - Capturar {isCameraOpen === 'equipment' ? 'Foto del EPP' : 'Foto del Colaborador'}
                  </span>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-1 hover:bg-white/20 rounded-lg text-slate-300"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="relative aspect-video max-h-56 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => capturePhoto(isCameraOpen)}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    <Camera size={16} /> Tomar Fotografía
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo 1: Equipment */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Foto 1: Equipos EPP Entregados
                </span>
                {photoEquipmentPreview ? (
                  <div className="relative h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <img
                      src={photoEquipmentPreview}
                      alt="Foto EPP"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoEquipmentFile(null);
                        setPhotoEquipmentPreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-lg"
                      title="Quitar foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-2 gap-2">
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer">
                        <Upload size={12} /> Subir Archivo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect('equipment', e.target.files?.[0] || null)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => startCamera('equipment')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold"
                      >
                        <Camera size={12} /> Cámara
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400">JPG, PNG o WEBP</span>
                  </div>
                )}
              </div>

              {/* Photo 2: Worker */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Foto 2: Colaborador con el EPP
                </span>
                {photoWorkerPreview ? (
                  <div className="relative h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <img
                      src={photoWorkerPreview}
                      alt="Foto Colaborador"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoWorkerFile(null);
                        setPhotoWorkerPreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-lg"
                      title="Quitar foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-2 gap-2">
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer">
                        <Upload size={12} /> Subir Archivo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect('worker', e.target.files?.[0] || null)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => startCamera('worker')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold"
                      >
                        <Camera size={12} /> Cámara
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400">JPG, PNG o WEBP</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Digital Signature Canvas */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <PenTool size={16} className="text-emerald-600" />
                4. Firma Digital del Colaborador Receptor
              </h3>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all"
                >
                  <RotateCcw size={12} /> Limpiar Firma
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              El colaborador puede firmar en este recuadro usando el ratón, touchpad, lápiz óptico o pantalla táctil.
            </p>

            <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={700}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 cursor-crosshair touch-none"
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 dark:text-slate-400 text-xs font-medium">
                  ✍️ Firmar aquí con el ratón o pantalla táctil
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: Observations / Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Observaciones o Condiciones Especiales
            </label>
            <textarea
              rows={2}
              placeholder="ej. Se entrega con inducción de ajuste de arnés. Se programa revisión en 6 meses..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {formError ? (
              <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5 bg-red-50 dark:bg-red-950/60 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60">
                <AlertCircle size={14} className="shrink-0" />
                {formError}
              </span>
            ) : (
              <span>El stock físico se descontará al ser <strong>aprobada</strong> en la bandeja de inventario.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
            >
              <FileCheck size={16} />
              {isSubmitting ? 'Guardando Solicitud...' : 'Generar Solicitud de Entrega'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
