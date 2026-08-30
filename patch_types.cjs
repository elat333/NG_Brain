const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const regex = /export interface Deliverable \{[\s\S]*?\}/;
const match = code.match(regex);

if(match) {
  const newInterface = `export interface Deliverable {
  id: string;
  label?: string;
  description?: string;
  folderLocation?: string;
  url: string;
}`;
  code = code.replace(match[0], newInterface);
  fs.writeFileSync('src/types.ts', code);
  console.log("Patched types.ts");
}
