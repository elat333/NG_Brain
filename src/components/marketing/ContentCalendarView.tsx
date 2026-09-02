import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Plus,
  Search,
  Instagram,
  Linkedin,
  Facebook,
  Video,
  Globe,
  Mail,
  Filter,
  Sparkles,
  Edit,
  Trash,
  X,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Eye,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { MarketingContent, MarketingCampaign, TeamMember } from '../../types';

interface ContentCalendarViewProps {
  contents: MarketingContent[];
  campaigns: MarketingCampaign[];
  members: TeamMember[];
  currentMember: TeamMember | null;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  onSaveContent: (content: MarketingContent) => Promise<void>;
  onDeleteContent: (contentId: string) => Promise<void>;
}

export const ContentCalendarView: React.FC<ContentCalendarViewProps> = ({
  contents,
  campaigns,
  members,
  currentMember,
  accessLevel,
  onSaveContent,
  onDeleteContent
}) => {
  const [search, setSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Partial<MarketingContent>>({});
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isReadOnly = accessLevel === 'lector';

  const channelsList = [
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={14} className="text-pink-500" /> },
    { id: 'tiktok', label: 'TikTok', icon: <Video size={14} className="text-slate-900" /> },
    { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={14} className="text-blue-600" /> },
    { id: 'facebook', label: 'Facebook', icon: <Facebook size={14} className="text-blue-500" /> },
    { id: 'youtube', label: 'YouTube', icon: <Video size={14} className="text-red-500" /> },
    { id: 'web_blog', label: 'Blog / Web', icon: <Globe size={14} className="text-emerald-500" /> },
    { id: 'email', label: 'Newsletter / Email', icon: <Mail size={14} className="text-amber-500" /> }
  ];

  const handleOpenCreate = (prefillDate?: string) => {
    const today = prefillDate || new Date().toISOString().split('T')[0];
    setEditingContent({
      id: `mkt-cnt-${Date.now()}`,
      campaignId: campaigns[0]?.id || '',
      title: '',
      copy: '',
      channel: 'instagram',
      format: 'reel_video',
      scheduledDate: today,
      scheduledTime: '10:00',
      status: 'idea',
      authorMemberId: currentMember?.id || '',
      designerMemberId: '',
      assetUrl: '',
      tags: ['Novagreen', 'Sostenibilidad']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cnt: MarketingContent) => {
    setEditingContent({ ...cnt });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent.title || !editingContent.scheduledDate) return;

    const finalContent: MarketingContent = {
      id: editingContent.id || `mkt-cnt-${Date.now()}`,
      campaignId: editingContent.campaignId,
      title: editingContent.title,
      copy: editingContent.copy || '',
      channel: editingContent.channel || 'instagram',
      format: editingContent.format || 'post_estatico',
      scheduledDate: editingContent.scheduledDate,
      scheduledTime: editingContent.scheduledTime || '10:00',
      status: editingContent.status || 'idea',
      authorMemberId: editingContent.authorMemberId,
      designerMemberId: editingContent.designerMemberId,
      assetUrl: editingContent.assetUrl,
      tags: editingContent.tags || [],
      metrics: editingContent.metrics || { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0 },
      createdAt: editingContent.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSaveContent(finalContent);
    setIsModalOpen(false);
  };

  const handleGenerateAiCopy = () => {
    if (!editingContent.title) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      const channel = editingContent.channel || 'instagram';
      const title = editingContent.title;
      let generated = '';

      if (channel === 'instagram' || channel === 'tiktok') {
        generated = `🌿 ¿Sabías cómo optimizar tus procesos sin comprometer la sostenibilidad?\n\nEn Novagreen transformamos desafíos industriales en oportunidades de eficiencia real. ⚡✨\n\n📌 Descubre cómo ${title.toLowerCase()} puede marcar la diferencia en tu organización.\n\n👉 Comenta "INFO" o visita el enlace en nuestro perfil para coordinar un diagnóstico técnico gratuito.\n\n#Novagreen #SostenibilidadIndustrial #EficienciaOperativa #Innovacion`;
      } else if (channel === 'linkedin') {
        generated = `En un entorno industrial cada vez más regulado, la eficiencia energética y la trazabilidad operativa no son opcionales: son una ventaja competitiva decisiva.\n\nCompartimos nuestra perspectiva sobre: "${title}".\n\nPrincipales claves estratégicas:\n1. Automatización de métricas de impacto en tiempo real.\n2. Cumplimiento proactivo de estándares ISO.\n3. Retorno de inversión medible a corto plazo.\n\n¿Cómo está abordando su empresa esta transición? Los leemos en los comentarios.\n\n#Novagreen #LiderazgoIndustrial #SostenibilidadB2B #Ingenieria`;
      } else {
        generated = `Novedades Novagreen: ${title}.\n\nOptimizamos tus operaciones con tecnología de vanguardia y respaldo técnico garantizado. Contáctanos hoy mismo para más información.`;
      }

      setEditingContent(prev => ({ ...prev, copy: generated }));
      setIsAiGenerating(false);
    }, 600);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredContents = contents.filter(cnt => {
    const matchesSearch = 
      (cnt.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (cnt.copy || '').toLowerCase().includes(search.toLowerCase());
    const matchesChannel = selectedChannel === 'todos' || cnt.channel === selectedChannel;
    const matchesStatus = selectedStatus === 'todos' || cnt.status === selectedStatus;
    return matchesSearch && matchesChannel && matchesStatus;
  });

  const statusBadgeColor: Record<string, string> = {
    idea: 'bg-slate-100 text-slate-700 border-slate-200',
    redaccion: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    diseno_edicion: 'bg-pink-50 text-pink-700 border-pink-200',
    revision: 'bg-amber-50 text-amber-700 border-amber-200',
    programado: 'bg-blue-50 text-blue-700 border-blue-200',
    publicado: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const formatBadgeLabel: Record<string, string> = {
    reel_video: '🎬 Reel / Video 9:16',
    carrusel: '📑 Carrusel Multitouch',
    post_estatico: '🖼️ Post Estático 1:1',
    story: '📱 Historia 24h',
    articulo: '📰 Artículo Blog',
    newsletter: '📧 Email / Newsletter',
    anuncio_pauta: '📢 Anuncio de Pauta'
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Parrilla de Contenido & Calendario</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Planificación editorial multicanal para redes, blog y campañas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar contenido, copy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-ng-lime focus:outline-none w-52 transition-all"
            />
          </div>

          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime"
          >
            <option value="todos">Todos los Canales</option>
            {channelsList.map((ch, chIdx) => (
              <option key={`mkt_cnt_filter_ch_${ch.id}_${chIdx}`} value={ch.id}>{ch.label}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime"
          >
            <option value="todos">Todos los Estados</option>
            <option value="idea">Idea</option>
            <option value="redaccion">En Redacción</option>
            <option value="diseno_edicion">En Diseño/Edición</option>
            <option value="revision">En Revisión</option>
            <option value="programado">Programado</option>
            <option value="publicado">Publicado</option>
          </select>

          {!isReadOnly && (
            <button
              onClick={() => handleOpenCreate()}
              className="flex items-center gap-2 px-5 py-2.5 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md shadow-ng-lime/20 shrink-0"
            >
              <Plus size={16} />
              Crear Contenido
            </button>
          )}
        </div>
      </div>

      {/* Grid of Content Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContents.map((cnt, cntIdx) => {
          const campaign = campaigns.find(c => c.id === cnt.campaignId);
          const author = members.find(m => m.id === cnt.authorMemberId);
          const channelInfo = channelsList.find(c => c.id === cnt.channel);

          return (
            <div
              key={`mkt_cnt_card_${cnt.id || cntIdx}_${cntIdx}`}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                {/* Channel & Status Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-black text-slate-700">
                    {channelInfo?.icon}
                    <span>{channelInfo?.label || cnt.channel}</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${statusBadgeColor[cnt.status] || 'bg-slate-100 text-slate-600'}`}>
                    {cnt.status}
                  </span>
                </div>

                {/* Format and Campaign Tag */}
                <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-400">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {formatBadgeLabel[cnt.format] || cnt.format}
                  </span>
                  {campaign && (
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {campaign.code}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                  {cnt.title}
                </h3>

                {/* Copy Snippet */}
                {cnt.copy && (
                  <div className="p-3 bg-slate-50/75 rounded-xl border border-slate-100 text-xs font-medium text-slate-600 line-clamp-3 relative">
                    {cnt.copy}
                  </div>
                )}

                {/* Tags */}
                {(cnt.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cnt.tags?.map((t, idx) => (
                      <span key={`mkt_cnt_tag_${cnt.id}_${t}_${idx}`} className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]">
                  <Clock size={12} className="text-indigo-500" />
                  <span>{cnt.scheduledDate} ({cnt.scheduledTime || '10:00'})</span>
                </div>

                <div className="flex items-center gap-1">
                  {cnt.copy && (
                    <button
                      onClick={() => handleCopyText(cnt.copy, cnt.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copiar texto del copy"
                    >
                      {copiedId === cnt.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  )}
                  {!isReadOnly && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(cnt)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                        title="Editar Contenido"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta publicación?')) {
                            onDeleteContent(cnt.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredContents.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100 p-8 space-y-3">
            <Calendar size={40} className="mx-auto text-slate-300" />
            <h4 className="text-base font-black text-slate-700">No hay publicaciones agendadas</h4>
            <p className="text-xs text-slate-400 font-medium">Comienza planificando el próximo post o reel para tus redes sociales.</p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CONTENT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-5 text-left max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Calendar size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingContent.id?.startsWith('mkt-cnt-') ? 'Nueva Publicación / Contenido' : 'Editar Contenido'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Título / Tema Central *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Reel 3 claves de auditoría ISO, Caso de éxito ASÍ Virtual..."
                    value={editingContent.title || ''}
                    onChange={(e) => setEditingContent(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Canal
                    </label>
                    <select
                      value={editingContent.channel || 'instagram'}
                      onChange={(e) => setEditingContent(prev => ({ ...prev, channel: e.target.value as any }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      {channelsList.map((ch, chIdx) => (
                        <option key={`mkt_cnt_modal_ch_${ch.id}_${chIdx}`} value={ch.id}>{ch.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Formato
                    </label>
                    <select
                      value={editingContent.format || 'reel_video'}
                      onChange={(e) => setEditingContent(prev => ({ ...prev, format: e.target.value as any }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="reel_video">Reel / Video 9:16</option>
                      <option value="carrusel">Carrusel</option>
                      <option value="post_estatico">Post Estático 1:1</option>
                      <option value="story">Historia / Story</option>
                      <option value="articulo">Artículo Web / Blog</option>
                      <option value="newsletter">Email / Newsletter</option>
                      <option value="anuncio_pauta">Anuncio de Pauta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Campaña Asociada
                    </label>
                    <select
                      value={editingContent.campaignId || ''}
                      onChange={(e) => setEditingContent(prev => ({ ...prev, campaignId: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="">Sin campaña específica</option>
                      {campaigns.map((c, cIdx) => (
                        <option key={`mkt_cnt_modal_camp_${c.id || cIdx}_${cIdx}`} value={c.id}>{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Fecha de Publicación *
                    </label>
                    <input
                      type="date"
                      required
                      value={editingContent.scheduledDate || ''}
                      onChange={(e) => setEditingContent(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Hora Sugerida
                    </label>
                    <input
                      type="time"
                      value={editingContent.scheduledTime || '10:00'}
                      onChange={(e) => setEditingContent(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Estado
                    </label>
                    <select
                      value={editingContent.status || 'idea'}
                      onChange={(e) => setEditingContent(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                    >
                      <option value="idea">💡 Idea / Propuesta</option>
                      <option value="redaccion">✍️ En Redacción</option>
                      <option value="diseno_edicion">🎨 En Diseño/Edición</option>
                      <option value="revision">👀 En Revisión</option>
                      <option value="programado">📅 Programado</option>
                      <option value="publicado">✅ Publicado</option>
                    </select>
                  </div>
                </div>

                {/* Copywriter Section with AI Assistant */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Texto del Copy & Llamada a la Acción (CTA)
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateAiCopy}
                      disabled={isAiGenerating || !editingContent.title}
                      className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors"
                    >
                      <Sparkles size={13} className={isAiGenerating ? 'animate-spin' : ''} />
                      {isAiGenerating ? 'Generando...' : 'Asistente Copy IA'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Escribe el copy persuasivo, ganchos y hashtags..."
                    value={editingContent.copy || ''}
                    onChange={(e) => setEditingContent(prev => ({ ...prev, copy: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Enlace al Arte / Google Drive / Recurso
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={editingContent.assetUrl || ''}
                    onChange={(e) => setEditingContent(prev => ({ ...prev, assetUrl: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-ng-lime focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-ng-lime text-ng-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90"
                  >
                    Guardar Publicación
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
