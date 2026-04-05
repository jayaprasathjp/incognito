import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Existing MatchSubmission component from PlayerDashboard
const MatchSubmission = ({ match, user, onSuccess }) => {
    const [step, setStep] = useState('select'); // select, win, loss
    const [myScore, setMyScore] = useState('');
    const [oppScore, setOppScore] = useState('');
    const [proof, setProof] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (isWin) => {
        if (!confirm(isWin ? "Are you sure you want to report a WIN?" : "Are you sure you want to report a LOSS?")) return;

        setSubmitting(true);
        try {
            const isP1 = match.player1_id === user?.id;
            
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

const ActiveMatchCard = ({ matchId, round, currentRound, nextRound, onComplete }) => {
    const { user } = useAuth();
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [matchState, setMatchState] = useState('loading'); // waiting_checkin, checking_in, active, completed, cancelled

    const fetchMatchState = useCallback(async () => {
        try {
            const data = await api.get(`/matches/${matchId}`);
            if (data.error) throw new Error(data.error);
            setMatch(data);
            determineState(data);
        } catch (err) {
            setError(err.message || 'Failed to load match detail');
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        fetchMatchState();
        const intervalId = setInterval(fetchMatchState, 30000); // refresh every 30s
        return () => clearInterval(intervalId);
    }, [matchId, fetchMatchState]);

    const determineState = (m) => {
        if (m.status !== 'scheduled') {
            setMatchState(m.status); // pending_review, completed, cancelled
            return;
        }

        const parseMatchDateTime = (dateStr, timeStr) => {
            const d = dateStr ? new Date(dateStr) : new Date();
            if (timeStr && typeof timeStr === 'string') {
                const parts = timeStr.split(':');
                if (parts.length >= 2) {
                    d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
                }
            }
            return d;
        };
        
        const now = new Date();
        const matchDate = parseMatchDateTime(m.match_date, m.match_time);
        
        // 15 mins before match
        const checkInOpens = new Date(matchDate.getTime() - 15 * 60000); 
        // 30 mins after match
        const checkInCloses = new Date(matchDate.getTime() + 30 * 60000);

        if (m.checked_in_at) {
            setMatchState('active');
        } else if (now < checkInOpens) {
            setMatchState('waiting_checkin');
        } else if (now >= checkInOpens && now <= checkInCloses) {
            setMatchState('checking_in');
        } else {
            setMatchState('walkover_pending');
        }
    };

    const handleReady = async () => {
        setProcessing(true);
        try {
            const result = await api.post(`/matches/${matchId}/ready`, {});
            if (result.error) throw new Error(result.error);
            await fetchMatchState();
        } catch (e) {
            alert(e.message || 'Failed to check in');
        } finally {
            setProcessing(false);
        }
    };

    const handleClaimWalkover = async () => {
        setProcessing(true);
        try {
            const data = await api.post(`/matches/${matchId}/check-walkover`, {});
            if (data.error && !data.status) throw new Error(data.error);
            
            if (data.status === 'awarded') {
                alert(data.message);
                if (onComplete) onComplete();
            } else {
                alert(data.message || data.error);
            }
            await fetchMatchState();
        } catch (e) {
            alert(e.message || 'Failed to claim walkover');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading match details...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!match) return null;

    const isPlayer1 = match.player1_id === user?.id;
    const opponentName = isPlayer1 ? match.player2?.username || match.opponent_name : match.player1?.username || match.opponent_name;
    const amIReady = isPlayer1 ? match.player1_ready : match.player2_ready;
    const isOpponentReady = isPlayer1 ? match.player2_ready : match.player1_ready;

    return (
        <div className="w-full max-w-sm mb-8 p-6 bg-white rounded-2xl border border-blue-100 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            
            <h3 className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-4">Your Match - {currentRound?.name || `Round ${round}`}</h3>
            
            {match?.match_code === 'BYE' && nextRound ? (
                <div className="flex flex-col items-center justify-center mb-6 px-4 py-2 bg-blue-50/50 rounded-xl border border-blue-50">
                    <p className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-1">Next Match</p>
                    <p className="text-lg font-black text-slate-800">
                        {nextRound.name || `Round ${nextRound.round_number}`}
                    </p>
                    {nextRound.date && (
                        <p className="text-sm text-slate-600 font-medium mt-1">
                            on {new Date(nextRound.date).toLocaleDateString()}
                        </p>
                    )}
                </div>
            ) : (
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
                            {match?.match_code === 'BYE' ? '⭐' : (opponentName?.[0]?.toUpperCase() || '?')}
                        </div>
                        <p className="font-bold text-sm text-slate-900">{match?.match_code === 'BYE' ? 'No Opponent' : (opponentName || 'Waiting')}</p>
                    </div>
                </div>
            )}

            {/* State Management logic */}
            <div className="w-full">
                
                {matchState === 'waiting_checkin' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-2xl mb-2">⏱️</div>
                        <h3 className="font-bold text-slate-800 mb-1">Match Scheduled</h3>
                        <p className="text-sm text-slate-500 mb-2">
                            {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'Date TBD'} 
                            {' @ '} 
                            {match.match_time ? match.match_time.slice(0, 5) : 'Time TBD'}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">Check-in opens 15 mins before match.</p>
                    </div>
                )}

                {matchState === 'checking_in' && (
                    <div className="">
                        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 tracking-wider">Check-in Open</h3>
                        <div className="grid grid-cols-2 gap-3 mx-auto mb-6">
                            <div className={"p-3 rounded-xl " + (amIReady ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200")}>
                                <div className="font-medium text-xs text-slate-500 uppercase tracking-wider mb-1">You</div>
                                <div className={"text-lg font-black " + (amIReady ? "text-emerald-600" : "text-slate-500")}>
                                    {amIReady ? 'READY' : 'WAITING'}
                                </div>
                            </div>
                            <div className={"p-3 rounded-xl " + (isOpponentReady ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200")}>
                                <div className="font-medium text-xs text-slate-500 uppercase tracking-wider mb-1">Opp</div>
                                <div className={"text-lg font-black " + (isOpponentReady ? "text-emerald-600" : "text-slate-500")}>
                                    {isOpponentReady ? 'READY' : 'WAITING'}
                                </div>
                            </div>
                        </div>

                        {!amIReady ? (
                            <button 
                                onClick={handleReady}
                                disabled={processing}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-lg transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
                            >
                                {processing ? 'WAIT...' : "I'M READY!"}
                            </button>
                        ) : (
                            <p className="text-slate-500 text-sm font-medium animate-pulse">Waiting for opponent to check in...</p>
                        )}
                    </div>
                )}

                {matchState === 'walkover_pending' && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="text-2xl mb-2">⏰</div>
                        <h3 className="font-bold text-red-800 mb-1">Check-in Closed</h3>
                        <p className="text-sm text-red-600 mb-4">The grace period has passed.</p>
                        
                        {(amIReady && !isOpponentReady) ? (
                            <button 
                                onClick={handleClaimWalkover}
                                disabled={processing}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95"
                            >
                                CLAIM WALKOVER WIN
                            </button>
                        ) : (!amIReady && isOpponentReady) ? (
                            <p className="font-bold text-slate-700">You missed the check-in window. Opponent may claim victory.</p>
                        ) : (
                            <button 
                                onClick={handleClaimWalkover}
                                disabled={processing}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl"
                            >
                                RESOLVE MATCH (DOUBLE WALKOVER)
                            </button>
                        )}
                    </div>
                )}

                {matchState === 'active' && (
                    <div className="pt-2">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                            <h3 className="font-black text-emerald-600 tracking-wider">MATCH IS LIVE</h3>
                        </div>
                        
                        <MatchSubmission 
                            match={match} 
                            user={user} 
                            onSuccess={() => {
                                fetchMatchState();
                                if (onComplete) onComplete();
                            }} 
                        />
                    </div>
                )}

                {matchState === 'pending_review' && (
                    <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl border border-yellow-100">
                        <p className="font-bold text-sm">Result Submitted</p>
                        <p className="text-xs mt-1">Waiting for admin verification.</p>
                    </div>
                )}

                {matchState === 'completed' && match?.match_code !== 'BYE' && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100">
                        <p className="font-bold">Match Completed</p>
                        <p className="text-sm">Scores have been finalized.</p>
                    </div>
                )}
                
                {matchState === 'completed' && match?.match_code === 'BYE' && (
                    <div className="bg-blue-50 text-blue-700 p-6 rounded-xl border border-blue-100 text-center shadow-inner">
                        <p className="font-bold text-lg mb-1">⭐ Free Pass!</p>
                        <p className="font-bold">You received a BYE for {round ? `Round ${round}` : 'this round'}.</p>
                        <p className="text-sm mt-2 text-blue-600 font-medium">You automatically advance to the next round. Rest up!</p>
                    </div>
                )}

                {matchState === 'cancelled' && (
                    <div className="bg-slate-100 text-slate-600 p-4 rounded-xl border border-slate-200">
                        <p className="font-bold">Match Cancelled</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ActiveMatchCard;
