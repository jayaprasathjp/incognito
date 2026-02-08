import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import { Users, Trophy, Swords, AlertTriangle, ChevronRight, DollarSign } from "lucide-react";
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
        { label: `Matches (Round ${stats.tournament?.currentRound || 1})`, value: stats.tournament?.roundMatches || 0, icon: <Swords className="text-purple-600" />, bg: "bg-purple-50", border: "border-purple-100" },
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

            {/* Alerts / Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                        <AlertTriangle className="text-orange-500" size={20} />
                        Alerts & Notifications
                    </h2>
                    
                    <div className="space-y-4">
                        {stats.alerts && stats.alerts.length > 0 ? (
                            stats.alerts.map((alert, idx) => (
                                <Link 
                                    key={`${alert.type}-${alert.id}`} 
                                    to={alert.type === 'dispute' ? '/admin/disputes' : '/admin/payments'} 
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors group ${alert.type === 'dispute' ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {alert.type === 'dispute' ? (
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        ) : (
                                            <DollarSign className="text-blue-600" size={16} />
                                        )}
                                        <span className={`font-medium ${alert.type === 'dispute' ? 'text-red-700' : 'text-blue-700'}`}>
                                            {alert.type === 'dispute' ? `Pending Dispute #${alert.id}` : `Pending Payout #${alert.id}`}
                                        </span>
                                    </div>
                                    <ChevronRight className={`${alert.type === 'dispute' ? 'text-red-400' : 'text-blue-400'} group-hover:translate-x-1 transition-transform`} size={20} />
                                </Link>
                            ))
                        ) : (
                            <div className="p-4 bg-slate-50 rounded-xl text-slate-500 text-sm text-center">
                                No new alerts. All caught up!
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions / Tournament Status */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                        <Trophy className="text-yellow-500" size={20} />
                        Tournament Status
                    </h2>
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h3 className="text-lg font-black text-slate-900 mb-4">{stats.tournament?.title || 'No Tournament'}</h3>
                        
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 font-medium">Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                stats.tournament?.status === 'active' ? 'bg-green-100 text-green-700' : 
                                stats.tournament?.status === 'open' ? 'bg-blue-100 text-blue-700' : 
                                'bg-slate-200 text-slate-600'
                            }`}>
                                {stats.tournament?.status || 'Inactive'}
                            </span>
                        </div>
                         <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                            <span className="text-slate-500 font-medium">Current Round</span>
                            <span className="font-bold text-slate-900">Round {stats.tournament?.currentRound || 1}</span>
                        </div>
                         <Link to="/admin/tournament" className="mt-6 block w-full py-3 text-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-lg">
                            Manage Tournament
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
