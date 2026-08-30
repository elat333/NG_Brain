const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const funcs = `
  const handleExportTasks = () => {
    const exportData = filteredTasks.map(t => ({
      id: t.id, title: t.title, description: t.description, status: t.status,
      priority: t.priority, plannedDate: t.plannedDate, dueDate: t.dueDate,
      plannedStartTime: t.plannedStartTime, plannedEndTime: t.plannedEndTime,
      actualEndDate: t.actualEndDate, plannedHours: t.plannedHours, actualHours: t.actualHours,
      processId: t.processId, memberId: t.memberId
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "tareas.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowTaskMenu(false);
  };

  const handleImportTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          for (const task of data) {
            if (task.title && task.status) {
              await addDoc(collection(db, 'tasks'), {
                ...task,
                id: undefined, 
                createdAt: new Date().toISOString(),
              });
            }
          }
          alert('Tareas importadas exitosamente');
        }
      } catch (err) {
        alert('Error al importar tareas. Asegúrese de que sea un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
    setShowTaskMenu(false);
  };

`;

code = code.replace("const openAddTaskModal = ", funcs + "  const openAddTaskModal = ");
fs.writeFileSync('src/App.tsx', code);
