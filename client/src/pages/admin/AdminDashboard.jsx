import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import { Users, Trophy, Swords, AlertTriangle, ChevronRight, DollarSign, Plus } from "lucide-react";
import Loader from "../../components/Loader";

const AdminDashboard = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Use the centralized api utility which handles headers and base URL
                const data = await api.get('/admin/stats');
                setStats(data);
            } catch (error) {
                console.error("Error fetching admin stats:", error);
                // If 403/401, maybe redirect or show specific error?
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    if (loading) return <div className="flex justify-center mt-20"><Loader /></div>;
    if (!stats) return <div className="text-center mt-20 text-slate-500">Failed to load dashboard</div>;

    const statCards = [
        { label: "Total Participants", value: stats.tournament?.participants || 0, icon: <Users className="text-blue-600" />, bg: "bg-blue-50", border: "border-blue-100" },
        { label: (stats.tournament?.status === 'scheduled' || stats.tournament?.status === 'open') ? "Matches (Scheduled)" : `Matches (Round ${stats.tournament?.currentRound || 1})`, value: stats.tournament?.roundMatches || 0, icon: <Swords className="text-purple-600" />, bg: "bg-purple-50", border: "border-purple-100" },
        { label: "Prize Pool", value: `₦${stats.prizePool?.toLocaleString() || 0}`, icon: <Trophy className="text-yellow-600" />, bg: "bg-yellow-50", border: "border-yellow-100" },
        { label: "Pending Issues", value: (stats.pendingIssues?.disputes || 0), icon: <AlertTriangle className="text-red-600" />, bg: "bg-red-50", border: "border-red-100" },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {statCards.map((card, index) => (
                    <div key={index} className={`p-4 md:p-6 rounded-2xl border ${card.bg} ${card.border} shadow-sm flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="p-2 md:p-3 bg-white rounded-xl shadow-sm">
                                {card.icon}
                            </div>
                            <span className="text-xl md:text-3xl font-bold text-slate-900">{card.value}</span>
                        </div>
                        <p className="text-xs md:text-base text-slate-600 font-medium">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Tournament Status (Now full width and on top) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                    <Trophy className="text-yellow-500" size={20} />
                    Tournament Status
                </h2>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    {stats.tournament?.status === 'None' ? (
                        <div className="text-center py-4">
                            <h3 className="text-lg font-black text-slate-900 mb-1">No Active Tournament</h3>
                            <p className="text-sm text-slate-500 mb-6">Create a new tournament to get started</p>
                            <Link to="/admin/tournament" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/25">
                                <Plus size={18} />
                                Create Tournament
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-slate-900 mb-2">{stats.tournament?.title || 'No Tournament'}</h3>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        stats.tournament?.status === 'active' ? 'bg-green-100 text-green-700' : 
                                        stats.tournament?.status === 'open' ? 'bg-blue-100 text-blue-700' : 
                                        'bg-slate-200 text-slate-600'
                                    }`}>
                                        {stats.tournament?.status || 'Inactive'}
                                    </span>
                                    <span className="text-slate-500 font-medium text-sm">
                                        {(() => {
                                            const t = stats.tournament;
                                            if (t?.status === 'active') return `Round ${t.currentRound} in progress`;
                                            if (t?.status === 'paused') return 'Tournament paused';
                                            if (t?.status === 'completed') return 'Tournament completed';
                                            const now = new Date();
                                            const regStart = t?.registration_start ? new Date(t.registration_start) : null;
                                            const regEnd = t?.registration_end ? new Date(t.registration_end) : null;
                                            if (regStart && now < regStart) return 'Registration not started';
                                            if (regEnd && now > regEnd) return 'Schedule rounds';
                                            if (regStart && regEnd) return 'Registration ongoing';
                                            return 'Awaiting setup';
                                        })()}
                                    </span>
                                </div>
                            </div>
                            <Link to="/admin/tournament" className="py-3 px-8 text-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-lg whitespace-nowrap">
                                Manage Tournament
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Alerts Section (Below Tournament Status) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                    <AlertTriangle className="text-orange-500" size={20} />
                    Alerts & Notifications
                </h2>
                
                <div className="space-y-4">
                    {stats.pendingIssues?.disputes > 0 ? (
                        <Link 
                            to="/admin/disputes" 
                            className="flex items-center justify-between p-4 rounded-xl border bg-red-50 border-red-100 hover:bg-red-100 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="font-bold text-red-700">
                                    {stats.pendingIssues.disputes} Unresolved {stats.pendingIssues.disputes === 1 ? 'Dispute' : 'Disputes'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest">
                                View All
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={16} />
                            </div>
                        </Link>
                    ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-slate-500 text-sm text-center font-medium border border-dashed border-slate-200">
                            No pending alerts. All caught up!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
