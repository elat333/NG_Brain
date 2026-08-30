const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">([\s\S]*?)<\/div>\s*\{\/\* Section: Split Description/;
const match = code.match(regex);

if(match) {
  const newSection = `
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* BLOQUE 1: PLANIFICACIÓN Y LÍMITES */}
      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
          <Calendar size={12} className="text-gray-400" /> Planificación y Límites
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5" title="Solo el líder de proceso o administrador puede cambiar esta fecha">
              <Calendar size={12} className="text-red-500" /> Fecha Límite
              {!canEditPlanning && <Lock size={10} className="text-gray-400 ml-auto" />}
            </label>
            <input 
              type="date" 
              disabled={!canEditPlanning}
              className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold \${
                !canEditPlanning ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
              }\`}
              value={newTaskData.dueDate || ''}
              onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
            />
          </div>
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Clock size={12} className="text-blue-500" /> Horas Planificadas
              {!canEditPlanning && <Lock size={10} className="text-gray-400 ml-auto" />}
            </label>
            <select 
              disabled={!canEditPlanning}
              className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold appearance-none \${
                !canEditPlanning ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer'
              }\`}
              value={newTaskData.plannedHours}
              onChange={e => setNewTaskData({...newTaskData, plannedHours: parseFloat(e.target.value) || 0})}
            >
              <option value="0">Sin horas</option>
              {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40].map(num => (
                <option key={num} value={num}>
                  {num === 0.5 ? '0.5 horas' : num === 1 ? '1 hora' : \`\${num} horas\`}
                </option>
              ))}
            </select>
          </div>
          
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} className="text-sky-500" /> Fecha Planificada (A realizar)
              </label>
              {!showTimeInputs && canEditExecution && (
                <button 
                  type="button" 
                  onClick={() => setShowTimeInputs(true)}
                  className="text-[9px] font-black uppercase text-blue-500 hover:text-blue-600 flex items-center gap-0.5 transition-colors"
                >
                  <Plus size={10} /> Agregar Horario
                </button>
              )}
            </div>
            <input 
              type="date" 
              disabled={!canEditExecution}
              className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold \${
                !canEditExecution ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
              }\`}
              value={newTaskData.plannedDate || ''}
              onChange={e => setNewTaskData({...newTaskData, plannedDate: e.target.value})}
            />
          </div>
          
          {showTimeInputs && (
            <>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-400" /> Hora Inicio
                </label>
                <input 
                  type="time" 
                  disabled={!canEditExecution}
                  className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold \${
                    !canEditExecution ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
                  }\`}
                  value={newTaskData.plannedStartTime || ''}
                  onChange={e => setNewTaskData({...newTaskData, plannedStartTime: e.target.value})}
                />
              </div>
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" /> Hora Fin
                  </label>
                  {canEditExecution && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowTimeInputs(false);
                        setNewTaskData({...newTaskData, plannedStartTime: '', plannedEndTime: ''});
                      }}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <input 
                  type="time" 
                  disabled={!canEditExecution}
                  className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold \${
                    !canEditExecution ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
                  }\`}
                  value={newTaskData.plannedEndTime || ''}
                  onChange={e => setNewTaskData({...newTaskData, plannedEndTime: e.target.value})}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* BLOQUE 2: EJECUCIÓN REAL */}
      <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-4 shadow-sm shadow-blue-900/5">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 mb-2">
          <CheckCircle2 size={12} className="text-blue-500" /> Ejecución Real
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Calendar size={12} className="text-emerald-500" /> Entregado el...
              {!canEditExecution && <Lock size={10} className="text-gray-300 ml-auto" />}
            </label>
            <input 
              type="date" 
              disabled={!canEditExecution}
              className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold \${
                !canEditExecution ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
              }\`}
              value={newTaskData.actualEndDate || ''}
              onChange={e => setNewTaskData({...newTaskData, actualEndDate: e.target.value})}
            />
          </div>
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Activity size={12} className="text-green-500" /> Horas Reales
              {!canEditExecution && <Lock size={10} className="text-gray-300 ml-auto" />}
            </label>
            <input 
              type="number" 
              min="0"
              step="0.5"
              disabled={!canEditExecution}
              className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold \${
                !canEditExecution ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm'
              }\`}
              value={newTaskData.actualHours}
              onChange={e => setNewTaskData({...newTaskData, actualHours: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>
      </div>
    </div>
    {/* Section: Split Description`;
    
  code = code.replace(match[0], newSection);
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("No match found for dates modal UI.");
}
