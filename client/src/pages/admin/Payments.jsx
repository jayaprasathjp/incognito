import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { 
    CheckCircle, DollarSign, Clock, Activity, Users, ShieldCheck, 
    CreditCard, ChevronLeft, ChevronRight, Search, Filter, X 
} from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

function visiblePageItems(current, total, neighbor = 1) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
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

const Payments = () => {
    const { token } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
    const [summary, setSummary] = useState({ totalCollected: 0, completedCount: 0, totalCount: 0 });

    // Filters State
    const [tournaments, setTournaments] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [tournamentFilter, setTournamentFilter] = useState("");

    const fetchTournaments = async () => {
        try {
            const data = await api.get('/tournaments');
            if (Array.isArray(data)) {
                setTournaments(data);
            }
        } catch (error) {
            console.error("Failed to load tournaments", error);
        }
    };

    const fetchPayments = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
                search: searchQuery,
                status: statusFilter,
                tournament_id: tournamentFilter
            });

            const data = await api.get(`/admin/payments?${queryParams.toString()}`);
            if (data.payments) {
                setPayments(data.payments);
                setPagination(prev => ({
                    ...prev,
                    page: data.page,
                    total: data.total
                }));
                if (data.summary) {
                    setSummary(data.summary);
                }
            } else {
                 toast.error(data.error || "Failed to load payments");
            }
        } catch (error) {
            toast.error("Failed to load payments");
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, searchQuery, statusFilter, tournamentFilter]);

    useEffect(() => {
        if (token) {
            fetchTournaments();
            fetchPayments(1);
        }
    }, [token, statusFilter, tournamentFilter]); // Search is handled by button or debounce if preferred, but for now let's just refetch on every filter change

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchPayments(1);
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("");
        setTournamentFilter("");
        fetchPayments(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
    const pageItems = useMemo(() => visiblePageItems(pagination.page, totalPages), [pagination.page, totalPages]);

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight">Payments</h1>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-pulse">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Live</span>
                    </div>
                </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <CreditCard size={40} />
                    </div>
                    <div>
                        <div className="text-[10px] sm:text-sm font-medium text-emerald-100 mb-0.5 sm:mb-1 uppercase tracking-tight">Collected</div>
                        <div className="text-sm sm:text-2xl lg:text-3xl font-black">₦{summary.totalCollected.toLocaleString()}</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm border border-slate-200 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                        <Activity size={40} />
                    </div>
                    <div>
                        <div className="text-[10px] sm:text-sm font-medium text-slate-400 mb-0.5 sm:mb-1 uppercase tracking-tight font-bold">Total</div>
                        <div className="text-sm sm:text-2xl lg:text-3xl font-black text-slate-900">{summary.totalCount}</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm border border-slate-200 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                        <ShieldCheck size={40} />
                    </div>
                    <div>
                        <div className="text-[10px] sm:text-sm font-medium text-slate-400 mb-0.5 sm:mb-1 uppercase tracking-tight font-bold">Rate</div>
                        <div className="text-sm sm:text-2xl lg:text-3xl font-black text-slate-900">
                            {summary.totalCount > 0 ? Math.round((summary.completedCount / summary.totalCount) * 100) : 0}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                <div className="lg:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Search Database</label>
                    <form onSubmit={handleSearchSubmit} className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Search username or reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm group-hover:border-slate-300"
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                onClick={() => { setSearchQuery(""); fetchPayments(1); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </form>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Tournament</label>
                        <select 
                            value={tournamentFilter}
                            onChange={(e) => setTournamentFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="">All Events</option>
                            {tournaments.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Status</label>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <Loader />
                        <p className="mt-4 text-slate-400 animate-pulse font-medium">Syncing transactions...</p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Users size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No transactions match your filters</p>
                        <button 
                            onClick={clearFilters}
                            className="mt-4 text-indigo-500 font-bold text-sm hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Mobile View (Cards) */}
                        <div className="lg:hidden">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction History</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {payments.map(p => (
                                    <div key={p.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <div className="font-bold text-slate-900 leading-tight">{p.username || 'Unknown Player'}</div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <span className="font-mono">{p.reference?.substring(0, 15)}...</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="font-black text-slate-900 text-base">₦{p.amount}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{formatDate(p.created_at)}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center border-t border-slate-50">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-black tracking-widest ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : p.status === 'failed' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                {p.status}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                <span className="font-medium">FLW:</span>
                                                <span className="font-mono text-[9px]">{p.flw_transaction_id || '---'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 pl-6 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Player</th>
                                        <th className="p-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Flutterwave Details</th>
                                        <th className="p-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Amount</th>
                                        <th className="p-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payments.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0 border border-slate-200/50">
                                                        {p.username?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{p.username || 'Unknown'}</div>
                                                        <div className="text-[10px] text-slate-400">ID: {p.id} | Tourney: {p.tournament_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs text-slate-500 font-mono mb-1">{p.reference}</div>
                                                <div className="text-xs flex items-center gap-2 text-[10px]">
                                                    <span className="text-slate-400 uppercase tracking-widest font-black">Date:</span> <span className="font-medium text-slate-700">{formatDate(p.created_at)}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-slate-400 uppercase tracking-widest font-black">FW ID:</span> <span className="font-medium text-slate-700">{p.flw_transaction_id || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-black text-slate-700">₦{p.amount}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-widest inline-flex items-center gap-1.5 ${p.status === 'completed' ? 'bg-emerald-100/50 text-emerald-700 ring-1 ring-emerald-500/20' : p.status === 'failed' ? 'bg-red-100/50 text-red-700 ring-1 ring-red-500/20' : 'bg-amber-100/50 text-amber-700 ring-1 ring-amber-500/20'}`}>
                                                    {p.status === 'completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination Nav */}
                {!loading && totalPages > 1 && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest tabular-nums font-bold">
                            Showing {payments.length} of {pagination.total} records
                        </p>

                        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 max-w-full" aria-label="Pagination">
                            <button
                                type="button"
                                disabled={pagination.page <= 1 || loading}
                                onClick={() => fetchPayments(pagination.page - 1)}
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
                                            type="button"
                                            key={item}
                                            disabled={loading}
                                            onClick={() => fetchPayments(item)}
                                            className={`min-w-[40px] h-10 px-2 rounded-xl font-black text-xs transition-all ${
                                                pagination.page === item
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
                                type="button"
                                disabled={pagination.page >= totalPages || loading}
                                onClick={() => fetchPayments(pagination.page + 1)}
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

export default Payments;
