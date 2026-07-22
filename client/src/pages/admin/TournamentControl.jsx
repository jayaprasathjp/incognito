import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Play,
  Pause,
  Square,
  Trophy,
  Settings,
  Loader2,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Plus,
  Zap,
  CheckCircle2,
  ChevronDown,
  Map,
  RefreshCw,
  Swords,
  UserX,
  ArrowRight,
  Activity,
  TrendingUp,
} from "lucide-react";
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
    <div className="flex gap-2 sm:gap-4 justify-center py-4 sm:py-6">
      {Object.keys(timeLeft).length > 0 ? (
        Object.entries(timeLeft).map(([unit, value]) => (
          <div key={unit} className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xl sm:text-2xl font-bold font-mono shadow-lg border border-slate-700">
              {String(value).padStart(2, "0")}
            </div>
            <span className="text-[9px] sm:text-xs uppercase mt-1.5 font-bold text-slate-500 tracking-wider">
              {unit}
            </span>
          </div>
        ))
      ) : (
        <div className="text-xl font-bold text-green-600 animate-pulse">
          Round Starting Now...
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ROUNDS ROADMAP VIEW
// ─────────────────────────────────────────────────────────────
const RoundsRoadmapView = ({ tournament, onRefresh, lastRefreshed }) => {
  const rounds = tournament?.rounds_config?.rounds || [];
  const activeRound = tournament?.active_round || null;
  const nextRound = tournament?.next_target_round || null;
  const isLive = tournament?.is_active_round_ongoing || false;
  const status = tournament?.status || "open";

  const formatDate = (d) => {
    if (!d) return "TBA";
    try { return format(new Date(d), "dd MMM yyyy"); }
    catch { return "TBA"; }
  };

  const getRoundState = (round) => {
    if (round.name?.includes("Skipped")) return "skipped";
    if (status === "completed") return "completed";
    if (!activeRound) {
      // No active round yet, check if scheduled
      return "upcoming";
    }
    const rNum = Number(round.round_number);
    const aNum = Number(activeRound.round_number);

    // Implicitly skipped: bypassed by a bracket jump
    if (nextRound && rNum > aNum && rNum < Number(nextRound.round_number)) {
      return "skipped";
    }

    if (rNum < aNum) return "completed";
    if (rNum === aNum) {
      return isLive ? "live" : "completed";
    }
    if (nextRound && rNum === Number(nextRound.round_number)) return "next";
    return "upcoming";
  };

  // Derive all statistics dynamically from tournament bracket rules and actual database values
  const getRoadmapStats = () => {
    const statsMap = {};
    let activeParticipants = tournament.participants_count || 0;

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const state = getRoundState(r);

      let players = r.players || 0;
      let matches = r.matches || 0;
      let byes = 0;
      let winners = 0;
      let lost = 0;
      let dq = 0;
      let eliminated = 0;

      if (i === 0) {
        players = activeParticipants;
        // 1st round match calculation (include bye logic)
        const P = players;
        if (P > 0) {
          let T = 1;
          while (T * 2 < P) T *= 2;
          
          if (T * 2 === P) {
            matches = P / 2;
            byes = 0;
          } else {
            matches = P - T;
            byes = P - 2 * matches;
          }
        }
      } else {
        let lastNonSkippedRound = null;
        let lastNonSkippedStats = null;
        let lastNonSkippedState = null;

        for (let k = i - 1; k >= 0; k--) {
          const rK = rounds[k];
          const stateK = getRoundState(rK);
          if (stateK !== "skipped") {
            lastNonSkippedRound = rK;
            lastNonSkippedStats = statsMap[rK.round_number];
            lastNonSkippedState = stateK;
            break;
          }
        }

        if (lastNonSkippedRound) {
          if (lastNonSkippedState === "completed") {
            const prevWinners = lastNonSkippedRound.winners_count || 0;
            const prevByes = lastNonSkippedRound.byes_count || 0;
            players = prevWinners + prevByes;

            const P = players;
            if (P > 0) {
              let T = 1;
              while (T * 2 < P) T *= 2;
              if (T * 2 === P) {
                matches = P / 2;
                byes = 0;
              } else {
                matches = P - T;
                byes = P - 2 * matches;
              }
            }
          } else if (lastNonSkippedState === "live") {
            const prevActualMatches = lastNonSkippedRound.actual_match_count || 0;
            if (prevActualMatches > 0) {
              const prevWinners = lastNonSkippedRound.winners_count || 0;
              const prevByes = Math.max(0, (lastNonSkippedStats ? lastNonSkippedStats.players : lastNonSkippedRound.players) - 2 * prevActualMatches);
              players = prevWinners + prevByes;
            } else {
              players = r.players || 0;
            }

            const P = players;
            if (P > 0) {
              let T = 1;
              while (T * 2 < P) T *= 2;
              if (T * 2 === P) {
                matches = P / 2;
                byes = 0;
              } else {
                matches = P - T;
                byes = P - 2 * matches;
              }
            }
          } else {
            players = r.players || 0;
            matches = r.matches || 0;
          }
        } else {
          players = r.players || 0;
          matches = r.matches || 0;
        }
      }

      let completed_matches = r.completed_match_count || 0;
      let pending_matches = r.pending_match_count || 0;

      // Completed / Live rounds override stats from SQL database values
      if (state === "completed" || state === "live") {
        const actualMatches = r.actual_match_count || 0;
        if (actualMatches > 0) {
          matches = actualMatches;
          winners = r.winners_count || 0;
          dq = r.dq_count || 0;
          lost = r.lost_count || 0;
          eliminated = lost + dq;
          byes = r.byes_count || 0;
        } else {
          winners = matches; // fallback to expected
          lost = matches;
          dq = 0;
          eliminated = lost;
          // Fallback logic for complete/pending if db isn't populated yet
          completed_matches = state === "completed" ? matches : 0;
          pending_matches = state === "completed" ? 0 : matches;
        }
      } else if (state === "skipped") {
        matches = 0;
        winners = 0;
        lost = 0;
        dq = 0;
        eliminated = 0;
        byes = players;
        completed_matches = 0;
        pending_matches = 0;
      } else {
        // Next Up / Scheduled
        winners = matches;
        lost = matches;
        dq = 0;
        eliminated = lost;
        completed_matches = 0;
        pending_matches = matches;
      }

      statsMap[r.round_number] = {
        players,
        matches,
        byes,
        winners,
        lost,
        dq,
        eliminated,
        completed_matches,
        pending_matches,
      };
    }

    return statsMap;
  };

  const statsMap = getRoadmapStats();

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
          <Map size={28} className="text-indigo-400" />
        </div>
        <p className="text-slate-500 font-semibold">No rounds configured yet.</p>
        <p className="text-slate-400 text-sm mt-1">Generate & save a bracket schedule first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Map size={18} className="text-indigo-500" />
            Rounds Roadmap
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {rounds.length} round{rounds.length !== 1 ? "s" : ""} · {tournament.title}
          </p>
        </div>
        {status === "active" && isLive && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all active:scale-95 border border-indigo-100"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        )}
      </div>

      {/* Last refreshed note */}
      {status === "active" && isLive && lastRefreshed && (
        <p className="text-[10px] text-slate-400 text-right -mt-2">
          Last updated: {format(lastRefreshed, "HH:mm:ss")}
        </p>
      )}

      {/* Timeline */}
      <div className="relative pl-8 sm:pl-10">
        {/* Vertical line */}
        <div className="absolute left-[14px] sm:left-[16px] top-6 bottom-6 w-0.5 bg-slate-200 rounded-full" />

        <div className="space-y-4 sm:space-y-5">
          {rounds.map((round, idx) => {
            const state = getRoundState(round);
            const stats = statsMap[round.round_number] || {
              players: round.players || 0,
              matches: round.matches || 0,
              byes: 0,
              winners: 0,
              lost: 0,
              dq: 0,
              eliminated: 0,
            };

            // Dot styles
            const dotClass = {
              live: "border-indigo-500 bg-white shadow-[0_0_14px_rgba(99,102,241,0.6)] scale-125",
              next: "border-indigo-400 bg-white shadow-[0_0_8px_rgba(99,102,241,0.3)] scale-110",
              completed: "border-emerald-400 bg-emerald-50",
              upcoming: "border-slate-300 bg-white",
              skipped: "border-slate-300 bg-slate-100 border-dashed scale-95 opacity-60",
            }[state] || "border-slate-300 bg-white";

            return (
              <div key={idx} className={`relative flex items-start group transition-all duration-300 ${state === "live" ? "scale-[1.01]" : ""}`}>
                {/* Timeline dot */}
                <div className={`absolute -left-[27px] sm:-left-[26px] mt-4 w-5 h-5 rounded-full border-4 shadow-sm z-10 flex-shrink-0 transition-all duration-500 ${dotClass} ${state === "live" ? "animate-pulse" : ""}`} />

                {/* Card */}
                <div className="w-full">
                  {state === "live" && <LiveRoundCard round={round} stats={stats} formatDate={formatDate} />}
                  {state === "next" && <NextUpRoundCard round={round} stats={stats} formatDate={formatDate} />}
                  {state === "completed" && <CompletedRoundCard round={round} stats={stats} formatDate={formatDate} />}
                  {state === "upcoming" && <UpcomingRoundCard round={round} formatDate={formatDate} />}
                  {state === "skipped" && <SkippedRoundCard round={round} stats={stats} formatDate={formatDate} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Live Round Card ──────────────────────────────────────
const LiveRoundCard = ({ round, stats, formatDate }) => {
  return (
    <div className="relative w-full rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-300 to-purple-400" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
            <span className="text-xs text-indigo-200 font-semibold">{formatDate(round.date)}</span>
          </div>
          {round.fixtures_generated && (
            <span className="text-[10px] bg-white/20 text-indigo-100 px-2 py-0.5 rounded-full font-bold">Fixtures ✓</span>
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-3">{round.name}</h3>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-100 font-semibold mb-4 bg-white/10 px-3 py-1.5 rounded-xl w-fit">
          <span>👥 {stats.players} Total Players</span>
          <span className="opacity-40">•</span>
          <span>⚔️ {stats.matches * 2} Playing</span>
          {stats.byes > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span>🎯 {stats.byes} Byes</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatPill icon={<Swords size={13} />} label="Matches Created" value={stats.matches || "—"} light />
          <StatPill icon={<Activity size={13} />} label="Status" value={`${stats.completed_matches ?? 0}C / ${stats.pending_matches ?? 0}P`} light />
          <StatPill icon={<Users size={13} />} label="Yet To Play" value={(stats.pending_matches * 2) || 0} light />
          <StatPill icon={<ArrowRight size={13} />} label="Byes" value={stats.byes || "—"} light />
        </div>

        {stats.matches > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-indigo-200 font-bold mb-1">
              <span>{stats.winners} of {stats.matches} matches completed</span>
              <span>{stats.players} players in round</span>
            </div>
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((stats.winners / stats.matches) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Next Up Round Card ────────────────────────────────────
const NextUpRoundCard = ({ round, stats, formatDate }) => (
  <div className="w-full rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-blue-50/80 overflow-hidden shadow-md">
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-indigo-200">
          Next Up
        </span>
        <span className="text-xs text-indigo-500 font-semibold">{formatDate(round.date)}</span>
      </div>
      <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">{round.name}</h3>

      {/* Players Breakdown */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-600 font-semibold mb-3 bg-indigo-50 px-3 py-1.5 rounded-xl w-fit border border-indigo-100/50">
        <span>👥 {stats.players} Total Players</span>
        <span className="opacity-40">•</span>
        <span>⚔️ {stats.matches * 2} Will Play</span>
        {stats.byes > 0 && (
          <>
            <span className="opacity-40">•</span>
            <span>🎯 {stats.byes} Byes</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill icon={<Users size={13} />} label="Players" value={stats.players ?? "—"} />
        <StatPill icon={<Swords size={13} />} label="Matches" value={stats.matches ?? "—"} />
        <StatPill icon={<ArrowRight size={13} />} label="Byes" value={stats.byes ?? "—"} />
        <StatPill
          icon={<Activity size={13} />}
          label="Fixtures"
          value={round.fixtures_generated ? "Ready" : "Pending"}
          valueClass={round.fixtures_generated ? "text-emerald-600" : "text-amber-600"}
        />
      </div>
    </div>
  </div>
);

// ── Completed Round Card ─────────────────────────────────
const CompletedRoundCard = ({ round, stats, formatDate }) => {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/80 overflow-hidden hover:bg-white transition-all duration-200">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200">
              <CheckCircle2 size={10} /> Completed
            </span>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{formatDate(round.date)}</span>
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-700 mb-2">{round.name}</h3>

        {/* Players Breakdown */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-semibold mb-3 bg-slate-100/80 px-3 py-1.5 rounded-xl w-fit">
          <span>👥 {stats.players} Total Players</span>
          <span className="opacity-40">•</span>
          <span>⚔️ {stats.matches * 2} Played</span>
          {stats.byes > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span>🎯 {stats.byes} Byes</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatPill icon={<Swords size={13} />} label="Matches Played" value={stats.matches || "—"} muted />
          <StatPill icon={<TrendingUp size={13} />} label="Won / Advancing" value={stats.winners || "—"} muted />
          <StatPill icon={<UserX size={13} />} label="Eliminated" value={stats.eliminated > 0 ? `${stats.eliminated} (${stats.lost}L + ${stats.dq}DQ)` : "—"} muted />
          <StatPill icon={<ArrowRight size={13} />} label="Byes" value={stats.byes || "—"} muted />
        </div>
      </div>
    </div>
  );
};

// ── Upcoming Round Card ──────────────────────────────────
// No stats shown — player count for future rounds is unknown until fixtures are generated
const UpcomingRoundCard = ({ round, formatDate }) => (
  <div className="w-full rounded-2xl border border-slate-100 bg-white/60 overflow-hidden hover:border-slate-200 hover:bg-white transition-all duration-200">
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled</span>
        <span className="text-xs text-slate-400 font-semibold">{formatDate(round.date)}</span>
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-slate-500">{round.name}</h3>
      <p className="text-[11px] text-slate-400 mt-1">Player count determined after previous round completes</p>
    </div>
  </div>
);

// ── Skipped Round Card ───────────────────────────────────
const SkippedRoundCard = ({ round, stats, formatDate }) => (
  <div className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 text-slate-400 opacity-60 shadow-none transition-all duration-300">
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-slate-200/40">
          Skipped
        </span>
        <span className="text-xs text-slate-400 font-semibold">{formatDate(round.date)}</span>
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-slate-400/70 line-through decoration-slate-300 decoration-1">
        {round.name ? round.name.replace("(Skipped)", "").trim() : "Round"}
      </h3>
      <p className="text-[11px] text-slate-400 mt-1">This round was skipped automatically by the bracket system</p>
    </div>
  </div>
);

// ── Stat Pill ─────────────────────────────────────────────
const StatPill = ({ icon, label, value, light, muted, valueClass }) => (
  <div className={`rounded-xl p-2.5 flex flex-col gap-0.5 border ${
    light
      ? "bg-white/15 border-white/20"
      : muted
        ? "bg-slate-50 border-slate-100"
        : "bg-indigo-50 border-indigo-100"
  }`}>
    <div className={`text-base sm:text-lg font-black tabular-nums ${
      valueClass || (light ? "text-white" : muted ? "text-slate-600" : "text-indigo-700")
    }`}>
      {value}
    </div>
    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
      light ? "text-indigo-200" : muted ? "text-slate-400" : "text-indigo-500"
    }`}>
      {icon} {label}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN TOURNAMENT CONTROL COMPONENT
// ─────────────────────────────────────────────────────────────
const TournamentControl = () => {
  const { token } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("control"); // "control" | "roadmap"
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const rounds = tournament?.rounds_config?.rounds || [];
  const activeRound = tournament?.active_round || null;
  const nextRound = tournament?.next_target_round || null;
  const isLive = tournament?.is_active_round_ongoing || false;
  const status = tournament?.status || "open";

  const getRoundState = (round) => {
    if (round.name?.includes("Skipped")) return "skipped";
    if (status === "completed") return "completed";
    if (!activeRound) return "upcoming";
    const rNum = Number(round.round_number);
    const aNum = Number(activeRound.round_number);
    if (nextRound && rNum > aNum && rNum < Number(nextRound.round_number)) {
      return "skipped";
    }
    if (rNum < aNum) return "completed";
    if (rNum === aNum) return isLive ? "live" : "completed";
    if (nextRound && rNum === Number(nextRound.round_number)) return "next";
    return "upcoming";
  };

  const getRoadmapStats = () => {
    if (!tournament) return {};
    const statsMap = {};
    let activeParticipants = tournament.participants_count || 0;

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const state = getRoundState(r);

      let players = r.players || 0;
      let matches = r.matches || 0;
      let byes = 0;
      let winners = 0;
      let lost = 0;
      let dq = 0;
      let eliminated = 0;
      let completed_matches = r.completed_match_count || 0;
      let pending_matches = r.pending_match_count || 0;

      if (i === 0) {
        players = activeParticipants;
        const P = players;
        if (P > 0) {
          let T = 1;
          while (T * 2 < P) T *= 2;
          if (T * 2 === P) {
            matches = P / 2;
            byes = 0;
          } else {
            matches = P - T;
            byes = P - 2 * matches;
          }
        }
      } else {
        let lastNonSkippedRound = null;
        let lastNonSkippedStats = null;
        let lastNonSkippedState = null;

        for (let k = i - 1; k >= 0; k--) {
          const rK = rounds[k];
          const stateK = getRoundState(rK);
          if (stateK !== "skipped") {
            lastNonSkippedRound = rK;
            lastNonSkippedStats = statsMap[rK.round_number];
            lastNonSkippedState = stateK;
            break;
          }
        }

        if (lastNonSkippedRound) {
          if (lastNonSkippedState === "completed") {
            const prevWinners = lastNonSkippedRound.winners_count || 0;
            const prevByes = lastNonSkippedRound.byes_count || 0;
            players = prevWinners + prevByes;

            const P = players;
            if (P > 0) {
              let T = 1;
              while (T * 2 < P) T *= 2;
              if (T * 2 === P) {
                matches = P / 2;
                byes = 0;
              } else {
                matches = P - T;
                byes = P - 2 * matches;
              }
            }
          } else if (lastNonSkippedState === "live") {
            const prevActualMatches = lastNonSkippedRound.actual_match_count || 0;
            if (prevActualMatches > 0) {
              const prevWinners = lastNonSkippedRound.winners_count || 0;
              const prevByes = Math.max(0, (lastNonSkippedStats ? lastNonSkippedStats.players : lastNonSkippedRound.players) - 2 * prevActualMatches);
              players = prevWinners + prevByes;
            } else {
              players = r.players || 0;
            }

            const P = players;
            if (P > 0) {
              let T = 1;
              while (T * 2 < P) T *= 2;
              if (T * 2 === P) {
                matches = P / 2;
                byes = 0;
              } else {
                matches = P - T;
                byes = P - 2 * matches;
              }
            }
          } else {
            players = r.players || 0;
            matches = r.matches || 0;
          }
        } else {
          players = r.players || 0;
          matches = r.matches || 0;
        }
      }

      if (state === "completed" || state === "live") {
        const actualMatches = r.actual_match_count || 0;
        if (actualMatches > 0) {
          matches = actualMatches;
          winners = r.winners_count || 0;
          dq = r.dq_count || 0;
          lost = r.lost_count || 0;
          eliminated = lost + dq;
          byes = r.byes_count || 0;
        } else {
          winners = matches;
          lost = matches;
          dq = 0;
          eliminated = lost;
          completed_matches = state === "completed" ? matches : 0;
          pending_matches = state === "completed" ? 0 : matches;
        }
      } else if (state === "skipped") {
        matches = 0;
        winners = 0;
        lost = 0;
        dq = 0;
        eliminated = 0;
        byes = players;
        completed_matches = 0;
        pending_matches = 0;
      } else {
        winners = matches;
        lost = matches;
        dq = 0;
        eliminated = lost;
        completed_matches = 0;
        pending_matches = matches;
      }

      statsMap[r.round_number] = {
        players,
        matches,
        byes,
        winners,
        lost,
        dq,
        eliminated,
        completed_matches,
        pending_matches,
      };
    }
    return statsMap;
  };

  const statsMap = getRoadmapStats();

  // Creation Form State
  const [formData, setFormData] = useState({
    title: "",
    capacity: 64,
    entry_fee: 0,
    start_date: "",
    end_date: "",
  });

  // Extension State
  const [showExtend, setShowExtend] = useState(false);
  const [newEndTime, setNewEndTime] = useState("");

  // Rounds Configuration State
  const [roundsSchedule, setRoundsSchedule] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSettingsOnMobile, setShowSettingsOnMobile] = useState(false);

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
          name:
            matches === 1
              ? "Finals"
              : matches === 2
                ? "Semi-Finals"
                : matches === 4
                  ? "Quarter-Finals"
                  : `Round ${roundNum}`,
          matches: matches,
          players: currentPlayers,
          date: "",
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
        date: "",
      });

      // Main Bracket (starting from capacity)
      let currentPlayers = capacity;
      let roundNum = 1;
      while (currentPlayers > 1) {
        const matches = currentPlayers / 2;
        rounds.push({
          name:
            matches === 1
              ? "Finals"
              : matches === 2
                ? "Semi-Finals"
                : matches === 4
                  ? "Quarter-Finals"
                  : `Round ${roundNum}`,
          matches: matches,
          players: currentPlayers,
          date: "",
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
            name:
              matches === 1
                ? "Finals"
                : matches === 2
                  ? "Semi-Finals"
                  : matches === 4
                    ? "Quarter-Finals"
                    : `Round ${roundNum}`,
            matches: matches,
            players: currentPlayers,
            date: "",
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
          date: "",
        });

        // Rounds from target downwards
        let currentPlayers = target;
        let roundNum = 2; // Since we already had Round 1
        while (currentPlayers > 1) {
          const matches = currentPlayers / 2;
          rounds.push({
            name:
              matches === 1
                ? "Finals"
                : matches === 2
                  ? "Semi-Finals"
                  : matches === 4
                    ? "Quarter-Finals"
                    : `Round ${roundNum}`,
            matches: matches,
            players: currentPlayers,
            date: "",
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
        toast.error(
          `Please select a date for ${roundsSchedule.rounds[i].name}`,
        );
        return;
      }
      // Optional: Validate that round[i+1] is after round[i]
      if (i > 0) {
        const prevDate = new Date(roundsSchedule.rounds[i - 1].date);
        const currDate = new Date(roundsSchedule.rounds[i].date);
        // Strict check: Must be strictly greater (at least 1 day after)
        if (currDate <= prevDate) {
          toast.error(
            `${roundsSchedule.rounds[i].name} must be at least 1 day after ${roundsSchedule.rounds[i - 1].name}`,
          );
          return;
        }
      } else {
        // Round 1 check: Must be in future (tomorrow onwards)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        if (roundsSchedule.rounds[i].date <= todayStr) {
          toast.error(
            `${roundsSchedule.rounds[i].name} must be a future date (tomorrow or later)`,
          );
          return;
        }
      }
    }

    setActionLoading("save_schedule");
    try {
      await api.post("/admin/tournaments/control", {
        action: "save_schedule",
        id: tournament.id,
        rounds_config: roundsSchedule,
      });
      toast.success("Schedule saved successfully!");
      await fetchTournament(); // Refresh data before changing visible state
      setActiveTab("control");
      setShowSettingsOnMobile(false);
    } catch (error) {
      console.error("Save schedule error:", error);
      const errorMsg = error.response?.data?.error || "Failed to save schedule";
      toast.error(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

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
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tournament?.registration_end]);

  const fetchTournament = useCallback(async (silent = false) => {
    try {
      const data = await api.get("/admin/tournaments/control");
      setTournament(data.id ? data : null);
      if (silent) setLastRefreshed(new Date());
    } catch (error) {
      console.error(error);
      if (!silent) setTournament(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleManualRefresh = () => {
    fetchTournament(true);
  };

  useEffect(() => {
    fetchTournament();
  }, [token, fetchTournament]);

  // Auto-refresh every 15s when on roadmap tab + tournament is live
  useEffect(() => {
    if (
      activeTab !== "roadmap" ||
      !tournament ||
      tournament.status !== "active" ||
      !tournament.is_active_round_ongoing
    ) return;
    const interval = setInterval(() => fetchTournament(true), 15000);
    return () => clearInterval(interval);
  }, [activeTab, tournament?.status, tournament?.is_active_round_ongoing, fetchTournament]);

  // Restore: Load saved schedule if exists
  useEffect(() => {
    if (tournament?.rounds_config) {
      setRoundsSchedule(tournament.rounds_config);
    }
  }, [tournament]);

  // Handle Generate Fixtures for a specific round
  const handleGenerateFixtures = async (roundNumber) => {
    if (
      !confirm(
        `Generate match fixtures for Round ${roundNumber}? This will pair players and create matches.`,
      )
    )
      return;

    setActionLoading(`generate_fixtures_${roundNumber}`);
    try {
      const data = await api.post("/admin/tournaments/control", {
        action: "generate_fixtures",
        id: tournament.id,
        round_number: roundNumber,
      });
      toast.success(
        data.message || `Fixtures generated for Round ${roundNumber}!`,
      );
      fetchTournament();
    } catch (error) {
      console.error("Generate fixtures error:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to generate fixtures";
      toast.error(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const fixedPrizePool = 20000;
  const estimatedRounds = Math.log2(formData.capacity);

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading("create");

    // Validation
    if (formData.end_date <= formData.start_date) {
      toast.error("End date must be after start date");
      setActionLoading(null);
      return;
    }

    // Send dates as-is to avoid timezone shift
    // formData.start_date is "YYYY-MM-DD", append T00:00:00 to keep the intended date
    try {
      const data = await api.post("/tournaments", {
        title: formData.title,
        capacity: formData.capacity,
        entry_fee: formData.entry_fee,
        registration_start: `${formData.start_date}T00:00:00`,
        registration_end: `${formData.end_date}T00:00:00`,
      });
      if (data.error) {
        throw { response: { data } };
      }

      toast.success("Tournament created successfully");
      fetchTournament();
    } catch (error) {
      console.error("Tournament creation error:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to create tournament";
      toast.error(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtend = async () => {
    setActionLoading("extend");
    try {
      await api.post("/admin/tournaments/control", {
        action: "extend",
        id: tournament.id,
        registration_end: newEndTime,
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
      const endpoint = "/admin/tournaments/control";
      const body = { action, id: tournament.id };

      const data = await api.post(endpoint, body);

      if (data.tournament || data.id || data.message) {
        toast.success(`Tournament updated successfully`);
        if (action === "reset") {
          setShowCreateForm(true);
        }
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

  if (loading)
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="animate-spin text-slate-400" size={48} />
      </div>
    );

  if (!tournament || !tournament.id || showCreateForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Create New Tournament
          </h1>
          {tournament && showCreateForm && (
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-slate-500 hover:text-slate-700 font-medium text-sm"
            >
              Back to Results
            </button>
          )}
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Tournament Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Winter Championship 2026"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Registration Start
                    </label>
                    <input
                      required
                      type="date"
                      min={(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      })()}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          start_date: e.target.value,
                          end_date: "",
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Registration End
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.end_date}
                      min={
                        formData.start_date
                          ? new Date(
                              new Date(formData.start_date).setDate(
                                new Date(formData.start_date).getDate() + 1,
                              ),
                            )
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Registration opens at 12:00 AM on start date and closes at
                  11:59 PM on end date.
                </p>
              </div>

              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Entry Fee (₦)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.entry_fee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        entry_fee: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Total Capacity
                  </label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value),
                      })
                    }
                  >
                    {[2048, 1024, 512, 256].map((cap) => (
                      <option key={cap} value={cap}>
                        {cap} Players
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tournament Prize Pool
                </span>
                <div className="text-2xl font-bold text-green-600">
                  ₦{fixedPrizePool.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estimated Rounds
                </span>
                <div className="text-2xl font-bold text-blue-600">
                  {estimatedRounds} Rounds
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading === "create"}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              {actionLoading === "create" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Plus size={20} /> Create Tournament
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const hasRounds = tournament?.rounds_config?.rounds?.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl sm:text-3xl font-bold">Tournament Control</h1>
      </div>

      {/* Tab Switcher — only shown when tournament exists and has rounds */}
      {hasRounds && (
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto sm:inline-flex">
          <button
            onClick={() => setActiveTab("control")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === "control"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Settings size={15} />
            Control Panel
          </button>
          <button
            onClick={() => setActiveTab("roadmap")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === "roadmap"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Map size={15} />
            Rounds Roadmap
            {tournament?.status === "active" && tournament?.is_active_round_ongoing && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-extrabold uppercase">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </button>
        </div>
      )}

      {/* Roadmap Tab Content */}
      {activeTab === "roadmap" && hasRounds && (
        <RoundsRoadmapView
          tournament={tournament}
          onRefresh={handleManualRefresh}
          lastRefreshed={lastRefreshed}
          statsMap={statsMap}
          getRoundState={getRoundState}
        />
      )}

      {/* Control Panel Tab Content (always shown if not on roadmap or no rounds) */}
      {(activeTab === "control" || !hasRounds) && (

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {/* Control Panel */}
        <div className="bg-white p-4 sm:p-8 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-sm border border-slate-200">
          {tournament.registration_start &&
          new Date() < new Date(tournament.registration_start) ? (
            <>
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={20} />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Registration
                </span>
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
                            <span className="text-sm font-bold uppercase tracking-wider">
                              Rounds Configuration
                            </span>
                          </div>
                          <div className="text-center py-6">
                            <p className="text-slate-500 mb-4">
                              Registration has ended. Configure the rounds based
                              on participant count.
                            </p>
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

                    // Logic to determine state using backend-provided round fields
                    const isConfigured = roundsSchedule.rounds.some(
                      (r) => r.date,
                    );
                    const isActive = tournament.status === "active";
                    const isCompleted = tournament.status === "completed";

                    if (isCompleted) {
                      return (
                        <div className="w-full animate-in fade-in duration-500">
                          <div className="relative p-5 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl text-center overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-green-500" />
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Trophy size={26} className="text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">
                              All Rounds Completed!
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              The tournament has successfully concluded.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-extrabold uppercase tracking-wider border border-emerald-200">
                              <CheckCircle2 size={12} /> Tournament Complete
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (!isConfigured && !isActive) {
                      return renderConfigUI();
                    }

                    // If NOT active, show config UI to allow editing.
                    if (!isActive) {
                      return renderConfigUI();
                    }

                    const now = new Date();
                    const activeRound = tournament.active_round;
                    const nextRound = tournament.next_target_round;
                    const nextUngenerated = tournament.next_ungenerated_round;
                    const isRoundLive =
                      activeRound && tournament.is_active_round_ongoing;

                    // ── STATE 0: Schedule saved, tournament active, but no fixtures generated yet ──
                    const initialRound =
                      nextRound ||
                      nextUngenerated ||
                      roundsSchedule.rounds.find((r) => !r.fixtures_generated) ||
                      roundsSchedule.rounds[0] ||
                      null;

                    if (!activeRound && initialRound) {
                      const initialRoundNum =
                        initialRound.round_number ||
                        roundsSchedule.rounds.findIndex(
                          (r) => r.name === initialRound.name,
                        ) + 1;
                      return (
                        <div className="w-full space-y-4 animate-in fade-in duration-500">
                          <div className="relative p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 text-center overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-blue-500" />
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                                Next Round
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-indigo-200">
                                Ready to Generate
                              </span>
                            </div>

                            <h3 className="text-2xl font-black tracking-tight text-slate-900">
                              {initialRound.name || `Round ${initialRoundNum}`}
                            </h3>

                            <p className="text-xs text-slate-500 font-semibold mt-1">
                              Scheduled for{" "}
                              {initialRound.date &&
                                format(new Date(initialRound.date), "PPP")}
                            </p>

                            <RoundTimer
                              targetDate={`${initialRound.date}T00:00:00`}
                            />

                            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold mb-4 border-t border-indigo-100/50 pt-3 text-left">
                              <span>Players</span>
                              <span className="font-bold text-indigo-600">
                                {statsMap[initialRoundNum]
                                  ? statsMap[initialRoundNum].players
                                  : initialRound.players} Players
                              </span>
                            </div>

                            {initialRound.fixtures_generated ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold justify-center border border-green-100">
                                <CheckCircle2 size={14} />
                                Fixtures Ready
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  handleGenerateFixtures(initialRoundNum)
                                }
                                disabled={
                                  actionLoading ===
                                  `generate_fixtures_${initialRoundNum}`
                                }
                                className="w-full inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md justify-center"
                              >
                                {actionLoading ===
                                `generate_fixtures_${initialRoundNum}` ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Zap size={16} />
                                )}
                                Generate {initialRound.name || `Round ${initialRoundNum}`} Fixtures
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // ── STATE 1: A round is LIVE right now (matches still pending) ──
                    if (isRoundLive) {
                      const activeRoundStart = new Date(
                        `${activeRound.date}T00:00:00`,
                      );
                      const hoursSinceStart =
                        (now - activeRoundStart) / (1000 * 60 * 60);
                      const canGenerateNext = hoursSinceStart >= 22;

                      return (
                        <div className="w-full animate-in fade-in duration-500">
                          {/* LIVE Banner */}
                          <div className="relative rounded-2xl overflow-hidden border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5 mb-4">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-400 to-emerald-500" />
                            <div className="flex items-center justify-between mb-3">
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-extrabold tracking-wider uppercase shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                LIVE NOW
                              </div>
                              <span className="text-xs text-green-600 font-semibold">
                                {activeRound.date &&
                                  format(new Date(activeRound.date), "PPP")}
                              </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mt-1">
                              {activeRound.name}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                              is currently in progress
                            </p>

                            {/* Stats row */}
                            <div className="mt-4 flex gap-3">
                              <div className="flex-1 bg-white/70 rounded-xl p-3 text-center border border-green-100">
                                <div className="text-xl font-black text-slate-900">
                                  {statsMap[activeRound.round_number] ? statsMap[activeRound.round_number].matches : (activeRound.actual_match_count || activeRound.matches)}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                                  Matches Created
                                </div>
                              </div>
                              <div className="flex-1 bg-white/70 rounded-xl p-3 text-center border border-green-100">
                                <div className="text-xl font-black text-slate-900">
                                  {statsMap[activeRound.round_number] ? `${statsMap[activeRound.round_number].completed_matches ?? 0}C / ${statsMap[activeRound.round_number].pending_matches ?? 0}P` : '—'}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                                  Status
                                </div>
                              </div>
                              <div className="flex-1 bg-white/70 rounded-xl p-3 text-center border border-green-100">
                                <div className="text-xl font-black text-slate-900">
                                  {statsMap[activeRound.round_number] ? ((statsMap[activeRound.round_number].pending_matches || 0) * 2) : '—'}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                                  Yet To Play
                                </div>
                              </div>
                            </div>

                            {/* Fixture Generation Status */}
                            <div className="mt-4">
                              {activeRound.fixtures_generated ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-bold justify-center border border-green-200">
                                  <CheckCircle2 size={14} />
                                  Fixtures Generated &amp; Live
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleGenerateFixtures(
                                      activeRound.round_number,
                                    )
                                  }
                                  disabled={
                                    actionLoading ===
                                    `generate_fixtures_${activeRound.round_number}`
                                  }
                                  className="w-full inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm justify-center"
                                >
                                  {actionLoading ===
                                  `generate_fixtures_${activeRound.round_number}` ? (
                                    <Loader2
                                      className="animate-spin"
                                      size={16}
                                    />
                                  ) : (
                                    <Zap size={16} />
                                  )}
                                  Generate Fixtures
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Next Round preview — shown only after 22hrs */}
                          {nextRound && canGenerateNext && (
                            <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                                  Up Next
                                </span>
                                <span className="text-xs text-slate-400">
                                  {nextRound.date &&
                                    format(new Date(nextRound.date), "PPP")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800">
                                  {nextRound.name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {nextRound.players} players
                                </span>
                              </div>
                              <div className="mt-3">
                                {nextRound.fixtures_generated ? (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold justify-center">
                                    <CheckCircle2 size={14} />
                                    Fixtures Ready
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleGenerateFixtures(
                                        nextUngenerated?.round_number ||
                                          nextRound.round_number,
                                      )
                                    }
                                    disabled={
                                      actionLoading ===
                                      `generate_fixtures_${nextUngenerated?.round_number || nextRound.round_number}`
                                    }
                                    className="w-full inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm justify-center"
                                  >
                                    {actionLoading ===
                                    `generate_fixtures_${nextUngenerated?.round_number || nextRound.round_number}` ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={16}
                                      />
                                    ) : (
                                      <Zap size={16} />
                                    )}
                                    Generate {nextRound.name} Fixtures
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ── STATE 2: Round COMPLETED, next round is queued ──
                    if (activeRound && nextRound) {
                      const lastRoundStart = new Date(
                        `${activeRound.date}T00:00:00`,
                      );
                      const hoursSince =
                        (now - lastRoundStart) / (1000 * 60 * 60);
                      const canGenerateNextStandalone = hoursSince >= 22;

                      return (
                        <div className="w-full space-y-4 animate-in fade-in duration-500">
                          {/* Completed Round Card */}
                          <div className="relative p-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-green-500" />
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Last Round
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-extrabold tracking-wider uppercase border border-emerald-200">
                                <CheckCircle2 size={10} /> Completed
                              </span>
                            </div>
                            <h4 className="text-xl font-black text-slate-900">
                              {activeRound.name}
                            </h4>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                                <div className="text-lg font-black text-slate-800">
                                  {statsMap[activeRound.round_number] ? statsMap[activeRound.round_number].matches : (activeRound.actual_match_count || activeRound.matches)}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                  Matches
                                </div>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                                <div className="text-xs font-bold text-slate-700 mt-1">
                                  {activeRound.date &&
                                    format(new Date(activeRound.date), "PPP")}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                  Date Played
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Next Round Card */}
                          <div className="relative p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 text-center overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-blue-500" />
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                                Up Next
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-indigo-200">
                                Target Round
                              </span>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight text-slate-900">
                              {nextRound.name}
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold mt-1">
                              Scheduled for{" "}
                              {nextRound.date &&
                                format(new Date(nextRound.date), "PPP")}
                            </p>

                            <RoundTimer
                              targetDate={`${nextRound.date}T00:00:00`}
                            />

                            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold mb-4 border-t border-indigo-100/50 pt-3 text-left">
                              <span>Players</span>
                              <span className="font-bold text-indigo-600">
                                {statsMap[nextRound.round_number] ? statsMap[nextRound.round_number].players : nextRound.players} Players
                              </span>
                            </div>

                            {canGenerateNextStandalone && (
                              <div className="mt-2">
                                {nextRound.fixtures_generated ? (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold justify-center border border-green-100">
                                    <CheckCircle2 size={14} />
                                    Fixtures Ready
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleGenerateFixtures(
                                        nextUngenerated?.round_number ||
                                          nextRound.round_number,
                                      )
                                    }
                                    disabled={
                                      actionLoading ===
                                      `generate_fixtures_${nextUngenerated?.round_number || nextRound.round_number}`
                                    }
                                    className="w-full inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md justify-center"
                                  >
                                    {actionLoading ===
                                    `generate_fixtures_${nextUngenerated?.round_number || nextRound.round_number}` ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={16}
                                      />
                                    ) : (
                                      <Zap size={16} />
                                    )}
                                    Generate {nextRound.name} Fixtures
                                  </button>
                                )}
                              </div>
                            )}
                            {!canGenerateNextStandalone && (
                              <p className="text-[10px] text-slate-400 mt-2 italic">
                                Fixture generation available after 22hrs of the
                                completed round
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // ── STATE 3: Active round done, no next round left (tournament end) ──
                    if (activeRound && !nextRound) {
                      return (
                        <div className="w-full animate-in fade-in duration-500">
                          <div className="relative p-5 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl text-center overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-green-500" />
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Trophy size={26} className="text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">
                              All Rounds Completed!
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              The final round{" "}
                              <span className="font-bold text-slate-700">
                                {activeRound.name}
                              </span>{" "}
                              has concluded.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-extrabold uppercase tracking-wider border border-emerald-200">
                              <CheckCircle2 size={12} /> Tournament Complete
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── FALLBACK: No active round found yet ──
                    return renderConfigUI();

                    function renderConfigUI() {
                      return (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="flex items-center gap-2 text-slate-500 border-b border-slate-100 pb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Settings size={20} />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">
                              Rounds Configuration
                            </span>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">
                                Tournament Structure
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase">
                                {roundsSchedule.type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">
                              {roundsSchedule.description}
                            </p>
                          </div>

                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {roundsSchedule.rounds.map((round, index) => {
                              let minDate;
                              let isDisabled = false;

                              if (index === 0) {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                const year = tomorrow.getFullYear();
                                const month = String(
                                  tomorrow.getMonth() + 1,
                                ).padStart(2, "0");
                                const day = String(tomorrow.getDate()).padStart(
                                  2,
                                  "0",
                                );
                                minDate = `${year}-${month}-${day}`;
                              } else {
                                const prevRoundDate =
                                  roundsSchedule.rounds[index - 1].date;
                                if (!prevRoundDate) {
                                  isDisabled = true;
                                } else {
                                  const nextDay = new Date(prevRoundDate);
                                  nextDay.setDate(nextDay.getDate() + 1);
                                  minDate = nextDay.toISOString().split("T")[0];
                                }
                              }

                              return (
                                <div
                                  key={index}
                                  className={`p-3 border rounded-xl transition-colors group bg-white ${isDisabled ? "border-slate-100 opacity-50" : "border-slate-200 hover:border-blue-300"}`}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${isDisabled ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"}`}
                                      >
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
                                      className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isDisabled ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-slate-50 border-slate-200"}`}
                                      value={round.date}
                                      onChange={(e) =>
                                        handleRoundDateChange(
                                          index,
                                          e.target.value,
                                        )
                                      }
                                    />
                                    {isDisabled && index > 0 && (
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        Select previous round date first
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex gap-3">
                            <button
                              onClick={handleSaveSchedule}
                              disabled={actionLoading === "save_schedule"}
                              className={`flex-1 py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm ${
                                !roundsSchedule.rounds.every((r) => r.date)
                                  ? "bg-blue-600 hover:bg-blue-700 text-white" // Keep it blue to encourage clicking for feedback
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }`}
                            >
                              {actionLoading === "save_schedule" ? (
                                <Loader2 className="animate-spin" size={18} />
                              ) : (
                                "Save Schedule"
                              )}
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
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-center">
                      Registration - Time Remaining
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full">
                    {[
                      { value: timeLeft.days, label: "Days" },
                      { value: timeLeft.hours, label: "Hrs" },
                      { value: timeLeft.minutes, label: "Min" },
                      { value: timeLeft.seconds, label: "Sec" },
                    ].map(({ value, label }) => (
                      <div
                        key={label}
                        className="bg-slate-50 rounded-xl p-2 sm:p-4 border border-slate-100"
                      >
                        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tabular-nums">
                          {String(value).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {tournament.registration_end && (
                    <p className="text-xs text-slate-400">
                      Ends on{" "}
                      {format(new Date(tournament.registration_end), "PPP")}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Settings Display — collapsible on mobile, always visible on md+ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Mobile Toggle Header */}
          <button
            className="w-full flex items-center justify-between p-4 sm:hidden"
            onClick={() => setShowSettingsOnMobile((prev) => !prev)}
          >
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Settings size={18} className="text-slate-400" /> Configuration
            </h2>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform duration-200 ${showSettingsOnMobile ? "rotate-180" : ""}`}
            />
          </button>

          {/* Content — always visible on md+, conditionally on mobile */}
          <div
            className={`p-4 sm:p-8 space-y-4 sm:space-y-6 ${
              showSettingsOnMobile ? "block" : "hidden sm:block"
            }`}
          >
            <h2 className="hidden sm:flex text-xl font-bold items-center gap-2 border-b border-slate-100 pb-4 text-slate-900">
              <Settings size={20} className="text-slate-400" /> Configuration
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 flex items-center gap-2">
                  <Trophy size={16} /> Name
                </span>
                <span className="font-bold text-slate-900">
                  {tournament.title}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 flex items-center gap-2">
                  <Settings size={16} /> Status
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    tournament.status === "active"
                      ? "bg-green-100 text-green-700"
                      : tournament.status === "paused"
                        ? "bg-yellow-100 text-yellow-700"
                        : tournament.status === "completed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tournament.status}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 flex items-center gap-2">
                  <DollarSign size={16} /> Prize Pool
                </span>
                <span className="font-bold text-green-600">
                  ₦{(Number(tournament.prize_pool) === 90000 ? 20000 : Number(tournament.prize_pool || 20000)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 flex items-center gap-2">
                  <Users size={16} /> Capacity
                </span>
                <span className="font-bold text-slate-900">
                  {tournament.participants_count} / {tournament.capacity}{" "}
                  Players
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 flex items-center gap-2">
                  <Trophy size={16} /> Entry Fee
                </span>
                <span className="font-bold text-slate-900">
                  ₦{tournament.entry_fee || "Free"}
                </span>
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
                    {tournament.registration_end
                      ? format(new Date(tournament.registration_end), "PP")
                      : "Not Set"}
                  </span>
                </div>

                {new Date() < new Date(tournament.registration_end) &&
                  (showExtend ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="date"
                        className="flex-1 p-2 border rounded text-sm"
                        value={newEndTime}
                        min={(() => {
                          const currentEnd = tournament.registration_end
                            ? new Date(tournament.registration_end)
                            : new Date();
                          currentEnd.setDate(currentEnd.getDate() + 1);
                          const y = currentEnd.getFullYear();
                          const m = String(currentEnd.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const d = String(currentEnd.getDate()).padStart(
                            2,
                            "0",
                          );
                          return `${y}-${m}-${d}`;
                        })()}
                        onChange={(e) => setNewEndTime(e.target.value)}
                      />
                      <button
                        onClick={handleExtend}
                        disabled={!newEndTime}
                        className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowExtend(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowExtend(true)}
                      className="w-full text-xs text-blue-600 hover:underline text-right"
                    >
                      Extend Time
                    </button>
                  ))}
              </div>

              {tournament.status === "completed" && (
                <div className="pt-4 border-t border-red-100 mt-6">
                  <button
                    onClick={() => handleAction("reset")}
                    disabled={actionLoading === "reset"}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold rounded-lg transition-colors"
                  >
                    {actionLoading === "reset" ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : null}
                    End & Clear Tournament Data
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
                    WARNING: This deletes all participants, matches, disputes,
                    and rounds to free up database space.
                    <br />
                    The tournament record is kept for history.
                  </p>
                </div>
              )}
            </div>
            {/* space-y-3 */}
          </div>
          {/* inner content wrapper */}
        </div>
        {/* Settings outer card */}
      </div>

      )}
    </div>
  );
};

export default TournamentControl;
