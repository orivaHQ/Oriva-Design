import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, LockKeyhole, Share2, Sparkles } from 'lucide-react';
import { BrandMark } from '../auth/AuthScreen';
import { LogoStudio } from './LogoStudio';
import { supabase } from '../lib/supabase';
import type { DesignRecord } from '../types';

type SharedDesign = Pick<DesignRecord, 'id' | 'name' | 'description' | 'design_type' | 'data'>;

export function SharedPage() {
  const { token } = useParams();
  const [design, setDesign] = useState<SharedDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !token) { setError('This shared link is not available.'); setLoading(false); return; }
      try {
        const { data, error: queryError } = await supabase.rpc('get_shared_design', { target_token: token }).maybeSingle();
        if (!active) return;
        if (queryError || !data) setError('This link may have expired, or the owner has turned off sharing.');
        else setDesign(data as SharedDesign);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Could not open this shared design. Please try again.');
      } finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [token]);

  return <main className="public-share-page"><header className="public-share-top"><Link to="/" className="sidebar-brand"><BrandMark size={28} /><span>oriva<span className="brand-light"> design</span></span></Link><div className="public-view-pill"><Share2 size={14} /> Shared with you</div><Link className="button button-soft" to="/auth">Make your own <ExternalLink size={14} /></Link></header>
    {loading ? <div className="public-loading"><span className="loader-mark" />Opening this little window…</div> : error ? <div className="public-error"><div className="error-illustration"><LockKeyhole size={24} /></div><span className="eyebrow muted">PRIVATE BY DEFAULT</span><h1>Nothing to see here just yet.</h1><p>{error}</p><Link to="/auth" className="button button-primary"><ArrowLeft size={15} /> Back to Oriva</Link></div> : design ? <>
      <div className="public-design-head"><span className="eyebrow muted"><Sparkles size={13} /> A SMALL WINDOW INTO THE PROCESS</span><h1>{design.name}</h1><p>{design.description || 'A thoughtful work in progress.'}</p><div className="public-lock"><LockKeyhole size={13} /> View only · Shared by an Oriva designer</div></div>
      {design.design_type === 'logo' ? <div className="public-logo"><LogoStudio data={design.data} readOnly onChange={() => undefined} /></div> : <div className="public-canvas-shell"><div className="public-canvas-frame" style={{ background: design.data.frame?.color ?? '#f5f3ee' }}>{(design.data.layers ?? []).map(layer => <div key={layer.id} className={`public-layer public-layer-${layer.kind}`} style={{ left: `${layer.x/760*100}%`, top: `${layer.y/520*100}%`, width: `${layer.width/760*100}%`, height: `${layer.height/520*100}%`, color: layer.color, background: layer.kind === 'text' || layer.kind === 'line' ? 'transparent' : layer.fill, fontSize: `min(${layer.fontSize/760*100}cqw, ${layer.fontSize}px)`, borderRadius: layer.kind === 'circle' ? '50%' : `${layer.radius}px`, opacity: layer.opacity/100 }}>{layer.kind === 'text' && <span>{layer.text}</span>}{layer.kind === 'button' && layer.text}{layer.kind === 'image' && <span className="image-placeholder"><span className="mountain-shape" /><small>IMAGE</small></span>}</div>)}</div></div>}
      <footer className="public-footer"><span><BrandMark size={19} /> Good ideas have good company.</span><Link to="/auth">Make room for your ideas <ArrowLeft size={13} className="arrow-rotate" /></Link></footer>
    </> : null}
  </main>;
}
