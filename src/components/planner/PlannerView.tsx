import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Sparkles, 
  ListTodo, 
  Plus, 
  Trash 
} from 'lucide-react';
import { TeamMember, Process, SuggestedActivity } from '../../types';
import { getPlanningSuggestions } from '../../services/aiService';

interface PlannerViewProps {
  members: TeamMember[];
  processes: Process[];
  onCreateActivityAsTask: (activity: SuggestedActivity) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  members,
  processes,
  onCreateActivityAsTask,
}) => {
  const [plannerInput, setPlannerInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [suggestedActivities, setSuggestedActivities] = useState<SuggestedActivity[]>([]);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'es-ES';

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setPlannerInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
    } else {
      setPlannerInput('');
      recognition?.start();
      setIsRecording(true);
    }
  };

  const handlePlanningAnalysis = async () => {
    if (!plannerInput.trim()) return;
    setIsPlanning(true);
    try {
      const suggestions = await getPlanningSuggestions(plannerInput, members, processes);
      setSuggestedActivities(suggestions);
    } catch (error) {
      console.error('Planning analysis failed', error);
    } finally {
      setIsPlanning(false);
    }
  };

  const deleteSuggestedActivity = (id: string) => {
    if (window.confirm('¿Realmente deseas borrar esta actividad sugerida?')) {
      setSuggestedActivities(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <motion.div 
      key="planner_view_container"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-12">
          <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Calendar size={120} />
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Planificación Semanal con IA</h2>
                  <p className="text-gray-500 text-sm">Habla o escribe tus planes para que Gemini sugiera actividades accionables.</p>
                </div>
              </div>

              <div className="relative">
                <textarea 
                  className="w-full h-48 p-6 bg-gray-50 border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none text-gray-700 leading-relaxed text-lg"
                  placeholder="Ej: Esta semana quiero lanzar el nuevo dashboard, Elena se encargará del frontend y Lucas del SEO..."
                  value={plannerInput}
                  onChange={(e) => setPlannerInput(e.target.value)}
                />
                
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <button 
                    onClick={toggleRecording}
                    className={`p-4 rounded-full transition-all shadow-lg flex items-center justify-center ${
                      isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'
                    }`}
                    title={isRecording ? 'Detener Grabación' : 'Iniciar Grabación de Voz'}
                  >
                    {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  
                  <button 
                    onClick={handlePlanningAnalysis}
                    disabled={!plannerInput.trim() || isPlanning}
                    className={`px-8 py-4 bg-[#2563EB] text-white font-bold rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      (!plannerInput.trim() || isPlanning) ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-200'
                    }`}
                  >
                    {isPlanning ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        Generar Actividades
                        <Sparkles size={20} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions Section */}
        <div className="lg:col-span-12">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <ListTodo size={18} className="text-[#2563EB]" />
              Actividades Sugeridas ({suggestedActivities.length})
            </h3>
          </div>

          {suggestedActivities.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#E5E7EB] text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                <Sparkles size={32} />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">No hay sugerencias aún</h4>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">Escribe o graba tus planes arriba para ver cómo Gemini los organiza en tareas.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedActivities.map((activity, actIdx) => (
                <motion.div 
                  key={`planner_act_${activity.id || actIdx}_${actIdx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all group border-l-4 border-l-blue-500"
                >
                  <div className="flex justify-between items-start mb-3">
                    {activity.suggestedDay && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                        {activity.suggestedDay}
                      </span>
                    )}
                    <div className="flex gap-2">
                      {activity.memberId && (
                        <img 
                          src={members.find(m => m.id === activity.memberId)?.avatar} 
                          className="w-6 h-6 rounded-full border border-gray-100" 
                          title={members.find(m => m.id === activity.memberId)?.name}
                        />
                      )}
                      {activity.processId && (
                        <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 text-[10px] font-bold">
                          {processes.find(p => p.id === activity.processId)?.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-gray-900 mb-2">{activity.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-6 flex-1">
                    {activity.description}
                  </p>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => onCreateActivityAsTask(activity)}
                      className="flex-1 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 hover:text-white transition-all border border-gray-100"
                    >
                      <Plus size={18} />
                      Crear como Tarea
                    </button>
                    <button 
                      onClick={() => deleteSuggestedActivity(activity.id)}
                      className="px-4 py-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-gray-100"
                      title="Borrar sugerencia"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
