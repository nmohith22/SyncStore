import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from './styles/ThemeContext'
import { Settings, RefreshCw, Filter, Search, Gamepad2 } from 'lucide-react'
import { PlatformCard } from './components/PlatformCard'
import { SettingsModal } from './components/SettingsModal'
import { GameDetailModal } from './components/GameDetailModal'

interface Game {
  id: string;
  name: string;
  platforms: string[];
  image_url?: string;
  year?: number;
  genre?: string;
  description?: string;
  playtime_hours?: number;
}

const PlatformLabel = ({ platforms }: { platforms: string[] }) => {
  const labelStyles: Record<string, string> = {
    steam: 'bg-[var(--color-steam)]',
    epic: 'bg-[var(--color-epic)]',
    psn: 'bg-[var(--color-psn)]',
    playstation: 'bg-[var(--color-psn)]',
    xbox: 'bg-[var(--color-xbox)]',
  };
  
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
      {platforms.map(platform => (
        <div 
          key={platform}
          className={`backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-white border border-white/20 shadow-2xl self-end ${labelStyles[platform.toLowerCase()] || 'bg-sub'}`}
        >
          {platform}
        </div>
      ))}
    </div>
  );
}

function App() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('library')
  const [games, setGames] = useState<Game[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [cardStyle, setCardStyle] = useState<'square' | 'poster'>(() => {
    return (localStorage.getItem('syncstore_cardstyle') as any) || 'poster';
  })

  useEffect(() => {
    localStorage.setItem('syncstore_cardstyle', cardStyle);
  }, [cardStyle]);

  const loadGames = () => {
    const saved = localStorage.getItem('syncstore_library');
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log(`[LOCAL] Repository linked. Found ${parsed.length} cataloged units.`);
      setGames(parsed);
    }
  }

  const saveGames = (newGames: Game[]) => {
    localStorage.setItem('syncstore_library', JSON.stringify(newGames));
    setGames(newGames);
  }

  const fetchGamesFromBackend = async () => {
    console.log("[SYNC] Initiating master synchronization protocol...");
    setIsSyncing(true);
    try {
      // Step 1: Trigger Backend Sync (Total Purge & Re-scrape)
      const syncRes = await fetch('http://localhost:8001/sync/all', { method: 'POST' });
      const syncMsg = await syncRes.json();
      console.log(`[SYNC] Node Response: ${syncMsg.message}`);
      
      // Step 2: Artificial delay for "Deep Scrape" aesthetic
      console.log("[SYNC] Finalizing deep-scrape (4000ms delay)...");
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Step 3: Fetch Fresh Catalog
      const res = await fetch('http://localhost:8001/games')
      const data = await res.json()
      console.log(`[SYNC] Catalog received. Total entries: ${data.length}`);
      
      // DEEP DATA TRACE (F12)
      console.group("[SYNC] PERSISTENCE_MAP_TRACE");
      data.forEach((g: any, i: number) => {
          console.log(`%c[${i}] %c${g.name} %c(REAL_UNIT)`, 
            "color: #888", 
            "color: #00ff00; font-weight: bold", 
            "color: #00ffff"
          );
      });
      console.groupEnd();
      
      // Grouping logic: merge games with same name but different platforms
      const groupedMap = new Map<string, Game>();
      
      data.forEach((g: any) => {
        if (groupedMap.has(g.name)) {
          const existing = groupedMap.get(g.name)!;
          if (!existing.platforms.includes(g.platform)) {
            existing.platforms.push(g.platform);
          }
          if (g.description) existing.description = g.description;
          if (g.playtime_hours) existing.playtime_hours = g.playtime_hours;
        } else {
          groupedMap.set(g.name, {
            id: String(g.id || Math.random().toString(36).substr(2, 9)),
            name: g.name,
            platforms: [g.platform],
            image_url: g.image_url,
            year: g.year || 2023,
            genre: g.genre || 'Action',
            description: g.description,
            playtime_hours: g.playtime_hours
          });
        }
      });

      const updatedGames = Array.from(groupedMap.values());
      console.log(`[SYNC] Extraction complete. Final library size: ${updatedGames.length} unique units.`);

      // Persist ONLY real data
      saveGames(updatedGames);
    } catch (e) {
      console.error("[SYNC] FATAL_LINK_ERROR:", e);
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    loadGames();
  }, [])

  const filteredGames = games.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || g.platforms.some(p => p.toLowerCase() === filterPlatform.toLowerCase());
    return matchesSearch && matchesPlatform;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 350, damping: 25 }
    }
  }

  const getDynamicFontSize = (text: string) => {
    if (text.length > 25) return 'text-sm';
    if (text.length > 15) return 'text-lg';
    return 'text-2xl';
  }

  return (
    <div className="min-h-screen flex flex-col p-10 font-sans selection:bg-main selection:text-bg transition-colors duration-1000" style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex justify-between items-center mb-24">
        <div className="flex flex-col group cursor-pointer" onClick={() => setActiveTab('library')}>
          <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-none select-none">
            SYNC<span style={{ color: 'var(--color-main)' }}>STORE</span>
          </h1>
        </div>
        
        <div className="flex gap-6 items-center">
          <button 
            onClick={fetchGamesFromBackend}
            disabled={isSyncing}
            className={`p-4 rounded-2xl bg-main/5 border-2 border-main/10 hover:bg-main/20 hover:border-main/40 transition-all active:scale-90 group ${isSyncing ? 'animate-pulse' : ''}`}
          >
            <RefreshCw size={24} className={`text-main ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-700`} />
          </button>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-4 rounded-2xl bg-sub/5 border-2 border-sub/10 hover:bg-sub/20 hover:border-sub/30 transition-all active:scale-95"
          >
            <Settings size={24} className="text-sub" />
          </button>

          <motion.div 
            initial={false}
            animate={{ 
              width: (searchQuery || isSearchFocused) ? 400 : 64,
            }}
            whileHover={{ width: 400 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative h-16 bg-sub/5 border-2 border-sub/10 rounded-2xl flex items-center overflow-hidden focus-within:border-main/50 transition-colors duration-500 group"
          >
            <div className="absolute right-0 w-16 h-full flex items-center justify-center pointer-events-none z-10">
              <Search 
                size={18} 
                className={`transition-all duration-500 ${isSearchFocused || searchQuery ? 'text-main opacity-100' : 'text-sub opacity-40 group-hover:opacity-100'}`} 
              />
            </div>
            <input 
              type="text" 
              placeholder="SEARCH_REGISTRY" 
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full bg-transparent pl-6 pr-16 text-[11px] font-black tracking-[0.2em] focus:outline-none placeholder:opacity-20 uppercase text-text"
            />
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[2400px] mx-auto w-full">
        <div className="flex justify-between items-center mb-16">
          <div className="flex gap-4 bg-sub/5 p-2 rounded-[1.2rem] border-2 border-sub/5 backdrop-blur-md">
            {['library', 'platforms'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-14 py-4 rounded-xl font-black text-[11px] tracking-[0.5em] transition-all uppercase italic"
                style={{
                  backgroundColor: activeTab === tab ? 'var(--color-main)' : 'transparent',
                  color: activeTab === tab ? 'var(--color-bg)' : 'var(--color-text)',
                  opacity: activeTab === tab ? 1 : 0.3
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 px-8 py-4 bg-sub/5 rounded-2xl border-2 border-sub/10 group">
              <Filter size={14} className="text-sub group-hover:text-main transition-colors" />
              <select 
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="bg-transparent text-[11px] font-black uppercase tracking-[0.3em] focus:outline-none cursor-pointer text-sub hover:text-text transition-colors italic"
              >
                <option value="all"></option>
                <option value="steam">STEAM_NET</option>
                <option value="epic">EPIC_VAULT</option>
                <option value="psn">PLAYSTATION_NET</option>
                <option value="xbox">XBOX_CORE</option>
              </select>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'platforms' ? (
            <motion.div 
              key="platforms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              <PlatformCard name="Steam" loginUrl="https://store.steampowered.com/login/" onLoginSuccess={fetchGamesFromBackend} />
              <PlatformCard name="Epic Games" loginUrl="https://www.epicgames.com/id/login" onLoginSuccess={fetchGamesFromBackend} />
              <PlatformCard name="PlayStation" loginUrl="https://www.playstation.com/en-us/sign-in/" onLoginSuccess={fetchGamesFromBackend} />
              <PlatformCard name="Xbox" loginUrl="https://www.xbox.com/en-US/auth/msa" onLoginSuccess={fetchGamesFromBackend} />
            </motion.div>
          ) : (
            <motion.div 
              key="library"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className={`grid gap-6 ${
                cardStyle === 'poster' 
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                  : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
              }`}
            >
              {filteredGames.length > 0 ? filteredGames.map((game) => (
                <motion.div
                  key={game.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -12 }}
                  onClick={() => setSelectedGame(game)}
                  className={`group relative rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl ${
                    cardStyle === 'poster' ? 'aspect-[3/4]' : 'aspect-square'
                  }`}
                  style={{ 
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-sub)',
                  }}
                >
                  <div className="absolute inset-0 border-4 border-main opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none rounded-[2.5rem]" />
                  
                  <div className="w-full h-full overflow-hidden">
                    {game.image_url ? (
                      <img src={game.image_url} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10">
                        <Gamepad2 size={64} />
                      </div>
                    )}
                  </div>
                  
                  <PlatformLabel platforms={game.platforms} />

                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-4 group-hover:translate-y-0">
                    <h3 className={`font-black leading-[1.1] uppercase italic text-white group-hover:text-main transition-colors duration-300 tracking-tighter mb-4 line-clamp-3 ${getDynamicFontSize(game.name)}`}>
                      {game.name}
                    </h3>
                    <div className="flex items-center gap-4 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white border-b-2 border-main/40 pb-0.5">{game.year}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-main/50" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 line-clamp-1">{game.genre}</span>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="col-span-full py-80 text-center">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1], opacity: [0.03, 0.08, 0.03] }} 
                    transition={{ duration: 5, repeat: Infinity }}
                  >
                    <Gamepad2 size={200} className="mx-auto mb-12" />
                    <p className="text-5xl font-black uppercase tracking-[1.5em] ml-[1.5em] italic">ZERO_UNITS</p>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        cardStyle={cardStyle}
        setCardStyle={setCardStyle}
      />

      <GameDetailModal 
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />

      {/* Footer */}
      <footer className="mt-48 border-t-2 border-sub/5 pt-16 opacity-30" />
    </div>
  )
}

export default App
