import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import appIcon from '../assets/app-icon.png';

const PlayerDashboard = () => {
    // For now, we mainly need the user info. We can fetch tournaments later or in a separate view.
    const { logout, user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans relative">
            
            {/* Header / Menu Icon */}
            <div className="flex justify-end p-6">
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 -mr-2 focus:outline-none"
                    aria-label="Menu"
                >
                    {/* Simple Hamburger Icon */}
                    <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Content Centered - Welcome Screen */}
            <div className="flex flex-col items-center justify-center mt-10 px-6">
                 {/* Avatar / Logo */}
                 <div className="w-24 h-24 flex items-center justify-center mb-10">
                    <img src={appIcon} alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
                </div>

                {/* Welcome Text & Alias */}
                <div className="text-center mb-12">
                    <h1 className="text-xl font-light text-slate-500 uppercase tracking-[0.2em] mb-2">
                        Welcome
                    </h1>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                        {user?.username || 'PLAYER'}
                    </h2>
                </div>

                {/* Action Buttons */}
                <div className="w-full max-w-xs space-y-4">
                    
                    <Link to="/leaderboard" className="block w-full">
                        <button className="w-full py-4 bg-slate-900 text-white rounded-full text-lg font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                            VIEW LEADERBOARD
                        </button>
                    </Link>
                </div>
            </div>

            {/* Full Screen Menu Overlay */}
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
                        
                        <h2 className="text-2xl font-normal text-slate-900 mb-8">Dashboard</h2>

                        <div className="w-full max-w-xs space-y-3">
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
                                Referral program
                            </Link>
                            <Link to="/bank-details" className="block w-full py-3 border border-slate-300 rounded-xl text-slate-600 text-left px-6 text-sm hover:border-slate-900 hover:text-slate-900 transition-colors">
                                Bank details
                            </Link>
                             <button onClick={logout} className="w-full py-3 border border-red-200 text-red-500 rounded-xl text-left px-6 text-sm hover:bg-red-50 transition-colors mt-4">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerDashboard;
