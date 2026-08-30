const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className="bg-gray-50\/50 p-4 rounded-2xl border border-gray-100 space-y-4">[\s\S]*?<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">[\s\S]*?<label className="text-\[10px\] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">[\s\S]*?<Calendar size=\{12\} className="text-sky-500" \/> Fecha Planificada \(A realizar\)[\s\S]*?<\/label>/;

const match = code.match(regex);

if (match) {
  let newBlock = match[0]
    .replace('space-y-4', 'space-y-3')
    .replace('gap-4', 'gap-3')
    .replace('Fecha Planificada (A realizar)', 'Fecha Planificada');
  
  code = code.replace(match[0], newBlock);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched modal plan successfully.");
} else {
  console.log("Not matched");
}
