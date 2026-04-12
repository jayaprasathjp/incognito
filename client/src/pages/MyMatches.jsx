import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Loader from '../components/Loader';
import Sidebar from '../components/Sidebar';

const MyMatches = () => {
    const { token, user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
             setLoading(true);
            try {
                const data = await api.get('/matches/my-matches');
                if (Array.isArray(data)) {
                    setMatches(data);
                } else {
                    console.error("API returned error payload:", data);
                    setMatches([]);
                }
            } catch (error) {
                console.error("Error fetching matches", error);
                setMatches([]);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchMatches();
    }, [token]);

    const getStatusTheme = (status) => {
        switch(status) {
            case 'completed': return 'bg-slate-100 text-slate-500';
            case 'scheduled': return 'bg-indigo-100 text-indigo-600 animate-pulse';
            case 'pending_review': return 'bg-orange-100 text-orange-600';
            case 'cancelled': return 'bg-red-100 text-red-600';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative z-20">
                <img src={appIcon} alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="absolute right-4 p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 focus:outline-none"
                    aria-label="Menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 relative z-10">
                {/* Page Title */}
                <div className="text-center mb-10 sm:mb-16">
                    <h2 className="text-xs sm:text-sm font-bold text-indigo-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2">
                        Your History
                    </h2>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter">
                        My Matches
                    </h1>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader /></div>
                    ) : matches.length === 0 ? (
                        <div className="text-center bg-white border border-slate-200 rounded-3xl p-12 shadow-sm">
                            <div className="text-4xl mb-4">🎮</div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No Matches Yet</h3>
                            <p className="text-slate-500 font-medium">When you are paired with an opponent, it will appear here.</p>
                        </div>
                    ) : matches.map((match) => {
                        const isPlayer1 = match.player1_id === user?.id;
                        const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
                        const displayName = opponentName || "TBD";
                        
                        // Parse Scores if completed
                        let myScore = "-";
                        let oppScore = "-";
                        let isWin = false;
                        
                        if (match.status === 'completed') {
                            myScore = isPlayer1 ? match.score_player1 : match.score_player2;
                            oppScore = isPlayer1 ? match.score_player2 : match.score_player1;
                            
                            // Win calculation (could be walkover)
                            if (match.winner_id === user?.id) isWin = true;
                        }

                        return (
                            <div key={match.id} className="relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
                                {/* Optional Win Glow indicator */}
                                {match.status === 'completed' && isWin && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                                )}
                                {match.status === 'completed' && !isWin && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                                )}
                                {match.status === 'scheduled' && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 animate-pulse"></div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{match.tournament_title}</span>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider ${getStatusTheme(match.status)}`}>
                                                {match.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-slate-900 font-black text-2xl tracking-tight pr-4">
                                                vs {displayName}
                                            </h3>
                                        </div>
                                        
                                        <div className="mt-2 text-sm font-medium text-slate-500">
                                            Round {match.round} {match.match_code && match.match_code !== 'TBD' ? ` • ${match.match_code}` : ''}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                                        
                                        {/* Score Display (If Completed) */}
                                        {match.status === 'completed' ? (
                                            <div className="text-center">
                                                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Score</div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-2xl sm:text-3xl font-black ${isWin ? 'text-green-600' : 'text-slate-700'}`}>{myScore}</span>
                                                    <span className="text-slate-300 font-light text-xl">-</span>
                                                    <span className={`text-2xl sm:text-3xl font-black ${!isWin ? 'text-green-600' : 'text-slate-700'}`}>{oppScore}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                                                <div className="text-base sm:text-lg font-bold text-slate-700">
                                                    {match.status === 'scheduled' ? 'Pending' : 'In Review'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MyMatches;
