import React from 'react';
import { Trophy, Frown, ArrowLeft, ArrowRight } from 'lucide-react';

const MatchResultScreen = ({ type, myScore, oppScore, opponentName, onClose }) => {
    const isVictory = type === 'victory';

    // Premium styling variants
    const theme = {
        bg: isVictory 
            ? 'bg-gradient-to-br from-emerald-900 via-slate-900 to-green-950' 
            : 'bg-gradient-to-br from-red-950 via-slate-900 to-rose-950',
        card: isVictory
            ? 'bg-gradient-to-b from-white/10 to-white/5 border-emerald-500/30'
            : 'bg-gradient-to-b from-white/5 to-transparent border-rose-500/20',
        glow: isVictory
            ? 'from-emerald-400/20 via-green-500/10 to-transparent'
            : 'from-red-500/10 via-rose-500/5 to-transparent',
        textAccent: isVictory ? 'text-emerald-400' : 'text-rose-400',
        button: isVictory
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25 text-white'
            : 'bg-slate-800 hover:bg-slate-700 shadow-rose-900/20 text-slate-300 hover:text-white',
        icon: isVictory ? Trophy : Frown,
        title: isVictory ? 'VICTORY' : 'DEFEAT',
        subtitle: isVictory ? 'Outstanding performance!' : 'Better luck next time.',
    };

    const IconWrapper = theme.icon;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden ${theme.bg}`}>
            
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial opacity-50 pointer-events-none mix-blend-screen" style={{ backgroundImage: `radial-gradient(circle, var(--tw-gradient-from) 0%, transparent 70%)` }} >
                <div className={`absolute inset-0 bg-gradient-to-b ${theme.glow}`}></div>
            </div>
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30 pointer-events-none"></div>

            <div className="relative w-full max-w-lg z-10 animate-in zoom-in-95 duration-500 fade-in">
                
                <div className={`backdrop-blur-xl rounded-3xl border ${theme.card} shadow-2xl p-8 sm:p-12 text-center relative overflow-hidden`}>
                    
                    {/* Top Accent Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isVictory ? 'from-emerald-400 via-green-300 to-teal-400' : 'from-rose-500 via-red-500 to-orange-500'}`}></div>

                    {/* Icon / Avatar */}
                    <div className="relative inline-block mb-8">
                        {isVictory && (
                            <div className="absolute inset-0 bg-emerald-400 blur-2xl rounded-full opacity-40 animate-pulse"></div>
                        )}
                        <div className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto flex items-center justify-center ${isVictory ? 'bg-gradient-to-br from-yellow-300 via-emerald-400 to-green-600 shadow-[0_0_40px_rgba(52,211,153,0.4)]' : 'bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-slate-700 shadow-xl'}`}>
                           <IconWrapper size={isVictory ? 56 : 48} className={isVictory ? "text-white drop-shadow-md" : "text-slate-400"} />
                        </div>
                    </div>

                    {/* Main Title */}
                    <h1 className={`text-5xl sm:text-6xl font-black uppercase tracking-widest mb-2 drop-shadow-lg ${isVictory ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-200' : 'text-slate-200'}`}>
                        {theme.title}
                    </h1>
                    <p className={`text-sm sm:text-base font-medium tracking-wide mb-10 ${theme.textAccent}`}>
                        {theme.subtitle}
                    </p>

                    {/* Score Board */}
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 mb-10 relative">
                        <div className="flex items-center justify-between">
                            {/* You */}
                            <div className="flex-1 text-center">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">You</p>
                                <p className={`text-5xl font-black ${isVictory ? 'text-white' : 'text-slate-400'}`}>{myScore}</p>
                            </div>
                            
                            {/* Divider */}
                            <div className="px-6 flex flex-col items-center justify-center">
                                <span className="text-xl font-light text-slate-600 mb-1">-</span>
                            </div>
                            
                            {/* Opponent */}
                            <div className="flex-1 text-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block truncate max-w-[100px] mx-auto" title={opponentName}>{opponentName}</span>
                                <p className={`text-5xl font-black ${!isVictory ? 'text-white' : 'text-slate-400'}`}>{oppScore}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button 
                            onClick={onClose}
                            className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-lg flex items-center justify-center gap-2 ${theme.button}`}
                        >
                            <ArrowLeft size={18} />
                            BACK TO MATCHES
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MatchResultScreen;
