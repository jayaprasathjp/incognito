import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Loader from '../components/Loader';
import Sidebar from '../components/Sidebar';

const Leaderboard = () => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await api.get('/leaderboard');
                setLeaderboardData(data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);


    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans relative">
             {/* Header */}
             <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative">
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

            {/* Sidebar Component */}
            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Content Container */}
            {/* Leaderboard Table */}
            <div className="max-w-4xl mx-auto px-4 pb-10">
                <h2 className="text-center text-2xl font-light text-slate-800 mb-8 tracking-widest uppercase border-b border-slate-100 pb-4">
                    Leaderboard
                </h2>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                                <th className="p-2 sm:p-4 text-center w-12 sm:w-16">Pos</th>
                                <th className="p-2 sm:p-4">Player</th>
                                <th className="p-2 sm:p-4 text-center w-12 sm:w-20">Pts</th>
                                <th className="p-2 sm:p-4 text-center w-12 sm:w-20">GB</th>
                                <th className="p-2 sm:p-4 text-center w-12 sm:w-20">GS</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700 text-xs sm:text-sm font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-12">
                                        <Loader />
                                    </td>
                                </tr>
                            ) : leaderboardData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-light">
                                        No standings available yet.
                                    </td>
                                </tr>
                            ) : (
                                leaderboardData.map((player, index) => {
                                    // Highlight top 3
                                    let positionStyle = "bg-slate-100 text-slate-500";
                                    let rowStyle = "hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0";
                                    
                                    if (index === 0) {
                                        positionStyle = "bg-yellow-100 text-yellow-700"; 
                                        rowStyle += " bg-yellow-50/30";
                                    } else if (index === 1) {
                                        positionStyle = "bg-slate-200 text-slate-600";
                                    } else if (index === 2) {
                                        positionStyle = "bg-orange-100 text-orange-700";
                                    }

                                    return (
                                        <tr key={player.id} className={rowStyle}>
                                            <td className="p-2 sm:p-4 text-center">
                                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mx-auto text-[10px] sm:text-xs font-bold ${positionStyle}`}>
                                                    {player.position}
                                                </div>
                                            </td>
                                            <td className="p-2 sm:p-4">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    {/* Avatar placeholder if needed, or just text */}
                                                     <div className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 border border-slate-200 items-center justify-center text-lg">
                                                        👾
                                                    </div>
                                                    <span className="text-slate-900 font-bold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{player.alias}</span>
                                                </div>
                                            </td>
                                            <td className="p-2 sm:p-4 text-center text-slate-900 font-bold text-base sm:text-lg">{player.pts}</td>
                                            <td className="p-2 sm:p-4 text-center text-slate-500 text-xs sm:text-base">{player.gb}</td>
                                            <td className="p-2 sm:p-4 text-center text-slate-500 text-xs sm:text-base">{player.gs}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    );
};

export default Leaderboard;
