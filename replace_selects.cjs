const fs = require('fs');
let code = fs.readFileSync('src/components/ProcessDashboard.tsx', 'utf8');

// Replace first select (Compartir Nota)
code = code.replace(
  /<select\s+value=\{selectedShareMemberId\}[\s\S]*?<\/select>/,
  `<MemberSearchSelect
      members={members}
      selectedId={selectedShareMemberId}
      onSelect={setSelectedShareMemberId}
      processes={processes}
      contextProcessId={noteToShare.processId}
      excludeMemberIds={[noteToShare.createdByMemberId, ...(noteToShare.sharedWith || []).map(s => s.memberId)]}
    />`
);

// Replace second select (Compartir Enlace)
code = code.replace(
  /<select\s+value=\{selectedLinkShareMemberId\}[\s\S]*?<\/select>/,
  `<MemberSearchSelect
      members={members}
      selectedId={selectedLinkShareMemberId}
      onSelect={setSelectedLinkShareMemberId}
      processes={processes}
      contextProcessId={linkToShare.processId}
      excludeMemberIds={[linkToShare.createdByMemberId, ...(linkToShare.sharedWith || []).map(s => s.memberId)]}
    />`
);

// Replace third select (Compartir Categoría Completa)
code = code.replace(
  /<select\s+value=\{selectedCategoryShareMemberId\}[\s\S]*?<\/select>/,
  `<MemberSearchSelect
      members={members}
      selectedId={selectedCategoryShareMemberId}
      onSelect={setSelectedCategoryShareMemberId}
      processes={processes}
      contextProcessId={selectedProcessId}
      excludeMemberIds={currentMember ? [currentMember.id] : []}
    />`
);

fs.writeFileSync('src/components/ProcessDashboard.tsx', code);
console.log("Replaced selects with MemberSearchSelect!");
