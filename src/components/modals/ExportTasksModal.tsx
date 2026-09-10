import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  X, 
  FileSpreadsheet, 
  FileCode, 
  CheckSquare, 
  Square, 
  Search, 
  Layers, 
  Filter, 
  Check, 
  Calendar, 
  User, 
  FolderKanban,
  Building2,
  Sparkles
} from 'lucide-react';
import { Task, TeamMember, Process, Project } from '../../types';
import { normalizeText } from '../../lib/textUtils';

interface ExportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  filteredTasks: Task[];
  members: TeamMember[];
  processes: Process[];
  projects: Project[];
}

export const ExportTasksModal: React.FC<ExportTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  filteredTasks,
  members,
  processes,
  projects
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(true);

  // Status mapping
  const statusLabels: Record<string, string> = {
    backlog: 'Product Backlog',
    todo: 'Por Hacer',
    in_progress: 'En Progreso',
    review: 'Para Revisión',
    correction: 'Para Corrección',
    done: 'Completada',
    rejected: 'Rechazada',
    blocked: 'Bloqueada'
  };

  const priorityLabels: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    meteoric_crash: 'Urgente / Meteórico'
  };

  // Base list of tasks to choose from
  const candidateTasks = useMemo(() => {
    let list = tasks;
    if (!includeCompleted) {
      list = list.filter(t => t.status !== 'done' && t.status !== 'rejected');
    }
    return list;
  }, [tasks, includeCompleted]);

  // Tasks list filtered by modal search query
  const selectableTasks = useMemo(() => {
    if (!searchQuery.trim()) return candidateTasks;
    const q = normalizeText(searchQuery);
    return candidateTasks.filter(t => {
      const titleMatch = normalizeText(t.title).includes(q);
      const descMatch = normalizeText(t.description || '').includes(q);
      const memberName = members.find(m => m.id === t.memberId)?.name || '';
      const memberMatch = normalizeText(memberName).includes(q);
      const procName = processes.find(p => p.id === t.processId)?.name || '';
      const procMatch = normalizeText(procName).includes(q);
      const projName = projects.find(p => p.id === t.projectId)?.name || '';
      const projMatch = normalizeText(projName).includes(q);
      return titleMatch || descMatch || memberMatch || procMatch || projMatch;
    });
  }, [candidateTasks, searchQuery, members, processes, projects]);

  // Determine tasks to export
  const tasksToExport = useMemo(() => {
    let base: Task[] = [];
    if (exportScope === 'all') {
      base = tasks;
    } else if (exportScope === 'filtered') {
      base = filteredTasks;
    } else {
      base = tasks.filter(t => selectedTaskIds.includes(t.id));
    }

    if (!includeCompleted && exportScope !== 'selected') {
      base = base.filter(t => t.status !== 'done' && t.status !== 'rejected');
    }

    return base;
  }, [tasks, filteredTasks, exportScope, selectedTaskIds, includeCompleted]);

  const handleSelectAll = () => {
    const allIds = selectableTasks.map(t => t.id);
    setSelectedTaskIds(Array.from(new Set([...selectedTaskIds, ...allIds])));
  };

  const handleDeselectAll = () => {
    const currentViewIds = new Set(selectableTasks.map(t => t.id));
    setSelectedTaskIds(selectedTaskIds.filter(id => !currentViewIds.has(id)));
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (tasksToExport.length === 0) {
      alert('No hay tareas seleccionadas para exportar.');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];

    if (exportFormat === 'json') {
      const jsonContent = JSON.stringify(tasksToExport, null, 2);
      downloadFile(jsonContent, `tareas_export_${timestamp}.json`, 'application/json;charset=utf-8;');
    } else {
      // CSV Format
      const headers = [
        'ID',
        'Título',
        'Descripción',
        'Estado',
        'Prioridad',
        'Proceso',
        'Proyecto',
        'Responsable',
        'Revisor',
        'Fecha Inicio Planificada',
        'Fecha Fin Planificada',
        'Fecha Límite',
        'Fecha Cierre Real',
        'Horas Planificadas',
        'Horas Reales'
      ];

      const csvRows = tasksToExport.map(t => {
        const procName = processes.find(p => p.id === t.processId)?.name || '';
        const projName = projects.find(p => p.id === t.projectId)?.name || '';
        const memberName = members.find(m => m.id === t.memberId)?.name || '';
        const revisorName = members.find(m => m.id === t.revisorId)?.name || '';

        return [
          t.id || '',
          `"${(t.title || '').replace(/"/g, '""')}"`,
          `"${(t.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${statusLabels[t.status] || t.status || ''}"`,
          `"${priorityLabels[t.priority] || t.priority || ''}"`,
          `"${procName.replace(/"/g, '""')}"`,
          `"${projName.replace(/"/g, '""')}"`,
          `"${memberName.replace(/"/g, '""')}"`,
          `"${revisorName.replace(/"/g, '""')}"`,
          t.plannedDate || '',
          t.plannedEndDate || '',
          t.dueDate || '',
          t.actualEndDate || '',
          t.plannedHours || 0,
          t.actualHours || 0
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
      downloadFile(csvContent, `tareas_export_${timestamp}.csv`, 'text/csv;charset=utf-8;');
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner">
              <Download size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Exportar Tareas</h2>
              <p className="text-xs text-slate-500 font-medium">Configura el formato y las tareas que deseas exportar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Formato de Exportación */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
              1. Formato del Archivo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  exportFormat === 'json'
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${exportFormat === 'json' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <FileCode size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Formato JSON (.json)</span>
                    {exportFormat === 'json' && <Check size={16} className="text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Respaldo completo estructurado para copias de seguridad o restauración.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${exportFormat === 'csv' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <FileSpreadsheet size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Formato CSV (.csv / Excel)</span>
                    {exportFormat === 'csv' && <Check size={16} className="text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Formato en tablas legible en Microsoft Excel, Google Sheets o LibreOffice.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Alcance de Exportación */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
              2. Selección de Tareas a Exportar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  exportScope === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Layers size={16} className={exportScope === 'all' ? 'text-ng-lime' : 'text-slate-500'} />
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    exportScope === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tasks.length}
                  </span>
                </div>
                <div className="text-xs font-black">Todas las Tareas</div>
                <div className={`text-[10px] mt-0.5 ${exportScope === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Exportar la totalidad
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  exportScope === 'filtered'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Filter size={16} className={exportScope === 'filtered' ? 'text-ng-lime' : 'text-slate-500'} />
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    exportScope === 'filtered' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {filteredTasks.length}
                  </span>
                </div>
                <div className="text-xs font-black">Vista Filtrada</div>
                <div className={`text-[10px] mt-0.5 ${exportScope === 'filtered' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Filtros activos actuales
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('selected')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  exportScope === 'selected'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <CheckSquare size={16} className={exportScope === 'selected' ? 'text-ng-lime' : 'text-slate-500'} />
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    exportScope === 'selected' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedTaskIds.length}
                  </span>
                </div>
                <div className="text-xs font-black">Elegir Manualmente</div>
                <div className={`text-[10px] mt-0.5 ${exportScope === 'selected' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Seleccionar una por una
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Lista de Selección Manual (si exportScope === 'selected') */}
          {exportScope === 'selected' && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar tarea por título, responsable, proceso..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2 self-end">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Seleccionar todas
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 text-[10px] font-bold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {selectableTasks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium">
                    No se encontraron tareas que coincidan con la búsqueda.
                  </div>
                ) : (
                  selectableTasks.map((t, tIdx) => {
                    const isSelected = selectedTaskIds.includes(t.id);
                    const member = members.find(m => m.id === t.memberId);
                    const proc = processes.find(p => p.id === t.processId);

                    return (
                      <div
                        key={`export_task_${t.id || tIdx}_${tIdx}`}
                        onClick={() => toggleTaskSelection(t.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/70 border border-emerald-200/50' : 'bg-white hover:bg-slate-100/70 border border-transparent'
                        }`}
                      >
                        <button
                          type="button"
                          className="shrink-0 text-slate-400 hover:text-slate-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskSelection(t.id);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare size={17} className="text-emerald-600" />
                          ) : (
                            <Square size={17} className="text-slate-300" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {t.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-700">
                              {statusLabels[t.status] || t.status}
                            </span>
                            {proc && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                • {proc.name}
                              </span>
                            )}
                            {member && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                • {member.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {t.priority && (
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            t.priority === 'meteoric_crash' ? 'bg-red-50 text-red-600' :
                            t.priority === 'alta' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {priorityLabels[t.priority] || t.priority}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Opciones Adicionales */}
          {exportScope !== 'selected' && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-800">Incluir tareas completadas y rechazadas</div>
                <div className="text-[10px] text-slate-500">Desactiva esta opción si solo deseas tareas pendientes o en progreso</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeCompleted} 
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-600 text-center sm:text-left">
            Total a exportar:{' '}
            <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
              {tasksToExport.length} {tasksToExport.length === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={tasksToExport.length === 0}
              onClick={handleExport}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                tasksToExport.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : exportFormat === 'json'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300'
              }`}
            >
              <Download size={14} />
              Descargar {exportFormat.toUpperCase()}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
