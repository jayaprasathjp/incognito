import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Eye, ChevronLeft, ChevronRight, Filter, RefreshCw, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const STATUS_CONFIG = {
    live: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "LIVE" },
    in_progress: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "IN PROGRESS" },
    completed: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "COMPLETED" },
    scheduled: { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", label: "SCHEDULED" },
    pending: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "PENDING" },
    resolved: { color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", label: "RESOLVED" },
    rejected: { color: "bg-rose-500/10 text-rose-500 border-rose-500/20", label: "REJECTED" },
};

const StatusBadge = memo(function StatusBadge({ status }) {
    const config =
        STATUS_CONFIG[status] || {
            color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
            label: status?.toUpperCase() ?? "—",
        };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border ${config.color}`}>
            {config.label}
        </span>
    );
});

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

const TableSkeleton = memo(function TableSkeleton({ rows = 6 }) {
    return (
        <tbody className="flex flex-col sm:table-row-group divide-y divide-slate-50 animate-pulse">
            {Array.from({ length: rows }, (_, i) => (
                <tr key={i} className="flex flex-col sm:table-row p-3 sm:p-0">
                    <td className="sm:p-5 flex flex-col sm:table-cell w-full space-y-3">
                        <div className="flex justify-between">
                            <div className="h-6 w-24 rounded-full bg-slate-100" />
                            <div className="h-8 w-8 rounded-lg bg-slate-100 sm:hidden" />
                        </div>
                        <div className="h-14 rounded-xl bg-slate-100 sm:h-10 sm:bg-transparent" />
                    </td>
                    <td className="hidden sm:table-cell p-5">
                        <div className="mx-auto h-8 w-20 rounded-full bg-slate-100" />
                    </td>
                    <td className="hidden sm:table-cell p-5">
                        <div className="mx-auto h-6 w-24 rounded-full bg-slate-100" />
                    </td>
                    <td className="hidden sm:table-cell p-5 text-right">
                        <div className="ml-auto h-10 w-10 rounded-xl bg-slate-100" />
                    </td>
                </tr>
            ))}
        </tbody>
    );
});

const MatchRow = memo(function MatchRow({ match: m, onOpen }) {
    return (
        <tr className="flex flex-col sm:table-row hover:bg-slate-50/50 transition-colors group p-3 sm:p-0">
            <td className="sm:p-5 flex flex-col sm:table-cell w-full sm:w-auto">
                <div className="flex items-center justify-between mb-2 sm:mb-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-400 font-mono text-[10px] shrink-0">#{m.id}</span>
                        <span className="sm:hidden">
                            <StatusBadge status={m.status} />
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onOpen(m)}
                        className="sm:hidden p-2 bg-indigo-50 text-indigo-600 rounded-lg active:scale-95 shrink-0"
                        aria-label={`View match ${m.id}`}
                    >
                        <Eye size={16} />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 p-2 rounded-xl sm:bg-transparent sm:border-0 sm:p-0 sm:block">
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-base truncate">{m.p1_name || "TBD"}</div>
                        <span className="text-[8px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Home</span>
                    </div>
                    <div className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono font-black text-indigo-600 text-[10px] sm:hidden shrink-0">
                        {m.score_player1} - {m.score_player2}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <div className="font-bold text-slate-900 text-xs sm:text-base truncate">{m.p2_name || "TBD"}</div>
                        <span className="text-[8px] sm:text-[9px] font-black text-rose-400 uppercase tracking-tighter">Away</span>
                    </div>
                </div>
            </td>

            <td className="hidden sm:table-cell p-5 text-center align-middle">
                <div className="inline-flex items-center justify-center gap-2 bg-slate-50 px-3 py-1 rounded-full font-mono font-black text-slate-700 text-sm border border-slate-100/50">
                    {m.score_player1} <span className="text-slate-300 mx-1">-</span> {m.score_player2}
                </div>
            </td>

            <td className="hidden sm:table-cell p-5 text-center align-middle">
                <StatusBadge status={m.status} />
            </td>

            <td className="hidden sm:table-cell p-5 text-right">
                <button
                    type="button"
                    onClick={() => onOpen(m)}
                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                    aria-label={`View match ${m.id}`}
                >
                    <Eye size={18} />
                </button>
            </td>
        </tr>
    );
});

const Matches = () => {
    const { token } = useAuth();
    const [matches, setMatches] = useState([]);
    const [rounds, setRounds] = useState([]);
    const [selectedRound, setSelectedRound] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
    });
    const [overrideBusy, setOverrideBusy] = useState(false);
    /** 'p1' | 'p2' — which side is awaiting strict confirmation */
    const [pendingOverride, setPendingOverride] = useState(null);

    const matchesAbortRef = useRef(null);
    const openMatchModal = useCallback((m) => setSelectedMatch(m), []);

    const fetchRounds = useCallback(async () => {
        try {
            const data = await api.get("/admin/rounds/current");
            if (Array.isArray(data)) {
                setRounds(data);
                if (data.length > 0) {
                    const generated = data.filter((r) => r.fixtures_generated);
                    if (generated.length > 0) {
                        const latest = generated[generated.length - 1];
                        setSelectedRound(latest.round_number.toString());
                    }
                }
            }
        } catch {
            toast.error("Failed to load rounds");
        }
    }, []);

    const fetchMatches = useCallback(
        async (page = 1) => {
            matchesAbortRef.current?.abort();
            const controller = new AbortController();
            matchesAbortRef.current = controller;

            setLoading(true);
            try {
                let url = `/admin/matches?page=${page}&limit=${pagination.limit}`;
                if (selectedRound) url += `&round=${selectedRound}`;

                const data = await api.get(url, { signal: controller.signal });
                if (data.matches) {
                    setMatches(data.matches);
                    setPagination((prev) => ({
                        ...prev,
                        total: data.total,
                        page: data.page,
                    }));
                }
            } catch (err) {
                if (err?.name === "AbortError") return;
                toast.error("Failed to load matches");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        },
        [selectedRound, pagination.limit]
    );

    useEffect(() => {
        if (token) fetchRounds();
    }, [token, fetchRounds]);

    useEffect(() => {
        if (!selectedRound) return;
        setMatches([]);
        fetchMatches(1);
    }, [selectedRound, fetchMatches]);

    const openOverrideConfirm = (side) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedMatch || overrideBusy) return;
        const winnerId = side === "p1" ? selectedMatch.player1_id : selectedMatch.player2_id;
        if (!winnerId) {
            toast.error("That player slot is not set for this match.");
            return;
        }
        setPendingOverride(side);
    };

    const executeConfirmedOverride = async () => {
        if (!selectedMatch || !pendingOverride || overrideBusy) return;
        const side = pendingOverride;
        const winnerId = side === "p1" ? selectedMatch.player1_id : selectedMatch.player2_id;
        if (!winnerId) {
            setPendingOverride(null);
            return;
        }

        const scoreP1 = side === "p1" ? 3 : 0;
        const scoreP2 = side === "p2" ? 3 : 0;

        setOverrideBusy(true);
        try {
            const data = await api.post(`/admin/matches/${selectedMatch.id}/override`, {
                winner_id: winnerId,
                score_p1: scoreP1,
                score_p2: scoreP2,
            });
            if (data.id) {
                toast.success("Match result recorded");
                setPendingOverride(null);
                setSelectedMatch(null);
                fetchMatches(pagination.page);
            } else {
                toast.error(data.error || "Failed to override");
            }
        } catch {
            toast.error("Failed to override");
        } finally {
            setOverrideBusy(false);
        }
    };

    const handleRematch = async (e) => {
        e.preventDefault();
        try {
            const data = await api.post(`/admin/matches/${selectedMatch.id}/rematch`);
            if (data.message) {
                toast.success("Match has been reset for a rematch.");
                setSelectedMatch(null);
                fetchMatches(pagination.page);
            } else {
                toast.error(data.error || "Failed to reset match");
            }
        } catch {
            toast.error("Failed to reset match");
        }
    };

    const fixtureRounds = useMemo(() => rounds.filter((r) => r.fixtures_generated), [rounds]);

    const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

    const pageItems = useMemo(
        () => visiblePageItems(pagination.page, totalPages),
        [pagination.page, totalPages]
    );

    useEffect(() => {
        if (!selectedMatch) {
            setOverrideBusy(false);
            setPendingOverride(null);
            return;
        }
        const onKey = (e) => {
            if (e.key !== "Escape") return;
            if (overrideBusy) return;
            if (pendingOverride) {
                setPendingOverride(null);
                return;
            }
            setSelectedMatch(null);
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [selectedMatch, pendingOverride, overrideBusy]);

    return (
        <div className="space-y-6 pb-20 px-0 sm:px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-0">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Matches</h1>
                    <p className="text-slate-500 font-medium text-sm sm:text-base">Tournament fixtures & results</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <Filter size={16} aria-hidden />
                            </div>
                            <select
                                value={selectedRound}
                                onChange={(e) => setSelectedRound(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer shadow-sm hover:border-slate-300 sm:min-w-[200px]"
                                aria-label="Filter by round"
                            >
                                <option value="">Select Round</option>
                                {fixtureRounds.map((r) => (
                                    <option key={r.id} value={r.round_number}>
                                        {r.name || `Round ${r.round_number}`}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronRight size={16} className="rotate-90" aria-hidden />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchMatches(pagination.page)}
                            disabled={loading || !selectedRound}
                            className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh data"
                            aria-label="Refresh matches"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-3">Matches</span>
                        <span className="text-sm font-black text-indigo-600 leading-none tabular-nums">{pagination.total}</span>
                    </div>
                </div>
            </div>

            <div className="relative bg-white sm:rounded-3xl shadow-sm border-t border-b sm:border border-slate-200 overflow-hidden mx-0 sm:mx-0">
                {loading && matches.length === 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-3xl">
                        <Loader />
                        <p className="mt-4 text-slate-500 font-medium text-sm">Loading matches…</p>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-auto sm:table">
                        <thead className="hidden sm:table-header-group">
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Match Details</th>
                                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Score</th>
                                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Status</th>
                                <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        {loading && matches.length === 0 ? (
                            <TableSkeleton rows={Math.min(pagination.limit, 8)} />
                        ) : (
                            <tbody className="flex flex-col sm:table-row-group divide-y divide-slate-50">
                                {matches.length === 0 ? (
                                    <tr className="flex sm:table-row">
                                        <td colSpan={4} className="p-10 text-center text-slate-400 font-medium flex-1 sm:table-cell">
                                            No matches found for this round.
                                        </td>
                                    </tr>
                                ) : (
                                    matches.map((m) => <MatchRow key={m.id} match={m} onOpen={openMatchModal} />)
                                )}
                            </tbody>
                        )}
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest tabular-nums">
                            {matches.length} of {pagination.total} records
                        </p>

                        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 max-w-full" aria-label="Pagination">
                            <button
                                type="button"
                                disabled={pagination.page <= 1 || loading}
                                onClick={() => fetchMatches(pagination.page - 1)}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex items-center gap-1">
                                {pageItems.map((item, idx) =>
                                    item === "ellipsis" ? (
                                        <span key={`e-${idx}`} className="px-1.5 text-slate-300 select-none" aria-hidden>
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            key={item}
                                            disabled={loading}
                                            onClick={() => fetchMatches(item)}
                                            className={`min-w-[40px] h-10 px-2 rounded-xl font-black text-xs transition-all ${
                                                pagination.page === item
                                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}
                                            aria-label={`Page ${item}`}
                                            aria-current={pagination.page === item ? "page" : undefined}
                                        >
                                            {item}
                                        </button>
                                    )
                                )}
                            </div>

                            <button
                                type="button"
                                disabled={pagination.page >= totalPages || loading}
                                onClick={() => fetchMatches(pagination.page + 1)}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                                aria-label="Next page"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {selectedMatch && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="match-modal-title"
                    onClick={() => {
                        if (overrideBusy) return;
                        if (pendingOverride) setPendingOverride(null);
                        else setSelectedMatch(null);
                    }}
                >
                    <div
                        className="bg-white max-w-md w-full p-5 sm:p-6 rounded-[24px] relative shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[min(90vh,640px)] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3 mb-5">
                            <div className="min-w-0">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Match Details</span>
                                <h2 id="match-modal-title" className="text-xl font-black text-slate-900">
                                    # {selectedMatch.id}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (pendingOverride) setPendingOverride(null);
                                    else setSelectedMatch(null);
                                }}
                                disabled={overrideBusy}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0 text-slate-500 disabled:opacity-50"
                                aria-label={pendingOverride ? "Cancel confirmation" : "Close"}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5">
                            <div className="flex items-stretch justify-between gap-2 sm:gap-3">
                                <div className="flex-1 text-center min-w-0 flex flex-col">
                                    <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Home</div>
                                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2 font-black text-sm uppercase shrink-0">
                                        {selectedMatch.p1_name?.[0] || "T"}
                                    </div>
                                    <div className="font-bold text-slate-900 text-xs truncate px-0.5">{selectedMatch.p1_name || "TBD"}</div>
                                    <button
                                        type="button"
                                        disabled={overrideBusy || !!pendingOverride || !selectedMatch.player1_id}
                                        onClick={openOverrideConfirm("p1")}
                                        className="mt-2 mx-auto px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed max-w-full"
                                    >
                                        Report win
                                    </button>
                                </div>

                                <div className="px-2 sm:px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm self-center shrink-0 flex flex-col justify-center">
                                    <div className="text-2xl font-black text-indigo-600 font-mono tracking-tighter tabular-nums">
                                        {selectedMatch.score_player1} - {selectedMatch.score_player2}
                                    </div>
                                </div>

                                <div className="flex-1 text-center min-w-0 flex flex-col">
                                    <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1">Away</div>
                                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-2 font-black text-sm uppercase shrink-0">
                                        {selectedMatch.p2_name?.[0] || "T"}
                                    </div>
                                    <div className="font-bold text-slate-900 text-xs truncate px-0.5">{selectedMatch.p2_name || "TBD"}</div>
                                    <button
                                        type="button"
                                        disabled={overrideBusy || !!pendingOverride || !selectedMatch.player2_id}
                                        onClick={openOverrideConfirm("p2")}
                                        className="mt-2 mx-auto px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed max-w-full"
                                    >
                                        Report win
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-center">
                                <StatusBadge status={selectedMatch.status} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">Winner</span>
                                <span
                                    className={`font-black uppercase text-[10px] truncate block ${
                                        selectedMatch.winner_id ? "text-emerald-500" : "text-slate-400"
                                    }`}
                                >
                                    {selectedMatch.winner_id
                                        ? selectedMatch.winner_id === selectedMatch.player1_id
                                            ? selectedMatch.p1_name
                                            : selectedMatch.p2_name
                                        : "PENDING"}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">Round</span>
                                <span className="font-black text-slate-900 text-[10px] italic block tabular-nums"># {selectedMatch.round}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={overrideBusy || !!pendingOverride}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRematch(e);
                            }}
                            className="w-full py-3 bg-white border border-slate-200 text-amber-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Rematch
                        </button>

                        {pendingOverride && (
                            <div
                                className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/75 rounded-[24px]"
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="override-confirm-title"
                                aria-describedby="override-confirm-desc"
                                onClick={() => !overrideBusy && setPendingOverride(null)}
                            >
                                <div
                                    className="bg-white w-full max-w-sm rounded-2xl border-2 border-amber-200 shadow-xl p-5 sm:p-6"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex gap-3 mb-4">
                                        <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                                            <AlertTriangle className="w-5 h-5" aria-hidden />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 id="override-confirm-title" className="text-sm font-black text-slate-900 leading-tight">
                                                Confirm admin override
                                            </h3>
                                            <p id="override-confirm-desc" className="mt-2 text-xs text-slate-600 leading-relaxed">
                                                You are about to <strong className="text-slate-900">permanently set the result</strong> for match #
                                                {selectedMatch.id} to{" "}
                                                <strong className="text-slate-900 tabular-nums">
                                                    {pendingOverride === "p1" ? "3 – 0" : "0 – 3"}
                                                </strong>
                                                , with{" "}
                                                <strong className="text-slate-900 break-words">
                                                    {pendingOverride === "p1"
                                                        ? selectedMatch.p1_name || "Home"
                                                        : selectedMatch.p2_name || "Away"}
                                                </strong>{" "}
                                                as winner. This should not be done by mistake.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                                        <button
                                            type="button"
                                            disabled={overrideBusy}
                                            onClick={() => setPendingOverride(null)}
                                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={overrideBusy}
                                            onClick={executeConfirmedOverride}
                                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-amber-700 shadow-md disabled:opacity-50"
                                        >
                                            {overrideBusy ? "Saving…" : "Yes, apply result"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matches;
