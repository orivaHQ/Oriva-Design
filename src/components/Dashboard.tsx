import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownUp, ArrowRight, Bell, ChevronDown, Clock3, Command, FilePlus2, FolderKanban, Grid2X2, LayoutTemplate, LogOut, MoreHorizontal, Plus, Search, Shapes, Sparkles, Users, WandSparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../auth/AuthScreen';
import { supabase } from '../lib/supabase';
import { makeDesignData } from '../lib/defaults';
import type { DesignRecord } from '../types';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<DesignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'ui' | 'logo'>('all');
  const [creating, setCreating] = useState<'ui' | 'logo' | null>(null);
  const [error, setError] = useState('');

  const loadDesigns = useCallback(async () => {
    if (!supabase || !user) return;
    const own = await supabase.from('designs').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false });
    if (own.error) { setError(own.error.message); setLoading(false); return; }
    const memberRows = await supabase.from('design_members').select('design_id').eq('user_id', user.id);
    let joined: DesignRecord[] = [];
    if (!memberRows.error && memberRows.data?.length) {
      const ids = memberRows.data.map(row => row.design_id as string);
      const records = await supabase.from('designs').select('*').in('id', ids).order('updated_at', { ascending: false });
      if (!records.error) joined = records.data as DesignRecord[];
    }
    const byId = new Map<string, DesignRecord>();
    for (const design of [...(own.data as DesignRecord[]), ...joined]) byId.set(design.id, design);
    setDesigns([...byId.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadDesigns(); }, [loadDesigns]);

  async function createProject(kind: 'ui' | 'logo') {
    if (!supabase || !user || creating) return;
    setCreating(kind); setError('');
    const title = kind === 'logo' ? 'Untitled identity' : 'Untitled design';
    const { data, error: createError } = await supabase.from('designs').insert({ owner_id: user.id, name: title, description: kind === 'logo' ? 'A new brand identity' : 'A new interface concept', design_type: kind, data: makeDesignData(kind) }).select('*').single();
    if (createError || !data) setError(createError?.message ?? 'Could not create that project.');
    else navigate(`/editor/${data.id}`);
    setCreating(null);
  }

  const visibleDesigns = useMemo(() => designs.filter(d => (filter === 'all' || d.design_type === filter) && `${d.name} ${d.description}`.toLowerCase().includes(query.toLowerCase())), [designs, filter, query]);
  const initials = (user?.email ?? 'O').slice(0, 1).toUpperCase();

  return <div className="app-shell">
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand" aria-label="Oriva Design home"><BrandMark size={30} /><span>oriva<span className="brand-light"> design</span></span></Link>
      <button className="workspace-switch"><span className="workspace-avatar">O</span><span className="workspace-label"><b>Olive Studio</b><small>Free workspace</small></span><ChevronDown size={15} /></button>
      <div className="side-group"><div className="side-label">WORKSPACE</div><button className="side-item active"><FolderKanban size={17} /> Projects <span className="side-count">{designs.length}</span></button><button className="side-item" onClick={() => void createProject('ui')}><LayoutTemplate size={17} /> UX / UI designs</button><button className="side-item" onClick={() => void createProject('logo')}><Shapes size={17} /> Logo studio <span className="new-indicator" /></button><button className="side-item" onClick={() => { setFilter(filter === 'all' ? 'ui' : 'all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Users size={17} /> Shared with me</button></div>
      <div className="side-group side-tools"><div className="side-label">YOUR TOOLS</div><div className="tool-tile"><div className="tool-tile-icon"><WandSparkles size={17} /></div><div><b>Logo studio</b><span>Shape an identity</span></div><button title="Create logo" onClick={() => void createProject('logo')}><Plus size={16} /></button></div><div className="tool-tile"><div className="tool-tile-icon olive"><LayoutTemplate size={17} /></div><div><b>Interface canvas</b><span>Make a little magic</span></div><button title="Create design" onClick={() => void createProject('ui')}><Plus size={16} /></button></div></div>
      <div className="sidebar-bottom"><button className="user-menu" onClick={() => void signOut()} title="Sign out"><span className="user-avatar">{initials}</span><span><b>{user?.email?.split('@')[0]}</b><small>{user?.email}</small></span><LogOut size={15} /></button><div className="sidebar-meta"><span>ORIVA DESIGN · PRIVATE BETA</span><span>v1.0.0</span></div></div>
    </aside>

    <main className="dashboard-main">
      <header className="dashboard-topbar"><div className="breadcrumbs"><span>Olive Studio</span><span className="crumb-slash">/</span><b>Projects</b></div><div className="top-actions"><button className="icon-button" title="Notifications"><Bell size={17} /><span className="notification-dot" /></button><button className="top-avatar" title={user?.email}>{initials}</button></div></header>
      <div className="dashboard-content">
        <div className="welcome-row"><div><div className="eyebrow muted"><Sparkles size={13} /> YOUR CORNER OF THE INTERNET</div><h1>Good morning<span className="period">.</span></h1><p>Somewhere between a thought and a thing.</p></div><button className="button button-primary" onClick={() => void createProject('ui')} disabled={creating !== null}><Plus size={17} /> {creating ? 'Making…' : 'New project'}</button></div>
        <section className="spotlight"><div className="spotlight-copy"><div className="eyebrow">A LITTLE ROOM TO PLAY</div><h2>Good ideas have<br />good company.</h2><p>Bring a friend into the process. Share a draft, trade notes, make the small things better.</p><button className="text-button" onClick={() => void createProject('ui')}>Start something together <ArrowRight size={15} /></button></div><div className="spotlight-art" aria-hidden="true"><span className="spot-orbit s1"/><span className="spot-orbit s2"/><span className="spot-orbit s3"/><span className="spot-sun"/><span className="spot-initial">o</span><span className="spot-tag tag-a">a little idea</span><span className="spot-tag tag-b">↑ 2 collaborators</span></div></section>
        <div className="section-heading"><div><span className="eyebrow muted">MADE BY YOU</span><h2>Your projects <span className="count-pill">{designs.length}</span></h2></div><div className="project-controls"><label className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a project" aria-label="Find a project" />{query && <button onClick={() => setQuery('')} aria-label="Clear search">×</button>}</label><button className="sort-button" title="Sort by recently updated"><ArrowDownUp size={15} /></button><button className="view-button selected" title="Grid view"><Grid2X2 size={16} /></button><button className="view-button" title="More options"><MoreHorizontal size={17} /></button></div></div>
        <div className="filter-tabs"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All projects</button><button className={filter === 'ui' ? 'selected' : ''} onClick={() => setFilter('ui')}>UX / UI</button><button className={filter === 'logo' ? 'selected' : ''} onClick={() => setFilter('logo')}>Brand & logos</button></div>
        {error && <div className="notice notice-error">{error}</div>}
        {loading ? <div className="project-loading"><span className="loader-mark" /> Gathering your ideas…</div> : visibleDesigns.length ? <div className="project-grid">{visibleDesigns.map(design => <ProjectCard key={design.id} design={design} onOpen={() => navigate(`/editor/${design.id}`)} />)}<button className="new-card" onClick={() => void createProject('ui')}><span className="new-card-icon"><Plus size={20} /></span><b>Start something new</b><span>Every good thing starts somewhere.</span></button></div> : <div className="empty-state"><div className="empty-symbol"><FilePlus2 size={22} /></div><h3>{query ? 'No match for that yet.' : 'This space is still yours to fill.'}</h3><p>{query ? 'Try a different search.' : 'A sketch, a system, a story. Start with whatever is on your mind.'}</p>{!query && <div className="empty-actions"><button className="button button-primary" onClick={() => void createProject('ui')}><Plus size={16} /> New UX / UI design</button><button className="button button-soft" onClick={() => void createProject('logo')}><Shapes size={16} /> Design a logo</button></div>}</div>}
        <div className="dashboard-footer"><span><Clock3 size={13} /> Your work saves as you go</span><span><Command size={13} /> A good place to start again</span></div>
      </div>
    </main>
  </div>;
}

function ProjectCard({ design, onOpen }: { design: DesignRecord; onOpen: () => void }) {
  const logo = design.design_type === 'logo';
  return <button className={`project-card ${logo ? 'logo-card' : ''}`} onClick={onOpen}>
    <div className={`project-preview ${logo ? 'preview-logo' : 'preview-canvas'}`}>
      {logo ? <LogoThumb data={design.data?.logo} /> : <CanvasThumb design={design} />}
      <span className="card-open"><ArrowRight size={15} /></span>
    </div>
    <div className="project-card-info"><div className="project-card-title"><b>{design.name}</b><MoreHorizontal size={16} /></div><div className="project-card-meta"><span>{logo ? 'Brand identity' : 'UX / UI design'}</span><span className="meta-dot">·</span><span>{timeAgo(design.updated_at)}</span>{design.is_public && <span className="sharing-tag"><Users size={11} /> Shared</span>}</div></div>
  </button>;
}

function LogoThumb({ data }: { data?: DesignRecord['data']['logo'] }) {
  const name = data?.brandName || 'Oriva'; const primary = data?.primary || '#173b3a';
  return <div className="logo-thumb"><div className="mini-orbit"><span /></div><strong style={{ color: primary }}>{name}</strong><small>{data?.showTagline ? data.tagline : 'BRAND IDENTITY'}</small></div>;
}

function CanvasThumb({ design }: { design: DesignRecord }) {
  const layers = design.data?.layers ?? [];
  return <div className="mini-canvas">{layers.slice(0, 8).map(layer => <span key={layer.id} className={`mini-layer mini-${layer.kind}`} style={{ left: `${(layer.x / 760) * 100}%`, top: `${(layer.y / 520) * 100}%`, width: `${(layer.width / 760) * 100}%`, height: `${(layer.height / 520) * 100}%`, background: layer.kind === 'text' ? 'transparent' : layer.fill, color: layer.color, borderRadius: `${Math.max(2, layer.radius / 2)}px`, opacity: layer.opacity / 100 }} />)}</div>;
}

export function timeAgo(date: string) {
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
