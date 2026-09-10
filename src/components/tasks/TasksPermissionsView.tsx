import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  Activity, 
  Users, 
  Layers, 
  Calendar, 
  Clock, 
  FileText, 
  AlertTriangle, 
  History, 
  ChevronRight, 
  KeyRound, 
  CheckSquare, 
  Ban, 
  HelpCircle,
  Eye,
  Sliders,
  FolderKanban,
  Sparkles,
  MessageSquare,
  AtSign,
  CheckCircle,
  Trash2,
  Tag,
  AlertCircle,
  CornerDownRight,
  UserCheck,
  ShieldAlert,
  Crown
} from 'lucide-react';
import { TeamMember, Process, Role } from '../../types';
import { getModuleAccess } from '../../lib/permissions';

interface TasksPermissionsViewProps {
  currentMember?: TeamMember | null;
  processes?: Process[];
  roles?: Role[];
}

export const TasksPermissionsView: React.FC<TasksPermissionsViewProps> = ({
  currentMember,
  processes = [],
  roles = []
}) => {
  const [selectedProcessId, setSelectedProcessId] = useState<string>(processes[0]?.id || 'global');
  const [activeLayerTab, setActiveLayerTab] = useState<'all' | 'capa-a' | 'capa-b' | 'capa-c' | 'capa-d' | 'capa-comments'>('all');

  const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
  const effectiveProcessAccess = selectedProcessId === 'global'
    ? getModuleAccess(currentMember, roles, 'tasks')
    : getModuleAccess(currentMember, roles, `tasks_${selectedProcessId}`);

  const selectedProcessObj = processes.find(p => p.id === selectedProcessId);

  return (
    <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full pb-24 px-4 custom-scrollbar">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30 rounded-3xl p-8 shadow-sm border border-purple-100/60 mt-4 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <Shield size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
                  Marco de Gobernanza
                </span>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
                  Módulo de Tareas
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Arquitectura de Reglas, Permisos y Niveles de Acceso
              </h1>
              <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
                El módulo de tareas se rige por una arquitectura multidimensional dividida en <strong>4 Capas Estructurales (A, B, C, D)</strong> y un <strong>Protocolo Central de Comentarios y Revisiones</strong> para garantizar la integridad cronológica, presupuestaria y operativa de la empresa.
              </p>
            </div>
          </div>

          {/* Live Simulator Pill */}
          <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm min-w-[260px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <KeyRound size={14} className="text-purple-600" /> Diagnóstico de Tu Acceso Activo
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Usuario en Sesión:</span>
                <span className="font-bold text-slate-700 truncate max-w-[140px]">{currentMember?.name || 'Invitado / No autenticado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rol Global:</span>
                <span className="font-bold text-purple-700 capitalize">
                  {isUserAdmin ? 'Super Administrador' : (currentMember?.role || 'Personalizado')}
                </span>
              </div>
              <div className="pt-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Evaluar permiso sobre proceso:
                </label>
                <select 
                  value={selectedProcessId}
                  onChange={(e) => setSelectedProcessId(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none focus:border-purple-500"
                >
                  <option value="global">Tareas Generales (Sin proceso)</option>
                  {processes.map((proc, pIdx) => (
                    <option key={`perm_proc_select_${proc.id || pIdx}_${pIdx}`} value={proc.id}>
                      {proc.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center justify-between bg-purple-50/70 p-2 rounded-lg border border-purple-100">
                  <span className="text-[11px] font-medium text-slate-600">Nivel de Acceso Calculado:</span>
                  <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                    effectiveProcessAccess === 'administrador' ? 'bg-purple-600 text-white' :
                    effectiveProcessAccess === 'lider' ? 'bg-indigo-600 text-white' :
                    effectiveProcessAccess === 'colaborador' ? 'bg-blue-600 text-white' :
                    effectiveProcessAccess === 'lector' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {effectiveProcessAccess}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-purple-100/80 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveLayerTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              activeLayerTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200/60'
            }`}
          >
            Vista Completa (Todas las Capas)
          </button>
          <button
            onClick={() => setActiveLayerTab('capa-a')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeLayerTab === 'capa-a'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" /> Capa A: Roles y Jerarquía
          </button>
          <button
            onClick={() => setActiveLayerTab('capa-b')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeLayerTab === 'capa-b'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" /> Capa B: Matriz de 5 Niveles
          </button>
          <button
            onClick={() => setActiveLayerTab('capa-c')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeLayerTab === 'capa-c'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Capa C: Planificación vs. Ejecución
          </button>
          <button
            onClick={() => setActiveLayerTab('capa-d')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeLayerTab === 'capa-d'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Capa D: Auditoría y Trazabilidad
          </button>
          <button
            onClick={() => setActiveLayerTab('capa-comments')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeLayerTab === 'capa-comments'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200/60'
            }`}
          >
            <MessageSquare size={13} className="text-rose-500" /> Comentarios y Revisiones
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* CAPA A: ROLES Y JERARQUÍA DEL SISTEMA */}
        {(activeLayerTab === 'all' || activeLayerTab === 'capa-a') && (
          <section id="capa-a" className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                A
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Capa A: Identidad, Roles y Jerarquía Institucional
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Define cómo se asignan las facultades del usuario desde su vinculación institucional y perfil de sistema.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-purple-50/40 rounded-2xl border border-purple-100 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 bg-purple-600 text-white font-extrabold text-[10px] rounded-md uppercase">
                    Nivel Supremo
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Shield size={16} className="text-purple-600" /> Super Administrador
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Usuario con <code className="text-[10px] bg-purple-100 px-1 py-0.5 rounded">isSystemAdmin = true</code> o rol <code className="text-[10px] bg-purple-100 px-1 py-0.5 rounded">role-admin</code>.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 pt-2">
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-purple-600 mt-0.5 shrink-0" /> Acceso total irrestricto a todos los procesos.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-purple-600 mt-0.5 shrink-0" /> Capacidad de editar matrices de permisos de otros usuarios.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-purple-600 mt-0.5 shrink-0" /> Creación, borrado y reasignación masiva.</li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white font-extrabold text-[10px] rounded-md uppercase">
                    Liderazgo Funcional
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Users size={16} className="text-indigo-600" /> Líder de Proceso
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Asignado en la matriz como <code className="text-[10px] bg-indigo-100 px-1 py-0.5 rounded">lider</code> para uno o más procesos específicos.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 pt-2">
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-indigo-600 mt-0.5 shrink-0" /> Diseña y aprueba tareas del proceso.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-indigo-600 mt-0.5 shrink-0" /> Fija fechas límite improrrogables y horas estimadas.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-indigo-600 mt-0.5 shrink-0" /> Asigna al responsable principal y auxiliares.</li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white font-extrabold text-[10px] rounded-md uppercase">
                    Operación
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Activity size={16} className="text-blue-600" /> Colaborador Asignado
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Responsable principal (<code className="text-[10px] bg-blue-100 px-1 py-0.5 rounded">memberId</code>) o auxiliar (<code className="text-[10px] bg-blue-100 px-1 py-0.5 rounded">auxiliaryIds</code>).
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 pt-2">
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-blue-600 mt-0.5 shrink-0" /> Ejecuta y avanza el estado de la tarea.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-blue-600 mt-0.5 shrink-0" /> Registra horas reales invertidas.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-blue-600 mt-0.5 shrink-0" /> Sube entregables y documenta comentarios.</li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 bg-slate-600 text-white font-extrabold text-[10px] rounded-md uppercase">
                    Consulta
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Eye size={16} className="text-slate-600" /> Observador / Revisor
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Usuario con acceso de lectura o designado en <code className="text-[10px] bg-slate-200 px-1 py-0.5 rounded">revisorId</code>.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 pt-2">
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-slate-600 mt-0.5 shrink-0" /> Consulta el estado de las tareas sin mutar datos.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-slate-600 mt-0.5 shrink-0" /> Accede a los comentarios de retroalimentación.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-slate-600 mt-0.5 shrink-0" /> Visualiza las métricas en modo consulta.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CAPA B: MATRIZ DE LOS 5 NIVELES DE ACCESO */}
        {(activeLayerTab === 'all' || activeLayerTab === 'capa-b') && (
          <section id="capa-b" className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                B
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Capa B: Matriz de los 5 Niveles de Acceso Estándar
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Detalle operacional exhaustivo de las acciones permitidas por cada nivel en la interfaz de Tareas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3.5 rounded-l-xl">Nivel de Acceso</th>
                    <th className="p-3.5">Visibilidad en Tablero/Listas</th>
                    <th className="p-3.5">Crear Nuevas Tareas</th>
                    <th className="p-3.5">Editar Planificación (Fechas/Horas)</th>
                    <th className="p-3.5">Mover Estados / Ejecución</th>
                    <th className="p-3.5 rounded-r-xl">Eliminar Tareas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md uppercase text-[10px]">
                        ninguno
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      <strong>Restringido:</strong> Solo ve tareas donde es el <em>Asignado</em> o <em>Auxiliar</em> directo.
                    </td>
                    <td className="p-3.5 text-red-500 font-bold flex items-center gap-1">
                      <Ban size={13} /> Bloqueado
                    </td>
                    <td className="p-3.5 text-slate-400">Solo lectura</td>
                    <td className="p-3.5 text-blue-600 font-semibold">
                      Solo en sus tareas asignadas
                    </td>
                    <td className="p-3.5 text-red-400">No permitido</td>
                  </tr>

                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md uppercase text-[10px]">
                        lector
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <strong>Completo en proceso:</strong> Ve todas las tareas del proceso en Tablero, Lista y Calendario.
                    </td>
                    <td className="p-3.5 text-red-500 font-bold flex items-center gap-1">
                      <Ban size={13} /> Bloqueado
                    </td>
                    <td className="p-3.5 text-slate-400">Solo lectura</td>
                    <td className="p-3.5 text-slate-400">Solo lectura</td>
                    <td className="p-3.5 text-red-400">No permitido</td>
                  </tr>

                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-md uppercase text-[10px]">
                        colaborador
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <strong>Activo:</strong> Ve tareas de su proceso, backlog general y proyectos vinculados.
                    </td>
                    <td className="p-3.5 text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Permitido
                    </td>
                    <td className="p-3.5 text-slate-500">
                      Solo lectura en tareas existentes (Modificable solo al crear).
                    </td>
                    <td className="p-3.5 text-green-600 font-bold">
                      Control de avance en tareas asignadas y reportar horas reales.
                    </td>
                    <td className="p-3.5 text-red-400">Solo líder/admin</td>
                  </tr>

                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md uppercase text-[10px]">
                        lider
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-semibold">
                      <strong>Total en el proceso:</strong> Acceso a todas las tareas, métricas, filtros y auditorías del proceso.
                    </td>
                    <td className="p-3.5 text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Total
                    </td>
                    <td className="p-3.5 text-indigo-700 font-bold">
                      Control Total: Deadlines, Horas Estimadas, Reasignación.
                    </td>
                    <td className="p-3.5 text-indigo-700 font-bold">
                      Mover libremente entre cualquier estado.
                    </td>
                    <td className="p-3.5 text-indigo-700 font-bold">Permitido</td>
                  </tr>

                  <tr className="hover:bg-slate-50/60 transition-colors bg-purple-50/20">
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-purple-600 text-white font-bold rounded-md uppercase text-[10px]">
                        administrador
                      </span>
                    </td>
                    <td className="p-3.5 text-purple-900 font-bold">
                      <strong>Global Transversal:</strong> Todos los procesos de la compañía y tareas sin proceso asignado.
                    </td>
                    <td className="p-3.5 text-purple-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Irrestricto
                    </td>
                    <td className="p-3.5 text-purple-700 font-bold">
                      Control Total y Auditoría en tiempo real.
                    </td>
                    <td className="p-3.5 text-purple-700 font-bold">
                      Irrestricto en todos los estados.
                    </td>
                    <td className="p-3.5 text-purple-700 font-bold">Total</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* CAPA C: SEPARACIÓN DE PLANIFICACIÓN VS. EJECUCIÓN */}
        {(activeLayerTab === 'all' || activeLayerTab === 'capa-c') && (
          <section id="capa-c" className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                C
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Capa C: Permisos Cruzados — Planificación vs. Ejecución
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Mecanismo de blindaje contra alteraciones no autorizadas de fechas límites, presupuestos y entregables.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bloque 1: Planificación */}
              <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-purple-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Bloque 1: Planificación y Límites</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded-md uppercase">
                    Exclusivo Líder / Admin
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Contiene los parámetros estratégicos fijados por la dirección. Ningún colaborador puede modificar unilateralmente estos valores en tareas ya creadas.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Fecha Límite (Deadline)</strong>
                      <span className="text-slate-400 text-[11px]">Plazo máximo de cumplimiento contractual o interno</span>
                    </div>
                    <Lock size={14} className="text-purple-500 shrink-0" />
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Horas Planificadas (Presupuesto)</strong>
                      <span className="text-slate-400 text-[11px]">Estimación de esfuerzo aprobada para la tarea</span>
                    </div>
                    <Lock size={14} className="text-purple-500 shrink-0" />
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Asignación de Responsable y Auxiliares</strong>
                      <span className="text-slate-400 text-[11px]">Delegación formal de la tarea al equipo</span>
                    </div>
                    <Lock size={14} className="text-purple-500 shrink-0" />
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Prioridad y Proceso</strong>
                      <span className="text-slate-400 text-[11px]">Jerarquía operativa y proceso organizativo</span>
                    </div>
                    <Lock size={14} className="text-purple-500 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Ejecución */}
              <div className="p-6 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Bloque 2: Ejecución y Resultados</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-md uppercase">
                    Colaborador Asignado
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Espacio autónomo del responsable para registrar el avance diario, reportar tiempo real y adjuntar evidencias.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-blue-200/60 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Horas Reales Incurridas</strong>
                      <span className="text-slate-400 text-[11px]">Tiempo real dedicado para la medición de eficiencia</span>
                    </div>
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-blue-200/60 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Fecha y Hora de Entrega Real</strong>
                      <span className="text-slate-400 text-[11px]">Auto-llenado inteligente al completar la tarea</span>
                    </div>
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-blue-200/60 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Checklists y Entregables</strong>
                      <span className="text-slate-400 text-[11px]">Marcar ítems concluidos y evidencias adjuntas</span>
                    </div>
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-blue-200/60 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800 block">Comentarios de Progreso</strong>
                      <span className="text-slate-400 text-[11px]">Hilos de retroalimentación y bitácora técnica</span>
                    </div>
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Regla de Dependencias Bloqueantes */}
            <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/70 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-amber-900">
                  Regla Estricta de Dependencias y Tareas Bloqueantes
                </h4>
                <p className="text-amber-800 leading-relaxed">
                  Si una tarea tiene predecesoras configuradas en <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded text-[10px]">blockedByTaskIds</code> y alguna de ellas NO está en estado <strong>Completada (done)</strong>, el sistema marca la tarea en rojo como <strong>Bloqueada</strong>. El colaborador asignado recibe una advertencia visual para priorizar la resolución del cuello de botella antes de iniciar la ejecución.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CAPA D: AUDITORÍA, HISTORIAL Y TRAZABILIDAD */}
        {(activeLayerTab === 'all' || activeLayerTab === 'capa-d') && (
          <section id="capa-d" className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                D
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Capa D: Auditoría Inmutable, Trazabilidad e Historial
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Garantía de transparencia total: cada acción sobre una tarea genera un registro inmutable.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <History size={16} />
                  <span>Creación e Inicio</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Se registra la fecha, hora exacta y usuario que originó la tarea (<code className="bg-slate-200 text-slate-800 px-1 rounded text-[10px]">createdAt</code> y primer evento de historial).
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <Sliders size={16} />
                  <span>Mutación de Campos</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Cualquier ajuste de estado, horas, responsable o deadline añade una entrada con el diff exacto al array de <code className="bg-slate-200 text-slate-800 px-1 rounded text-[10px]">history</code> de Firestore.
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <Shield size={16} />
                  <span>Auditoría de Cumplimiento</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Comparación automática entre <strong>Horas Planificadas vs. Horas Reales</strong> y <strong>Deadline vs. Fecha de Entrega Real</strong> para cálculo de indicadores de desempeño (KPIs).
                </p>
              </div>
            </div>
          </section>
        )}

        {/* PROTOCOLO Y GOBERNANZA DE COMENTARIOS Y REVISIONES */}
        {(activeLayerTab === 'all' || activeLayerTab === 'capa-comments') && (
          <section id="capa-comments" className="bg-white rounded-3xl p-8 border border-rose-100/80 shadow-sm space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-rose-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                <MessageSquare size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded-md uppercase">
                    Protocolo de Comunicación
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md uppercase">
                    Hilo de Tarea
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                  Gobernanza, Permisos y Fases de Comentarios
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Los comentarios forman la bitácora técnica y el control de calidad de la tarea en cada etapa de su ciclo de vida.
                </p>
              </div>
            </div>

            {/* 1. Matriz Exhaustiva de Permisos por Perfil sobre Comentarios */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound size={15} className="text-rose-600" /> Acceso Universal al Hilo de Comentarios & Solicitudes de Revisión
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  Sin Restricción por Fase
                </span>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900">
                <strong>Regla de Acceso Universal:</strong> Cualquier usuario involucrado (Responsable, Auxiliares, Revisor, Líder de Proceso o Administrador) puede publicar comentarios libres o emitir <strong>Solicitudes de Revisión / Acciones Requeridas</strong> en <strong>cualquier fase o estado</strong> de la tarjeta (Backlog, Por Hacer, En Progreso, En Revisión, En Corrección, Completada, etc.), garantizando una comunicación fluida sin bloqueos operativos.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* 1. Ninguno */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-black text-slate-700 uppercase text-[11px] flex items-center gap-1">
                        <Lock size={12} className="text-slate-500" /> Directo
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded">Asignado</span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-slate-600 text-[11px]">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Comenta y solicita revisión en cualquier fase si es Responsable o Auxiliar.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Menciona con <code className="bg-slate-200 px-0.5 rounded text-[9px]">@</code> a cualquier colega.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Marca resueltas sus observaciones o requerimientos.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-medium">
                    Eliminación: <strong>Solo propios</strong>
                  </div>
                </div>

                {/* 2. Lector */}
                <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/60 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                      <span className="font-black text-blue-900 uppercase text-[11px] flex items-center gap-1">
                        <Eye size={12} className="text-blue-600" /> Lector / Revisor
                      </span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded">Consulta & Calidad</span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-slate-600 text-[11px]">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Lee el hilo de todas las tareas del proceso.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Publica notas o emite solicitudes de revisión en cualquier fase.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Menciona a colaboradores y líderes con <code className="bg-blue-100 px-0.5 rounded text-[9px]">@</code>.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-blue-200/60 text-[10px] text-slate-500 font-medium">
                    Eliminación: <strong>Solo propios</strong>
                  </div>
                </div>

                {/* 3. Colaborador */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/60 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                      <span className="font-black text-emerald-900 uppercase text-[11px] flex items-center gap-1">
                        <UserCheck size={12} className="text-emerald-600" /> Colaborador
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">Operativo</span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-slate-600 text-[11px]">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Reporta avances, observaciones o solicitudes en todas las fases.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Comenta y solicita revisión formal de entregables libremente.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Marca observaciones como <strong>Resueltas</strong> al corregirlas.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 text-[10px] text-slate-500 font-medium">
                    Eliminación: <strong>Solo propios</strong>
                  </div>
                </div>

                {/* 4. Líder */}
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-200/60 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
                      <span className="font-black text-indigo-900 uppercase text-[11px] flex items-center gap-1">
                        <ShieldAlert size={12} className="text-indigo-600" /> Líder
                      </span>
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded">Proceso</span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-slate-600 text-[11px]">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Emite <strong>Observaciones y Revisiones</strong> en cualquier fase.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Valida y aprueba soluciones en cualquier estado.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Resuelve, reabre o gestiona cualquier observación del proceso.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-indigo-200/60 text-[10px] text-slate-500 font-medium">
                    Eliminación: <strong>Solo propios</strong> (preserva trazabilidad)
                  </div>
                </div>

                {/* 5. Administrador */}
                <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200/60 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                      <span className="font-black text-purple-900 uppercase text-[11px] flex items-center gap-1">
                        <Crown size={12} className="text-purple-600" /> Admin
                      </span>
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-bold rounded">Global</span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-slate-600 text-[11px]">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Publicación y visualización irrestricta en todas las tareas y fases.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-purple-700 font-black">★</span>
                        <span className="text-purple-900 font-bold">Elimina comentarios propios y de terceros.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Cierre o reapertura de cualquier observación empresarial.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-purple-200/60 text-[10px] text-purple-700 font-bold">
                    Eliminación: <strong>Total (Propios + Terceros)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Comportamiento por Fases del Ciclo de Vida y Roles Involucrados */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders size={15} className="text-indigo-600" /> Comportamiento del Hilo de Comentarios según la Fase / Estado de la Tarea
              </h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                      <th className="p-3 rounded-l-xl">Fase / Estado</th>
                      <th className="p-3">Finalidad de los Comentarios</th>
                      <th className="p-3">Comportamiento por Perfil</th>
                      <th className="p-3">Flujo Operativo de Revisión</th>
                      <th className="p-3 rounded-r-xl">Alertas en Dashboard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px] uppercase">
                          Backlog / Por Hacer (todo)
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        Aclaraciones de alcance, requerimientos técnicos previos y definición de criterios antes del arranque.
                      </td>
                      <td className="p-3 text-slate-600">
                        <ul className="space-y-1 text-[11px]">
                          <li><strong>Líder/Admin:</strong> Define criterios y resuelve dudas previas.</li>
                          <li><strong>Colaborador/Ninguno (Asignado):</strong> Preguntas técnicas y viabilidad.</li>
                          <li><strong>Lector:</strong> Consulta notas iniciales.</li>
                        </ul>
                      </td>
                      <td className="p-3 text-slate-500">
                        Se pueden etiquetar miembros con <code className="bg-slate-100 px-1 rounded text-[10px]">@Nombre</code> para coordinar requisitos.
                      </td>
                      <td className="p-3 text-slate-400">Sin impacto en alertas</td>
                    </tr>

                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px] uppercase">
                          En Progreso (in_progress)
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        <strong>Bitácora Activa:</strong> El asignado y auxiliares reportan avances diarios, bloqueos momentáneos y enlaces a borradores.
                      </td>
                      <td className="p-3 text-slate-600">
                        <ul className="space-y-1 text-[11px]">
                          <li><strong>Colaborador/Asignado:</strong> Registra avance diario y dificultades.</li>
                          <li><strong>Líder:</strong> Feedback intermedio y desbloqueo de dependencias.</li>
                          <li><strong>Lector/Admin:</strong> Supervisión y consulta de progreso.</li>
                        </ul>
                      </td>
                      <td className="p-3 text-slate-600">
                        Permite adjuntar evidencias intermedias antes de solicitar la revisión formal.
                      </td>
                      <td className="p-3 text-blue-600 font-semibold">
                        Notifica a mencionados
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/60 transition-colors bg-amber-50/30">
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[10px] uppercase">
                          En Revisión (review)
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-bold">
                        <strong>Control de Calidad:</strong> El Revisor designado o Líder examina entregables y emite hallazgos formales.
                      </td>
                      <td className="p-3 text-slate-700">
                        <ul className="space-y-1 text-[11px]">
                          <li><strong>Revisor/Líder/Admin:</strong> Emite observaciones con flag <span className="text-rose-600 font-bold">Requiere Revisión</span>.</li>
                          <li><strong>Colaborador/Asignado:</strong> Aclara puntos y prepara ajustes requeridos.</li>
                          <li><strong>Lector:</strong> Visualiza el dictamen de control de calidad.</li>
                        </ul>
                      </td>
                      <td className="p-3 text-amber-900">
                        Se activan comentarios de revisión obligatoria para señalar correcciones pendientes antes de aprobar.
                      </td>
                      <td className="p-3 text-amber-700 font-bold">
                        Badge naranja "X por resolver"
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/60 transition-colors bg-rose-50/30">
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-900 font-bold rounded text-[10px] uppercase">
                          En Corrección (correction)
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">
                        <strong>Subsanación:</strong> El colaborador asignado atiende una por una las observaciones y las marca como <em>"Resueltas"</em>.
                      </td>
                      <td className="p-3 text-slate-700">
                        <ul className="space-y-1 text-[11px]">
                          <li><strong>Colaborador/Asignado:</strong> Corrige entregables y marca cada observación como <span className="text-emerald-700 font-bold">"Resuelta"</span>.</li>
                          <li><strong>Líder/Revisor:</strong> Re-inspecciona soluciones y reabre si el hallazgo persiste.</li>
                          <li><strong>Admin:</strong> Intervención o reasignación si existen discrepancias.</li>
                        </ul>
                      </td>
                      <td className="p-3 text-rose-900">
                        Al resolver todas las observaciones, la tarea queda habilitada para re-evaluación o aprobación final.
                      </td>
                      <td className="p-3 text-rose-700 font-bold">
                        Alerta activa hasta resolución
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/60 transition-colors bg-emerald-50/20">
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px] uppercase">
                          Completada (done) / Rechazada
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        <strong>Cierre y Auditoría:</strong> Registro de felicitaciones, notas de balance final o motivo fundamentado de rechazo.
                      </td>
                      <td className="p-3 text-slate-600">
                        <ul className="space-y-1 text-[11px]">
                          <li><strong>Todos los perfiles con acceso:</strong> Lectura del expediente histórico inmutable.</li>
                          <li><strong>Líder/Admin:</strong> Documenta lecciones aprendidas o motivos de rechazo.</li>
                          <li><strong>Admin:</strong> Auditoría y eliminación en caso de notas erróneas.</li>
                        </ul>
                      </td>
                      <td className="p-3 text-slate-500">
                        Queda como expediente histórico inmutable para auditorías de calidad y lecciones aprendidas.
                      </td>
                      <td className="p-3 text-emerald-600 font-semibold">
                        Comentarios archivados
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Funciones Inteligentes: Menciones y Solicitudes de Revisión */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border border-indigo-100 space-y-2">
                <div className="flex items-center gap-2 font-black text-indigo-900">
                  <AtSign size={16} className="text-indigo-600" />
                  <span>Menciones Inteligentes (@Nombre)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Al escribir el símbolo <code className="bg-indigo-100 text-indigo-800 px-1 rounded text-[10px]">@</code> en el cuadro de comentario, se despliega el listado de miembros del equipo con su respectivo cargo y proceso. Al enviar el comentario, los miembros etiquetados son indexados automáticamente en <code className="bg-slate-100 px-1 rounded text-[10px]">mentionedMemberIds</code> para visibilidad centralizada.
                </p>
              </div>

              <div className="p-5 bg-gradient-to-br from-rose-50/50 to-white rounded-2xl border border-rose-100 space-y-2">
                <div className="flex items-center gap-2 font-black text-rose-900">
                  <AlertCircle size={16} className="text-rose-600" />
                  <span>Control de Observaciones Pendientes</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Cualquier comentario configurado como <em>"Requiere Revisión"</em> genera una obligación técnica dentro de la tarea. En el tablero Kanban y en la vista de Resumen de Comentarios se refleja cuántas observaciones siguen abiertas para evitar que una tarea se cierre con entregables defectuosos.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
