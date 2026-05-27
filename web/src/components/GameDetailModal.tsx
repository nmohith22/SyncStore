import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Hash, Tag, ExternalLink } from 'lucide-react';

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

interface GameDetailModalProps {
  game: Game | null;
  onClose: () => void;
}

export const GameDetailModal = ({ game, onClose }: GameDetailModalProps) => {
  if (!game) return null;

  const genres = game.genre?.split(', ') || ['Action', 'RPG'];
  const displayHours = game.playtime_hours || 0;
  const displayDesc = game.description || "Metadata for this unit is being indexed. Complete data will be available once the background synchronization finishes.";

  return (
    <AnimatePresence>
      {game && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-5xl bg-bg border-t-4 sm:border-2 border-main rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_-20px_100px_rgba(var(--color-main-rgb),0.2)] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-main)' }}
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-50 p-4 bg-black/50 hover:bg-main hover:text-bg rounded-2xl transition-all active:scale-90 backdrop-blur-xl border border-white/10"
            >
              <X size={28} />
            </button>

            {/* Left Side: Massive Art */}
            <div className="w-full md:w-2/5 aspect-[3/4] relative shrink-0">
              <img 
                src={game.image_url} 
                alt={game.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent md:bg-gradient-to-r" style={{ '--tw-gradient-from': 'var(--color-bg)' } as any} />
              
              {/* Floating Platform Badges */}
              <div className="absolute bottom-8 left-8 flex flex-col gap-2">
                {game.platforms.map(platform => (
                  <div key={platform} className="flex items-center gap-3 bg-main text-bg px-6 py-2 rounded-xl font-black italic uppercase tracking-[0.2em] text-xs shadow-2xl self-start">
                    {platform} Node
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Details */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col h-full">
                <div className="mb-10">
                  <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[1] mb-8 text-white">
                    {game.name}
                  </h2>
                  
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                    <div className="p-5 bg-sub/10 rounded-2xl border border-sub/10">
                      <div className="flex items-center gap-2 text-sub mb-1">
                        <Clock size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Time Logged</span>
                      </div>
                      <span className="text-xl font-black italic text-main">{displayHours}H</span>
                    </div>
                    <div className="p-5 bg-sub/10 rounded-2xl border border-sub/10">
                      <div className="flex items-center gap-2 text-sub mb-1">
                        <Calendar size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Release Cycle</span>
                      </div>
                      <span className="text-xl font-black italic text-white">{game.year}</span>
                    </div>
                    <div className="p-5 bg-sub/10 rounded-2xl border border-sub/10">
                      <div className="flex items-center gap-2 text-sub mb-1">
                        <Hash size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Global ID</span>
                      </div>
                      <span className="text-xl font-black italic text-white">#{game.id.slice(-4)}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-sub mb-4 flex items-center gap-2">
                      <Tag size={12} className="text-main" /> Narrative Summary
                    </h3>
                    <p className="text-white/80 leading-relaxed font-medium text-lg">
                      {displayDesc}
                    </p>
                  </div>

                  {/* All Genres */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-sub mb-4">Genre Classification</h3>
                    <div className="flex flex-wrap gap-2">
                      {genres.map((g, i) => (
                        <span key={i} className="px-4 py-2 bg-main/10 border border-main/20 text-main rounded-xl text-[10px] font-black uppercase tracking-widest">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-auto pt-8 border-t border-sub/10 flex flex-wrap gap-4">
                  {game.platforms.map(platform => (
                    <button key={platform} className="px-10 py-5 bg-main text-bg rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-3">
                      <ExternalLink size={18} />
                      View on {platform} Node
                    </button>
                  ))}
                  <button onClick={onClose} className="px-10 py-5 bg-sub/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all hover:bg-sub/20">
                    Return to Index
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
