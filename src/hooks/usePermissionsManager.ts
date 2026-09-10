import React, { useState, useEffect, useMemo } from 'react';
import { TeamMember } from '../types';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../lib/firebase';

interface UsePermissionsManagerProps {
  sortedMembers: TeamMember[];
}

export function usePermissionsManager({ sortedMembers }: UsePermissionsManagerProps) {
  const [draftIsSystemAdmin, setDraftIsSystemAdmin] = useState<boolean>(false);
  const [draftModuleAccess, setDraftModuleAccess] = useState<Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>>({});
  const [draftSupervisedMembersForLinks, setDraftSupervisedMembersForLinks] = useState<string[]>([]);
  const [draftCanViewAllCompanyLinks, setDraftCanViewAllCompanyLinks] = useState<boolean>(false);
  const [linksSupervisorSearch, setLinksSupervisorSearch] = useState<string>('');
  const [lastInitializedMemberId, setLastInitializedMemberId] = useState<string>('');

  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-admin');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [permSearch, setPermSearch] = useState<string>('');

  const resolvedPermissionsMember = useMemo(() => {
    const filtered = sortedMembers.filter(m => (m.categories || []).includes('miembro'));
    return sortedMembers.find(m => m.id === selectedMemberId) || filtered[0];
  }, [selectedMemberId, sortedMembers]);

  useEffect(() => {
    if (resolvedPermissionsMember) {
      if (resolvedPermissionsMember.id !== lastInitializedMemberId) {
        setDraftIsSystemAdmin(resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin');
        setDraftModuleAccess(resolvedPermissionsMember.moduleAccess || {});
        setDraftSupervisedMembersForLinks(resolvedPermissionsMember.supervisedMembersForLinks || []);
        setDraftCanViewAllCompanyLinks(resolvedPermissionsMember.canViewAllCompanyLinks || false);
        setLastInitializedMemberId(resolvedPermissionsMember.id);
      }
    } else {
      setDraftIsSystemAdmin(false);
      setDraftModuleAccess({});
      setDraftSupervisedMembersForLinks([]);
      setDraftCanViewAllCompanyLinks(false);
      setLastInitializedMemberId('');
    }
  }, [resolvedPermissionsMember, lastInitializedMemberId]);

  const hasUnsavedPermissionsChanges = useMemo(() => {
    if (!resolvedPermissionsMember) return false;
    const originalIsAdmin = resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin';
    if (draftIsSystemAdmin !== originalIsAdmin) return true;

    const originalCanViewAll = resolvedPermissionsMember.canViewAllCompanyLinks || false;
    if (draftCanViewAllCompanyLinks !== originalCanViewAll) return true;

    const originalSupervised = resolvedPermissionsMember.supervisedMembersForLinks || [];
    if (originalSupervised.length !== draftSupervisedMembersForLinks.length) return true;
    if (draftSupervisedMembersForLinks.some(id => !originalSupervised.includes(id))) return true;
    
    const originalAccess = resolvedPermissionsMember.moduleAccess || {};
    const allKeys = Array.from(new Set([...Object.keys(originalAccess), ...Object.keys(draftModuleAccess)]));
    for (const key of allKeys) {
      const origVal = originalAccess[key] || 'ninguno';
      const draftVal = draftModuleAccess[key] || 'ninguno';
      if (origVal !== draftVal) return true;
    }
    return false;
  }, [resolvedPermissionsMember, draftIsSystemAdmin, draftModuleAccess, draftSupervisedMembersForLinks, draftCanViewAllCompanyLinks]);

  const savePermissions = async (memberId: string) => {
    try {
      const finalRoleId = draftIsSystemAdmin ? 'role-admin' : 'role-colaborador';
      
      // Clean up general projects permission to enforce process-specific rules
      const cleanedModuleAccess = { ...draftModuleAccess };
      cleanedModuleAccess['projects'] = 'ninguno';

      await updateDoc(doc(db, 'members', memberId), {
        isSystemAdmin: draftIsSystemAdmin,
        systemRoleId: finalRoleId,
        moduleAccess: cleanedModuleAccess,
        supervisedMembersForLinks: draftSupervisedMembersForLinks,
        canViewAllCompanyLinks: draftCanViewAllCompanyLinks
      });
      // Force refresh on draft
      setLastInitializedMemberId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  return {
    draftIsSystemAdmin,
    setDraftIsSystemAdmin,
    draftModuleAccess,
    setDraftModuleAccess,
    draftSupervisedMembersForLinks,
    setDraftSupervisedMembersForLinks,
    draftCanViewAllCompanyLinks,
    setDraftCanViewAllCompanyLinks,
    linksSupervisorSearch,
    setLinksSupervisorSearch,
    lastInitializedMemberId,
    setLastInitializedMemberId,
    selectedRoleId,
    setSelectedRoleId,
    selectedMemberId,
    setSelectedMemberId,
    permSearch,
    setPermSearch,
    resolvedPermissionsMember,
    hasUnsavedPermissionsChanges,
    savePermissions
  };
}
