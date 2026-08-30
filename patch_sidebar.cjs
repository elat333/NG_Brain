const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{hasPlannerAccess && \([\s\S]*?<SubNavButton\s*active=\{activeTab === 'planner'\}[\s\S]*?onClick=\{\(\) => \{[\s\S]*?setExpandedNavModule\('tasks'\);[\s\S]*?handleTabClick\('planner'\);[\s\S]*?\}\}\s*\/>\s*\)\}/;

const match = code.match(regex);
if (match) {
  const newSubmenus = match[0] + `
                        {hasTasksAccess && (
                          <>
                            <SubNavButton 
                              active={false} 
                              label="Exportar tareas" 
                              icon={<Download size={14} />} 
                              onClick={handleExportTasks} 
                            />
                            <SubNavButton 
                              active={false} 
                              label="Importar tareas" 
                              icon={<UploadCloud size={14} />} 
                              onClick={() => fileInputRef.current?.click()} 
                            />
                          </>
                        )}`;
  code = code.replace(match[0], newSubmenus);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched sidebar successfully.");
} else {
  console.log("Could not find insertion point for sidebar.");
}
