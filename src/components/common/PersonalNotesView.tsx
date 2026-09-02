import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  Folder, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  X,
  Share2,
  Users,
  Eye,
  Pin,
  Download,
  Hash,
  Sparkles,
  Columns2,
  BookOpen,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Clock,
  Globe,
  Layers,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Info,
  Edit3,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TeamMember, PersonalNote, NoteShareAccess } from '../../types';

interface PersonalNotesViewProps {
  currentMember: TeamMember | null;
  members?: TeamMember[];
  moduleName?: string;
  accentColor?: string;
}

type ViewMode = 'live' | 'split' | 'preview';

export const PersonalNotesView: React.FC<PersonalNotesViewProps> = ({
  currentMember,
  members: propMembers,
  moduleName = 'General'
}) => {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(propMembers || []);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine' | 'supervised' | 'shared' | 'company'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  // Category Edit / Rename State inside modal
  const [renameCategoryInput, setRenameCategoryInput] = useState<string>('');
  const [isRenamingCategory, setIsRenamingCategory] = useState<boolean>(false);
  const [renameCategorySuccess, setRenameCategorySuccess] = useState<boolean>(false);

  // Active Note in Editor Modal / View
  const [activeNote, setActiveNote] = useState<PersonalNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<ViewMode>('live');

  // Form Editor State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('General');
  const [formCustomCategory, setFormCustomCategory] = useState<string>('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formColor, setFormColor] = useState<string>('indigo');
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false);
  const [formIsCompanyPublic, setFormIsCompanyPublic] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<boolean>(false);

  // Delete Confirm State
  const [noteToDelete, setNoteToDelete] = useState<PersonalNote | null>(null);

  // Unified Share Modal State (Note or Category)
  const [shareTargetType, setShareTargetType] = useState<'note' | 'category' | null>(null);
  const [sharingNote, setSharingNote] = useState<PersonalNote | null>(null);
  const [sharingCategoryName, setSharingCategoryName] = useState<string | null>(null);
  const [selectedShareMemberId, setSelectedShareMemberId] = useState<string>('');
  const [selectedShareRole, setSelectedShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareActionLoading, setShareActionLoading] = useState<boolean>(false);

  // Reference for textarea to handle toolbar insertions
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const memberId = currentMember?.id || 'guest_user';

  // Check if current user is admin / has full system notes visibility
  const isGlobalNotesAdmin = useMemo(() => {
    if (!currentMember) return false;
    return (
      currentMember.isSystemAdmin ||
      currentMember.systemRoleId === 'role-admin' ||
      currentMember.role === 'superadmin' ||
      currentMember.role === 'admin' ||
      !!currentMember.canViewAllCompanyNotes ||
      !!currentMember.canViewAllCompanyLinks ||
      currentMember.moduleAccess?.['process_dashboard'] === 'administrador' ||
      currentMember.moduleAccess?.['gerencia'] === 'administrador'
    );
  }, [currentMember]);

  // Check if user supervises specific members
  const supervisedMemberIds = useMemo(() => {
    return (
      currentMember?.supervisedMembersForNotes ||
      currentMember?.supervisedMembersForLinks ||
      []
    );
  }, [currentMember?.supervisedMembersForNotes, currentMember?.supervisedMembersForLinks]);

  const hasSupervisedMembers = isGlobalNotesAdmin || supervisedMemberIds.length > 0;

  // Check if a note is created by a supervised member
  const isSupervisedNote = (n: PersonalNote): boolean => {
    if (!n.createdByMemberId || n.createdByMemberId === memberId) return false;
    if (supervisedMemberIds.includes(n.createdByMemberId)) return true;
    if (isGlobalNotesAdmin) return true;
    return false;
  };

  // Load team members
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setTeamMembers(propMembers);
      return;
    }
    const unsub = onSnapshot(collection(db, 'members'), (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TeamMember[];
      setTeamMembers(loaded);
    }, (err) => {
      console.warn('Members listener warning in notes:', err);
    });
    return () => unsub();
  }, [propMembers]);

  // Load category order preferences
  useEffect(() => {
    if (!memberId) return;

    const prefDocRef = doc(db, 'user_personal_notes_prefs', memberId);
    const unsubPref = onSnapshot(prefDocRef, (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.categoryOrder)) {
        setCategoryOrder(snap.data()?.categoryOrder);
      }
    }, (err) => {
      console.warn('Prefs listener warning in notes:', err);
    });

    return () => unsubPref();
  }, [memberId]);

  // Realtime subscription for all accessible notes
  useEffect(() => {
    if (!memberId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'user_personal_notes'),
      (snapshot) => {
        const fetched: PersonalNote[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as PersonalNote[];

        // Filter: Accessible if creator OR present in sharedWith list OR supervised OR global admin OR company public
        const accessible = fetched.filter((n) => {
          if (!n.createdByMemberId || n.createdByMemberId === memberId) return true;
          if (n.isCompanyPublic) return true;
          if (n.sharedMemberIds && n.sharedMemberIds.includes(memberId)) return true;
          if (n.sharedWith && n.sharedWith.some((s) => s.memberId === memberId)) return true;
          if (isGlobalNotesAdmin) return true;
          if (supervisedMemberIds.includes(n.createdByMemberId)) return true;
          return false;
        });

        // Sort: Pinned first, then order asc if available, then fallback to update date desc
        accessible.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          if (typeof a.order === 'number' && typeof b.order === 'number') {
            return a.order - b.order;
          }
          if (typeof a.order === 'number') return -1;
          if (typeof b.order === 'number') return 1;
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });

        setNotes(accessible);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notes:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [memberId, isGlobalNotesAdmin, supervisedMemberIds]);

  // All distinct categories sorted by user preference
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.category && n.category.trim()) {
        set.add(n.category.trim());
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
  }, [notes, categoryOrder]);

  // All distinct tags across accessible notes
  const allTagsList = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach((t) => {
          if (t && t.trim()) set.add(t.startsWith('#') ? t : `#${t}`);
        });
      }
    });
    return Array.from(set).sort();
  }, [notes]);

  // Helper: check user permission on a note
  const getUserNoteRole = (note: PersonalNote): 'owner' | 'editor' | 'viewer' => {
    if (!note.createdByMemberId || note.createdByMemberId === memberId) return 'owner';
    if (isGlobalNotesAdmin) return 'owner';
    const sharedItem = note.sharedWith?.find((s) => s.memberId === memberId);
    if (sharedItem) return sharedItem.role || 'viewer';
    if (supervisedMemberIds.includes(note.createdByMemberId)) {
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
    return member?.name || 'Otro colaborador';
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return notes.filter((n) => {
      const isMine = !n.createdByMemberId || n.createdByMemberId === memberId;
      const isSupervised = isSupervisedNote(n);
      const isSharedWithDirect = !!n.sharedWith?.some((s) => s.memberId === memberId) || (n.sharedMemberIds && n.sharedMemberIds.includes(memberId));
      const isCompanyPub = !!n.isCompanyPublic;

      if (ownershipFilter === 'mine' && !isMine) return false;
      if (ownershipFilter === 'supervised' && (!isSupervised || isMine)) return false;
      if (ownershipFilter === 'shared' && (!isSharedWithDirect || isMine)) return false;
      if (ownershipFilter === 'company' && !isCompanyPub) return false;

      if (selectedCategoryFilter !== 'all' && (n.category || 'General') !== selectedCategoryFilter) {
        return false;
      }

      if (selectedTagFilter) {
        const hasTag = n.tags?.some(t => (t.startsWith('#') ? t : `#${t}`).toLowerCase() === selectedTagFilter.toLowerCase());
        if (!hasTag) return false;
      }

      if (!term) return true;

      const titleMatch = (n.title || '').toLowerCase().includes(term);
      const contentMatch = (n.content || '').toLowerCase().includes(term);
      const tagMatch = n.tags?.some(t => t.toLowerCase().includes(term)) || false;
      const authorMatch = getOwnerName(n.createdByMemberId).toLowerCase().includes(term);

      return titleMatch || contentMatch || tagMatch || authorMatch;
    });
  }, [notes, searchTerm, ownershipFilter, selectedCategoryFilter, selectedTagFilter, memberId, isGlobalNotesAdmin, supervisedMemberIds]);

  // Grouped by category
  const groupedNotes = useMemo(() => {
    const map: Record<string, PersonalNote[]> = {};
    categoriesList.forEach(cat => {
      map[cat] = [];
    });
    filteredNotes.forEach(note => {
      const cat = note.category && note.category.trim() ? note.category.trim() : 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(note);
    });
    return map;
  }, [filteredNotes, categoriesList]);

  // Folder sharing computed properties
  const categorySharedMembers = useMemo(() => {
    if (!sharingCategoryName) return [];
    const catNotes = notes.filter(n => (n.category || 'General').toLowerCase() === sharingCategoryName.toLowerCase());
    const memberMap = new Map<string, { memberId: string; role: 'viewer' | 'editor' }>();
    
    catNotes.forEach(note => {
      note.sharedWith?.forEach(share => {
        const existing = memberMap.get(share.memberId);
        if (!existing || (share.role === 'editor' && existing.role === 'viewer')) {
          memberMap.set(share.memberId, { memberId: share.memberId, role: share.role || 'viewer' });
        }
      });
    });

    return Array.from(memberMap.values());
  }, [sharingCategoryName, notes]);

  const isCategoryCompanyPublic = useMemo(() => {
    if (!sharingCategoryName) return false;
    const catNotes = notes.filter(n => (n.category || 'General').toLowerCase() === sharingCategoryName.toLowerCase());
    return catNotes.length > 0 && catNotes.every(n => n.isCompanyPublic);
  }, [sharingCategoryName, notes]);

  // Open note for creating
  const handleOpenNewNote = (categoryDefault?: string) => {
    const targetCat = categoryDefault || (selectedCategoryFilter !== 'all' ? selectedCategoryFilter : 'General');
    
    // Check if category has default shared settings
    const existingInCat = notes.filter(n => (n.category || 'General').toLowerCase() === targetCat.toLowerCase());
    const catSharedWith = existingInCat.length > 0 ? (existingInCat[0].sharedWith || []) : [];
    const catIsCompanyPublic = existingInCat.length > 0 ? !!existingInCat[0].isCompanyPublic : false;

    setActiveNote(null);
    setFormTitle('');
    setFormContent('# Nueva Nota\n\nEscribe aquí tu contenido en **Markdown** estilo Obsidian...');
    setFormCategory(targetCat);
    setFormCustomCategory('');
    setFormTags([]);
    setFormColor('indigo');
    setFormIsPinned(false);
    setFormIsCompanyPublic(catIsCompanyPublic);
    setEditorMode('live');
    setIsEditorOpen(true);
  };

  // Open note for editing/viewing
  const handleOpenNote = (note: PersonalNote) => {
    setActiveNote(note);
    setFormTitle(note.title || '');
    setFormContent(note.content || '');
    setFormCategory(note.category || 'General');
    setFormCustomCategory('');
    setFormTags(note.tags || []);
    setFormColor(note.color || 'indigo');
    setFormIsPinned(!!note.pinned);
    setFormIsCompanyPublic(!!note.isCompanyPublic);
    setEditorMode('live');
    setIsEditorOpen(true);
  };

  // Save Note to Firestore
  const handleSaveNote = async () => {
    if (!formTitle.trim()) {
      alert('Por favor, ingresa un título para la nota.');
      return;
    }

    setIsSaving(true);
    try {
      const finalCategory = formCategory === 'custom' 
        ? (formCustomCategory.trim() || 'General') 
        : formCategory;

      // Extract automatic hashtags from content
      const hashtagRegex = /#[a-zA-Z0-9_-]+/g;
      const detectedTags = formContent.match(hashtagRegex) || [];
      const combinedTags = Array.from(new Set([...formTags, ...detectedTags]));

      const noteId = activeNote?.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const noteDocRef = doc(db, 'user_personal_notes', noteId);

      // If new note, check if category has inherit shared members
      let initialSharedWith = activeNote?.sharedWith || [];
      let initialSharedIds = activeNote?.sharedMemberIds || [];
      if (!activeNote) {
        const existingInCat = notes.filter(n => (n.category || 'General').toLowerCase() === finalCategory.toLowerCase());
        if (existingInCat.length > 0 && existingInCat[0].sharedWith) {
          initialSharedWith = existingInCat[0].sharedWith;
          initialSharedIds = initialSharedWith.map(s => s.memberId);
        }
      }

      const noteData: PersonalNote = {
        id: noteId,
        title: formTitle.trim(),
        content: formContent,
        category: finalCategory,
        tags: combinedTags,
        color: formColor,
        pinned: formIsPinned,
        isCompanyPublic: formIsCompanyPublic,
        createdByMemberId: activeNote?.createdByMemberId || memberId,
        createdByName: activeNote?.createdByName || currentMember?.name || 'Usuario',
        createdAt: activeNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sharedMemberIds: initialSharedIds,
        sharedWith: initialSharedWith,
        moduleContext: moduleName
      };

      await setDoc(noteDocRef, noteData, { merge: true });
      setActiveNote(noteData);
      setSaveSuccessNotification(true);
      setTimeout(() => setSaveSuccessNotification(false), 2500);
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Hubo un error al guardar la nota. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (note: PersonalNote) => {
    try {
      await deleteDoc(doc(db, 'user_personal_notes', note.id));
      if (activeNote?.id === note.id) {
        setIsEditorOpen(false);
      }
      setNoteToDelete(null);
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Error al eliminar la nota.');
    }
  };

  // Toggle Pin on a note
  const handleTogglePin = async (note: PersonalNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const noteDocRef = doc(db, 'user_personal_notes', note.id);
      await setDoc(noteDocRef, { pinned: !note.pinned, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  // Copy raw markdown
  const handleCopyMarkdown = (note: PersonalNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `# ${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download .md file
  const handleDownloadMd = (note: PersonalNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `# ${note.title}\n\n${note.content}`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'nota'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Share Handlers: Note vs Category
  const handleOpenShareNote = (note: PersonalNote) => {
    setShareTargetType('note');
    setSharingNote(note);
    setSharingCategoryName(null);
    setSelectedShareMemberId('');
    setSelectedShareRole('viewer');
  };

  const handleOpenShareCategory = (catName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShareTargetType('category');
    setSharingCategoryName(catName);
    setRenameCategoryInput(catName);
    setRenameCategorySuccess(false);
    setSharingNote(null);
    setSelectedShareMemberId('');
    setSelectedShareRole('viewer');
  };

  const handleCloseShareModal = () => {
    setShareTargetType(null);
    setSharingNote(null);
    setSharingCategoryName(null);
    setRenameCategoryInput('');
    setRenameCategorySuccess(false);
    setSelectedShareMemberId('');
  };

  const handleRenameCategory = async () => {
    if (!sharingCategoryName || !renameCategoryInput.trim()) return;
    const newName = renameCategoryInput.trim();
    if (newName.toLowerCase() === sharingCategoryName.toLowerCase()) return;

    setIsRenamingCategory(true);
    setRenameCategorySuccess(false);
    try {
      const catNotes = notes.filter(n => (n.category || 'General').toLowerCase() === sharingCategoryName.toLowerCase());
      const updatePromises = catNotes.map(async (note) => {
        const canManage = !note.createdByMemberId || note.createdByMemberId === memberId || isGlobalNotesAdmin;
        if (!canManage) return;

        return setDoc(doc(db, 'user_personal_notes', note.id), {
          category: newName,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await Promise.all(updatePromises);

      // Also update categoryOrder if present
      if (categoryOrder.length > 0 && categoryOrder.includes(sharingCategoryName)) {
        const newOrder = categoryOrder.map(c => c === sharingCategoryName ? newName : c);
        setCategoryOrder(newOrder);
        try {
          await setDoc(doc(db, 'user_personal_notes_prefs', memberId), {
            categoryOrder: newOrder,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (orderErr) {
          console.error('Error updating category order:', orderErr);
        }
      }

      setSharingCategoryName(newName);
      setRenameCategorySuccess(true);
      setTimeout(() => setRenameCategorySuccess(false), 3000);
    } catch (err) {
      console.error('Error renaming category:', err);
    } finally {
      setIsRenamingCategory(false);
    }
  };

  // Handler: Move Category Up or Down
  const handleMoveCategory = async (catName: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();

    const visibleCategories = categoriesList.filter(
      (cat) => (groupedNotes[cat] || []).length > 0 && (selectedCategoryFilter === 'all' || selectedCategoryFilter === cat)
    );
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
      await setDoc(doc(db, 'user_personal_notes_prefs', memberId), {
        categoryOrder: finalOrder,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error('Error saving note category order:', err);
    }
  };

  // Handler: Move Note Card Left or Right inside its Category
  const handleMoveNoteCard = async (catNotes: PersonalNote[], note: PersonalNote, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = catNotes.findIndex((n) => n.id === note.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= catNotes.length) return;

    const reordered = [...catNotes];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    try {
      const updatePromises = reordered.map((item, idx) => {
        return setDoc(doc(db, 'user_personal_notes', item.id), {
          order: idx,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error saving note card order:', err);
    }
  };

  const handleShareNoteMember = async () => {
    if (!sharingNote || !selectedShareMemberId) return;
    setShareActionLoading(true);
    try {
      const currentShared = sharingNote.sharedWith || [];
      const filtered = currentShared.filter(s => s.memberId !== selectedShareMemberId);
      const updatedSharedWith: NoteShareAccess[] = [
        ...filtered,
        {
          memberId: selectedShareMemberId,
          role: selectedShareRole,
          sharedAt: new Date().toISOString(),
          sharedByMemberId: memberId
        }
      ];
      const updatedSharedIds = Array.from(new Set(updatedSharedWith.map(s => s.memberId)));
      const docRef = doc(db, 'user_personal_notes', sharingNote.id);
      await setDoc(docRef, {
        sharedWith: updatedSharedWith,
        sharedMemberIds: updatedSharedIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSharingNote(prev => prev ? { ...prev, sharedWith: updatedSharedWith, sharedMemberIds: updatedSharedIds } : null);
      setSelectedShareMemberId('');
    } catch (err) {
      console.error('Error sharing note:', err);
    } finally {
      setShareActionLoading(false);
    }
  };

  const handleRevokeShareNote = async (targetMemberId: string) => {
    if (!sharingNote) return;
    try {
      const updatedSharedWith = (sharingNote.sharedWith || []).filter(s => s.memberId !== targetMemberId);
      const updatedSharedIds = updatedSharedWith.map(s => s.memberId);
      await setDoc(doc(db, 'user_personal_notes', sharingNote.id), {
        sharedWith: updatedSharedWith,
        sharedMemberIds: updatedSharedIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSharingNote(prev => prev ? { ...prev, sharedWith: updatedSharedWith, sharedMemberIds: updatedSharedIds } : null);
    } catch (err) {
      console.error('Error revoking note share:', err);
    }
  };

  const handleShareCategoryMember = async () => {
    if (!sharingCategoryName || !selectedShareMemberId) return;
    setShareActionLoading(true);
    try {
      const catNotes = notes.filter(n => (n.category || 'General').toLowerCase() === sharingCategoryName.toLowerCase());
      
      const updatePromises = catNotes.map(async (note) => {
        const canManage = !note.createdByMemberId || note.createdByMemberId === memberId || isGlobalNotesAdmin;
        if (!canManage) return;

        const currentShared = note.sharedWith || [];
        const filtered = currentShared.filter(s => s.memberId !== selectedShareMemberId);
        const updatedSharedWith: NoteShareAccess[] = [
          ...filtered,
          {
            memberId: selectedShareMemberId,
            role: selectedShareRole,
            sharedAt: new Date().toISOString(),
            sharedByMemberId: memberId
          }
        ];
        const updatedSharedIds = Array.from(new Set(updatedSharedWith.map(s => s.memberId)));
        return setDoc(doc(db, 'user_personal_notes', note.id), {
          sharedWith: updatedSharedWith,
          sharedMemberIds: updatedSharedIds,
          updatedAt: new Date().toISOString()
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

  const handleRevokeShareCategory = async (targetMemberId: string) => {
    if (!sharingCategoryName) return;
    try {
      const catNotes = notes.filter(n => (n.category || 'General').toLowerCase() === sharingCategoryName.toLowerCase());
      const updatePromises = catNotes.map(async (note) => {
        const canManage = !note.createdByMemberId || note.createdByMemberId === memberId || isGlobalNotesAdmin;
        if (!canManage) return;

        const updatedSharedWith = (note.sharedWith || []).filter(s => s.memberId !== targetMemberId);
        const updatedSharedIds = updatedSharedWith.map(s => s.memberId);
        return setDoc(doc(db, 'user_personal_notes', note.id), {
          sharedWith: updatedSharedWith,
          sharedMemberIds: updatedSharedIds,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error revoking category share:', err);
    }
  };

  const handleToggleCategoryCompanyPublic = async (newVal: boolean) => {
    if (!sharingCategoryName) return;
    try {
      const catNotes = notes.filter(n => (n.category || 'General').toLowerCase() === sharingCategoryName.toLowerCase());
      const updatePromises = catNotes.map(async (note) => {
        const canManage = !note.createdByMemberId || note.createdByMemberId === memberId || isGlobalNotesAdmin;
        if (!canManage) return;

        return setDoc(doc(db, 'user_personal_notes', note.id), {
          isCompanyPublic: newVal,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error toggling category company public:', err);
    }
  };

  // Insert markdown syntax helper in textarea
  const insertMarkdown = (prefix: string, suffix: string = '', defaultText: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = formContent.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = formContent.substring(0, start) + replacement + formContent.substring(end);
    setFormContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  // Toggle task checkbox inside live markdown text
  const handleToggleTaskCheckbox = (lineIndex: number, currentChecked: boolean) => {
    const lines = formContent.split('\n');
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      if (currentChecked) {
        lines[lineIndex] = line.replace(/- \[[xX]\]/, '- [ ]');
      } else {
        lines[lineIndex] = line.replace(/- \[ \]/, '- [x]');
      }
      setFormContent(lines.join('\n'));
    }
  };

  // Add / Remove Tag in Form
  const [tagInput, setTagInput] = useState<string>('');
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const formatted = tagInput.trim().startsWith('#') ? tagInput.trim() : `#${tagInput.trim()}`;
    if (!formTags.includes(formatted)) {
      setFormTags([...formTags, formatted]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter(t => t !== tagToRemove));
  };

  // Keyboard shortcut Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditorOpen) {
        e.preventDefault();
        handleSaveNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, formTitle, formContent, formCategory, formCustomCategory, formTags, formColor, formIsPinned, formIsCompanyPublic]);

  // Reading metrics
  const wordsCount = useMemo(() => {
    if (!formContent.trim()) return 0;
    return formContent.trim().split(/\s+/).length;
  }, [formContent]);

  const readingTimeMin = Math.max(1, Math.ceil(wordsCount / 200));

  return (
    <div className="w-full space-y-2.5 animate-fade-in text-slate-800">
      {/* ULTRA-COMPACT SINGLE-LINE TOOLBAR: Filter Tabs + Search + New Note Button (All in one unified line) */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2 px-3 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full shrink-0">
            <button
              onClick={() => setOwnershipFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                ownershipFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({notes.length})
            </button>
            <button
              onClick={() => setOwnershipFilter('mine')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                ownershipFilter === 'mine'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Mis Notas ({notes.filter(n => !n.createdByMemberId || n.createdByMemberId === memberId).length})
            </button>
            <button
              onClick={() => setOwnershipFilter('shared')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                ownershipFilter === 'shared'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Compartidas ({notes.filter(n => n.createdByMemberId !== memberId && ((n.sharedWith && n.sharedWith.some(s => s.memberId === memberId)) || (n.sharedMemberIds && n.sharedMemberIds.includes(memberId)))).length})
            </button>
            <button
              onClick={() => setOwnershipFilter('company')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                ownershipFilter === 'company'
                  ? 'bg-ng-lime text-ng-black font-black text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Empresa ({notes.filter(n => n.isCompanyPublic).length})
            </button>
            {hasSupervisedMembers && (
              <button
                onClick={() => setOwnershipFilter('supervised')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  ownershipFilter === 'supervised'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
                }`}
              >
                <Eye size={12} />
                <span>Supervisadas ({notes.filter(n => isSupervisedNote(n) && n.createdByMemberId !== memberId).length})</span>
              </button>
            )}
          </div>

          {/* Search + New Note Button in the exact same line */}
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-56 lg:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título, contenido o #tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
              onClick={() => handleOpenNewNote()}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all shrink-0 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Nueva Nota</span>
            </button>
          </div>
        </div>

        {/* TAGS FILTER ROW (COMPACT, ONLY IF TAGS EXIST) */}
        {allTagsList.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Hash size={11} />
              <span>Etiquetas:</span>
            </span>
            {selectedTagFilter && (
              <button
                onClick={() => setSelectedTagFilter(null)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-md text-[10px] font-bold transition-all"
              >
                <span>Limpiar ({selectedTagFilter})</span>
                <X size={9} />
              </button>
            )}
            {allTagsList.map((tag, tIdx) => {
              const isSelected = selectedTagFilter?.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={`filter_tag_${tag}_${tIdx}`}
                  onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CATEGORIES / FOLDERS BAR (With Folder Share support) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCategoryFilter('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 ${
            selectedCategoryFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <Layers size={13} />
          <span>Todas las Carpetas</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {notes.length}
          </span>
        </button>

        {categoriesList.map((cat, catIdx) => {
          const catNotes = notes.filter(n => (n.category || 'General') === cat);
          const count = catNotes.length;
          const isSelected = selectedCategoryFilter === cat;
          const isSharedWithOthers = catNotes.some(n => (n.sharedWith && n.sharedWith.length > 0) || n.isCompanyPublic);

          return (
            <div
              key={`note_cat_btn_${cat}_${catIdx}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => setSelectedCategoryFilter(cat)}
                className="flex items-center gap-1.5 uppercase tracking-wider text-left focus:outline-none"
              >
                <Folder size={13} className={isSelected ? 'text-white' : 'text-indigo-500'} />
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>

              {/* Share Folder Icon button */}
              <button
                type="button"
                title={`Compartir toda la carpeta "${cat}"`}
                onClick={(e) => handleOpenShareCategory(cat, e)}
                className={`p-1 rounded-lg transition-colors ${
                  isSelected 
                    ? 'hover:bg-white/20 text-white' 
                    : isSharedWithOthers 
                      ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' 
                      : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                <Share2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* MAIN NOTES CONTENT LIST */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2.5">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400">Cargando notas y minutas...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <BookOpen size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No hay notas que coincidan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              {searchTerm 
                ? 'Prueba con otros términos de búsqueda o elimina los filtros activos.'
                : 'Aún no tienes notas registradas en esta carpeta. ¡Crea la primera ahora!'}
            </p>
          </div>
          <button
            onClick={() => handleOpenNewNote()}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-xs"
          >
            + Crear Primera Nota
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const visibleCategories = categoriesList.filter(
              (cat) => (groupedNotes[cat] || []).length > 0 && (selectedCategoryFilter === 'all' || selectedCategoryFilter === cat)
            );

            return visibleCategories.map((cat, catIndex) => {
              const catNotes = groupedNotes[cat] || [];
              const isCollapsed = collapsedCategories[cat] === undefined ? true : !!collapsedCategories[cat];
              const isSharedCat = catNotes.some(n => (n.sharedWith && n.sharedWith.length > 0) || n.isCompanyPublic);
              const isFirstCat = catIndex === 0;
              const isLastCat = catIndex === visibleCategories.length - 1;

              return (
                <div key={`note_cat_sec_${cat}_${catIndex}`} className="space-y-2.5">
                  {/* Category Header with Folder Sharing, Edit, Reorder and Add button */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() => setCollapsedCategories(prev => {
                          const currentVal = prev[cat] === undefined ? true : prev[cat];
                          return { ...prev, [cat]: !currentVal };
                        })}
                        className="flex items-center gap-1.5 cursor-pointer select-none group"
                      >
                        <button
                          type="button"
                          className="p-1 hover:bg-slate-100 rounded-md text-slate-400 group-hover:text-slate-600 transition-colors"
                          title={collapsedCategories[cat] === false ? 'Colapsar carpeta' : 'Desplegar carpeta'}
                        >
                          {collapsedCategories[cat] === false ? (
                            <ChevronDown size={15} />
                          ) : (
                            <ChevronRight size={15} />
                          )}
                        </button>
                        <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                          <Folder size={14} />
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span>{cat}</span>
                          <span className="text-[11px] font-bold text-slate-400 font-mono">({catNotes.length})</span>
                        </h3>
                      </div>

                      {/* Folder Share Action in Section Header */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenShareCategory(cat, e)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          isSharedCat
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/80 hover:bg-purple-100'
                            : 'bg-slate-100 hover:bg-purple-50 text-slate-500 hover:text-purple-700'
                        }`}
                        title={`Compartir toda la carpeta "${cat}"`}
                      >
                        <Share2 size={11} />
                        <span>Compartir Carpeta</span>
                      </button>

                      {/* Folder Edit Action in Section Header */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenShareCategory(cat, e)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        title={`Editar nombre y permisos de la carpeta "${cat}"`}
                      >
                        <Edit3 size={11} />
                        <span>Editar</span>
                      </button>

                      <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

                      {/* Category Up / Down Order Buttons */}
                      <button
                        type="button"
                        title="Subir posición de carpeta"
                        disabled={isFirstCat}
                        onClick={(e) => handleMoveCategory(cat, 'up', e)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        title="Bajar posición de carpeta"
                        disabled={isLastCat}
                        onClick={(e) => handleMoveCategory(cat, 'down', e)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenNewNote(cat)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 p-1"
                    >
                      <Plus size={13} />
                      <span>Agregar a {cat}</span>
                    </button>
                  </div>

                  {/* ULTRA COMPACT NOTES GRID (30% less width, 50% less height, title & actions inline) */}
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {catNotes.map((note, noteIndex) => {
                        const isMine = !note.createdByMemberId || note.createdByMemberId === memberId;
                        const role = getUserNoteRole(note);
                        const canEdit = role === 'owner' || role === 'editor';
                        const isFirstCard = noteIndex === 0;
                        const isLastCard = noteIndex === catNotes.length - 1;
                        
                        // Preview first lines of markdown
                        const previewContent = note.content
                          .replace(/^#+\s/gm, '')
                          .replace(/>\s/gm, '')
                          .replace(/\[ \]/gm, '☐')
                          .replace(/\[x\]/gm, '☑')
                          .slice(0, 110);

                        return (
                          <div
                            key={`note_card_${note.id || noteIndex}_${noteIndex}`}
                            onClick={() => handleOpenNote(note)}
                            className={`group relative bg-white border ${
                              note.pinned ? 'border-indigo-300 ring-1 ring-indigo-200 shadow-2xs' : 'border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-sm'
                            } rounded-2xl p-3 cursor-pointer transition-all flex flex-col justify-between hover:-translate-y-0.5 space-y-2`}
                          >
                            <div className="space-y-1.5 min-w-0">
                              {/* Row 1: Title and Actions at the EXACT SAME HEIGHT */}
                              <div className="flex items-center justify-between gap-1.5 min-w-0">
                                <h4 
                                  className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate flex-1 min-w-0" 
                                  title={note.title || 'Sin Título'}
                                >
                                  {note.title || 'Sin Título'}
                                </h4>

                                {/* Quick action buttons inline with title */}
                                <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                  {/* Move Left / Right Buttons */}
                                  <button
                                    type="button"
                                    title="Mover a la izquierda"
                                    disabled={isFirstCard}
                                    onClick={(e) => handleMoveNoteCard(catNotes, note, 'left', e)}
                                    className="p-0.5 text-slate-400 hover:text-slate-800 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                                  >
                                    <ArrowLeft size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Mover a la derecha"
                                    disabled={isLastCard}
                                    onClick={(e) => handleMoveNoteCard(catNotes, note, 'right', e)}
                                    className="p-0.5 text-slate-400 hover:text-slate-800 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                                  >
                                    <ArrowRight size={11} />
                                  </button>

                                  <div className="h-3 w-px bg-slate-200 mx-0.5" />

                                  <button
                                    type="button"
                                    title={note.pinned ? "Desfijar nota" : "Fijar nota"}
                                    onClick={(e) => handleTogglePin(note, e)}
                                    className={`p-1 rounded-md transition-colors ${
                                      note.pinned ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <Pin size={12} className={note.pinned ? "fill-indigo-600" : ""} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Copiar Markdown"
                                    onClick={(e) => handleCopyMarkdown(note, e)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                  >
                                    {copiedId === note.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                  </button>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      title="Compartir nota"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenShareNote(note);
                                      }}
                                      className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                    >
                                      <Share2 size={12} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    title="Descargar archivo .md"
                                    onClick={(e) => handleDownloadMd(note, e)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                  >
                                    <Download size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Row 2: Micro Badges (Pinned / Company / Owner / Shared) */}
                              {(note.pinned || note.isCompanyPublic || !isMine || (note.sharedWith && note.sharedWith.length > 0)) && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {note.pinned && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">
                                      <Pin size={8} className="fill-indigo-600" />
                                      <span>Fijada</span>
                                    </span>
                                  )}
                                  {note.isCompanyPublic && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold">
                                      <Globe size={8} />
                                      <span>Empresa</span>
                                    </span>
                                  )}
                                  {!isMine && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold truncate max-w-[120px]">
                                      <Users size={8} />
                                      <span className="truncate">{getOwnerName(note.createdByMemberId)}</span>
                                    </span>
                                  )}
                                  {note.sharedWith && note.sharedWith.length > 0 && isMine && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                                      <Share2 size={8} />
                                      <span>{note.sharedWith.length}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Row 3: Snippet (Compact 2 lines) */}
                              <p className="text-[11px] text-slate-500 line-clamp-2 font-normal leading-snug whitespace-pre-wrap">
                                {previewContent || 'Nota vacía...'}
                              </p>
                            </div>

                            {/* Row 4: Compact Tags & Footer Date */}
                            <div className="space-y-1 pt-1.5 border-t border-slate-100/90">
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {note.tags.slice(0, 3).map((t, tIdx) => (
                                    <span
                                      key={`note_tag_${note.id}_${t}_${tIdx}`}
                                      className="px-1.5 py-0.2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 rounded text-[9px] font-semibold transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTagFilter(t);
                                      }}
                                    >
                                      {t.startsWith('#') ? t : `#${t}`}
                                    </span>
                                  ))}
                                  {note.tags.length > 3 && (
                                    <span className="text-[9px] text-slate-400 font-semibold self-center">
                                      +{note.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
                                </span>
                                <span className="font-semibold text-slate-500 group-hover:text-indigo-600 flex items-center gap-0.5 text-[10px]">
                                  <span>Abrir</span>
                                  <ChevronRight size={11} />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* FULL OBSIDIAN MARKDOWN EDITOR MODAL */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* TOP EDITOR TOOLBAR */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xs shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="Título de la nota..."
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full text-base sm:text-lg font-black text-slate-900 bg-transparent border-0 focus:outline-none placeholder-slate-400"
                    />
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-0.5">
                      <span>{wordsCount} palabras</span>
                      <span>•</span>
                      <span>~{readingTimeMin} min lectura</span>
                      <span>•</span>
                      <span className="text-indigo-600 font-bold">{formCategory}</span>
                    </div>
                  </div>
                </div>

                {/* VIEW MODE SWITCHER & ACTIONS */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mode switcher */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setEditorMode('live')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        editorMode === 'live'
                          ? 'bg-white text-indigo-700 shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>Live Obsidian</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('split')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        editorMode === 'split'
                          ? 'bg-white text-indigo-700 shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Columns2 size={13} />
                      <span>Dividido</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('preview')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        editorMode === 'preview'
                          ? 'bg-white text-indigo-700 shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <BookOpen size={13} />
                      <span>Lectura</span>
                    </button>
                  </div>

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Guardar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* SAVE NOTIFICATION */}
              {saveSuccessNotification && (
                <div className="bg-emerald-500 text-white text-xs font-bold py-1 px-4 text-center flex items-center justify-center gap-1.5 animate-fade-in">
                  <CheckCircle2 size={13} />
                  <span>Nota guardada exitosamente en la nube</span>
                </div>
              )}

              {/* SECONDARY SETTINGS & FORMATTING TOOLBAR */}
              <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Markdown Syntax Tools */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    title="Título 1 (# )"
                    onClick={() => insertMarkdown('# ', '', 'Título Principal')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 font-black text-xs"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    title="Título 2 (## )"
                    onClick={() => insertMarkdown('## ', '', 'Subtítulo')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 font-bold text-xs"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    title="Título 3 (### )"
                    onClick={() => insertMarkdown('### ', '', 'Sección')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 font-bold text-xs"
                  >
                    H3
                  </button>
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  <button
                    type="button"
                    title="Negrita (**texto**)"
                    onClick={() => insertMarkdown('**', '**', 'negrita')}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 font-bold"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    title="Cursiva (*texto*)"
                    onClick={() => insertMarkdown('*', '*', 'cursiva')}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <Italic size={13} />
                  </button>
                  <button
                    type="button"
                    title="Lista de Tareas Interactivas (- [ ] )"
                    onClick={() => insertMarkdown('- [ ] ', '', 'Nueva tarea')}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <CheckSquare size={13} />
                  </button>
                  <button
                    type="button"
                    title="Lista con viñetas (- )"
                    onClick={() => insertMarkdown('- ', '', 'Elemento')}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <List size={13} />
                  </button>
                  <button
                    type="button"
                    title="Lista numerada (1. )"
                    onClick={() => insertMarkdown('1. ', '', 'Primer punto')}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <ListOrdered size={13} />
                  </button>
                  <button
                    type="button"
                    title="Cita / Callout (> )"
                    onClick={() => insertMarkdown('> [!NOTE]\n> ', '', 'Anotación importante')}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <Quote size={13} />
                  </button>
                  <button
                    type="button"
                    title="Tabla Markdown"
                    onClick={() => insertMarkdown('\n| Encabezado 1 | Encabezado 2 |\n| :--- | :--- |\n| Dato 1 | Dato 2 |\n', '', '')}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <TableIcon size={13} />
                  </button>
                </div>

                {/* Note metadata config */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Folder size={13} className="text-slate-400" />
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      {categoriesList.map((c, cIdx) => (
                        <option key={`pnote_form_cat_opt_${c || cIdx}_${cIdx}`} value={c}>{c}</option>
                      ))}
                      <option value="custom">+ Nueva Carpeta...</option>
                    </select>
                  </div>

                  {formCategory === 'custom' && (
                    <input
                      type="text"
                      placeholder="Nombre de carpeta..."
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs w-32 font-semibold"
                    />
                  )}

                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formIsPinned}
                      onChange={(e) => setFormIsPinned(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <Pin size={11} className={formIsPinned ? "text-indigo-600 fill-indigo-600" : "text-slate-400"} />
                    <span className="text-[11px] font-bold text-slate-700">Fijar</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formIsCompanyPublic}
                      onChange={(e) => setFormIsCompanyPublic(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <Globe size={11} className={formIsCompanyPublic ? "text-blue-600" : "text-slate-400"} />
                    <span className="text-[11px] font-bold text-slate-700">Pública Empresa</span>
                  </label>
                </div>
              </div>

              {/* EDITOR BODY */}
              <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[450px]">
                {/* LEFT / MAIN TEXTAREA (Hidden in pure Preview mode) */}
                {editorMode !== 'preview' && (
                  <div className={`flex-1 flex flex-col p-4 sm:p-6 bg-white ${editorMode === 'split' ? 'md:w-1/2' : 'w-full'}`}>
                    <textarea
                      ref={textareaRef}
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="Escribe tu nota aquí..."
                      className="w-full flex-1 min-h-[380px] bg-transparent border-0 text-slate-800 text-sm font-mono leading-relaxed resize-none focus:outline-none placeholder-slate-400 selection:bg-indigo-100"
                    />
                  </div>
                )}

                {/* RIGHT / PREVIEW RENDERER (Live Obsidian or Split or Pure Preview) */}
                {(editorMode === 'live' || editorMode === 'split' || editorMode === 'preview') && (
                  <div className={`flex-1 p-5 sm:p-7 bg-slate-50/50 overflow-y-auto ${editorMode === 'split' ? 'md:w-1/2' : 'w-full'}`}>
                    <div className="max-w-3xl mx-auto space-y-4">
                      {/* REAL-TIME OBSIDIAN LIVE LINE-BY-LINE RENDERER */}
                      {formContent.split('\n').map((line, idx) => {
                        // 1. Heading 1
                        if (line.startsWith('# ')) {
                          return (
                            <h1 key={idx} className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-3 pb-1 border-b border-slate-200">
                              <span className="text-indigo-400 font-mono text-lg select-none mr-1.5 opacity-60">#</span>
                              <span>{line.substring(2)}</span>
                            </h1>
                          );
                        }
                        // 2. Heading 2
                        if (line.startsWith('## ')) {
                          return (
                            <h2 key={idx} className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-2 pb-0.5">
                              <span className="text-indigo-400 font-mono text-base select-none mr-1.5 opacity-60">##</span>
                              <span>{line.substring(3)}</span>
                            </h2>
                          );
                        }
                        // 3. Heading 3
                        if (line.startsWith('### ')) {
                          return (
                            <h3 key={idx} className="text-lg sm:text-xl font-bold text-slate-900 pt-1.5">
                              <span className="text-indigo-400 font-mono text-sm select-none mr-1.5 opacity-60">###</span>
                              <span>{line.substring(4)}</span>
                            </h3>
                          );
                        }
                        // 4. Heading 4, 5, 6
                        if (line.startsWith('#### ')) {
                          return (
                            <h4 key={idx} className="text-base font-bold text-slate-800 pt-1">
                              <span className="text-indigo-400 font-mono text-xs select-none mr-1 opacity-60">####</span>
                              <span>{line.substring(5)}</span>
                            </h4>
                          );
                        }
                        // 5. Interactive Checklist - [ ] or - [x]
                        if (line.match(/^- \[[ xX]\] /)) {
                          const isChecked = line.startsWith('- [x]') || line.startsWith('- [X]');
                          const taskText = line.substring(6);
                          return (
                            <div
                              key={idx}
                              onClick={() => handleToggleTaskCheckbox(idx, isChecked)}
                              className="flex items-start gap-2.5 py-1 px-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors group select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="mt-1 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                              />
                              <span className={`text-sm leading-relaxed ${isChecked ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                                {taskText}
                              </span>
                            </div>
                          );
                        }
                        // 6. Callout > [!NOTE] / > [!TIP] / > [!WARNING]
                        if (line.startsWith('> [!NOTE]')) {
                          return (
                            <div key={idx} className="p-3.5 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl my-2 text-blue-900 text-xs font-semibold flex items-start gap-2">
                              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                              <span>{line.replace('> [!NOTE]', '') || 'Nota informativa'}</span>
                            </div>
                          );
                        }
                        if (line.startsWith('> [!TIP]')) {
                          return (
                            <div key={idx} className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl my-2 text-emerald-900 text-xs font-semibold flex items-start gap-2">
                              <Lightbulb size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span>{line.replace('> [!TIP]', '') || 'Consejo clave'}</span>
                            </div>
                          );
                        }
                        if (line.startsWith('> [!WARNING]')) {
                          return (
                            <div key={idx} className="p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl my-2 text-amber-900 text-xs font-semibold flex items-start gap-2">
                              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                              <span>{line.replace('> [!WARNING]', '') || 'Alerta o precaución'}</span>
                            </div>
                          );
                        }
                        // 7. Generic Quote >
                        if (line.startsWith('> ')) {
                          return (
                            <blockquote key={idx} className="border-l-3 border-indigo-400 pl-3 py-1 my-1 text-slate-600 italic text-sm bg-indigo-50/40 rounded-r-lg">
                              {line.substring(2)}
                            </blockquote>
                          );
                        }
                        // 8. Bullet List - or *
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return (
                            <div key={idx} className="flex items-start gap-2 text-sm text-slate-800 pl-2 py-0.5">
                              <span className="text-indigo-500 font-black">•</span>
                              <span>{line.substring(2)}</span>
                            </div>
                          );
                        }
                        // 9. Numbered List 1.
                        if (line.match(/^\d+\.\s/)) {
                          const num = line.match(/^(\d+)\.\s/)?.[1] || '1';
                          const text = line.replace(/^\d+\.\s/, '');
                          return (
                            <div key={idx} className="flex items-start gap-2 text-sm text-slate-800 pl-2 py-0.5">
                              <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-1.5 py-0.2 rounded font-mono">{num}</span>
                              <span>{text}</span>
                            </div>
                          );
                        }
                        // 10. Horizontal divider
                        if (line === '---' || line === '***' || line === '___') {
                          return <hr key={idx} className="border-slate-200 my-4" />;
                        }
                        // 11. Empty line
                        if (!line.trim()) {
                          return <div key={idx} className="h-2.5" />;
                        }
                        // 12. Standard paragraph with inline formatting
                        return (
                          <p key={idx} className="text-sm text-slate-800 leading-relaxed font-normal">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* EDITOR FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {/* Tag management */}
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <Hash size={12} />
                    <span>Etiquetas:</span>
                  </span>
                  {formTags.map((t, tIdx) => (
                    <span
                      key={`form_tag_${t}_${tIdx}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-600 p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Agregar #etiqueta..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[11px]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2">
                  {activeNote && (
                    <button
                      type="button"
                      onClick={() => setNoteToDelete(activeNote)}
                      className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED SHARE MODAL (For single Note or entire Folder/Category) */}
      <AnimatePresence>
        {shareTargetType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 overflow-hidden text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    {shareTargetType === 'category' ? <Folder size={18} /> : <Share2 size={18} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      {shareTargetType === 'category' 
                        ? `Gestionar y Compartir Carpeta "${sharingCategoryName}"` 
                        : 'Compartir Nota'}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium truncate max-w-xs">
                      {shareTargetType === 'category'
                        ? 'Edita el nombre de la carpeta y configura los permisos para tu equipo.'
                        : (sharingNote?.title || 'Sin Título')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseShareModal}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Rename Category Section */}
              {shareTargetType === 'category' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Nombre de la Carpeta:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameCategoryInput}
                      onChange={(e) => setRenameCategoryInput(e.target.value)}
                      placeholder="Ej: Finanzas, Estrategia, Clientes..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      disabled={isRenamingCategory || !renameCategoryInput.trim() || renameCategoryInput.trim().toLowerCase() === (sharingCategoryName || '').toLowerCase()}
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

              {/* Company-Wide Public Toggle for Category */}
              {shareTargetType === 'category' && (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                      <Globe size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Toda la Empresa</p>
                      <p className="text-[11px] text-slate-500">Cualquier miembro de la organización podrá ver las notas de esta carpeta.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCategoryCompanyPublic(!isCategoryCompanyPublic)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isCategoryCompanyPublic 
                        ? 'bg-ng-lime text-ng-black font-black text-white shadow-xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isCategoryCompanyPublic ? 'Habilitado' : 'Habilitar'}
                  </button>
                </div>
              )}

              {/* Share with Member form */}
              <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-700 block">Invitar compañero:</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedShareMemberId}
                    onChange={(e) => setSelectedShareMemberId(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate"
                  >
                    <option value="">Selecciona un integrante...</option>
                    {teamMembers
                      .filter(m => m.id !== memberId)
                      .map((m, mIdx) => (
                        <option key={`personal_notes_share_m_opt_${m.id || mIdx}_${mIdx}`} value={m.id}>{m.name} ({m.email || 'Sin email'})</option>
                      ))}
                  </select>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={selectedShareRole}
                      onChange={(e) => setSelectedShareRole(e.target.value as 'viewer' | 'editor')}
                      className="w-36 sm:w-40 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="viewer">Lector (Solo Ver)</option>
                      <option value="editor">Editor (Modificar)</option>
                    </select>
                    <button
                      type="button"
                      disabled={!selectedShareMemberId || shareActionLoading}
                      onClick={shareTargetType === 'category' ? handleShareCategoryMember : handleShareNoteMember}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0 shadow-xs cursor-pointer"
                    >
                      {shareActionLoading ? '...' : 'Agregar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Shared members list */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700 block">Personas con acceso:</label>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl bg-slate-50/50">
                  {/* Creator / Owner */}
                  <div className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                        {getOwnerName(sharingNote?.createdByMemberId || memberId).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-800">{getOwnerName(sharingNote?.createdByMemberId || memberId)} (Tú)</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Propietario</span>
                  </div>

                  {/* If sharing single note */}
                  {shareTargetType === 'note' && sharingNote?.sharedWith?.map((s, sIdx) => {
                    const memberObj = teamMembers.find(m => m.id === s.memberId);
                    return (
                      <div key={`pnote_share_mem_${s.memberId || sIdx}_${sIdx}`} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {(memberObj?.name || s.memberId).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{memberObj?.name || s.memberId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            s.role === 'editor' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.role === 'editor' ? 'Editor' : 'Lector'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeShareNote(s.memberId)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Revocar acceso"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* If sharing entire category */}
                  {shareTargetType === 'category' && categorySharedMembers.map((s, sIdx) => {
                    const memberObj = teamMembers.find(m => m.id === s.memberId);
                    return (
                      <div key={`pcat_share_mem_${s.memberId || sIdx}_${sIdx}`} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {(memberObj?.name || s.memberId).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{memberObj?.name || s.memberId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            s.role === 'editor' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.role === 'editor' ? 'Editor' : 'Lector'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeShareCategory(s.memberId)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Revocar acceso de toda la carpeta"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCloseShareModal}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit">
                <Trash2 size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">¿Eliminar esta nota?</h4>
                <p className="text-xs text-slate-500 font-medium">
                  Esta acción eliminará permanentemente la nota "{noteToDelete.title}". Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoteToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(noteToDelete)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  Sí, eliminar nota
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
