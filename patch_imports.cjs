const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /import \{([^}]+)\} from 'lucide-react';/;
const match = code.match(regex);
if(match) {
  let imports = match[1];
  ['Shield', 'MoreVertical', 'Download', 'Upload', 'Lock', 'Clock', 'Calendar', 'CheckSquare', 'Plus'].forEach(icon => {
    if(!imports.includes(icon)) {
      imports += ", " + icon;
    }
  });
  code = code.replace(match[0], "import {" + imports + "} from 'lucide-react';");
  fs.writeFileSync('src/App.tsx', code);
}
