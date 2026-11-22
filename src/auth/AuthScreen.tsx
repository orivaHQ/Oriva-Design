import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Layers3, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';

export function AuthScreen() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const hasSession = await signUp(email, password);
        if (!hasSession) setNotice('Check your inbox to confirm your email, then sign in here.');
      } else await signIn(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-story">
      <div className="auth-brand"><BrandMark /><span>oriva<span className="brand-light"> design</span></span></div>
      <div className="auth-quote">
        <div className="eyebrow"><Sparkles size={14} /> A quieter kind of creative space</div>
        <h1>Make room<br />for <em>good ideas.</em></h1>
        <p>Thoughtful UX, expressive identities, and the little details that make the whole thing click.</p>
      </div>
      <div className="auth-art" aria-hidden="true">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-tile art-tile-a"><span className="tile-dot" /><span>01 / explore</span><i /></div>
        <div className="art-tile art-tile-b"><b>o</b><span>Form follows feeling.</span></div>
        <div className="art-tile art-tile-c"><span /><span /><span /></div>
        <div className="art-caption">IDEAS, IN GOOD COMPANY</div>
      </div>
      <div className="auth-foot"><span>Independent by nature.</span><span>Made for the curious.</span></div>
    </section>

    <section className="auth-form-side">
      <div className="auth-form-wrap">
        <div className="mobile-brand"><BrandMark /><span>oriva<span className="brand-light"> design</span></span></div>
        <div className="auth-heading"><span className="eyebrow">YOUR CREATIVE SPACE</span><h2>{mode === 'signin' ? 'Good to see you.' : 'Come on in.'}</h2><p>{mode === 'signin' ? 'Pick up right where your ideas left off.' : 'Your next favorite thing starts here.'}</p></div>
        {!configured && <div className="notice notice-error">Supabase connection is not configured. Add the public project URL and publishable key to the deployment environment.</div>}
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {notice && <div className="notice notice-success" role="status">{notice}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>Email address<div className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" placeholder="you@studio.com" required value={email} onChange={e => setEmail(e.target.value)} /></div></label>
          <label>Password<div className="input-wrap"><LockKeyhole size={17} /><input type={visible ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)} /><button className="input-action" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          <button className="button button-primary button-wide" type="submit" disabled={!configured || busy}>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create your account'}<ArrowRight size={17} /></button>
        </form>
        <div className="auth-switch">{mode === 'signin' ? 'New to Oriva?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></div>
        <div className="auth-trust"><Layers3 size={15} /> Your designs belong to you. Always.</div>
      </div>
      <div className="auth-bottom-note">By continuing, you agree to keep this a thoughtful place to make things.</div>
    </section>
  </main>;
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="10" fill="#173b3a"/><path d="M9 18.2c0-4.1 2.8-7 7-7s7 2.9 7 7" fill="none" stroke="#f7f4ed" strokeWidth="2.3" strokeLinecap="round"/><circle cx="16" cy="18.5" r="2" fill="#d5a778"/><path d="M7.7 22.6h16.6" stroke="#f7f4ed" strokeWidth="1.4" strokeLinecap="round" opacity=".55"/></svg>;
}
