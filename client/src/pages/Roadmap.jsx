
import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';

const Roadmap = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const events = [
        { date: 'March 1-20', event: 'Registration' },
        { date: 'March 23', event: 'Round of 1024' },
        { date: 'March 24', event: 'Round of 512' },
        { date: 'March 25', event: 'Round of 256' },
        { date: 'March 26', event: 'Round of 128' },
        { date: 'March 27', event: 'Round of 64' },
        { date: 'March 28', event: 'Round of 32' },
        { date: 'March 29', event: 'Round of 16' },
        { date: 'March 30', event: 'Quarter finals' },
        { date: 'March 31', event: 'Semi finals' },
        { date: 'Apr 1', event: 'Final' },
    ];

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
            <div className="text-center mb-8">
                 <h1 className="text-xl font-light text-slate-900 uppercase tracking-[0.2em]">ROADMAP</h1>
            </div>

            {/* List */}
            <div className="max-w-md mx-auto space-y-4">
                {events.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-4 border-b border-slate-100 last:border-0">
                        <span className="text-slate-400 text-sm font-medium w-1/3">{item.date}</span>
                        <span className="text-slate-800 text-base font-medium w-2/3 text-right">{item.event}</span>
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
};

export default Roadmap;
