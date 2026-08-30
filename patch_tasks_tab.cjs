const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{taskViewMode === 'board' \? \(/;
const match = code.match(regex);

if(match) {
  const newSection = `
              {tasksSubTab === 'permissions' ? (
                <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full pb-20">
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mt-6">
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                      <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <Shield size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Reglas y Permisos</h2>
                        <p className="text-gray-500 mt-1">Niveles de acceso y responsabilidades en el Módulo de Tareas.</p>
                      </div>
                    </div>
                    
                    <div className="prose prose-sm md:prose-base prose-slate max-w-none space-y-8">
                      <section>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
                          <Lock className="text-gray-400" size={18} /> Resumen del Sistema
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          El módulo de seguimiento de tareas opera bajo un esquema de <strong>"Permisos Cruzados"</strong> que separa claramente la <em>Planificación</em> de la <em>Ejecución</em>, protegiendo así el cronograma y presupuesto de los proyectos.
                        </p>
                      </section>

                      <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-500" /> Líderes y Administradores
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Tienen control total sobre el <strong>Bloque de Planificación y Límites</strong>.
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Establecer o modificar la <strong>Fecha Límite (Deadline)</strong>.</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Asignar las <strong>Horas Planificadas</strong> (Presupuesto de tiempo).</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Editar cualquier campo de la tarea y reasignar responsables.</li>
                        </ul>
                      </section>

                      <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Activity size={16} className="text-blue-500" /> Colaborador Asignado (Responsable)
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Es el dueño absoluto del <strong>Bloque de Ejecución Real</strong>. 
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Reportar las <strong>Horas Reales</strong> utilizadas en la tarea.</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Actualizar la <strong>Fecha de entrega real</strong>. (El sistema la auto-llena al pasar a Completada).</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Agregar horarios específicos (Hora Inicio / Hora Fin) al día planificado para colaborar.</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> <em>Nota: Visualiza el bloque de planificación en modo "Solo lectura".</em></li>
                        </ul>
                      </section>
                      
                      <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckSquare size={16} className="text-purple-500" /> Miembros del Equipo
                        </h3>
                        <p className="text-sm text-gray-600">
                          Cualquier miembro del equipo que abra una tarea que <strong>NO</strong> tiene asignada, visualizará todos los campos en modo "Solo lectura". Podrán ver los detalles, pero no podrán modificar fechas ni horas.
                        </p>
                      </section>
                    </div>
                  </div>
                </div>
              ) : taskViewMode === 'board' ? (`;
    
  code = code.replace(match[0], newSection);
  fs.writeFileSync('src/App.tsx', code);
}
