import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Edit,
  Trash2,
  FileText,
  Building2,
  DollarSign,
  Package,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  Truck,
  RotateCcw,
  Check
} from 'lucide-react';
import { ImportProforma, ImportProformaItem, ImportSupplier, ImportProduct } from '../../types';

interface ImportProforma360ViewProps {
  proforma: ImportProforma | null;
  isCreating?: boolean;
  suppliers: ImportSupplier[];
  onBack: () => void;
  onSave: (proformaData: Partial<ImportProforma>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSyncProductsToCatalog?: (items: ImportProformaItem[], supplierObj?: ImportSupplier) => Promise<void>;
  onNavigateToSupplier?: (supplierId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

type TabType = 'header' | 'items' | 'costs' | 'sync' | 'notes';

export const ImportProforma360View: React.FC<ImportProforma360ViewProps> = ({
  proforma,
  isCreating = false,
  suppliers = [],
  onBack,
  onSave,
  onDelete,
  onSyncProductsToCatalog,
  onNavigateToSupplier,
  canEdit = true,
  canDelete = true
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(isCreating);
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Form States
  const [proformaNumber, setProformaNumber] = useState<string>(
    proforma?.proformaNumber || `PI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [supplierId, setSupplierId] = useState<string>(proforma?.supplierId || suppliers[0]?.id || '');
  const [issueDate, setIssueDate] = useState<string>(proforma?.issueDate || new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState<string>(
    proforma?.expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState<string>(proforma?.currency || 'USD');
  const [incoterm, setIncoterm] = useState<string>(proforma?.incoterm || 'FOB');
  const [status, setStatus] = useState<string>(proforma?.status || 'borrador');
  const [shippingCost, setShippingCost] = useState<number>(proforma?.shippingCost || 0);
  const [taxes, setTaxes] = useState<number>(proforma?.taxes || 0);
  const [notes, setNotes] = useState<string>(proforma?.notes || '');

  // Items State
  const [items, setItems] = useState<ImportProformaItem[]>(proforma?.items || []);

  // Matched supplier
  const selectedSupplierObj = suppliers.find(s => s.id === supplierId);

  // Calculate Subtotal and Total
  const subtotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || (Number(item.quantity) * Number(item.unitPrice)) || 0), 0);
  const totalAmount = subtotal + Number(shippingCost || 0) + Number(taxes || 0);

  const handleAddItem = () => {
    const newItem: ImportProformaItem = {
      id: `item-${Date.now()}`,
      code: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'Nuevo Artículo de Importación',
      description: '',
      category: 'General',
      quantity: 10,
      unitPrice: 100,
      totalPrice: 1000,
      unit: 'Unidad',
      hsCode: '',
      isValidated: true
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof ImportProformaItem, value: any) => {
    setItems(prev => prev.map(item => {
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

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleValidateItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isValidated: !item.isValidated };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!proformaNumber.trim()) {
      setErrorMsg('El número de proforma es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const supplierName = selectedSupplierObj ? selectedSupplierObj.companyName : (proforma?.supplierName || 'Proveedor Desconocido');

      const payload: Partial<ImportProforma> = {
        proformaNumber: proformaNumber.trim().toUpperCase(),
        supplierId: supplierId || '',
        supplierName: supplierName,
        issueDate: issueDate,
        expirationDate: expirationDate,
        currency: currency,
        subtotal: subtotal,
        shippingCost: Number(shippingCost) || 0,
        taxes: Number(taxes) || 0,
        totalAmount: totalAmount,
        incoterm: incoterm,
        status: status,
        items: items,
        notes: notes.trim(),
        createdAt: proforma?.createdAt || new Date().toISOString()
      };

      await onSave(payload);
      if (isCreating) {
        onBack();
      } else {
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocurrió un error al guardar la proforma.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!onSyncProductsToCatalog) return;
    const validatedItems = items.filter(it => it.isValidated);
    if (validatedItems.length === 0) {
      alert('No hay artículos validados para sincronizar al catálogo.');
      return;
    }

    try {
      setIsSyncing(true);
      await onSyncProductsToCatalog(validatedItems, selectedSupplierObj);
      setSyncSuccessMsg(`¡Éxito! Se han sincronizado ${validatedItems.length} artículo(s) con el catálogo general.`);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert('Error al sincronizar con el catálogo.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 max-w-7xl mx-auto w-full pb-12"
    >
      {/* ==================== TRYTON TOOLBAR & BREADCRUMBS ==================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Volver a Proformas</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="space-y-0.5 truncate">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Importaciones</span>
              <span>/</span>
              <span>Proformas & Órdenes</span>
              <span>/</span>
              <span className="text-blue-600 font-mono font-bold">{proformaNumber || 'NUEVA'}</span>
            </div>
            <h1 className="text-lg font-black text-slate-900 truncate tracking-tight">
              {isCreating ? 'Nueva Proforma de Importación' : `Proforma ${proformaNumber}`}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isEditing && canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs rounded-2xl transition-all uppercase tracking-wider cursor-pointer"
            >
              <Edit size={14} />
              <span>Editar</span>
            </button>
          )}

          {isEditing && (
            <>
              {!isCreating && (
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSaving ? 'Guardando...' : 'Guardar Proforma'}</span>
              </button>
            </>
          )}

          {!isCreating && canDelete && onDelete && proforma && (
            <button
              onClick={async () => {
                if (window.confirm(`¿Desea eliminar la proforma "${proforma.proformaNumber}"?`)) {
                  await onDelete(proforma.id);
                  onBack();
                }
              }}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all cursor-pointer"
              title="Eliminar Proforma"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ==================== TRYTON SMART RELATIONAL BUTTONS ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Proveedor */}
        <div 
          onClick={() => {
            if (supplierId && onNavigateToSupplier) {
              onNavigateToSupplier(supplierId);
            }
          }}
          className={`bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between ${
            supplierId && onNavigateToSupplier ? 'cursor-pointer hover:border-blue-400 transition-all group' : ''
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Proveedor</span>
            <p className="text-xs font-black text-slate-800 truncate max-w-[130px] group-hover:text-blue-600">
              {selectedSupplierObj ? selectedSupplierObj.companyName : (proforma?.supplierName || 'Sin Asignar')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
        </div>

        {/* Total Proforma */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Liquidado</span>
            <p className="text-sm font-black text-slate-900">
              ${totalAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-bold">{currency}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
        </div>

        {/* Incoterm */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Incoterm</span>
            <p className="text-xs font-black text-slate-800 font-mono">
              {incoterm}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
        </div>

        {/* Estado Máquina de Estados */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Estado Operativo</span>
            {isEditing ? (
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="text-[11px] font-black uppercase bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5"
              >
                <option value="borrador">Borrador</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="embarcada">Embarcada</option>
                <option value="recibida">Recibida</option>
                <option value="rechazada">Rechazada</option>
              </select>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                status === 'aprobada' || status === 'recibida'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status === 'embarcada' || status === 'pendiente'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : status === 'borrador'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {status}
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
        </div>
      </div>

      {/* ==================== TRYTON NOTEBOOK TABS ==================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-2 overflow-x-auto custom-scrollbar bg-slate-50/50">
          {[
            { id: 'items', label: `1. Desglose de Ítems (${items.length})`, icon: <Package size={15} /> },
            { id: 'costs', label: '2. Liquidación & Flete', icon: <DollarSign size={15} /> },
            { id: 'header', label: '3. Cabecera & Logística', icon: <Truck size={15} /> },
            { id: 'sync', label: '4. Sincronizar Catálogo', icon: <Sparkles size={15} /> },
            { id: 'notes', label: '5. Notas & Embarque', icon: <FileText size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-2xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          
          {/* ==================== TAB 1: DESGLOSE DE ÍTEMS ==================== */}
          {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Líneas de la Proforma de Importación</h3>
                  <p className="text-xs text-slate-400">Artículos, cantidades, precios unitarios y partidas arancelarias.</p>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all uppercase tracking-wider"
                  >
                    <Plus size={14} />
                    <span>Agregar Artículo</span>
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <Package size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-400 font-medium">No hay artículos en esta proforma.</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-4 py-3 w-10 text-center">Val.</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Descripción / Artículo</th>
                        <th className="px-4 py-3">Partida HS</th>
                        <th className="px-4 py-3 text-right">Cant.</th>
                        <th className="px-4 py-3 text-right">Precio Unit.</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                        {isEditing && <th className="px-4 py-3 text-right w-12">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          
                          {/* Validado Checkbox */}
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleValidateItem(item.id)}
                              className={`w-5 h-5 rounded-md flex items-center justify-center mx-auto transition-all ${
                                item.isValidated ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 border border-slate-300'
                              }`}
                            >
                              <Check size={12} />
                            </button>
                          </td>

                          {/* Código SKU */}
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.code}
                                onChange={e => handleUpdateItem(item.id, 'code', e.target.value.toUpperCase())}
                                className="w-28 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold"
                              />
                            ) : (
                              <span>{item.code}</span>
                            )}
                          </td>

                          {/* Nombre */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                              />
                            ) : (
                              <p className="font-bold text-slate-900">{item.name}</p>
                            )}
                          </td>

                          {/* Partida HS */}
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.hsCode || ''}
                                onChange={e => handleUpdateItem(item.id, 'hsCode', e.target.value)}
                                placeholder="8541.40.10"
                                className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                              />
                            ) : (
                              <span>{item.hsCode || '—'}</span>
                            )}
                          </td>

                          {/* Cantidad */}
                          <td className="px-4 py-3 text-right font-black text-slate-800">
                            {isEditing ? (
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-black text-right"
                              />
                            ) : (
                              <span>{item.quantity} {item.unit || 'u'}</span>
                            )}
                          </td>

                          {/* Precio Unitario */}
                          <td className="px-4 py-3 text-right font-bold text-slate-700">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-right"
                              />
                            ) : (
                              <span>${Number(item.unitPrice).toFixed(2)}</span>
                            )}
                          </td>

                          {/* Total */}
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            ${(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Eliminar fila */}
                          {isEditing && (
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
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
              )}
            </div>
          )}

          {/* ==================== TAB 2: LIQUIDACIÓN & FLETE ==================== */}
          {activeTab === 'costs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Subtotal */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Subtotal FOB/EXW</span>
                  <p className="text-xl font-black text-slate-900">${subtotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })} {currency}</p>
                </div>

                {/* Flete Internacional */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Costo de Flete Internacional</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={shippingCost}
                      onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black"
                    />
                  ) : (
                    <p className="text-xl font-black text-slate-900">${shippingCost.toLocaleString('es-EC', { minimumFractionDigits: 2 })} {currency}</p>
                  )}
                </div>

                {/* Impuestos / Seguro */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Aranceles / Impuestos Estimados</span>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={taxes}
                      onChange={e => setTaxes(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black"
                    />
                  ) : (
                    <p className="text-xl font-black text-slate-900">${taxes.toLocaleString('es-EC', { minimumFractionDigits: 2 })} {currency}</p>
                  )}
                </div>
              </div>

              {/* Total General Consolidado */}
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Total Liquidado de la Proforma</span>
                  <p className="text-2xl font-black text-emerald-950">${totalAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })} {currency}</p>
                </div>
                <div className="px-4 py-2 bg-emerald-600 text-white font-mono font-black text-xs rounded-2xl">
                  {incoterm}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: CABECERA & LOGÍSTICA ==================== */}
          {activeTab === 'header' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Proforma Number */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Número de Proforma</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={proformaNumber}
                      onChange={e => setProformaNumber(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-800">{proformaNumber}</p>
                  )}
                </div>

                {/* Proveedor */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Proveedor Internacional</label>
                  {isEditing ? (
                    <select
                      value={supplierId}
                      onChange={e => setSupplierId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.companyName} ({s.country})</option>
                      ))}
                    </select>
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">
                      {selectedSupplierObj ? selectedSupplierObj.companyName : (proforma?.supplierName || 'Sin Asignar')}
                    </p>
                  )}
                </div>

                {/* Incoterm */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Incoterm</label>
                  {isEditing ? (
                    <select
                      value={incoterm}
                      onChange={e => setIncoterm(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="FOB">FOB (Free on Board)</option>
                      <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                      <option value="EXW">EXW (Ex Works / En Fábrica)</option>
                      <option value="DDP">DDP (Delivered Duty Paid)</option>
                      <option value="CFR">CFR (Cost & Freight)</option>
                    </select>
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 font-mono">{incoterm}</p>
                  )}
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Fecha de Emisión</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">{issueDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Fecha de Vencimiento / Validez</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={e => setExpirationDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">{expirationDate}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: SINCRONIZACIÓN AL CATÁLOGO ==================== */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50/70 rounded-3xl border border-blue-200 space-y-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Sparkles size={20} />
                  <h3 className="text-sm font-black">Acción Inteligente: Sincronizar Ítems al Catálogo</h3>
                </div>
                <p className="text-xs text-blue-900/80 leading-relaxed font-medium">
                  Esta acción tomará los artículos que tengan la casilla de validación activa ({items.filter(it => it.isValidated).length} de {items.length}) y creará o actualizará sus fichas técnicas en la base de datos de <strong>Productos de Importación</strong> con los precios y partidas arancelarias de esta proforma.
                </p>

                {syncSuccessMsg && (
                  <div className="p-4 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{syncSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={isSyncing || items.filter(it => it.isValidated).length === 0}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-md shadow-blue-600/20 uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Ejecutar Sincronización al Catálogo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================== TAB 5: NOTAS & EMBARQUE ==================== */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Notas de Embarque e Instrucciones Aduaneras</label>
                {isEditing ? (
                  <textarea
                    rows={5}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Instrucciones para agente de aduanas, puerto de embarque, contenedor..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {notes || 'Sin notas registradas.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ImportProforma360View;
