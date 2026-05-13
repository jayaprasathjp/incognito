import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import appIcon from '../assets/app-icon.png';
import Sidebar from '../components/Sidebar';
import MenuButton from '../components/MenuButton';
import { api } from '../utils/api';
import ActiveMatchCard from '../components/ActiveMatchCard';
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



const PlayerDashboard = () => {
    const { user, token } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [tournamentData, setTournamentData] = useState(null);
    const [hasBankDetails, setHasBankDetails] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [joinStep, setJoinStep] = useState(null); // null, 'session', 'payment'
    const [sessionPreference, setSessionPreference] = useState(null);
    const [tournamentAlias, setTournamentAlias] = useState('');
    const [aliasError, setAliasError] = useState('');
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
            const [data, bankData] = await Promise.all([
                api.get('/tournaments/current'),
                api.get('/user/bank-details').catch(() => ({}))
            ]);
            setTournamentData(data);
            setHasBankDetails(!!bankData?.account_number);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
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
                session_preference: sessionPreference,
                alias: tournamentAlias.trim()
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
                payment_options: 'banktransfer,card,ussd',
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
                                session_preference: sessionPreference,
                                alias: tournamentAlias.trim()
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

    const resetJoinModal = () => {
        setJoinStep(null);
        setSessionPreference(null);
        setTournamentAlias('');
        setAliasError('');
    };

    const handleAliasContinue = () => {
        setAliasError('');
        const trimmed = tournamentAlias.trim();
        if (!trimmed) {
            setAliasError('Alias is required.');
            return;
        }
        if (!/^[A-Z0-9]+$/.test(trimmed)) {
            setAliasError('Alias must be uppercase alphanumeric. No spaces or special characters.');
            return;
        }
        if (trimmed.length < 3 || trimmed.length > 20) {
            setAliasError('Alias must be between 3 and 20 characters.');
            return;
        }
        if (!sessionPreference) {
            setAliasError('Please also select a session preference.');
            return;
        }
        setJoinStep('payment');
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans relative">
            
            {/* Header / Menu Icon */}
            <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative">
                <img src={appIcon} alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <MenuButton onClick={() => setIsMenuOpen(true)} />
            </div>

            {/* Content Centered - Welcome Screen */}
            <div className="flex flex-col items-center justify-center mt-4 px-6">

                {/* Welcome Text & Alias */}
                <div className="text-center mb-8">
                    <h1 className="text-sm font-light text-slate-500 uppercase tracking-[0.2em] mb-1">
                        Welcome
                    </h1>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter truncate max-w-[280px] mx-auto px-4" title={user?.email}>
                        {user?.email || 'PLAYER'}
                    </h2>

                </div>

                {/* Initial Loader */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 text-black-600 animate-spin mb-4" />
                        <p className="text-slate-400 font-medium animate-pulse">Loading tournament details...</p>
                    </div>
                )}

                {/* Current Match Card via ActiveMatchCard */}
                {!loading && tournamentData?.currentMatch && (tournamentData?.tournament?.status === 'active' || tournamentData?.tournament?.status === 'scheduled') && (
                    <ActiveMatchCard 
                        matchId={tournamentData.currentMatch.id} 
                        round={tournamentData.currentMatch.round} 
                        currentRound={tournamentData.tournament.rounds_config?.rounds?.find(r => r.round_number === tournamentData.currentMatch.round)}
                        nextRound={tournamentData.tournament.rounds_config?.rounds?.find(r => r.round_number === (tournamentData.currentMatch.round + 1))}
                        onComplete={fetchTournament} 
                    />
                )}

                {/* Winner Card */}
                {!loading && tournamentData?.tournament?.status === 'completed' && (
                    <div className="w-full max-w-sm mb-8 relative group">
                        {/* Glowing backdrop */}
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
                        
                        <div className="relative p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-center overflow-hidden">
                            {/* Inner ambient light */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500 rounded-full blur-[80px] opacity-30"></div>
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-600 rounded-full blur-[80px] opacity-20"></div>
                            
                            <div className="relative z-10">
                                <div className="text-5xl mb-4 animate-[bounce_2s_ease-in-out_infinite]">🏆</div>
                                <h3 className="text-xs text-amber-500 font-black uppercase tracking-[0.3em] mb-4 drop-shadow-md">Tournament Champion</h3>
                                
                                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-1 rounded-full mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                                    <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-500">
                                        {tournamentData.tournament.winner_display_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                </div>
                                
                                <p className="text-3xl font-black text-white mb-2 drop-shadow-lg">
                                    {tournamentData.tournament.winner_display_name || 'To be announced'}
                                </p>
                                <p className="text-sm text-slate-400 font-medium mb-8">Master of {tournamentData.tournament.title}</p>
                                
                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 relative overflow-hidden">
                                     <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10"></div>
                                     <p className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-1">Total Prize Pool</p>
                                     <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
                                        ₦{(Number(tournamentData.tournament.prize_pool) || Number(tournamentData.tournament.prizePool) || 90000).toLocaleString()}
                                     </p>
                                </div>

                                {/* Winner Action / Info */}
                                {user?.id === tournamentData.tournament.winner_id && (
                                    <div className={`mt-6 p-4 rounded-2xl border backdrop-blur-md transition-all ${
                                        hasBankDetails 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    }`}>
                                        {hasBankDetails ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-bold">Prize money will be transferred to your account shortly!</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 bg-rose-500/20 rounded-full flex items-center justify-center animate-pulse">
                                                    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-bold mb-2 text-rose-200">Action Required: Bank details missing!</p>
                                                <Link 
                                                    to="/bank-details" 
                                                    className="px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/40"
                                                >
                                                    FILL BANK DETAILS
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button onClick={fetchTournament} className="mt-8 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                                    <Loader2 className="w-3 h-3 animate-spin"/> Awaiting Next Season
                                </button>
                            </div>
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
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full font-bold text-xs mb-3 border border-green-100">
                            <span>🏆 Prize Pool:</span>
                            <span className="font-extrabold">₦{(Number(tournamentData.tournament.prize_pool) || Number(tournamentData.tournament.prizePool) || 90000).toLocaleString()}</span>
                        </div>
                        
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
                                {((tournamentData.tournament.status === 'scheduled' || tournamentData.tournament.status === 'active') && !tournamentData.currentMatch) ? (() => {
                                    const rounds = tournamentData.tournament.rounds_config?.rounds || [];
                                    const rData = rounds.find(r => r.round_number == (tournamentData.tournament.currentRound || 1)) || rounds[0];
                                    const isProjectedBye = tournamentData.participation?.projectedBye;
                                    
                                    return (
                                        <>
                                            {isProjectedBye ? (
                                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <div className="text-2xl">⭐</div>
                                                </div>
                                            ) : (
                                                tournamentData.tournament.status != 'active' && (
                                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Calendar className="w-8 h-8 text-blue-600" />
                                                </div>
                                                )
                                            )}
                                            
                                            <p className="text-lg font-bold text-blue-700 mb-2">
                                                {isProjectedBye ? "Free Pass Secured!" : (tournamentData.tournament.status !== 'active' && "Tournament Scheduled")}
                                            </p>
                                            
                                            {rData ? (
                                                <div className="bg-white/50 rounded-xl p-3 inline-block border border-blue-200 shadow-sm text-left">
                                                    <p className="text-sm font-bold text-slate-800 mb-1">
                                                        {rData.name || `Round ${rData.round_number}`} <span className="text-blue-500 font-normal">on {rData.date ? new Date(rData.date).toLocaleDateString() : 'TBD'}</span>
                                                    </p>
                                                    {isProjectedBye ? (
                                                        <p className="text-xs text-slate-600 font-bold text-emerald-600">You registered early! You will receive a BYE for this round.</p>
                                                    ) : (
                                                        <p className="text-xs text-slate-600">Fixtures and exact match times will be announced soon!</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 mb-4">Awaiting your next match or fixture assignment.</p>
                                            )}
                                        </>
                                    );
                                })() : (
                                    <>
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-lg font-bold text-green-700 mb-1">You're In!</p>
                                        <p className="text-xs text-slate-500 mb-4">Successfully registered for this tournament</p>
                                    </>
                                )}
                                
                                {/* Alias + Session badges */}
                                <div className="flex flex-wrap justify-center gap-2 mb-3">
                                    {tournamentData.participation.alias && (
                                        <div className="bg-slate-900 rounded-xl px-4 py-2.5 inline-flex items-center gap-2">
                                            <span className="text-sm">🎭</span>
                                            <div className="text-left">
                                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Your Alias</p>
                                                <p className="text-sm font-black text-white font-mono">{tournamentData.participation.alias}</p>
                                            </div>
                                        </div>
                                    )}
                                    {tournamentData.participation.session_preference && (
                                        <div className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 inline-flex items-center gap-2">
                                            <span className="text-lg">
                                                {tournamentData.participation.session_preference === 'morning' && '☀️'}
                                                {tournamentData.participation.session_preference === 'afternoon' && '🌤️'}
                                                {tournamentData.participation.session_preference === 'evening' && '🌙'}
                                            </span>
                                            <div className="text-left">
                                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Session</p>
                                                <p className="text-sm font-bold text-slate-900 capitalize">{tournamentData.participation.session_preference}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
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
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetJoinModal} />
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
                            onClick={resetJoinModal}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {joinStep === 'session' && (
                            <>
                                <h3 className="text-xl font-bold text-slate-900 text-center mb-1">Join Tournament</h3>
                                <p className="text-sm text-slate-500 text-center mb-5">Choose your alias and preferred session</p>

                                {/* Alias Input */}
                                <div className="mb-5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Your Tournament Alias</label>
                                    <input
                                        type="text"
                                        value={tournamentAlias}
                                        onChange={(e) => { setTournamentAlias(e.target.value.toUpperCase()); setAliasError(''); }}
                                        placeholder="e.g. UNKNOWN123"
                                        maxLength={20}
                                        className={`w-full p-3 border-2 rounded-xl outline-none transition-all text-slate-800 placeholder:text-slate-400 font-semibold ${
                                            aliasError ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-blue-500 bg-white'
                                        }`}
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1.5 ml-1">3–20 characters, uppercase alphanumeric only. This alias is only for this tournament.</p>
                                    {aliasError && <p className="text-xs text-red-500 mt-1 ml-1">{aliasError}</p>}
                                </div>

                                {/* Session Preference */}
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Session Preference</label>
                                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center mb-3">⚠️ Session preference is not guaranteed and may vary based on scheduling.</p>
                                
                                <div className="space-y-2 mb-6">
                                    {[
                                        { value: 'morning', label: 'Morning', icon: '☀️', time: '10:30 AM – 1:30 PM' },
                                        { value: 'afternoon', label: 'Afternoon', icon: '🌤️', time: '2:00 PM – 5:00 PM' },
                                        { value: 'evening', label: 'Evening', icon: '🌙', time: '5:30 PM – 8:30 PM' }
                                    ].map(({ value, label, icon, time }) => (
                                        <button
                                            key={value}
                                            onClick={() => setSessionPreference(value)}
                                            className={`w-full flex items-center gap-4 p-3.5 rounded-xl border-2 transition-all ${
                                                sessionPreference === value
                                                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <span className="text-xl">{icon}</span>
                                            <div className="text-left">
                                                <div className="font-bold text-slate-900 text-sm">{label}</div>
                                                <div className="text-xs text-slate-500">{time}</div>
                                            </div>
                                            {sessionPreference === value && (
                                                <div className="ml-auto w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleAliasContinue}
                                    className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95"
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
                                        <span className="text-sm text-slate-500">Alias</span>
                                        <span className="text-sm font-bold text-slate-900 font-mono">{tournamentAlias}</span>
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
