const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStr = `  const isProcessLeader = !!(isUserAdmin || taskAccess === 'lider' || taskAccess === 'administrador');
  const canEditMetadataField = isNewTask || isProcessLeader;
  const canEditStatusField = isNewTask || isProcessLeader || taskAccess === 'colaborador';`;

const newStr = `  const isProcessLeader = !!(isUserAdmin || taskAccess === 'lider' || taskAccess === 'administrador');
  const canEditMetadataField = isNewTask || isProcessLeader;
  const canEditStatusField = isNewTask || isProcessLeader || taskAccess === 'colaborador';
  const canEditPlanning = isNewTask || isProcessLeader;
  const canEditExecution = isNewTask || isProcessLeader || isPrimaryAssignee;
  const [showTimeInputs, setShowTimeInputs] = useState(false);`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('src/App.tsx', code);
