import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';
import Sidebar from '../components/Sidebar';
import MenuButton from '../components/MenuButton';
import { Loader2, Swords, Trophy, Network, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

const Fixtures = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        api.get('/tournaments/current/fixtures')
            .then(res => {
                setData(res);
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to load fixtures");
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative z-20">
                <img
                    src={appIcon}
                    alt="Logo"
                    className="absolute left-4 w-8 h-8 object-contain"
                />
                <span className="font-bold text-lg tracking-wider text-slate-800">
                    INCØGNITØ
                </span>
                <MenuButton onClick={() => setIsMenuOpen(true)} />
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Network className="text-indigo-600" size={28} />
                            Tournament Fixtures
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {data?.round ? `Round ${data.round} Matches` : 'All matches for the current round'}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                    </div>
                ) : !data?.matches || data.matches.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <Swords className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-700">No Fixtures Available</h3>
                        <p className="text-slate-500 mt-2">The tournament hasn't started or there are no matches in the current round.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {data.matches.map(match => (
                            <div key={match.id} className={`rounded-xl border p-3 flex flex-col justify-center transition-all ${
                                match.status === 'completed' ? 'bg-white border-slate-200 shadow-sm' : 
                                match.status === 'cancelled' ? 'bg-slate-100 border-slate-200' :
                                'bg-indigo-50/50 border-indigo-100'
                            }`}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Match {match.match_code || String(match.id).substring(0, 8)}
                                    </span>
                                    {match.status === 'completed' && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Completed</span>}
                                    {match.status === 'cancelled' && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Cancelled</span>}
                                    {match.status === 'pending' && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Live</span>}
                                </div>
                                
                                {match.is_bye ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                                                {match.p1_name.substring(0,2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800 text-xs truncate">{match.p1_name}</span>
                                        </div>
                                        <div className="text-[9px] font-black tracking-widest text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
                                            BYE
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between w-full">
                                        {/* Player 1 */}
                                        <div className={`flex items-center gap-2 flex-1 min-w-0 ${match.status === 'completed' && match.winner_id !== match.player1_id ? 'opacity-50 grayscale' : ''}`}>
                                            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm ${
                                                match.winner_id === match.player1_id ? 'bg-emerald-500 text-white ring-2 ring-emerald-100' : 'bg-slate-800 text-white'
                                            }`}>
                                                {match.p1_name.substring(0,2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800 text-xs truncate">
                                                {match.p1_name}
                                            </span>
                                        </div>
                                        
                                        {/* VS Badge */}
                                        <div className="mx-2 shrink-0">
                                            <span className="text-[9px] font-black text-slate-300 italic px-1">VS</span>
                                        </div>
                                        
                                        {/* Player 2 */}
                                        <div className={`flex items-center justify-end gap-2 flex-1 min-w-0 ${match.status === 'completed' && match.winner_id !== match.player2_id ? 'opacity-50 grayscale' : ''}`}>
                                            {match.player2_id ? (
                                                <>
                                                    <span className="font-bold text-slate-800 text-xs truncate text-right">
                                                        {match.p2_name}
                                                    </span>
                                                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm ${
                                                        match.winner_id === match.player2_id ? 'bg-emerald-500 text-white ring-2 ring-emerald-100' : 'bg-slate-800 text-white'
                                                    }`}>
                                                        {match.p2_name.substring(0,2).toUpperCase()}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-slate-400 text-xs text-right">TBD</span>
                                                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 text-slate-400">
                                                        <UserX size={12} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Fixtures;
