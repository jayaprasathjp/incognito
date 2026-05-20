import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Loader from '../components/Loader';
import Sidebar from '../components/Sidebar';
import MenuButton from '../components/MenuButton';
import SEO from '../components/SEO';

const Leaderboard = () => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [tournamentData, setTournamentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [tooltipState, setTooltipState] = useState({ visible: false, x: 0, y: 0, player: null });
    const itemsPerPage = 10;

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const data = await api.get('/leaderboard');
            if (data.leaderboard) {
                setLeaderboardData(data.leaderboard);
                setTournamentData(data.tournament);
            } else {
                setLeaderboardData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const getInstitutionAbbrev = (institutionStr) => {
        if (!institutionStr || institutionStr === 'N/A') return '';
        const words = institutionStr.trim().split(/\s+/);
        if (words.length > 1) {
            return words.map(w => w[0]).join('').toUpperCase();
        }
        return institutionStr.substring(0, 4).toUpperCase();
    };

    const isPreGame = leaderboardData.every(p => p.pts === 0 && p.ga === 0 && p.gf === 0);
    const hasChampion = tournamentData?.status === 'completed' && tournamentData?.winner_id;
    const champion = hasChampion ? leaderboardData.find(p => p.id === tournamentData.winner_id) : null;
    const standardRoster = hasChampion ? leaderboardData.filter(p => p.id !== tournamentData.winner_id) : leaderboardData;

    // Filter by search query
    const filteredRoster = standardRoster.filter(p => 
        p.alias.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.institution && p.institution.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredRoster.length / itemsPerPage);
    const paginatedRoster = filteredRoster.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
            <SEO
                title="Leaderboard"
                description="Track the official INCØGNITØ leaderboard, tournament rankings, points, goals scored, and campus esports standings."
            />
            {/* Ambient Background Elements */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none"></div>

             {/* Header */}
             <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative z-20">
                <img src={appIcon} alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <MenuButton onClick={() => setIsMenuOpen(true)} />
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <div className="max-w-4xl mx-auto px-4 py-5 relative z-10">
                
                {/* Header Title */}
                <div className="text-center mb-5">
                    <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-[0.3em] mb-2">
                        {isPreGame ? 'Tournament Roster' : 'Official Rankings'}
                    </h2>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
                        Leaderboard
                    </h1>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader /></div>
                ) : leaderboardData.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-slate-200">
                        <div className="text-4xl mb-4">📭</div>
                        <p className="text-slate-500 font-medium">No players registered yet.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        
                        {/* Champion Showcase */}
                        {champion && (
                            <div className="relative group mx-auto max-w-2xl transform hover:scale-[1.02] transition-transform duration-500">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>
                                <div className="relative bg-slate-900 rounded-3xl p-1 border border-slate-800 overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/40 via-slate-900 to-slate-900"></div>
                                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500 rounded-full blur-[80px] opacity-20"></div>
                                    
                                    <div className="relative z-10 p-8 text-center flex flex-col items-center">
                                        <div className="text-6xl mb-2 animate-[bounce_2s_ease-in-out_infinite]">👑</div>
                                        <h3 className="text-[10px] text-amber-500 font-black uppercase tracking-[0.4em] mb-6 drop-shadow-md">Undisputed Champion</h3>
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600 p-1 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-3xl font-black text-amber-400">
                                                    {champion.alias[0]?.toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <div className="text-3xl font-black text-white tracking-wide flex items-center gap-3">
                                                    {champion.alias}
                                                    {getInstitutionAbbrev(champion.institution) && (
                                                        <span className="bg-amber-500/20 text-amber-400 text-xs font-black uppercase px-2 py-1 rounded-full border border-amber-500/30">
                                                            {getInstitutionAbbrev(champion.institution)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-amber-500/80 font-bold text-sm tracking-widest uppercase mt-1">
                                                    {champion.pts} PTS • {champion.gf} GF • {champion.ga} GA • GD {champion.gd >= 0 ? '+' : ''}{champion.gd}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search and Filters */}
                        {standardRoster.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                                <div className="flex items-center gap-2 w-full sm:w-auto max-w-sm sm:max-w-none">
                                    <div className="relative flex-grow sm:w-72 group transition-all duration-300">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-indigo-500/70 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                            </svg>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Search alias or University..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2.5 bg-white/40 hover:bg-white/60 focus:bg-white/90 backdrop-blur-xl border border-white/50 focus:border-indigo-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-md shadow-indigo-500/5 transition-all text-slate-800 placeholder:text-slate-400 font-bold text-xs"
                                        />
                                        {searchQuery && (
                                            <button 
                                                onClick={() => setSearchQuery('')}
                                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={fetchLeaderboard}
                                        className="flex-shrink-0 p-2.5 bg-white/40 hover:bg-white/60 focus:bg-white/90 backdrop-blur-xl border border-white/50 focus:border-indigo-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-md shadow-indigo-500/5 transition-all text-indigo-600 font-bold text-xs flex items-center gap-2 active:scale-95"
                                        title="Refresh Leaderboard"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                        </svg>
                                        <span className="hidden sm:inline">Refresh</span>
                                    </button>
                                </div>
                                
                                {searchQuery && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500 ml-auto sm:ml-0">
                                        <div className="h-1 w-1 rounded-full bg-indigo-400 animate-pulse"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50/50 backdrop-blur-sm px-3 py-1 rounded-full border border-indigo-100/50">
                                            {filteredRoster.length} {filteredRoster.length === 1 ? 'match' : 'matches'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Roster / Rankings Table */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl border border-white overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] border-b border-slate-800/10">
                                            <th className="p-2 sm:p-5 text-center w-12 sm:w-20">Rank</th>
                                            <th className="p-2 sm:p-5">Alias</th>
                                            <th className="p-2 sm:p-5 text-center w-14 sm:w-24">PTS</th>
                                            <th className="p-2 sm:p-5 text-center w-14 sm:w-24">GD</th>
                                            <th className="p-2 sm:p-5 text-center w-14 sm:w-24">GF</th>
                                            <th className="p-2 sm:p-5 text-center w-14 sm:w-24">GA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedRoster.length > 0 ? paginatedRoster.map((player, index) => {
                                            // The absolute rank across all pages
                                            const absoluteRank = (currentPage - 1) * itemsPerPage + index;
                                            const isTop3 = !hasChampion && absoluteRank < 3 && !isPreGame;
                                            
                                            return (
                                                <tr 
                                                    key={player.id} 
                                                    className="group hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <td className="p-2 sm:p-5 text-center">
                                                        {isPreGame ? (
                                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] sm:text-xs font-bold mx-auto">
                                                                -
                                                            </div>
                                                        ) : (
                                                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black mx-auto transition-transform group-hover:scale-110 ${
                                                                isTop3 && absoluteRank === 0 ? 'bg-amber-100 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.2)]' :
                                                                isTop3 && absoluteRank === 1 ? 'bg-slate-200 text-slate-600 shadow-[0_0_15px_rgba(148,163,184,0.2)]' :
                                                                isTop3 && absoluteRank === 2 ? 'bg-orange-100 text-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.2)]' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {player.position}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td 
                                                        className="p-2 sm:p-5 cursor-pointer sm:cursor-default active:bg-slate-100 sm:active:bg-transparent transition-colors relative" 
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            // Always pop out at a fixed offset to the right of the column
                                                            // instead of varying based on the exact click location
                                                            setTooltipState({
                                                                visible: true,
                                                                x: rect.left + 120, // Fixed distance from the cell's left edge
                                                                y: rect.top + (rect.height / 2), // Center vertically with row
                                                                player
                                                            });
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-800 font-bold text-sm sm:text-lg truncate max-w-[80px] sm:max-w-none">{player.alias}</span>
                                                            {getInstitutionAbbrev(player.institution) && (
                                                                <span className="bg-slate-100 text-slate-500 text-[8px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                                                                    {getInstitutionAbbrev(player.institution)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 sm:p-5 text-center">
                                                        <span className={`font-black text-sm sm:text-xl ${isPreGame ? 'text-slate-300' : 'text-indigo-600'}`}>
                                                            {player.pts}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 sm:p-5 text-center">
                                                        <span className={`font-bold text-xs sm:text-base ${
                                                            isPreGame ? 'text-slate-300' :
                                                            player.gd > 0 ? 'text-emerald-600' :
                                                            player.gd < 0 ? 'text-rose-500' :
                                                            'text-slate-400'
                                                        }`}>
                                                            {isPreGame ? '-' : (player.gd >= 0 ? `+${player.gd}` : player.gd)}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 sm:p-5 text-center">
                                                        <span className="font-bold text-xs sm:text-base text-slate-400">{player.gf}</span>
                                                    </td>
                                                    <td className="p-2 sm:p-5 text-center">
                                                        <span className="font-bold text-xs sm:text-base text-slate-400">{player.ga}</span>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-slate-400">
                                                    No players found matching "{searchQuery}"
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <span className="text-xs font-medium text-slate-500">
                                        Showing {Math.min(filteredRoster.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredRoster.length, currentPage * itemsPerPage)} of {filteredRoster.length}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        >
                                            Prev
                                        </button>
                                        <div className="flex gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                // Dynamic window of page numbers
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;
                                                
                                                return (
                                                    <button 
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                                            currentPage === pageNum 
                                                            ? 'bg-indigo-600 text-white shadow-md' 
                                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Player Info Tooltip - True Floating Behavior */}
            {tooltipState.visible && tooltipState.player && (
                <>
                    {/* Invisible backdrop to dismiss when tapping away */}
                    <div 
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setTooltipState(prev => ({ ...prev, visible: false }))}
                    ></div>

                    {/* Floating Tooltip Bubble (Right-facing) */}
                    <div 
                        className="fixed z-50 bg-indigo-950 border border-indigo-400/40 text-white rounded-lg shadow-[0_8px_30px_rgba(79,70,229,0.3)] px-3 py-2.5 max-w-[180px] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                        style={{ 
                            left: `${tooltipState.x}px`, 
                            top: `${tooltipState.y}px`,
                            transform: 'translateY(-50%)' // Center bubble vertically with the arrow
                        }}
                    >
                        {/* Little directional arrow (caret) pointing LEFT at the text */}
                        <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-indigo-950 border-b border-l border-indigo-400/40 transform rotate-45"></div>
                        
                        <div className="relative z-10">
                            <div className="font-extrabold text-xs mb-0.5 text-white truncate drop-shadow-md">{tooltipState.player.alias}</div>
                            <div className="text-indigo-200 text-[10px] uppercase font-bold leading-tight line-clamp-2">
                                {tooltipState.player.institution && tooltipState.player.institution !== 'N/A' ? tooltipState.player.institution : "Not Specified"}
                            </div>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
};

export default Leaderboard;
