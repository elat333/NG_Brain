import React from 'react';
import { Company, TeamMember, MemberDraft, Process } from '../../types';
import { Sparkles, Bot, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalModalsProps {
  // Member Assistant Modal
  isMemberAssistantOpen: boolean;
  setIsMemberAssistantOpen: (open: boolean) => void;
  memberAssistantInput: string;
  setMemberAssistantInput: (input: string) => void;
  isAnalyzingMemberInput: boolean;
  handleMemberAssistantAnalyze: () => void;
  suggestedMemberDraft: MemberDraft | null;
  applyMemberDraft: () => void;

  // Member Delete Confirmation Modal
  memberToDelete: TeamMember | null;
  setMemberToDelete: (member: TeamMember | null) => void;
  confirmDeleteMember: () => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  isMemberAssistantOpen,
  setIsMemberAssistantOpen,
  memberAssistantInput,
  setMemberAssistantInput,
  isAnalyzingMemberInput,
  handleMemberAssistantAnalyze,
  suggestedMemberDraft,
  applyMemberDraft,
  memberToDelete,
  setMemberToDelete,
  confirmDeleteMember,
}) => {
  return (
    <>
      {/* Member Assistant Modal */}
      <AnimatePresence>
        {isMemberAssistantOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-indigo-600">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">Asistente IA de Miembros</h3>
                    <p className="text-xs text-gray-400">Actualiza o crea perfiles mediante lenguaje natural</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMemberAssistantOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="py-4 flex-1 overflow-y-auto space-y-4">
                <p className="text-xs text-gray-500">
                  Describe los cambios o la información del nuevo miembro. Por ejemplo: <em>&quot;Añade a Juan Perez como Desarrollador en Tecnología, con habilidades en React y Node.js&quot;</em>.
                </p>
                <textarea
                  value={memberAssistantInput}
                  onChange={(e) => setMemberAssistantInput(e.target.value)}
                  placeholder="Escribe aquí las instrucciones para el asistente..."
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />

                {suggestedMemberDraft && (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {suggestedMemberDraft.type === 'create' ? 'Creación sugerida' : 'Actualización sugerida'}
                    </span>
                    <pre className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-indigo-100/50 overflow-x-auto">
                      {JSON.stringify(suggestedMemberDraft.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMemberAssistantOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                {suggestedMemberDraft ? (
                  <button
                    type="button"
                    onClick={applyMemberDraft}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200"
                  >
                    Aplicar Cambios
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleMemberAssistantAnalyze}
                    disabled={isAnalyzingMemberInput || !memberAssistantInput.trim()}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2"
                  >
                    {isAnalyzingMemberInput ? <Bot className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Analizar con IA
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-900 text-base">¿Eliminar Miembro?</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              ¿Estás seguro de que deseas eliminar a <strong>{memberToDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteMember}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-md shadow-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
