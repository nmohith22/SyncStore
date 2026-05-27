import { motion, AnimatePresence } from 'framer-motion';
import { X, Square, RectangleHorizontal, Palette, Settings2, Server, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { themes } from '../styles/themes';
import { useTheme } from '../styles/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardStyle: 'square' | 'poster';
  setCardStyle: (style: 'square' | 'poster') => void;
}

export const SettingsModal = ({ isOpen, onClose, cardStyle, setCardStyle }: SettingsModalProps) => {
  const { theme, setTheme } = useTheme();
  const [steamKey, setSteamKey] = useState(localStorage.getItem('syncstore_steam_api_key') || '');
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('syncstore_backend_url') || 'http://localhost:8001');

  const saveSettings = () => {
    localStorage.setItem('syncstore_steam_api_key', steamKey);
    localStorage.setItem('syncstore_backend_url', backendUrl);
    onClose();
  };

  const purgeData = () => {
    if (confirm('CRITICAL: This will permanently delete your synced library and all local credentials from this browser. Continue?')) {
        localStorage.clear();
        window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative border-2 border-sub/30 rounded-[2.5rem] p-10 w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto hide-scrollbar"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-sub)' }}
          >
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-4">
                <Settings2 size={32} className="text-main" />
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">System Config</h2>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-main hover:text-bg rounded-full transition-all active:scale-90">
                <X size={28} />
              </button>
            </div>

            <div className="space-y-16">
              {/* Uplink Infrastructure */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Server size={16} className="text-main" />
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-sub">Uplink Infrastructure</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Backend Node URL</label>
                        <input 
                        type="text"
                        value={backendUrl}
                        onChange={(e) => setBackendUrl(e.target.value)}
                        placeholder="http://localhost:8001"
                        className="w-full bg-sub/5 border-2 border-sub/10 rounded-xl px-6 py-4 text-xs font-mono tracking-widest focus:outline-none focus:border-main/50 transition-colors"
                        />
                        <p className="text-[9px] opacity-30 uppercase font-black tracking-widest">Address of your local or private sync node.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Steam Web API Key</label>
                        <input 
                        type="password"
                        value={steamKey}
                        onChange={(e) => setSteamKey(e.target.value)}
                        placeholder="PASTE_KEY_HERE"
                        className="w-full bg-sub/5 border-2 border-sub/10 rounded-xl px-6 py-4 text-xs font-mono tracking-widest focus:outline-none focus:border-main/50 transition-colors"
                        />
                        <p className="text-[9px] opacity-30 uppercase font-black tracking-widest">Stored locally in your browser only.</p>
                    </div>
                </div>
              </section>

              {/* Security & Privacy */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Trash2 size={16} className="text-error" />
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-error opacity-60">Security & Privacy</h3>
                </div>
                <div className="p-8 border-2 border-error/10 bg-error/5 rounded-[1.5rem] flex items-center justify-between">
                    <div>
                        <h4 className="font-black uppercase tracking-widest text-xs mb-1">Local Purge</h4>
                        <p className="text-[10px] opacity-40 uppercase font-black tracking-widest">Wipe all local session data and synced libraries.</p>
                    </div>
                    <button 
                        onClick={purgeData}
                        className="px-8 py-3 bg-error/20 hover:bg-error text-error hover:text-white transition-all rounded-xl font-black uppercase tracking-widest text-[10px]"
                    >
                        Purge Catalog
                    </button>
                </div>
              </section>

              {/* Card Style */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Square size={16} className="text-main" />
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-sub">Interface Layout</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { id: 'poster', label: 'Poster Art (3:4)', icon: RectangleHorizontal },
                    { id: 'square', label: 'Square Tile (1:1)', icon: Square },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setCardStyle(style.id as any)}
                      className="group relative p-8 rounded-[1.5rem] border-2 transition-all flex flex-col items-center justify-center gap-4 overflow-hidden"
                      style={{
                        borderColor: cardStyle === style.id ? 'var(--color-main)' : 'var(--color-sub)',
                        backgroundColor: cardStyle === style.id ? 'var(--color-main)' : 'transparent',
                        color: cardStyle === style.id ? 'var(--color-bg)' : 'var(--color-text)',
                      }}
                    >
                      <style.icon size={32} className={cardStyle === style.id ? 'opacity-100' : 'opacity-40'} />
                      <span className="font-black uppercase tracking-widest text-[11px] italic">{style.label}</span>
                      {cardStyle === style.id && (
                        <motion.div layoutId="layout-glow" className="absolute inset-0 bg-white/10" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Theme Selection - Monkeytype Style */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Palette size={16} className="text-main" />
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-sub">Visual Identity</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {themes.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setTheme(t.name)}
                      className="group relative h-14 rounded-xl transition-all overflow-hidden flex items-center px-4 border-2"
                      style={{
                        backgroundColor: t.colors.bg,
                        borderColor: theme.name === t.name ? t.colors.main : t.colors.sub,
                      }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-4 h-4 rounded-full shadow-lg shrink-0" style={{ backgroundColor: t.colors.main }} />
                        <span 
                          className="font-black text-[10px] uppercase tracking-widest truncate"
                          style={{ color: t.colors.text }}
                        >
                          {t.name}
                        </span>
                      </div>
                      {theme.name === t.name && (
                        <div className="absolute right-0 top-0 bottom-0 w-1" style={{ backgroundColor: t.colors.main }} />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-16 pt-10 border-t-2 border-sub/10 flex justify-end">
              <button 
                onClick={saveSettings}
                className="px-14 py-5 bg-main text-bg rounded-[1.2rem] font-black uppercase tracking-[0.3em] text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(var(--color-main-rgb),0.3)]"
              >
                Accept Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
