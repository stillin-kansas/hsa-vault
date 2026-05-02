import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#020509}
  @keyframes meshDrift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.06)}100%{transform:translate(0,0) scale(1)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both}
  .fu1{animation:fadeUp 0.5s 0.06s cubic-bezier(0.22,1,0.36,1) both}
  .fu2{animation:fadeUp 0.5s 0.12s cubic-bezier(0.22,1,0.36,1) both}
  .glass{background:rgba(15,23,42,0.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08)}
  input::placeholder{color:rgba(148,163,184,0.35)}
`;

export default function AuthScreen() {
  const [mode,   setMode]   = useState('login'); // login | signup | reset
  const [name,   setName]   = useState('');
  const [email,  setEmail]  = useState('');
  const [pass,   setPass]   = useState('');
  const [error,  setError]  = useState('');
  const [msg,    setMsg]    = useState('');
  const [busy,   setBusy]   = useState(false);

  const friendlyError = (code) => ({
    'auth/email-already-in-use':  'An account with this email already exists.',
    'auth/user-not-found':        'No account found with this email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/popup-closed-by-user':  'Sign-in popup was closed. Please try again.',
    'auth/invalid-credential':    'Incorrect email or password.',
  }[code] || 'Something went wrong. Please try again.');

  const handleSubmit = async () => {
    setError(''); setMsg(''); setBusy(true);
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setMsg('Password reset email sent. Check your inbox.');
        setMode('login');
      } else if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name.'); setBusy(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (e) { setError(friendlyError(e.code)); }
    setBusy(false);
  };

  const handleGoogle = async () => {
    setError(''); setBusy(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError(friendlyError(e.code)); }
    setBusy(false);
  };

  const inp = {
    width:'100%', background:'rgba(15,23,42,0.8)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:12, color:'#e2e8f0', fontSize:15, padding:'13px 14px', outline:'none',
    fontFamily:"'Outfit',sans-serif", marginBottom:12,
  };

  return (
    <div style={{minHeight:'100vh',background:'#020509',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Outfit',sans-serif",padding:20,position:'relative',overflow:'hidden'}}>
      <style>{CSS}</style>
      {/* Orbs */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}}>
        <div style={{position:'absolute',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 70%)',top:'-100px',left:'-100px',animation:'meshDrift 18s ease-in-out infinite'}}/>
        <div style={{position:'absolute',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)',bottom:'-80px',right:'-80px',animation:'meshDrift 22s 3s ease-in-out infinite reverse'}}/>
      </div>

      <div className="glass fu" style={{width:'100%',maxWidth:400,borderRadius:24,padding:'36px 28px',position:'relative',zIndex:1,boxShadow:'0 32px 80px rgba(0,0,0,0.5)'}}>
        {/* Logo */}
        <div className="fu" style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#0ea5e9,#2563eb)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 12px',boxShadow:'0 0 24px rgba(14,165,233,0.4)'}}>⚕</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:'#f8fafc',marginBottom:4}}>HSA Vault</div>
          <div style={{fontSize:12,color:'rgba(100,116,139,0.7)'}}>
            {mode==='login'?'Sign in to your account':mode==='signup'?'Create your free account':'Reset your password'}
          </div>
        </div>

        {/* Mode tabs (login/signup only) */}
        {mode!=='reset' && (
          <div className="fu1" style={{display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:12,padding:3,marginBottom:20}}>
            {[['login','Sign In'],['signup','Create Account']].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setError('');}} style={{flex:1,padding:'9px',borderRadius:10,border:'none',cursor:'pointer',background:mode===m?'rgba(56,189,248,0.15)':'transparent',color:mode===m?'#38bdf8':'rgba(100,116,139,0.6)',fontWeight:600,fontSize:14,fontFamily:"'Outfit',sans-serif",transition:'all 0.2s'}}>{l}</button>
            ))}
          </div>
        )}

        {/* Errors / messages */}
        {error && <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#f87171',marginBottom:14}}>{error}</div>}
        {msg   && <div style={{background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.3)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#34d399',marginBottom:14}}>{msg}</div>}

        {/* Form */}
        <div className="fu2">
          {mode==='signup' && (
            <input style={inp} type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
          )}
          <input style={inp} type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
          {mode!=='reset' && (
            <input style={{...inp,marginBottom:0}} type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
          )}

          {mode==='login' && (
            <div style={{textAlign:'right',marginTop:6,marginBottom:16}}>
              <button onClick={()=>{setMode('reset');setError('');}} style={{background:'none',border:'none',color:'rgba(100,116,139,0.6)',fontSize:12,cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>Forgot password?</button>
            </div>
          )}
          {mode!=='login' && <div style={{height:16}}/>}

          <button onClick={handleSubmit} disabled={busy} style={{width:'100%',padding:'14px',border:'none',borderRadius:12,cursor:'pointer',background:busy?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#0ea5e9,#2563eb)',color:'#fff',fontSize:15,fontWeight:700,fontFamily:"'Outfit',sans-serif",boxShadow:busy?'none':'0 0 20px rgba(14,165,233,0.4)',transition:'all 0.2s',marginBottom:mode==='reset'?0:12}}>
            {busy?'Please wait…':mode==='login'?'Sign In':mode==='signup'?'Create Account':'Send Reset Email'}
          </button>

          {mode!=='reset' && (
            <>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
                <span style={{fontSize:12,color:'rgba(100,116,139,0.5)'}}>or</span>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
              </div>
              <button onClick={handleGoogle} disabled={busy} style={{width:'100%',padding:'13px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,cursor:'pointer',background:'rgba(255,255,255,0.04)',color:'#e2e8f0',fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all 0.2s'}}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                Continue with Google
              </button>
            </>
          )}

          {mode==='reset' && (
            <button onClick={()=>setMode('login')} style={{width:'100%',marginTop:12,padding:'12px',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,cursor:'pointer',background:'transparent',color:'rgba(100,116,139,0.7)',fontSize:14,fontFamily:"'Outfit',sans-serif"}}>← Back to Sign In</button>
          )}
        </div>
      </div>
    </div>
  );
}
