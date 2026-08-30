const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className="relative">\s*<button onClick=\{\(\) => setShowTaskMenu\(!showTaskMenu\)\} className="flex items-center gap-1 px-3 py-1\.5 bg-gray-50 border border-gray-200 rounded-xl text-\[11px\] font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase">\s*<MoreVertical size=\{13\} \/> Opciones\s*<\/button>\s*\{showTaskMenu && \(\s*<div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">\s*<button onClick=\{handleExportTasks\} className="w-full text-left px-4 py-2\.5 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">\s*<Download size=\{14\} \/> Exportar CSV\/JSON\s*<\/button>\s*<button onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\} className="w-full text-left px-4 py-2\.5 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">\s*<Upload size=\{14\} \/> Importar CSV\/JSON\s*<\/button>\s*<input type="file" accept="\.json,\.csv" className="hidden" ref=\{fileInputRef\} onChange=\{handleImportTasks\} \/>\s*<\/div>\s*\)\}\s*<\/div>/;

const match = code.match(regex);
if (match) {
  code = code.replace(match[0], '<input type="file" accept=".json,.csv" className="hidden" ref={fileInputRef} onChange={handleImportTasks} />');
  fs.writeFileSync('src/App.tsx', code);
  console.log("Removed Opciones menu");
} else {
  console.log("Could not find Opciones menu");
}
