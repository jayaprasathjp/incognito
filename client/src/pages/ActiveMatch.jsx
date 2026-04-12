import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import MatchResultScreen from '../components/MatchResultScreen';

const ActiveMatch = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // Timer state
    const [matchState, setMatchState] = useState('loading'); // waiting_checkin, checking_in, active, completed, cancelled

    const fetchMatchState = useCallback(async () => {
        try {
            const data = await api.get(`/matches/${id}`);
            // The api utility returns the body directly, not wrapped in { data }
            if (data && !data.error) {
                setMatch(data);
                determineState(data);
            } else {
                throw new Error(data?.error || 'Match not found');
            }
        } catch (err) {
            setError(err.message || 'Failed to load match detail');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchMatchState();
        const intervalId = setInterval(fetchMatchState, 30000); // refresh every 30s
        return () => clearInterval(intervalId);
    }, [id, fetchMatchState]);

    const determineState = (m) => {
        if (m.status !== 'scheduled') {
            setMatchState(m.status); // e.g. completed, pending_review, cancelled
            return;
        }

        // Logic based on match_time (HH:mm)
        // Assume tournament date is today for simplistic calculation in this MVP.
        const now = new Date();
        if (!m.match_time) {
            // Handle cases where match time might be missing (e.g. legacy or incomplete data)
            setMatchState('waiting_checkin');
            return;
        }

        const [hours, minutes] = m.match_time.split(':').map(Number);
        
        const matchTimeDate = new Date();
        matchTimeDate.setHours(hours, minutes, 0, 0);

        const checkInOpens = new Date(matchTimeDate.getTime() - 15 * 60000);
        const checkInCloses = new Date(matchTimeDate.getTime() + 30 * 60000);

        if (m.checked_in_at) {
            // Match is active (both ready)
            const checkInTime = new Date(m.checked_in_at);
            const endsAt = new Date(checkInTime.getTime() + 60 * 60000);
            if (now > endsAt) {
                 // Might need walkover/cancellation if scores not submitted
            }
            setMatchState('active');
        } else if (now >= checkInOpens && now <= checkInCloses) {
            setMatchState('checking_in');
        } else if (now < checkInOpens) {
            setMatchState('waiting_checkin');
        } else if (now > checkInCloses) {
            // Past checkin close time and both not ready
            setMatchState('walkover_pending');
        }
    };

    const handleReady = async () => {
        try {
            setProcessing(true);
            const data = await api.post(`/matches/${id}/ready`);
            if (data && data.match) {
                setMatch(data.match);
                determineState(data.match);
            } else {
                throw new Error(data?.error || 'Error checking in');
            }
        } catch (err) {
            alert(err.message || 'Error checking in');
        } finally {
            setProcessing(false);
        }
    };

    const requestWalkover = async () => {
        try {
            setProcessing(true);
            await api.post(`/matches/${id}/check-walkover`);
            fetchMatchState(); // Reload fully
        } catch (err) {
            alert(err.response?.data?.error || 'Error requesting walkover');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="text-center p-8">Loading match details...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!match) return null;

    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isPlayer1 = match.player1_id === currentUser?.id;
    
    // Status Display
    let opponentName = isPlayer1 ? match.player2_name : match.player1_name;
    let amIReady = isPlayer1 ? match.player1_ready : match.player2_ready;
    let isOpponentReady = isPlayer1 ? match.player2_ready : match.player1_ready;

    return (
        <>
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative mb-4">
                    <span className="font-bold text-lg tracking-wider text-slate-800" onClick={() => navigate('/matches')} style={{cursor: 'pointer'}}>
                        &larr; BACK
                    </span>
                </div>
                
                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        
                        <div className="bg-slate-900 px-6 py-8 text-center text-white relative">
                            <h1 className="text-3xl font-bold font-display uppercase tracking-wider mb-2">
                                MATCH {match.match_code}
                            </h1>
                            <p className="text-slate-400 font-medium">{match.tournament_title}</p>
                            
                            <div className="flex justify-center items-center gap-8 mt-8">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold mb-3 border-2 border-slate-700">
                                        {isPlayer1 ? "YOU" : (match.player1_name?.substring(0, 2).toUpperCase() || "??")}
                                    </div>
                                    <span className="font-medium text-slate-300">
                                        {match.player1_name || "TBD"}
                                    </span>
                                </div>
                                <div className="text-4xl font-black text-slate-700">VS</div>
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold mb-3 border-2 border-slate-700">
                                        {!isPlayer1 ? "YOU" : (match.player2_name?.substring(0, 2).toUpperCase() || "??")}
                                    </div>
                                    <span className="font-medium text-slate-300">
                                        {match.player2_name || "TBD"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            
                            {matchState === 'waiting_checkin' && (
                                <div className="text-center py-8">
                                    <div className="text-slate-500 mb-2">Match is Scheduled for</div>
                                    <div className="text-4xl font-bold text-slate-800 mb-6">{match.match_time}</div>
                                    <p className="text-slate-600 bg-blue-50 text-blue-800 py-3 px-6 rounded-lg inline-block font-medium">
                                        Check-in opens 15 minutes before the match time.
                                    </p>
                                </div>
                            )}

                            {matchState === 'checking_in' && (
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6">Check-in Open</h3>
                                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                                        <div className={"p-4 rounded-xl " + (amIReady ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200")}>
                                            <div className="font-medium mb-1">You</div>
                                            <div className={"text-sm font-bold " + (amIReady ? "text-emerald-600" : "text-slate-500")}>
                                                {amIReady ? '✔ READY' : 'WAITING'}
                                            </div>
                                        </div>
                                        <div className={"p-4 rounded-xl " + (isOpponentReady ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200")}>
                                            <div className="font-medium mb-1">{opponentName}</div>
                                            <div className={"text-sm font-bold " + (isOpponentReady ? "text-emerald-600" : "text-slate-500")}>
                                                {isOpponentReady ? '✔ READY' : 'WAITING'}
                                            </div>
                                        </div>
                                    </div>

                                    {!amIReady ? (
                                        <button 
                                            onClick={handleReady}
                                            disabled={processing}
                                            className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 w-full max-w-md"
                                        >
                                            {processing ? 'Processing...' : "I'M READY"}
                                        </button>
                                    ) : (
                                        <p className="text-slate-500 font-medium">Waiting for opponent to check in...</p>
                                    )}
                                </div>
                            )}

                            {matchState === 'walkover_pending' && (
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-red-600 mb-4">Check-in Window Closed</h3>
                                    <p className="mb-6">The check-in window closed 30 minutes past the match time.</p>
                                    <button 
                                        onClick={requestWalkover}
                                        disabled={processing}
                                        className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-lg font-bold hover:bg-red-100"
                                    >
                                        Claim Walkover / Finalize
                                    </button>
                                </div>
                            )}

                            {matchState === 'active' && (
                                <div className="text-center">
                                    <div className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-emerald-500/20 mb-8 animate-pulse">
                                        MATCH IS LIVE!
                                    </div>
                                    <p className="text-slate-600 mb-8 max-w-md mx-auto">
                                        Both players checked in at {new Date(match.checked_in_at).toLocaleTimeString()}. 
                                        You have 1 hour from the check-in time to play the game and submit your results. 
                                        Don't forget to take a picture of the final score screen!
                                    </p>

                                    {/* Submit Results Form placeholder */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left">
                                        <h4 className="font-bold text-slate-800 mb-4">Submit Match Result</h4>
                                        <p className="text-sm text-slate-500 mb-4">You can connect the MatchSubmission component here</p>
                                        <button disabled className="w-full bg-slate-900 text-white rounded-lg py-3 font-bold opacity-50 cursor-not-allowed">
                                            AWAITING MATCH SUBMISSION UI
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(matchState === 'pending_review' || matchState === 'cancelled') && (
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Match Status: {matchState.toUpperCase()}</h3>
                                    <p className="text-slate-500">
                                        {matchState === 'pending_review' && "Scores have been submitted and are awaiting admin review."}
                                        {matchState === 'cancelled' && "This match was cancelled."}
                                    </p>
                                    <div className="mt-8">
                                         <button onClick={() => navigate('/matches')} className="text-blue-600 font-medium hover:underline">
                                             &larr; Back to my matches
                                         </button>
                                    </div>
                                </div>
                            )}

                            {matchState === 'completed' && (
                                <MatchResultScreen 
                                    type={match.winner_id === currentUser?.id ? 'victory' : 'defeat'} 
                                    myScore={isPlayer1 ? match.score_player1 : match.score_player2} 
                                    oppScore={isPlayer1 ? match.score_player2 : match.score_player1} 
                                    opponentName={opponentName || 'Opponent'}
                                    onClose={() => navigate('/matches')} 
                                />
                            )}

                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default ActiveMatch;
