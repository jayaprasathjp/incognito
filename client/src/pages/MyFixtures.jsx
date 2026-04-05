import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Loader from '../components/Loader';
import Sidebar from '../components/Sidebar';

const MyFixtures = () => {
    const { token, user } = useAuth();
    const [fixtures, setFixtures] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFixtures = async () => {
             setLoading(true);
            try {
                const data = await api.get('/matches/my-fixtures');
                setFixtures(data);
            } catch (error) {
                console.error("Error fetching fixtures", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchFixtures();
    }, [token]);

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

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <div className="p-6">
            {/* Page Title */}
            <div className="text-center mb-10">
                 <h1 className="text-xl font-light text-slate-900 uppercase tracking-[0.2em]">MY FIXTURES</h1>
            </div>

            <div className="max-w-md mx-auto space-y-4">
                {loading ? (
                    <Loader />
                ) : fixtures.length === 0 ? (
                    <div className="text-center text-slate-400 py-12 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-sm">No fixtures found yet.</p>
                    </div>
                ) : fixtures.map((match) => {
                    // Logic to find opponent
                    const isPlayer1 = match.player1_id === user?.id; // Assuming user.id is available from context
                    const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
                    // If no opponent yet (e.g. waiting for TBD), handle it
                    const displayName = opponentName || "TBD";

                    return (
                        <div key={match.id} className="border border-slate-200 rounded-xl p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-all bg-white group">
                            <div>
                                <h3 className="text-slate-900 font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                                    vs {displayName}
                                </h3>
                                <div className="flex items-center gap-2">
                                     <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full">Round {match.round}</span>
                                     <span className="text-slate-400 text-xs font-medium">• {match.status}</span>
                                </div>
                            </div>
                            <Link to={`/match/${match.id}`} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-800 transition-transform active:scale-95 shadow-md">
                                View
                            </Link>
                        </div>
                    );
                })}
            </div>
            </div>
        </div>
    );
};

export default MyFixtures;
