import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import Navbar from '../components/layout/Navbar';
import { Loader2, Swords, Trophy, Network, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

const Fixtures = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/tournaments/current/fixtures')
            .then(res => {
                setData(res.data);
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to load fixtures");
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.matches.map(match => (
                            <div key={match.id} className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-center transition-all ${
                                match.status === 'completed' ? 'bg-white border-slate-200 shadow-sm' : 
                                match.status === 'cancelled' ? 'bg-slate-100 border-slate-200' :
                                'bg-indigo-50/50 border-indigo-100'
                            }`}>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Match {match.id.substring(0, 8)}</span>
                                    {match.status === 'completed' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Completed</span>}
                                    {match.status === 'cancelled' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Cancelled</span>}
                                    {match.status === 'pending' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold animate-pulse">Live</span>}
                                </div>
                                
                                {match.is_bye ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {match.p1_name.substring(0,2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800 text-lg">{match.p1_name}</span>
                                        </div>
                                        <div className="text-sm font-bold text-indigo-400 bg-indigo-50 px-3 py-1 rounded-full">
                                            BYE
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between w-full relative">
                                        {/* Player 1 */}
                                        <div className={`flex flex-col items-center flex-1 z-10 ${match.status === 'completed' && match.winner_id !== match.player1_id ? 'opacity-50 grayscale' : ''}`}>
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-lg mb-2 shadow-sm ${
                                                match.winner_id === match.player1_id ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' : 'bg-slate-800 text-white'
                                            }`}>
                                                {match.p1_name.substring(0,2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-800 text-sm sm:text-base text-center line-clamp-1">{match.p1_name}</span>
                                            {match.winner_id === match.player1_id && <Trophy size={14} className="text-emerald-500 mt-1" />}
                                        </div>
                                        
                                        {/* VS Badge */}
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[120%] z-0">
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-xs font-black text-slate-400 italic">
                                                VS
                                            </div>
                                        </div>
                                        
                                        {/* Player 2 */}
                                        <div className={`flex flex-col items-center flex-1 z-10 ${match.status === 'completed' && match.winner_id !== match.player2_id ? 'opacity-50 grayscale' : ''}`}>
                                            {match.player2_id ? (
                                                <>
                                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-lg mb-2 shadow-sm ${
                                                        match.winner_id === match.player2_id ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' : 'bg-slate-800 text-white'
                                                    }`}>
                                                        {match.p2_name.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-sm sm:text-base text-center line-clamp-1">{match.p2_name}</span>
                                                    {match.winner_id === match.player2_id && <Trophy size={14} className="text-emerald-500 mt-1" />}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 mb-2">
                                                        <UserX size={20} />
                                                    </div>
                                                    <span className="font-bold text-slate-400 text-sm sm:text-base">TBD</span>
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
