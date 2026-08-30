const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className="flex-1 space-y-2">[\s\S]*?<\/div>\s*\{canEditExecution && \(/;
const match = code.match(regex);

if (match) {
  const newLayout = `<div className="flex-1 space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-3">
                                          <div className="flex items-center gap-2 flex-1">
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
                                          <div className="flex items-center gap-2 flex-1">
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
                                      {canEditExecution && (`
                                      
  code = code.replace(match[0], newLayout);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Layout updated successfully.");
} else {
  console.log("Could not match regex.");
}
