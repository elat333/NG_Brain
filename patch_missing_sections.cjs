const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /onChange={e => setNewTaskData\(\{\.\.\.newTaskData, storyDescription: e\.target\.value\}\)}\s*\/>\s*\{\!canEditStoryAndCriteria && \(\s*<span className="text-\[8px\] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder \/ Administrador<\/span>\s*\)\}\s*<\/div>/;
const match = code.match(regex);

if(match) {
  const newSections = `onChange={e => setNewTaskData({...newTaskData, storyDescription: e.target.value})}
                              />
                              {!canEditStoryAndCriteria && (
                                <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder / Administrador</span>
                              )}
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                <CheckSquare size={14} className="text-emerald-500" /> Criterios de Aceptación
                              </label>
                              <textarea 
                                placeholder="Lista de criterios requeridos para dar por finalizada la tarea..."
                                disabled={!canEditStoryAndCriteria}
                                className={\`w-full h-24 px-6 py-4 border-2 border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none text-sm leading-relaxed shadow-sm placeholder:text-gray-300 \${
                                  !canEditStoryAndCriteria ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                                }\`}
                                value={newTaskData.acceptanceCriteria || ''}
                                onChange={e => setNewTaskData({...newTaskData, acceptanceCriteria: e.target.value})}
                              />
                            </div>

                            {/* Section: Deliverables */}
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                  <LinkIcon size={14} className="text-blue-500" /> Links para entrega de productos
                                </label>
                                {canEditExecution && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newDeliverables = [...(newTaskData.deliverables || []), { id: Date.now().toString(), url: '', description: '' }];
                                      setNewTaskData({ ...newTaskData, deliverables: newDeliverables });
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                  >
                                    <Plus size={14} /> Añadir Link
                                  </button>
                                )}
                              </div>

                              {(newTaskData.deliverables && newTaskData.deliverables.length > 0) ? (
                                <div className="space-y-3">
                                  {newTaskData.deliverables.map((del, idx) => (
                                    <div key={del.id} className="flex gap-3 items-start bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                                      <div className="flex-1 space-y-2">
                                        <input
                                          type="text"
                                          placeholder="URL del entregable (ej. Figma, Docs, Drive...)"
                                          disabled={!canEditExecution}
                                          className={\`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs \${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}\`}
                                          value={del.url}
                                          onChange={e => {
                                            const newDel = [...newTaskData.deliverables];
                                            newDel[idx].url = e.target.value;
                                            setNewTaskData({ ...newTaskData, deliverables: newDel });
                                          }}
                                        />
                                        <input
                                          type="text"
                                          placeholder="Descripción breve (opcional)..."
                                          disabled={!canEditExecution}
                                          className={\`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs \${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}\`}
                                          value={del.description}
                                          onChange={e => {
                                            const newDel = [...newTaskData.deliverables];
                                            newDel[idx].description = e.target.value;
                                            setNewTaskData({ ...newTaskData, deliverables: newDel });
                                          }}
                                        />
                                      </div>
                                      {canEditExecution && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newDel = newTaskData.deliverables.filter((_, i) => i !== idx);
                                            setNewTaskData({ ...newTaskData, deliverables: newDel });
                                          }}
                                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1"
                                          title="Eliminar entregable"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                                  <p className="text-xs font-medium text-gray-400">No hay links de entrega añadidos.</p>
                                </div>
                              )}`;
  
  code = code.replace(match[0], newSections);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully restored acceptance criteria and deliverables.");
} else {
  console.log("Could not match the replacement point.");
}
