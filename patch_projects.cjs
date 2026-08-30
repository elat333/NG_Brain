const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add showCompletedProjects state
if (!code.includes('const [showCompletedProjects')) {
  code = code.replace(
    /const \[isAddingProject, setIsAddingProject\] = useState\(false\);/,
    "const [showCompletedProjects, setShowCompletedProjects] = useState(false);\n  const [isAddingProject, setIsAddingProject] = useState(false);"
  );
}

// 2. Add imports Eye, EyeOff
if (!code.includes('EyeOff')) {
  code = code.replace(/import \{/, 'import { Eye, EyeOff,');
}

// 3. Fix handleUpdateProject bug (add setIsAddingProject(false))
code = code.replace(
  /setEditingProject\(null\);\s*setNewProjectData\(\{ name: '', description: '', processId: '', status: 'activo', city: '' \}\);\s*\};/,
  "setIsAddingProject(false);\n    setEditingProject(null);\n    setNewProjectData({ name: '', description: '', processId: '', status: 'activo', city: '' });\n  };"
);

// 4. Update the header button logic to include the toggle
const headerRegex = /\{activeTab === 'projects' && canCreateProjects && \([\s\S]*?<\/button>\s*\)\}/;
const headerMatch = code.match(headerRegex);
if (headerMatch) {
  const newHeader = `{activeTab === 'projects' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCompletedProjects(!showCompletedProjects)}
                  className={\`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border \${
                    showCompletedProjects 
                      ? 'bg-purple-50 text-purple-600 border-purple-200 shadow-sm' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }\`}
                >
                  {showCompletedProjects ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showCompletedProjects ? 'Ocultar Completados' : 'Mostrar Completados'}
                </button>
                {canCreateProjects && (
                  <button 
                    onClick={() => {
                      setEditingProject(null);
                      const allowedProcs = processes.filter(p => {
                        const access = getModuleAccess(currentMember, roles, \`projects_\${p.id}\`);
                        return access === 'lider' || access === 'administrador';
                      });
                      const defaultProcessId = allowedProcs.length === 1 ? allowedProcs[0].id : '';
                      setNewProjectData({ name: '', description: '', processId: defaultProcessId, status: 'activo', city: '' });
                      setIsAddingProject(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-sm"
                  >
                    <FolderKanban size={18} />
                    Nuevo Proyecto
                  </button>
                )}
              </div>
            )}`;
  code = code.replace(headerMatch[0], newHeader);
}

// 5. Filter processProjects by showCompletedProjects
const filterRegex = /const processProjects = projects\.filter\(p => p\.processId === proc\.id\);/;
const filterMatch = code.match(filterRegex);
if (filterMatch) {
  code = code.replace(filterMatch[0], "const processProjects = projects.filter(p => p.processId === proc.id && (showCompletedProjects || p.status !== 'completado'));");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched projects logic.");
