import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Existing MatchSubmission component from PlayerDashboard
const MatchSubmission = ({ match, user, onSuccess }) => {
    const [step, setStep] = useState('select'); // select, form
    const [isWin, setIsWin] = useState(true);
    const [myScore, setMyScore] = useState('');
    const [oppScore, setOppScore] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Max 5MB allowed.");
            return;
        }
        setProofFile(file);
        setProofPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!myScore || !oppScore) return alert("Please enter the scores.");
        if (isWin && !proofFile) return alert("Please upload a screenshot as proof of your win.");

        if (!confirm(isWin ? "Are you sure you want to report a WIN?" : "Are you sure you want to report a LOSS? This will be verified.")) return;

        setSubmitting(true);
        try {
            let proofUrl = null;

            // Upload proof image first if claiming a win
            if (isWin && proofFile) {
                const formData = new FormData();
                formData.append("proof", proofFile);
                const uploadRes = await api.upload("/matches/upload-proof", formData);
                if (uploadRes.error) throw new Error(uploadRes.error);
                proofUrl = uploadRes.url;
            }

            const body = {
                my_score: parseInt(myScore),
                opp_score: parseInt(oppScore),
                proof_image: proofUrl
            };

            const data = await api.post(`/matches/${match.id}/submit`, body);

            if (!data.error) {
                alert(data.message || "Result submitted successfully.");
                onSuccess();
            } else {
                alert(data.error || "Failed to submit result");
            }
        } catch (e) {
            console.error(e);
            alert(e.message || "Error submitting result");
        } finally {
            setSubmitting(false);
        }
    };

    const clearForm = () => {
        setStep('select');
        setMyScore('');
        setOppScore('');
        setProofFile(null);
        if (proofPreview) URL.revokeObjectURL(proofPreview);
        setProofPreview(null);
    };

    if (step === 'select') {
        return (
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => { setIsWin(true); setStep('form'); }}
                    className="py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                    <span>I WON</span>
                </button>
                <button 
                    onClick={() => { setIsWin(false); setStep('form'); }}
                    className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                    <span>I LOST</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {!isWin && (
                <div className="p-3 bg-slate-100 text-slate-600 text-xs font-medium rounded-xl border border-slate-200">
                    You are reporting a loss. Please enter the final score. No screenshot is required.
                </div>
            )}
            
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

            {isWin && (
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Upload Proof Screenshot</label>
                    
                    {!proofPreview ? (
                        <label className="flex flex-col items-center justify-center w-full h-28 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                            <div className="text-2xl mb-1">📸</div>
                            <p className="text-xs text-slate-500 font-medium">Tap to upload screenshot</p>
                            <p className="text-[10px] text-slate-400">JPG, PNG, WEBP • Max 5MB</p>
                            <input 
                                type="file" 
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>
                    ) : (
                        <div className="relative">
                            <img 
                                src={proofPreview} 
                                alt="Proof preview" 
                                className="w-full h-40 object-cover rounded-xl border border-emerald-200 shadow-sm"
                            />
                            <button 
                                onClick={() => { setProofFile(null); URL.revokeObjectURL(proofPreview); setProofPreview(null); }}
                                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md hover:bg-red-600"
                            >
                                ✕
                            </button>
                            <p className="text-[10px] text-emerald-600 font-medium mt-1 text-left">{proofFile?.name}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-4">
                <button 
                    onClick={clearForm}
                    type="button"
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                    BACK
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`flex-1 py-3 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-md ${isWin ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                >
                    {submitting ? (isWin ? 'UPLOADING...' : '...') : (isWin ? 'SUBMIT WIN' : 'CONFIRM LOSS')}
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
    const [matchState, setMatchState] = useState('loading');
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [submittingCode, setSubmittingCode] = useState(false);
    const [remaining, setRemaining] = useState(null);
    const [matchStartTime, setMatchStartTime] = useState(null);

    const MATCH_DURATION = 60 * 60; // 60 minutes in seconds
    const timedOut = React.useRef(false);

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

    // Auto-enforce timeout when timer expires
    const handleTimeout = useCallback(async () => {
        if (timedOut.current) return;
        timedOut.current = true;
        try {
            const data = await api.post(`/matches/${matchId}/check-timeout`, {});
            if (data.reason === 'double_dq') {
                alert("Time's up! Neither player submitted results. Both are disqualified.");
            } else if (data.reason === 'home_no_code') {
                alert("Time's up! Home player never shared the room code. Away player advances.");
            } else if (data.reason === 'timeout_win') {
                alert(data.message);
            }
            fetchMatchState();
            if (onComplete) onComplete();
        } catch (e) {
            console.error("Timeout check failed:", e);
        }
    }, [matchId, fetchMatchState, onComplete]);

    // Countdown timer — 60 min from when both checked in
    useEffect(() => {
        if (matchState !== 'active' || !match?.checked_in_at) return;
        
        const startTime = new Date(match.checked_in_at).getTime();
        const endTime = startTime + MATCH_DURATION * 1000;
        const tick = () => {
            const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setRemaining(left);
            if (left === 0) handleTimeout();
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [matchState, match?.checked_in_at, handleTimeout]);

    useEffect(() => {
        fetchMatchState();
        const intervalId = setInterval(fetchMatchState, 30000); // refresh every 30s
        return () => clearInterval(intervalId);
    }, [matchId, fetchMatchState]);

    // Auto-transition from ready_waiting to active when match time arrives
    useEffect(() => {
        if (matchState !== 'ready_waiting' || !matchStartTime) return;
        const msUntilStart = matchStartTime - Date.now();
        if (msUntilStart <= 0) {
            setMatchState('active');
            return;
        }
        const timeout = setTimeout(() => setMatchState('active'), msUntilStart);
        return () => clearTimeout(timeout);
    }, [matchState, matchStartTime]);

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
            // Both checked in — but is it match time yet?
            const now = new Date();
            const matchDate = parseMatchDateTime(m.match_date, m.match_time);
            setMatchStartTime(matchDate.getTime());
            if (now < matchDate) {
                setMatchState('ready_waiting'); // both ready, waiting for kick-off
            } else {
                setMatchState('active'); // match time reached, go live
            }
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

    const handleRoomCodeSubmit = async () => {
        if (!roomCodeInput.trim()) return alert("Please enter the room code.");
        setSubmittingCode(true);
        try {
            const data = await api.post(`/matches/${matchId}/room-code`, { game_room_code: roomCodeInput });
            if (data.error) throw new Error(data.error);
            await fetchMatchState();
        } catch (e) {
            alert(e.message || 'Failed to submit room code');
        } finally {
            setSubmittingCode(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading match details...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!match) return null;

    const isPlayer1 = match.player1_id === user?.id;
    const opponentName = isPlayer1 ? match.player2_name || match.opponent_name : match.player1_name || match.opponent_name;
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
                    <div className="text-center relative">
                        {match?.isHome && <div className="absolute -top-3 -right-2 bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">HOME</div>}
                        {!match?.isHome && <div className="absolute -top-3 -right-2 bg-slate-300 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">AWAY</div>}
                        <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-700">
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                        <p className="font-bold text-sm text-slate-900">You</p>
                    </div>
                    <div className="text-slate-300 font-black text-xl">VS</div>
                    <div className="text-center relative">
                        {!match?.isHome && <div className="absolute -top-3 -left-2 bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">HOME</div>}
                        {match?.isHome && <div className="absolute -top-3 -left-2 bg-slate-300 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">AWAY</div>}
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

                {matchState === 'ready_waiting' && (
                    <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm">
                        <div className="text-2xl mb-2">✅</div>
                        <h3 className="font-bold text-emerald-800 mb-1">Both Players Ready!</h3>
                        <p className="text-sm text-emerald-700 mb-3">
                            Match starts at <strong>{match?.match_time?.slice(0, 5)}</strong>
                        </p>
                        <p className="text-xs text-emerald-600 font-medium animate-pulse">Room code sharing will unlock at match time.</p>
                    </div>
                )}

                {matchState === 'active' && (
                    <div className="pt-2">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                            <h3 className="font-black text-emerald-600 tracking-wider">MATCH IS LIVE</h3>
                        </div>

                        {/* Countdown Timer */}
                        <div className={`mb-4 py-3 px-4 rounded-xl text-center shadow-lg ${
                            remaining !== null && remaining <= 60 ? 'bg-red-600' : 
                            remaining !== null && remaining <= 300 ? 'bg-amber-600' : 'bg-slate-900'
                        }`}>
                            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mb-1">Time Remaining</p>
                            {remaining !== null && remaining > 0 ? (
                                <p className="text-3xl font-black text-white tracking-widest font-mono">
                                    {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
                                </p>
                            ) : (
                                <p className="text-xl font-black text-white animate-pulse">TIME'S UP!</p>
                            )}
                        </div>

                        {/* Room Code Section */}
                        <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50/50 shadow-inner">
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Game Room Code</h4>
                            
                            {!match.game_room_code ? (
                                match.isHome ? (
                                    // HOME PLAYER: Create and share room code
                                    <div className="space-y-3">
                                        <p className="text-xs text-blue-700">You are the <strong>HOME</strong> player. Create a game room and share the code here.</p>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 192849"
                                                className="flex-1 p-3 bg-white border border-blue-200 rounded-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={roomCodeInput}
                                                onChange={e => setRoomCodeInput(e.target.value)}
                                            />
                                            <button 
                                                onClick={handleRoomCodeSubmit}
                                                disabled={submittingCode}
                                                className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                                            >
                                                {submittingCode ? '...' : 'SHARE'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // AWAY PLAYER: Wait for code
                                    <div className="py-2">
                                        <p className="text-sm font-medium text-blue-800 animate-pulse">Waiting for host to share room code...</p>
                                    </div>
                                )
                            ) : (
                                // CODE SHARED
                                <div>
                                    <div className="text-3xl font-black text-slate-800 tracking-widest my-2 select-all">
                                        {match.game_room_code}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium">This code is locked to this match. Good luck!</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Match Submission */}
                        {match.game_room_code && !match.hasSubmited && (
                            <>
                                <hr className="border-slate-100 my-4" />
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Report Result</h4>
                                <MatchSubmission 
                                    match={match} 
                                    user={user} 
                                    onSuccess={() => {
                                        fetchMatchState();
                                        if (onComplete) onComplete();
                                    }} 
                                />
                            </>
                        )}

                        {match.game_room_code && match.hasSubmited && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <p className="font-bold text-emerald-800 mb-1">Result Submitted</p>
                                <p className="text-xs text-emerald-600">Waiting for {opponentName} to submit their result.</p>
                            </div>
                        )}
                    </div>
                )}

                {matchState === 'pending_review' && (
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 shadow-sm">
                        <div className="text-2xl mb-2">⚖️</div>
                        <p className="font-bold">Match Disputed</p>
                        <p className="text-xs mt-1 font-medium">Conflicting scores were submitted. An admin will review the proofs.</p>
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
