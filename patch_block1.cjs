const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\/\* BLOQUE 1: PLANIFICACIÓN Y LÍMITES \*\/\}[\s\S]*?\{\/\* BLOQUE 2: EJECUCIÓN REAL \*\/\}/;
const match = code.match(regex);

if(match) {
  const newBlock1 = `{/* BLOQUE 1: PLANIFICACIÓN Y LÍMITES */}
      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
          <Calendar size={12} className="text-gray-400" /> Planificación y Límites
        </h4>
        
        {/* FILA 1: Fecha Planificada | Horas Planificadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Calendar size={12} className="text-sky-500" /> Fecha Planificada (A realizar)
            </label>
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
        </div>

        {/* FILA 2: Fecha Límite | Horario Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className={\`space-y-2 relative flex-1 p-3 -m-3 rounded-xl border transition-colors \${!canEditPlanning ? 'bg-red-50/40 border-red-50/50' : 'bg-red-50/80 border-red-100'}\`}>
            <label className="text-[10px] font-bold text-red-600 uppercase tracking-wider ml-1 flex items-center gap-1.5" title="Solo el líder de proceso o administrador puede cambiar esta fecha">
              <Calendar size={12} className="text-red-500" /> Fecha Límite
              {!canEditPlanning && <Lock size={10} className="text-red-300 ml-auto" />}
            </label>
            <input 
              type="date" 
              disabled={!canEditPlanning}
              className={\`w-full px-2.5 py-2 border rounded-lg focus:outline-none transition-all text-xs font-bold \${
                !canEditPlanning ? 'bg-red-50/50 text-red-400/80 cursor-not-allowed border-red-200/40' : 'bg-white border-red-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-sm text-red-700'
              }\`}
              value={newTaskData.dueDate || ''}
              onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
            />
          </div>

          {!showTimeInputs && canEditExecution ? (
            <div className="flex-1 pb-1">
              <button 
                type="button" 
                onClick={() => setShowTimeInputs(true)}
                className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100"
              >
                <Plus size={14} /> Agregar Horario
              </button>
            </div>
          ) : !showTimeInputs && !canEditExecution ? (
            <div className="flex-1"></div>
          ) : (
            <>
              <div className="space-y-2 relative flex-1">
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
              <div className="space-y-2 relative flex-1">
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
                      className="text-red-400 hover:text-red-500 bg-red-50 hover:bg-red-100 p-1 rounded-md transition-colors"
                      title="Quitar Horario"
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

      {/* BLOQUE 2: EJECUCIÓN REAL */}`;

  code = code.replace(match[0], newBlock1);
  fs.writeFileSync('src/App.tsx', code);
}
