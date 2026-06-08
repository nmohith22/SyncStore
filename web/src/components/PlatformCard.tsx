import { useState, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, User, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface PlatformCardProps {
  name: string;
  loginUrl: string;
  onLoginSuccess: (platform: string, username: string) => void;
}

export const PlatformCard = ({ name, loginUrl, onLoginSuccess }: PlatformCardProps) => {
  const [status, setStatus] = useState<'idle' | 'logging_in' | 'connected'>('idle');
  const [username, setUsername] = useState<string | null>(null);
  const [authCodeInput, setAuthCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const platformKey = name.toLowerCase().replace(' ', '');

  useEffect(() => {
    const saved = localStorage.getItem(`syncstore_session_${platformKey}`);
    if (saved) {
      const { username: savedUser } = JSON.parse(saved);
      setUsername(savedUser);
      setStatus('connected');
    }
  }, [platformKey]);

  const handleLogin = () => {
    console.log(`[AUTH] Initiating real-time uplink to ${name}...`);
    setErrorMsg(null);
    setStatus('logging_in');
    
    const isManualAuth = platformKey === 'epicgames' || platformKey === 'gog' || platformKey === 'epic';

    if (isManualAuth) {
      // For Epic and GOG, we instruct the user to log in via browser and copy code
      let targetUrl = loginUrl;
      if (platformKey === 'epicgames' || platformKey === 'epic') {
        targetUrl = 'https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code';
      }
      window.open(targetUrl, '_blank');
      return;
    }

    // Dynamic origin detection for production (GitHub Pages)
    const origin = window.location.origin + window.location.pathname;
    const cleanOrigin = origin.endsWith('/') ? origin : origin + '/';

    let targetUrl = loginUrl;
    if (platformKey === 'steam') {
        const returnTo = encodeURIComponent(cleanOrigin);
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

    const checkPopup = setInterval(async () => {
      try {
        if (popup && !popup.closed) {
          const currentUrl = popup.location.href;
          
          if (currentUrl.includes(window.location.host)) {
            console.log(`[AUTH] Capture phase reached. Extracting account signatures...`);
            
            const params = new URLSearchParams(popup.location.search);
            const claimedId = params.get('openid.claimed_id');
            
            if (claimedId) {
                const steamId = claimedId.split('/id/')[1];
                console.log(`[AUTH] Secure Identity Captured: ${steamId}`);
                
                popup.close();
                clearInterval(checkPopup);

                // Fetch Steam cookies from Electron if available
                let steamCookies = {};
                // @ts-ignore
                if (window.require) {
                  try {
                    // @ts-ignore
                    const { ipcRenderer } = window.require('electron');
                    steamCookies = await ipcRenderer.invoke('get-steam-cookies');
                    console.log('[AUTH] Captured Steam cookies:', Object.keys(steamCookies));
                  } catch (e) {
                    console.error('[AUTH] Failed to retrieve Steam cookies via IPC:', e);
                  }
                }

                const backendUrl = localStorage.getItem('syncstore_backend_url') || 'http://localhost:8001';

                fetch(`${backendUrl}/auth/session`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    platform: 'steam',
                    cookies: steamCookies,
                    user_id: steamId,
                    username: "Syncing_Account...",
                    steam_api_key: localStorage.getItem('syncstore_steam_api_key')
                  })
                }).then(async (res) => {
                  const handshakeData = await res.json();
                  const finalUser = handshakeData.username || "Verified_Member";
                  
                  console.log(`[AUTH] Backend handshake successful. User: ${finalUser}`);
                  setStatus('connected');
                  setUsername(finalUser);
                  localStorage.setItem(`syncstore_session_steam`, JSON.stringify({ username: finalUser, steamId }));
                  onLoginSuccess('steam', finalUser);
                }).catch(err => {
                  console.error(`[AUTH] UPLINK_FAILURE: Node at ${backendUrl} is unreachable.`, err);
                  setStatus('idle');
                  alert(`CONNECTION_REFUSED: Your local sync node at ${backendUrl} is not running.\n\nPlease start the backend to finalize authentication.`);
                });
            }
          }
        }
      } catch (e) {
        // Cross-origin boundary - wait for redirect
      }
      
      if (!popup || popup.closed) {
        if (status === 'logging_in' && !isManualAuth) {
            console.log(`[AUTH] Interaction terminated by user.`);
            setStatus('idle');
        }
        clearInterval(checkPopup);
      }
    }, 1000);
  };

  const handleManualSubmit = async () => {
    if (!authCodeInput.trim()) {
      setErrorMsg('Code cannot be empty');
      return;
    }

    let code = authCodeInput.trim();
    // Parse code from URL if user pasted the entire redirect URL
    if (code.includes('code=')) {
      try {
        const urlObj = new URL(code);
        const codeParam = urlObj.searchParams.get('code');
        if (codeParam) {
          code = codeParam;
        }
      } catch (e) {
        // Fallback if URL parsing fails
        const match = code.match(/[?&]code=([^&]+)/);
        if (match) {
          code = match[1];
        }
      }
    }

    setErrorMsg(null);
    const backendUrl = localStorage.getItem('syncstore_backend_url') || 'http://localhost:8001';
    const requestPlatform = (platformKey === 'epicgames' || platformKey === 'epic') ? 'epic' : 'gog';

    try {
      const res = await fetch(`${backendUrl}/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: requestPlatform,
          auth_code: code
        })
      });

      const handshakeData = await res.json();
      if (handshakeData.error) {
        setErrorMsg(handshakeData.error);
        return;
      }

      const finalUser = handshakeData.username || "Verified_Member";
      console.log(`[AUTH] Backend handshake successful for ${name}. User: ${finalUser}`);
      setStatus('connected');
      setUsername(finalUser);
      localStorage.setItem(`syncstore_session_${platformKey}`, JSON.stringify({ username: finalUser }));
      onLoginSuccess(requestPlatform, finalUser);
    } catch (err) {
      console.error(`[AUTH] UPLINK_FAILURE: Node at ${backendUrl} is unreachable.`, err);
      setErrorMsg('Backend node is unreachable. Is the backend running?');
    }
  };

  const handleDisconnect = (e: MouseEvent) => {
    e.stopPropagation();
    console.log(`[AUTH] Terminating uplink to ${name}.`);
    localStorage.removeItem(`syncstore_session_${platformKey}`);
    setStatus('idle');
    setUsername(null);
    setAuthCodeInput('');
    setErrorMsg(null);
  };

  const isManual = platformKey === 'epicgames' || platformKey === 'gog' || platformKey === 'epic';

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-8 relative group overflow-hidden w-full"
      style={{ 
        backgroundColor: 'var(--color-bg)',
        borderColor: status === 'connected' ? 'var(--color-main)' : 'var(--color-sub)',
        opacity: status === 'idle' ? 0.6 : 1
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
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="flex items-center gap-3 text-main animate-pulse">
            <AlertCircle size={20} />
            <span className="font-black text-xs tracking-[0.4em]">LINKING...</span>
          </div>

          {isManual ? (
            <div className="flex flex-col gap-4 w-full">
              <div className="bg-main/5 p-4 rounded-xl border border-main/20 text-center flex flex-col gap-2">
                <p className="text-[10px] text-main font-black uppercase tracking-wider">
                  1. Browser login tab opened.
                </p>
                <p className="text-[9px] opacity-60 uppercase font-black tracking-widest leading-relaxed">
                  Log in, then copy the <span className="text-main">authorizationCode</span> (Epic) or the <span className="text-main">final URL</span> (GOG) and paste it below.
                </p>
                <a 
                  href={platformKey === 'gog' ? loginUrl : 'https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code'} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[9px] text-main underline uppercase font-black tracking-widest mt-1 hover:opacity-80 flex items-center justify-center gap-1"
                >
                  Reopen Login Link <ExternalLink size={10} />
                </a>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <input 
                  type="text"
                  placeholder="PASTE_CODE_OR_URL_HERE"
                  value={authCodeInput}
                  onChange={(e) => setAuthCodeInput(e.target.value)}
                  className="w-full bg-sub/5 border-2 border-sub/10 rounded-xl px-4 py-3 text-[10px] font-mono tracking-wider focus:outline-none focus:border-main/50 text-center uppercase"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleManualSubmit}
                    className="flex-1 py-3 bg-main text-bg font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-[10px] tracking-widest uppercase italic"
                  >
                    Confirm Code
                  </button>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="px-4 py-3 bg-sub/10 text-text font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-[10px] tracking-widest uppercase italic"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[10px] text-main font-black uppercase tracking-widest text-center px-4 bg-main/10 py-2 rounded-lg border border-main/20">
                Login in popup, then CLOSE window
              </p>
              <p className="text-[9px] opacity-40 uppercase font-black tracking-widest text-center">We will automatically verify<br/>your session on close</p>
            </div>
          )}

          {errorMsg && (
            <p className="text-[9px] text-red-500 font-black uppercase tracking-widest text-center px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20 w-full">
              Error: {errorMsg}
            </p>
          )}
        </div>
      )}

      {status === 'connected' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-green-500">
            <ShieldCheck size={20} />
            <span className="font-black text-xs tracking-[0.4em]">SYNCED</span>
          </div>
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-6 py-2 bg-sub/10 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-all"
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
