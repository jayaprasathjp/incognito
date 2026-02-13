import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Play, Pause, Square, Trophy, Settings, Loader2, Calendar, DollarSign, Users, Clock, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../utils/api";
import { format } from "date-fns";

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

    const estimatedPrizePool = (formData.capacity || 0) * (formData.entry_fee || 0);
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

        // Calculate start and end times based on selected dates
        // Start: 00:00 on Start Date
        // End: 00:00 on End Date
        const startDate = new Date(formData.start_date);
        startDate.setHours(0, 0, 0, 0); 

        const endDate = new Date(formData.end_date);
        endDate.setHours(0, 0, 0, 0); 

        try {
            const data = await api.post('/tournaments', {
                title: formData.title,
                capacity: formData.capacity,
                entry_fee: formData.entry_fee,
                registration_start: startDate.toISOString(),
                registration_end: endDate.toISOString()
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
                                <label className="text-sm font-medium text-slate-700">Tournament Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Winter Championship 2024"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Start Date</label>
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
                                        <label className="text-sm font-medium text-slate-700">End Date</label>
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
                                <p className="text-xs text-slate-500">Tournament runs from 12:00 AM Start Date to 12:00 AM End Date.</p>
                            </div>

                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Entry Fee (₦)</label>
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
                                    <label className="text-sm font-medium text-slate-700">Total Capacity</label>
                                    <select 
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.capacity}
                                        onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                                    >
                                        {[2048, 1024, 512, 256, 128, 64].map(cap => (
                                            <option key={cap} value={cap}>{cap} Players</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Prize Pool</span>
                                <div className="text-2xl font-bold text-green-600">₦{estimatedPrizePool.toLocaleString()}</div>
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
                <div className="bg-white p-8 rounded-2xl flex flex-col items-center text-center space-y-8 shadow-sm border border-slate-200">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-100">
                        <Trophy size={48} className="text-white" />
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-slate-900">{tournament.title}</h2>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                            tournament.status === 'active' ? 'bg-green-100 text-green-700' :
                            tournament.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            tournament.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                            {tournament.status}
                        </span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        {tournament.status === 'open' && (
                            <button 
                                onClick={() => handleAction('start')}
                                disabled={!!actionLoading}
                                className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl flex flex-col items-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                                {actionLoading === 'start' ? <Loader2 className="animate-spin" size={24} /> : <><Play size={24} /> Start Tournament</>}
                            </button>
                        )}
                        
                        {tournament.status === 'active' && (
                             <button 
                                onClick={() => handleAction('pause')}
                                disabled={!!actionLoading}
                                className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-bold rounded-xl flex flex-col items-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                                {actionLoading === 'pause' ? <Loader2 className="animate-spin" size={24} /> : <><Pause size={24} /> Pause Tournament</>}
                            </button>
                        )}

                        {tournament.status === 'paused' && (
                             <button 
                                onClick={() => handleAction('resume')}
                                disabled={!!actionLoading}
                                className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl flex flex-col items-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                                {actionLoading === 'resume' ? <Loader2 className="animate-spin" size={24} /> : <><Play size={24} /> Resume Tournament</>}
                            </button>
                        )}

                        {['active', 'paused'].includes(tournament.status) && (
                            <button 
                                onClick={() => handleAction('end')}
                                disabled={!!actionLoading}
                                className="flex-1 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl flex flex-col items-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                                {actionLoading === 'end' ? <Loader2 className="animate-spin" size={24} /> : <><Square size={24} /> End Tournament</>}
                            </button>
                        )}

                        {tournament.status === 'completed' && (
                            <button 
                                onClick={() => handleAction('cycle')}
                                disabled={!!actionLoading}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl flex flex-col items-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                                {actionLoading === 'cycle' ? <Loader2 className="animate-spin" size={24} /> : <><Play size={24} /> Next Tournament</>}
                            </button>
                        )}
                    </div>
                </div>

                {/* Settings Display */}
                <div className="bg-white p-8 rounded-2xl space-y-6 shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold flex items-center gap-2 border-b border-slate-100 pb-4 text-slate-900">
                        <Settings size={20} className="text-slate-400" /> Configuration
                    </h2>
                    
                    <div className="space-y-3">
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
                                <span className="text-slate-500">Registration Ends</span>
                                <span className="font-medium">
                                    {tournament.registration_end ? format(new Date(tournament.registration_end), "PP") : "Not Set"}
                                </span>
                             </div>
                             
                             {showExtend ? (
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
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentControl;
