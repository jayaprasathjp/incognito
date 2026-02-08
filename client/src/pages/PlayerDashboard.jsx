import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import appIcon from '../assets/app-icon.png';
import Sidebar from '../components/Sidebar';
import { api } from '../utils/api';

const MatchSubmission = ({ match, user, token, onSuccess }) => {
    const [step, setStep] = useState('select'); // select, win, loss
    const [myScore, setMyScore] = useState('');
    const [oppScore, setOppScore] = useState('');
    const [proof, setProof] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (isWin) => {
        if (!confirm(isWin ? "Are you sure you want to report a WIN?" : "Are you sure you want to report a LOSS?")) return;

        setSubmitting(true);
        try {
            const isP1 = match.player1_id === user.id;
            
            // If Loss: My Score 0, Opp Score 1, Proof 'Conceded'
            // If Win: Use form values
            const score1 = isWin ? (isP1 ? myScore : oppScore) : (isP1 ? 0 : 1);
            const score2 = isWin ? (isP1 ? oppScore : myScore) : (isP1 ? 1 : 0);
            const proofVal = isWin ? proof : 'Conceded';

            const body = {
                score_player1: score1,
                score_player2: score2,
                proof_image: proofVal
            };

            const data = await api.post(`/matches/${match.id}/submit`, body);

            if (!data.error) {
                alert(isWin ? "Victory reported! Waiting for admin." : "Loss reported. Better luck next time!");
                onSuccess();
            } else {
                alert(data.error || "Failed to submit result");
            }
        } catch (e) {
            console.error(e);
            alert("Error submitting result");
        } finally {
            setSubmitting(false);
        }
    };

    if (step === 'select') {
        return (
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setStep('win')}
                    className="py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                    <span>I WON</span>
                </button>
                <button 
                    onClick={() => setStep('loss')}
                    className="py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                    <span>I LOST</span>
                </button>
            </div>
        );
    }

    if (step === 'loss') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-100 text-sm">
                    <p className="font-bold mb-1">Confirm Defeat?</p>
                    <p>This will maintain your honor and help the tournament proceed.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setStep('select')}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-md"
                    >
                        {submitting ? '...' : 'CONFIRM LOSS'}
                    </button>
                </div>
            </div>
        );
    }

    // Step 'win'
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Score</label>
                    <input 
                        type="number" 
                        required
                        min="0"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={myScore}
                        onChange={e => setMyScore(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opp. Score</label>
                    <input 
                        type="number" 
                        required
                        min="0"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={oppScore}
                        onChange={e => setOppScore(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Proof Image URL</label>
                <input 
                    type="url" 
                    required
                    placeholder="https://imgur.com/..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={proof}
                    onChange={e => setProof(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 text-left mt-1">Upload screenshot to Imgur/Drive and paste link</p>
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={() => setStep('select')}
                    type="button"
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                    BACK
                </button>
                <button 
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-md"
                >
                    {submitting ? '...' : 'SUBMIT WIN'}
                </button>
            </div>
        </div>
    );
};

const PlayerDashboard = () => {
    const { user, token } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [tournamentData, setTournamentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                const data = await api.get('/tournaments/current');
                setTournamentData(data);
            } catch (error) {
                console.error("Failed to fetch tournament", error);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchTournament();
    }, [token]);

    const handleJoin = async () => {
        if (!tournamentData?.tournament?.id) return;
        try {
            const data = await api.post(`/tournaments/${tournamentData.tournament.id}/join`);
            if (!data.error) {
                // Refresh
                window.location.reload(); 
            } else {
                alert(data.error || "Failed to join");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans relative">
            
            {/* Header / Menu Icon */}
            <div className="flex justify-end p-6">
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 -mr-2 focus:outline-none"
                    aria-label="Menu"
                >
                    <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Content Centered - Welcome Screen */}
            <div className="flex flex-col items-center justify-center mt-4 px-6">
                 {/* Avatar / Logo */}
                 <div className="w-20 h-20 flex items-center justify-center mb-6">
                    <img src={appIcon} alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
                </div>

                {/* Welcome Text & Alias */}
                <div className="text-center mb-8">
                    <h1 className="text-sm font-light text-slate-500 uppercase tracking-[0.2em] mb-1">
                        Welcome
                    </h1>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                        {user?.username || 'PLAYER'}
                    </h2>
                </div>

                {/* Initial Loader */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 text-black-600 animate-spin mb-4" />
                        <p className="text-slate-400 font-medium animate-pulse">Loading tournament details...</p>
                    </div>
                )}

                {/* Current Match Card */}
                {!loading && tournamentData?.currentMatch && tournamentData?.tournament?.status === 'active' && (
                    <div className="w-full max-w-sm mb-8 p-6 bg-white rounded-2xl border border-blue-100 shadow-xl text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        
                        <h3 className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-4">Your Match - Round {tournamentData.currentMatch.round}</h3>
                        
                        <div className="flex justify-between items-center mb-6 px-4">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-700">
                                    {user?.username?.[0]?.toUpperCase()}
                                </div>
                                <p className="font-bold text-sm text-slate-900">You</p>
                            </div>
                            <div className="text-slate-300 font-black text-xl">VS</div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-700">
                                    {tournamentData.currentMatch.opponent_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <p className="font-bold text-sm text-slate-900">{tournamentData.currentMatch.opponent_name || 'Waiting'}</p>
                            </div>
                        </div>

                        {tournamentData.currentMatch.status === 'pending_review' ? (
                            <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl border border-yellow-100 mb-2">
                                <p className="font-bold text-sm">Result Submitted</p>
                                <p className="text-xs mt-1">Waiting for admin verification.</p>
                            </div>
                        ) : (
                            <MatchSubmission 
                                match={tournamentData.currentMatch} 
                                user={user} 
                                token={token} 
                                onSuccess={() => window.location.reload()} 
                            />
                        )}
                    </div>
                )}

                {/* Winner Card */}
                {!loading && tournamentData?.tournament?.status === 'completed' && (
                    <div className="w-full max-w-sm mb-8 p-8 bg-white rounded-2xl border border-yellow-200 shadow-xl text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-50"></div>
                        
                        <div className="relative z-10">
                            <div className="text-4xl mb-2">🏆</div>
                            <h3 className="text-xs text-yellow-600 font-bold uppercase tracking-wider mb-2">Tournament Winner</h3>
                            
                            <div className="w-20 h-20 bg-yellow-50 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-yellow-600 border-4 border-white shadow-lg">
                                {tournamentData.tournament.winner_username?.[0]?.toUpperCase() || '?'}
                            </div>
                            
                            <p className="text-2xl font-black text-slate-900 mb-1">
                                {tournamentData.tournament.winner_username || 'To be announced'}
                            </p>
                            <p className="text-sm text-slate-500 font-medium">Champion of {tournamentData.tournament.title}</p>
                            
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-2">Total Prize Pool</p>
                                <p className="text-3xl font-black text-slate-900">₹{tournamentData.tournament.prizePool}</p>
                            </div>

                            <button onClick={() => window.location.reload()} className="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700">
                                Wait for next tournament
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Tournament Status Card */}
                {/* Show if: (Not Completed) AND ( (No Match) OR (Match exists but Tourney NOT Active) ) */}
                {!loading && tournamentData?.tournament && tournamentData?.tournament?.status !== 'completed' && 
                    (!tournamentData?.currentMatch || tournamentData?.tournament?.status !== 'active') && (
                    <div className={`w-full max-w-sm mb-8 p-6 text-center rounded-2xl border shadow-xl relative overflow-hidden transition-all duration-300 transform hover:scale-[1.02] ${
                        tournamentData?.tournament?.status === 'active' ? 'bg-white border-green-200 shadow-green-100' :
                        tournamentData?.tournament?.status === 'paused' ? 'bg-amber-50 border-amber-200' :
                        'bg-white border-slate-200'
                    }`}>
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                            tournamentData?.tournament?.status === 'active' ? 'from-green-400 via-emerald-500 to-teal-500' :
                            tournamentData?.tournament?.status === 'paused' ? 'from-amber-400 via-orange-500 to-red-500' :
                            'from-blue-500 via-purple-500 to-pink-500' 
                        }`}></div>
                        
                        <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Current Tournament</h3>
                        <p className="text-2xl font-black text-slate-900 mb-1">{tournamentData.tournament.title}</p>
                        
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <p className={`text-sm font-bold uppercase tracking-wider ${
                                tournamentData.tournament.status === 'open' ? 'text-green-600' :
                                tournamentData.tournament.status === 'active' ? 'text-blue-600' :
                                tournamentData.tournament.status === 'paused' ? 'text-yellow-600' :
                                'text-slate-500'
                            }`}>
                            {tournamentData.tournament.status === 'open' ? 'Registration Open' : 
                             tournamentData.tournament.status === 'active' ? 'Live Now' :
                             tournamentData.tournament.status === 'paused' ? 'Paused' :
                             'Completed'}
                            </p>
                        </div>

                        <div className="mb-6">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 inline-block px-10">
                                <p className="text-xs text-slate-500 font-bold uppercase">Prize Pool</p>
                                <p className="text-lg font-black text-slate-900">₹{tournamentData.tournament.prizePool}</p>
                            </div>
                        </div>
                        
                        {/* Logic for Buttons/Status */}
                        {tournamentData.participation ? (
                            <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl font-bold border border-green-100 flex flex-col items-center">
                                <span>✅ REGISTERED</span>
                                <span className="text-xs font-normal opacity-75">
                                {tournamentData.tournament.status === 'open' ? (
                                    <div className="flex flex-col items-center gap-2 py-2">
                                        <span className="text-xs font-medium text-green-700">Waiting for tournament to start...</span>
                                    </div>
                                ) : (
                                    'Good luck!'
                                )}
                                </span>
                            </div>
                        ) : (
                            <>
                                {tournamentData.tournament.status === 'open' ? (
                                    <button 
                                        onClick={handleJoin}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
                                    >
                                        JOIN TOURNAMENT
                                    </button>
                                ) : (
                                    <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-bold border border-slate-200">
                                        Registration Closed
                                        <div className="text-xs font-normal">Wait for next tournament</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
                
                {/* No Tournament State */}
                {!loading && !tournamentData?.tournament && (
                     <div className="w-full max-w-xs mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm text-center">
                        <p className="text-slate-500">No active tournament at the moment.</p>
                     </div>
                )}

                {/* Action Buttons */}
                <div className="w-full max-w-xs space-y-4">
                    <Link to="/leaderboard" className="block w-full">
                        <button className="w-full py-4 bg-slate-900 text-white rounded-full text-lg font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                            VIEW LEADERBOARD
                        </button>
                    </Link>
                </div>
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </div>
    );
};

export default PlayerDashboard;
