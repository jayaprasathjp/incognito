import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { Search, Eye, ChevronLeft, ChevronRight, RefreshCw, Users, ShieldCheck, Activity, Trophy, X, Swords, CreditCard } from "lucide-react";
import Loader from "../../components/Loader";
import toast from "react-hot-toast";
import { api } from "../../utils/api";

function visiblePageItems(current, total, neighbor = 1) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([1, total]);
    for (let p = current - neighbor; p <= current + neighbor; p++) {
        if (p >= 1 && p <= total) set.add(p);
    }
    const sorted = [...set].sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const p of sorted) {
        if (prev && p - prev > 1) out.push("ellipsis");
        out.push(p);
        prev = p;
    }
    return out;
}

const PlayerManagement = () => {
    const { token } = useAuth();
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchPlayers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get(`/admin/players?search=${search}`);
            if (Array.isArray(data)) {
                setPlayers(data);
            } else {
                toast.error(data.error || "Failed to load players");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load players");
        } finally {
            setLoading(false);
        }
    }, [search]);

    // Effect to debounce search or just load on mount
    useEffect(() => {
        const timeout = setTimeout(() => {
            setCurrentPage(1); // Reset to page 1 on new search
            fetchPlayers();
        }, 500);
        return () => clearTimeout(timeout);
    }, [search, fetchPlayers, token]);

    // View Player Profile
    const handleViewPlayer = async (id) => {
        setLoading(true);
        try {
            const data = await api.get(`/admin/players/${id}`);
            if (data.profile) {
                setSelectedPlayer(data);
            } else {
                toast.error(data.error || "Failed to load profile");
            }
        } catch (error) {
             toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    }

    const handleBackInfo = () => {
        setSelectedPlayer(null);
    }

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(players.length / itemsPerPage));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPlayers = players.slice(indexOfFirstItem, indexOfLastItem);
    const pageItems = useMemo(() => visiblePageItems(currentPage, totalPages), [currentPage, totalPages]);

    if (selectedPlayer) {
        const { profile, bankDetails, referralStats, recentMatches = [], recentPayments = [] } = selectedPlayer;
        return (
            <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto pb-10 px-2 sm:px-4 lg:px-8">
                <div className="flex items-center gap-4 py-2 border-b border-slate-200 pb-3">
                    <button onClick={handleBackInfo} className="flex items-center justify-center p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Player Profile</h1>
                        <p className="text-slate-500 font-medium text-xs sm:text-sm">Account ID #{profile.id}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Left Column: Info & Bank & Referrals */}
                    <div className="space-y-4 md:space-y-6 lg:col-span-1">
                        {/* Player Info */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl space-y-5 shadow-sm border border-slate-200">
                            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Basic Info</h2>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                                    profile.status === 'banned' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                    {profile.status === 'banned' ? 'Banned' : 'Active'}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Alias</label>
                                    <div className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{profile.username}</div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="overflow-hidden sm:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Email</label>
                                        <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 truncate" title={profile.email}>{profile.email}</div>
                                    </div>
                                    <div className="overflow-hidden">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Phone Number</label>
                                        <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 truncate" title={profile.whatsapp_number}>{profile.whatsapp_number || 'N/A'}</div>
                                    </div>
                                    <div className="overflow-hidden">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Institution</label>
                                        <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 truncate" title={profile.institution}>{profile.institution || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Referral Code */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                                <Users size={48} />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-3 mb-3 z-10 relative">Referrals</h2>
                            <div className="flex justify-between items-center z-10 relative">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Code</div>
                                    <div className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{referralStats.code || 'N/A'}</div>
                                </div>
                                <div className="text-right">
                                     <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Usage Count</div>
                                     <div className="text-2xl font-black text-slate-900 tabular-nums">{referralStats.count}</div>
                                </div>
                            </div>
                        </div>

                        {/* Bank Details */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-3 mb-3">Bank Details</h2>
                            {bankDetails && bankDetails.account_number ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Account Number</label>
                                        <div className="text-sm font-mono font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{bankDetails.account_number}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Bank Name</label>
                                            <div className="text-xs font-bold text-slate-700">{bankDetails.bank_name}</div>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Account Name</label>
                                            <div className="text-xs font-bold text-slate-700 truncate">{bankDetails.account_name}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">No details provided</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Content logs */}
                    <div className="space-y-4 md:space-y-6 lg:col-span-2">
                        {/* Matches Card */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                                <Swords size={18} className="text-emerald-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Recent Matches</h2>
                            </div>
                            {recentMatches.length > 0 ? (
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr>
                                                <th className="p-2 font-semibold text-slate-400 uppercase text-[10px]">Date</th>
                                                <th className="p-2 font-semibold text-slate-400 uppercase text-[10px]">Round</th>
                                                <th className="p-2 font-semibold text-slate-400 uppercase text-[10px]">Status</th>
                                                <th className="p-2 font-semibold text-slate-400 uppercase text-[10px] hidden sm:table-cell">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {recentMatches.map(match => (
                                                <tr key={match.id} className="text-sm hover:bg-slate-50">
                                                    <td className="p-2 text-xs text-slate-500">{new Date(match.created_at).toLocaleDateString()}</td>
                                                    <td className="p-2 font-medium text-slate-700">{match.round}</td>
                                                    <td className="p-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                            match.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                            match.status === 'disputed' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {match.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 font-mono text-xs text-slate-600 hidden sm:table-cell">
                                                        {match.score_player1 !== null ? `${match.score_player1} - ${match.score_player2}` : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border border-dashed border-slate-100 rounded-xl">
                                    No recent matches
                                </div>
                            )}
                        </div>

                        {/* Payments Card */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                                <CreditCard size={18} className="text-blue-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Recent Payments</h2>
                            </div>
                            {recentPayments.length > 0 ? (
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr>
                                                <th className="p-2 font-semibold text-slate-400 uppercase text-[10px]">Date</th>
                                                <th className="p-2 font-semibold text-slate-400 uppercase text-[10px]">Amount</th>
                                                <th className="p-2 font-semibold text-slate-400 uppercase text-[10px]">Status</th>
                                                <th className="hidden sm:table-cell p-2 font-semibold text-slate-400 uppercase text-[10px] text-right">Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {recentPayments.map(payment => (
                                                <tr key={payment.id} className="text-sm hover:bg-slate-50">
                                                    <td className="p-2 text-xs text-slate-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                                                    <td className="p-2 font-medium text-slate-900">₦{Number(payment.amount).toLocaleString()}</td>
                                                    <td className="p-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                            payment.status === 'successful' ? 'bg-emerald-50 text-emerald-600' :
                                                            'bg-amber-50 text-amber-600'
                                                        }`}>
                                                            {payment.status}
                                                        </span>
                                                    </td>
                                                    <td className="hidden sm:table-cell p-2 text-xs font-mono text-slate-400 text-right truncate max-w-[120px]">
                                                        {payment.reference}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border border-dashed border-slate-100 rounded-xl">
                                    No recent payments
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className=" lg:space-y-8 max-w-7xl mx-auto pb-10 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                <div>
                    <h1 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight">Players</h1>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search alias..." 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm hover:border-slate-300 md:min-w-[280px]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button 
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={fetchPlayers}
                        disabled={loading}
                        className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        title="Refresh players"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
                {loading && players.length === 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-2xl">
                        <Loader />
                        <p className="mt-4 text-slate-500 font-medium text-sm animate-pulse">Syncing player data...</p>
                    </div>
                )}
                
                {/* Table View (Responsive) */}
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="p-4 pl-6 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Player</th>
                                <th className="hidden sm:table-cell p-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Email</th>
                                <th className="hidden sm:table-cell p-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Joined</th>
                                <th className="p-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
                                <th className="p-4 pr-6 font-semibold text-slate-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentPlayers.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center text-slate-400 font-medium">No players found matching criteria.</td>
                                </tr>
                            ) : currentPlayers.map((player) => (
                                <tr key={player.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="p-2 pl-2">
                                        <div>
                                            <div className="font-bold text-slate-900">{player.username}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">ID: {player.id}</div>
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell p-2">
                                        <div className="text-sm text-slate-500">{player.email}</div>
                                    </td>
                                    <td className="hidden sm:table-cell p-2">
                                        <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                            {player.created_at ? new Date(player.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-widest inline-flex items-center gap-1.5 ${player.status === 'banned' ? 'bg-red-100/50 text-red-700 ring-1 ring-red-500/20' : 'bg-emerald-100/50 text-emerald-700 ring-1 ring-emerald-500/20'}`}>
                                            {player.status === 'banned' ? 'Banned' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="p-2 pr-2 text-right">
                                        <button 
                                            onClick={() => handleViewPlayer(player.id)}
                                            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 inline-flex"
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && players.length > 0 && totalPages > 1 && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest tabular-nums font-bold">
                            Showing {currentPlayers.length} of {players.length} records
                        </p>
                        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 max-w-full">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {pageItems.map((item, idx) =>
                                    item === "ellipsis" ? (
                                        <span key={`e-${idx}`} className="px-1.5 text-slate-300 select-none">…</span>
                                    ) : (
                                        <button
                                            key={item}
                                            onClick={() => setCurrentPage(item)}
                                            className={`min-w-[40px] h-10 px-2 rounded-xl font-black text-xs transition-all ${
                                                currentPage === item
                                                    ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                                                    : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    )
                                )}
                            </div>

                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerManagement;

