import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';

const Rules = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const rules = [
        {
            id: 1,
            title: 'Individual Alias by player',
            description: 'All players must play and be identified individually by their set usernames.'
        },
        {
            id: 2,
            title: 'No group or shared use of any player’s room',
            description: 'Player matches must be played individually without any form of collaboration.'
        },
        {
            id: 3,
            title: 'Player must participate in 3 out of 4 activities',
            description: 'Each player must complete at least 3 of the 4 scheduled activities to remain in the tournament.'
        }
    ];

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative">
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="text-slate-900 focus:outline-none absolute right-0"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="w-full flex justify-center">
                    <img src={appIcon} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
                </div>
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

             {/* Page Title */}
             <div className="text-center mb-10">
                 <h1 className="text-xl font-light text-slate-900 uppercase tracking-[0.2em]">RULES</h1>
            </div>

            {/* Rules List */}
            <div className="max-w-md mx-auto space-y-8">
                {rules.map((rule) => (
                    <div key={rule.id} className="flex gap-5">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                                {rule.id}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-bold text-lg mb-2">{rule.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                {rule.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Rules;
