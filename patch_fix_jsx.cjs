const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<p className="text-xs font-medium text-gray-400">No hay links de entrega añadidos\.<\/p>\s*<\/div>\s*\)\}/;
const match = code.match(regex);

if(match) {
  code = code.replace(match[0], match[0] + '\n                            </div>');
  fs.writeFileSync('src/App.tsx', code);
  console.log("Fixed JSX closing tag.");
} else {
  console.log("Not matched");
}
