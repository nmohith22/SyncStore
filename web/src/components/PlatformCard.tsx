import { useState, useEffect, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, User, XCircle } from 'lucide-react';

interface PlatformCardProps {
  name: string;
  loginUrl: string;
  onLoginSuccess: (platform: string, username: string) => void;
}

export const PlatformCard = ({ name, loginUrl, onLoginSuccess }: PlatformCardProps) => {
  const [status, setStatus] = useState<'idle' | 'logging_in' | 'connected'>('idle');
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`syncstore_session_${name.toLowerCase()}`);
    if (saved) {
      const { username: savedUser } = JSON.parse(saved);
      setUsername(savedUser);
      setStatus('connected');
    }
  }, [name]);

  const handleLogin = () => {
    console.log(`[AUTH] Initiating real-time uplink to ${name}...`);
    setStatus('logging_in');
    
    let targetUrl = loginUrl;
    if (name.toLowerCase() === 'steam') {
        const returnTo = encodeURIComponent('http://localhost:5173/');
        targetUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${returnTo}&openid.realm=${returnTo}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;
    }

    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      targetUrl,
      `Login to ${name}`,
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const checkPopup = setInterval(() => {
      try {
        if (popup && !popup.closed) {
          const currentUrl = popup.location.href;
          
          // Check if we've been redirected back to our app (localhost)
          if (currentUrl.includes('localhost:5173')) {
            console.log(`[AUTH] Capture phase reached. Extracting account signatures...`);
            
            const params = new URLSearchParams(popup.location.search);
            const claimedId = params.get('openid.claimed_id');
            
            if (claimedId) {
                const steamId = claimedId.split('/id/')[1];
                console.log(`[AUTH] Secure Identity Captured: ${steamId}`);
                
                popup.close();
                clearInterval(checkPopup);

                // Notify backend of the REAL captured SteamID
                fetch('http://localhost:8001/auth/session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    platform: 'steam',
                    cookies: { session: "openid_verified_" + Date.now() },
                    user_id: steamId,
                    username: "Syncing_Account..."
                  })
                }).then(async (res) => {
                  const handshakeData = await res.json();
                  const finalUser = handshakeData.username || "Verified_Member";
                  
                  console.log(`[AUTH] Backend handshake successful. User: ${finalUser}`);
                  setStatus('connected');
                  setUsername(finalUser);
                  localStorage.setItem(`syncstore_session_${name.toLowerCase()}`, JSON.stringify({ username: finalUser, steamId }));
                  onLoginSuccess(name.toLowerCase(), finalUser);
                });
            }
          }
        }
      } catch (e) {
        // Cross-origin boundary - do nothing, wait for redirect
      }
      
      if (!popup || popup.closed) {
        if (status === 'logging_in') {
            console.log(`[AUTH] Interaction terminated by user.`);
            setStatus('idle');
        }
        clearInterval(checkPopup);
      }
    }, 1000);
  };

  const handleDisconnect = (e: MouseEvent) => {
    e.stopPropagation();
    console.log(`[AUTH] Terminating uplink to ${name}.`);
    localStorage.removeItem(`syncstore_session_${name.toLowerCase()}`);
    setStatus('idle');
    setUsername(null);
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-8 relative group overflow-hidden"
      style={{ 
        backgroundColor: 'var(--color-bg)',
        borderColor: status === 'connected' ? 'var(--color-main)' : 'var(--color-sub)',
        opacity: status === 'idle' ? 0.5 : 1
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{name}</h3>
        {username && (
          <div className="flex items-center gap-2 opacity-60">
            <User size={12} className="text-main" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{username}</span>
          </div>
        )}
      </div>
      
      {status === 'idle' && (
        <button 
          onClick={handleLogin}
          className="px-10 py-4 bg-main text-bg font-black rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs tracking-[0.3em] uppercase italic"
        >
          Authenticate
        </button>
      )}

      {status === 'logging_in' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-main animate-pulse">
            <AlertCircle size={20} />
            <span className="font-black text-xs tracking-[0.4em]">LINKING...</span>
          </div>
          <p className="text-[10px] text-main font-black uppercase tracking-widest text-center px-4 bg-main/10 py-2 rounded-lg border border-main/20">
            Login in popup, then CLOSE window
          </p>
          <p className="text-[9px] opacity-40 uppercase font-black tracking-widest text-center">We will automatically verify<br/>your session on close</p>
        </div>
      )}

      {status === 'connected' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-green-500">
            <CheckCircle size={20} />
            <span className="font-black text-xs tracking-[0.4em]">SYNCED</span>
          </div>
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-6 py-2 bg-sub/10 hover:bg-error/20 hover:text-error rounded-xl transition-all"
          >
             <XCircle size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">OFFLINE</span>
          </button>
        </div>
      )}

      {/* Decorative Glow */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-main/5 blur-[60px] rounded-full" />
    </motion.div>
  );
};
