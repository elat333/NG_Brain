import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Folder, 
  Bookmark, 
  ChevronDown, 
  ChevronRight,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Info,
  X,
  Link2,
  Share2,
  Users,
  Eye,
  Save,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TeamMember, ProcessLink, NoteShareAccess } from '../../types';

interface PersonalLinksViewProps {
  currentMember: TeamMember | null;
  members?: TeamMember[];
  moduleName?: string;
  accentColor?: string;
}

export const PersonalLinksView: React.FC<PersonalLinksViewProps> = ({
  currentMember,
  members: propMembers,
  moduleName = 'General',
  accentColor = 'emerald'
}) => {
  const [links, setLinks] = useState<ProcessLink[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(propMembers || []);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine' | 'supervised' | 'shared'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  // Modal State for Add/Edit Link
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLink, setEditingLink] = useState<ProcessLink | null>(null);

  // Read-Only Detail View Modal State
  const [viewingLink, setViewingLink] = useState<ProcessLink | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete Confirm State
  const [linkToDelete, setLinkToDelete] = useState<ProcessLink | null>(null);

  // Share Modal State
  const [shareTargetType, setShareTargetType] = useState<'link' | 'category' | null>(null);
  const [sharingLink, setSharingLink] = useState<ProcessLink | null>(null);
  const [sharingCategory, setSharingCategory] = useState<string | null>(null);
  const [selectedShareMemberId, setSelectedShareMemberId] = useState<string>('');
  const [selectedShareRole, setSelectedShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareActionLoading, setShareActionLoading] = useState<boolean>(false);

  // Category Rename / Edit State inside modal
  const [renameCategoryInput, setRenameCategoryInput] = useState<string>('');
  const [isRenamingCategory, setIsRenamingCategory] = useState<boolean>(false);
  const [renameCategorySuccess, setRenameCategorySuccess] = useState<boolean>(false);

  const memberId = currentMember?.id || 'guest_user';

  // Check if current user is admin / has full system links visibility
  const isGlobalLinkAdmin = useMemo(() => {
    if (!currentMember) return false;
    return (
      currentMember.isSystemAdmin ||
      currentMember.systemRoleId === 'role-admin' ||
      currentMember.role === 'superadmin' ||
      currentMember.role === 'admin' ||
      !!currentMember.canViewAllCompanyLinks ||
      currentMember.moduleAccess?.['process_dashboard'] === 'administrador' ||
      currentMember.moduleAccess?.['gerencia'] === 'administrador'
    );
  }, [currentMember]);

  // Check if user supervises specific members
  const supervisedMemberIds = useMemo(() => {
    return currentMember?.supervisedMembersForLinks || [];
  }, [currentMember?.supervisedMembersForLinks]);

  const hasSupervisedMembers = isGlobalLinkAdmin || supervisedMemberIds.length > 0;

  // Helper to check if a link is created by a supervised member
  const isSupervisedLink = (l: ProcessLink): boolean => {
    if (!l.createdByMemberId || l.createdByMemberId === memberId) return false;
    if (supervisedMemberIds.includes(l.createdByMemberId)) return true;
    if (isGlobalLinkAdmin) return true;
    return false;
  };

  // Load team members for sharing (use propMembers if provided, or subscribe to 'members' collection)
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setTeamMembers(propMembers);
      return;
    }

    const unsub = onSnapshot(collection(db, 'members'), (snapshot) => {
      const loadedMembers = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TeamMember[];
      setTeamMembers(loadedMembers);
    }, (err) => {
      console.warn('Members listener warning:', err);
    });

    return () => unsub();
  }, [propMembers]);

  // Load category order preferences
  useEffect(() => {
    if (!memberId) return;

    const prefDocRef = doc(db, 'user_personal_links_prefs', memberId);
    const unsubPref = onSnapshot(prefDocRef, (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.categoryOrder)) {
        setCategoryOrder(snap.data()?.categoryOrder);
      }
    }, (err) => {
      console.warn('Prefs listener warning:', err);
    });

    return () => unsubPref();
  }, [memberId]);

  // Realtime subscription for all user links (both owned, shared, supervised and global admin)
  useEffect(() => {
    if (!memberId) {
      setLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = onSnapshot(
      collection(db, 'user_personal_links'),
      (snapshot) => {
        const fetched: ProcessLink[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          })) as ProcessLink[];

        // Filter: Accessible if creator OR present in sharedWith list OR supervised OR global admin
        const accessible = fetched.filter((l) => {
          if (!l.createdByMemberId || l.createdByMemberId === memberId) return true;
          if (l.sharedMemberIds && l.sharedMemberIds.includes(memberId)) return true;
          if (l.sharedWith && l.sharedWith.some((s) => s.memberId === memberId)) return true;
          if (isGlobalLinkAdmin) return true;
          if (supervisedMemberIds.includes(l.createdByMemberId)) return true;
          return false;
        });

        // Sort by order index ascending if available, then fallback to creation date desc
        accessible.sort((a, b) => {
          if (typeof a.order === 'number' && typeof b.order === 'number') {
            return a.order - b.order;
          }
          if (typeof a.order === 'number') return -1;
          if (typeof b.order === 'number') return 1;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setLinks(accessible);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching links:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [memberId, isGlobalLinkAdmin, supervisedMemberIds]);

  // Extract all unique categories and sort them based on user's saved categoryOrder
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    links.forEach((l) => {
      if (l.category && l.category.trim()) {
        set.add(l.category.trim());
      }
    });
    if (!set.has('General')) {
      set.add('General');
    }

    categoryOrder.forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });

    const allCats = Array.from(set);

    allCats.sort((a, b) => {
      const idxA = categoryOrder.indexOf(a);
      const idxB = categoryOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return allCats;
  }, [links, categoryOrder]);

  // Helper: check user permission on a link
  const getUserLinkRole = (link: ProcessLink): 'owner' | 'editor' | 'viewer' => {
    if (!link.createdByMemberId || link.createdByMemberId === memberId) return 'owner';
    if (isGlobalLinkAdmin) return 'owner';
    const sharedItem = link.sharedWith?.find((s) => s.memberId === memberId);
    if (sharedItem) return sharedItem.role;
    if (supervisedMemberIds.includes(link.createdByMemberId)) {
      const mgmtAccess = currentMember?.moduleAccess?.['process_dashboard'] || currentMember?.moduleAccess?.['gerencia'];
      if (mgmtAccess === 'lider' || mgmtAccess === 'administrador') return 'editor';
      return 'viewer';
    }
    return 'viewer';
  };

  // Helper: get owner name
  const getOwnerName = (ownerId?: string): string => {
    if (!ownerId || ownerId === memberId) return 'Mí';
    const member = teamMembers.find((m) => m.id === ownerId);
    return member?.name || 'Otro usuario';
  };

  // Filtered & Grouped links, ordered by categoriesList
  const filteredAndGroupedLinks = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = links.filter((l) => {
      const isMine = !l.createdByMemberId || l.createdByMemberId === memberId;
      const isSupervised = isSupervisedLink(l);
      const isSharedWithDirect = !!l.sharedWith?.some((s) => s.memberId === memberId) || (l.sharedMemberIds && l.sharedMemberIds.includes(memberId));

      if (ownershipFilter === 'mine' && !isMine) return false;
      if (ownershipFilter === 'supervised' && (!isSupervised || isMine)) return false;
      if (ownershipFilter === 'shared' && (!isSharedWithDirect || isMine)) return false;

      const creatorName = l.createdByMemberId ? (teamMembers.find(m => m.id === l.createdByMemberId)?.name || '') : '';

      const matchSearch =
        !term ||
        l.title.toLowerCase().includes(term) ||
        l.url.toLowerCase().includes(term) ||
        (l.code && l.code.toLowerCase().includes(term)) ||
        (l.description && l.description.toLowerCase().includes(term)) ||
        (l.category && l.category.toLowerCase().includes(term)) ||
        creatorName.toLowerCase().includes(term);

      const matchCategory =
        selectedCategoryFilter === 'all' ||
        (l.category || 'General').toLowerCase() === selectedCategoryFilter.toLowerCase();

      return matchSearch && matchCategory;
    });

    const groups: Record<string, ProcessLink[]> = {};
    filtered.forEach((l) => {
      const cat = l.category && l.category.trim() ? l.category.trim() : 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(l);
    });

    Object.keys(groups).forEach((catKey) => {
      groups[catKey].sort((a, b) => {
        if (typeof a.order === 'number' && typeof b.order === 'number') {
          return a.order - b.order;
        }
        if (typeof a.order === 'number') return -1;
        if (typeof b.order === 'number') return 1;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    });

    const orderedEntries: [string, ProcessLink[]][] = [];
    categoriesList.forEach((cat) => {
      if (groups[cat] && groups[cat].length > 0) {
        orderedEntries.push([cat, groups[cat]]);
      }
    });

    Object.entries(groups).forEach(([cat, catLinks]) => {
      if (!categoriesList.includes(cat) && catLinks.length > 0) {
        orderedEntries.push([cat, catLinks]);
      }
    });

    return orderedEntries;
  }, [links, searchTerm, selectedCategoryFilter, ownershipFilter, categoriesList, memberId]);

  // Handler: Move Category Up or Down
  const handleMoveCategory = async (catName: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    
    const visibleCategories = filteredAndGroupedLinks.map(([c]) => c);
    const currentIndex = visibleCategories.indexOf(catName);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= visibleCategories.length) return;

    const newVisible = [...visibleCategories];
    const temp = newVisible[currentIndex];
    newVisible[currentIndex] = newVisible[targetIndex];
    newVisible[targetIndex] = temp;

    const finalOrder = [...newVisible];
    categoriesList.forEach((c) => {
      if (!finalOrder.includes(c)) finalOrder.push(c);
    });

    setCategoryOrder(finalOrder);

    try {
      await setDoc(doc(db, 'user_personal_links_prefs', memberId), {
        categoryOrder: finalOrder,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error('Error saving category order:', err);
    }
  };

  // Handler: Move Card Left / Right
  const handleMoveCard = async (catLinks: ProcessLink[], link: ProcessLink, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = catLinks.findIndex((l) => l.id === link.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= catLinks.length) return;

    const reordered = [...catLinks];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    try {
      const updatePromises = reordered.map((item, idx) => {
        return setDoc(doc(db, 'user_personal_links', item.id), {
          order: idx,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error saving link card order:', err);
    }
  };

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => {
      const currentVal = prev[cat] === undefined ? true : prev[cat];
      return {
        ...prev,
        [cat]: !currentVal,
      };
    });
  };

  const handleCopyUrl = (id: string, linkUrl: string) => {
    navigator.clipboard.writeText(linkUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setEditingLink(null);
    setTitle('');
    setUrl('');
    setCode('');
    setCategory('General');
    setCustomCategory('');
    setDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (link: ProcessLink) => {
    setEditingLink(link);
    setTitle(link.title || '');
    setUrl(link.url || '');
    setCode(link.code || '');
    setDescription(link.description || '');

    const cat = link.category && link.category.trim() ? link.category.trim() : 'General';
    if (categoriesList.includes(cat)) {
      setCategory(cat);
      setCustomCategory('');
    } else {
      setCategory('custom');
      setCustomCategory(cat);
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setFormError('Por favor ingresa un título y una dirección URL válida.');
      return;
    }

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    const finalCategory =
      category === 'custom'
        ? customCategory.trim() || 'General'
        : category.trim() || 'General';

    setIsSaving(true);
    setFormError('');

    try {
      const linkId = editingLink ? editingLink.id : `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      const existingInCat = links.filter((l) => (l.category || 'General').toLowerCase() === finalCategory.toLowerCase());
      const maxOrder = existingInCat.reduce((max, item) => Math.max(max, item.order ?? 0), 0);
      const assignedOrder = editingLink && typeof editingLink.order === 'number' ? editingLink.order : maxOrder + 1;

      const linkData: Record<string, any> = {
        id: linkId,
        title: title.trim(),
        url: finalUrl,
        category: finalCategory,
        processId: 'personal',
        createdByMemberId: editingLink ? editingLink.createdByMemberId || memberId : memberId,
        order: assignedOrder,
        createdAt: editingLink ? editingLink.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingLink?.sharedWith) {
        linkData.sharedWith = editingLink.sharedWith;
      }
      if (editingLink?.sharedMemberIds) {
        linkData.sharedMemberIds = editingLink.sharedMemberIds;
      }

      if (code.trim()) {
        linkData.code = code.trim();
      }
      if (description.trim()) {
        linkData.description = description.trim();
      }

      await setDoc(doc(db, 'user_personal_links', linkId), linkData);
      setIsModalOpen(false);
      setEditingLink(null);
    } catch (err: any) {
      console.error('Error saving link:', err);
      setFormError('Ocurrió un error al guardar el enlace. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return;
    try {
      await deleteDoc(doc(db, 'user_personal_links', linkToDelete.id));
      setLinkToDelete(null);
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  // SHARE MANAGEMENT LOGIC
  const handleOpenShareLink = (link: ProcessLink, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingLink(link);
    setSharingCategory(null);
    setShareTargetType('link');
    setSelectedShareMemberId('');
    setSelectedShareRole('viewer');
  };

  const handleOpenShareCategory = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingCategory(catName);
    setRenameCategoryInput(catName);
    setRenameCategorySuccess(false);
    setSharingLink(null);
    setShareTargetType('category');
    setSelectedShareMemberId('');
    setSelectedShareRole('viewer');
  };

  const handleCloseShareModal = () => {
    setShareTargetType(null);
    setSharingLink(null);
    setSharingCategory(null);
    setRenameCategoryInput('');
    setRenameCategorySuccess(false);
    setSelectedShareMemberId('');
  };

  const handleRenameCategory = async () => {
    if (!sharingCategory || !renameCategoryInput.trim()) return;
    const newName = renameCategoryInput.trim();
    if (newName.toLowerCase() === sharingCategory.toLowerCase()) return;

    setIsRenamingCategory(true);
    setRenameCategorySuccess(false);
    try {
      const targetLinks = links.filter(
        (l) => (l.category || 'General').toLowerCase() === sharingCategory.toLowerCase()
      );

      const updatePromises = targetLinks.map((link) => {
        const canManage = !link.createdByMemberId || link.createdByMemberId === memberId || isGlobalLinkAdmin;
        if (!canManage) return;

        return setDoc(doc(db, 'user_personal_links', link.id), {
          category: newName,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      await Promise.all(updatePromises);

      // Also update categoryOrder if present
      if (categoryOrder.length > 0 && categoryOrder.includes(sharingCategory)) {
        const newOrder = categoryOrder.map(c => c === sharingCategory ? newName : c);
        setCategoryOrder(newOrder);
        try {
          await setDoc(doc(db, 'user_link_preferences', memberId), {
            categoryOrder: newOrder,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (orderErr) {
          console.error('Error updating category order:', orderErr);
        }
      }

      setSharingCategory(newName);
      setRenameCategorySuccess(true);
      setTimeout(() => setRenameCategorySuccess(false), 3000);
    } catch (err) {
      console.error('Error renaming category:', err);
    } finally {
      setIsRenamingCategory(false);
    }
  };

  // Add / Update share for individual link
  const handleShareLinkMember = async () => {
    if (!sharingLink || !selectedShareMemberId) return;
    setShareActionLoading(true);

    try {
      const currentShared: NoteShareAccess[] = sharingLink.sharedWith || [];
      const filtered = currentShared.filter((s) => s.memberId !== selectedShareMemberId);
      
      const updatedSharedWith: NoteShareAccess[] = [
        ...filtered,
        {
          memberId: selectedShareMemberId,
          role: selectedShareRole,
          sharedAt: new Date().toISOString(),
          sharedByMemberId: memberId,
        }
      ];

      const updatedSharedIds = Array.from(new Set(updatedSharedWith.map((s) => s.memberId)));

      await setDoc(doc(db, 'user_personal_links', sharingLink.id), {
        sharedWith: updatedSharedWith,
        sharedMemberIds: updatedSharedIds,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setSharingLink({
        ...sharingLink,
        sharedWith: updatedSharedWith,
        sharedMemberIds: updatedSharedIds,
      });
      setSelectedShareMemberId('');
    } catch (err) {
      console.error('Error sharing link:', err);
    } finally {
      setShareActionLoading(false);
    }
  };

  // Revoke share for individual link
  const handleRevokeShareLink = async (targetMemberId: string) => {
    if (!sharingLink) return;
    setShareActionLoading(true);

    try {
      const updatedSharedWith = (sharingLink.sharedWith || []).filter((s) => s.memberId !== targetMemberId);
      const updatedSharedIds = updatedSharedWith.map((s) => s.memberId);

      await setDoc(doc(db, 'user_personal_links', sharingLink.id), {
        sharedWith: updatedSharedWith,
        sharedMemberIds: updatedSharedIds,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setSharingLink({
        ...sharingLink,
        sharedWith: updatedSharedWith,
        sharedMemberIds: updatedSharedIds,
      });
    } catch (err) {
      console.error('Error revoking share:', err);
    } finally {
      setShareActionLoading(false);
    }
  };

  // Share entire category with a member
  const handleShareCategoryMember = async () => {
    if (!sharingCategory || !selectedShareMemberId) return;
    setShareActionLoading(true);

    try {
      const targetLinks = links.filter(
        (l) => (l.category || 'General').toLowerCase() === sharingCategory.toLowerCase()
      );

      const updatePromises = targetLinks.map((link) => {
        const currentShared = link.sharedWith || [];
        const filtered = currentShared.filter((s) => s.memberId !== selectedShareMemberId);
        const updatedSharedWith: NoteShareAccess[] = [
          ...filtered,
          {
            memberId: selectedShareMemberId,
            role: selectedShareRole,
            sharedAt: new Date().toISOString(),
            sharedByMemberId: memberId,
          }
        ];
        const updatedSharedIds = Array.from(new Set(updatedSharedWith.map((s) => s.memberId)));

        return setDoc(doc(db, 'user_personal_links', link.id), {
          sharedWith: updatedSharedWith,
          sharedMemberIds: updatedSharedIds,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      await Promise.all(updatePromises);
      setSelectedShareMemberId('');
    } catch (err) {
      console.error('Error sharing category:', err);
    } finally {
      setShareActionLoading(false);
    }
  };

  // Revoke category share for a member
  const handleRevokeShareCategory = async (targetMemberId: string) => {
    if (!sharingCategory) return;
    setShareActionLoading(true);

    try {
      const targetLinks = links.filter(
        (l) => (l.category || 'General').toLowerCase() === sharingCategory.toLowerCase()
      );

      const updatePromises = targetLinks.map((link) => {
        const updatedSharedWith = (link.sharedWith || []).filter((s) => s.memberId !== targetMemberId);
        const updatedSharedIds = updatedSharedWith.map((s) => s.memberId);

        return setDoc(doc(db, 'user_personal_links', link.id), {
          sharedWith: updatedSharedWith,
          sharedMemberIds: updatedSharedIds,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error revoking category share:', err);
    } finally {
      setShareActionLoading(false);
    }
  };

  // Compute shared members summary for category
  const categorySharedMembers = useMemo(() => {
    if (!sharingCategory) return [];
    const targetLinks = links.filter(
      (l) => (l.category || 'General').toLowerCase() === sharingCategory.toLowerCase()
    );
    const memberMap = new Map<string, 'viewer' | 'editor'>();
    targetLinks.forEach((l) => {
      l.sharedWith?.forEach((s) => {
        memberMap.set(s.memberId, s.role);
      });
    });
    return Array.from(memberMap.entries()).map(([mId, role]) => ({ memberId: mId, role }));
  }, [sharingCategory, links]);

  return (
    <div className="w-full space-y-2.5 animate-fade-in text-slate-800 text-left">
      {/* ULTRA-COMPACT SINGLE-LINE TOOLBAR: Filter Tabs + Category Filter + Search + New Link Button */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2 px-3 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setOwnershipFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                ownershipFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({links.length})
            </button>
            <button
              type="button"
              onClick={() => setOwnershipFilter('mine')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                ownershipFilter === 'mine'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Míos ({links.filter((l) => !l.createdByMemberId || l.createdByMemberId === memberId).length})
            </button>
            <button
              type="button"
              onClick={() => setOwnershipFilter('shared')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                ownershipFilter === 'shared'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Compartidos ({links.filter((l) => l.createdByMemberId !== memberId && !isSupervisedLink(l)).length})
            </button>
            {hasSupervisedMembers && (
              <button
                type="button"
                onClick={() => setOwnershipFilter('supervised')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  ownershipFilter === 'supervised'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
                }`}
              >
                <Eye size={12} className="text-amber-600" />
                <span>
                  Supervisados ({links.filter((l) => isSupervisedLink(l) && (l.createdByMemberId && l.createdByMemberId !== memberId)).length})
                </span>
              </button>
            )}

            {/* Category Dropdown Inline */}
            <div className="shrink-0 ml-1">
              <select
                id="select-category-filter"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todas las categorías ({links.length})</option>
                {categoriesList.map((cat) => {
                  const count = links.filter((l) => (l.category || 'General').toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Search + New Link Button in the exact same line */}
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-52 lg:w-60">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-personal-links"
                type="text"
                placeholder="Buscar título, URL o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              id="btn-add-personal-link"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all shrink-0 shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Nuevo Enlace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Links List Display grouped by Category */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-slate-800 mb-3" />
          <p className="text-xs font-bold text-slate-500">Cargando tus enlaces de interés...</p>
        </div>
      ) : filteredAndGroupedLinks.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
            <Bookmark size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            {searchTerm || selectedCategoryFilter !== 'all' || ownershipFilter !== 'all'
              ? 'No se encontraron enlaces que coincidan'
              : 'Aún no tienes enlaces de interés registrados'}
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mb-4">
            {searchTerm || selectedCategoryFilter !== 'all' || ownershipFilter !== 'all'
              ? 'Prueba modificando los filtros de búsqueda, categoría o estado de compartidos.'
              : 'Agrega repositorios, documentos de trabajo, paneles de control o herramientas esenciales para tenerlos siempre a mano.'}
          </p>
          {!searchTerm && selectedCategoryFilter === 'all' && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus size={14} />
              <span>Agregar Primer Enlace</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndGroupedLinks.map(([catName, catLinks], catIndex) => {
            const isCollapsed = collapsedCategories[catName] === undefined ? true : !!collapsedCategories[catName];
            const isFirstCat = catIndex === 0;
            const isLastCat = catIndex === filteredAndGroupedLinks.length - 1;

            return (
              <div
                key={catName}
                className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs"
              >
                {/* Category Header */}
                <div
                  onClick={() => toggleCategoryCollapse(catName)}
                  className="px-3.5 py-2 bg-slate-50/85 hover:bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between cursor-pointer transition-colors select-none"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight size={14} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-400" />
                    )}
                    <Folder size={15} className="text-emerald-600 fill-emerald-100" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {catName}
                    </span>
                    <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded-full text-[10px] font-black">
                      {catLinks.length}
                    </span>
                  </div>

                  {/* Actions on Category: Share Category + Edit Category + Up / Down Order Buttons */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Share category button */}
                    <button
                      type="button"
                      title="Compartir todos los enlaces de esta categoría"
                      onClick={(e) => handleOpenShareCategory(catName, e)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <Share2 size={11} className="text-emerald-600" />
                      <span className="hidden sm:inline">Compartir Grupo</span>
                    </button>

                    {/* Edit category button */}
                    <button
                      type="button"
                      title="Editar nombre y permisos del grupo"
                      onClick={(e) => handleOpenShareCategory(catName, e)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <Edit3 size={11} className="text-slate-600" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

                    {/* Up / Down category order */}
                    <button
                      type="button"
                      title="Subir posición de categoría"
                      disabled={isFirstCat}
                      onClick={(e) => handleMoveCategory(catName, 'up', e)}
                      className="p-0.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      title="Bajar posición de categoría"
                      disabled={isLastCat}
                      onClick={(e) => handleMoveCategory(catName, 'down', e)}
                      className="p-0.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </div>

                {/* Cards Grid: 30% narrower cards (4 to 5 cols) and compact padding */}
                {!isCollapsed && (
                  <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                    {catLinks.map((link, linkIndex) => {
                      const isFirstCard = linkIndex === 0;
                      const isLastCard = linkIndex === catLinks.length - 1;
                      const userRole = getUserLinkRole(link);
                      const isOwner = userRole === 'owner';
                      const canEdit = isOwner || userRole === 'editor';
                      const isSharedWithMe = !isOwner;
                      const hasSharedOthers = (link.sharedWith?.length ?? 0) > 0;

                      return (
                        <div
                          key={link.id}
                          className="bg-slate-50/60 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-2.5 transition-all duration-150 flex flex-col justify-between group shadow-none hover:shadow-xs text-left"
                        >
                          <div>
                            {/* ROW 1: Dedicated solely to Link Title (Click opens details/description modal in view-only mode) */}
                            <div className="mb-1">
                              <button
                                type="button"
                                onClick={() => setViewingLink(link)}
                                title={`Ver detalles y descripción: ${link.title}`}
                                className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors line-clamp-2 leading-snug block cursor-pointer text-left w-full hover:underline decoration-emerald-500/50"
                              >
                                {link.title}
                              </button>
                            </div>

                            {/* Description (compact 1-line) */}
                            {link.description && (
                              <p className="text-[10px] text-slate-500 font-normal line-clamp-1 mb-1.5">
                                {link.description}
                              </p>
                            )}

                            {/* Micro Badges (Code, Supervisado, Compartido) */}
                            <div className="flex items-center gap-1 flex-wrap mb-1">
                              {link.code && (
                                <span className="px-1.5 py-0.2 bg-slate-900 text-white rounded text-[9px] font-mono font-bold">
                                  {link.code}
                                </span>
                              )}
                              {link.createdByMemberId && link.createdByMemberId !== memberId && (
                                <>
                                  {isSupervisedLink(link) ? (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-indigo-50 text-indigo-800 border border-indigo-200/60 rounded text-[9px] font-bold" title={`Supervisado: creado por ${getOwnerName(link.createdByMemberId)}`}>
                                      <Eye size={9} className="text-indigo-600" />
                                      <span>Supervisado</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-50 text-amber-800 border border-amber-200/60 rounded text-[9px] font-bold" title={`Compartido por ${getOwnerName(link.createdByMemberId)}`}>
                                      <Users size={9} className="text-amber-600" />
                                      <span>{userRole === 'editor' ? 'Editor' : 'Lector'}</span>
                                    </span>
                                  )}
                                </>
                              )}
                              {hasSharedOthers && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded text-[9px] font-bold" title={`Compartido con ${link.sharedWith?.length} personas`}>
                                  <Share2 size={9} />
                                  <span>{link.sharedWith?.length}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ROW 2: Bottom Actions Bar */}
                          <div className="pt-1.5 border-t border-slate-200/60 mt-1 flex items-center justify-between gap-1">
                            {/* Action Buttons */}
                            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                title="Mover a la izquierda"
                                disabled={isFirstCard}
                                onClick={(e) => handleMoveCard(catLinks, link, 'left', e)}
                                className="p-0.5 text-slate-400 hover:text-slate-800 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                              >
                                <ArrowLeft size={11} />
                              </button>
                              <button
                                type="button"
                                title="Mover a la derecha"
                                disabled={isLastCard}
                                onClick={(e) => handleMoveCard(catLinks, link, 'right', e)}
                                className="p-0.5 text-slate-400 hover:text-slate-800 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                              >
                                <ArrowRight size={11} />
                              </button>
                              <button
                                title="Compartir enlace"
                                onClick={(e) => handleOpenShareLink(link, e)}
                                className="p-0.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <Share2 size={11} className="text-emerald-600" />
                              </button>
                              <button
                                title="Copiar URL"
                                onClick={() => handleCopyUrl(link.id, link.url)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              >
                                {copiedId === link.id ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                              {canEdit && (
                                <button
                                  title="Editar enlace"
                                  onClick={() => handleOpenEditModal(link)}
                                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                >
                                  <Edit3 size={11} />
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  title="Eliminar enlace"
                                  onClick={() => setLinkToDelete(link)}
                                  className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>

                            {/* Direct Open Link */}
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded text-[10px] font-bold transition-all shadow-2xs shrink-0"
                              title="Abrir enlace"
                            >
                              <span>Abrir</span>
                              <ExternalLink size={9} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SHARE MODAL (Individual Link or Whole Category) */}
      <AnimatePresence>
        {shareTargetType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-left overflow-hidden space-y-4"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    {shareTargetType === 'category' ? <Folder size={18} /> : <Share2 size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-black text-slate-900">
                      {shareTargetType === 'category'
                        ? `Gestionar y Compartir Grupo "${sharingCategory}"`
                        : `Compartir Enlace`}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate max-w-[260px]">
                      {shareTargetType === 'category'
                        ? 'Edita el nombre del grupo y configura permisos para tu equipo'
                        : sharingLink?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseShareModal}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Rename Category Section */}
              {shareTargetType === 'category' && (
                <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Nombre del Grupo / Categoría
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameCategoryInput}
                      onChange={(e) => setRenameCategoryInput(e.target.value)}
                      placeholder="Ej: Repositorios, Campañas, Manuales..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      disabled={isRenamingCategory || !renameCategoryInput.trim() || renameCategoryInput.trim().toLowerCase() === (sharingCategory || '').toLowerCase()}
                      onClick={handleRenameCategory}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {renameCategorySuccess ? (
                        <>
                          <CheckCheck size={14} className="text-emerald-400" />
                          <span>¡Guardado!</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>{isRenamingCategory ? 'Guardando...' : 'Guardar Nombre'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Add member form */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Agregar persona y asignar permiso
                </label>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedShareMemberId}
                    onChange={(e) => setSelectedShareMemberId(e.target.value)}
                    className="flex-1 min-w-0 p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 truncate"
                  >
                    <option value="">Seleccionar miembro del equipo...</option>
                    {teamMembers
                      .filter((m) => m.id !== memberId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.email} ({m.role || 'Miembro'})
                        </option>
                      ))}
                  </select>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-36 flex bg-white p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedShareRole('viewer')}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedShareRole === 'viewer'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Eye size={11} />
                        <span>Lector</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedShareRole('editor')}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedShareRole === 'editor'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Edit3 size={11} />
                        <span>Editor</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedShareMemberId || shareActionLoading}
                      onClick={shareTargetType === 'category' ? handleShareCategoryMember : handleShareLinkMember}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      {shareActionLoading ? '...' : 'Compartir'}
                    </button>
                  </div>
                </div>
              </div>

              {/* List of currently shared members */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Personas con acceso
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                        Tú
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">{currentMember?.name || 'Tú'}</span>
                        <span className="block text-[10px] text-slate-400">Propietario</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold">
                      Dueño
                    </span>
                  </div>

                  {/* Shared Members for Link */}
                  {shareTargetType === 'link' && sharingLink?.sharedWith && sharingLink.sharedWith.length > 0 ? (
                    sharingLink.sharedWith.map((shareItem) => {
                      const member = teamMembers.find((m) => m.id === shareItem.memberId);
                      return (
                        <div
                          key={shareItem.memberId}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {(member?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800">{member?.name || member?.email || 'Usuario'}</span>
                              <span className="block text-[10px] text-slate-400">{member?.email || 'Sin correo'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              shareItem.role === 'editor' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {shareItem.role === 'editor' ? 'Editor' : 'Lector'}
                            </span>
                            <button
                              type="button"
                              title="Revocar acceso"
                              onClick={() => handleRevokeShareLink(shareItem.memberId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : shareTargetType === 'category' && categorySharedMembers.length > 0 ? (
                    categorySharedMembers.map((shareItem) => {
                      const member = teamMembers.find((m) => m.id === shareItem.memberId);
                      return (
                        <div
                          key={shareItem.memberId}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {(member?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800">{member?.name || member?.email || 'Usuario'}</span>
                              <span className="block text-[10px] text-slate-400">{member?.email || 'Sin correo'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              shareItem.role === 'editor' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {shareItem.role === 'editor' ? 'Editor' : 'Lector'}
                            </span>
                            <button
                              type="button"
                              title="Revocar acceso de la categoría"
                              onClick={() => handleRevokeShareCategory(shareItem.memberId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-400 py-2 text-center">
                      Aún no has compartido esto con nadie más.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={handleCloseShareModal}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Bookmark size={18} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingLink ? 'Editar Enlace de Interés' : 'Nuevo Enlace de Interés'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <Info size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveLink} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Título del Enlace *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carpeta de Creativos, Dashboard de Analytics, Drive Comercial..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Dirección URL *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://drive.google.com/... o app.link.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Código / Identificador (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: MKT-01, DRIVE-01"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Categoría
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="custom">+ Crear nueva categoría...</option>
                    </select>
                  </div>
                </div>

                {category === 'custom' && (
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Nombre de la Nueva Categoría *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Repositorios, Campañas, Manuales..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Descripción / Notas de Uso (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones o detalles de acceso..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : editingLink ? 'Guardar Cambios' : 'Crear Enlace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* READ-ONLY DETAIL / DESCRIPTION MODAL */}
      <AnimatePresence>
        {viewingLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Link2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Detalle del Enlace de Interés
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Modo Vista / Información
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingLink(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Título del Enlace
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900">
                    {viewingLink.title}
                  </div>
                </div>

                {/* URL and Open/Copy buttons */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Dirección URL / Acceso
                  </label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-emerald-700 truncate font-semibold select-all">
                      {viewingLink.url}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(viewingLink.id, viewingLink.url)}
                        title="Copiar URL al portapapeles"
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        {copiedId === viewingLink.id ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-[10px] text-emerald-600">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span className="text-[10px]">Copiar</span>
                          </>
                        )}
                      </button>
                      <a
                        href={viewingLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                        title="Abrir URL en pestaña nueva"
                      >
                        <span className="text-[10px]">Abrir</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Category and Code Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Categoría / Carpeta
                    </label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Folder size={14} className="text-emerald-600" />
                      <span>{viewingLink.category || 'General'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Código / Identificador
                    </label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-mono font-bold text-slate-800">
                      {viewingLink.code || <span className="text-slate-400 font-normal italic">Sin código</span>}
                    </div>
                  </div>
                </div>

                {/* Description / Notes */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Descripción / Notas de Uso
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 whitespace-pre-wrap min-h-[70px] leading-relaxed">
                    {viewingLink.description ? (
                      viewingLink.description
                    ) : (
                      <span className="text-slate-400 italic">No hay notas o descripción registradas para este enlace.</span>
                    )}
                  </div>
                </div>

                {/* Metadata info: Creator and Shared info */}
                <div className="p-2.5 bg-slate-100/60 rounded-xl text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Creado por:</span>
                    <span className="font-bold text-slate-800">{getOwnerName(viewingLink.createdByMemberId)}</span>
                  </div>
                  {viewingLink.sharedWith && viewingLink.sharedWith.length > 0 && (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Share2 size={12} />
                      <span>Compartido con {viewingLink.sharedWith.length} integrante(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-5">
                <div>
                  {(getUserLinkRole(viewingLink) === 'owner' || getUserLinkRole(viewingLink) === 'editor') && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingLink;
                        setViewingLink(null);
                        handleOpenEditModal(target);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Editar Enlace</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingLink(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {linkToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100">
                <Trash2 size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1">¿Eliminar este enlace?</h3>
              <p className="text-xs text-slate-500 font-medium mb-5">
                Se eliminará el enlace <strong className="text-slate-800 font-bold">{linkToDelete.title}</strong> de tu lista.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setLinkToDelete(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
