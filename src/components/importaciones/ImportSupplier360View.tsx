import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Edit,
  Trash2,
  Building2,
  Globe,
  Mail,
  Phone,
  User,
  Star,
  Package,
  FileText,
  DollarSign,
  Tag,
  ExternalLink,
  ChevronRight,
  Plus,
  AlertCircle,
  MapPin,
  CreditCard
} from 'lucide-react';
import { ImportSupplier, ImportProduct, ImportProforma, Company } from '../../types';

interface ImportSupplier360ViewProps {
  supplier: ImportSupplier | null;
  isCreating?: boolean;
  companies?: Company[];
  products?: ImportProduct[];
  proformas?: ImportProforma[];
  onBack: () => void;
  onSave: (supplierData: Partial<ImportSupplier>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onNavigateToProduct?: (product: ImportProduct) => void;
  onNavigateToProforma?: (proforma: ImportProforma) => void;
  onNavigateToCompany?: (companyId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

type TabType = 'general' | 'contact' | 'commercial' | 'products' | 'proformas' | 'notes';

export const ImportSupplier360View: React.FC<ImportSupplier360ViewProps> = ({
  supplier,
  isCreating = false,
  companies = [],
  products = [],
  proformas = [],
  onBack,
  onSave,
  onDelete,
  onNavigateToProduct,
  onNavigateToProforma,
  onNavigateToCompany,
  canEdit = true,
  canDelete = true
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(isCreating);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form States
  const [code, setCode] = useState<string>(supplier?.code || `PROV-${Math.floor(100 + Math.random() * 900)}`);
  const [companyName, setCompanyName] = useState<string>(supplier?.companyName || '');
  const [companyId, setCompanyId] = useState<string>(supplier?.companyId || '');
  const [contactPerson, setContactPerson] = useState<string>(supplier?.contactPerson || '');
  const [contactEmail, setContactEmail] = useState<string>(supplier?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState<string>(supplier?.contactPhone || '');
  const [country, setCountry] = useState<string>(supplier?.country || 'China');
  const [city, setCity] = useState<string>(supplier?.city || '');
  const [paymentTerms, setPaymentTerms] = useState<string>(supplier?.paymentTerms || '30% TT Adelantado, 70% contra B/L');
  const [rating, setRating] = useState<number>(supplier?.rating || 5);
  const [notes, setNotes] = useState<string>(supplier?.notes || '');

  // Supplied Products & Proformas
  const suppliedProducts = products.filter(p => p.supplierId === supplier?.id || (supplier?.companyName && p.supplierName?.toLowerCase() === supplier.companyName.toLowerCase()));
  const supplierProformas = proformas.filter(p => p.supplierId === supplier?.id || (supplier?.companyName && p.supplierName?.toLowerCase() === supplier.companyName.toLowerCase()));

  const matchedDirectoryCompany = companies.find(c => c.id === companyId || (supplier?.companyName && c.name.toLowerCase() === supplier.companyName.toLowerCase()));

  const handleSave = async () => {
    if (!companyName.trim()) {
      setErrorMsg('El nombre de la empresa proveedora es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const payload: Partial<ImportSupplier> = {
        code: code.trim().toUpperCase(),
        companyName: companyName.trim(),
        companyId: companyId || '',
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        country: country.trim() || 'Internacional',
        city: city.trim(),
        paymentTerms: paymentTerms.trim(),
        rating: Number(rating) || 5,
        notes: notes.trim(),
        createdAt: supplier?.createdAt || new Date().toISOString()
      };

      await onSave(payload);
      if (isCreating) {
        onBack();
      } else {
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocurrió un error al guardar el proveedor internacional.');
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
            <span>Volver a Proveedores</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="space-y-0.5 truncate">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Importaciones</span>
              <span>/</span>
              <span>Proveedores Internacionales</span>
              <span>/</span>
              <span className="text-blue-600 font-mono font-bold">{code || 'NUEVO'}</span>
            </div>
            <h1 className="text-lg font-black text-slate-900 truncate tracking-tight">
              {isCreating ? 'Nuevo Proveedor Internacional' : (companyName || 'Ficha de Proveedor')}
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
                <span>{isSaving ? 'Guardando...' : 'Guardar Proveedor'}</span>
              </button>
            </>
          )}

          {!isCreating && canDelete && onDelete && supplier && (
            <button
              onClick={async () => {
                if (window.confirm(`¿Desea eliminar el proveedor "${supplier.companyName}"?`)) {
                  await onDelete(supplier.id);
                  onBack();
                }
              }}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all cursor-pointer"
              title="Eliminar Proveedor"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ==================== TRYTON SMART RELATIONAL BUTTONS ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Calificación / Rating */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Calificación</span>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                />
              ))}
              <span className="text-xs font-black text-slate-700 ml-1">({rating}/5)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star size={18} className="fill-amber-500" />
          </div>
        </div>

        {/* Productos en Catálogo */}
        <div 
          onClick={() => setActiveTab('products')}
          className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Catálogo Suministrado</span>
            <p className="text-sm font-black text-slate-900 group-hover:text-blue-600">
              {suppliedProducts.length} <span className="text-xs text-slate-400 font-bold">ítems</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={18} />
          </div>
        </div>

        {/* Proformas Registradas */}
        <div 
          onClick={() => setActiveTab('proformas')}
          className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Proformas Emitidas</span>
            <p className="text-sm font-black text-slate-900 group-hover:text-purple-600">
              {supplierProformas.length} <span className="text-xs text-slate-400 font-bold">órdenes</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
        </div>

        {/* País / Ubicación */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">País de Fábrica</span>
            <p className="text-xs font-black text-slate-800 truncate max-w-[130px]">
              {country} {city ? `(${city})` : ''}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Globe size={18} />
          </div>
        </div>
      </div>

      {/* ==================== TRYTON NOTEBOOK TABS ==================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-2 overflow-x-auto custom-scrollbar bg-slate-50/50">
          {[
            { id: 'general', label: '1. Datos de Empresa', icon: <Building2 size={15} /> },
            { id: 'contact', label: '2. Contacto Comercial', icon: <User size={15} /> },
            { id: 'commercial', label: '3. Condiciones Comerciales', icon: <CreditCard size={15} /> },
            { id: 'products', label: `4. Catálogo Suministrado (${suppliedProducts.length})`, icon: <Package size={15} /> },
            { id: 'proformas', label: `5. Historial de Proformas (${supplierProformas.length})`, icon: <FileText size={15} /> },
            { id: 'notes', label: '6. Notas & Homologación', icon: <Tag size={15} /> }
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
          
          {/* ==================== TAB 1: DATOS DE EMPRESA ==================== */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Código */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Código de Proveedor</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="Ej: PROV-CN-001"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-800">{code}</p>
                  )}
                </div>

                {/* País */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">País de Origen</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      placeholder="Ej: China, Alemania, Estados Unidos..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">{country}</p>
                  )}
                </div>

                {/* Ciudad / Estado */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Ciudad / Provincia</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Ej: Wuxi, Jiangsu / Berlín..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">{city || 'No especificada'}</p>
                  )}
                </div>
              </div>

              {/* Nombre de la Empresa */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Razón Social / Nombre Comercial de la Fábrica</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ej: Suntech Power Overseas Ltd."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-900">{companyName}</p>
                )}
              </div>

              {/* Calificación Rating */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Calificación de Confiabilidad</label>
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setRating(st)}
                        className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all ${
                          rating >= st ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <Star size={16} className={rating >= st ? 'fill-amber-400' : ''} />
                        <span className="text-xs font-black">{st}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-500 px-4 py-2 bg-slate-50 rounded-xl w-fit">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                      />
                    ))}
                    <span className="text-xs font-black text-slate-700 ml-2">{rating} de 5 estrellas</span>
                  </div>
                )}
              </div>

              {/* Vínculo con el Directorio General */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600" />
                    <span className="text-xs font-black text-slate-800 uppercase">Vinculación con Directorio de Empresas</span>
                  </div>
                </div>

                {isEditing ? (
                  <select
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">Sin vinculación a Directorio (Proveedor independiente)</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.ruc ? `(RUC: ${c.ruc})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    {matchedDirectoryCompany ? (
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                        <div>
                          <p className="text-xs font-black text-slate-900">{matchedDirectoryCompany.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{matchedDirectoryCompany.ruc || 'Empresa Registrada en Directorio'}</p>
                        </div>
                        {onNavigateToCompany && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCompany(matchedDirectoryCompany.id)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all"
                          >
                            <span>Ver en Directorio</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No vinculado a una empresa del Directorio.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: CONTACTO COMERCIAL ==================== */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Persona de Contacto */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Persona de Contacto / Sales Manager</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={e => setContactPerson(e.target.value)}
                      placeholder="Ej: Chen Wei (International Sales Manager)"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">
                      {contactPerson || 'No asignada'}
                    </p>
                  )}
                </div>

                {/* Email Comercial */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Email Comercial / Cotizaciones</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="Ej: sales@suntech-power.cn"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                      <p className="text-xs font-bold text-blue-600">{contactEmail || 'No registrado'}</p>
                      {contactEmail && (
                        <a href={`mailto:${contactEmail}`} className="text-slate-400 hover:text-blue-600">
                          <Mail size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Teléfono / WhatsApp */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Teléfono / WhatsApp Internacional</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="Ej: +86 510 8531 8888"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">{contactPhone || 'No registrado'}</p>
                      {contactPhone && (
                        <a href={`tel:${contactPhone}`} className="text-slate-400 hover:text-emerald-600">
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: CONDICIONES COMERCIALES ==================== */}
          {activeTab === 'commercial' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Términos de Pago Habituales</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    placeholder="Ej: 30% TT Adelantado, 70% contra B/L o LC a la vista 100%"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                ) : (
                  <p className="px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-800">
                    {paymentTerms || 'No especificados'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: CATÁLOGO SUMINISTRADO ==================== */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Productos y Artículos Suministrados</h3>
                  <p className="text-xs text-slate-400">Listado de ítems del catálogo que provienen de este fabricante.</p>
                </div>
              </div>

              {suppliedProducts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <Package size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-400 font-medium">No hay productos vinculados a este proveedor aún.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                  {suppliedProducts.map(prod => (
                    <div
                      key={prod.id}
                      onClick={() => onNavigateToProduct && onNavigateToProduct(prod)}
                      className="p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-blue-700">{prod.code}</span>
                          <span className="text-xs font-black text-slate-900">{prod.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          Categoría: {prod.category} | Partida HS: {prod.hsCode || 'N/A'} | Precio Unitario: ${prod.unitPrice.toFixed(2)} {prod.currency}
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-all">
                        <span>Ver Ficha</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 5: HISTORIAL DE PROFORMAS ==================== */}
          {activeTab === 'proformas' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">Historial de Órdenes y Proformas Emitidas</h3>
              {supplierProformas.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <FileText size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-400 font-medium">No se han registrado proformas para este proveedor.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                  {supplierProformas.map(prof => (
                    <div
                      key={prof.id}
                      onClick={() => onNavigateToProforma && onNavigateToProforma(prof)}
                      className="p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-blue-700">{prof.proformaNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            prof.status === 'aprobada' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {prof.status}
                          </span>
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

          {/* ==================== TAB 6: NOTAS & HOMOLOGACIÓN ==================== */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Notas de Auditoría y Homologación</label>
                {isEditing ? (
                  <textarea
                    rows={5}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Observaciones de calidad, certificaciones CE/TUV, historial de cumplimiento..."
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

export default ImportSupplier360View;
