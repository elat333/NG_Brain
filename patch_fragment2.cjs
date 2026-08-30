const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace('{hasTasksAccess && (\\n<>', '{hasTasksAccess && ( <>');
code = code.replace(/<\/}>\s*\)\}/, '</>\n                        )}');

fs.writeFileSync('src/App.tsx', code);
