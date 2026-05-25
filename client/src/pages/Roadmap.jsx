import { useState, useEffect } from "react";
import { api } from "../utils/api";
import appIcon from "../assets/app-icon.png";
import Sidebar from "../components/Sidebar";
import Loader from "../components/Loader";
import MenuButton from "../components/MenuButton";
import SEO from "../components/SEO";

const Roadmap = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tournamentStatus, setTournamentStatus] = useState("");
  const [tournamentTitle, setTournamentTitle] = useState("Tournament Roadmap");
  const [activeRound, setActiveRound] = useState(null);
  const [isActiveRoundOngoing, setIsActiveRoundOngoing] = useState(false);
  const [nextRound, setNextRound] = useState(null);

  const formatEventDate = (dateString) => {
    if (!dateString) return "TBA";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const data = await api.get("/tournaments/current");
        const t = data.tournament;

        if (!t) {
          setLoading(false);
          return;
        }

        setTournamentStatus(t.status || "open");
        setTournamentTitle(t.title || "Tournament Roadmap");
        setActiveRound(t.active_round || null);
        setIsActiveRoundOngoing(t.is_active_round_ongoing || false);
        setNextRound(t.next_target_round || null);

        const dynamicEvents = [];

        // 1. Registration Phase
        if (t.registration_start && t.registration_end) {
          const dStart = formatEventDate(t.registration_start);
          const dEnd = formatEventDate(t.registration_end);
          dynamicEvents.push({
            date: `${dStart} - ${dEnd}`,
            event: "Registration Phase",
            phaseType: "registration",
          });
        } else {
          dynamicEvents.push({
            date: "TBA",
            event: "Registration Phase",
            phaseType: "registration",
          });
        }

        // 2. Round Phases
        if (
          t.rounds_config &&
          t.rounds_config.rounds &&
          t.rounds_config.rounds.length > 0
        ) {
          t.rounds_config.rounds.forEach((r) => {
            const eventName = r.name || `Round ${r.round_number}`;

            dynamicEvents.push({
              date: r.date ? formatEventDate(r.date) : "TBA",
              event: eventName,
              round_num: r.round_number,
              date_raw: r.date,
              phaseType: "round",
            });
          });
        } else {
          // Fallback if schedule completely missing
          dynamicEvents.push({
            date: "TBA",
            event: "Tournament Pending",
            phaseType: "round",
          });
        }

        setEvents(dynamicEvents);
      } catch (error) {
        console.error("Failed to load roadmap", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, []);

  // Determine what node is currently skipped (due to bracket jumps)
  const isPhaseSkipped = (item) => {
    if (item.phaseType !== "round") return false;
    if (item.event && item.event.includes("(Skipped)")) return true;

    if (activeRound && nextRound) {
      const rNum = Number(item.round_num);
      const aNum = Number(activeRound.round_number);
      const nNum = Number(nextRound.round_number);
      if (rNum > aNum && rNum < nNum) {
        return true;
      }
    }
    return false;
  };

  // Helper to check if a date string is today's date in local calendar timezone, handling UTC/string format safely
  const isTodayDate = (dateString) => {
    if (!dateString) return false;
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      if (typeof dateString === "string") {
        const cleanDate = dateString.split("T")[0];
        if (cleanDate === todayStr) return true;
      }

      const eventDate = new Date(dateString);
      const localMatch =
        today.getFullYear() === eventDate.getFullYear() &&
        today.getMonth() === eventDate.getMonth() &&
        today.getDate() === eventDate.getDate();

      const utcMatch =
        today.getFullYear() === eventDate.getUTCFullYear() &&
        today.getMonth() === eventDate.getUTCMonth() &&
        today.getDate() === eventDate.getUTCDate();

      return localMatch || utcMatch;
    } catch (e) {
      console.error("Failed to parse date", e);
      return false;
    }
  };

  // Determine what node is currently "active"
  const isPhaseActive = (item, index, allItems) => {
    if (item.phaseType === "registration") {
      return tournamentStatus === "open";
    }

    if (item.phaseType === "round") {
      if (tournamentStatus === "completed") return false;
      if (tournamentStatus === "scheduled" || tournamentStatus === "open")
        return false;
      if (isPhaseSkipped(item)) return false;

      const isActiveRound =
        activeRound &&
        Number(activeRound.round_number) === Number(item.round_num);
      const isRoundToday = isTodayDate(item.date_raw);
      return isActiveRound && isActiveRoundOngoing && isRoundToday;
    }
    return false;
  };

  const isPhasePast = (item, index, allItems) => {
    if (tournamentStatus === "completed") return true;
    if (item.phaseType === "registration" && tournamentStatus !== "open")
      return true;

    if (item.phaseType === "round") {
      if (isPhaseSkipped(item)) return false;

      if (activeRound) {
        if (Number(item.round_num) < Number(activeRound.round_number)) {
          return true;
        }
        if (
          Number(item.round_num) === Number(activeRound.round_number) &&
          !isActiveRoundOngoing
        ) {
          return true;
        }
      }
    }

    return false;
  };

  const isAnyRoundLive = events.some((item, idx) =>
    isPhaseActive(item, idx, events),
  );
  const nextUpcomingIndex = events.findIndex(
    (item, idx) => !isPhasePast(item, idx, events) && !isPhaseSkipped(item),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      <SEO
        title="Tournament Roadmap"
        description="See the INCØGNITØ tournament roadmap, registration phase, match rounds, and competition schedule for upcoming campus esports events."
      />
      {/* Ambient Background Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative z-20">
        <img
          src={appIcon}
          alt="Logo"
          className="absolute left-4 w-8 h-8 object-contain"
        />
        <span className="font-bold text-lg tracking-wider text-slate-800">
          INCØGNITØ
        </span>
        <MenuButton onClick={() => setIsMenuOpen(true)} />
      </div>

      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 relative z-10">
        {/* Header Title */}
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-xs sm:text-sm font-bold text-indigo-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2">
            Tournament Roadmap
          </h2>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tighter">
            {tournamentTitle}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-slate-200">
            <div className="text-4xl mb-4">🗓️</div>
            <p className="text-slate-500 font-medium">
              No tournament schedule available yet.
            </p>
          </div>
        ) : (
          <div className="relative pl-8 sm:pl-16">
            {/* Vertical Connecting Line */}
            <div className="absolute left-[14px] sm:left-[28px] top-10 sm:top-10 bottom-8 w-1 bg-slate-200 rounded-full"></div>

            <div className="space-y-6 sm:space-y-10">
              {events.map((item, index) => {
                const active = isPhaseActive(item, index, events);
                const past = isPhasePast(item, index, events);
                const skipped = isPhaseSkipped(item);
                const showInterimDot =
                  !isAnyRoundLive &&
                  nextUpcomingIndex > 0 &&
                  index === nextUpcomingIndex - 1;

                return (
                  <div
                    key={index}
                    className={`relative flex items-center group transition-all duration-300 ${active ? "scale-[1.02] sm:scale-105" : ""}`}
                  >
                    {/* Glowing Timeline Dot */}
                    <div
                      className={`absolute -left-4 -translate-x-1/2 sm:-left-[34px] sm:-translate-x-1/2 w-5 h-5 sm:w-6 sm:h-6 mt-0.5 sm:mt-0 rounded-full border-4 shadow-sm z-10 transition-all duration-500 flex-shrink-0 origin-center ${
                        active
                          ? "border-indigo-500 bg-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-125"
                          : index === nextUpcomingIndex
                            ? "border-indigo-400 bg-white shadow-[0_0_8px_rgba(99,102,241,0.3)] scale-110"
                            : past
                              ? "border-emerald-400 bg-emerald-50"
                              : skipped
                                ? "border-slate-300 bg-slate-100 border-dashed scale-95 opacity-60"
                                : "border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    ></div>

                    {/* Interim Progress Dot */}
                    {showInterimDot && (
                      <div
                        className="absolute top-full -left-4 -translate-x-1/2 sm:-left-[34px] sm:-translate-x-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 border-indigo-500 bg-white shadow-[0_0_15px_rgba(99,102,241,0.6)] scale-110 z-20 translate-y-3 sm:translate-y-5 flex items-center justify-center animate-pulse"
                        title="Tournament in progress"
                      >
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      </div>
                    )}

                    {/* Content Card */}
                    {skipped ? (
                      <div className="w-full p-4 sm:p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 text-slate-400 opacity-60 shadow-none transition-all duration-300">
                        <div className="flex items-center justify-between gap-2 mb-2 w-full">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400/50 text-left">
                            {item.date}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[9px] font-bold tracking-wider uppercase border border-slate-200/40 flex-shrink-0">
                            Skipped
                          </span>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight leading-tight text-slate-400/70 line-through decoration-slate-300 decoration-1">
                            {item.event.replace("(Skipped)", "").trim()}
                          </h3>
                        </div>
                      </div>
                    ) : active ? (
                      <div className="w-full p-4 sm:p-6 rounded-2xl border bg-indigo-600 border-indigo-500 text-white shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between gap-2 mb-2 w-full">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 text-left">
                            {item.date}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500 text-white rounded-full text-[9px] font-extrabold tracking-wider uppercase shadow-sm flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            Live Now
                          </span>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-tight text-white">
                            {item.event}
                          </h3>
                        </div>
                        <div className="mt-3 pt-3 border-t border-indigo-500/50 text-indigo-100 text-xs sm:text-sm font-medium text-left">
                          Matches in progress. View brackets or submit scores!
                        </div>
                      </div>
                    ) : index === nextUpcomingIndex ? (
                      <div className="w-full p-4 sm:p-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-blue-50/90 text-slate-800 shadow-md backdrop-blur-md hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between gap-2 mb-2 w-full">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 text-left">
                            {item.date}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-indigo-200/50 shadow-sm flex-shrink-0">
                            Next Up
                          </span>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-tight text-slate-800">
                            {item.event}
                          </h3>
                        </div>
                      </div>
                    ) : past ? (
                      <div className="w-full p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white/60 text-slate-400 opacity-80 hover:bg-white/80 transition-all duration-300">
                        <div className="flex items-center justify-between gap-2 mb-2 w-full">
                          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-400 text-left">
                            {item.date}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold tracking-wider uppercase border border-emerald-200 flex-shrink-0">
                            ✓ Completed
                          </span>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight text-slate-500">
                            {item.event}
                          </h3>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-4 sm:p-6 rounded-2xl border border-slate-100 bg-white text-slate-800 shadow-sm hover:border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between gap-2 mb-2 w-full">
                          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-400 text-left">
                            {item.date}
                          </span>
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg sm:text-2xl font-extrabold tracking-tight leading-tight text-slate-700">
                            {item.event}
                          </h3>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Roadmap;
