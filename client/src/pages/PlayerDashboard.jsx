import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import appIcon from '../assets/app-icon.png';
import Sidebar from '../components/Sidebar';
import { api } from '../utils/api';

const FLW_PUBLIC_KEY = import.meta.env.VITE_FLW_PUBLIC_KEY || '';

// Helper: compare registration dates by date-only (ignores time/timezone)
const toDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const todayDateOnly = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

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
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [joinStep, setJoinStep] = useState(null); // null, 'session', 'payment'
    const [sessionPreference, setSessionPreference] = useState(null);
    const [joinLoading, setJoinLoading] = useState(false);

    useEffect(() => {
        const regEnd = tournamentData?.tournament?.registration_end;
        if (!regEnd) return;
        const updateTimer = () => {
            const diff = new Date(regEnd) - new Date();
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / (1000 * 60)) % 60),
                seconds: Math.floor((diff / 1000) % 60)
            });
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [tournamentData?.tournament?.registration_end]);

    const fetchTournament = async () => {
        try {
            setLoading(true);
            const data = await api.get('/tournaments/current');
            setTournamentData(data);
        } catch (error) {
            console.error("Failed to fetch tournament", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchTournament();
    }, [token]);

    // Load Flutterwave inline script
    useEffect(() => {
        if (!document.getElementById('flutterwave-script')) {
            const script = document.createElement('script');
            script.id = 'flutterwave-script';
            script.src = 'https://checkout.flutterwave.com/v3.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const handleJoin = async () => {
        if (!tournamentData?.tournament?.id || !sessionPreference) return;
        setJoinLoading(true);
        try {
            // 1. Initialize payment on backend
            const initData = await api.post('/payment/initialize', {
                tournament_id: tournamentData.tournament.id,
                session_preference: sessionPreference
            });

            if (initData.error) {
                alert(initData.error);
                setJoinLoading(false);
                return;
            }

            // 2. Dev bypass mode — server handled everything
            if (initData.status === 'bypass') {
                alert(initData.message || 'Joined successfully (dev bypass)!');
                setJoinStep(null);
                setSessionPreference(null);
                await fetchTournament();
                setJoinLoading(false);
                return;
            }

            // 3. Open Flutterwave inline checkout (direct script method)
            if (!window.FlutterwaveCheckout) {
                alert('Payment system loading. Please try again in a moment.');
                setJoinLoading(false);
                return;
            }

            window.FlutterwaveCheckout({
                public_key: FLW_PUBLIC_KEY,
                tx_ref: initData.config.tx_ref,
                amount: initData.config.amount,
                currency: initData.config.currency || 'NGN',
                payment_options: 'card,banktransfer,ussd',
                customer: initData.config.customer,
                customizations: {
                    title: 'INCØGNITØ Tournament',
                    description: `Entry fee for ${tournamentData.tournament.title}`,
                    logo: '',
                },
                meta: initData.config.meta,
                callback: async (response) => {
                    // Close the Flutterwave modal
                    document.getElementsByName('checkout')[0]?.setAttribute('style', 'position:fixed;top:0;left:0;z-index:-1;border:none;opacity:0;pointer-events:none;width:100%;height:100%;');
                    document.body.style.overflow = '';
                    
                    if (response.status === 'successful' || response.status === 'completed') {
                        // 4. Verify payment on backend
                        try {
                            const verifyData = await api.post('/payment/verify', {
                                transaction_id: response.transaction_id,
                                tx_ref: response.tx_ref,
                                session_preference: sessionPreference
                            });

                            if (verifyData.status === 'success') {
                                alert('Payment successful! You have joined the tournament.');
                                setJoinStep(null);
                                setSessionPreference(null);
                                await fetchTournament();
                            } else {
                                alert(verifyData.error || 'Payment verification failed');
                            }
                        } catch (verifyErr) {
                            console.error('Verification error:', verifyErr);
                            alert('Payment received but verification failed. Please contact support.');
                        }
                    } else {
                        alert('Payment was not completed.');
                    }
                    setJoinLoading(false);
                },
                onclose: () => {
                    setJoinLoading(false);
                },
            });

        } catch (e) {
            console.error(e);
            alert('Error initiating payment. Please try again.');
            setJoinLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans relative">
            
            {/* Header / Menu Icon */}
            <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative">
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

            {/* Content Centered - Welcome Screen */}
            <div className="flex flex-col items-center justify-center mt-4 px-6">

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
                                onSuccess={fetchTournament} 
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
                                <p className="text-3xl font-black text-slate-900">₦{tournamentData.tournament.prizePool}</p>
                            </div>

                            <button onClick={fetchTournament} className="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700">
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
                                tournamentData.tournament.status === 'open' ? 
                                    (tournamentData.tournament.registration_end && new Date() > new Date(tournamentData.tournament.registration_end) ? 'text-red-500' : 'text-green-600') :
                                tournamentData.tournament.status === 'active' ? 'text-blue-600' :
                                tournamentData.tournament.status === 'paused' ? 'text-yellow-600' :
                                'text-slate-500'
                            }`}>
                            {(() => {
                                if (tournamentData.tournament.status === 'open') {
                                    if (tournamentData.participation) return '';
                                    const now = todayDateOnly();
                                    const regStart = toDateOnly(tournamentData.tournament.registration_start);
                                    const regEnd = toDateOnly(tournamentData.tournament.registration_end);
                                    if (regStart && now < regStart) return '';
                                    if (regEnd && now > regEnd) return 'Registration Closed';
                                    return 'Registration Open';
                                }
                                if (tournamentData.tournament.status === 'active') return 'Live Now';
                                if (tournamentData.tournament.status === 'paused') return 'Paused';
                                return 'Completed';
                            })()}
                            </p>
                        </div>

                        {/* Registration Timer - only show if NOT registered */}
                        {tournamentData.tournament.status === 'open' && !tournamentData.participation && (() => {
                            const now = todayDateOnly();
                            const regStart = toDateOnly(tournamentData.tournament.registration_start);
                            const regEnd = toDateOnly(tournamentData.tournament.registration_end);
                            
                            if (regEnd && now > regEnd) return null;
                            const isBeforeStart = regStart && now < regStart;

                            return (
                                <div className="w-full mb-4 flex flex-col items-center space-y-3">
                                    {isBeforeStart ? (
                                        <>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={18} />
                                                <span className="text-xs font-semibold uppercase tracking-wider">Registration</span>
                                            </div>
                                            <div className="py-1">
                                                <p className="text-slate-500 text-sm">Starts on</p>
                                                <p className="text-xl font-bold text-slate-900 mt-1">
                                                    {format(new Date(tournamentData.tournament.registration_start), "PPP")}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-slate-500">
                                                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-center">Registration - Time Remaining</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 w-full">
                                                {[
                                                    { value: timeLeft.days, label: 'Days' },
                                                    { value: timeLeft.hours, label: 'Hrs' },
                                                    { value: timeLeft.minutes, label: 'Min' },
                                                    { value: timeLeft.seconds, label: 'Sec' }
                                                ].map(({ value, label }) => (
                                                    <div key={label} className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                                                        <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                                                            {String(value).padStart(2, '0')}
                                                        </div>
                                                        <div className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">{label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            {tournamentData.tournament.registration_end && (
                                                <p className="text-xs text-slate-400">
                                                    Ends on {format(new Date(tournamentData.tournament.registration_end), "PPP")}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Registered View - show when user has joined */}
                        {tournamentData.participation && (
                            <div className="w-full mb-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-lg font-bold text-green-700 mb-1">You're In!</p>
                                <p className="text-xs text-slate-500 mb-4">Successfully registered for this tournament</p>
                                
                                {tournamentData.participation.session_preference && (
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 inline-flex items-center gap-2 mb-3">
                                        <span className="text-lg">
                                            {tournamentData.participation.session_preference === 'morning' && '☀️'}
                                            {tournamentData.participation.session_preference === 'afternoon' && '🌤️'}
                                            {tournamentData.participation.session_preference === 'evening' && '🌙'}
                                        </span>
                                        <div className="text-left">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Session Preference</p>
                                            <p className="text-sm font-bold text-slate-900 capitalize">{tournamentData.participation.session_preference}</p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="mt-2">
                                    <p className="text-xs text-slate-400 animate-pulse">
                                        {tournamentData.tournament.status === 'open' 
                                            ? '⏳ Waiting for tournament to start...' 
                                            : '🎮 Good luck!'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* Join/Registration Buttons - only show if NOT registered */}
                        {!tournamentData.participation && (
                            <>
                                {(() => {
                                    const now = todayDateOnly();
                                    const regStart = toDateOnly(tournamentData.tournament.registration_start);
                                    const regEnd = toDateOnly(tournamentData.tournament.registration_end);
                                    const isRegistrationOpen = regStart && regEnd && now >= regStart && now <= regEnd;
                                    const isBeforeRegistration = regStart && now < regStart;

                                    if (isRegistrationOpen) {
                                        return (
                                            <button 
                                                onClick={() => setJoinStep('session')}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
                                            >
                                                JOIN TOURNAMENT
                                            </button>
                                        );
                                    } else if (isBeforeRegistration) {
                                        return (
                                            <div className="w-full py-3 bg-amber-50 text-amber-700 rounded-xl font-bold border border-amber-200">
                                                Registration Opens Soon
                                            </div>
                                        );
                                    } else if (tournamentData.tournament.status === 'active') {
                                        return (
                                            <Link to={`/tournament/${tournamentData.tournament.id}`} className="block w-full">
                                                <div className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border border-blue-100 flex items-center justify-center gap-2 mb-2">
                                                    <span className="animate-pulse">●</span> Tournament Live
                                                </div>
                                                <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
                                                    VIEW TOURNAMENT
                                                </button>
                                            </Link>
                                        );
                                    } else {
                                        return (
                                            <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-bold border border-slate-200">
                                                Registration Closed
                                                <div className="text-xs font-normal">Wait for next tournament</div>
                                            </div>
                                        );
                                    }
                                })()}
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
                {tournamentData?.tournament?.registration_end && new Date() > new Date(tournamentData.tournament.registration_end) && (
                <div className="w-full max-w-xs space-y-4">
                    <Link to="/leaderboard" className="block w-full">
                        <button className="w-full py-4 bg-slate-900 text-white rounded-full text-lg font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                            VIEW LEADERBOARD
                        </button>
                    </Link>
                </div>
                )}
            </div>

            {/* Join Tournament Modal */}
            {joinStep && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setJoinStep(null); setSessionPreference(null); }} />
                    <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:p-8 shadow-2xl animate-in slide-in-from-bottom z-10">
                        
                        {/* Step Indicator */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                joinStep === 'session' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                            }`}>1</div>
                            <div className="w-8 h-0.5 bg-slate-200" />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                joinStep === 'payment' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>2</div>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={() => { setJoinStep(null); setSessionPreference(null); }}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {joinStep === 'session' && (
                            <>
                                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Choose Your Session</h3>
                                <p className="text-sm text-slate-500 text-center mb-2">When do you prefer to play your matches?</p>
                                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center mb-6">⚠️ Session preference is not guaranteed and may vary based on scheduling.</p>
                                
                                <div className="space-y-3 mb-6">
                                    {[
                                        { value: 'morning', label: 'Morning', icon: '☀️', time: '10:30 AM – 1:30 PM' },
                                        { value: 'afternoon', label: 'Afternoon', icon: '🌤️', time: '2:00 PM – 5:00 PM' },
                                        { value: 'evening', label: 'Evening', icon: '🌙', time: '5:30 PM – 8:30 PM' }
                                    ].map(({ value, label, icon, time }) => (
                                        <button
                                            key={value}
                                            onClick={() => setSessionPreference(value)}
                                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                                                sessionPreference === value
                                                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <span className="text-2xl">{icon}</span>
                                            <div className="text-left">
                                                <div className="font-bold text-slate-900">{label}</div>
                                                <div className="text-xs text-slate-500">{time}</div>
                                            </div>
                                            {sessionPreference === value && (
                                                <div className="ml-auto w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    disabled={!sessionPreference}
                                    onClick={() => setJoinStep('payment')}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                                        sessionPreference
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Continue to Payment
                                </button>
                            </>
                        )}

                        {joinStep === 'payment' && (
                            <>
                                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Payment Summary</h3>
                                <p className="text-sm text-slate-500 text-center mb-6">Review and confirm your entry</p>

                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">Tournament</span>
                                        <span className="text-sm font-bold text-slate-900">{tournamentData?.tournament?.title}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">Session</span>
                                        <span className="text-sm font-bold text-slate-900 capitalize">
                                            {sessionPreference === 'morning' && '☀️ '}
                                            {sessionPreference === 'afternoon' && '🌤️ '}
                                            {sessionPreference === 'evening' && '🌙 '}
                                            {sessionPreference}
                                        </span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-700">Entry Fee</span>
                                        <span className="text-lg font-black text-slate-900">₦{tournamentData?.tournament?.entry_fee || 0}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setJoinStep('session')}
                                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm uppercase tracking-wide transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleJoin}
                                        disabled={joinLoading}
                                        className="flex-[2] py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm uppercase tracking-wide shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {joinLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>PAY ₦{tournamentData?.tournament?.entry_fee || 0}</>
                                        )}
                                    </button>
                                </div>

                                <p className="text-[10px] text-slate-400 text-center mt-4">Payments powered by Flutterwave 🔒</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </div>
    );
};

export default PlayerDashboard;
