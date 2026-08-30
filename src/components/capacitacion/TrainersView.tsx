import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Search, Edit2, Trash2, X, GraduationCap, DollarSign, User, UserPlus, AlertCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trainer, TeamMember } from '../../types';

interface TrainersViewProps {
  trainers: Trainer[];
  members: TeamMember[];
  onSaveTrainer: (trainer: Partial<Trainer>) => Promise<void>;
  onDeleteTrainer: (id: string) => Promise<void>;
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
}

export const TrainersView: React.FC<TrainersViewProps> = ({ trainers, members, onSaveTrainer, onDeleteTrainer, onCreateMember }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Partial<Trainer> | null>(null);

  // Modal para Crear Persona en Directorio (Flujo idéntico a Acreditaciones)
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const getMemberInfo = (directoryId: string) => {
    return members.find(m => m.id === directoryId);
  };

  const filteredTrainers = trainers.filter(t => {
    const member = getMemberInfo(t.directoryId);
    return member?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           t.specialties?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenModal = (trainer?: Trainer) => {
    if (trainer) {
      setEditingTrainer(trainer);
    } else {
      setEditingTrainer({
        type: 'interno',
        directoryId: '',
        specialties: '',
        hourlyRate: 0
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
    if (!newMemberName.trim()) {
      setMemberError('Ingresa el nombre y apellido de la persona');
      return;
    }
    setIsSavingMember(true);
    setMemberError('');

    try {
      let newId = '';
      if (onCreateMember) {
        newId = await onCreateMember({
          name: newMemberName.trim(),
          role: newMemberRole.trim() || 'Capacitador / Facilitador',
          categories: ['contacto'],
          email: newMemberEmail.trim() || undefined,
          phone: newMemberPhone.trim() || undefined
        });
      } else {
        newId = `mem-${Date.now()}`;
        const newMem: TeamMember = {
          id: newId,
          name: newMemberName.trim(),
          role: newMemberRole.trim() || 'Capacitador / Facilitador',
          categories: ['contacto'],
          skills: [],
          responsibilities: [],
          recentAchievements: [],
          email: newMemberEmail.trim() || undefined,
          phone: newMemberPhone.trim() || undefined,
          companyAssociations: []
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
      setNewMemberName('');
      setNewMemberRole('');
      setNewMemberEmail('');
      setNewMemberPhone('');
      setShowCreateMemberModal(false);
    } catch (err: any) {
      console.error('Error creando persona en directorio:', err);
      setMemberError('Error al crear la persona. Por favor intenta de nuevo.');
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
              {filteredTrainers.map(trainer => {
                const member = getMemberInfo(trainer.directoryId);
                return (
                  <tr key={trainer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-lg text-indigo-700">
                          <User size={20} />
                        </div>
                        <span className="font-bold text-slate-800">{member?.name || 'Persona Desconocida'}</span>
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
                      <span className="text-slate-600">{trainer.specialties || '-'}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      ${trainer.hourlyRate?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(trainer)}
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
                          setMemberError('');
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
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
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

      {/* Modal para Crear Persona en Directorio (Flujo Completo) */}
      <AnimatePresence>
        {showCreateMemberModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Crear Persona en Directorio</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Registra una nueva persona en el directorio y selecciónala al instante
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateMemberModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {memberError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{memberError}</span>
                </div>
              )}

              <form onSubmit={handleCreateMember} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Nombres y Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Juan Pérez"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Cargo / Rol en Directorio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Instructor Certificado / Docente Especialista"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="juan@email.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Teléfono / Celular
                    </label>
                    <input
                      type="text"
                      placeholder="0991234567"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateMemberModal(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingMember}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {isSavingMember ? 'Guardando...' : 'Crear y Seleccionar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
