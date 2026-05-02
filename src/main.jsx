import React from 'react';
import ReactDOM from 'react-dom/client';
import { useAuth } from './hooks/useAuth';
import AuthScreen from './components/AuthScreen';
import App from './components/App';

function Root() {
  const { user, loading } = useAuth();

  // Still checking auth state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#020509',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚕</div>
          <div style={{ fontSize: 13, color: 'rgba(100,116,139,0.5)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  // Not logged in → show auth screen
  if (!user) return <AuthScreen />;

  // Logged in → show app
  return <App user={user} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
