import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPortal } from 'react-dom';

const Sidebar = ({ isOpen, onClose }) => {
    const { logout, user } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return createPortal(
        <>
            {/* Overlay */}
            <div 
                className={`fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <div 
                className={`fixed top-0 right-0 h-full w-[75%] max-w-[300px] bg-white z-[9999] shadow-2xl transform transition-transform duration-300 ease-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-xl font-light tracking-widest text-slate-900">MENU</h2>
                        <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 space-y-2 overflow-y-auto">
                        {!user ? (
                            // Spectator / Guest Links
                            <>
                                <Link 
                                    to="/" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Home
                                </Link>
                                <Link 
                                    to="/leaderboard" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/leaderboard') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Leaderboard
                                </Link>
                                <Link 
                                    to="/login" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/login') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Login
                                </Link>
                                <Link 
                                    to="/register" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/register') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Register
                                </Link>
                            </>
                        ) : (
                            // Authenticated Player Links
                            <>
                                <Link 
                                    to="/dashboard" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/dashboard') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Dashboard
                                </Link>
                                <Link 
                                    to="/leaderboard" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/leaderboard') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Leaderboard
                                </Link>
                                <Link 
                                    to="/roadmap" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/roadmap') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Roadmap
                                </Link>
                                <Link 
                                    to="/rules" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/rules') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Rules
                                </Link>
                                <Link 
                                    to="/fixtures" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/fixtures') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    My Fixtures
                                </Link>
                                <Link 
                                    to="/upload" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/upload') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Upload
                                </Link>
                                <Link 
                                    to="/bracket" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/bracket') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    League Bracket
                                </Link>
                                <Link 
                                    to="/referral" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/referral') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Referral Program
                                </Link>
                                <Link 
                                    to="/bank-details" 
                                    className={`block p-4 rounded-xl text-sm font-medium transition-all ${
                                        isActive('/bank-details') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                    onClick={onClose}
                                >
                                    Bank Details
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Footer / Logout */}
                    {user && (
                        <div className="pt-6 border-t border-slate-100">
                            <button 
                                onClick={() => {
                                    logout();
                                    onClose();
                                }}
                                className="w-full py-3 px-4 flex items-center gap-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="font-medium text-sm">Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
};

export default Sidebar;
