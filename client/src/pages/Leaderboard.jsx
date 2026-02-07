import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Loader from '../components/Loader';

const Leaderboard = () => {
    const { user, logout } = useAuth();
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
             {/* Header / Menu Icon */}
             <div className="flex justify-between items-center p-6">
                <div className="w-8"></div> {/* Spacer for centering if needed, or back button */}
                <div className="flex flex-col items-center">
                    <img src={appIcon} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
                </div>
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 -mr-2 focus:outline-none"
                    aria-label="Menu"
                >
                    <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Menu Dropdown */}

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

            {/* Menu Overlay (Conditional) */}
            {isMenuOpen && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col px-6 py-6 animate-fade-in">
                    {/* Close Button */}
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 -mr-2 text-slate-900 focus:outline-none"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Menu Content */}
                    <div className="flex flex-col items-center mt-4">
                        {/* Logo */}
                        <img src={appIcon} alt="Logo" className="w-16 h-16 object-contain drop-shadow-lg mb-6" />
                        
                        <h2 className="text-2xl font-normal text-slate-900 mb-8">Menu</h2>

                        <div className="w-full max-w-xs space-y-3">
                            {!user && (
                                <Link to="/" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                    Home
                                </Link>
                            )}

                            {user ? (
                                <>
                                    <Link to="/dashboard" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        Dashboard (Main)
                                    </Link>
                                    <Link to="/roadmap" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        Roadmap
                                    </Link>
                                    <Link to="/rules" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        Rules
                                    </Link>
                                    <Link to="/fixtures" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        My fixtures
                                    </Link>
                                    <Link to="/upload" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        Upload
                                    </Link>
                                    <Link to="/bracket" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        League bracket
                                    </Link>
                                    <Link to="/referral" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        Participate in the referral program
                                    </Link>
                                    <Link to="/bank-details" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                        Add my bank details
                                    </Link>
                                     <button onClick={logout} className="w-full py-3 border border-red-200 text-red-500 rounded-xl text-left px-6 text-sm hover:bg-red-50 transition-colors mt-4">
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link to="/login" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
