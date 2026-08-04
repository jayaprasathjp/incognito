import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api, SOCKET_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Existing MatchSubmission component from PlayerDashboard
const MatchSubmission = ({ match, user, onSuccess }) => {
    const [step, setStep] = useState('select'); // select, form
    const [isWin, setIsWin] = useState(true);
    const [myScore, setMyScore] = useState('');
    const [oppScore, setOppScore] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [proofFile2, setProofFile2] = useState(null);
    const [proofPreview2, setProofPreview2] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleFileChange = (e, index) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Max 5MB allowed.");
            return;
        }
        if (index === 1) {
            setProofFile(file);
            setProofPreview(URL.createObjectURL(file));
        } else {
            setProofFile2(file);
            setProofPreview2(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!myScore || !oppScore) return alert("Please enter the scores.");
        if (isWin && !proofFile) return alert("Please upload your first screenshot as proof of your win.");

        if (!confirm(isWin ? "Are you sure you want to report a WIN?" : "Are you sure you want to report a LOSS? This will be verified.")) return;

        setSubmitting(true);
        try {
            let proofUrl = null;
            let proofUrl2 = null;

            // Upload proof images first if claiming a win
            if (isWin && proofFile) {
                const formData = new FormData();
                formData.append("proof", proofFile);
                const uploadRes = await api.upload("/matches/upload-proof", formData);
                if (uploadRes.error) throw new Error(uploadRes.error);
                proofUrl = uploadRes.url;

                if (proofFile2) {
                    const formData2 = new FormData();
                    formData2.append("proof", proofFile2);
                    const uploadRes2 = await api.upload("/matches/upload-proof", formData2);
                    if (uploadRes2.error) throw new Error(uploadRes2.error);
                    proofUrl2 = uploadRes2.url;
                }
            }

            const body = {
                my_score: parseInt(myScore),
                opp_score: parseInt(oppScore),
                proof_image: proofUrl,
                proof_url_2: proofUrl2
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
        setProofPreview(null);
        setProofFile2(null);
        setProofPreview2(null);
        setStep('select');
        setIsWin(true);
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
                        onKeyDown={(e) => {
                            if (["e", "E", "+", "-", "."].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        onChange={e => setMyScore(e.target.value.replace(/\D/g, ''))}
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
                        onKeyDown={(e) => {
                            if (["e", "E", "+", "-", "."].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        onChange={e => setOppScore(e.target.value.replace(/\D/g, ''))}
                    />
                </div>
            </div>

            {isWin && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Upload First Proof Screenshot</label>
                        
                        {!proofPreview ? (
                            <label className="flex flex-col items-center justify-center w-full h-28 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                                <div className="text-2xl mb-1">📸</div>
                                <p className="text-xs text-slate-500 font-medium">Tap to upload first screenshot</p>
                                <p className="text-[10px] text-slate-400">JPG, PNG, WEBP • Max 5MB</p>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 1)}
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
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Match History Screenshot (Optional)</label>
                        
                        {!proofPreview2 ? (
                            <label className="flex flex-col items-center justify-center w-full h-28 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                                <div className="text-2xl mb-1">📸</div>
                                <p className="text-xs text-slate-500 font-medium">Tap to upload match history</p>
                                <p className="text-[10px] text-slate-400">JPG, PNG, WEBP • Max 5MB</p>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 2)}
                                />
                            </label>
                        ) : (
                            <div className="relative">
                                <img 
                                    src={proofPreview2} 
                                    alt="Proof preview 2" 
                                    className="w-full h-40 object-cover rounded-xl border border-emerald-200 shadow-sm"
                                />
                                <button 
                                    onClick={() => { setProofFile2(null); URL.revokeObjectURL(proofPreview2); setProofPreview2(null); }}
                                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md hover:bg-red-600"
                                >
                                    ✕
                                </button>
                                <p className="text-[10px] text-emerald-600 font-medium mt-1 text-left">{proofFile2?.name}</p>
                            </div>
                        )}
                    </div>
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

const DisputePanel = ({ match, matchId, onSuccess }) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [reasonCategory, setReasonCategory] = useState("connection_issues");
    const [reason, setReason] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [submitScreenshots, setSubmitScreenshots] = useState([]);
    const [responseRemark, setResponseRemark] = useState("");
    const [responseScoreFor, setResponseScoreFor] = useState("");
    const [responseScoreAgainst, setResponseScoreAgainst] = useState("");
    const [responseFiles, setResponseFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [oppRemaining, setOppRemaining] = useState(null);

    const pending = match?.opponentDisputePending;
    const expiresAt = match?.disputeRespondExpiresAt ? new Date(match.disputeRespondExpiresAt).getTime() : null;

    useEffect(() => {
        if (!pending || !expiresAt) {
            setOppRemaining(null);
            return;
        }
        const tick = () => {
            const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            setOppRemaining(left);
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [pending, expiresAt]);

    const submitDispute = async () => {
        if (reason.trim().length < 3) return alert("Enter a reason (at least 3 characters).");
        if (submitScreenshots.length === 0) {
            return alert("Uploading at least one game screenshot is mandatory to open a dispute.");
        }
        setBusy(true);
        try {
            let evidence_url = null;
            if (proofFile) {
                const fd = new FormData();
                fd.append("proof", proofFile);
                const up = await api.upload("/matches/upload-proof", fd);
                if (up.error) throw new Error(up.error);
                evidence_url = up.url;
            }
            const shotUrls = [];
            for (const file of submitScreenshots) {
                const fd = new FormData();
                fd.append("proof", file);
                const up = await api.upload("/matches/upload-proof", fd);
                if (up.error) throw new Error(up.error);
                shotUrls.push(up.url);
            }
            const body = {
                reason_category: reasonCategory,
                reason: reason.trim(),
                evidence_url,
                screenshots: shotUrls,
            };
            const data = await api.post(`/matches/${matchId}/disputes`, body);
            if (data.error) throw new Error(data.error);
            alert(data.message || "Dispute submitted.");
            setReason('');
            setProofFile(null);
            setSubmitScreenshots([]);
            setOpen(false);
            onSuccess();
        } catch (e) {
            alert(e.message || "Failed to submit dispute");
        } finally {
            setBusy(false);
        }
    };

    const respond = async (action) => {
        if (!pending) return;
        if (!confirm(action === 'accept'
            ? "Accept the dispute? Admin will review both sides and decide the outcome."
            : "Reject? Both players will be disqualified from this match.")) return;
        setBusy(true);
        try {
            if (responseScoreFor === "" || responseScoreAgainst === "") {
                throw new Error("Enter your score.");
            }
            if (responseFiles.length === 0) {
                throw new Error("Upload at least one screenshot.");
            }
            if (action === "reject" && responseRemark.trim().length < 3) {
                throw new Error("Remark is required for reject.");
            }
            const shotUrls = [];
            for (const file of responseFiles) {
                const fd = new FormData();
                fd.append("proof", file);
                const up = await api.upload("/matches/upload-proof", fd);
                if (up.error) throw new Error(up.error);
                shotUrls.push(up.url);
            }
            const data = await api.post(`/matches/${matchId}/disputes/${pending.id}/respond`, {
                action,
                remark: responseRemark.trim(),
                score_for: parseInt(responseScoreFor, 10),
                score_against: parseInt(responseScoreAgainst, 10),
                screenshots: shotUrls,
            });
            if (data.error) throw new Error(data.error);
            alert(data.message);
            setResponseRemark("");
            setResponseScoreFor("");
            setResponseScoreAgainst("");
            setResponseFiles([]);
            onSuccess();
        } catch (e) {
            alert(e.message || "Failed");
        } finally {
            setBusy(false);
        }
    };

    const list = Array.isArray(match?.disputes) ? match.disputes : [];

    return (
        <div className="mb-4 text-left">
            {pending && (
                <div className="mb-3 p-4 rounded-xl border border-amber-300 bg-amber-50">
                    <p className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">Opponent dispute</p>
                    <p className="text-sm text-amber-900 font-medium mb-1">{pending.reason}</p>
                    <p className="text-xs text-amber-700 mb-1">Category: {pending.reason_category || "others"}</p>
                    <p className="text-[10px] text-amber-700 mb-3 break-all">
                        Submitted by {pending.submitted_by_name || "opponent"} — respond within 1 hour.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <input
                            type="number"
                            min="0"
                            placeholder="Your score"
                            className="w-full p-2 rounded-lg border border-amber-200 text-sm"
                            value={responseScoreFor}
                            onKeyDown={(e) => {
                                if (["e", "E", "+", "-", "."].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) => setResponseScoreFor(e.target.value.replace(/\D/g, ''))}
                        />
                        <input
                            type="number"
                            min="0"
                            placeholder="Opp score"
                            className="w-full p-2 rounded-lg border border-amber-200 text-sm"
                            value={responseScoreAgainst}
                            onKeyDown={(e) => {
                                if (["e", "E", "+", "-", "."].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) => setResponseScoreAgainst(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>
                    <textarea
                        className="w-full p-2 rounded-lg border border-amber-200 text-sm mb-2"
                        rows={2}
                        placeholder="Remark (required for reject)"
                        value={responseRemark}
                        onChange={(e) => setResponseRemark(e.target.value)}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setResponseFiles(Array.from(e.target.files || []))}
                        className="text-xs w-full mb-3"
                    />
                    {oppRemaining !== null && (
                        <p className="text-lg font-mono font-black text-amber-900 mb-3">
                            {String(Math.floor(oppRemaining / 60)).padStart(2, "0")}:{String(oppRemaining % 60).padStart(2, "0")}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => respond("accept")}
                            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm"
                        >
                            Accept dispute
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => respond("reject")}
                            className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm"
                        >
                            Reject (both DQ)
                        </button>
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full py-2.5 px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-between"
            >
                Disputes
                <span className="text-slate-400">{open ? "▴" : "▾"}</span>
            </button>

            {open && (
                <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3 text-sm">
                    {list.length === 0 ? (
                        <p className="text-xs text-slate-500">No disputes yet.</p>
                    ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {list.map((d) => (
                                <li key={d.id} className="text-xs border border-slate-100 rounded-lg p-2 bg-white">
                                    <span className="font-bold text-slate-700 break-all">{d.submitted_by_name}</span>
                                    <span className="text-slate-400"> · {d.status}</span>
                                    {d.dispute_kind === "score_conflict" && (
                                        <span className="ml-1 text-amber-600 font-bold">admin review</span>
                                    )}
                                    <p className="text-slate-600 mt-1">{d.reason}</p>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!match?.disputeBlocksSubmission && match?.game_room_code && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Open a dispute</p>
                            <select
                                className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                value={reasonCategory}
                                onChange={(e) => setReasonCategory(e.target.value)}
                            >
                                <option value="connection_issues">Connection issues</option>
                                <option value="rule_violation">Rule violation</option>
                                <option value="others">Others</option>
                            </select>
                            <textarea
                                className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                rows={3}
                                placeholder="Describe the issue (disconnect, rules, etc.)"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                            <label className="block text-[10px] text-slate-500 font-bold">Proof image (optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                className="text-xs w-full"
                            />
                            <label className="block text-[10px] text-slate-500 font-bold">Game screenshots</label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => setSubmitScreenshots(Array.from(e.target.files || []))}
                                className="text-xs w-full"
                            />
                            <button
                                type="button"
                                disabled={busy}
                                onClick={submitDispute}
                                className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm"
                            >
                                {busy ? "..." : "Submit dispute"}
                            </button>
                        </div>
                    )}
                    {match?.disputeBlocksSubmission && (
                        <p className="text-xs text-amber-700 font-medium">
                            Result submission is hidden while a dispute or admin review is active.
                        </p>
                    )}
                </div>
            )}
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
    const [isEditingRoomCode, setIsEditingRoomCode] = useState(false);
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
            } else if (data.reason === 'dispute_pending_hold') {
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
        
        const socket = io(SOCKET_URL);
        socket.on('connect', () => {
            socket.emit('join_match', matchId);
        });
        
        socket.on('match_updated', () => {
            fetchMatchState();
        });

        return () => {
            socket.disconnect();
        };
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
            let datePart;
            if (dateStr) {
                const d = new Date(dateStr);
                datePart = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            } else {
                datePart = new Date().toISOString().split('T')[0];
            }
            
            const timePart = timeStr && timeStr.length === 5 ? timeStr + ':00' : (timeStr || '00:00:00');
            // Force WAT (UTC+1)
            const d = new Date(`${datePart}T${timePart}+01:00`);
            return isNaN(d.getTime()) ? new Date() : d;
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
            setIsEditingRoomCode(false);
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
    const myName = isPlayer1 ? match.player1_name : match.player2_name;
    const myInitial = (myName || user?.email || 'Y')[0].toUpperCase();
    const amIReady = isPlayer1 ? match.player1_ready : match.player2_ready;
    const isOpponentReady = isPlayer1 ? match.player2_ready : match.player1_ready;
    const opponentPic = isPlayer1 ? match.player2_team_picture : match.player1_team_picture;
    const myPic = isPlayer1 ? match.player1_team_picture : match.player2_team_picture;
    const canEditRoomCode = match.isHome && (matchState === 'waiting_checkin' || matchState === 'checking_in' || matchState === 'ready_waiting' || (matchState === 'active' && remaining !== null && remaining >= 50 * 60));

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
                <div className="flex justify-between items-center my-6 gap-2">
                    <div className="flex-1 min-w-0 text-center relative">
                        {match?.isHome && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm whitespace-nowrap">HOME</div>}
                        {!match?.isHome && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm whitespace-nowrap">AWAY</div>}
                        {myPic ? (
                            <img src={myPic} alt="My Team" className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 object-cover border border-slate-200" />
                        ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-700">
                                {myInitial}
                            </div>
                        )}
                        <p className="font-bold text-sm text-slate-900 truncate px-1">You</p>
                    </div>
                    <div className="text-slate-300 font-black text-xl shrink-0">VS</div>
                    <div className="flex-1 min-w-0 text-center relative">
                        {!match?.isHome && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm whitespace-nowrap">HOME</div>}
                        {match?.isHome && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm whitespace-nowrap">AWAY</div>}
                        
                        {match?.match_code === 'BYE' ? (
                            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-700">⭐</div>
                        ) : opponentPic ? (
                            <img src={opponentPic} alt={opponentName} className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 object-cover border border-slate-200" />
                        ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-slate-700">
                                {opponentName?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        <p className="font-bold text-sm text-slate-900 truncate px-1" title={opponentName}>{match?.match_code === 'BYE' ? 'No Opponent' : (opponentName || 'Waiting')}</p>
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
                            
                            {!match.game_room_code || isEditingRoomCode ? (
                                match.isHome ? (
                                    // HOME PLAYER: Create and share room code
                                    <div className="space-y-3">
                                        {isEditingRoomCode ? (
                                            <p className="text-xs text-blue-700">You are updating the room code. The opponent will be notified.</p>
                                        ) : (
                                            <p className="text-xs text-blue-700">You are the <strong>HOME</strong> player. Create a game room and share the code here.</p>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 192849"
                                                className="w-full p-3 bg-white border border-blue-200 rounded-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={roomCodeInput}
                                                onChange={e => setRoomCodeInput(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                {isEditingRoomCode && (
                                                    <button 
                                                        onClick={() => setIsEditingRoomCode(false)}
                                                        className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors shadow-sm text-sm"
                                                    >
                                                        CANCEL
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={handleRoomCodeSubmit}
                                                    disabled={submittingCode}
                                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
                                                >
                                                    {submittingCode ? '...' : (isEditingRoomCode ? 'UPDATE' : 'SHARE')}
                                                </button>
                                            </div>
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
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="text-3xl font-black text-slate-800 tracking-widest my-2 select-all">
                                            {match.game_room_code}
                                        </div>
                                        {canEditRoomCode && !match.hasSubmited && !match.disputes?.length && (
                                            <button 
                                                onClick={() => {
                                                    setRoomCodeInput(match.game_room_code);
                                                    setIsEditingRoomCode(true);
                                                }}
                                                className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg transition-colors border border-blue-200"
                                            >
                                                EDIT
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium mt-1">This code is locked to this match. Good luck!</p>
                                </div>
                            )}
                        </div>

                        {match.game_room_code && (
                            <DisputePanel
                                match={match}
                                matchId={matchId}
                                onSuccess={() => {
                                    fetchMatchState();
                                    if (onComplete) onComplete();
                                }}
                            />
                        )}
                        
                        {/* Match Submission */}
                        {match.game_room_code && !match.hasSubmited && !match.disputeBlocksSubmission && (
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
                                <p className="text-xs text-emerald-600 break-all">Waiting for {opponentName} to submit their result.</p>
                            </div>
                        )}
                    </div>
                )}

                {matchState === 'pending_review' && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 shadow-sm">
                            <div className="text-2xl mb-2">⚖️</div>
                            <p className="font-bold">Match Under Admin Review</p>
                            <p className="text-xs mt-1 font-medium">
                                A dispute has been raised. An admin will review both sides and decide the outcome.
                            </p>
                        </div>
                        {match?.game_room_code && (
                            <DisputePanel
                                match={match}
                                matchId={matchId}
                                onSuccess={() => {
                                    fetchMatchState();
                                    if (onComplete) onComplete();
                                }}
                            />
                        )}
                    </div>
                )}

                {matchState === 'completed' && match?.match_code !== 'BYE' && (() => {
                    const isP1 = match.player1_id === user?.id;
                    const myScore = isP1 ? match.score_player1 : match.score_player2;
                    const oppScore = isP1 ? match.score_player2 : match.score_player1;
                    const iWon = match.winner_id === user?.id;
                    const winnerName = match.winner_id === match.player1_id
                        ? (match.player1_name || match.p1_name || 'Player 1')
                        : (match.player2_name || match.p2_name || 'Player 2');
                    const outcomeLabel = match.match_code === 'ADMIN_RESOLVED'     ? 'Admin resolved'
                                       : match.match_code === 'DISPUTE_SUBMITTER_WIN' ? 'Dispute — submitter win'
                                       : match.match_code === 'WALKOVER'            ? 'Walkover'
                                       : 'Final';
                    return (
                        <div className={`p-5 rounded-xl border ${iWon ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                            <p className={`text-2xl font-black mb-1 ${iWon ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {iWon ? '🏆 You Won!' : '😔 You Lost'}
                            </p>
                            <div className="flex items-center justify-center gap-3 my-3">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-slate-900 font-mono">{myScore ?? '—'}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">You</p>
                                </div>
                                <span className="text-slate-300 font-black text-xl">—</span>
                                <div className="text-center">
                                    <p className="text-3xl font-black text-slate-900 font-mono">{oppScore ?? '—'}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Opp</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium break-all">
                                Winner: <span className="font-bold text-slate-800">{winnerName}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{outcomeLabel}</p>
                        </div>
                    );
                })()}
                
                {matchState === 'completed' && match?.match_code === 'BYE' && (
                    <div className="bg-blue-50 text-blue-700 p-6 rounded-xl border border-blue-100 text-center shadow-inner">
                        <p className="font-bold text-lg mb-1">⭐ Free Pass!</p>
                        <p className="font-bold">You received a BYE for {round ? `Round ${round}` : 'this round'}.</p>
                        <p className="text-sm mt-2 text-blue-600 font-medium">You automatically advance to the next round. Rest up!</p>
                    </div>
                )}

                {matchState === 'cancelled' && (
                    <div className="bg-red-50 text-red-700 p-5 rounded-xl border border-red-100 shadow-sm">
                        <p className="font-bold text-base mb-1">Match Cancelled</p>
                        {match?.match_code === 'DOUBLE_DQ' ? (
                            <p className="text-xs text-red-600 font-medium">
                                Both players failed to check in (I'm Ready) on time and have been disqualified from the tournament.
                            </p>
                        ) : match?.match_code === 'DISPUTE_DOUBLE_DQ' ? (
                            <p className="text-xs text-red-600 font-medium">
                                Both players were disqualified from the tournament due to a dispute decision.
                            </p>
                        ) : (
                            <p className="text-xs text-red-600 font-medium">
                                This match was cancelled.
                            </p>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default ActiveMatchCard;
