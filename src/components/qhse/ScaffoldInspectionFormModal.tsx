import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  PenTool,
  Building2,
  User,
  Calendar,
  MapPin,
  FileCheck,
  ShieldAlert,
  Info,
  Plus,
  Eye,
  Layers,
  Check,
  Video,
  SwitchCamera,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import {
  ScaffoldInspection,
  ScaffoldInspectionItem,
  ScaffoldFindingCommitment,
  ScaffoldInspectionPhoto,
  ScaffoldItemStatus,
  Project,
  TeamMember
} from '../../types';

interface ScaffoldInspectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (inspectionData: Partial<ScaffoldInspection>) => Promise<void>;
  initialData?: ScaffoldInspection | null;
  projects: Project[];
  members: TeamMember[];
  currentMember?: TeamMember | null;
}

const DEFAULT_SCAFFOLD_ITEMS: { code: string; description: string }[] = [
  { code: '01', description: 'Tablón de base primaria para piso natural' },
  { code: '02', description: 'Andamio calzado, nivelado y anclado de forma correcta' },
  { code: '03', description: 'Base tornillo elevado a menos de 30 cm.' },
  { code: '04', description: 'Ruedas todas con seguro (freno)' },
  { code: '05', description: 'Todos los coples utilizados tienen seguro' },
  { code: '06', description: 'Los coples calzan perfectamente' },
  { code: '07', description: 'Las diagonales están rígidas' },
  { code: '08', description: 'Existen puntas salidas' },
  { code: '09', description: 'Cuenta con escalera propia' },
  { code: '10', description: 'Escalera interna' },
  { code: '11', description: 'Escalera externa' },
  { code: '12', description: 'Cuenta con piso de madera' },
  { code: '13', description: 'Cuenta con piso metálico' },
  { code: '14', description: 'Rodapié metálico' },
  { code: '15', description: 'Rodapié de madera' },
  { code: '16', description: 'Barandal superior entre 96,52 y 114,30 cm. del piso de trabajo' },
  { code: '17', description: 'Barandal intermedio entre 50,80 y 76,20 cm. del piso de trabajo' },
  { code: '18', description: 'Rigidez aparente' },
  { code: '19', description: 'Escotillas completas' },
  { code: '20', description: 'Requiere protección contra caídas' },
  { code: '21', description: 'El operador de armado es competente y tiene capacitación' },
  { code: '22', description: 'El andamio está sujeto a una estructura estable (aplica según altura)' },
  { code: '23', description: 'Describa el Equipo de Protección contra caídas (arnés, línea de vida, etc.)' }
];

export const ScaffoldInspectionFormModal: React.FC<ScaffoldInspectionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  projects,
  members,
  currentMember
}) => {
  // General Data
  const [assemblySupervisor, setAssemblySupervisor] = useState('');
  const [client, setClient] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [inspectionTime, setInspectionTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );

  // 23 Checklist Items
  const [items, setItems] = useState<ScaffoldInspectionItem[]>([]);

  // Findings
  const [findings, setFindings] = useState<ScaffoldFindingCommitment[]>([]);

  // Signatures & Names
  const [activitySupervisorName, setActivitySupervisorName] = useState('');
  const [activitySupervisorSignature, setActivitySupervisorSignature] = useState<string | null>(null);
  const [scaffoldSupervisorName, setScaffoldSupervisorName] = useState('');
  const [scaffoldSupervisorSignature, setScaffoldSupervisorSignature] = useState<string | null>(null);

  // Photos
  const [photos, setPhotos] = useState<ScaffoldInspectionPhoto[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Live Camera state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Notes
  const [notes, setNotes] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'checklist' | 'findings' | 'photos' | 'signatures'>('general');

  // Canvas Refs for signatures
  const canvasActivityRef = useRef<HTMLCanvasElement | null>(null);
  const canvasScaffoldRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingActivity = useRef(false);
  const isDrawingScaffold = useRef(false);

  // File input refs for camera capture
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or Reset form
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setAssemblySupervisor(initialData.assemblySupervisor || '');
      setClient(initialData.client || '');
      setProjectId(initialData.projectId || '');
      setProjectName(initialData.projectName || '');
      setLocation(initialData.location || '');
      setInspectionDate(initialData.inspectionDate || new Date().toISOString().slice(0, 10));
      setInspectionTime(initialData.inspectionTime || new Date().toTimeString().slice(0, 5));
      setItems(initialData.items && initialData.items.length > 0 ? initialData.items : initDefaultItems());
      setFindings(initialData.findings || []);
      setActivitySupervisorName(initialData.activitySupervisorName || '');
      setActivitySupervisorSignature(initialData.activitySupervisorSignatureUrl || null);
      setScaffoldSupervisorName(initialData.scaffoldSupervisorName || '');
      setScaffoldSupervisorSignature(initialData.scaffoldSupervisorSignatureUrl || null);
      setPhotos(initialData.photos || []);
      setNotes(initialData.notes || '');
    } else {
      setAssemblySupervisor('');
      setClient('');
      setProjectId('');
      setProjectName('');
      setLocation('');
      setInspectionDate(new Date().toISOString().slice(0, 10));
      setInspectionTime(new Date().toTimeString().slice(0, 5));
      setItems(initDefaultItems());
      setFindings([
        { id: 'find-1', finding: '', responsible: '', executionDate: '' }
      ]);
      setActivitySupervisorName('');
      setActivitySupervisorSignature(null);
      setScaffoldSupervisorName(currentMember?.name || '');
      setScaffoldSupervisorSignature(null);
      setPhotos([]);
      setNotes('');
    }
  }, [isOpen, initialData, currentMember]);

  function initDefaultItems(): ScaffoldInspectionItem[] {
    return DEFAULT_SCAFFOLD_ITEMS.map(it => ({
      id: `item-${it.code}`,
      code: it.code,
      description: it.description,
      status: 'BE',
      observations: ''
    }));
  }

  // Live Camera Controls (PC, Laptop, Tablet, Mobile)
  const startLiveCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    setCameraError(null);
    setIsLiveCameraOpen(true);
    
    // Stop any existing stream
    stopLiveCameraStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.warn('Fallback to basic video constraints:', err);
      try {
        // Fallback without facingMode
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
      } catch (fallbackErr: any) {
        console.error('Camera access error:', fallbackErr);
        setCameraError('No se pudo acceder a la cámara. Por favor permite los permisos de cámara en tu navegador o usa el botón de subir foto.');
      }
    }
  };

  const stopLiveCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const closeLiveCamera = () => {
    stopLiveCameraStream();
    setIsLiveCameraOpen(false);
    setCameraError(null);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startLiveCamera(nextFacing);
  };

  const capturePhotoFromLiveStream = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      alert('La cámara aún no está lista para capturar.');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        
        const newPhoto: ScaffoldInspectionPhoto = {
          id: `photo-${Date.now()}`,
          url: dataUrl,
          caption: photos.length === 0 ? 'Foto Principal del Andamio' : `Evidencia fotográfica ${photos.length + 1}`,
          createdAt: new Date().toISOString()
        };

        setPhotos(prev => [newPhoto, ...prev]);
        closeLiveCamera();
      }
    } catch (err) {
      console.error('Error al capturar foto del stream:', err);
      alert('No se pudo procesar la captura de foto.');
    }
  };

  // Handle Project Selection
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setProjectId(pId);
    const proj = projects.find(p => p.id === pId);
    if (proj) {
      setProjectName(proj.name);
      if (proj.clientName) setClient(proj.clientName);
    } else {
      setProjectName('');
    }
  };

  // Checklist Item Status Change
  const handleItemStatusChange = (index: number, newStatus: ScaffoldItemStatus) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  const handleItemObsChange = (index: number, obs: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], observations: obs };
      return updated;
    });
  };

  // Batch set all to BE
  const handleSetAllBE = () => {
    setItems(prev => prev.map(item => ({ ...item, status: 'BE' })));
  };

  // Findings handlers
  const handleAddFinding = () => {
    setFindings(prev => [
      ...prev,
      { id: `find-${Date.now()}`, finding: '', responsible: '', executionDate: '' }
    ]);
  };

  const handleUpdateFinding = (index: number, field: keyof ScaffoldFindingCommitment, value: string) => {
    setFindings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveFinding = (index: number) => {
    setFindings(prev => prev.filter((_, i) => i !== index));
  };

  // High-performance image compression (Max 800px, 0.65 JPEG ~35KB)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
            resolve(compressedDataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Error al cargar la imagen para compresión'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  // Handle Photo capture / file select
  const handlePhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>, isCover = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingPhoto(true);
    try {
      const newPhotos: ScaffoldInspectionPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedUrl = await compressImage(file);
        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          url: compressedUrl,
          caption: isCover || photos.length === 0 ? 'Foto Principal del Andamio' : `Evidencia fotográfica ${photos.length + i + 1}`,
          createdAt: new Date().toISOString()
        });
      }
      if (isCover) {
        setPhotos(prev => [...newPhotos, ...prev]);
      } else {
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (err) {
      console.error('Error al procesar foto:', err);
      alert('Hubo un error al procesar las imágenes. Por favor intenta con una imagen más liviana.');
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePhotoCaption = (id: string, caption: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  // Signature Drawing Logic (Activity Supervisor)
  const startDrawingActivity = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasActivityRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingActivity.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawActivity = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingActivity.current) return;
    const canvas = canvasActivityRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingActivity = () => {
    if (!isDrawingActivity.current) return;
    isDrawingActivity.current = false;
    const canvas = canvasActivityRef.current;
    if (canvas) {
      setActivitySupervisorSignature(canvas.toDataURL());
    }
  };

  const clearActivitySignature = () => {
    const canvas = canvasActivityRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setActivitySupervisorSignature(null);
  };

  // Signature Drawing Logic (Scaffold Supervisor)
  const startDrawingScaffold = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasScaffoldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingScaffold.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawScaffold = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingScaffold.current) return;
    const canvas = canvasScaffoldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingScaffold = () => {
    if (!isDrawingScaffold.current) return;
    isDrawingScaffold.current = false;
    const canvas = canvasScaffoldRef.current;
    if (canvas) {
      setScaffoldSupervisorSignature(canvas.toDataURL());
    }
  };

  const clearScaffoldSignature = () => {
    const canvas = canvasScaffoldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setScaffoldSupervisorSignature(null);
  };

  // Summary Metrics
  const beCount = items.filter(i => i.status === 'BE').length;
  const eaCount = items.filter(i => i.status === 'EA').length;
  const meCount = items.filter(i => i.status === 'ME').length;
  const naCount = items.filter(i => i.status === 'NA').length;

  const calculateGeneralStatus = (): 'conforme' | 'con_observaciones' | 'no_conforme' => {
    if (meCount > 0) return 'no_conforme';
    if (eaCount > 0 || (findings.length > 0 && findings.some(f => f.finding.trim() !== ''))) return 'con_observaciones';
    return 'conforme';
  };

  // Submit Handler (Guaranteed 0 undefined fields)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assemblySupervisor.trim()) {
      alert('Por favor especifica el nombre del Encargado del Montaje en la primera plana.');
      setActiveSection('general');
      return;
    }
    if (!location.trim()) {
      alert('Por favor especifica la Ubicación del andamio en la primera plana.');
      setActiveSection('general');
      return;
    }

    setSaving(true);
    try {
      const generalStatus = calculateGeneralStatus();
      const cleanedFindings = findings.filter(f => f.finding.trim() !== '');

      const payload: Partial<ScaffoldInspection> = {
        formatCode: 'JLC-REG-SST-017',
        controlledCopy: true,
        version: '1',
        formatDate: '20/07/2025',
        assemblySupervisor: assemblySupervisor.trim() || '',
        client: client.trim() || '',
        projectId: projectId || '',
        projectName: projectName.trim() || (projects.find(p => p.id === projectId)?.name || '') || '',
        location: location.trim() || '',
        inspectionDate: inspectionDate || new Date().toISOString().slice(0, 10),
        inspectionTime: inspectionTime || '',
        generalStatus: generalStatus || 'conforme',
        items: items || [],
        findings: cleanedFindings || [],
        activitySupervisorName: activitySupervisorName.trim() || '',
        activitySupervisorSignatureUrl: activitySupervisorSignature || '',
        scaffoldSupervisorName: scaffoldSupervisorName.trim() || '',
        scaffoldSupervisorSignatureUrl: scaffoldSupervisorSignature || '',
        photos: photos || [],
        notes: notes.trim() || '',
        updatedAt: new Date().toISOString()
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar la inspección de andamios:', err);
      alert(`Error al guardar la inspección: ${err?.message || 'Verifica los datos e inténtalo nuevamente.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const coverPhoto = photos.length > 0 ? photos[0] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl max-h-[96vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  JLC-REG-SST-017
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {initialData ? 'Editando Registro' : 'Nuevo Registro'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Inspección Técnica de Andamios
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS (OPTIMIZADA PARA TABLETS) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1.5 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveSection('general')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'general'
                ? 'bg-white text-slate-900 border-t-2 border-l border-r border-slate-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={15} />
            <span>1. Datos & Portada</span>
            {coverPhoto && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('checklist')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'checklist'
                ? 'bg-white text-slate-900 border-t-2 border-l border-r border-slate-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck size={15} />
            <span>2. 23 Puntos ({items.length})</span>
            {meCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                {meCount} ME
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('findings')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'findings'
                ? 'bg-white text-slate-900 border-t-2 border-l border-r border-slate-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle size={15} />
            <span>3. Hallazgos ({findings.filter(f => f.finding.trim() !== '').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('photos')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'photos'
                ? 'bg-white text-slate-900 border-t-2 border-l border-r border-slate-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera size={15} />
            <span>4. Fotos en Obra ({photos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('signatures')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'signatures'
                ? 'bg-white text-slate-900 border-t-2 border-l border-r border-slate-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool size={15} />
            <span>5. Firmas Digitales</span>
            {activitySupervisorSignature && scaffoldSupervisorSignature && (
              <CheckCircle2 size={13} className="text-emerald-500" />
            )}
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* SECCIÓN 1: DATOS GENERALES Y FOTO DE PORTADA */}
          {activeSection === 'general' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* BLOQUE DESTACADO DE FOTO DE PORTADA / CÁMARA */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 rounded-3xl border-2 border-dashed border-amber-400/60 p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                      <Camera size={26} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        Foto Principal del Andamio (Primera Plana)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Toma una fotografía instantánea con la cámara de tu tablet/computadora o selecciona de tu galería.
                      </p>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN DE CÁMARA */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => startLiveCamera('environment')}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Video size={16} />
                      <span>Abrir Cámara en Vivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload size={16} />
                      <span>Subir Foto</span>
                    </button>
                    
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoFiles(e, true)}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* VISTA PREVIA DE LA FOTO DE PORTADA */}
                {coverPhoto ? (
                  <div className="mt-4 pt-4 border-t border-amber-200/60 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-48 aspect-4/3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 group">
                      <img
                        src={coverPhoto.url}
                        alt="Portada"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-amber-400 text-[10px] font-black uppercase">
                        Foto Portada
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <label className="text-[11px] font-black uppercase text-slate-600 block">
                        Descripción / Pie de foto:
                      </label>
                      <input
                        type="text"
                        value={coverPhoto.caption || ''}
                        onChange={(e) => handleUpdatePhotoCaption(coverPhoto.id, e.target.value)}
                        placeholder="Ej. Andamio multidireccional torre A fachada norte"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => startLiveCamera('environment')}
                          className="text-[11px] font-black uppercase text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={12} /> Cambiar Foto
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(coverPhoto.id)}
                          className="text-[11px] font-black uppercase text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-white/70 rounded-2xl border border-amber-200/40 text-center text-xs text-slate-500 italic">
                    Sin foto capturada aún. Puedes pulsar "Abrir Cámara en Vivo" para tomarla ahora.
                  </div>
                )}
              </div>

              {/* CAMPOS DE DATOS GENERALES */}
              <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={16} className="text-amber-600" />
                  <span>Datos Generales de la Obra</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* ENCARGADO DEL MONTAJE */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">
                      <User size={13} className="text-amber-600" />
                      <span>Encargado del Montaje *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez (Capataz / Montajista)"
                      value={assemblySupervisor}
                      onChange={(e) => setAssemblySupervisor(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* PROYECTO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">
                      <Building2 size={13} className="text-amber-600" />
                      <span>Proyecto Asociado</span>
                    </label>
                    <select
                      value={projectId}
                      onChange={handleProjectChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="">-- Seleccionar Proyecto o Personalizado --</option>
                      {projects.map((p) => (
                        <option key={`proj_${p.id}`} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CLIENTE */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">
                      <User size={13} className="text-amber-600" />
                      <span>Cliente / Razón Social</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Constructora Larriva / Minera Sur"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* UBICACIÓN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">
                      <MapPin size={13} className="text-amber-600" />
                      <span>Ubicación en Obra *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Torre B - Nivel 4 Frente Norte"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* FECHA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">
                      <Calendar size={13} className="text-amber-600" />
                      <span>Fecha de Inspección *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* HORA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">
                      <Calendar size={13} className="text-amber-600" />
                      <span>Hora</span>
                    </label>
                    <input
                      type="time"
                      value={inspectionTime}
                      onChange={(e) => setInspectionTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* BOTÓN RÁPIDO PARA IR A CHECKLIST */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('checklist')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Continuar a Puntos de Inspección (23)</span>
                  <Check size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: 23 PUNTOS DE INSPECCIÓN */}
          {activeSection === 'checklist' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* BARRA SUPERIOR DE ACCIÓN RÁPIDA */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                    Evaluación de los 23 Elementos
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Marca con un toque el estado de cada componente. Si detectas Mal Estado (ME), se emitirá alerta inmediata de retiro.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetAllBE}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 size={14} />
                    <span>Marcar Todo Buen Estado (BE)</span>
                  </button>
                </div>
              </div>

              {/* RESUMEN DE ESTADOS */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-black">
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <span className="text-[10px] block text-emerald-600 uppercase">BE: Buen Estado</span>
                  <span className="text-base">{beCount}</span>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                  <span className="text-[10px] block text-blue-600 uppercase">EA: Aceptable</span>
                  <span className="text-base">{eaCount}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  <span className="text-[10px] block text-rose-600 uppercase">ME: Mal Estado</span>
                  <span className="text-base">{meCount}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                  <span className="text-[10px] block text-slate-500 uppercase">NA: No Aplica</span>
                  <span className="text-base">{naCount}</span>
                </div>
              </div>

              {/* TARJETAS TÁCTILES DE LOS 23 ITEMS */}
              <div className="space-y-2.5">
                {items.map((item, index) => {
                  const isME = item.status === 'ME';
                  return (
                    <div
                      key={item.id || item.code}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        isME
                          ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                          : item.status === 'EA'
                          ? 'bg-blue-50/40 border-blue-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {item.code}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {item.description}
                            </h4>
                            {isME && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-700 mt-1">
                                <ShieldAlert size={12} /> Requiere retiro inmediato del área de trabajo
                              </span>
                            )}
                          </div>
                        </div>

                        {/* BOTONERA TÁCTIL (BE / EA / ME / NA) */}
                        <div className="grid grid-cols-4 gap-1.5 sm:w-80 shrink-0 select-none">
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(index, 'BE')}
                            className={`py-2 px-1 text-xs font-black rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                              item.status === 'BE'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-102'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            BE
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(index, 'EA')}
                            className={`py-2 px-1 text-xs font-black rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                              item.status === 'EA'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-102'
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                          >
                            EA
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(index, 'ME')}
                            className={`py-2 px-1 text-xs font-black rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                              item.status === 'ME'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-102'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            ME
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(index, 'NA')}
                            className={`py-2 px-1 text-xs font-black rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                              item.status === 'NA'
                                ? 'bg-slate-700 text-white shadow-md scale-102'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            NA
                          </button>
                        </div>
                      </div>

                      {/* OBSERVACIONES DEL ÍTEM */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          placeholder="Observaciones específicas sobre este elemento (opcional)..."
                          value={item.observations || ''}
                          onChange={(e) => handleItemObsChange(index, e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500/30"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* NAVEGACIÓN INFERIOR */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('general')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Atrás: Datos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('findings')}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Siguiente: Hallazgos</span>
                  <Check size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: SEGUIMIENTO DE HALLAZGOS Y COMPROMISOS */}
          {activeSection === 'findings' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl">
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                    Seguimiento de Hallazgos y Compromisos
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Registra las acciones correctivas, responsables asignados y fecha de subsanación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFinding}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Agregar Fila</span>
                </button>
              </div>

              <div className="space-y-3">
                {findings.map((f, idx) => (
                  <div
                    key={f.id || `f_${idx}`}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-600">
                        Hallazgo #{idx + 1}
                      </span>
                      {findings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFinding(idx)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500">
                          Hallazgo / Compromiso
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Asegurar cruceta en nivel 2 y retirar tablón defectuoso"
                          value={f.finding}
                          onChange={(e) => handleUpdateFinding(idx, 'finding', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500">
                          Responsable
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Supervisor de Montaje"
                          value={f.responsible}
                          onChange={(e) => handleUpdateFinding(idx, 'responsible', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500">
                          Fecha de Ejecución
                        </label>
                        <input
                          type="date"
                          value={f.executionDate}
                          onChange={(e) => handleUpdateFinding(idx, 'executionDate', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* NAVEGACIÓN INFERIOR */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('checklist')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Atrás: Puntos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('photos')}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Siguiente: Fotos</span>
                  <Check size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SECCIÓN 4: EVIDENCIAS FOTOGRÁFICAS EN CAMPO */}
          {activeSection === 'photos' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl">
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                    Evidencias Fotográficas en Campo ({photos.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Captura fotos en vivo con la cámara de tu tablet o laptop.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startLiveCamera('environment')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Video size={16} />
                    <span>Cámara en Vivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={16} />
                    <span>Galería</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={(e) => handlePhotoFiles(e, false)}
                    className="hidden"
                  />
                </div>
              </div>

              {isCompressingPhoto && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-xs font-black text-amber-800 animate-pulse">
                  Procesando y optimizando fotografías para campo...
                </div>
              )}

              {/* GRILLA DE FOTOS */}
              {photos.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                  <Camera size={36} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">
                    Aún no has adjuntado evidencias fotográficas.
                  </p>
                  <button
                    type="button"
                    onClick={() => startLiveCamera('environment')}
                    className="px-4 py-2 bg-slate-900 text-amber-400 font-black text-xs uppercase tracking-wider rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Video size={15} />
                    <span>Abrir Cámara en Vivo</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photos.map((photo, pIdx) => (
                    <div
                      key={photo.id || `photo_${pIdx}`}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-2 p-2.5"
                    >
                      <div className="relative aspect-4/3 bg-slate-900 rounded-xl overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Foto ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-700 transition-colors cursor-pointer shadow-md"
                        >
                          <Trash2 size={13} />
                        </button>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                          #{pIdx + 1} {pIdx === 0 && '• PORTADA'}
                        </span>
                      </div>

                      <input
                        type="text"
                        placeholder="Descripción de la foto..."
                        value={photo.caption || ''}
                        onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* NAVEGACIÓN INFERIOR */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('findings')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Atrás: Hallazgos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('signatures')}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Siguiente: Firmas Digitales</span>
                  <Check size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SECCIÓN 5: FIRMAS DIGITALES TÁCTILES */}
          {activeSection === 'signatures' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 text-white p-4 rounded-2xl">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                  Panel de Firmas Digitales en Pantalla Táctil
                </h3>
                <p className="text-[11px] text-slate-400">
                  Firma con el dedo o lápiz óptico en la tablet para validar la conformidad de la inspección.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* FIRMA SUPERVISOR ACTIVIDAD */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase text-slate-900 block">
                        Supervisor de la Actividad
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">Firma de Conformidad</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearActivitySignature}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} /> Limpiar
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Nombre completo del Supervisor..."
                    value={activitySupervisorName}
                    onChange={(e) => setActivitySupervisorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                  />

                  <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white p-1 h-36 relative touch-none">
                    <canvas
                      ref={canvasActivityRef}
                      width={400}
                      height={140}
                      onMouseDown={startDrawingActivity}
                      onMouseMove={drawActivity}
                      onMouseUp={stopDrawingActivity}
                      onMouseLeave={stopDrawingActivity}
                      onTouchStart={startDrawingActivity}
                      onTouchMove={drawActivity}
                      onTouchEnd={stopDrawingActivity}
                      className="w-full h-full cursor-crosshair rounded-lg"
                    />
                    {!activitySupervisorSignature && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 font-bold pointer-events-none uppercase">
                        ✍️ Traza la firma aquí
                      </span>
                    )}
                  </div>
                </div>

                {/* FIRMA SUPERVISOR ANDAMIOS */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase text-slate-900 block">
                        Supervisor de Andamios
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">Firma del Certificador</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearScaffoldSignature}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} /> Limpiar
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Nombre completo del Inspector..."
                    value={scaffoldSupervisorName}
                    onChange={(e) => setScaffoldSupervisorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                  />

                  <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white p-1 h-36 relative touch-none">
                    <canvas
                      ref={canvasScaffoldRef}
                      width={400}
                      height={140}
                      onMouseDown={startDrawingScaffold}
                      onMouseMove={drawScaffold}
                      onMouseUp={stopDrawingScaffold}
                      onMouseLeave={stopDrawingScaffold}
                      onTouchStart={startDrawingScaffold}
                      onTouchMove={drawScaffold}
                      onTouchEnd={stopDrawingScaffold}
                      className="w-full h-full cursor-crosshair rounded-lg"
                    />
                    {!scaffoldSupervisorSignature && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 font-bold pointer-events-none uppercase">
                        ✍️ Traza la firma aquí
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* NOTAS FINALES */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700">
                  Notas y Observaciones Finales
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales sobre el estado general del andamio o condiciones del sitio..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* NAVEGACIÓN INFERIOR */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveSection('photos')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Atrás: Fotos
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  <span>{saving ? 'Guardando Registro...' : 'Guardar Inspección'}</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* MODAL DE CÁMARA EN VIVO INTEGRADA */}
        {isLiveCameraOpen && (
          <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-fadeIn">
            
            {/* BARRA SUPERIOR CÁMARA */}
            <div className="w-full max-w-2xl flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-xs font-black uppercase tracking-wider">Cámara en Vivo</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SwitchCamera size={15} />
                  <span>Girar Cámara</span>
                </button>
                <button
                  type="button"
                  onClick={closeLiveCamera}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* VISOR DE VIDEO EN VIVO */}
            <div className="w-full max-w-2xl flex-1 flex items-center justify-center my-4 overflow-hidden rounded-3xl bg-slate-900 border border-white/10 relative">
              {cameraError ? (
                <div className="p-6 text-center text-rose-400 text-xs font-bold space-y-2">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startLiveCamera()}
                    className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs uppercase font-black"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover max-h-[70vh] rounded-3xl"
                />
              )}
            </div>

            {/* BOTÓN DISPARADOR INFERIOR */}
            <div className="w-full max-w-2xl flex items-center justify-center pb-2">
              <button
                type="button"
                onClick={capturePhotoFromLiveStream}
                disabled={!!cameraError}
                className="w-20 h-20 rounded-full bg-white hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl transition-all active:scale-90 cursor-pointer disabled:opacity-40 border-4 border-slate-700"
              >
                <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Camera size={26} />
                </div>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
