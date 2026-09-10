import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  GraduationCap, 
  DollarSign, 
  User, 
  UserPlus, 
  AlertCircle,
  Eye,
  Heart,
  ThumbsDown,
  Layers,
  MessageSquare
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trainer, TeamMember, Company, Process, Role, PersonCategory, TrainingPlan, TrainingSpace } from '../../types';
import { MemberEditorView } from '../common/MemberEditorView';
import { TrainerDetailModal } from './TrainerDetailModal';

interface TrainersViewProps {
  trainers: Trainer[];
  members: TeamMember[];
  companies?: Company[];
  processes?: Process[];
  roles?: Role[];
  plans?: TrainingPlan[];
  spaces?: TrainingSpace[];
  onSaveTrainer: (trainer: Partial<Trainer>) => Promise<void>;
  onDeleteTrainer: (id: string) => Promise<void>;
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
}

export const TrainersView: React.FC<TrainersViewProps> = ({ 
  trainers, 
  members, 
  companies = [], 
  processes = [], 
  roles = [], 
  plans = [],
  spaces = [],
  onSaveTrainer, 
  onDeleteTrainer, 
  onCreateMember 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Partial<Trainer> | null>(null);
  const [viewingTrainer, setViewingTrainer] = useState<Trainer | null>(null);

  // Modal para Crear Persona en Directorio con el formulario oficial MemberEditorView
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);
  const initialNewMemberData = {
    name: '',
    role: 'Capacitador / Facilitador',
    systemRoleId: '',
    isSystemAdmin: false,
    moduleAccess: undefined,
    categories: ['contacto'] as PersonCategory[],
    processId: '',
    companyAssociations: [] as { companyId: string, role: string }[],
    identificationId: '',
    hasRuc: false,
    ruc: '',
    skills: '',
    responsibilities: '',
    personality: '',
    notes: '',
    email: '',
    phone: '',
    epp: ''
  };
  const [newMemberData, setNewMemberData] = useState(initialNewMemberData);
  const [isSavingMember, setIsSavingMember] = useState(false);

  const getMemberInfo = (directoryId: string) => {
    return members.find(m => m.id === directoryId);
  };

  const getCompanyForMember = (member?: TeamMember) => {
    if (!member || !member.companyAssociations || member.companyAssociations.length === 0) return undefined;
    return companies.find(c => c.id === member.companyAssociations[0].companyId);
  };

  const getProcessForMember = (member?: TeamMember) => {
    if (!member || !member.processId) return undefined;
    return processes.find(p => p.id === member.processId);
  };

  const filteredTrainers = trainers.filter(t => {
    const member = getMemberInfo(t.directoryId);
    return member?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           t.specialties?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.teachingInterests?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenModal = (trainer?: Trainer) => {
    if (trainer) {
      setEditingTrainer(trainer);
    } else {
      setEditingTrainer({
        type: 'interno',
        directoryId: '',
        specialties: '',
        hourlyRate: 0,
        relationshipType: 'aliado_estrategico',
        teachingInterests: '',
        teachingDislikes: '',
        preferredModality: 'presencial',
        logisticsNotes: '',
        relationshipNotes: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTrainer && editingTrainer.directoryId) {
        await onSaveTrainer(editingTrainer);
        setShowModal(false);
      } else {
        alert("Por favor seleccione un miembro del directorio.");
      }
    } catch (error) {
      console.error("Error al guardar capacitador:", error);
      alert("Hubo un error al guardar. Verifique su conexión y permisos.");
    }
  };

  // Creación de Persona en Directorio (Guarda directamente en Firebase 'members' y auto-selecciona)
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.name?.trim()) {
      alert('Ingresa el nombre y apellido de la persona');
      return;
    }
    setIsSavingMember(true);

    try {
      let newId = '';
      if (onCreateMember) {
        newId = await onCreateMember({
          name: newMemberData.name.trim(),
          role: newMemberData.role?.trim() || 'Capacitador / Facilitador',
          systemRoleId: newMemberData.systemRoleId || '',
          isSystemAdmin: newMemberData.isSystemAdmin || false,
          moduleAccess: newMemberData.moduleAccess || null,
          categories: Array.isArray(newMemberData.categories) ? newMemberData.categories : ['contacto'],
          processId: newMemberData.processId || '',
          companyAssociations: newMemberData.companyAssociations || [],
          identificationId: newMemberData.identificationId || '',
          hasRuc: newMemberData.hasRuc || false,
          ruc: newMemberData.hasRuc ? `${newMemberData.identificationId}001` : '',
          skills: typeof newMemberData.skills === 'string' ? newMemberData.skills.split(',').map(s => s.trim()).filter(s => s !== '') : (newMemberData.skills || []),
          responsibilities: typeof newMemberData.responsibilities === 'string' ? newMemberData.responsibilities.split(',').map(r => r.trim()).filter(r => r !== '') : (newMemberData.responsibilities || []),
          personality: newMemberData.personality || '',
          notes: newMemberData.notes || '',
          email: newMemberData.email || '',
          phone: newMemberData.phone || '',
          epp: typeof newMemberData.epp === 'string' ? newMemberData.epp.split(',').map(e => e.trim()).filter(e => e !== '') : (newMemberData.epp || [])
        });
      } else {
        newId = `mem-${Date.now()}`;
        const newMem: TeamMember = {
          id: newId,
          name: newMemberData.name.trim(),
          role: newMemberData.role?.trim() || 'Capacitador / Facilitador',
          systemRoleId: newMemberData.systemRoleId || '',
          isSystemAdmin: newMemberData.isSystemAdmin || false,
          moduleAccess: newMemberData.moduleAccess || null,
          categories: Array.isArray(newMemberData.categories) ? newMemberData.categories : ['contacto'],
          processId: newMemberData.processId || '',
          companyAssociations: newMemberData.companyAssociations || [],
          identificationId: newMemberData.identificationId || '',
          hasRuc: newMemberData.hasRuc || false,
          ruc: newMemberData.hasRuc ? `${newMemberData.identificationId}001` : '',
          skills: typeof newMemberData.skills === 'string' ? newMemberData.skills.split(',').map(s => s.trim()).filter(s => s !== '') : (newMemberData.skills || []),
          responsibilities: typeof newMemberData.responsibilities === 'string' ? newMemberData.responsibilities.split(',').map(r => r.trim()).filter(r => r !== '') : (newMemberData.responsibilities || []),
          recentAchievements: [],
          avatar: `https://picsum.photos/seed/${newMemberData.name.replace(/\s/g, '')}/150/150`,
          personality: newMemberData.personality || '',
          notes: newMemberData.notes || '',
          email: newMemberData.email || '',
          phone: newMemberData.phone || '',
          epp: typeof newMemberData.epp === 'string' ? newMemberData.epp.split(',').map(e => e.trim()).filter(e => e !== '') : (newMemberData.epp || [])
        };
        await setDoc(doc(db, 'members', newId), newMem);
      }

      // Auto-seleccionar la persona recién creada en el formulario del Capacitador
      if (editingTrainer) {
        setEditingTrainer({
          ...editingTrainer,
          directoryId: newId
        });
      }

      // Resetear campos y cerrar submodal
      setNewMemberData(initialNewMemberData);
      setShowCreateMemberModal(false);
    } catch (err: any) {
      console.error('Error creando persona en directorio:', err);
      alert('Error al crear la persona. Por favor intenta de nuevo.');
    } finally {
      setIsSavingMember(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Capacitadores
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de instructores internos y externos.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus size={16} />
          <span>Nuevo Capacitador</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o especialidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-black text-slate-500 tracking-wider">
              <tr>
                <th className="p-4">Capacitador</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Especialidades</th>
                <th className="p-4">Costo / Hora</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrainers.map((trainer, trIdx) => {
                const member = getMemberInfo(trainer.directoryId);
                return (
                  <tr key={`trainer_row_${trainer.id || trIdx}_${trIdx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div 
                        onClick={() => setViewingTrainer(trainer)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="relative">
                          <img
                            src={member?.avatar || `https://picsum.photos/seed/${(member?.name || 'Trainer').replace(/\s/g, '')}/100/100`}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            trainer.type === 'interno' ? 'bg-indigo-600' : 'bg-amber-500'
                          }`} />
                        </div>
                        <div>
                          <span className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors block">
                            {member?.name || 'Persona Desconocida'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {member?.role || 'Capacitador'} {trainer.relationshipType ? `• ${trainer.relationshipType.replace('_', ' ')}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        trainer.type === 'interno' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {trainer.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="max-w-[220px]">
                        <span className="text-xs font-bold text-slate-700 block truncate">{trainer.specialties || '-'}</span>
                        {trainer.teachingInterests && (
                          <span className="text-[10px] text-emerald-600 font-medium block truncate">
                            🎯 {trainer.teachingInterests}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      ${trainer.hourlyRate?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setViewingTrainer(trainer)}
                          title="Ver Ficha Integral"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(trainer)}
                          title="Editar Ficha"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('¿Está seguro de eliminar este capacitador?')) {
                              onDeleteTrainer(trainer.id);
                            }
                          }}
                          title="Eliminar"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTrainers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No se encontraron capacitadores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && editingTrainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-lg text-slate-800">
                  {editingTrainer.id ? 'Editar Capacitador' : 'Nuevo Capacitador'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="trainer-form" onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users size={14} /> Tipo
                      </label>
                      <select
                        value={editingTrainer.type || 'interno'}
                        onChange={e => setEditingTrainer({ ...editingTrainer, type: e.target.value as 'interno'|'externo' })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="interno">Interno</option>
                        <option value="externo">Externo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <DollarSign size={14} /> Costo / Hora ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingTrainer.hourlyRate || ''}
                        onChange={e => setEditingTrainer({ ...editingTrainer, hourlyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <User size={14} className="text-indigo-600" /> Persona del Directorio <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewMemberData(initialNewMemberData);
                          setShowCreateMemberModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                      >
                        <UserPlus size={13} />
                        Nueva Persona en Directorio
                      </button>
                    </div>
                    <select
                      required
                      value={editingTrainer.directoryId || ''}
                      onChange={e => setEditingTrainer({ ...editingTrainer, directoryId: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Seleccione una persona del directorio...</option>
                      {members.map((m, mIdx) => (
                        <option key={`trainers_modal_m_opt_${m.id || mIdx}_${mIdx}`} value={m.id}>
                          {m.name} {m.role ? `(${m.role})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <GraduationCap size={14} /> Especialidades (Separadas por comas)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Liderazgo, Ventas B2B, Seguridad..."
                      value={editingTrainer.specialties || ''}
                      onChange={e => setEditingTrainer({ ...editingTrainer, specialties: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users size={14} /> Tipo de Relación
                      </label>
                      <select
                        value={editingTrainer.relationshipType || 'aliado_estrategico'}
                        onChange={e => setEditingTrainer({ ...editingTrainer, relationshipType: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="aliado_estrategico">Aliado Estratégico</option>
                        <option value="planta">Instructor de Planta</option>
                        <option value="honorarios">Docente por Honorarios</option>
                        <option value="proveedor_frecuente">Proveedor Frecuente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Layers size={14} /> Modalidad Preferida
                      </label>
                      <select
                        value={editingTrainer.preferredModality || 'presencial'}
                        onChange={e => setEditingTrainer({ ...editingTrainer, preferredModality: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="presencial">Presencial (In-situ)</option>
                        <option value="virtual">Virtual / Online</option>
                        <option value="hibrido">Híbrido</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2 text-emerald-700">
                      <Heart size={14} /> ¿Qué sabe y le gusta enseñar?
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Temas, metodologías, dinámicas o cursos en los que más disfruta capacitar..."
                      value={editingTrainer.teachingInterests || ''}
                      onChange={e => setEditingTrainer({ ...editingTrainer, teachingInterests: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2 text-rose-700">
                      <ThumbsDown size={14} /> ¿Qué no le gusta / Restricciones?
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Temas que no domina, limitaciones de horarios, tamaños de grupos o exigencias especiales..."
                      value={editingTrainer.teachingDislikes || ''}
                      onChange={e => setEditingTrainer({ ...editingTrainer, teachingDislikes: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MessageSquare size={14} className="text-indigo-600" /> Acuerdos & Notas de Relación Institucional
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Condiciones de pago, viáticos, historial de acuerdos o notas estratégicas..."
                      value={editingTrainer.relationshipNotes || ''}
                      onChange={e => setEditingTrainer({ ...editingTrainer, relationshipNotes: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="trainer-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-500/20"
                >
                  Guardar Capacitador
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ficha Integral del Capacitador */}
      <AnimatePresence>
        {viewingTrainer && (
          <TrainerDetailModal
            trainer={viewingTrainer}
            member={getMemberInfo(viewingTrainer.directoryId)}
            company={getCompanyForMember(getMemberInfo(viewingTrainer.directoryId))}
            process={getProcessForMember(getMemberInfo(viewingTrainer.directoryId))}
            plans={plans}
            spaces={spaces}
            onClose={() => setViewingTrainer(null)}
            onEdit={(tr) => {
              setViewingTrainer(null);
              handleOpenModal(tr);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal para Crear Persona en Directorio (Oficial con MemberEditorView) */}
      <AnimatePresence>
        {showCreateMemberModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-5xl my-auto max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl"
            >
              <MemberEditorView
                editingMember={null}
                newMemberData={newMemberData}
                setNewMemberData={setNewMemberData}
                processes={processes}
                companies={companies}
                roles={roles}
                onCancel={() => setShowCreateMemberModal(false)}
                onSave={handleCreateMember}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
