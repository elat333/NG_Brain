import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Edit,
  Trash2,
  Package,
  Building2,
  DollarSign,
  FileText,
  Tag,
  Globe,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  ExternalLink,
  Layers,
  Calendar,
  Sparkles,
  ChevronRight,
  ListPlus
} from 'lucide-react';
import { ImportProduct, ImportSupplier, ImportProforma, Company } from '../../types';

interface ImportProduct360ViewProps {
  product: ImportProduct | null;
  isCreating?: boolean;
  suppliers: ImportSupplier[];
  companies?: Company[];
  proformas?: ImportProforma[];
  onBack: () => void;
  onSave: (productData: Partial<ImportProduct>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onNavigateToSupplier?: (supplierId: string) => void;
  onNavigateToProforma?: (proforma: ImportProforma) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

type TabType = 'general' | 'pricing' | 'specs' | 'supplier' | 'proformas' | 'notes';

export const ImportProduct360View: React.FC<ImportProduct360ViewProps> = ({
  product,
  isCreating = false,
  suppliers = [],
  companies = [],
  proformas = [],
  onBack,
  onSave,
  onDelete,
  onNavigateToSupplier,
  onNavigateToProforma,
  canEdit = true,
  canDelete = true
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(isCreating);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form States
  const [code, setCode] = useState<string>(product?.code || `IMP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState<string>(product?.name || '');
  const [description, setDescription] = useState<string>(product?.description || '');
  const [category, setCategory] = useState<string>(product?.category || 'General');
  const [supplierId, setSupplierId] = useState<string>(product?.supplierId || suppliers[0]?.id || '');
  const [unit, setUnit] = useState<string>(product?.unit || 'Unidad');
  const [unitPrice, setUnitPrice] = useState<number>(product?.unitPrice || 0);
  const [currency, setCurrency] = useState<string>(product?.currency || 'USD');
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(product?.minOrderQuantity || 1);
  const [hsCode, setHsCode] = useState<string>(product?.hsCode || '');
  const [originCountry, setOriginCountry] = useState<string>(product?.originCountry || '');
  const [status, setStatus] = useState<'activo' | 'inactivo' | 'en_revision'>(product?.status || 'activo');
  const [specifications, setSpecifications] = useState<Record<string, string>>(product?.specifications || {});

  // Spec Form Inputs
  const [newSpecKey, setNewSpecKey] = useState<string>('');
  const [newSpecValue, setNewSpecValue] = useState<string>('');

  // Matched supplier
  const selectedSupplierObj = suppliers.find(s => s.id === supplierId);

  // Proformas containing this product
  const relatedProformas = proformas.filter(prof => 
    prof.items?.some(item => item.code === (product?.code || code) || item.name.toLowerCase().includes((product?.name || name).toLowerCase()))
  );

  const handleAddSpecification = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;
    setSpecifications(prev => ({
      ...prev,
      [newSpecKey.trim()]: newSpecValue.trim()
    }));
    setNewSpecKey('');
    setNewSpecValue('');
  };

  const handleRemoveSpecification = (key: string) => {
    setSpecifications(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      setErrorMsg('El código y el nombre del producto son obligatorios.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const supplierName = selectedSupplierObj ? selectedSupplierObj.companyName : (product?.supplierName || 'Proveedor Desconocido');

      const payload: Partial<ImportProduct> = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        supplierId: supplierId || '',
        supplierName: supplierName,
        unit: unit.trim() || 'Unidad',
        unitPrice: Number(unitPrice) || 0,
        currency: currency || 'USD',
        minOrderQuantity: Number(minOrderQuantity) || 1,
        hsCode: hsCode.trim(),
        originCountry: originCountry.trim() || (selectedSupplierObj ? selectedSupplierObj.country : 'Internacional'),
        specifications: specifications,
        status: status,
        updatedAt: new Date().toISOString()
      };

      await onSave(payload);
      if (isCreating) {
        onBack();
      } else {
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocurrió un error al guardar el producto arancelario.');
    } finally {
      setIsSaving(false);
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
            <span>Volver al Catálogo</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="space-y-0.5 truncate">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Importaciones</span>
              <span>/</span>
              <span>Catálogo Arancelario</span>
              <span>/</span>
              <span className="text-blue-600 font-mono font-bold">{code || 'NUEVO'}</span>
            </div>
            <h1 className="text-lg font-black text-slate-900 truncate tracking-tight">
              {isCreating ? 'Nuevo Producto Arancelario' : (name || 'Ficha Técnica de Importación')}
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
                <span>{isSaving ? 'Guardando...' : 'Guardar Ficha'}</span>
              </button>
            </>
          )}

          {!isCreating && canDelete && onDelete && product && (
            <button
              onClick={async () => {
                if (window.confirm(`¿Desea eliminar el producto "${product.name}" de la base de importaciones?`)) {
                  await onDelete(product.id);
                  onBack();
                }
              }}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all cursor-pointer"
              title="Eliminar Producto"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ==================== TRYTON SMART RELATIONAL BUTTONS ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Proveedor Internacional */}
        <div 
          onClick={() => {
            if (supplierId && onNavigateToSupplier) {
              onNavigateToSupplier(supplierId);
            }
          }}
          className={`bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between ${
            supplierId && onNavigateToSupplier ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group' : ''
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Proveedor</span>
            <p className="text-xs font-black text-slate-800 truncate max-w-[150px] group-hover:text-blue-600">
              {selectedSupplierObj ? selectedSupplierObj.companyName : (product?.supplierName || 'Sin Asignar')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
        </div>

        {/* Precio FOB / Unitario */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Precio Unitario</span>
            <p className="text-sm font-black text-slate-900">
              ${unitPrice.toFixed(2)} <span className="text-xs text-slate-400 font-bold">{currency}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
        </div>

        {/* Partida Arancelaria HS Code */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Partida HS</span>
            <p className="text-xs font-mono font-black text-slate-800">
              {hsCode || 'Sin partida'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
        </div>

        {/* Estado del Producto */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Estado</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              status === 'activo'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : status === 'en_revision'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'activo' ? 'bg-emerald-500' : status === 'en_revision' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              {status === 'activo' ? 'Activo' : status === 'en_revision' ? 'Revisión' : 'Inactivo'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
            <Package size={18} />
          </div>
        </div>
      </div>

      {/* ==================== TRYTON NOTEBOOK TABS ==================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-2 overflow-x-auto custom-scrollbar bg-slate-50/50">
          {[
            { id: 'general', label: '1. Ficha General & Arancelaria', icon: <Package size={15} /> },
            { id: 'pricing', label: '2. Precios & Adquisición', icon: <DollarSign size={15} /> },
            { id: 'specs', label: `3. Atributos Técnicos (${Object.keys(specifications).length})`, icon: <Layers size={15} /> },
            { id: 'supplier', label: '4. Proveedor & Fabricante', icon: <Building2 size={15} /> },
            { id: 'proformas', label: `5. Proformas Asociadas (${relatedProformas.length})`, icon: <FileText size={15} /> },
            { id: 'notes', label: '6. Notas & Bitácora', icon: <Tag size={15} /> }
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

        {/* ==================== TAB 1: GENERAL & ARANCELARIA ==================== */}
        <div className="p-6 sm:p-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Código SKU / Importación */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Código / SKU de Importación</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="Ej: IMP-PANEL-500W"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-800">{code}</p>
                  )}
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Categoría Arancelaria</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="Ej: Energía Solar, EPP, Maquinaria..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">{category}</p>
                  )}
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Estado Operativo</label>
                  {isEditing ? (
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="activo">Activo (Disponible para proformas)</option>
                      <option value="en_revision">En Revisión Arancelaria</option>
                      <option value="inactivo">Inactivo / Descontinuado</option>
                    </select>
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 capitalize">{status}</p>
                  )}
                </div>
              </div>

              {/* Nombre del Producto */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Nombre del Producto o Insumo</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Panel Solar Monocristalino 500W High-Efficiency"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-900">{name}</p>
                )}
              </div>

              {/* Partida Arancelaria y País de Origen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Partida Arancelaria (HS Code)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={hsCode}
                      onChange={e => setHsCode(e.target.value)}
                      placeholder="Ej: 8541.40.10"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl font-mono text-xs font-bold text-slate-800">
                      {hsCode || 'No especificada'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">País de Origen</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={originCountry}
                      onChange={e => setOriginCountry(e.target.value)}
                      placeholder="Ej: China, Alemania, Estados Unidos..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">
                      {originCountry || 'No especificado'}
                    </p>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Descripción Comercial y Técnica</label>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descripción detallada del ítem de importación..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {description || 'Sin descripción registrada.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: PRECIOS & ADQUISICIÓN ==================== */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Precio Unitario */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Precio Unitario (FOB/EXW)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-900">
                      ${unitPrice.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Moneda */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Moneda</label>
                  {isEditing ? (
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">{currency}</p>
                  )}
                </div>

                {/* Unidad de Medida */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Unidad de Medida (UOM)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      placeholder="Ej: Unidad, Set, Metro, Kg, Caja"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">{unit}</p>
                  )}
                </div>

                {/* Cantidad Mínima de Pedido (MOQ) */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Pedido Mínimo (MOQ)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={minOrderQuantity}
                      onChange={e => setMinOrderQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">
                      {minOrderQuantity} {unit}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: ATRIBUTOS TÉCNICOS ==================== */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Especificaciones Dinámicas del Fabricante</h3>
                  <p className="text-xs text-slate-400">Atributos técnicos para control de calidad e importación aduanera.</p>
                </div>
              </div>

              {isEditing && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Atributo / Parámetro</label>
                    <input
                      type="text"
                      placeholder="Ej: Potencia, Voltaje, Dimensiones, Peso..."
                      value={newSpecKey}
                      onChange={e => setNewSpecKey(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Valor / Rango</label>
                    <input
                      type="text"
                      placeholder="Ej: 500W, 220V, 200x100x40 cm..."
                      value={newSpecValue}
                      onChange={e => setNewSpecValue(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSpecification}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={14} />
                    <span>Agregar</span>
                  </button>
                </div>
              )}

              {Object.keys(specifications).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <Layers size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-400 italic">No se han registrado especificaciones técnicas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(specifications).map(([k, v]) => (
                    <div key={k} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                      <div className="space-y-0.5 truncate">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">{k}</span>
                        <p className="text-xs font-black text-slate-800 truncate">{v}</p>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecification(k)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 4: PROVEEDOR & FABRICANTE ==================== */}
          {activeTab === 'supplier' && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900">Proveedor Internacional de Origen</h3>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Seleccionar Proveedor</label>
                    <select
                      value={supplierId}
                      onChange={e => setSupplierId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="">Seleccione un proveedor...</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {sup.companyName} ({sup.country})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    {selectedSupplierObj ? (
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900">{selectedSupplierObj.companyName}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            {selectedSupplierObj.country} {selectedSupplierObj.city ? `• ${selectedSupplierObj.city}` : ''} | Contacto: {selectedSupplierObj.contactPerson}
                          </p>
                          <p className="text-xs text-blue-600 font-bold">{selectedSupplierObj.contactEmail}</p>
                        </div>
                        {onNavigateToSupplier && (
                          <button
                            type="button"
                            onClick={() => onNavigateToSupplier(selectedSupplierObj.id)}
                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                          >
                            <span>Ver Ficha Proveedor</span>
                            <ExternalLink size={13} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No hay proveedor asignado.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 5: PROFORMAS ASOCIADAS ==================== */}
          {activeTab === 'proformas' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">Órdenes y Proformas de Importación Vinculadas</h3>
              {relatedProformas.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <FileText size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-400 font-medium">Este producto aún no forma parte de ninguna proforma registrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                  {relatedProformas.map(prof => (
                    <div
                      key={prof.id}
                      onClick={() => onNavigateToProforma && onNavigateToProforma(prof)}
                      className="p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-blue-700">{prof.proformaNumber}</span>
                          <span className="text-xs font-bold text-slate-600">({prof.supplierName})</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          Emisión: {prof.issueDate} | Total: ${prof.totalAmount.toLocaleString()} {prof.currency} | Incoterm: {prof.incoterm}
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-all">
                        <span>Ver Proforma</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 6: NOTAS & BITÁCORA ==================== */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Trazabilidad de Creación</span>
                <p className="text-xs text-slate-600 font-medium">
                  Fecha de Registro: {product?.createdAt ? new Date(product.createdAt).toLocaleString('es-EC') : 'Nuevo registro'}
                </p>
                {product?.updatedAt && (
                  <p className="text-xs text-slate-600 font-medium">
                    Última Modificación: {new Date(product.updatedAt).toLocaleString('es-EC')}
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

export default ImportProduct360View;
