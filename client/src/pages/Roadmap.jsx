import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';

const Roadmap = () => {
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
        <div className="min-h-screen bg-white text-slate-900 font-sans p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative">
                <Link to="/leaderboard" className="text-slate-900 focus:outline-none absolute left-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="w-full flex justify-center">
                    <img src={appIcon} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
                </div>
            </div>

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
    );
};

export default Roadmap;
