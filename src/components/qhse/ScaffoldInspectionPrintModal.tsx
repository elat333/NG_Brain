import React from 'react';
import { X, Printer, Download, Layers } from 'lucide-react';
import { ScaffoldInspection } from '../../types';

interface ScaffoldInspectionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: ScaffoldInspection | null;
}

export const ScaffoldInspectionPrintModal: React.FC<ScaffoldInspectionPrintModalProps> = ({
  isOpen,
  onClose,
  inspection
}) => {
  if (!isOpen || !inspection) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-4xl max-h-[96vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* BARRA DE ACCIÓN SUPERIOR (OCULTA EN IMPRESIÓN) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-700 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Vista Previa de Impresión / PDF
            </span>
            <span className="text-xs text-slate-400">• Código: {inspection.code || inspection.formatCode}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={16} />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* DOCUMENTO IMPRIMIBLE OFICIAL */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-sans text-slate-900 print:p-0 print:overflow-visible">
          <div className="border-2 border-slate-900 p-4 rounded-lg space-y-4">
            
            {/* ENCABEZADO OFICIAL */}
            <div className="grid grid-cols-12 border-b-2 border-slate-900 pb-3 items-center">
              <div className="col-span-3 border-r-2 border-slate-900 pr-3 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black tracking-tighter text-slate-900 uppercase">
                  CONSTRUCTORA LARRIVA
                </span>
                <span className="text-[9px] font-bold text-amber-600 tracking-widest uppercase">
                  NOVAGREEN QHSE
                </span>
              </div>
              <div className="col-span-6 px-3 text-center">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider">
                  INSPECCIÓN DE ANDAMIOS
                </h1>
                <p className="text-[10px] font-bold text-slate-600">
                  SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO
                </p>
              </div>
              <div className="col-span-3 border-l-2 border-slate-900 pl-3 text-[9px] font-bold space-y-0.5">
                <div><strong>CÓDIGO:</strong> {inspection.formatCode || 'JLC-REG-SST-017'}</div>
                <div><strong>COPIA:</strong> CONTROLADA</div>
                <div><strong>VERSIÓN:</strong> {inspection.version || '1'}</div>
                <div><strong>FECHA ELAB.:</strong> {inspection.formatDate || '20/07/2025'}</div>
              </div>
            </div>

            {/* DATOS GENERALES */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-slate-800 p-2 text-xs bg-slate-50/50">
              <div>
                <span className="font-black text-[10px] uppercase block text-slate-500">Encargado del Montaje:</span>
                <span className="font-bold text-slate-900">{inspection.assemblySupervisor || 'N/A'}</span>
              </div>
              <div>
                <span className="font-black text-[10px] uppercase block text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-900">{inspection.client || 'N/A'}</span>
              </div>
              <div>
                <span className="font-black text-[10px] uppercase block text-slate-500">Proyecto:</span>
                <span className="font-bold text-slate-900">{inspection.projectName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-black text-[10px] uppercase block text-slate-500">Ubicación:</span>
                <span className="font-bold text-slate-900">{inspection.location || 'N/A'}</span>
              </div>
              <div>
                <span className="font-black text-[10px] uppercase block text-slate-500">Fecha de Inspección:</span>
                <span className="font-bold text-slate-900">{inspection.inspectionDate} {inspection.inspectionTime || ''}</span>
              </div>
              <div>
                <span className="font-black text-[10px] uppercase block text-slate-500">Estado General:</span>
                <span className="font-black uppercase text-slate-900">
                  {inspection.generalStatus === 'conforme' && 'CONFORME (APTO)'}
                  {inspection.generalStatus === 'con_observaciones' && 'CON OBSERVACIONES'}
                  {inspection.generalStatus === 'no_conforme' && 'NO CONFORME'}
                </span>
              </div>
            </div>

            {/* NOTA / CRITERIO DE EVALUACIÓN */}
            <div className="border border-slate-400 p-2 text-[9px] leading-tight bg-slate-50 text-slate-700">
              <strong className="text-slate-900">INSTRUCCIONES / CRITERIO DE EVALUACIÓN:</strong> BE: Buen Estado | EA: Estado Aceptable | ME: Mal Estado | NA: No Aplica.
              <p className="mt-0.5 text-slate-600">
                <strong>NOTA:</strong> Cuando un elemento se encuentra en buen estado es porque es nuevo o presenta poco tiempo de uso y ha sido cuidado con amplitud. Al encontrar un elemento en estado aceptable se concluye que es un elemento con algún tiempo de servicio sin embargo cumple con las cualidades mínimas para seguir usándose. Un elemento en mal estado ya no reúne estas características por lo que debe ser retirado de forma inmediata del área de trabajo, para impedir que se continúe usando.
              </p>
            </div>

            {/* TABLA DE 23 ITEMS */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase font-black text-center">
                    <th className="border border-slate-900 p-1 w-8">#</th>
                    <th className="border border-slate-900 p-1 text-left">DESCRIPCIÓN DE ELEMENTOS</th>
                    <th className="border border-slate-900 p-1 w-9">BE</th>
                    <th className="border border-slate-900 p-1 w-9">EA</th>
                    <th className="border border-slate-900 p-1 w-9">ME</th>
                    <th className="border border-slate-900 p-1 w-9">NA</th>
                    <th className="border border-slate-900 p-1 text-left w-56">OBSERVACIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.items.map((item) => (
                    <tr key={`print_item_${item.code}`} className="border-b border-slate-300">
                      <td className="border border-slate-900 p-1 text-center font-bold">{item.code}</td>
                      <td className="border border-slate-900 p-1 font-semibold">{item.description}</td>
                      <td className="border border-slate-900 p-1 text-center font-black">{item.status === 'BE' ? 'X' : ''}</td>
                      <td className="border border-slate-900 p-1 text-center font-black">{item.status === 'EA' ? 'X' : ''}</td>
                      <td className="border border-slate-900 p-1 text-center font-black text-red-600">{item.status === 'ME' ? 'X' : ''}</td>
                      <td className="border border-slate-900 p-1 text-center font-black">{item.status === 'NA' ? 'X' : ''}</td>
                      <td className="border border-slate-900 p-1 text-slate-700">{item.observations || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SEGUIMIENTO DE HALLAZGOS */}
            <div className="space-y-1 pt-2">
              <h3 className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white p-1 text-center">
                SEGUIMIENTO DE HALLAZGOS Y COMPROMISOS
              </h3>
              <table className="w-full text-[10px] border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-black uppercase text-center">
                    <th className="border border-slate-900 p-1 text-left">HALLAZGO / COMPROMISO</th>
                    <th className="border border-slate-900 p-1 w-48 text-left">RESPONSABLE</th>
                    <th className="border border-slate-900 p-1 w-32 text-center">FECHA DE EJECUCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.findings && inspection.findings.length > 0 ? (
                    inspection.findings.map((f, idx) => (
                      <tr key={`print_finding_${idx}`} className="border-b border-slate-300">
                        <td className="border border-slate-900 p-1">{f.finding}</td>
                        <td className="border border-slate-900 p-1">{f.responsible}</td>
                        <td className="border border-slate-900 p-1 text-center">{f.executionDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="border border-slate-900 p-2 text-center text-slate-500 italic">
                        Sin hallazgos pendientes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FIRMAS Y RESPONSABLES */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-slate-900">
              <div className="border border-slate-900 p-3 rounded text-center flex flex-col justify-between h-36">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-600 block">
                    Nombre y Firma del Supervisor de la Actividad
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {inspection.activitySupervisorName || '__________________________'}
                  </span>
                </div>
                {inspection.activitySupervisorSignatureUrl ? (
                  <img
                    src={inspection.activitySupervisorSignatureUrl}
                    alt="Firma Supervisor Actividad"
                    className="max-h-16 mx-auto object-contain"
                  />
                ) : (
                  <div className="h-14 border-b border-dashed border-slate-400 mb-1"></div>
                )}
                <span className="text-[9px] font-bold text-slate-400 uppercase">Firma de Conformidad</span>
              </div>

              <div className="border border-slate-900 p-3 rounded text-center flex flex-col justify-between h-36">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-600 block">
                    Nombre y Firma del Supervisor de Andamios
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {inspection.scaffoldSupervisorName || '__________________________'}
                  </span>
                </div>
                {inspection.scaffoldSupervisorSignatureUrl ? (
                  <img
                    src={inspection.scaffoldSupervisorSignatureUrl}
                    alt="Firma Supervisor Andamios"
                    className="max-h-16 mx-auto object-contain"
                  />
                ) : (
                  <div className="h-14 border-b border-dashed border-slate-400 mb-1"></div>
                )}
                <span className="text-[9px] font-bold text-slate-400 uppercase">Firma del Inspector / Certificador</span>
              </div>
            </div>

            {/* ANEXO FOTOGRÁFICO EN CAMPO */}
            {inspection.photos && inspection.photos.length > 0 && (
              <div className="pt-4 border-t-2 border-slate-900 space-y-2 page-break-before">
                <h3 className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white p-1 text-center">
                  ANEXO: EVIDENCIAS FOTOGRÁFICAS EN CAMPO ({inspection.photos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {inspection.photos.map((photo, pIdx) => (
                    <div key={`print_photo_${photo.id || pIdx}`} className="border border-slate-400 p-1.5 rounded">
                      <div className="aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Foto ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-[9px] font-semibold text-slate-700 mt-1 text-center">
                        {photo.caption || `Evidencia fotográfica #${pIdx + 1}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTAS AL PIE */}
            {inspection.notes && (
              <div className="p-2 border border-slate-300 text-[9px] text-slate-600 bg-slate-50">
                <strong>Observaciones adicionales:</strong> {inspection.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
