import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { Gavel, CheckCircle, RefreshCw, XCircle, ChevronDown, ChevronUp, Search, ArrowUpDown, Clock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

// Build time slots from current time (rounded up to next :00/:30) up to 21:00
function buildTimeSlots() {
    const now = new Date();
    const slots = [];
    const startH = now.getHours();
    const startM = now.getMinutes() < 30 ? 30 : 60;
    let h = startM === 60 ? startH + 1 : startH;
    let m = startM === 60 ? 0 : 30;
    if (h < 10) { h = 10; m = 30; }
    while (h < 21 || (h === 21 && m === 0)) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const val = `${hh}:${mm}`;
        const label = new Date(`1970-01-01T${val}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        slots.push({ val, label });
        m += 30;
        if (m >= 60) { m = 0; h++; }
    }
    return slots;
}

function useCountdown(respondBy) {
    const [secs, setSecs] = useState(null);
    useEffect(() => {
        if (!respondBy) { setSecs(null); return; }
        const target = new Date(respondBy).getTime();
        const tick = () => setSecs(Math.max(0, Math.floor((target - Date.now()) / 1000)));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [respondBy]);
    return secs;
}

const STATUS_COLOR = {
    pending:        "bg-orange-100 text-orange-700 border-orange-200",
    awaiting_admin: "bg-amber-100 text-amber-800 border-amber-200",
    resolved:       "bg-purple-100 text-purple-700 border-purple-200",
    rejected:       "bg-red-100 text-red-700 border-red-200",
};

const CATEGORY_LABEL = {
    connection_issues: "Connection Issues",
    rule_violation:    "Rule Violation",
    others:            "Others",
};

const ACTIONS = [
    { key: "winner_updated",       label: "Winner Updated",  sub: "Manually set the winner & scores",      icon: <CheckCircle size={18} />, ring: "ring-green-500", bg: "bg-green-50 border-green-200 text-green-800" },
    { key: "dispute_rejected",     label: "Double Disqualification",  sub: "Disqualify both players & cancel match",  icon: <XCircle size={18} />,     ring: "ring-red-500",   bg: "bg-red-50 border-red-200 text-red-800" },
    { key: "match_replay_scheduled", label: "Match Replay",  sub: "Fresh rematch at a new time today",     icon: <RefreshCw size={18} />,   ring: "ring-blue-500",  bg: "bg-blue-50 border-blue-200 text-blue-800" },
];

/* ── Helpers ── */
const ScorePill = ({ label, score }) => (
    <div className="flex flex-col items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 min-w-[54px]">
        <span className="text-lg font-black text-slate-900">{score ?? "—"}</span>
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
);

const InlineScreenshots = ({ urls, onView }) => {
    const list = Array.isArray(urls) ? urls : (urls ? [urls] : []);
    if (!list.length) return <p className="text-xs text-slate-400 italic">No screenshots</p>;
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {list.map((u, i) => (
                <div key={i} onClick={() => onView?.(u)} className="cursor-pointer group relative">
                    <img src={u} alt={`Screenshot ${i + 1}`}
                        className="h-16 w-24 object-cover rounded-lg border border-slate-200 hover:border-slate-400 transition-all shadow-sm" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center">
                        <Search size={14} className="text-white drop-shadow-md" />
                    </div>
                </div>
            ))}
        </div>
    );
};

const FullScreenViewer = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
             onClick={onClose}>
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 right-4 p-3 bg-white/20 active:bg-white/40 text-white rounded-full transition-all z-[100000] shadow-xl border border-white/10"
                aria-label="Close"
            >
                <XCircle size={28} />
            </button>
            <div className="w-full h-full flex items-center justify-center p-2 pointer-events-none">
                <img 
                    src={imageUrl} 
                    alt="Proof" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-auto"
                    style={{ WebkitUserDrag: 'none' }}
                />
            </div>
            <p className="fixed bottom-10 left-0 right-0 text-center text-white/40 text-[10px] uppercase font-bold tracking-[0.2em] pointer-events-none drop-shadow-md">
                Tap anywhere to close
            </p>
        </div>,
        document.body
    );
};

const CountdownBadge = ({ respondBy }) => {
    const secs = useCountdown(respondBy);
    if (secs === null) return null;
    const expired = secs === 0;
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return (
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${expired ? "bg-red-100 text-red-700 border-red-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
            <Clock size={10} />
            {expired ? "Expired" : `${mins}m ${String(s).padStart(2, "0")}s`}
        </span>
    );
};

/* ── Main component ── */
const Disputes = () => {
    const { token } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("unresolved");
    const [sortOrder, setSortOrder] = useState("desc");
    const [selected, setSelected] = useState(null);
    const [expanded, setExpanded] = useState(null);

    // resolve form
    const [activeAction, setActiveAction] = useState(null);
    const [adminWinnerId, setAdminWinnerId] = useState("");
    const [adminS1, setAdminS1] = useState("");
    const [adminS2, setAdminS2] = useState("");
    const [timeSlots, setTimeSlots] = useState([]);
    const [rematchTime, setRematchTime] = useState("");
    const [adminNotes, setAdminNotes] = useState("");
    const [adminReason, setAdminReason] = useState("");
    const [viewerImage, setViewerImage] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    // player history cache  { [userId]: { total, disputes } }
    const [historyCache, setHistoryCache] = useState({});

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const data = await api.get("/admin/disputes");
            if (Array.isArray(data)) setDisputes(data);
        } catch { toast.error("Failed to load disputes"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDisputes(); }, [token]);

    // Fetch history for a player (cached)
    const fetchHistory = useCallback(async (userId) => {
        if (!userId || historyCache[userId] !== undefined) return;
        setHistoryCache(c => ({ ...c, [userId]: null })); // mark loading
        try {
            const data = await api.get(`/admin/player-disputes/${userId}`);
            setHistoryCache(c => ({ ...c, [userId]: data }));
        } catch { /* silent */ }
    }, [historyCache]);

    // Pre-fetch history for visible disputes' submitters when list changes
    useEffect(() => {
        disputes.forEach(d => {
            if (d.submitted_by && historyCache[d.submitted_by] === undefined) {
                fetchHistory(d.submitted_by);
            }
        });
    }, [disputes]);

    const openModal = (d) => {
        const slots = buildTimeSlots();
        setTimeSlots(slots);
        setRematchTime(slots[0]?.val || "");
        setSelected(d);
        setActiveAction(null);
        setAdminWinnerId("");
        setAdminS1(""); setAdminS2("");
        setAdminNotes("");
        setAdminReason("");
    };

    const closeModal = () => setSelected(null);

    const handleResolve = async () => {
        if (!activeAction) return toast.error("Select an action first.");
        if (activeAction === "dispute_rejected" && !adminReason.trim())
            return toast.error("Provide a reason to share with players.");

        const body = { action: activeAction, admin_notes: adminNotes || undefined, admin_reason: adminReason || undefined };

        if (activeAction === "winner_updated") {
            const w = parseInt(adminWinnerId, 10);
            const s1 = parseInt(adminS1, 10);
            const s2 = parseInt(adminS2, 10);
            if (!w || Number.isNaN(s1) || Number.isNaN(s2))
                return toast.error("Select a winner and enter both scores.");
            body.winner_id = w; body.score_p1 = s1; body.score_p2 = s2;
        }
        if (activeAction === "match_replay_scheduled") {
            if (!rematchTime) return toast.error("Select a replay time.");
            body.rematch_time = rematchTime;
        }

        try {
            const data = await api.post(`/admin/disputes/${selected.id}/resolve`, body);
            if (data.error) return toast.error(data.error);
            toast.success("Dispute resolved.");
            closeModal();
            fetchDisputes();
        } catch { toast.error("Failed to resolve dispute."); }
    };

    /* ── Filtered list ── */
    const filtered = useMemo(() => {
        let list = [...disputes];
        if (filterStatus === "unresolved")     list = list.filter(d => d.status === "pending");
        else if (filterStatus === "awaiting_admin") list = list.filter(d => d.status === "awaiting_admin");
        else if (filterStatus === "resolved")  list = list.filter(d => d.status === "resolved" || d.status === "rejected");

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(d =>
                String(d.match_id).includes(q) ||
                d.submitted_by_name?.toLowerCase().includes(q) ||
                d.opponent_name?.toLowerCase().includes(q) ||
                d.reason?.toLowerCase().includes(q)
            );
        }
        list.sort((a, b) => {
            const diff = new Date(a.created_at) - new Date(b.created_at);
            return sortOrder === "desc" ? -diff : diff;
        });
        return list;
    }, [disputes, filterStatus, search, sortOrder]);

    // Reset pagination when filter/search changes
    useEffect(() => { setCurrentPage(1); }, [filterStatus, search]);

    const paginated = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, currentPage]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    const FILTER_TABS = [
        { key: "unresolved",     label: "Unresolved",   color: "bg-orange-100 text-orange-700 border-orange-300" },
        { key: "awaiting_admin", label: "Admin Review",  color: "bg-amber-100 text-amber-700 border-amber-300" },
        { key: "resolved",       label: "Resolved",     color: "bg-purple-100 text-purple-700 border-purple-300" },
        { key: "all",            label: "All",          color: "bg-slate-100 text-slate-600 border-slate-300" },
    ];

    /* ── Render ── */
    return (
        <div className="pb-10">
            {/* Sticky toolbar */}
            <div className="sticky top-0 -mx-4 z-30">
                {/* Scroll Shield: Masks the content as it scrolls into the gap above the header */}
                <div className="absolute top-[-100px] left-0 right-0 h-[100px] bg-white pointer-events-none border-b border-transparent" />
                
                <div className="bg-white border-b border-slate-100 px-4 pt-2 pb-3 space-y-2 shadow-sm">
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-2xl font-bold text-slate-900">Disputes</h1>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {filtered.length}
                        </span>
                    </div>
                    <button onClick={fetchDisputes} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium">
                        Refresh
                    </button>
                </div>
                <div className="relative px-2">
                    <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search player, match ID, or reason…" value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto p-2 scrollbar-hide no-scrollbar">
                    {FILTER_TABS.map(f => (
                        <button key={f.key} onClick={() => setFilterStatus(f.key)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all min-w-max
                                ${filterStatus === f.key ? f.color + " ring-2 ring-offset-1 ring-current" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                            {f.label}
                            {f.key !== "all" && (
                                <span className="ml-1 opacity-70">
                                    ({disputes.filter(d =>
                                        f.key === "unresolved"     ? d.status === "pending" :
                                        f.key === "awaiting_admin" ? d.status === "awaiting_admin" :
                                        d.status === "resolved" || d.status === "rejected"
                                    ).length})
                                </span>
                            )}
                        </button>
                    ))}
                    <button onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                        className="ml-auto shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 min-w-max">
                        <ArrowUpDown size={11} />
                        {sortOrder === "desc" ? "Newest" : "Oldest"}
                    </button>
                </div>
            </div>
        </div>
        
        <div className="mt-4 space-y-4 px-1">

            {loading ? (
                <div className="py-16 flex justify-center"><Loader /></div>
            ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                    {disputes.length === 0 ? "No disputes found" : "No disputes match your filters"}
                </div>
            ) : (
                <div className="space-y-3 px-2">
                    {paginated.map(d => {
                        const isOpen = expanded === d.id;
                        const isResolved = d.status === "resolved";
                        const submitterShots = d.submitter_screenshots || [];
                        const oppShots = d.opponent_screenshots || [];
                        const history = historyCache[d.submitted_by];
                        const historyCount = history?.total ?? 0;

                        return (
                            <div key={d.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${isResolved ? "border-slate-100 opacity-80" : "border-slate-200"}`}>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <span className="text-xs font-bold text-slate-400">#{d.match_id}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLOR[d.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                                    {d.status?.replace(/_/g, " ")}
                                                </span>

                                                {/* Opponent Response Status Badge */}
                                                {!isResolved && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border transition-colors
                                                        ${!d.opponent_action 
                                                            ? "bg-slate-50 text-slate-400 border-slate-200 animate-pulse" 
                                                            : d.opponent_action.startsWith('accept') 
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                                : "bg-red-50 text-red-700 border-red-200"
                                                        }`}
                                                    >
                                                        {!d.opponent_action ? "No Response" : d.opponent_action}
                                                    </span>
                                                )}

                                                {d.status === "pending" && d.respond_by && (
                                                    <CountdownBadge respondBy={d.respond_by} />
                                                )}
                                                {d.resolved_outcome && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                                                        {d.resolved_outcome.replace(/_/g, " ")}
                                                    </span>
                                                )}
                                                {historyCount > 1 && (
                                                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                                                        <AlertTriangle size={9} /> {historyCount} disputes
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-bold text-slate-800 text-sm truncate">
                                                {d.submitted_by_name}
                                                {d.opponent_name && <span className="font-normal text-slate-400"> vs {d.opponent_name}</span>}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5 capitalize">
                                                {CATEGORY_LABEL[d.reason_category] || d.dispute_kind || "—"}
                                                {" · "}
                                                {new Date(d.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {!isResolved && (
                                                <button onClick={() => openModal(d)}
                                                    className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors">
                                                    <Gavel size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => setExpanded(isOpen ? null : d.id)}
                                                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200">
                                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable detail */}
                                {isOpen && (
                                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Reason</p>
                                            <p className="text-sm text-slate-800 font-medium">{d.reason || "—"}</p>
                                        </div>

                                        {/* Submitter claim */}
                                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-2">
                                            <p className="text-[10px] font-bold text-blue-700 uppercase">{d.submitted_by_name}'s Claim</p>
                                            <div className="flex gap-2">
                                                <ScorePill label="Their score" score={d.submitter_score_for} />
                                                <ScorePill label="Opp. score" score={d.submitter_score_against} />
                                            </div>

                                            <InlineScreenshots urls={submitterShots} onView={setViewerImage} />
                                        </div>

                                        {/* Opponent response */}
                                        {d.opponent_action ? (
                                            <div className={`rounded-xl p-3 border space-y-2 ${d.opponent_action.startsWith('accept') ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                                                <p className={`text-[10px] font-bold uppercase ${d.opponent_action.startsWith('accept') ? "text-emerald-700" : "text-red-700"}`}>
                                                    {d.opponent_name || "Opponent"}'s Response
                                                    <span className="ml-1 font-normal capitalize">({d.opponent_action})</span>
                                                </p>
                                                {d.opponent_action.startsWith('accept') && (
                                                    <div className="flex gap-2">
                                                        <ScorePill label="Their score" score={d.opponent_score_for} />
                                                        <ScorePill label="Opp. score" score={d.opponent_score_against} />
                                                    </div>
                                                )}
                                                {d.opponent_remark && (
                                                    <p className="text-xs text-slate-600 bg-white/70 p-2 rounded-lg">{d.opponent_remark}</p>
                                                )}
                                                <InlineScreenshots urls={oppShots} onView={setViewerImage} />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Awaiting opponent response…</p>
                                        )}

                                        {/* Admin resolve info (if resolved) */}
                                        {d.admin_reason && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Admin Reason (shared with players)</p>
                                                <p className="text-xs text-slate-700">{d.admin_reason}</p>
                                            </div>
                                        )}
                                        {d.admin_notes && (
                                            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">Internal Admin Notes</p>
                                                <p className="text-xs text-yellow-900">{d.admin_notes}</p>
                                            </div>
                                        )}

                                        {/* Player dispute history */}
                                        {history && history.total > 1 && (
                                            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-red-600 uppercase mb-2 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> {d.submitted_by_name} — {history.total} total disputes
                                                </p>
                                                <ul className="space-y-1">
                                                    {history.disputes.slice(0, 5).map(h => (
                                                        <li key={h.id} className="flex items-center justify-between text-xs text-red-700">
                                                            <span>Match #{h.match_id} · {CATEGORY_LABEL[h.reason_category] || "—"}</span>
                                                            <span className="capitalize font-medium">{h.status?.replace(/_/g, " ")}</span>
                                                        </li>
                                                    ))}
                                                    {history.total > 5 && <p className="text-[10px] text-red-400">+{history.total - 5} more</p>}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 mt-8 mx-2 shadow-sm">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm disabled:opacity-40 transition-all hover:bg-slate-200"
                    >
                        Previous
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page</span>
                        <span className="text-sm font-black text-slate-800">{currentPage} of {totalPages}</span>
                    </div>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm disabled:opacity-40 transition-all hover:bg-slate-200"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Resolve Modal */}
            {selected && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-y-auto max-h-[92vh]">
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-300 rounded-full" />
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Resolve Dispute</h2>
                                <p className="text-xs text-slate-500">Match #{selected.match_id} · {selected.submitted_by_name} vs {selected.opponent_name || "—"}</p>
                            </div>

                            {/* Summary */}
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-sm space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase">{CATEGORY_LABEL[selected.reason_category] || selected.dispute_kind}</p>
                                <p className="text-slate-800">{selected.reason}</p>
                            </div>

                            {/* Scores at a glance */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-blue-700 mb-2 uppercase">{selected.submitted_by_name}</p>
                                    <div className="flex gap-2 mb-2">
                                        <ScorePill label="Won" score={selected.submitter_score_for} />
                                        <ScorePill label="Lost" score={selected.submitter_score_against} />
                                    </div>
                                    <InlineScreenshots urls={selected.submitter_screenshots || []} onView={setViewerImage} />
                                </div>
                                <div className={`border rounded-xl p-3 ${selected.opponent_action ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                                    <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase">{selected.opponent_name || "Opponent"}</p>
                                    {selected.opponent_action ? (
                                        <>
                                            <div className="flex gap-2 mb-2">
                                                <ScorePill label="Won" score={selected.opponent_score_for} />
                                                <ScorePill label="Lost" score={selected.opponent_score_against} />
                                            </div>
                                            <InlineScreenshots urls={selected.opponent_screenshots || []} onView={setViewerImage} />
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic mt-1">No response yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Action picker */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Select Resolution</p>
                                <div className="space-y-2">
                                    {ACTIONS.map(a => (
                                        <button key={a.key} onClick={() => setActiveAction(a.key)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${a.bg} ${activeAction === a.key ? `ring-2 ${a.ring}` : ""}`}>
                                            {a.icon}
                                            <div>
                                                <p className="font-bold text-sm">{a.label}</p>
                                                <p className="text-xs opacity-70">{a.sub}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action-specific inputs */}
                            {activeAction === "winner_updated" && (
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-bold text-green-800 uppercase">Set Winner & Scores</p>
                                    <select value={adminWinnerId} onChange={e => setAdminWinnerId(e.target.value)}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white">
                                        <option value="">— Select winner —</option>
                                        <option value={selected.player1_id}>Home — {selected.submitted_by_name}</option>
                                        <option value={selected.player2_id}>Away — {selected.opponent_name || "Opponent"}</option>
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 block mb-1">Score (Home)</label>
                                            <input type="number" min="0" value={adminS1}
                                                onKeyDown={(e) => {
                                                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                onChange={e => setAdminS1(e.target.value.replace(/\D/g, ''))}
                                                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 block mb-1">Score (Away)</label>
                                            <input type="number" min="0" value={adminS2}
                                                onKeyDown={(e) => {
                                                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                onChange={e => setAdminS2(e.target.value.replace(/\D/g, ''))}
                                                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeAction === "match_replay_scheduled" && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                                    <p className="text-xs font-bold text-blue-800 uppercase">Replay Time (today, up to 9 PM)</p>
                                    {timeSlots.length === 0 ? (
                                        <p className="text-xs text-red-600 font-medium">No slots available — it's past 9:00 PM.</p>
                                    ) : (
                                        <>
                                            <select value={rematchTime} onChange={e => setRematchTime(e.target.value)}
                                                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white">
                                                {timeSlots.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                                            </select>
                                            <p className="text-xs text-blue-600">Match resets fresh. Players re-check in and share a new room code.</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeAction === "dispute_rejected" && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                                    <p className="text-xs font-bold text-red-700 uppercase">Reason for Players <span className="text-red-500">*</span></p>
                                    <input
                                        type="text"
                                        placeholder="e.g. No clear evidence provided"
                                        value={adminReason}
                                        onChange={e => setAdminReason(e.target.value)}
                                        className="w-full p-2.5 border border-red-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                                    />
                                    <p className="text-xs text-red-600">Both players are disqualified and the match is cancelled.</p>
                                </div>
                            )}

                            {/* Admin internal notes (always available) */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Internal Notes (admin only)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Optional — visible only to admin in dispute history"
                                    value={adminNotes}
                                    onChange={e => setAdminNotes(e.target.value)}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>

                            {/* Confirm / Cancel */}
                            <div className="flex gap-3 pt-1 pb-2">
                                <button onClick={handleResolve}
                                    disabled={!activeAction || (activeAction === "match_replay_scheduled" && timeSlots.length === 0)}
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">
                                    Confirm
                                </button>
                                <button onClick={closeModal}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Full Screen Viewer Portal */}
            <FullScreenViewer imageUrl={viewerImage} onClose={() => setViewerImage(null)} />
        </div>
    );
};

export default Disputes;
