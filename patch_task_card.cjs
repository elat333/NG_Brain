const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">[\s\S]*?\{task\.plannedHours \? \([\s\S]*?<span className="text-\[10px\] font-bold text-gray-400 flex items-center gap-1">[\s\S]*?<Clock size=\{10\} \/> \{task\.plannedHours\}h[\s\S]*?<\/span>[\s\S]*?\) : null\}[\s\S]*?<\/div>/;

const match = code.match(regex);
if (match) {
  const newFooter = `<div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-1.5">
          {member && (
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold" title={member.name}>
              {member.name.charAt(0)}
            </div>
          )}
          {auxiliaries && auxiliaries.length > 0 && (
            <div className="flex -space-x-1">
              {auxiliaries.map(a => (
                <div key={a.id} className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[8px] font-bold border border-white" title={a.name}>
                  {a.name.charAt(0)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className="text-[9px] font-bold text-red-500/90 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Fecha Límite">
              <Calendar size={10} /> {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).replace('.', '')}
            </span>
          )}
          {task.plannedHours ? (
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1" title="Horas planificadas">
              <Clock size={10} /> {task.plannedHours}h
            </span>
          ) : null}
        </div>
      </div>`;
      
  code = code.replace(match[0], newFooter);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched TaskCard successfully.");
} else {
  console.log("Could not find TaskCard footer.");
}
