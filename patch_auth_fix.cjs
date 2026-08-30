const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStr = `  const canEditExecution = isNewTask || isProcessLeader || isPrimaryAssignee;
  const [showTimeInputs, setShowTimeInputs] = useState(false);`;

const newStr = `  const canEditExecution = isNewTask || isProcessLeader || isPrimaryAssignee;`;

code = code.replace(oldStr, newStr);

// Inject useState properly
const oldHooks = `  const [showTaskMenu, setShowTaskMenu] = useState(false);`;
const newHooks = `  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [showTimeInputs, setShowTimeInputs] = useState(false);`;
code = code.replace(oldHooks, newHooks);

fs.writeFileSync('src/App.tsx', code);
