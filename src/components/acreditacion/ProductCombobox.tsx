import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Boxes, Sparkles } from 'lucide-react';
import { ProductItem } from '../../types';

interface ProductComboboxProps {
  products: ProductItem[];
  selectedProductId?: string;
  onSelectProduct: (product: ProductItem | null) => void;
}

export const ProductCombobox: React.FC<ProductComboboxProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter products strictly in Capacitacion & Certificacion or all eligible products
  const eligibleProducts = products.filter(p => 
    p.category === 'certificacion' || 
    p.category === 'capacitacion' || 
    !p.category
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Filter by search keywords (name, sku, subcategory, description, tags)
  const filteredProducts = eligibleProducts.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(term)))
    );
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (product: ProductItem) => {
    onSelectProduct(product);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProduct(null);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2.5 bg-slate-50 hover:bg-slate-100/80 border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all ${
          isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-500 bg-white' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
            <Boxes size={14} className="stroke-[2.2]" />
          </div>
          {selectedProduct ? (
            <div className="flex flex-col min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-900 truncate">
                  {selectedProduct.name}
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-slate-200/80 text-slate-700 font-mono">
                  {selectedProduct.sku || 'SKU'}
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-emerald-100 text-emerald-800">
                  {selectedProduct.category}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 truncate font-medium">
                {selectedProduct.subcategory || 'Producto de Catálogo'} {selectedProduct.durationOrLeadTime ? `• ${selectedProduct.durationOrLeadTime}` : ''}
              </span>
            </div>
          ) : (
            <div className="text-left">
              <span className="text-xs font-bold text-slate-500">
                Seleccionar Producto del Catálogo (Autocompletar datos)...
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">
                Vincula este curso o certificación con el catálogo base
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              title="Desvincular producto"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-slate-700' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100">
          {/* Keyword Search Input Bar */}
          <div className="p-2.5 bg-slate-50/80 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por palabras clave (ej: ISO, Alturas, SKU, Scrum)..."
                className="w-full pl-8.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{filteredProducts.length} productos encontrados</span>
              <span>Categorías: Certificación / Capacitación</span>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-100/80">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <Boxes size={20} className="mx-auto mb-1.5 opacity-40" />
                <p className="text-xs font-bold text-slate-600">No se encontraron productos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Prueba buscando con otros términos o palabras clave.
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`p-3 hover:bg-slate-50 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/60 hover:bg-emerald-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-xs font-black text-slate-900">
                          {p.name}
                        </span>
                        {p.sku && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {p.sku}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                          p.category === 'certificacion' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {p.category}
                        </span>
                      </div>

                      {p.description && (
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-1">
                          {p.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium flex-wrap">
                        {p.subcategory && <span>Sub: {p.subcategory}</span>}
                        {p.durationOrLeadTime && <span>Duración: {p.durationOrLeadTime}</span>}
                        {p.basePrice > 0 && <span className="font-mono font-bold text-slate-600">PVP Base: ${p.basePrice}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check size={11} className="stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          <Sparkles size={10} /> Enlazar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
