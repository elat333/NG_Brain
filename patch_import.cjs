const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("import { Video,", "import { Video, AlignLeft,");
fs.writeFileSync('src/App.tsx', code);
console.log("Added AlignLeft to imports");
