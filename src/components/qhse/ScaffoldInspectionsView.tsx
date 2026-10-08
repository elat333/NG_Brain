import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Printer,
  Eye,
  Trash2,
  Building2,
  Calendar,
  Camera,
  PenTool,
  ShieldAlert,
  ArrowUpDown,
  Download,
  FileText
} from 'lucide-react';
import {
  ScaffoldInspection,
  Project,
  TeamMember,
  RoleDefinition
} from '../../types';
import {
  db,
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy
} from '../../lib/firebase';
import { ScaffoldInspectionFormModal } from './ScaffoldInspectionFormModal';
import { ScaffoldInspectionPrintModal } from './ScaffoldInspectionPrintModal';

interface ScaffoldInspectionsViewProps {
  projects: Project[];
  members: TeamMember[];
  currentMember?: TeamMember | null;
  roles?: RoleDefinition[];
}

export const ScaffoldInspectionsView: React.FC<ScaffoldInspectionsViewProps> = ({
  projects,
  members,
  currentMember,
  roles = []
}) => {
  const [inspections, setInspections] = useState<ScaffoldInspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'conforme' | 'con_observaciones' | 'no_conforme'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedInspectionForEdit, setSelectedInspectionForEdit] = useState<ScaffoldInspection | null>(null);
  
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [selectedInspectionForPrint, setSelectedInspectionForPrint] = useState<ScaffoldInspection | null>(null);

  // Real-time Firestore sync (Cloud only)
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'qhse_scaffold_inspections'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ScaffoldInspection[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as ScaffoldInspection);
          });
          setInspections(list);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching scaffold inspections from cloud:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('Firestore init error:', e);
      setLoading(false);
    }
  }, []);

  // Filtered list
  const filteredInspections = inspections.filter((ins) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (ins.code && ins.code.toLowerCase().includes(q)) ||
      (ins.projectName && ins.projectName.toLowerCase().includes(q)) ||
      (ins.assemblySupervisor && ins.assemblySupervisor.toLowerCase().includes(q)) ||
      (ins.client && ins.client.toLowerCase().includes(q)) ||
      (ins.location && ins.location.toLowerCase().includes(q)) ||
      (ins.formatCode && ins.formatCode.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' || ins.generalStatus === statusFilter;

    const matchesProject =
      projectFilter === 'all' || ins.projectId === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // Metrics
  const totalCount = inspections.length;
  const conformeCount = inspections.filter((i) => i.generalStatus === 'conforme').length;
  const conObsCount = inspections.filter((i) => i.generalStatus === 'con_observaciones').length;
  const noConformeCount = inspections.filter((i) => i.generalStatus === 'no_conforme').length;
  const totalPhotosCount = inspections.reduce((acc, curr) => acc + (curr.photos?.length || 0), 0);

  // Handlers
  const handleOpenNew = () => {
    setSelectedInspectionForEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ins: ScaffoldInspection) => {
    setSelectedInspectionForEdit(ins);
    setIsFormOpen(true);
  };

  const handleOpenPrint = (ins: ScaffoldInspection) => {
    setSelectedInspectionForPrint(ins);
    setIsPrintOpen(true);
  };

  const handleDelete = async (ins: ScaffoldInspection) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar el registro de inspección "${ins.code || ins.formatCode}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'qhse_scaffold_inspections', ins.id));
    } catch (err) {
      console.error('Error deleting inspection from cloud:', err);
      alert('Error al eliminar el registro en la nube.');
    }
  };

  const cleanFirestoreData = (data: any): any => {
    if (data === undefined) return '';
    if (data === null) return null;
    if (Array.isArray(data)) {
      return data.map(item => cleanFirestoreData(item));
    }
    if (typeof data === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) {
          cleaned[key] = cleanFirestoreData(val);
        } else {
          cleaned[key] = '';
        }
      }
      return cleaned;
    }
    return data;
  };

  const handleSaveInspection = async (inspectionData: Partial<ScaffoldInspection>) => {
    try {
      if (selectedInspectionForEdit) {
        // Update existing record in Cloud Firestore
        const ref = doc(db, 'qhse_scaffold_inspections', selectedInspectionForEdit.id);
        const updatePayload = cleanFirestoreData({
          ...selectedInspectionForEdit,
          ...inspectionData,
          updatedAt: new Date().toISOString()
        });
        await setDoc(ref, updatePayload, { merge: true });
      } else {
        // Create new record in Cloud Firestore
        const newId = `insp-${Date.now()}`;
        const consecutive = String(inspections.length + 1).padStart(4, '0');
        const code = `INS-AND-${new Date().getFullYear()}-${consecutive}`;

        const newRecord: ScaffoldInspection = {
          id: newId,
          code,
          formatCode: 'JLC-REG-SST-017',
          controlledCopy: true,
          version: '1',
          formatDate: '20/07/2025',
          assemblySupervisor: inspectionData.assemblySupervisor || '',
          client: inspectionData.client || '',
          projectId: inspectionData.projectId || '',
          projectName: inspectionData.projectName || '',
          location: inspectionData.location || '',
          inspectionDate: inspectionData.inspectionDate || new Date().toISOString().slice(0, 10),
          inspectionTime: inspectionData.inspectionTime || '',
          generalStatus: inspectionData.generalStatus || 'conforme',
          items: inspectionData.items || [],
          findings: inspectionData.findings || [],
          activitySupervisorName: inspectionData.activitySupervisorName || '',
          activitySupervisorSignatureUrl: inspectionData.activitySupervisorSignatureUrl || '',
          scaffoldSupervisorName: inspectionData.scaffoldSupervisorName || '',
          scaffoldSupervisorSignatureUrl: inspectionData.scaffoldSupervisorSignatureUrl || '',
          photos: inspectionData.photos || [],
          notes: inspectionData.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByMemberId: currentMember?.id || '',
          createdByName: currentMember?.name || ''
        };

        const cleanedRecord = cleanFirestoreData(newRecord);
        await setDoc(doc(db, 'qhse_scaffold_inspections', newId), cleanedRecord);
      }
    } catch (err) {
      console.error('Error in handleSaveInspection:', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
              <Layers size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Formato JLC-REG-SST-017
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Módulo de Seguridad y Salud en el Trabajo
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Registro de Inspección de Andamios
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Control técnico de 23 puntos de seguridad, evidencias fotográficas en campo y firmas digitales para tablets.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={18} />
            <span>Nuevo Registro</span>
          </button>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
              Total Registros
            </span>
            <span className="text-xl font-black text-slate-800 mt-0.5 block">
              {totalCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10px] font-black uppercase text-emerald-700 block tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} /> Conformes
            </span>
            <span className="text-xl font-black text-emerald-800 mt-0.5 block">
              {conformeCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
            <span className="text-[10px] font-black uppercase text-blue-700 block tracking-wider flex items-center gap-1">
              <AlertTriangle size={12} /> Con Observaciones
            </span>
            <span className="text-xl font-black text-blue-800 mt-0.5 block">
              {conObsCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80">
            <span className="text-[10px] font-black uppercase text-rose-700 block tracking-wider flex items-center gap-1">
              <XCircle size={12} /> No Conformes
            </span>
            <span className="text-xl font-black text-rose-800 mt-0.5 block">
              {noConformeCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 col-span-2 lg:col-span-1">
            <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider flex items-center gap-1">
              <Camera size={12} /> Fotos en Obra
            </span>
            <span className="text-xl font-black text-amber-800 mt-0.5 block">
              {totalPhotosCount}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, proyecto, encargado, cliente o ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
          >
            <option value="all">Todos los Estados</option>
            <option value="conforme">Conformes</option>
            <option value="con_observaciones">Con Observaciones</option>
            <option value="no_conforme">No Conformes</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 max-w-[200px]"
          >
            <option value="all">Todos los Proyectos</option>
            {projects.map(p => (
              <option key={`scaff_filter_proj_${p.id}`} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTA / TABLA DE REGISTROS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            Cargando registros de inspección...
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Layers size={40} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-black text-slate-700">No hay registros de inspección encontrados</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Realiza una nueva inspección técnica de andamios utilizando el botón superior.
            </p>
            <button
              type="button"
              onClick={handleOpenNew}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Crear Primer Registro</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Código / Formato</th>
                  <th className="py-3.5 px-4">Fecha & Hora</th>
                  <th className="py-3.5 px-4">Proyecto / Cliente</th>
                  <th className="py-3.5 px-4">Encargado Montaje</th>
                  <th className="py-3.5 px-4">Ubicación</th>
                  <th className="py-3.5 px-4">Resultado</th>
                  <th className="py-3.5 px-4 text-center">Hallazgos</th>
                  <th className="py-3.5 px-4 text-center">Fotos</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredInspections.map((ins) => {
                  const hasSignatures = !!(ins.activitySupervisorSignatureUrl || ins.scaffoldSupervisorSignatureUrl);
                  return (
                    <tr key={ins.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* CÓDIGO */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <span>{ins.code || ins.formatCode}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {ins.formatCode} • v{ins.version || '1'}
                        </span>
                      </td>

                      {/* FECHA */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{ins.inspectionDate}</span>
                        </div>
                        {ins.inspectionTime && (
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {ins.inspectionTime} hrs
                          </span>
                        )}
                      </td>

                      {/* PROYECTO / CLIENTE */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 max-w-[180px] truncate">
                          {ins.projectName || 'Sin Proyecto'}
                        </div>
                        {ins.client && (
                          <span className="text-[10px] text-slate-400 block max-w-[180px] truncate">
                            {ins.client}
                          </span>
                        )}
                      </td>

                      {/* ENCARGADO MONTAJE */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">
                          {ins.assemblySupervisor || 'N/A'}
                        </span>
                      </td>

                      {/* UBICACIÓN */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-600 max-w-[150px] truncate block">
                          {ins.location || 'N/A'}
                        </span>
                      </td>

                      {/* RESULTADO */}
                      <td className="py-3.5 px-4">
                        {ins.generalStatus === 'conforme' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> Conforme
                          </span>
                        )}
                        {ins.generalStatus === 'con_observaciones' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            <AlertTriangle size={11} /> Observaciones
                          </span>
                        )}
                        {ins.generalStatus === 'no_conforme' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={11} /> No Conforme
                          </span>
                        )}
                      </td>

                      {/* HALLAZGOS */}
                      <td className="py-3.5 px-4 text-center">
                        {ins.findings && ins.findings.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-black text-[10px]">
                            {ins.findings.length}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>

                      {/* FOTOS */}
                      <td className="py-3.5 px-4 text-center">
                        {ins.photos && ins.photos.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px]">
                            <Camera size={11} /> {ins.photos.length}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>

                      {/* ACCIONES */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(ins)}
                            title="Imprimir / Exportar PDF Oficial JLC-REG-SST-017"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ins)}
                            title="Ver / Editar Registro 360°"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(ins)}
                            title="Eliminar Registro"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE FORMULARIO TÁCTIL / CÁMARA */}
      <ScaffoldInspectionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveInspection}
        initialData={selectedInspectionForEdit}
        projects={projects}
        members={members}
        currentMember={currentMember}
      />

      {/* MODAL DE IMPRESIÓN Y PDF OFICIAL */}
      <ScaffoldInspectionPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        inspection={selectedInspectionForPrint}
      />
    </div>
  );
};
