import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const MyFixtures = () => {
    const { token, user } = useAuth();
    const [fixtures, setFixtures] = useState([]);

    useEffect(() => {
        const fetchFixtures = async () => {
            try {
                const data = await api.get('/matches/my-fixtures');
                setFixtures(data);
            } catch (error) {
                console.error("Error fetching fixtures", error);
            }
        };

        if (token) fetchFixtures();
    }, [token]);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative">
                <Link to="/dashboard" className="text-slate-900 focus:outline-none absolute left-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="w-full flex justify-center">
                    <img src={appIcon} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
                </div>
            </div>

            {/* Page Title */}
            <div className="text-center mb-10">
                 <h1 className="text-xl font-light text-slate-900 uppercase tracking-[0.2em]">MY FIXTURES</h1>
            </div>

            <div className="max-w-md mx-auto space-y-4">
                {fixtures.length === 0 ? (
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
                            <button className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-800 transition-transform active:scale-95 shadow-md">
                                View
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MyFixtures;
