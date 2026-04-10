import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';

const Roadmap = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tournamentStatus, setTournamentStatus] = useState('');
    const [tournamentTitle, setTournamentTitle] = useState('Tournament Roadmap');

    const formatEventDate = (dateString) => {
        if (!dateString) return 'TBA';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    useEffect(() => {
        const fetchRoadmap = async () => {
            try {
                const data = await api.get('/tournaments/current');
                const t = data.tournament;
                
                if (!t) {
                    setLoading(false);
                    return;
                }

                setTournamentStatus(t.status || 'open');
                setTournamentTitle(t.title || 'Tournament Roadmap');
                
                const dynamicEvents = [];

                // 1. Registration Phase
                if (t.registration_start && t.registration_end) {
                    const dStart = formatEventDate(t.registration_start);
                    const dEnd = formatEventDate(t.registration_end);
                    dynamicEvents.push({ 
                        date: `${dStart} - ${dEnd}`, 
                        event: 'Registration Phase', 
                        phaseType: 'registration' 
                    });
                } else {
                    dynamicEvents.push({ date: 'TBA', event: 'Registration Phase', phaseType: 'registration' });
                }

                // 2. Round Phases
                if (t.rounds_config && t.rounds_config.rounds && t.rounds_config.rounds.length > 0) {
                    t.rounds_config.rounds.forEach((r) => {
                        const eventName = r.name || `Round ${r.round_number}`;

                        dynamicEvents.push({ 
                            date: r.date ? formatEventDate(r.date) : 'TBA', 
                            event: eventName, 
                            round_num: r.round_number,
                            date_raw: r.date,
                            phaseType: 'round'
                        });
                    });
                } else {
                    // Fallback if schedule completely missing
                    dynamicEvents.push({ date: 'TBA', event: 'Tournament Pending', phaseType: 'round' });
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

    // Determine what node is currently "active"
    const isPhaseActive = (item, index, allItems) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        if (item.phaseType === 'registration') {
            return tournamentStatus === 'open';
        }
        
        if (item.phaseType === 'round') {
            if (tournamentStatus === 'completed') return false; 
            if (tournamentStatus === 'scheduled' || tournamentStatus === 'open') return false;
            
            // If active tournament, basically if it's the latest round that is <= today
            if (item.date_raw && item.date_raw <= todayStr) {
                // Is there a next round that is ALSO <= today? If so, this is past.
                const nextRound = allItems[index + 1];
                if (!nextRound || !nextRound.date_raw || nextRound.date_raw > todayStr) {
                    return true;
                }
            }
        }
        return false;
    };

    const isPhasePast = (item, index, allItems) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        if (tournamentStatus === 'completed') return true;
        if (item.phaseType === 'registration' && tournamentStatus !== 'open') return true;

        if (item.phaseType === 'round' && item.date_raw && item.date_raw < todayStr && !isPhaseActive(item, index, allItems)) {
            return true;
        }

        return false;
    };


    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>

             {/* Header */}
             <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative z-20">
                <img src={appIcon} alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="absolute right-4 p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 focus:outline-none"
                    aria-label="Menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
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
                    <div className="flex justify-center py-20"><Loader /></div>
                ) : events.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-slate-200">
                        <div className="text-4xl mb-4">🗓️</div>
                        <p className="text-slate-500 font-medium">No tournament schedule available yet.</p>
                    </div>
                ) : (
                    <div className="relative pl-10 sm:pl-16">
                        {/* Vertical Connecting Line */}
                        <div className="absolute left-[18px] sm:left-[28px] top-10 sm:top-10 bottom-8 w-1 bg-slate-200 rounded-full"></div>

                        <div className="space-y-6 sm:space-y-10">
                            {events.map((item, index) => {
                                const active = isPhaseActive(item, index, events);
                                const past = isPhasePast(item, index, events);
                                
                                return (
                                    <div key={index} className={`relative flex items-center group transition-all duration-300 ${active ? 'scale-[1.02] sm:scale-105' : ''}`}>
                                        
                                        {/* Glowing Timeline Dot */}
                                        <div className={`absolute -left-10 sm:-left-16 w-5 h-5 sm:w-6 sm:h-6 mt-0.5 sm:mt-0 rounded-full border-4 shadow-sm z-10 transition-colors duration-500 flex-shrink-0 origin-center translate-x-[9px] sm:translate-x-[18px] ${
                                            active ? 'border-indigo-500 bg-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-125' : 
                                            past ? 'border-indigo-400 bg-indigo-50' : 
                                            'border-slate-300 bg-white group-hover:border-slate-400'
                                        }`}></div>

                                        {/* Content Card */}
                                        <div className={`w-full p-4 sm:p-6 rounded-2xl border backdrop-blur-md shadow-sm transition-all duration-300 ${
                                            active ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 
                                            past ? 'bg-white/60 border-slate-200 text-slate-500 opacity-80' : 
                                            'bg-white border-white hover:border-slate-200 text-slate-800 shadow-md'
                                        }`}>
                                            <div className="flex flex-col sm:flex-row justify-center sm:items-center sm:justify-between gap-1 sm:gap-4">
                                                <div className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${active ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {item.date}
                                                </div>
                                                <div className={`text-lg sm:text-2xl font-black tracking-tight leading-none ${active ? 'text-white' : 'text-slate-800'}`}>
                                                    {item.event}
                                                </div>
                                            </div>
                                            
                                            {/* Optional Subtext inside Active Card */}
                                            {active && (
                                                <div className="mt-3 text-indigo-100 text-xs sm:text-sm font-medium flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0"></span>
                                                    Current Phase live
                                                </div>
                                            )}
                                        </div>
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
