const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{hasTasksAccess && \(\s*<SubNavButton[\s\S]*?active={activeTab === 'tasks' && tasksSubTab === 'permissions'}[\s\S]*?\/>\s*\)\}/;
const match = code.match(regex);
if(match) {
  let matchedStr = match[0];
  let fixedStr = matchedStr.replace('{hasTasksAccess && (', '{hasTasksAccess && (\\n<>').replace('/>\\n                        )}', '/>\\n</>\\n                        )}');
  code = code.replace(matchedStr, fixedStr);
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("Not matched");
}
