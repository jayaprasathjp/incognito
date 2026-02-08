import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Play, Pause, Square, Trophy, Settings, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../utils/api";

const TournamentControl = () => {
    const { token } = useAuth();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchTournament = async () => {
        try {
            const data = await api.get('/admin/tournaments/control');
            setTournament(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTournament();
    }, [token]);

    const handleAction = async (action) => {
        if (!confirm(`Are you sure you want to ${action} the tournament?`)) return;
        
        setActionLoading(action);
        try {
            const endpoint = action === 'cycle' ? '/admin/tournaments/cycle' : '/admin/tournaments/control';
            const body = action === 'cycle' ? {} : { action, id: tournament.id };
            
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

    if (!tournament || !tournament.id) return (
        <div className="text-center mt-20">
            <h2 className="text-xl">No Active Tournament Found</h2>
            <button className="mt-4 px-6 py-2 bg-blue-500 rounded-lg">Create New</button>
        </div>
    );

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
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-500">Entry Fee</span>
                            <span className="text-xl font-bold text-slate-900">Free</span>
                        </div>
                         <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-500">Current Round</span>
                            <span className="text-xl font-bold text-blue-600">Round of 16</span>
                        </div>
                         <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-500">Format</span>
                            <span className="text-xl font-bold text-slate-900">{tournament.format}</span>
                        </div>
                    </div>
                    
                    <div className="text-sm text-slate-400 text-center pt-4">
                        Settings are locked while tournament is active.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentControl;
