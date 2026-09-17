import React from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  HardHat
} from 'lucide-react';
import { InventoryUpdateRequest, ProductItem } from '../../types';

interface EppDeliveryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: InventoryUpdateRequest | null;
  products: ProductItem[];
}

export const EppDeliveryPrintModal: React.FC<EppDeliveryPrintModalProps> = ({
  isOpen,
  onClose,
  request,
  products
}) => {
  if (!isOpen || !request) return null;

  const handlePrint = () => {
    window.print();
  };

  const reasonLabels: Record<string, string> = {
    dotacion_inicial: 'Dotación Inicial',
    reposicion_desgaste: 'Reposición por Desgaste Normal',
    perdida_dano: 'Reposición por Pérdida o Daño',
    prestamo_temporal: 'Asignación / Préstamo Temporal por Proyecto'
  };

  // Helper to find product details (norms, etc.)
  const getProductNorms = (productId: string): string => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return 'Normas Técnicas Estándar';
    if (prod.certificationsOrNorms && prod.certificationsOrNorms.length > 0) {
      return prod.certificationsOrNorms.join(', ');
    }
    if (prod.technicalSpecs) return prod.technicalSpecs;
    return 'Norma de Calidad Industrial';
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      {/* Container - on screen: modern card with actions. On print: takes full page */}
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* On-screen Header Actions (hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                Acta Oficial de Entrega de EPP
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {request.requestCode} · {request.warehouseName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 active:scale-95"
            >
              <Printer size={15} />
              Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div 
            id="epp-printable-act" 
            className="bg-white max-w-3xl mx-auto p-8 sm:p-12 shadow-lg print:shadow-none print:p-6 print:max-w-full text-slate-900 border border-slate-200 print:border-none rounded-2xl print:rounded-none"
          >
            {/* Header with Novagreen branding */}
            <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-5 mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tight text-emerald-700 font-sans">
                    NOVAGREEN
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-widest">
                    SGSST
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Novagreen Energy & Technology Solutions S.A.S.
                </p>
                <p className="text-[10px] text-slate-500">
                  RUC: 1793208759001 · Gestión de Seguridad y Salud en el Trabajo
                </p>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-right">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Código de Acta</span>
                  <span className="font-mono text-xs font-black text-slate-900">{request.requestCode}</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Fecha: <strong className="text-slate-800">{new Date(request.deliveryDate || request.createdAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center my-6 space-y-1">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                Acta de Entrega - Recepción y Compromiso de Uso de Equipos de Protección Personal (EPP)
              </h1>
              <p className="text-[10px] text-slate-500 italic">
                En cumplimiento con el Reglamento de Seguridad y Salud de los Trabajadores (D.E. 2393) y el Código del Trabajo
              </p>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500">Trabajador Receptor:</span>
                <p className="font-black text-slate-900 text-sm mt-0.5">{request.workerName}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500">Cédula / Identificación:</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{request.workerIdNumber || 'No especificada'}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500">Cargo / Función:</span>
                <p className="font-medium text-slate-800 mt-0.5">{request.workerRole || 'Colaborador Operativo'}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500">Bodega Emisora:</span>
                <p className="font-medium text-slate-800 mt-0.5">{request.warehouseName}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500">Motivo de Entrega:</span>
                <p className="font-bold text-emerald-800 mt-0.5">
                  {reasonLabels[request.deliveryReason] || request.deliveryReason}
                </p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500">Responsable de Entrega:</span>
                <p className="font-medium text-slate-800 mt-0.5">{request.deliveredByName}</p>
              </div>
            </div>

            {/* Table of EPP Items */}
            <div className="mb-6">
              <h2 className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
                <HardHat size={14} className="text-emerald-600" />
                Detalle de Equipos de Protección Entregados
              </h2>
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Descripción del EPP</th>
                      <th className="py-2.5 px-3 w-24">Código / SKU</th>
                      <th className="py-2.5 px-3 w-20 text-center">Talla</th>
                      <th className="py-2.5 px-3 w-16 text-center">Cant.</th>
                      <th className="py-2.5 px-3 w-24 text-center">Estado</th>
                      <th className="py-2.5 px-3">Normas Aplicables</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {request.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {item.productSku || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {item.size || 'Única'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.condition || 'Nuevo'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-600">
                          {getProductNorms(item.productId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-500">
                        Total Unidades Entregadas:
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-700">
                        {request.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Legal / Commitment Clause */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[10px] text-slate-600 leading-relaxed mb-8">
              <strong className="block text-slate-800 uppercase font-black mb-1">
                Declaración y Compromiso del Trabajador:
              </strong>
              <p>
                Yo, <strong>{request.workerName}</strong>, con cédula de identidad N° <strong>{request.workerIdNumber || 'S/N'}</strong>, declaro que he recibido a entera satisfacción los Equipos de Protección Personal (EPP) detallados en la presente acta, los mismos que se encuentran en óptimas condiciones de uso e higiene. Declaro haber recibido capacitación e instrucciones sobre el uso adecuado, mantenimiento preventivo, limpieza y almacenamiento de los mismos. Me comprometo a utilizarlos de manera permanente y obligatoria durante mi jornada laboral en las actividades de riesgo que ejecute, y a reportar inmediatamente a mi superior o al área de Seguridad y Salud cualquier desgaste, daño o pérdida para gestionar oportunamente su sustitución o reposición.
              </p>
            </div>

            {/* Signatures Grid */}
            <div className="grid grid-cols-2 gap-8 pt-4 mb-6">
              {/* Entregado Por */}
              <div className="text-center flex flex-col justify-between">
                <div className="h-24 flex items-end justify-center pb-2">
                  <div className="text-center">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-1 opacity-70" />
                    <span className="text-[10px] font-mono text-slate-400">Entrega Autorizada y Conciliada</span>
                  </div>
                </div>
                <div className="border-t-2 border-slate-400 pt-2">
                  <p className="font-bold text-xs text-slate-900">{request.deliveredByName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Entregado Por / Custodio de Bodega</p>
                  <p className="text-[9px] text-slate-400">Novagreen SGSST</p>
                </div>
              </div>

              {/* Recibido Por (Firma Digital Capturada) */}
              <div className="text-center flex flex-col justify-between">
                <div className="h-24 flex items-center justify-center pb-2">
                  {request.signatureUrl ? (
                    <img 
                      src={request.signatureUrl} 
                      alt="Firma del Trabajador" 
                      className="max-h-20 max-w-full object-contain filter contrast-125"
                    />
                  ) : (
                    <div className="text-slate-400 text-[10px] italic">
                      Firma física al reverso o confirmación digital
                    </div>
                  )}
                </div>
                <div className="border-t-2 border-slate-400 pt-2">
                  <p className="font-bold text-xs text-slate-900">{request.workerName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Firma del Trabajador Receptor</p>
                  <p className="text-[9px] font-mono text-slate-500">CI: {request.workerIdNumber || 'S/N'}</p>
                </div>
              </div>
            </div>

            {/* Optional Photographic Evidences (printed nicely if present) */}
            {(request.photoEquipmentUrl || request.photoWorkerUrl) && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Anexo Fotográfico de Evidencia
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {request.photoEquipmentUrl && (
                    <div className="border border-slate-200 rounded-xl p-2 text-center bg-slate-50">
                      <img 
                        src={request.photoEquipmentUrl} 
                        alt="Foto del EPP" 
                        className="h-36 w-full object-contain rounded-lg mb-1" 
                      />
                      <span className="text-[9px] text-slate-500 font-medium">Evidencia: Equipos Entregados</span>
                    </div>
                  )}
                  {request.photoWorkerUrl && (
                    <div className="border border-slate-200 rounded-xl p-2 text-center bg-slate-50">
                      <img 
                        src={request.photoWorkerUrl} 
                        alt="Foto del Trabajador con EPP" 
                        className="h-36 w-full object-contain rounded-lg mb-1" 
                      />
                      <span className="text-[9px] text-slate-500 font-medium">Evidencia: Colaborador con EPP</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="text-center text-[9px] text-slate-400 mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span>Novagreen IA · Sistema Integrado ERP / SGSST</span>
              <span>Generado: {new Date().toLocaleDateString('es-EC')}</span>
              <span className="font-mono">Página 1 de 1</span>
            </div>
          </div>
        </div>

      </div>

      {/* Print CSS Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #epp-printable-act, #epp-printable-act * {
            visibility: visible;
          }
          #epp-printable-act {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
            border: none;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
