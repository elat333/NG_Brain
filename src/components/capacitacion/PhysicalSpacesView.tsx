import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Search, Edit2, Trash2, X, Users, Map } from 'lucide-react';
import { TrainingSpace } from '../../types';

interface PhysicalSpacesViewProps {
  spaces: TrainingSpace[];
  onSaveSpace: (space: Partial<TrainingSpace>) => Promise<void>;
  onDeleteSpace: (id: string) => Promise<void>;
}

export const PhysicalSpacesView: React.FC<PhysicalSpacesViewProps> = ({ spaces, onSaveSpace, onDeleteSpace }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Partial<TrainingSpace> | null>(null);

  const physicalSpaces = spaces.filter(s => s.type === 'fisico');
  const cities = Array.from(new Set(physicalSpaces.map(s => s.city).filter(Boolean)));

  const filteredSpaces = physicalSpaces.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = cityFilter ? s.city === cityFilter : true;
    return matchesSearch && matchesCity;
  });

  const handleOpenModal = (space?: TrainingSpace) => {
    if (space) {
      setEditingSpace(space);
    } else {
      setEditingSpace({ type: 'fisico', name: '', capacity: 0, city: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSpace) {
      await onSaveSpace(editingSpace);
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Lugares de Capacitación (Físicos)
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de salas, auditorios y locaciones.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus size={16} />
          <span>Nuevo Lugar</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full sm:w-48 bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Todas las ciudades</option>
              {cities.map(city => (
                <option key={city as string} value={city as string}>{city}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-black text-slate-500 tracking-wider">
              <tr>
                <th className="p-4">Lugar</th>
                <th className="p-4">Ciudad</th>
                <th className="p-4">Capacidad</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSpaces.map(space => (
                <tr key={space.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{space.name}</td>
                  <td className="p-4 text-slate-600">{space.city || '-'}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider inline-flex">
                      <Users size={12} /> {space.capacity || 0} pax
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(space)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('¿Eliminar este lugar?')) onDeleteSpace(space.id);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSpaces.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No se encontraron lugares.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && editingSpace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-lg text-slate-800">
                  {editingSpace.id ? 'Editar Lugar' : 'Nuevo Lugar Físico'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="space-form" onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Nombre de la Sala / Lugar
                    </label>
                    <input
                      type="text"
                      required
                      value={editingSpace.name}
                      onChange={e => setEditingSpace({ ...editingSpace, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Map size={14} /> Ciudad
                      </label>
                      <input
                        type="text"
                        required
                        value={editingSpace.city || ''}
                        onChange={e => setEditingSpace({ ...editingSpace, city: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users size={14} /> Capacidad (Personas)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingSpace.capacity || ''}
                        onChange={e => setEditingSpace({ ...editingSpace, capacity: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Notas o Descripción Adicional
                    </label>
                    <textarea
                      rows={3}
                      value={editingSpace.notes || ''}
                      onChange={e => setEditingSpace({ ...editingSpace, notes: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
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
                  form="space-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-500/20"
                >
                  Guardar Lugar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
