const fs = require('fs');
let code = fs.readFileSync('src/components/ProcessDashboard.tsx', 'utf8');

if (!code.includes('useRef')) {
  code = code.replace(/import React, \{ useState, useMemo, useEffect \} from 'react';/, "import React, { useState, useMemo, useEffect, useRef } from 'react';");
}

const componentCode = `
const MemberSearchSelect = ({ members, selectedId, onSelect, processes, contextProcessId, excludeMemberIds = [], placeholder = "-- Buscar o seleccionar un integrante --" }: { members: TeamMember[], selectedId: string, onSelect: (id: string) => void, processes: Process[], contextProcessId: string, excludeMemberIds?: string[], placeholder?: string }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedId) {
      const m = members.find(x => x.id === selectedId);
      if (m) setSearchTerm(m.name);
    } else {
      setSearchTerm('');
    }
  }, [selectedId, members]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (selectedId) {
           const m = members.find(x => x.id === selectedId);
           if (m) setSearchTerm(m.name);
        } else {
           setSearchTerm('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, selectedId, members]);

  const availableMembers = members.filter(m => !excludeMemberIds.includes(m.id));
  const filtered = availableMembers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={e => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          onSelect('');
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No se encontraron integrantes</div>
          ) : (
            filtered.map(m => {
               const memberProc = processes.find(p => p.id === m.processId);
               const isSameProc = m.processId === contextProcessId;
               return (
                 <button
                   key={m.id}
                   type="button"
                   className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                   onClick={() => {
                     onSelect(m.id);
                     setSearchTerm(m.name);
                     setIsOpen(false);
                   }}
                 >
                   <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{m.name}</span>
                   <span className="text-[9px] text-slate-400 uppercase font-black truncate max-w-[120px]">
                     {isSameProc ? 'Mismo Proceso' : memberProc ? \`Proceso: \${memberProc.name}\` : 'Sin proceso'}
                   </span>
                 </button>
               );
            })
          )}
        </div>
      )}
    </div>
  );
};
`;

if (!code.includes('const MemberSearchSelect')) {
  // Insert right after the imports
  code = code.replace(/export const ProcessDashboard[\s\S]*?\{/, (match) => componentCode + "\n\n" + match);
}

fs.writeFileSync('src/components/ProcessDashboard.tsx', code);
console.log("Component MemberSearchSelect added.");
