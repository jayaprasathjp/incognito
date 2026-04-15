import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Eye, ChevronLeft, ChevronRight, Filter, RefreshCw, X, Trophy, Image } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const STATUS_CONFIG = {
    live:           { color: "bg-red-500/10 text-red-500 border-red-500/20",       label: "LIVE" },
    in_progress:    { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "IN PROGRESS" },
    completed:      { color: "bg-blue-500/10 text-blue-500 border-blue-500/20",    label: "COMPLETED" },
    scheduled:      { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", label: "SCHEDULED" },
    pending:        { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "PENDING" },
    pending_review: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: "UNDER REVIEW" },
    resolved:       { color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", label: "RESOLVED" },
    rejected:       { color: "bg-rose-500/10 text-rose-500 border-rose-500/20",    label: "REJECTED" },
    cancelled:      { color: "bg-slate-400/10 text-slate-400 border-slate-400/20", label: "CANCELLED" },
};

const StatusBadge = memo(function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || {
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
                    <td className="hidden sm:table-cell p-5"><div className="mx-auto h-8 w-20 rounded-full bg-slate-100" /></td>
                    <td className="hidden sm:table-cell p-5"><div className="mx-auto h-6 w-24 rounded-full bg-slate-100" /></td>
                    <td className="hidden sm:table-cell p-5 text-right"><div className="ml-auto h-10 w-10 rounded-xl bg-slate-100" /></td>
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
                        <span className="sm:hidden"><StatusBadge status={m.status} /></span>
                    </div>
                    <button type="button" onClick={() => onOpen(m)}
                        className="sm:hidden p-2 bg-indigo-50 text-indigo-600 rounded-lg active:scale-95 shrink-0">
                        <Eye size={16} />
                    </button>
                </div>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 p-2 rounded-xl sm:bg-transparent sm:border-0 sm:p-0 sm:block">
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-base truncate">{m.p1_name || "TBD"}</div>
                        <span className="text-[8px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Home</span>
                    </div>
                    <div className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono font-black text-indigo-600 text-[10px] sm:hidden shrink-0">
                        {m.score_player1 ?? "—"} - {m.score_player2 ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <div className="font-bold text-slate-900 text-xs sm:text-base truncate">{m.p2_name || "TBD"}</div>
                        <span className="text-[8px] sm:text-[9px] font-black text-rose-400 uppercase tracking-tighter">Away</span>
                    </div>
                </div>
            </td>
            <td className="hidden sm:table-cell p-5 text-center align-middle">
                <div className="inline-flex items-center justify-center gap-2 bg-slate-50 px-3 py-1 rounded-full font-mono font-black text-slate-700 text-sm border border-slate-100/50">
                    {m.score_player1 ?? "—"} <span className="text-slate-300 mx-1">-</span> {m.score_player2 ?? "—"}
                </div>
            </td>
            <td className="hidden sm:table-cell p-5 text-center align-middle"><StatusBadge status={m.status} /></td>
            <td className="hidden sm:table-cell p-5 text-right">
                <button type="button" onClick={() => onOpen(m)}
                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90">
                    <Eye size={18} />
                </button>
            </td>
        </tr>
    );
});

/* ── Proof image with inline preview ── */
const ProofImage = ({ url, label }) => {
    const [open, setOpen] = useState(false);
    if (!url) return <p className="text-xs text-slate-400 italic">No screenshot</p>;
    return (
        <>
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                <Image size={12} /> {label || "View screenshot"}
            </button>
            {open && (
                <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
                    <img src={url} alt="Proof screenshot" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
                </div>
            )}
        </>
    );
};

const Matches = () => {
    const { token } = useAuth();
    const [matches, setMatches] = useState([]);
    const [rounds, setRounds] = useState([]);
    const [selectedRound, setSelectedRound] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });

    const matchesAbortRef = useRef(null);
    const openMatchModal = useCallback((m) => setSelectedMatch(m), []);

    const fetchRounds = useCallback(async () => {
        try {
            const data = await api.get("/admin/rounds/current");
            if (Array.isArray(data)) {
                setRounds(data);
                const generated = data.filter((r) => r.fixtures_generated);
                if (generated.length > 0) {
                    setSelectedRound(generated[generated.length - 1].round_number.toString());
                }
            }
        } catch { toast.error("Failed to load rounds"); }
    }, []);

    const fetchMatches = useCallback(async (page = 1) => {
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
                setPagination((prev) => ({ ...prev, total: data.total, page: data.page }));
            }
        } catch (err) {
            if (err?.name === "AbortError") return;
            toast.error("Failed to load matches");
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [selectedRound, pagination.limit]);

    useEffect(() => { if (token) fetchRounds(); }, [token, fetchRounds]);
    useEffect(() => {
        if (!selectedRound) return;
        setMatches([]);
        fetchMatches(1);
    }, [selectedRound, fetchMatches]);

    useEffect(() => {
        if (!selectedMatch) return;
        const onKey = (e) => { if (e.key === "Escape") setSelectedMatch(null); };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    }, [selectedMatch]);

    const fixtureRounds = useMemo(() => rounds.filter((r) => r.fixtures_generated), [rounds]);
    const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
    const pageItems = useMemo(() => visiblePageItems(pagination.page, totalPages), [pagination.page, totalPages]);

    /* ── Derive winner info ── */
    const winnerName = selectedMatch
        ? selectedMatch.winner_id === selectedMatch.player1_id ? selectedMatch.p1_name
          : selectedMatch.winner_id === selectedMatch.player2_id ? selectedMatch.p2_name
          : null
        : null;
    const winnerProof = selectedMatch
        ? selectedMatch.winner_id === selectedMatch.player1_id ? selectedMatch.p1_proof
          : selectedMatch.winner_id === selectedMatch.player2_id ? selectedMatch.p2_proof
          : null
        : null;

    return (
        <div className="space-y-6 pb-20 px-0 sm:px-4">
            {/* Header */}
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
                            <select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer shadow-sm hover:border-slate-300 sm:min-w-[200px]">
                                <option value="">Select Round</option>
                                {fixtureRounds.map((r) => (
                                    <option key={r.id} value={r.round_number}>{r.name || `Round ${r.round_number}`}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronRight size={16} className="rotate-90" aria-hidden />
                            </div>
                        </div>
                        <button type="button" onClick={() => fetchMatches(pagination.page)}
                            disabled={loading || !selectedRound}
                            className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh data">
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-3">Matches</span>
                        <span className="text-sm font-black text-indigo-600 leading-none tabular-nums">{pagination.total}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="relative bg-white sm:rounded-3xl shadow-sm border-t border-b sm:border border-slate-200 overflow-hidden">
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
                        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 max-w-full">
                            <button type="button" disabled={pagination.page <= 1 || loading}
                                onClick={() => fetchMatches(pagination.page - 1)}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center gap-1">
                                {pageItems.map((item, idx) =>
                                    item === "ellipsis" ? (
                                        <span key={`e-${idx}`} className="px-1.5 text-slate-300 select-none">…</span>
                                    ) : (
                                        <button type="button" key={item} disabled={loading}
                                            onClick={() => fetchMatches(item)}
                                            className={`min-w-[40px] h-10 px-2 rounded-xl font-black text-xs transition-all ${
                                                pagination.page === item
                                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}>
                                            {item}
                                        </button>
                                    )
                                )}
                            </div>
                            <button type="button" disabled={pagination.page >= totalPages || loading}
                                onClick={() => fetchMatches(pagination.page + 1)}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm">
                                <ChevronRight size={20} />
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {/* Match Detail Modal */}
            {selectedMatch && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]"
                    onClick={() => setSelectedMatch(null)}>
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-[24px] shadow-2xl overflow-y-auto max-h-[92vh]"
                        onClick={(e) => e.stopPropagation()}>

                        {/* Sheet handle for mobile */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-300 rounded-full" />
                        </div>

                        <div className="p-5 sm:p-6 space-y-5">
                            {/* Title bar */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Match Details</span>
                                    <h2 className="text-xl font-black text-slate-900">#{selectedMatch.id}</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {selectedMatch.match_date ? new Date(selectedMatch.match_date).toLocaleDateString() : "—"}
                                        {selectedMatch.match_time ? ` @ ${selectedMatch.match_time.slice(0, 5)}` : ""}
                                        {" · "}Round {selectedMatch.round}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setSelectedMatch(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0 text-slate-500">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Players & Score */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="flex items-stretch justify-between gap-3">
                                    {/* Player 1 */}
                                    <div className="flex-1 text-center min-w-0 flex flex-col">
                                        <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Home</div>
                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2 font-black text-sm uppercase">
                                            {selectedMatch.p1_name?.[0] || "?"}
                                        </div>
                                        <div className={`font-bold text-xs truncate px-0.5 ${selectedMatch.winner_id === selectedMatch.player1_id ? "text-emerald-600" : "text-slate-900"}`}>
                                            {selectedMatch.p1_name || "TBD"}
                                            {selectedMatch.winner_id === selectedMatch.player1_id && " 🏆"}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm self-center shrink-0 flex flex-col justify-center text-center">
                                        <div className="text-2xl font-black text-indigo-600 font-mono tracking-tighter tabular-nums">
                                            {selectedMatch.score_player1 ?? "—"} - {selectedMatch.score_player2 ?? "—"}
                                        </div>
                                        {selectedMatch.match_code && selectedMatch.match_code !== "NORMAL" && (
                                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{selectedMatch.match_code.replace(/_/g, " ")}</div>
                                        )}
                                    </div>

                                    {/* Player 2 */}
                                    <div className="flex-1 text-center min-w-0 flex flex-col">
                                        <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1">Away</div>
                                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-2 font-black text-sm uppercase">
                                            {selectedMatch.p2_name?.[0] || "?"}
                                        </div>
                                        <div className={`font-bold text-xs truncate px-0.5 ${selectedMatch.winner_id === selectedMatch.player2_id ? "text-emerald-600" : "text-slate-900"}`}>
                                            {selectedMatch.p2_name || "TBD"}
                                            {selectedMatch.winner_id === selectedMatch.player2_id && " 🏆"}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-center">
                                    <StatusBadge status={selectedMatch.status} />
                                </div>
                            </div>

                            {/* Winner panel — only when completed */}
                            {selectedMatch.status === "completed" && selectedMatch.winner_id && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={16} className="text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Winner</p>
                                            <p className="font-black text-slate-900 text-sm">{winnerName || "—"}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Winner's Proof Screenshot</p>
                                        <ProofImage url={winnerProof} label="View winner's screenshot" />
                                    </div>
                                    {/* Both proofs if they differ — for admin comparison */}
                                    {selectedMatch.p1_proof && selectedMatch.p2_proof && (
                                        <div className="border-t border-emerald-200 pt-3 space-y-1.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">All submitted proofs</p>
                                            <div className="flex flex-col gap-1.5">
                                                <ProofImage url={selectedMatch.p1_proof} label={`${selectedMatch.p1_name}'s screenshot`} />
                                                <ProofImage url={selectedMatch.p2_proof} label={`${selectedMatch.p2_name}'s screenshot`} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Under review info */}
                            {selectedMatch.status === "pending_review" && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">⚖️ Under Admin Review</p>
                                    <p className="text-xs text-amber-700">This match has an active dispute. Resolve it from the Disputes page.</p>
                                    <div className="flex flex-col gap-1.5">
                                        {selectedMatch.p1_proof && <ProofImage url={selectedMatch.p1_proof} label={`${selectedMatch.p1_name}'s screenshot`} />}
                                        {selectedMatch.p2_proof && <ProofImage url={selectedMatch.p2_proof} label={`${selectedMatch.p2_name}'s screenshot`} />}
                                    </div>
                                </div>
                            )}

                            {/* Extra match info */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">Room Code</span>
                                    <span className="font-black text-slate-900 text-[11px] font-mono">{selectedMatch.game_room_code || "—"}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">Match Time</span>
                                    <span className="font-black text-slate-900 text-[11px]">{selectedMatch.match_time?.slice(0, 5) || "—"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matches;
