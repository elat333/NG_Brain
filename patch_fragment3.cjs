const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /setTasksSubTab\('permissions'\);\s*\}\}\s*\/>\s*\)\}/;
const match = code.match(regex);
if(match) {
  code = code.replace(match[0], match[0].replace('/>', '/>\n</>'));
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("No match");
}
