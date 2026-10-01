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
  CheckCheck,
  MessageSquare,
  MessageCircle,
  GripVertical,
  Printer,
  Link as LinkIcon,
  ExternalLink,
  FileDown,
  History,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
  Undo2,
  Redo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TeamMember, PersonalNote, NoteShareAccess, NoteHistoryEntry } from '../../types';
import { UniversalCommentsModal, UniversalCommentsThread } from './UniversalCommentsThread';
import { ObsidianLiveEditor, ObsidianLiveEditorHandle } from './ObsidianLiveEditor';

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

  // Drag & Drop State for Categories
  const [draggedCategoryName, setDraggedCategoryName] = useState<string | null>(null);
  const [dragOverCategoryName, setDragOverCategoryName] = useState<string | null>(null);
  const [dropCategoryPosition, setDropCategoryPosition] = useState<'before' | 'after' | null>(null);

  // Drag & Drop State for Note Cards (Intra-category only)
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [draggedNoteCategory, setDraggedNoteCategory] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);
  const [dropNotePosition, setDropNotePosition] = useState<'before' | 'after' | null>(null);

  // Category Edit / Rename State inside modal
  const [renameCategoryInput, setRenameCategoryInput] = useState<string>('');
  const [isRenamingCategory, setIsRenamingCategory] = useState<boolean>(false);
  const [renameCategorySuccess, setRenameCategorySuccess] = useState<boolean>(false);

  // Active Note in Editor Modal / View
  const [activeNote, setActiveNote] = useState<PersonalNote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<ViewMode>('live');
  const [activeCommentNote, setActiveCommentNote] = useState<PersonalNote | null>(null);

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
  const [copiedLinkFeedback, setCopiedLinkFeedback] = useState<boolean>(false);
  const [isWikilinkPickerOpen, setIsWikilinkPickerOpen] = useState<boolean>(false);
  const [wikilinkSearch, setWikilinkSearch] = useState<string>('');

  // Delete Confirm State
  const [noteToDelete, setNoteToDelete] = useState<PersonalNote | null>(null);

  // Unified Share Modal State (Note or Category)
  const [shareTargetType, setShareTargetType] = useState<'note' | 'category' | null>(null);
  const [sharingNote, setSharingNote] = useState<PersonalNote | null>(null);
  const [sharingCategoryName, setSharingCategoryName] = useState<string | null>(null);
  const [selectedShareMemberId, setSelectedShareMemberId] = useState<string>('');
  const [selectedShareRole, setSelectedShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareActionLoading, setShareActionLoading] = useState<boolean>(false);

  // Reference for Obsidian Live Preview editor
  const obsidianEditorRef = useRef<ObsidianLiveEditorHandle>(null);

  // Split Right Sidebar State (Comments & History)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [rightSidebarTab, setRightSidebarTab] = useState<'comments' | 'history'>('comments');
  const [previewingHistoryEntry, setPreviewingHistoryEntry] = useState<NoteHistoryEntry | null>(null);
  const [restoredNotification, setRestoredNotification] = useState<string | null>(null);

  // Undo / Redo History Stack for the Editor
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastSnapshotRef = useRef<string>(formContent);

  // Navigation History across referenced notes
  const [noteNavHistory, setNoteNavHistory] = useState<string[]>([]);

  const pushUndoSnapshot = (prevText: string) => {
    setUndoStack((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === prevText) return prev;
      return [...prev.slice(-50), prevText];
    });
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (obsidianEditorRef.current) {
      obsidianEditorRef.current.undo();
      return;
    }
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const last = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, -1);
      setRedoStack((prevRedo) => [...prevRedo.slice(-50), formContent]);
      setFormContent(last);
      lastSnapshotRef.current = last;
      return newUndo;
    });
  };

  const handleRedo = () => {
    if (obsidianEditorRef.current) {
      obsidianEditorRef.current.redo();
      return;
    }
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, -1);
      setUndoStack((prevUndo) => [...prevUndo.slice(-50), formContent]);
      setFormContent(next);
      lastSnapshotRef.current = next;
      return newRedo;
    });
  };

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

  // Deep linking: Open note directly if present in URL (?note=ID or ?nota=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteIdFromUrl = params.get('note') || params.get('nota');
    if (noteIdFromUrl && notes.length > 0) {
      const found = notes.find((n) => n.id === noteIdFromUrl);
      if (found && (!activeNote || activeNote.id !== found.id)) {
        handleOpenNote(found, false);
      }
    }
  }, [notes]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const noteIdFromUrl = params.get('note') || params.get('nota');
      if (noteIdFromUrl) {
        const found = notes.find((n) => n.id === noteIdFromUrl);
        if (found) {
          handleOpenNote(found, false);
        }
      } else {
        setIsEditorOpen(false);
        setActiveNote(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [notes]);

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

    const url = new URL(window.location.href);
    url.searchParams.delete('note');
    url.searchParams.delete('nota');
    window.history.pushState({}, '', url.toString());
  };

  // Open note for editing/viewing with navigation history support
  const handleOpenNote = (note: PersonalNote, pushUrl = true, pushHistory = true) => {
    if (pushHistory && activeNote && activeNote.id && activeNote.id !== note.id) {
      setNoteNavHistory((prev) => [...prev, activeNote.id]);
    }
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

    if (pushUrl && note.id) {
      const url = new URL(window.location.href);
      url.searchParams.set('note', note.id);
      window.history.pushState({ noteId: note.id }, '', url.toString());
    }
  };

  // Close editor and clear URL param
  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setActiveNote(null);
    setNoteNavHistory([]);
    const url = new URL(window.location.href);
    url.searchParams.delete('note');
    url.searchParams.delete('nota');
    window.history.pushState({}, '', url.toString());
  };

  // Back button handler (goes back in note history or closes editor)
  const handleBack = () => {
    if (noteNavHistory.length > 0) {
      const prevId = noteNavHistory[noteNavHistory.length - 1];
      setNoteNavHistory((prev) => prev.slice(0, -1));
      const prevNote = notes.find((n) => n.id === prevId);
      if (prevNote) {
        handleOpenNote(prevNote, true, false);
        return;
      }
    }
    handleCloseEditor();
  };

  // Copy unique URL of the note
  const handleCopyNoteLink = (noteId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = noteId || activeNote?.id;
    if (!targetId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('note', targetId);
    navigator.clipboard.writeText(url.toString());
    setCopiedLinkFeedback(true);
    setTimeout(() => setCopiedLinkFeedback(false), 2000);
  };

  // Wikilink Click Handler [[Title]]
  const handleWikilinkClick = (targetTitleOrId: string) => {
    const cleanTarget = targetTitleOrId.trim().toLowerCase();
    const found = notes.find(
      (n) =>
        n.id.toLowerCase() === cleanTarget ||
        (n.title && n.title.trim().toLowerCase() === cleanTarget)
    );
    if (found) {
      handleOpenNote(found, true, true);
    } else {
      alert(`No se encontró una nota con el nombre "${targetTitleOrId}". Puedes crear una nueva nota con ese título.`);
    }
  };

  // Insert Wikilink from Picker
  const insertWikilink = (targetNoteTitle: string) => {
    insertMarkdown(`[[${targetNoteTitle}]]`, '', '');
    setIsWikilinkPickerOpen(false);
    setWikilinkSearch('');
  };

  // Export / Print Note to High-Quality PDF
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor habilita las ventanas emergentes (popups) para exportar el documento a PDF.');
      return;
    }

    const title = formTitle.trim() || 'Nota sin título';
    const category = formCategory === 'custom' ? (formCustomCategory || 'General') : formCategory;
    const author = activeNote?.createdByName || currentMember?.name || 'Usuario';
    const dateStr = new Date(activeNote?.updatedAt || activeNote?.createdAt || Date.now()).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const parsedLines = formContent.split('\n').map(line => {
      if (line.startsWith('# ')) {
        return `<h1 style="font-size:24px; font-weight:900; border-bottom:2px solid #e2e8f0; padding-bottom:6px; margin-top:20px; color:#0f172a;">${line.substring(2)}</h1>`;
      }
      if (line.startsWith('## ')) {
        return `<h2 style="font-size:19px; font-weight:800; margin-top:16px; color:#1e293b;">${line.substring(3)}</h2>`;
      }
      if (line.startsWith('### ')) {
        return `<h3 style="font-size:16px; font-weight:700; margin-top:12px; color:#334155;">${line.substring(4)}</h3>`;
      }
      if (line.startsWith('#### ')) {
        return `<h4 style="font-size:14px; font-weight:700; margin-top:10px; color:#475569;">${line.substring(5)}</h4>`;
      }
      if (line.match(/^- \[[ xX]\] /)) {
        const isChecked = line.startsWith('- [x]') || line.startsWith('- [X]');
        const text = line.substring(6);
        return `<div style="display:flex; align-items:center; gap:8px; margin:4px 0; font-size:13px; color:${isChecked ? '#94a3b8; text-decoration:line-through;' : '#334155;'}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} disabled style="margin:0; width:14px; height:14px;" />
          <span>${text}</span>
        </div>`;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li style="font-size:13px; color:#334155; margin-left:20px; line-height:1.6;">${line.substring(2)}</li>`;
      }
      if (line.match(/^\d+\.\s/)) {
        return `<div style="font-size:13px; color:#334155; margin-left:10px; margin-top:3px; line-height:1.6;"><b>${line.match(/^(\d+\.)/)?.[1]}</b> ${line.replace(/^\d+\.\s/, '')}</div>`;
      }
      if (line.startsWith('> [!NOTE]')) {
        return `<blockquote style="border-left:4px solid #3b82f6; background:#eff6ff; padding:8px 12px; margin:8px 0; color:#1e40af; font-size:13px; border-radius:0 6px 6px 0;"><b>ℹ️ NOTA:</b> ${line.replace('> [!NOTE]', '')}</blockquote>`;
      }
      if (line.startsWith('> [!TIP]')) {
        return `<blockquote style="border-left:4px solid #10b981; background:#ecfdf5; padding:8px 12px; margin:8px 0; color:#065f46; font-size:13px; border-radius:0 6px 6px 0;"><b>💡 CONSEJO:</b> ${line.replace('> [!TIP]', '')}</blockquote>`;
      }
      if (line.startsWith('> [!WARNING]')) {
        return `<blockquote style="border-left:4px solid #f59e0b; background:#fffbeb; padding:8px 12px; margin:8px 0; color:#92400e; font-size:13px; border-radius:0 6px 6px 0;"><b>⚠️ ALERTA:</b> ${line.replace('> [!WARNING]', '')}</blockquote>`;
      }
      if (line.startsWith('> ')) {
        return `<blockquote style="border-left:4px solid #6366f1; background:#f8fafc; padding:8px 12px; margin:8px 0; color:#475569; font-style:italic; font-size:13px; border-radius:0 6px 6px 0;">${line.substring(2)}</blockquote>`;
      }
      if (line.startsWith('|') && line.endsWith('|')) {
        if (line.includes('---')) return '';
        const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
        return `<tr style="border-bottom:1px solid #e2e8f0;">${cells.map(c => `<td style="padding:6px 10px; font-size:12px; color:#334155;">${c.trim()}</td>`).join('')}</tr>`;
      }
      if (line === '---' || line === '***') return '<hr style="border:0; border-top:1px solid #e2e8f0; margin:16px 0;" />';
      if (!line.trim()) return '<div style="height:10px;"></div>';
      
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/==(.*?)==/g, '<mark style="background:#fef08a; padding:1px 4px; border-radius:2px;">$1</mark>')
        .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:2px 4px; border-radius:3px; font-family:monospace; font-size:12px;">$1</code>')
        .replace(/\[\[(.*?)\]\]/g, '<span style="background:#e0e7ff; color:#4338ca; padding:2px 6px; border-radius:4px; font-weight:600; font-size:11px;">📄 $1</span>');
        
      return `<p style="font-size:13px; line-height:1.6; color:#334155; margin:4px 0;">${formatted}</p>`;
    }).join('\n');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Novagreen IA</title>
          <meta charset="utf-8" />
          <style>
            @page { margin: 15mm 20mm; size: A4; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
            .logo { font-size: 20px; font-weight: 900; color: #1e1b4b; letter-spacing: -0.5px; }
            .logo span { color: #6366f1; }
            .meta { font-size: 11px; color: #64748b; font-weight: 600; text-align: right; }
            .note-title { font-size: 26px; font-weight: 900; color: #0f172a; margin-bottom: 8px; line-height: 1.2; }
            .note-badge { display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; margin-bottom: 18px; }
            .content { margin-top: 15px; }
            table { width: 100%; border-collapse: collapse; margin: 14px 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
            tr:first-child { background: #f8fafc; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
              .header { margin-top: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Novagreen <span>IA</span></div>
            <div class="meta">
              <div>Fecha: ${dateStr}</div>
              <div>Autor: ${author}</div>
            </div>
          </div>
          <div class="note-title">${title}</div>
          <div class="note-badge">📁 Carpeta: ${category}</div>
          <div class="content">
            ${parsedLines}
          </div>
          <div class="footer">
            <span>Novagreen Intelligent Assistant • Sistema Integrado de Notas</span>
            <span>Documento Oficial</span>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
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

      // Generate version history entry
      const prevWords = activeNote?.content ? activeNote.content.trim().split(/\s+/).filter(Boolean).length : 0;
      const curWords = formContent.trim().split(/\s+/).filter(Boolean).length;
      const wordDiff = curWords - prevWords;
      const diffText = !activeNote 
        ? 'Creación inicial de la nota'
        : wordDiff > 0 
        ? `+${wordDiff} palabras añadidas` 
        : wordDiff < 0 
        ? `${wordDiff} palabras eliminadas` 
        : 'Ajuste de formato / contenido';

      const historyEntry: NoteHistoryEntry = {
        id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        savedAt: new Date().toISOString(),
        authorId: memberId,
        authorName: currentMember?.name || 'Usuario',
        authorAvatar: currentMember?.avatar,
        title: formTitle.trim(),
        content: formContent,
        summary: diffText,
        wordsCount: curWords
      };

      const existingHistory = activeNote?.history || [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const updatedHistory = [historyEntry, ...existingHistory]
        .filter(h => new Date(h.savedAt).getTime() >= thirtyDaysAgo.getTime())
        .slice(0, 100);

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
        moduleContext: moduleName,
        history: updatedHistory
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

  // Handlers: Drag & Drop Reorder Categories
  const handleCategoryDragStart = (e: React.DragEvent, catName: string) => {
    e.dataTransfer.setData('text/plain', catName);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCategoryName(catName);
  };

  const handleCategoryDragOver = (e: React.DragEvent, targetCatName: string) => {
    if (!draggedCategoryName || draggedCategoryName === targetCatName) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    setDragOverCategoryName(targetCatName);
    setDropCategoryPosition(pos);
  };

  const handleCategoryDragLeave = (e: React.DragEvent, targetCatName: string) => {
    if (dragOverCategoryName === targetCatName) {
      setDragOverCategoryName(null);
      setDropCategoryPosition(null);
    }
  };

  const handleCategoryDrop = async (e: React.DragEvent, targetCatName: string) => {
    e.preventDefault();
    if (!draggedCategoryName || draggedCategoryName === targetCatName) {
      setDraggedCategoryName(null);
      setDragOverCategoryName(null);
      setDropCategoryPosition(null);
      return;
    }

    const visibleCategories = categoriesList.filter(
      (cat) => (groupedNotes[cat] || []).length > 0 && (selectedCategoryFilter === 'all' || selectedCategoryFilter === cat)
    );

    const fromIdx = visibleCategories.indexOf(draggedCategoryName);
    const toIdx = visibleCategories.indexOf(targetCatName);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedCategoryName(null);
      setDragOverCategoryName(null);
      setDropCategoryPosition(null);
      return;
    }

    const updated = visibleCategories.filter(c => c !== draggedCategoryName);
    const targetIdx = updated.indexOf(targetCatName);
    const insertIndex = dropCategoryPosition === 'before' ? Math.max(0, targetIdx) : targetIdx + 1;
    updated.splice(insertIndex, 0, draggedCategoryName);

    const finalOrder = [...updated];
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

    setDraggedCategoryName(null);
    setDragOverCategoryName(null);
    setDropCategoryPosition(null);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryName(null);
    setDragOverCategoryName(null);
    setDropCategoryPosition(null);
  };

  // Handlers: Drag & Drop Reorder Note Cards (Strictly intra-category)
  const handleNoteDragStart = (e: React.DragEvent, note: PersonalNote) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', note.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoteId(note.id);
    setDraggedNoteCategory((note.category || 'General').trim());
  };

  const handleNoteDragOver = (e: React.DragEvent, targetNote: PersonalNote) => {
    const targetCategory = (targetNote.category || 'General').trim();
    if (!draggedNoteId || draggedNoteId === targetNote.id || draggedNoteCategory !== targetCategory) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'before' : 'after';
    setDragOverNoteId(targetNote.id);
    setDropNotePosition(pos);
  };

  const handleNoteDragLeave = (e: React.DragEvent, targetNote: PersonalNote) => {
    if (dragOverNoteId === targetNote.id) {
      setDragOverNoteId(null);
      setDropNotePosition(null);
    }
  };

  const handleNoteDrop = async (e: React.DragEvent, targetNote: PersonalNote, catNotes: PersonalNote[]) => {
    e.preventDefault();
    e.stopPropagation();

    const targetCategory = (targetNote.category || 'General').trim();
    if (!draggedNoteId || draggedNoteId === targetNote.id || draggedNoteCategory !== targetCategory) {
      setDraggedNoteId(null);
      setDraggedNoteCategory(null);
      setDragOverNoteId(null);
      setDropNotePosition(null);
      return;
    }

    const currentIds = catNotes.map(n => n.id);
    const filtered = currentIds.filter(id => id !== draggedNoteId);
    const targetIdx = filtered.indexOf(targetNote.id);
    const insertIdx = dropNotePosition === 'before' ? Math.max(0, targetIdx) : targetIdx + 1;
    filtered.splice(insertIdx, 0, draggedNoteId);

    try {
      const updatePromises = filtered.map((noteId, idx) => {
        return setDoc(doc(db, 'user_personal_notes', noteId), {
          order: idx,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error reordering notes:', err);
    }

    setDraggedNoteId(null);
    setDraggedNoteCategory(null);
    setDragOverNoteId(null);
    setDropNotePosition(null);
  };

  const handleNoteDragEnd = () => {
    setDraggedNoteId(null);
    setDraggedNoteCategory(null);
    setDragOverNoteId(null);
    setDropNotePosition(null);
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

  // Insert markdown syntax helper in unified Obsidian Live Preview editor
  const insertMarkdown = (prefix: string, suffix: string = '', defaultText: string = '') => {
    pushUndoSnapshot(formContent);
    if (obsidianEditorRef.current) {
      obsidianEditorRef.current.insertMarkdown(prefix, suffix, defaultText);
      return;
    }
    const updated = formContent ? `${formContent}\n${prefix}${defaultText}${suffix}` : `${prefix}${defaultText}${suffix}`;
    setFormContent(updated);
    lastSnapshotRef.current = updated;
  };

  // Toggle task checkbox inside live markdown text
  const handleToggleTaskCheckbox = (lineIndex: number, currentChecked: boolean) => {
    pushUndoSnapshot(formContent);
    const lines = formContent.split('\n');
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      if (currentChecked) {
        lines[lineIndex] = line.replace(/^- \[[xX]\]/, '- [ ]');
      } else {
        lines[lineIndex] = line.replace(/^- \[ \]/, '- [x]');
      }
      const updated = lines.join('\n');
      setFormContent(updated);
      lastSnapshotRef.current = updated;
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

  // Keyboard shortcut Ctrl+S (Save), Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditorOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveNote();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, formTitle, formContent, formCategory, formCustomCategory, formTags, formColor, formIsPinned, formIsCompanyPublic, undoStack, redoStack]);

  // Reading metrics
  const wordsCount = useMemo(() => {
    if (!formContent.trim()) return 0;
    return formContent.trim().split(/\s+/).length;
  }, [formContent]);

  const readingTimeMin = Math.max(1, Math.ceil(wordsCount / 200));

  // Render inline markdown with clickable wikilinks and formatting
  const renderInlineMarkdown = (text: string) => {
    const parts = [];
    const wikiRegex = /\[\[(.*?)\]\]/g;
    let lastIndex = 0;
    let match;

    while ((match = wikiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'wikilink', target: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return (
      <>
        {parts.map((p, pIdx) => {
          if (p.type === 'wikilink') {
            return (
              <button
                key={`wiki_inline_${pIdx}_${p.target}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWikilinkClick(p.target);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-950 border border-indigo-200/90 rounded-md text-xs font-bold transition-all shadow-2xs group cursor-pointer select-none align-baseline"
                title={`Abrir nota referenciada: "${p.target}"`}
              >
                <FileText size={11} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>{p.target}</span>
                <ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          }

          const boldParts = p.content.split(/(\*\*.*?\*\*)/g);
          return (
            <span key={`text_part_${pIdx}`}>
              {boldParts.map((bPart, bIdx) => {
                if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
                  return <strong key={`b_${bIdx}`} className="font-black text-slate-900">{bPart.slice(2, -2)}</strong>;
                }
                const italicParts = bPart.split(/(\*.*?\*)/g);
                return (
                  <span key={`sub_${bIdx}`}>
                    {italicParts.map((iPart, iIdx) => {
                      if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
                        return <em key={`i_${iIdx}`} className="italic text-slate-700">{iPart.slice(1, -1)}</em>;
                      }
                      const highlightParts = iPart.split(/(==.*?==)/g);
                      return (
                        <span key={`sub_i_${iIdx}`}>
                          {highlightParts.map((hPart, hIdx) => {
                            if (hPart.startsWith('==') && hPart.endsWith('==') && hPart.length >= 4) {
                              return <mark key={`h_${hIdx}`} className="bg-amber-200/80 px-1 py-0.5 rounded text-slate-900 font-medium">{hPart.slice(2, -2)}</mark>;
                            }
                            const codeParts = hPart.split(/(`.*?`)/g);
                            return (
                              <span key={`sub_h_${hIdx}`}>
                                {codeParts.map((cPart, cIdx) => {
                                  if (cPart.startsWith('`') && cPart.endsWith('`') && cPart.length >= 2) {
                                    return <code key={`c_${cIdx}`} className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 font-mono text-xs rounded border border-slate-200">{cPart.slice(1, -1)}</code>;
                                  }
                                  return <span key={`raw_${cIdx}`}>{cPart}</span>;
                                })}
                              </span>
                            );
                          })}
                        </span>
                      );
                    })}
                  </span>
                );
              })}
            </span>
          );
        })}
      </>
    );
  };

  // Render full interactive markdown document (Headings, Checklists, Callouts, Tables, Code, Quotes, Lists)
  const renderInteractiveMarkdown = (rawContent: string) => {
    if (!rawContent || !rawContent.trim()) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
          <FileText size={32} className="text-slate-300" />
          <p className="text-sm italic">Esta nota no tiene contenido aún. Comienza a escribir en el editor.</p>
        </div>
      );
    }

    const lines = rawContent.split('\n');
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockLang = '';
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block ```
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code_block_${i}`} className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs shadow-md">
              {codeBlockLang && (
                <div className="bg-slate-900 px-3.5 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>{codeBlockLang}</span>
                  <span className="text-[9px] text-slate-500 font-normal">Bloque de Código</span>
                </div>
              )}
              <pre className="p-4 overflow-x-auto leading-relaxed whitespace-pre font-mono">
                <code>{codeBlockLines.join('\n')}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockLines = [];
          codeBlockLang = '';
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().substring(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Empty Line
      if (!line.trim()) {
        elements.push(<div key={`blank_${i}`} className="h-2.5" />);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1_${i}`} className="text-2xl sm:text-3xl font-black text-slate-900 pt-3 pb-1 border-b border-slate-100 mt-2 tracking-tight">
            {renderInlineMarkdown(line.substring(2))}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2_${i}`} className="text-xl sm:text-2xl font-black text-slate-800 pt-2.5 pb-0.5 mt-2 tracking-tight">
            {renderInlineMarkdown(line.substring(3))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3_${i}`} className="text-lg sm:text-xl font-bold text-slate-800 pt-2 pb-0.5 mt-1">
            {renderInlineMarkdown(line.substring(4))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4_${i}`} className="text-base font-bold text-slate-700 pt-1.5 pb-0.5">
            {renderInlineMarkdown(line.substring(5))}
          </h4>
        );
        continue;
      }

      // Horizontal Divider
      if (line === '---' || line === '***' || line === '___') {
        elements.push(<hr key={`hr_${i}`} className="my-4 border-t border-slate-200" />);
        continue;
      }

      // Interactive Checklist - [ ] or - [x]
      if (/^- \[[ xX]\] /.test(line)) {
        const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
        const text = line.substring(6);
        const lineIdx = i;
        elements.push(
          <div key={`task_${i}`} className="flex items-center gap-2.5 py-1 px-2 rounded-xl hover:bg-slate-50 transition-colors group">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleToggleTaskCheckbox(lineIdx, isChecked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
            />
            <span className={`text-sm sm:text-[15px] select-text transition-all ${isChecked ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-medium'}`}>
              {renderInlineMarkdown(text)}
            </span>
          </div>
        );
        continue;
      }

      // Bullet List
      if (/^(- |\* )/.test(line)) {
        elements.push(
          <div key={`bullet_${i}`} className="flex items-start gap-2.5 py-0.5 pl-3">
            <span className="text-indigo-500 font-black text-sm select-none leading-relaxed">•</span>
            <span className="text-sm sm:text-[15px] text-slate-800 font-normal leading-relaxed">
              {renderInlineMarkdown(line.substring(2))}
            </span>
          </div>
        );
        continue;
      }

      // Numbered List
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)?.[1] || '1';
        const text = line.replace(/^\d+\.\s/, '');
        elements.push(
          <div key={`num_${i}`} className="flex items-start gap-2 py-0.5 pl-3">
            <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-1.5 py-0.5 rounded font-mono select-none mt-0.5 shrink-0">{num}.</span>
            <span className="text-sm sm:text-[15px] text-slate-800 font-normal leading-relaxed">
              {renderInlineMarkdown(text)}
            </span>
          </div>
        );
        continue;
      }

      // Callouts: > [!NOTE], > [!TIP], > [!WARNING]
      if (line.startsWith('> [!NOTE]')) {
        elements.push(
          <div key={`note_${i}`} className="p-3 bg-blue-50/80 border-l-4 border-blue-500 rounded-r-2xl my-2 text-xs sm:text-sm text-blue-900 font-medium flex items-start gap-2.5 shadow-2xs">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{renderInlineMarkdown(line.replace('> [!NOTE]', '').trim())}</div>
          </div>
        );
        continue;
      }
      if (line.startsWith('> [!TIP]')) {
        elements.push(
          <div key={`tip_${i}`} className="p-3 bg-emerald-50/80 border-l-4 border-emerald-500 rounded-r-2xl my-2 text-xs sm:text-sm text-emerald-900 font-medium flex items-start gap-2.5 shadow-2xs">
            <Lightbulb size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{renderInlineMarkdown(line.replace('> [!TIP]', '').trim())}</div>
          </div>
        );
        continue;
      }
      if (line.startsWith('> [!WARNING]')) {
        elements.push(
          <div key={`warn_${i}`} className="p-3 bg-amber-50/80 border-l-4 border-amber-500 rounded-r-2xl my-2 text-xs sm:text-sm text-amber-900 font-medium flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{renderInlineMarkdown(line.replace('> [!WARNING]', '').trim())}</div>
          </div>
        );
        continue;
      }
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={`quote_${i}`} className="border-l-4 border-slate-300 pl-3.5 py-1 my-2 text-sm italic text-slate-600 bg-slate-50/60 rounded-r-xl leading-relaxed">
            {renderInlineMarkdown(line.substring(2))}
          </blockquote>
        );
        continue;
      }

      // Table parsing
      if (line.startsWith('|') && line.endsWith('|')) {
        const tableLines = [line];
        while (i + 1 < lines.length && lines[i + 1].startsWith('|') && lines[i + 1].endsWith('|')) {
          i++;
          tableLines.push(lines[i]);
        }
        const headerRow = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        const bodyRows = tableLines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

        elements.push(
          <div key={`table_${i}`} className="my-3 overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200">
                  {headerRow.map((h, hIdx) => (
                    <th key={`th_${hIdx}`} className="p-2.5 font-bold text-slate-800">{renderInlineMarkdown(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bodyRows.map((row, rIdx) => (
                  <tr key={`tr_${rIdx}`} className="hover:bg-slate-50/80 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={`td_${rIdx}_${cIdx}`} className="p-2.5 text-slate-700">{renderInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Standard Paragraph
      elements.push(
        <p key={`p_${i}`} className="text-sm sm:text-[15px] leading-relaxed text-slate-800 my-1 select-text">
          {renderInlineMarkdown(line)}
        </p>
      );
    }

    return elements;
  };

  return (
    <div className="w-full space-y-2.5 animate-fade-in text-slate-800">
      {/* FULL OBSIDIAN WORKSPACE (DEDICATED FULL-PAGE VIEW) */}
      {isEditorOpen ? (
        <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl flex flex-col overflow-hidden text-slate-800 animate-fade-in h-[calc(100vh-115px)] max-h-[calc(100vh-115px)]">
          {/* UNIFIED PERSISTENT TOP HEADER & FORMATTING TOOLBAR */}
          <div className="shrink-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
            {/* TOP WORKSPACE NAVIGATION & CONTROLS */}
            <div className="p-3.5 sm:p-5 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/90 shadow-2xs transition-all cursor-pointer shrink-0 group"
                  title={noteNavHistory.length > 0 ? "Volver a la nota anterior" : "Volver a la vista de carpetas y notas"}
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform text-slate-500" />
                  <span>{noteNavHistory.length > 0 ? "Volver" : "Notas"}</span>
                </button>

              <div className="h-5 w-px bg-slate-300 hidden sm:block shrink-0" />

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Folder size={14} className="text-indigo-600" />
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                  >
                    {categoriesList.map((c, cIdx) => (
                      <option key={`pnote_f_cat_${c || cIdx}_${cIdx}`} value={c}>{c}</option>
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
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-36 font-semibold"
                  />
                )}

                <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-medium ml-2 shrink-0">
                  <span>{wordsCount} palabras</span>
                  <span>•</span>
                  <span>~{readingTimeMin} min lectura</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {/* Copy URL Link */}
              <button
                type="button"
                onClick={(e) => handleCopyNoteLink(activeNote?.id, e)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                  copiedLinkFeedback
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Copiar URL única de esta nota"
              >
                {copiedLinkFeedback ? <Check size={13} /> : <LinkIcon size={13} />}
                <span>{copiedLinkFeedback ? '¡Link Copiado!' : 'Copiar Link'}</span>
              </button>

              {/* Export PDF Button */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-2xs cursor-pointer"
                title="Exportar documento oficial a PDF"
              >
                <Printer size={13} className="text-rose-500" />
                <span>PDF</span>
              </button>

              {/* Download Markdown */}
              <button
                type="button"
                onClick={(e) => activeNote ? handleDownloadMd(activeNote, e) : handleDownloadMd({ id: 'temp', title: formTitle, content: formContent, category: formCategory, createdByMemberId: memberId, createdAt: '', updatedAt: '' }, e)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-2xs cursor-pointer"
                title="Descargar archivo .md"
              >
                <FileDown size={13} className="text-slate-500" />
                <span>.md</span>
              </button>

              {/* Comments (if saved) */}
              {activeNote?.id && (
                <button
                  type="button"
                  onClick={() => setActiveCommentNote(activeNote)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs transition-all border border-blue-200 shadow-2xs cursor-pointer"
                  title="Comentarios de la nota"
                >
                  <MessageSquare size={13} className="text-blue-600" />
                  <span>Comentarios</span>
                </button>
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-black text-xs shadow-sm transition-all cursor-pointer"
                title="Guardar cambios (Ctrl+S)"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SAVE SUCCESS NOTIFICATION */}
          {saveSuccessNotification && (
            <div className="bg-emerald-500 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 animate-fade-in shadow-inner">
              <CheckCircle2 size={14} />
              <span>Nota guardada exitosamente en la nube</span>
            </div>
          )}

          {/* RESTORED VERSION NOTIFICATION */}
          {restoredNotification && (
            <div className="bg-indigo-600 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 animate-fade-in shadow-inner">
              <RotateCcw size={14} />
              <span>{restoredNotification}</span>
            </div>
          )}

          {/* SECONDARY FORMATTING TOOLBAR */}
          <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Markdown Syntax Tools */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                title="Título 1 (# )"
                onClick={() => insertMarkdown('# ', '', 'Título Principal')}
                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-black text-xs shadow-2xs cursor-pointer"
              >
                H1
              </button>
              <button
                type="button"
                title="Título 2 (## )"
                onClick={() => insertMarkdown('## ', '', 'Subtítulo')}
                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs shadow-2xs cursor-pointer"
              >
                H2
              </button>
              <button
                type="button"
                title="Título 3 (### )"
                onClick={() => insertMarkdown('### ', '', 'Sección')}
                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs shadow-2xs cursor-pointer"
              >
                H3
              </button>
              <button
                type="button"
                title="Título 4 (#### )"
                onClick={() => insertMarkdown('#### ', '', 'Subsección')}
                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs shadow-2xs cursor-pointer"
              >
                H4
              </button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <button
                type="button"
                title="Negrita (**texto**)"
                onClick={() => insertMarkdown('**', '**', 'negrita')}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold shadow-2xs cursor-pointer"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                title="Cursiva (*texto*)"
                onClick={() => insertMarkdown('*', '*', 'cursiva')}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                title="Resaltado (==texto==)"
                onClick={() => insertMarkdown('==', '==', 'resaltado')}
                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-amber-900 font-bold text-[11px] shadow-2xs cursor-pointer"
              >
                ==ab==
              </button>
              <button
                type="button"
                title="Lista de Tareas Interactivas (- [ ] )"
                onClick={() => insertMarkdown('- [ ] ', '', 'Nueva tarea')}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
              >
                <CheckSquare size={13} />
              </button>
              <button
                type="button"
                title="Lista con viñetas (- )"
                onClick={() => insertMarkdown('- ', '', 'Elemento')}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
              >
                <List size={13} />
              </button>
              <button
                type="button"
                title="Lista numerada (1. )"
                onClick={() => insertMarkdown('1. ', '', 'Primer punto')}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
              >
                <ListOrdered size={13} />
              </button>
              <button
                type="button"
                title="Cita / Callout (> )"
                onClick={() => insertMarkdown('> [!NOTE]\n> ', '', 'Anotación importante')}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
              >
                <Quote size={13} />
              </button>
              <button
                type="button"
                title="Tabla Markdown"
                onClick={() => insertMarkdown('\n| Columna 1 | Columna 2 | Columna 3 |\n| :--- | :--- | :--- |\n| Dato A | Dato B | Dato C |\n', '', '')}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
              >
                <TableIcon size={13} />
              </button>

              {/* Wikilink [[...]] Insertion */}
              <button
                type="button"
                onClick={() => setIsWikilinkPickerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Vincular a otra nota existente mediante [[Título]]"
              >
                <LinkIcon size={12} className="text-indigo-600" />
                <span>[[ Vincular Nota ]]</span>
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1" />

              {/* Undo / Redo Buttons */}
              <button
                type="button"
                disabled={undoStack.length === 0}
                onClick={handleUndo}
                className="p-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer disabled:cursor-not-allowed transition-all"
                title="Deshacer (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
              <button
                type="button"
                disabled={redoStack.length === 0}
                onClick={handleRedo}
                className="p-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer disabled:cursor-not-allowed transition-all"
                title="Rehacer (Ctrl+Y o Ctrl+Shift+Z)"
              >
                <Redo2 size={13} />
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1" />

              {/* Obsidian Live Preview Badge Indicator */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200/80 rounded-lg text-[11px] font-bold shadow-2xs">
                <Sparkles size={11} className="text-indigo-600 animate-pulse" />
                <span>Obsidian Live Preview</span>
              </div>
            </div>

            {/* Note Options (Pin, Public) & Right Sidebar Split Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                <input
                  type="checkbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <Pin size={11} className={formIsPinned ? "text-indigo-600 fill-indigo-600" : "text-slate-400"} />
                <span className="text-[11px] font-bold text-slate-700">Fijar</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                <input
                  type="checkbox"
                  checked={formIsCompanyPublic}
                  onChange={(e) => setFormIsCompanyPublic(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <Globe size={11} className={formIsCompanyPublic ? "text-blue-600" : "text-slate-400"} />
                <span className="text-[11px] font-bold text-slate-700">Pública</span>
              </label>

              <div className="h-4 w-px bg-slate-300 mx-0.5" />

              {/* Sidebar Split Toggle Button */}
              <button
                type="button"
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                  isRightSidebarOpen 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Mostrar/Ocultar panel lateral dividido de Comentarios e Historial"
              >
                {isRightSidebarOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
                <span className="hidden sm:inline">Panel Lateral</span>
                {activeNote?.history && activeNote.history.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isRightSidebarOpen ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {activeNote.history.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

          {/* MAIN SPLIT CONTAINER: Canvas on left, Comments/History on right */}
          <div className="flex-1 flex overflow-hidden">
            {/* MAIN DOCUMENT CANVAS */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-3 sm:p-6 lg:p-8">
              <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-10 space-y-6 min-h-[580px] flex flex-col">
                {/* Document Title Header Input */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <input
                    type="text"
                    placeholder="Título del Documento..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full text-2xl sm:text-4xl font-black text-slate-900 bg-transparent border-0 focus:outline-none placeholder-slate-300 leading-tight"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                    <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">📁 {formCategory}</span>
                    <span>•</span>
                    <span>{wordsCount} palabras</span>
                    <span>•</span>
                    <span>~{readingTimeMin} min lectura</span>
                  </div>
                </div>

                {/* Single Unified Obsidian Live Preview Document Canvas */}
                <div className="flex-1 flex flex-col min-h-[460px]">
                  <ObsidianLiveEditor
                    ref={obsidianEditorRef}
                    value={formContent}
                    onChange={(newVal) => {
                      setFormContent(newVal);
                      lastSnapshotRef.current = newVal;
                    }}
                    onWikilinkClick={handleWikilinkClick}
                    placeholder="Escribe aquí tu documento usando Markdown (# Título, ## Subtítulo, - [ ] Tarea, [[Nota]] Enlace)..."
                    autoFocus
                  />
                </div>

                {/* Tag Management Footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-500 flex items-center gap-1">
                      <Hash size={12} />
                      <span>Etiquetas:</span>
                    </span>
                    {formTags.map((t, tIdx) => (
                      <span
                        key={`ftag_${t}_${tIdx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold shadow-2xs"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-600 p-0.5 cursor-pointer"
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
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeNote && (
                      <button
                        type="button"
                        onClick={() => setNoteToDelete(activeNote)}
                        className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors cursor-pointer"
                      >
                        Eliminar Nota
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseEditor}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SPLIT RIGHT SIDEBAR (Comments & History) */}
            {isRightSidebarOpen && (
              <aside className="w-80 sm:w-96 border-l border-slate-200 bg-white flex flex-col h-full shadow-lg z-10 shrink-0">
                {/* Sidebar Header with Tabs */}
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold flex-1">
                    <button
                      type="button"
                      onClick={() => setRightSidebarTab('comments')}
                      className={`flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        rightSidebarTab === 'comments'
                          ? 'bg-white text-indigo-700 shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <MessageSquare size={13} />
                      <span>Comentarios</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightSidebarTab('history')}
                      className={`flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        rightSidebarTab === 'history'
                          ? 'bg-white text-indigo-700 shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <History size={13} />
                      <span>Historial</span>
                      {activeNote?.history && activeNote.history.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black">
                          {activeNote.history.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRightSidebarOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Ocultar panel lateral"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Sidebar Tab Content */}
                <div className="flex-1 overflow-y-auto">
                  {rightSidebarTab === 'comments' ? (
                    <div className="h-full flex flex-col p-3">
                      {activeNote?.id ? (
                        <UniversalCommentsThread
                          entityType="note"
                          entityId={activeNote.id}
                          entityTitle={formTitle || activeNote.title}
                          currentMember={currentMember}
                          members={teamMembers}
                          title="Comentarios de la Nota"
                        />
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <MessageSquare size={24} />
                          </div>
                          <p className="text-xs font-medium text-slate-600">
                            Guarda esta nota por primera vez para activar el hilo de comentarios y menciones <span className="font-bold text-indigo-600">@usuario</span> con tu equipo.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                          <History size={14} className="text-indigo-600" />
                          <span>Auditoría de Versiones</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                            30 días
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {activeNote?.history?.length || 0} revisiones
                          </span>
                        </div>
                      </div>

                      {/* History Versions List */}
                      {(!activeNote?.history || activeNote.history.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                            <Clock size={24} />
                          </div>
                          <p className="text-xs font-medium text-slate-500 max-w-[240px]">
                            Aún no hay revisiones históricas registradas. Cada vez que guardes cambios (o uses Ctrl+S), se creará un punto de restauración automático protegido por 30 días.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeNote.history.map((ver, vIdx) => {
                            const isCurrent = vIdx === 0;
                            const isPreviewing = previewingHistoryEntry?.id === ver.id;
                            const dateObj = new Date(ver.savedAt);
                            const formattedDate = dateObj.toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });

                            return (
                              <div
                                key={ver.id || `ver_${vIdx}`}
                                className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                  isCurrent
                                    ? 'bg-indigo-50/50 border-indigo-200'
                                    : 'bg-white hover:bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {ver.authorAvatar ? (
                                      <img
                                        src={ver.authorAvatar}
                                        alt={ver.authorName}
                                        className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                                        {(ver.authorName || 'U').charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                        <span>{ver.authorName}</span>
                                        {isCurrent && (
                                          <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
                                            Actual
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-medium">
                                        {formattedDate}
                                      </div>
                                    </div>
                                  </div>

                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                    v{activeNote.history!.length - vIdx}
                                  </span>
                                </div>

                                <div className="text-xs text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100 space-y-1">
                                  <div className="font-semibold text-slate-800 line-clamp-1">
                                    {ver.title || 'Sin Título'}
                                  </div>
                                  <div className="text-[11px] text-indigo-600 font-medium">
                                    {ver.summary || `${ver.wordsCount || 0} palabras`}
                                  </div>
                                </div>

                                {/* Preview Collapsible */}
                                {isPreviewing && (
                                  <div className="p-2.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                                    {ver.content || '(Contenido vacío)'}
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewingHistoryEntry(isPreviewing ? null : ver)}
                                    className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 cursor-pointer"
                                  >
                                    {isPreviewing ? 'Ocultar vista previa' : 'Ver contenido'}
                                  </button>

                                  {!isCurrent && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`¿Estás seguro de restaurar la versión v${activeNote.history!.length - vIdx} guardada por ${ver.authorName}?`)) {
                                          pushUndoSnapshot(formContent);
                                          setFormTitle(ver.title);
                                          setFormContent(ver.content);
                                          lastSnapshotRef.current = ver.content;
                                          setRestoredNotification(`Se restauró con éxito la versión v${activeNote.history!.length - vIdx}`);
                                          setTimeout(() => setRestoredNotification(null), 3500);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-black cursor-pointer transition-colors shadow-2xs"
                                    >
                                      <RotateCcw size={11} />
                                      <span>Restaurar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      ) : (
        <>
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
                <div 
                  key={`note_cat_sec_${cat}_${catIndex}`} 
                  onDragOver={(e) => handleCategoryDragOver(e, cat)}
                  onDragLeave={(e) => handleCategoryDragLeave(e, cat)}
                  onDrop={(e) => handleCategoryDrop(e, cat)}
                  className={`space-y-2.5 transition-all rounded-2xl p-1 ${
                    draggedCategoryName === cat ? 'opacity-30 bg-indigo-50/50' : ''
                  } ${
                    dragOverCategoryName === cat && dropCategoryPosition === 'before' ? 'border-t-2 border-indigo-500 pt-2' : ''
                  } ${
                    dragOverCategoryName === cat && dropCategoryPosition === 'after' ? 'border-b-2 border-indigo-500 pb-2' : ''
                  }`}
                >
                  {/* Category Header with Folder Sharing, Edit, Reorder and Add button */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      {/* Category 6-dots Drag Handle */}
                      <div
                        draggable={true}
                        onDragStart={(e) => handleCategoryDragStart(e, cat)}
                        onDragEnd={handleCategoryDragEnd}
                        className="p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded-md transition-colors inline-flex items-center justify-center select-none"
                        title="Arrastrar para reordenar carpeta (6 puntos)"
                      >
                        <GripVertical size={15} />
                      </div>

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
                        const isOverThisNote = dragOverNoteId === note.id;
                        
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
                            onDragOver={(e) => handleNoteDragOver(e, note)}
                            onDragLeave={(e) => handleNoteDragLeave(e, note)}
                            onDrop={(e) => handleNoteDrop(e, note, catNotes)}
                            className={`group relative bg-white border ${
                              note.pinned ? 'border-indigo-300 ring-1 ring-indigo-200 shadow-2xs' : 'border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-sm'
                            } rounded-2xl p-3 cursor-pointer transition-all flex flex-col justify-between hover:-translate-y-0.5 space-y-2 ${
                              draggedNoteId === note.id ? 'opacity-30 scale-95' : ''
                            } ${
                              isOverThisNote && dropNotePosition === 'before' ? 'border-l-4 border-l-indigo-600' : ''
                            } ${
                              isOverThisNote && dropNotePosition === 'after' ? 'border-r-4 border-r-indigo-600' : ''
                            }`}
                          >
                            <div className="space-y-1.5 min-w-0">
                              {/* Row 1: Title and Actions at the EXACT SAME HEIGHT */}
                              <div className="flex items-center justify-between gap-1.5 min-w-0">
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                  {/* Note Card 6-dots Drag Handle (Top Left Corner) */}
                                  <div
                                    draggable={true}
                                    onDragStart={(e) => handleNoteDragStart(e, note)}
                                    onDragEnd={handleNoteDragEnd}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors inline-flex items-center justify-center select-none shrink-0"
                                    title="Arrastrar para ordenar dentro de la carpeta"
                                  >
                                    <GripVertical size={13} />
                                  </div>

                                  <h4 
                                    className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate flex-1 min-w-0" 
                                    title={note.title || 'Sin Título'}
                                  >
                                    {note.title || 'Sin Título'}
                                  </h4>
                                </div>

                                {/* Quick action buttons inline with title */}
                                <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
                                    title="Comentarios y Observaciones"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveCommentNote(note);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  >
                                    <MessageSquare size={12} className="text-blue-500" />
                                  </button>
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

        </>
      )}

      {/* WIKILINK PICKER MODAL */}
      <AnimatePresence>
        {isWikilinkPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-3.5 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <LinkIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Vincular a otra Nota</h4>
                    <p className="text-xs text-slate-400 font-medium">Selecciona una nota para insertar su wikilink [[...]]</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWikilinkPickerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar nota por título o carpeta..."
                  value={wikilinkSearch}
                  onChange={(e) => setWikilinkSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                />
              </div>

              {/* Notes List */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {notes
                  .filter((n) => {
                    if (!wikilinkSearch.trim()) return true;
                    const query = wikilinkSearch.toLowerCase();
                    return (
                      (n.title && n.title.toLowerCase().includes(query)) ||
                      (n.category && n.category.toLowerCase().includes(query))
                    );
                  })
                  .map((noteItem) => (
                    <button
                      key={`wiki_pick_${noteItem.id}`}
                      type="button"
                      onClick={() => insertWikilink(noteItem.title || 'Nota sin título')}
                      className="w-full text-left p-2.5 hover:bg-indigo-50/80 rounded-xl border border-transparent hover:border-indigo-100 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 truncate">
                          {noteItem.title || 'Nota sin título'}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        📁 {noteItem.category || 'General'}
                      </span>
                    </button>
                  ))}
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

      {/* MODAL DE COMENTARIOS UNIVERSALES */}
      <UniversalCommentsModal
        isOpen={!!activeCommentNote}
        onClose={() => setActiveCommentNote(null)}
        entityType="note"
        entityId={activeCommentNote?.id || ''}
        entityTitle={activeCommentNote?.title || ''}
        processId={activeCommentNote?.processId}
        currentMember={currentMember}
        members={teamMembers}
      />
    </div>
  );
};
