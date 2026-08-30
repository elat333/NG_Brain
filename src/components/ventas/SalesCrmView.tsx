import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Search, Edit2, Trash2, X, Building, Mail, Phone, Tag, User } from 'lucide-react';
import { SalesClient, Company, TeamMember } from '../../types';

interface SalesCrmViewProps {
  clients: SalesClient[];
  companies: Company[];
  members: TeamMember[];
  onSaveClient: (client: Partial<SalesClient>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onCreateCompany?: (company: Partial<Company>) => Promise<string>;
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
}

export const SalesCrmView: React.FC<SalesCrmViewProps> = ({ clients, companies, members, onSaveClient, onDeleteClient, onCreateCompany, onCreateMember }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<SalesClient> | null>(null);
  const [isCreatingNewEntity, setIsCreatingNewEntity] = useState(false);
  const [newEntityData, setNewEntityData] = useState({ name: '', email: '', phone: '', ruc: '' });


  const getEntityInfo = (client: SalesClient) => {
    if (client.clientType === 'B2B') {
      const company = companies.find(c => c.id === client.directoryId);
      return {
        name: company?.name || 'Empresa Desconocida',
        email: company?.email || '',
        phone: company?.phone || '',
        icon: <Building className="text-emerald-700" size={20} />
      };
    } else {
      const person = members.find(m => m.id === client.directoryId);
      return {
        name: person?.name || 'Persona Desconocida',
        email: person?.email || '',
        phone: person?.phone || '',
        icon: <User className="text-emerald-700" size={20} />
      };
    }
  };

  const filteredClients = clients.filter(c => {
    const info = getEntityInfo(c);
    return info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           info.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenModal = (client?: SalesClient) => {
    if (client) {
      setEditingClient(client);
    } else {
      setEditingClient({
        clientType: 'B2B', directoryId: '', status: 'prospecto'
      });
    }
    setIsCreatingNewEntity(false);
    setNewEntityData({ name: '', email: '', phone: '', ruc: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCreatingNewEntity) {
      if (!newEntityData.name) return alert('El nombre es requerido.');
      
      let newDirId = '';
      if (editingClient?.clientType === 'B2B' && onCreateCompany) {
        newDirId = await onCreateCompany({
          name: newEntityData.name,
          email: newEntityData.email,
          phone: newEntityData.phone,
          ruc: newEntityData.ruc
        });
      } else if (editingClient?.clientType === 'B2C' && onCreateMember) {
        newDirId = await onCreateMember({
          name: newEntityData.name,
          email: newEntityData.email,
          phone: newEntityData.phone,
          categories: ['contacto']
        });
      }
      
      if (newDirId) {
        await onSaveClient({ ...editingClient, directoryId: newDirId });
        handleCloseModal();
      }
    } else {
      if (editingClient && editingClient.directoryId) {
        await onSaveClient(editingClient);
        handleCloseModal();
      } else {
        alert("Por favor seleccione una entidad del directorio.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Directorio de Clientes
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestión de cuentas B2B y prospectos B2C vinculados al directorio.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={16} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-black text-slate-500 tracking-wider">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(client => {
                const info = getEntityInfo(client);
                return (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-lg">
                          {info.icon}
                        </div>
                        <span className="font-bold text-slate-800">{info.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider">
                        {client.clientType}
                      </span>
                    </td>
                    <td className="p-4 space-y-1">
                      {info.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail size={12} className="text-slate-400" />
                          {info.email}
                        </div>
                      )}
                      {info.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          {info.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        client.status === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        client.status === 'prospecto' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(client)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('¿Está seguro de eliminar este cliente?')) {
                              onDeleteClient(client.id);
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
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && editingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-lg text-slate-800">
                  {editingClient.id ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="client-form" onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users size={14} /> Tipo de Cliente
                      </label>
                      <select
                        value={editingClient.clientType || 'B2B'}
                        onChange={e => setEditingClient({ ...editingClient, clientType: e.target.value as 'B2B'|'B2C', directoryId: '' })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="B2B">B2B (Empresa)</option>
                        <option value="B2C">B2C (Persona)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Tag size={14} /> Estado
                      </label>
                      <select
                        value={editingClient.status || 'prospecto'}
                        onChange={e => setEditingClient({ ...editingClient, status: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="prospecto">Prospecto</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="createNewEntity" 
                      checked={isCreatingNewEntity} 
                      onChange={(e) => setIsCreatingNewEntity(e.target.checked)} 
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="createNewEntity" className="text-sm font-bold text-slate-700">
                      Crear nueva entidad en el directorio ({editingClient.clientType === 'B2B' ? 'Empresa' : 'Persona'})
                    </label>
                  </div>

                  {!isCreatingNewEntity ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Building size={14} /> Entidad del Directorio
                      </label>
                      <select
                        required={!isCreatingNewEntity}
                        value={editingClient.directoryId || ''}
                        onChange={e => setEditingClient({ ...editingClient, directoryId: e.target.value })}
                        className="w-full bg-white border border-slate-200 text-sm font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="">Seleccione...</option>
                        {editingClient.clientType === 'B2B' 
                          ? companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                          : members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                        }
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl">
                      <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-2">Datos para el Directorio</h4>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                        <input
                          type="text"
                          required={isCreatingNewEntity}
                          value={newEntityData.name}
                          onChange={e => setNewEntityData({...newEntityData, name: e.target.value})}
                          className="w-full bg-white border border-slate-200 text-sm p-2 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={newEntityData.email}
                            onChange={e => setNewEntityData({...newEntityData, email: e.target.value})}
                            className="w-full bg-white border border-slate-200 text-sm p-2 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                          <input
                            type="tel"
                            value={newEntityData.phone}
                            onChange={e => setNewEntityData({...newEntityData, phone: e.target.value})}
                            className="w-full bg-white border border-slate-200 text-sm p-2 rounded-lg"
                          />
                        </div>
                      </div>
                      {editingClient.clientType === 'B2B' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">RUC (Opcional)</label>
                          <input
                            type="text"
                            value={newEntityData.ruc}
                            onChange={e => setNewEntityData({...newEntityData, ruc: e.target.value})}
                            className="w-full bg-white border border-slate-200 text-sm p-2 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}

                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="client-form"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-md shadow-emerald-500/20"
                >
                  Guardar Cliente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
