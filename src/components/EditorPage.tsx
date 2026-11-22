import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, CircleHelp, Cloud, MessageCircle, MousePointer2, Share2, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../auth/AuthScreen';
import { CanvasEditor } from './CanvasEditor';
import { LogoStudio } from './LogoStudio';
import { ShareDialog } from './ShareDialog';
import { timeAgo } from '../lib/time';
import { supabase } from '../lib/supabase';
import type { CanvasLayer, CommentRecord, DesignData, DesignRecord, MemberRecord, MemberRole } from '../types';

export function EditorPage() {
  const { id } = useParams(); const { user } = useAuth();
  const [design, setDesign] = useState<DesignRecord | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [role, setRole] = useState<MemberRole | 'owner' | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [comment, setComment] = useState('');
  const [busyComment, setBusyComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'saved' | 'saving' | 'error'>('saved');
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const persistedRef = useRef('');
  const isOwner = role === 'owner'; const canEdit = role === 'owner' || role === 'editor';

  const loadComments = useCallback(async (designId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('design_comments').select('*').eq('design_id', designId).order('created_at', { ascending: true }).limit(100);
    if (data) setComments(data as CommentRecord[]);
  }, []);
  const loadMembers = useCallback(async (designId: string) => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('design_members').select('user_id, role, invited_email, added_at').eq('design_id', designId);
    if (data) setMembers(data as MemberRecord[]);
  }, [user]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !user || !id) return;
      setLoading(true); setError('');
      try {
      const { data, error: loadError } = await supabase.from('designs').select('*').eq('id', id).maybeSingle();
      if (!active) return;
      if (loadError || !data) { setError(loadError?.message ?? 'This project is private or no longer exists.'); setLoading(false); return; }
      const record = data as DesignRecord;
      setDesign(record);
      const isOwnerNow = record.owner_id === user.id;
      let memberRole: MemberRole | null = null;
      if (!isOwnerNow) {
        const membership = await supabase.from('design_members').select('role').eq('design_id', id).eq('user_id', user.id).maybeSingle();
        if (membership.data) memberRole = membership.data.role as MemberRole;
        if (!memberRole) { setError('You do not have access to this project.'); setLoading(false); return; }
      }
      setRole(isOwnerNow ? 'owner' : memberRole);
      persistedRef.current = serialize(record.name, record.description, record.data);
      setLoading(false);
      await Promise.all([loadComments(id), loadMembers(id)]);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Could not open this design. Please try again.');
        setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [id, user, loadComments, loadMembers]);

  useEffect(() => {
    if (!design || !supabase || !canEdit) return;
    const client = supabase;
    const next = serialize(design.name, design.description, design.data);
    if (next === persistedRef.current) return;
    setSaving('saving');
    const timer = window.setTimeout(async () => {
      const { data, error: saveError } = await client.from('designs').update({ name: design.name, description: design.description, data: design.data }).eq('id', design.id).select('updated_at').maybeSingle();
      const saveErrorMessage = saveError?.message ?? 'Your change could not be saved.';
      if (saveError || !data) { setSaving('error'); setError(saveErrorMessage); }
      else { persistedRef.current = next; setSaving('saved'); setError(current => current === saveErrorMessage ? '' : current); setDesign(current => current ? { ...current, updated_at: data.updated_at } : current); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [design?.name, design?.description, design?.data, design?.id, canEdit]);

  useEffect(() => {
    if (!supabase || !id) return;
    const client = supabase;
    const channel = client.channel(`oriva-design-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_comments', filter: `design_id=eq.${id}` }, () => { void loadComments(id); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'designs', filter: `id=eq.${id}` }, payload => {
        const next = payload.new as DesignRecord;
        if (next && next.owner_id !== user?.id) setDesign(current => current && current.updated_at < next.updated_at ? next : current);
      }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [id, user?.id, loadComments]);

  function updateData(data: DesignData) { setDesign(current => current ? { ...current, data } : current); }
  function updateFrame(patch: Partial<NonNullable<DesignData['frame']>>) {
    if (!design) return;
    const frame = design.data.frame ?? { width: 760, height: 520, color: '#f5f3ee' };
    updateData({ ...design.data, frame: { ...frame, ...patch } });
  }
  function updateLayer(layerId: string, patch: Partial<CanvasLayer>) {
    if (!design) return;
    const layers = design.data.layers ?? [];
    updateData({ ...design.data, layers: layers.map(layer => layer.id === layerId ? { ...layer, ...patch } : layer) });
  }
  function addLayer(kind: CanvasLayer['kind'], source?: CanvasLayer) {
    if (!design) return;
    const index = (design.data.layers?.length ?? 0) + 1;
    const layer: CanvasLayer = source
      ? { ...source, id: crypto.randomUUID(), name: `${source.name} copy`, x: source.x + 24, y: source.y + 24 }
      : { id: crypto.randomUUID(), kind, name: `${kind[0].toUpperCase()}${kind.slice(1)} ${index}`, x: 110 + (index%4)*24, y: 100 + (index%5)*28, width: kind === 'text' ? 200 : kind === 'circle' ? 72 : 150, height: kind === 'text' ? 40 : kind === 'circle' ? 72 : 66, text: kind === 'text' ? 'A thoughtful line' : kind === 'button' ? 'A little more' : '', fill: kind === 'circle' ? '#d6aa80' : '#ffffff', color: '#173b3a', fontSize: kind === 'text' ? 24 : 13, radius: kind === 'button' ? 14 : 12, opacity: 100 };
    updateData({ ...design.data, layers: [...(design.data.layers ?? []), layer] }); setSelectedLayer(layer.id);
  }
  function deleteLayer(layerId: string) { if (!design) return; updateData({ ...design.data, layers: (design.data.layers ?? []).filter(layer => layer.id !== layerId) }); setSelectedLayer(null); }

  async function onPublicChanged(enabled: boolean) {
    if (!supabase || !design || !isOwner) throw new Error('Only the project owner can manage link access.');
    const { error: updateError } = await supabase.from('designs').update({ is_public: enabled }).eq('id', design.id);
    if (updateError) throw updateError;
    setDesign(current => current ? { ...current, is_public: enabled } : current);
  }
  async function addComment(event: React.FormEvent) {
    event.preventDefault(); if (!supabase || !user || !design || !comment.trim()) return;
    setBusyComment(true); setError('');
    try {
      const { error: insertError } = await supabase.from('design_comments').insert({ design_id: design.id, author_id: user.id, body: comment.trim() });
      if (insertError) setError(insertError.message); else { setComment(''); await loadComments(design.id); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add your note. Please try again.'); }
    finally { setBusyComment(false); }
  }

  if (loading) return <div className="loading-screen"><span className="loader-mark" />Opening your design…</div>;
  if (!design || error && !design) return <div className="error-page"><BrandMark size={34} /><h1>That project is out of reach.</h1><p>{error || 'It may have moved, or you may need an invitation.'}</p><Link className="button button-primary" to="/">Back to your workspace</Link></div>;
  const activeLayers = design.data.layers ?? [];

  return <div className={`editor-shell ${design.design_type === 'logo' ? 'logo-editor-shell' : ''}`}>
    <header className="editor-topbar"><div className="editor-brand-cluster"><Link to="/" className="editor-back" title="Back to workspace"><ArrowLeft size={17} /></Link><span className="editor-brand"><BrandMark size={26} /><b>oriva<span className="brand-light"> design</span></b></span><span className="topbar-divider" /><input aria-label="Design name" className="design-name-input" disabled={!canEdit} value={design.name} onChange={e => setDesign({ ...design, name: e.target.value })} /><ChevronDown size={14} className="name-chevron" /><span className="save-status">{saving === 'saving' ? <><span className="saving-dot" /> Saving…</> : saving === 'error' ? <span className="error-tint">Not saved</span> : <><Check size={14} /> Saved</>}</span></div><div className="editor-actions"><span className="collab-avatars" title={`${members.length} collaborator${members.length === 1 ? '' : 's'}`}>{members.slice(0,3).map((member,index) => <span className={`collab-avatar c${index}`} key={member.user_id}>{(member.invited_email || member.user_id).slice(0,1).toUpperCase()}</span>)}{members.length > 3 && <span className="collab-more">+{members.length-3}</span>}</span><button className="icon-button" title="Comments" onClick={() => setCommentsOpen(value => !value)}><MessageCircle size={17} />{comments.length > 0 && <i className="comment-count">{comments.length}</i>}</button><button className="button button-soft share-trigger" onClick={() => setShareOpen(true)}><Share2 size={15} /> Share</button></div></header>
    <div className="editor-subbar"><div className="editor-mode-label">{design.design_type === 'logo' ? <><Sparkles size={14} /> Identity studio</> : <><MousePointer2 size={14} /> Interface canvas</>}<span>/</span><span>{canEdit ? 'Editing' : 'View only'}</span>{!canEdit && <span className="viewer-pill">VIEWER</span>}</div><div className="subbar-right"><span className="subtle-save"><Cloud size={14} /> {saving === 'saving' ? 'Saving changes…' : saving === 'error' ? 'Not saved' : 'All changes saved'}</span><span className="avatar-current" title={user?.email}>{(user?.email ?? 'O').slice(0,1).toUpperCase()}</span></div></div>
    {error && <div className="editor-alert" role="alert">{error} <button onClick={() => setError('')}>Dismiss</button></div>}
    {design.design_type === 'logo' ? <LogoStudio data={design.data} readOnly={!canEdit} onChange={updateData} /> : <CanvasEditor layers={activeLayers} frame={design.data.frame ?? { width: 760, height: 520, color: '#f5f3ee' }} saving={saving} selectedId={selectedLayer} readOnly={!canEdit} onSelect={setSelectedLayer} onUpdate={updateLayer} onFrameUpdate={updateFrame} onAdd={addLayer} onDelete={deleteLayer} />}
    {commentsOpen && <aside className="comments-drawer"><div className="comments-head"><div><span className="eyebrow muted">A THOUGHTFUL THREAD</span><h3>Notes <span>{comments.length}</span></h3></div><button className="icon-button" onClick={() => setCommentsOpen(false)} aria-label="Close notes">×</button></div><p className="comments-intro">A few kind words can make good work even better.</p><div className="comments-list">{comments.length ? comments.map(item => <article className="comment-item" key={item.id}><span className={`comment-avatar ${item.author_id === user?.id ? 'mine' : ''}`}>{item.author_id === user?.id ? (user?.email ?? 'Y')[0].toUpperCase() : 'O'}</span><div><div className="comment-meta"><b>{item.author_id === user?.id ? 'You' : 'Studio member'}</b><time>{timeAgo(item.created_at)}</time></div><p>{item.body}</p></div></article>) : <div className="empty-comments"><MessageCircle size={19} /><span>Nothing here just yet. Leave the first note.</span></div>}</div><form className="comment-form" onSubmit={addComment}><textarea rows={3} maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} placeholder="Leave a kind, useful note…" /><button className="button button-primary" type="submit" disabled={busyComment || !comment.trim()}>{busyComment ? 'Adding…' : 'Add note'}</button></form></aside>}
    {shareOpen && <ShareDialog design={design} members={members} owner={isOwner} onClose={() => setShareOpen(false)} onPublicChanged={onPublicChanged} onMembersChanged={() => loadMembers(design.id)} />}
    <div className="editor-bottom-hint"><CircleHelp size={13} /> Small details count. Take your time.</div>
  </div>;
}

function serialize(name: string, description: string, data: DesignData) { return JSON.stringify({ name, description, data }); }
