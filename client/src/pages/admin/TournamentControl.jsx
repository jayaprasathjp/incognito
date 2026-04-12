import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Play, Pause, Square, Trophy, Settings, Loader2, Calendar, DollarSign, Users, Clock, Plus, Zap, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../utils/api";
import { format } from "date-fns";

const RoundTimer = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));
    const [mounted, setMounted] = useState(false);

    function calculateTimeLeft(target) {
        const difference = +new Date(target) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    }

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft(targetDate));
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className="flex gap-4 justify-center py-6">
            {Object.keys(timeLeft).length > 0 ? Object.entries(timeLeft).map(([unit, value]) => (
                <div key={unit} className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold font-mono shadow-lg border border-slate-700">
                        {String(value).padStart(2, '0')}
                    </div>
                    <span className="text-xs uppercase mt-2 font-bold text-slate-500 tracking-wider">{unit}</span>
                </div>
            )) : (
                <div className="text-xl font-bold text-green-600 animate-pulse">
                    Round Starting Now...
                </div>
            )}
        </div>
    );
};

const TournamentControl = () => {
    const { token } = useAuth();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Creation Form State
    const [formData, setFormData] = useState({
        title: "",
        capacity: 64,
        entry_fee: 0,
        start_date: "",
        end_date: ""
    });
    
    // Extension State
    const [showExtend, setShowExtend] = useState(false);
    const [newEndTime, setNewEndTime] = useState("");

    // Rounds Configuration State
    const [roundsSchedule, setRoundsSchedule] = useState(null);
    

    const calculateRounds = () => {
        const participants = tournament.participants_count || 0;
        const capacity = tournament.capacity;
        let rounds = [];
        let type = "";
        let description = "";

        // Case 1: Exact Capacity (Power of 2)
        // e.g., 1024 players -> 1024, 512, 256...
        if (participants === capacity) {
            type = "Standard Bracket";
            description = `${participants} players filled the capacity exactly. A standard single-elimination bracket will be generated.`;
            
            let currentPlayers = participants;
            let roundNum = 1;
            while (currentPlayers > 1) {
                const matches = currentPlayers / 2;
                rounds.push({
                    name: matches === 1 ? "Finals" : matches === 2 ? "Semi-Finals" : matches === 4 ? "Quarter-Finals" : `Round ${roundNum}`,
                    matches: matches,
                    players: currentPlayers,
                    date: ""
                });
                currentPlayers /= 2;
                roundNum++;
            }
        } 
        // Case 2: More than Capacity
        // e.g., 1200 players for 1024 spots.
        // Excess = 1200 - 1024 = 176 players need to be eliminated to get back to 1024.
        // Actually, to eliminate 176 players, we need 176 matches involving 352 players.
        // 352 players play Qualifier. 176 win.
        // Remaining (1200 - 352 = 848) + 176 (winners) = 1024.
        else if (participants > capacity) {
            type = "Qualifier Round Required";
            const excess = participants - capacity;
            const playersInQualifier = excess * 2;
            const qualifierMatches = excess;
            
            description = `${participants} players registered (Capacity: ${capacity}). ${playersInQualifier} players will play a Qualifier Round to eliminate ${excess} players. The ${excess} winners will join the remaining ${participants - playersInQualifier} players to form the main bracket of ${capacity}.`;

            rounds.push({
                name: "Qualifier Round",
                matches: qualifierMatches,
                players: playersInQualifier,
                date: ""
            });

            // Main Bracket (starting from capacity)
            let currentPlayers = capacity;
            let roundNum = 1;
            while (currentPlayers > 1) {
                const matches = currentPlayers / 2;
                rounds.push({
                    name: matches === 1 ? "Finals" : matches === 2 ? "Semi-Finals" : matches === 4 ? "Quarter-Finals" : `Round ${roundNum}`,
                    matches: matches,
                    players: currentPlayers,
                    date: ""
                });
                currentPlayers /= 2;
                roundNum++;
            }
        }
        // Case 3: Less than Capacity
        // e.g., 899 players. Next power of 2 might be 1024 (capacity or lower).
        // Actually, if 899 players, we aim for the *next lower* power of 2 as the "target" for Round 2, OR we just handle the bye logic to reduce to a power of 2.
        // Power of 2s: 512, 1024. 899 is between 512 and 1024.
        // We want to reduce 899 to 512 in the next round.
        // Players to eliminate = 899 - 512 = 387.
        // 387 matches needed. 774 players play in Round 1.
        // Byes = 899 - 774 = 125.
        // Check: 387 winners + 125 byes = 512. Correct.
        else {
            type = "Byes Logic";
            // Find nearest power of 2 less than participants
            let target = 1;
            while (target * 2 < participants) {
                target *= 2;
            }
            // If participants is exactly a power of 2 (e.g., 64 in a 128 cap tourney), it's standard logic from there.
            if (target * 2 === participants) {
                 // it's a power of 2, just smaller than full capacity. Treat as standard.
                 type = "Standard Bracket (Under Capacity)";
                 description = `${participants} players registered. Standard bracket generated.`;
                 
                 let currentPlayers = participants;
                 let roundNum = 1;
                 while (currentPlayers > 1) {
                     const matches = currentPlayers / 2;
                     rounds.push({
                         name: matches === 1 ? "Finals" : matches === 2 ? "Semi-Finals" : matches === 4 ? "Quarter-Finals" : `Round ${roundNum}`,
                         matches: matches,
                         players: currentPlayers,
                         date: ""
                     });
                     currentPlayers /= 2;
                     roundNum++;
                 }
            } else {
                // target is the power of 2 we want to reach (e.g., 512 for 899 players)
                const playersToEliminate = participants - target;
                const matchesRound1 = playersToEliminate;
                const playersInRound1 = matchesRound1 * 2;
                const byes = participants - playersInRound1;

                description = `${participants} players registered. To reach the next power of 2 (${target}), ${byes} players will get a BYE. ${playersInRound1} players will play in Round 1 (${matchesRound1} matches).`;

                rounds.push({
                    name: "Round 1",
                    matches: matchesRound1,
                    players: playersInRound1,
                    date: ""
                });

                // Rounds from target downwards
                let currentPlayers = target;
                let roundNum = 2; // Since we already had Round 1
                while (currentPlayers > 1) {
                    const matches = currentPlayers / 2;
                    rounds.push({
                        name: matches === 1 ? "Finals" : matches === 2 ? "Semi-Finals" : matches === 4 ? "Quarter-Finals" : `Round ${roundNum}`,
                        matches: matches,
                        players: currentPlayers,
                        date: ""
                    });
                    currentPlayers /= 2;
                    roundNum++;
                }
            }
        }

        setRoundsSchedule({ type, description, rounds });
    };

    const handleRoundDateChange = (index, date) => {
        const newRounds = [...roundsSchedule.rounds];
        newRounds[index].date = date;
        
        // Reset subsequent rounds if previous round date changes
        for (let i = index + 1; i < newRounds.length; i++) {
            newRounds[i].date = "";
        }
        
        setRoundsSchedule({ ...roundsSchedule, rounds: newRounds });
    };

    const handleSaveSchedule = async () => {
        // Validate dates
        for (let i = 0; i < roundsSchedule.rounds.length; i++) {
             if (!roundsSchedule.rounds[i].date) {
                 toast.error(`Please select a date for ${roundsSchedule.rounds[i].name}`);
                 return;
             }
             // Optional: Validate that round[i+1] is after round[i]
             if (i > 0) {
                 const prevDate = new Date(roundsSchedule.rounds[i-1].date);
                 const currDate = new Date(roundsSchedule.rounds[i].date);
                 // Strict check: Must be strictly greater (at least 1 day after)
                 if (currDate <= prevDate) {
                     toast.error(`${roundsSchedule.rounds[i].name} must be at least 1 day after ${roundsSchedule.rounds[i-1].name}`);
                     return;
                 }
             } else {
                 // Round 1 check: Must be in future (tomorrow onwards)
                 const today = new Date();
                 const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                 
                 if (roundsSchedule.rounds[i].date <= todayStr) {
                     toast.error(`${roundsSchedule.rounds[i].name} must be a future date (tomorrow or later)`);
                     return;
                 }
             }
        }

        setActionLoading('save_schedule');
        try {
            await api.post('/admin/tournaments/control', {
                action: 'save_schedule',
                id: tournament.id,
                rounds_config: roundsSchedule
            });
            toast.success("Schedule saved successfully!");
            fetchTournament(); // Refresh data
        } catch (error) {
            console.error("Save schedule error:", error);
            const errorMsg = error.response?.data?.error || "Failed to save schedule";
            toast.error(errorMsg);
        } finally {
            setActionLoading(null);
        }
    };

    // Countdown Timer State
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!tournament?.registration_end) return;
        const updateTimer = () => {
            const now = new Date();
            const end = new Date(tournament.registration_end);
            const diff = end - now;
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
    }, [tournament?.registration_end]);

    const fetchTournament = async () => {
        try {
            const data = await api.get('/admin/tournaments/control');
            setTournament(data.id ? data : null); // Ensure null if empty object
        } catch (error) {
            console.error(error);
            setTournament(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTournament();
    }, [token]);

    // Restore: Load saved schedule if exists
    useEffect(() => {
        if (tournament?.rounds_config) {
            setRoundsSchedule(tournament.rounds_config);
        }
    }, [tournament]);



    // Handle Generate Fixtures for a specific round
    const handleGenerateFixtures = async (roundNumber) => {
        if (!confirm(`Generate match fixtures for Round ${roundNumber}? This will pair players and create matches.`)) return;
        
        setActionLoading(`generate_fixtures_${roundNumber}`);
        try {
            const data = await api.post('/admin/tournaments/control', {
                action: 'generate_fixtures',
                id: tournament.id,
                round_number: roundNumber
            });
            toast.success(data.message || `Fixtures generated for Round ${roundNumber}!`);
            fetchTournament();
        } catch (error) {
            console.error('Generate fixtures error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to generate fixtures';
            toast.error(errorMsg);
        } finally {
            setActionLoading(null);
        }
    };

    const fixedPrizePool = 90000;
    const estimatedRounds = Math.log2(formData.capacity);

    const handleCreate = async (e) => {
        e.preventDefault();
        setActionLoading('create');

        // Validation
        if (formData.end_date <= formData.start_date) {
             toast.error("End date must be after start date");
             setActionLoading(null);
             return;
        }

        // Send dates as-is to avoid timezone shift
        // formData.start_date is "YYYY-MM-DD", append T00:00:00 to keep the intended date
        try {
            const data = await api.post('/tournaments', {
                title: formData.title,
                capacity: formData.capacity,
                entry_fee: formData.entry_fee,
                registration_start: `${formData.start_date}T00:00:00`,
                registration_end: `${formData.end_date}T00:00:00`
            });
            if (data.error) {
                throw { response: { data } };
            }

            toast.success("Tournament created successfully");
            fetchTournament();
        } catch (error) {
            console.error("Tournament creation error:", error);
            const errorMsg = error.response?.data?.error || error.message || "Failed to create tournament";
            toast.error(errorMsg);
        } finally {
            setActionLoading(null);
        }
    };

    const handleExtend = async () => {
        setActionLoading('extend');
        try {
            await api.post('/admin/tournaments/control', {
                action: 'extend',
                id: tournament.id,
                registration_end: newEndTime
            });
            toast.success("Registration extended");
            setShowExtend(false);
            fetchTournament();
        } catch (error) {
            toast.error("Failed to extend time");
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = async (action) => {
        if (!confirm(`Are you sure you want to ${action} the tournament?`)) return;
        
        setActionLoading(action);
        try {
            const endpoint = '/admin/tournaments/control';
            const body = { action, id: tournament.id };
            
            const data = await api.post(endpoint, body);
            
            if (data.tournament || data.id || data.message) { 
                toast.success(`Tournament updated successfully`);
                fetchTournament();
            } else {
                 toast.error(data.error || "Action failed");
            }
        } catch (error) {
            toast.error("Failed to update tournament");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center mt-20">
            <Loader2 className="animate-spin text-slate-400" size={48} />
        </div>
    );

    if (!tournament || !tournament.id || tournament.status === 'completed') {
        return (
            <div className="max-w-4xl mx-auto space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Trophy className="text-yellow-500" /> Create New Tournament
                </h1>
                
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Tournament Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Winter Championship 2026"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Registration Start</label>
                                        <input 
                                            required
                                            type="date" 
                                            min={(() => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + 1);
                                                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                            })()}
                                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.start_date}
                                            onChange={e => setFormData({...formData, start_date: e.target.value, end_date: ""})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Registration End</label>
                                        <input 
                                            required
                                            type="date" 
                                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.end_date}
                                            min={formData.start_date ? new Date(new Date(formData.start_date).setDate(new Date(formData.start_date).getDate() + 1)).toISOString().split('T')[0] : ""}
                                            onChange={e => setFormData({...formData, end_date: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">Registration opens at 12:00 AM on start date and closes at 11:59 PM on end date.</p>
                            </div>

                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Entry Fee (₦)</label>
                                    <input 
                                        required
                                        type="number" 
                                        min="0"
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.entry_fee}
                                        onChange={e => setFormData({...formData, entry_fee: parseFloat(e.target.value)})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Total Capacity</label>
                                    <select 
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.capacity}
                                        onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                                    >
                                        {[2048, 1024, 512, 256].map(cap => (
                                            <option key={cap} value={cap}>{cap} Players</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tournament Prize Pool</span>
                                <div className="text-2xl font-bold text-green-600">₦{fixedPrizePool.toLocaleString()}</div>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Rounds</span>
                                <div className="text-2xl font-bold text-blue-600">{estimatedRounds} Rounds</div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={actionLoading === 'create'}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            {actionLoading === 'create' ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Create Tournament</>}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Tournament Control</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="bg-white p-8 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-sm border border-slate-200">
                    {tournament.registration_start && new Date() < new Date(tournament.registration_start) ? (
                        <>
                            <div className="flex items-center gap-2 text-slate-500">
                                <Calendar size={20} />
                                <span className="text-sm font-semibold uppercase tracking-wider">Registration</span>
                            </div>
                            <div className="py-2">
                                <p className="text-slate-500 text-sm">Starts on</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {format(new Date(tournament.registration_start), "PPP")}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {new Date() > new Date(tournament.registration_end) ? (
                                <div className="w-full text-left space-y-4">
                                     {(() => {
                                         if (!roundsSchedule || !roundsSchedule.rounds) {
                                             return (
                                                <>
                                                    <div className="flex items-center gap-2 text-slate-500 border-b border-slate-100 pb-2 mb-4">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                            <Settings size={20} />
                                                        </div>
                                                        <span className="text-sm font-bold uppercase tracking-wider">Rounds Configuration</span>
                                                    </div>
                                                    <div className="text-center py-6">
                                                        <p className="text-slate-500 mb-4">Registration has ended. Configure the rounds based on participant count.</p>
                                                        <button 
                                                            onClick={calculateRounds}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                                                        >
                                                            <Settings size={18} />
                                                            Generate Bracket
                                                        </button>
                                                    </div>
                                                </>
                                             );
                                         }
                                         
                                         // Logic to determine Active vs Next vs All
                                         // If status is 'active', force show the schedule view (Timer/Live)
                                         // If status is 'open' or 'registration_closed' (but not active), show config.
                                         // However, we rely on dates for the content.
                                         
                                         const isConfigured = roundsSchedule.rounds.some(r => r.date);
                                         const isActive = tournament.status === 'active';

                                         if (!isConfigured && !isActive) {
                                             return renderConfigUI();
                                         }
                                         
                                         // If it IS configured, we show the schedule view if it's either active OR we just want to see it?
                                         // User wants "make tournament status set to active by that status, show the rounds timer"
                                         // So if NOT active, maybe show config even if dates are set? 
                                         // Let's assume if it's NOT active, we show config UI to allow editing.
                                         // If it IS active, we show the Live view.
                                         
                                         if (!isActive) {
                                             return renderConfigUI();
                                         }

                                         const now = new Date();
                                         const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                         let activeRound = null;
                                         let nextRound = null;
                                         
                                         for (let r of roundsSchedule.rounds) {
                                             if (r.date === todayStr) {
                                                 activeRound = r;
                                             } else if (r.date > todayStr) {
                                                 if (!nextRound) nextRound = r;
                                             }
                                         }

                                         if (activeRound) {
                                              // Check if 22 hours have passed since active round started (round date 00:00)
                                              const activeRoundStart = new Date(`${activeRound.date}T00:00:00`);
                                              const hoursSinceStart = (now - activeRoundStart) / (1000 * 60 * 60);
                                              const canGenerateNext = hoursSinceStart >= 22;

                                              return (
                                                  <div className="text-center w-full py-6">
                                                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold animate-pulse">
                                                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                                          LIVE NOW
                                                      </div>
                                                      <div className="mt-4">
                                                          <h3 className="text-3xl font-bold text-slate-900">{activeRound.name}</h3>
                                                          <p className="text-slate-500">is currently active</p>
                                                      </div>
                                                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4 mx-auto max-w-xs">
                                                          <div className="text-sm text-slate-500 mb-1">Matches Scheduled</div>
                                                          <div className="text-2xl font-bold text-slate-900">{activeRound.matches}</div>
                                                      </div>
                                                      {/* Fixture Generation Status */}
                                                      <div className="mt-4">
                                                          {activeRound.fixtures_generated ? (
                                                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                                                  <CheckCircle2 size={14} />
                                                                  Fixtures Generated
                                                              </div>
                                                          ) : (
                                                              <button
                                                                  onClick={() => handleGenerateFixtures(activeRound.round_number)}
                                                                  disabled={actionLoading === `generate_fixtures_${activeRound.round_number}`}
                                                                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                                                              >
                                                                  {actionLoading === `generate_fixtures_${activeRound.round_number}` ? (
                                                                      <Loader2 className="animate-spin" size={16} />
                                                                  ) : (
                                                                      <Zap size={16} />
                                                                  )}
                                                                  Generate Fixtures
                                                              </button>
                                                          )}
                                                      </div>

                                                      {/* Next Round Fixture Button - only after 22hrs */}
                                                      {nextRound && canGenerateNext && (
                                                          <div className="mt-6 pt-4 border-t border-slate-100">
                                                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Next: {nextRound.name}</p>
                                                              {nextRound.fixtures_generated ? (
                                                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                                                      <CheckCircle2 size={14} />
                                                                      Fixtures Ready
                                                                  </div>
                                                              ) : (
                                                                  <button
                                                                      onClick={() => handleGenerateFixtures(nextRound.round_number)}
                                                                      disabled={actionLoading === `generate_fixtures_${nextRound.round_number}`}
                                                                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                                                                  >
                                                                      {actionLoading === `generate_fixtures_${nextRound.round_number}` ? (
                                                                          <Loader2 className="animate-spin" size={16} />
                                                                      ) : (
                                                                          <Zap size={16} />
                                                                      )}
                                                                      Generate {nextRound.name} Fixtures
                                                                  </button>
                                                              )}
                                                          </div>
                                                      )}
                                                  </div>
                                              );
                                          } else if (nextRound) {
                                              // No active round today — show next round timer
                                              // Find the most recent past round to check 22hr gate
                                              const pastRounds = roundsSchedule.rounds.filter(r => r.date && r.date < todayStr);
                                              const lastPastRound = pastRounds.length > 0 ? pastRounds[pastRounds.length - 1] : null;
                                              let canGenerateNextStandalone = true; // default: show button
                                              if (lastPastRound) {
                                                  const lastRoundStart = new Date(`${lastPastRound.date}T00:00:00`);
                                                  const hoursSince = (now - lastRoundStart) / (1000 * 60 * 60);
                                                  canGenerateNextStandalone = hoursSince >= 22;
                                              }

                                              return (
                                                  <div className="w-full">
                                                      
                                                      <div className="text-center mb-6">
                                                          <h3 className="text-2xl font-bold text-slate-900">{nextRound.name}</h3>
                                                          <p className="text-slate-500 text-sm mt-1">{format(new Date(nextRound.date), "PPP")}</p>
                                                      </div>

                                                      <RoundTimer targetDate={`${nextRound.date}T00:00:00`} />
                                                      
                                                      {/* Fixture Generation Button — gated by 22hrs */}
                                                      {canGenerateNextStandalone && (
                                                          <div className="mt-4 text-center">
                                                              {nextRound.fixtures_generated ? (
                                                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                                                      <CheckCircle2 size={14} />
                                                                      Fixtures Ready
                                                                  </div>
                                                              ) : (
                                                                  <button
                                                                      onClick={() => handleGenerateFixtures(nextRound.round_number)}
                                                                      disabled={actionLoading === `generate_fixtures_${nextRound.round_number}`}
                                                                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                                                                  >
                                                                      {actionLoading === `generate_fixtures_${nextRound.round_number}` ? (
                                                                          <Loader2 className="animate-spin" size={16} />
                                                                      ) : (
                                                                          <Zap size={16} />
                                                                      )}
                                                                      Generate Fixtures
                                                                  </button>
                                                              )}
                                                          </div>
                                                      )}

                                                      <div className="mt-8 pt-6 border-t border-slate-100">
                                                         <div className="flex justify-between items-center text-sm text-slate-500">
                                                             <span>Total Players</span>
                                                             <span className="font-bold text-slate-900">{nextRound.players}</span>
                                                         </div>
                                                      </div>
                                                  </div>
                                              );
                                         } else {
                                             // Fallback if no dates found (shouldn't happen if active) or all rounds passed?
                                             // If all rounds passed, maybe show 'Tournament Completed'?
                                             // For now, if we can't find active/next, maybe show config or just 'Completed'
                                             return renderConfigUI();
                                         }

                                         function renderConfigUI() {
                                            return (
                                                <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="flex items-center gap-2 text-slate-500 border-b border-slate-100 pb-2">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                            <Settings size={20} />
                                                        </div>
                                                        <span className="text-sm font-bold uppercase tracking-wider">Rounds Configuration</span>
                                                    </div>

                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-xs font-bold text-slate-500 uppercase">Tournament Structure</span>
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase">
                                                                {roundsSchedule.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600">{roundsSchedule.description}</p>
                                                    </div>

                                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {roundsSchedule.rounds.map((round, index) => {
                                                            let minDate;
                                                            let isDisabled = false;
        
                                                            if (index === 0) {
                                                                const tomorrow = new Date();
                                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                                const year = tomorrow.getFullYear();
                                                                const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                                                                const day = String(tomorrow.getDate()).padStart(2, '0');
                                                                minDate = `${year}-${month}-${day}`;
                                                            } else {
                                                                const prevRoundDate = roundsSchedule.rounds[index - 1].date;
                                                                if (!prevRoundDate) {
                                                                    isDisabled = true;
                                                                } else {
                                                                    const nextDay = new Date(prevRoundDate);
                                                                    nextDay.setDate(nextDay.getDate() + 1);
                                                                    minDate = nextDay.toISOString().split('T')[0];
                                                                }
                                                            }
        
                                                            return (
                                                                <div key={index} className={`p-3 border rounded-xl transition-colors group bg-white ${isDisabled ? 'border-slate-100 opacity-50' : 'border-slate-200 hover:border-blue-300'}`}>
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${isDisabled ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                                                                {index + 1}
                                                                            </div>
                                                                            {round.name}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            {round.fixtures_generated ? (
                                                                                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                                                                                    <CheckCircle2 size={12} /> Ready
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold">
                                                                                    Pending
                                                                                </span>
                                                                            )}
                                                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                                                                {round.matches} Matches
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="pl-8">
                                                                        <input 
                                                                            type="date" 
                                                                            min={minDate}
                                                                            disabled={isDisabled}
                                                                            className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-slate-50 border-slate-200'}`}
                                                                            value={round.date}
                                                                            onChange={(e) => handleRoundDateChange(index, e.target.value)}
                                                                        />
                                                                        {isDisabled && index > 0 && (
                                                                            <p className="text-[10px] text-slate-400 mt-1">Select previous round date first</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="pt-2 border-t border-slate-100 flex gap-3">
                                                        <button 
                                                            onClick={handleSaveSchedule}
                                                            disabled={actionLoading === 'save_schedule'}
                                                            className={`flex-1 py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm ${
                                                                !roundsSchedule.rounds.every(r => r.date)
                                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' // Keep it blue to encourage clicking for feedback
                                                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                                            }`}
                                                        >
                                                            {actionLoading === 'save_schedule' ? <Loader2 className="animate-spin" size={18} /> : 'Save Schedule'}
                                                        </button>
                                                        <button 
                                                            onClick={() => setRoundsSchedule(null)}
                                                            className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-medium text-sm"
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                         }
                                     })()}
                                </div>
                            ) : (
                                // Registration Time Left UI - Should match the 'else' of registration check
                                <>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Clock size={20} />
                                        <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-center">Registration - Time Remaining</span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full">
                                        {[
                                            { value: timeLeft.days, label: 'Days' },
                                            { value: timeLeft.hours, label: 'Hrs' },
                                            { value: timeLeft.minutes, label: 'Min' },
                                            { value: timeLeft.seconds, label: 'Sec' }
                                        ].map(({ value, label }) => (
                                            <div key={label} className="bg-slate-50 rounded-xl p-2 sm:p-4 border border-slate-100">
                                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tabular-nums">
                                                    {String(value).padStart(2, '0')}
                                                </div>
                                                <div className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">{label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {tournament.registration_end && (
                                        <p className="text-xs text-slate-400">
                                            Ends on {format(new Date(tournament.registration_end), "PPP")}
                                        </p>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Next Round Card - Outside main card */}
                {tournament.status === 'active' && roundsSchedule?.rounds && (() => {
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const hasActiveRound = roundsSchedule.rounds.some(r => r.date === todayStr);
                    const nextRound = roundsSchedule.rounds.find(r => r.date > todayStr);
                    
                    if (hasActiveRound && nextRound) {
                        // 22hr gate: find the active round's date and check elapsed time
                        const activeRound = roundsSchedule.rounds.find(r => r.date === todayStr);
                        const activeRoundStart = new Date(`${activeRound.date}T00:00:00`);
                        const hoursSinceStart = (now - activeRoundStart) / (1000 * 60 * 60);
                        const canGenerateNext = hoursSinceStart >= 22;

                        return (
                            <div className="bg-white px-5 py-4 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Up Next</span>
                                    <span className="text-xs text-slate-400">{format(new Date(nextRound.date), "PPP")}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-800">{nextRound.name}</span>
                                    <span className="text-xs text-slate-500">{nextRound.matches} matches · {nextRound.players} players</span>
                                </div>
                                <RoundTimer targetDate={`${nextRound.date}T00:00:00`} />
                                {/* Fixture button — only after 22hrs of active round */}
                                {canGenerateNext && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                                        {nextRound.fixtures_generated ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                                <CheckCircle2 size={14} />
                                                Fixtures Ready
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateFixtures(nextRound.round_number)}
                                                disabled={actionLoading === `generate_fixtures_${nextRound.round_number}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                                            >
                                                {actionLoading === `generate_fixtures_${nextRound.round_number}` ? (
                                                    <Loader2 className="animate-spin" size={16} />
                                                ) : (
                                                    <Zap size={16} />
                                                )}
                                                Generate {nextRound.name} Fixtures
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Settings Display */}
                <div className="bg-white p-8 rounded-2xl space-y-6 shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold flex items-center gap-2 border-b border-slate-100 pb-4 text-slate-900">
                        <Settings size={20} className="text-slate-400" /> Configuration
                    </h2>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 flex items-center gap-2"><Trophy size={16}/> Name</span>
                            <span className="font-bold text-slate-900">{tournament.title}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                             <span className="text-slate-500 flex items-center gap-2"><Settings size={16}/> Status</span>
                             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                tournament.status === 'active' ? 'bg-green-100 text-green-700' :
                                tournament.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                tournament.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-500'
                            }`}>
                                {tournament.status}
                            </span>
                        </div>
                         <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 flex items-center gap-2"><DollarSign size={16}/> Prize Pool</span>
                            <span className="font-bold text-green-600">₦{((tournament.participants_count || 0) * (tournament.entry_fee || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 flex items-center gap-2"><Users size={16}/> Capacity</span>
                            <span className="font-bold text-slate-900">
                                {tournament.participants_count} / {tournament.capacity} Players
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 flex items-center gap-2"><Trophy size={16}/> Entry Fee</span>
                            <span className="font-bold text-slate-900">₦{tournament.entry_fee || "Free"}</span>
                        </div>
                        
                        <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Registration Starts</span>
                                    <span className="font-medium">
                                        {format(new Date(tournament.registration_start), "PP")}
                                    </span>
                                </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Registration Ends</span>
                                <span className="font-medium">
                                    {tournament.registration_end ? format(new Date(tournament.registration_end), "PP") : "Not Set"}
                                </span>
                             </div>
                             
                             {new Date() < new Date(tournament.registration_end) && (
                              showExtend ? (
                                <div className="flex gap-2 mt-2">
                                    <input 
                                        type="date" 
                                        className="flex-1 p-2 border rounded text-sm"
                                        value={newEndTime}
                                        min={(() => {
                                            const currentEnd = tournament.registration_end ? new Date(tournament.registration_end) : new Date();
                                            currentEnd.setDate(currentEnd.getDate() + 1);
                                            const y = currentEnd.getFullYear();
                                            const m = String(currentEnd.getMonth() + 1).padStart(2, '0');
                                            const d = String(currentEnd.getDate()).padStart(2, '0');
                                            return `${y}-${m}-${d}`;
                                        })()}
                                        onChange={e => setNewEndTime(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleExtend}
                                        disabled={!newEndTime}
                                        className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 disabled:bg-blue-300"
                                    >
                                        Save
                                    </button>
                                    <button onClick={() => setShowExtend(false)} className="text-slate-400 hover:text-slate-600">Cancel</button>
                                </div>
                              ) : (
                                <button 
                                    onClick={() => setShowExtend(true)}
                                    className="w-full text-xs text-blue-600 hover:underline text-right"
                                >
                                    Extend Time
                                </button>
                              )
                             )}
                        </div>

                        <div className="pt-4 border-t border-red-100 mt-6">
                            <button
                                onClick={() => handleAction('reset')}
                                disabled={actionLoading === 'reset'}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold rounded-lg transition-colors"
                            >
                                {actionLoading === 'reset' ? <Loader2 className="animate-spin" size={18} /> : null}
                                End & Clear Tournament Data
                            </button>
                            <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
                                WARNING: This deletes all participants, matches, and rounds to free up database space.<br/>
                                The tournament record is kept for history.
                            </p>
                        </div>
                    </div>
                </div>

                </div>
        </div>
    );
};

export default TournamentControl;
