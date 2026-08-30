const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStr = `                    </div>
                    
                    {!isReadOnly && (
                      <button `;

const newStr = `                    </div>
                    
                    <div className="relative">
                      <button onClick={() => setShowTaskMenu(!showTaskMenu)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase">
                        <MoreVertical size={13} /> Opciones
                      </button>
                      {showTaskMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                          <button onClick={handleExportTasks} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                            <Download size={14} /> Exportar CSV/JSON
                          </button>
                          <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                            <Upload size={14} /> Importar CSV/JSON
                          </button>
                          <input type="file" accept=".json,.csv" className="hidden" ref={fileInputRef} onChange={handleImportTasks} />
                        </div>
                      )}
                    </div>
                    
                    {!isReadOnly && (
                      <button `;

code = code.replace(oldStr, newStr);
fs.writeFileSync('src/App.tsx', code);
