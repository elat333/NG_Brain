import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  Users, 
  Building2 
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  db, 
  OperationType, 
  handleFirestoreError 
} from '../../lib/firebase';
import { TeamMember, Process, ExtractedUpdates } from '../../types';
import { analyzeTranscript } from '../../services/aiService';

interface TranscriptViewProps {
  members: TeamMember[];
  processes: Process[];
  onNavigateToDashboard?: () => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  members,
  processes,
  onNavigateToDashboard,
}) => {
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedUpdates, setExtractedUpdates] = useState<ExtractedUpdates | null>(null);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    try {
      const updates = await analyzeTranscript(transcript, members, processes);
      setExtractedUpdates(updates);
    } catch (error) {
      console.error('Analysis failed', error);
      alert('Hubo un error al analizar la transcripción.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyUpdates = async () => {
    if (!extractedUpdates) return;

    try {
      // Apply member updates
      for (const update of extractedUpdates.memberUpdates) {
        const member = members.find(m => m.id === update.memberId);
        if (member) {
          await updateDoc(doc(db, 'members', member.id), {
            role: update.roleUpdate || member.role,
            skills: Array.from(new Set([...member.skills, ...(update.newSkills || [])])),
            responsibilities: Array.from(new Set([...member.responsibilities, ...(update.newResponsibilities || [])])),
            epp: Array.from(new Set([...(member.epp || []), ...(update.epp || [])])),
            recentAchievements: [...(update.achievements || []), ...member.recentAchievements].slice(0, 5)
          });
        }
      }

      // Apply process updates
      for (const update of extractedUpdates.processUpdates) {
        const proc = processes.find(p => p.id === update.processId);
        if (proc) {
          await updateDoc(doc(db, 'processes', proc.id), {
            description: update.descriptionUpdate || proc.description,
            goals: Array.from(new Set([...proc.goals, ...(update.newGoals || [])]))
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'extracted_updates');
    }

    setExtractedUpdates(null);
    setTranscript('');
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    }
  };

  return (
    <motion.div 
      key="transcript_view_container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto"
    >
      {!extractedUpdates ? (
        <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Procesador de Transcripciones</h2>
              <p className="text-gray-500 text-sm">IA analiza el contexto de las conversaciones corporativas.</p>
            </div>
          </div>

          <textarea 
            className="w-full h-80 p-6 bg-gray-50 border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none text-gray-700 leading-relaxed font-mono text-sm"
            placeholder="Pega aquí la transcripción de la reunión (Voz a Texto, Zoom, Teams, etc.)..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />

          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs text-gray-400 max-w-sm">
              La IA buscará menciones de habilidades, cambios en roles, responsabilidades asignadas y actualizaciones de departamentos.
            </p>
            <button 
              onClick={handleAnalyze}
              disabled={!transcript.trim() || isAnalyzing}
              className={`px-8 py-4 bg-[#2563EB] text-white font-bold rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${(!transcript.trim() || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-200'}`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analizando Contexto...
                </>
              ) : (
                <>
                  Extraer Insights
                  <Sparkles size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-[#E5E7EB]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Insights Encontrados</h2>
                <p className="text-gray-500 text-sm">Revisa los cambios propuestos antes de aplicarlos.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setExtractedUpdates(null)}
                className="px-6 py-3 text-gray-500 font-semibold hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={applyUpdates}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all hover:scale-105 active:scale-95"
              >
                Aplicar Cambios
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-gray-700 px-2">
                <Users size={18} /> Miembros Actualizados ({extractedUpdates.memberUpdates.length})
              </h3>
              {extractedUpdates.memberUpdates.length === 0 && (
                <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                  No se detectaron cambios para miembros específicos.
                </div>
              )}
              {extractedUpdates.memberUpdates.map((u, uIdx) => {
                const member = members.find(m => m.id === u.memberId);
                return (
                  <div key={`trans_member_${u.memberId || uIdx}_${uIdx}`} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                      <img src={member?.avatar} alt={member?.name} className="w-10 h-10 rounded-full" />
                      <span className="font-bold">{member?.name}</span>
                    </div>
                    <div className="space-y-3">
                      {u.newSkills && u.newSkills.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-blue-500 block mb-1">Nuevas Habilidades</span>
                          <div className="flex flex-wrap gap-2">
                            {u.newSkills.map((s, idx) => <span key={`skill_${s}_${idx}`} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">{s}</span>)}
                          </div>
                        </div>
                      )}
                      {u.achievements && u.achievements.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-green-500 block mb-1">Logros</span>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {u.achievements.map((a, idx) => <li key={`ach_${a}_${idx}`} className="flex gap-2"><span>•</span> {a}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-gray-700 px-2">
                <Building2 size={18} /> Procesos Actualizados ({extractedUpdates.processUpdates.length})
              </h3>
              {extractedUpdates.processUpdates.length === 0 && (
                <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                  No se detectaron cambios para los procesos.
                </div>
              )}
              {extractedUpdates.processUpdates.map((u, pIdx) => {
                const proc = processes.find(p => p.id === u.processId);
                return (
                  <div key={`trans_proc_${u.processId || pIdx}_${pIdx}`} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="font-bold">{proc?.name}</span>
                    </div>
                    <div className="space-y-3">
                      {u.descriptionUpdate && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-purple-500 block mb-1">Actualización de Misión</span>
                          <p className="text-xs text-gray-600">"{u.descriptionUpdate}"</p>
                        </div>
                      )}
                      {u.newGoals && u.newGoals.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-orange-500 block mb-1">Nuevos Objetivos</span>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {u.newGoals.map((g, idx) => <li key={`goal_${g}_${idx}`} className="flex gap-2"><span>•</span> {g}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </motion.div>
  );
};
