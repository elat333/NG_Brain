const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\(newTaskData\.deliverables && newTaskData\.deliverables\.length > 0\) \? \([\s\S]*?No hay links de entrega añadidos\.<\/p>\s*<\/div>\s*\)\}/;
const match = code.match(regex);

if(match) {
  const newDeliverables = `{(newTaskData.deliverables && newTaskData.deliverables.length > 0) ? (
                                <div className="space-y-3">
                                  {newTaskData.deliverables.map((del, idx) => (
                                    <div key={del.id} className="flex gap-3 items-start bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                          <LinkIcon size={12} className="text-blue-400 shrink-0" />
                                          <input
                                            type="text"
                                            placeholder="URL del entregable (ej. Figma, Docs...)"
                                            disabled={!canEditExecution}
                                            className={\`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs \${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}\`}
                                            value={del.url}
                                            onChange={e => {
                                              const newDel = [...newTaskData.deliverables];
                                              newDel[idx].url = e.target.value;
                                              setNewTaskData({ ...newTaskData, deliverables: newDel });
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <FolderKanban size={12} className="text-orange-400 shrink-0" />
                                          <input
                                            type="text"
                                            placeholder="Ubicación en Drive (Ruta o carpeta)..."
                                            disabled={!canEditExecution}
                                            className={\`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs \${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}\`}
                                            value={del.folderLocation || ''}
                                            onChange={e => {
                                              const newDel = [...newTaskData.deliverables];
                                              newDel[idx].folderLocation = e.target.value;
                                              setNewTaskData({ ...newTaskData, deliverables: newDel });
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <AlignLeft size={12} className="text-gray-400 shrink-0" />
                                          <input
                                            type="text"
                                            placeholder="Descripción breve (opcional)..."
                                            disabled={!canEditExecution}
                                            className={\`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs \${!canEditExecution ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}\`}
                                            value={del.description || ''}
                                            onChange={e => {
                                              const newDel = [...newTaskData.deliverables];
                                              newDel[idx].description = e.target.value;
                                              setNewTaskData({ ...newTaskData, deliverables: newDel });
                                            }}
                                          />
                                        </div>
                                      </div>
                                      {canEditExecution && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newDel = newTaskData.deliverables.filter((_, i) => i !== idx);
                                            setNewTaskData({ ...newTaskData, deliverables: newDel });
                                          }}
                                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1 shrink-0"
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

  code = code.replace(match[0], newDeliverables);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced deliverables section.");
} else {
  console.log("Could not find deliverables section.");
}
