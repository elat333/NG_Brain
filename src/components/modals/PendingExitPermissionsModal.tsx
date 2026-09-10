import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Save, User, Building2, FolderKanban, Workflow } from 'lucide-react';
import { TeamMember } from '../../types';

export interface PendingExitAction {
  type: 'tab' | 'subtab' | 'settings_subtab' | 'directory_subtab' | 'process_subtab' | 'management_subtab' | 'ventas_subtab' | 'capacitacion_subtab' | 'acreditacion_subtab' | 'productos_subtab' | 'qhse_subtab' | 'importaciones_subtab' | 'tasks_subtab' | 'member' | 'custom';
  targetTab?: any;
  targetSettingsSubTab?: any;
  targetDirectorySub?: any;
  targetSubTab?: any;
  targetMemberId?: string;
  onExecute?: () => void;
  formType?: 'permissions' | 'member' | 'company' | 'process' | 'project';
  formName?: string;
}

interface PendingExitPermissionsModalProps {
  pendingExitAction: PendingExitAction | null;
  resolvedPermissionsMember?: TeamMember | null;
  onCancel: () => void;
  onDiscardAndProceed: () => void;
  onSaveAndProceed: () => Promise<void> | void;
}

export const PendingExitPermissionsModal: React.FC<PendingExitPermissionsModalProps> = ({
  pendingExitAction,
  resolvedPermissionsMember,
  onCancel,
  onDiscardAndProceed,
  onSaveAndProceed,
}) => {
  if (!pendingExitAction) return null;

  const formType = pendingExitAction.formType || 'permissions';
  const name = pendingExitAction.formName || resolvedPermissionsMember?.name || '';

  const getHeaderInfo = () => {
    switch (formType) {
      case 'member':
        return {
          title: '¿Salir sin guardar cambios de la persona?',
          description: name 
            ? `Has realizado modificaciones en la ficha de "${name}" que no han sido guardadas. Si sales ahora, se perderán.`
            : 'Has ingresado datos en el formulario de la persona pero no los has guardado. Si sales ahora, se perderán.',
          icon: <User size={26} />,
          iconBg: 'bg-emerald-50 text-emerald-600'
        };
      case 'company':
        return {
          title: '¿Salir sin guardar cambios de la compañía?',
          description: name 
            ? `Has realizado modificaciones en la ficha de "${name}" que no han sido guardadas. Si sales ahora, se perderán.`
            : 'Has ingresado datos en el formulario de la compañía pero no los has guardado. Si sales ahora, se perderán.',
          icon: <Building2 size={26} />,
          iconBg: 'bg-blue-50 text-blue-600'
        };
      case 'process':
        return {
          title: '¿Salir sin guardar cambios del proceso?',
          description: name 
            ? `Has realizado modificaciones en el proceso "${name}" que no han sido guardadas.`
            : 'Has ingresado datos en el formulario de proceso que no han sido guardados.',
          icon: <Workflow size={26} />,
          iconBg: 'bg-purple-50 text-purple-600'
        };
      case 'project':
        return {
          title: '¿Salir sin guardar cambios del proyecto?',
          description: name 
            ? `Has realizado modificaciones en el proyecto "${name}" que no han sido guardadas.`
            : 'Has ingresado datos en el formulario de proyecto que no han sido guardados.',
          icon: <FolderKanban size={26} />,
          iconBg: 'bg-amber-50 text-amber-600'
        };
      case 'permissions':
      default:
        return {
          title: '¿Salir sin guardar permisos?',
          description: `Has modificado los niveles de acceso para ${name || 'el integrante'} pero no has guardado los cambios. Si sales ahora, se perderán de manera irreversible.`,
          icon: <ShieldAlert size={26} />,
          iconBg: 'bg-amber-50 text-amber-500'
        };
    }
  };

  const header = getHeaderInfo();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-50 p-7 space-y-6"
      >
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-2xl flex-shrink-0 shadow-inner ${header.iconBg}`}>
            {header.icon}
          </div>
          <div className="space-y-1 bg-white">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{header.title}</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              {header.description}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-2 border border-slate-100 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          Selecciona una opción para continuar.
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3 hover:bg-slate-50 text-slate-500 hover:text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all text-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDiscardAndProceed}
            className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100/80 text-red-600 text-xs font-black uppercase tracking-wider rounded-2xl transition-all border border-red-200/40 text-center cursor-pointer"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={onSaveAndProceed}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={14} /> Guardar y continuar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

