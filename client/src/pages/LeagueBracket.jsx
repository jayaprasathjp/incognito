import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';

const LeagueBracket = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans p-4 overflow-x-hidden">
             {/* Header */}
             <div className="flex justify-between items-center mb-8 relative">
                <Link to="/dashboard" className="text-slate-900 focus:outline-none absolute left-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="w-full flex justify-center">
                    <img src={appIcon} alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
                </div>
            </div>

            {/* Page Title */}
            <div className="text-center mb-10">
                 <h1 className="text-xl font-light text-slate-900 uppercase tracking-[0.2em]">LEAGUE BRACKET</h1>
            </div>

            {/* Bracket Container - Mobile Scaled */}
            <div className="flex gap-4 overflow-x-auto pb-8 min-w-full">
                
                {/* Column 1 - Round of 8 */}
                <div className="flex flex-col gap-4 min-w-[200px]">
                    <div className="text-xs text-center mb-2 font-medium">Round of 8</div>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="border border-slate-200 rounded-lg p-2 bg-white shadow-sm space-y-2">
                            <div className="text-[10px] text-center text-slate-400 mb-1">Group {i}</div>
                            {[1, 2, 3, 4].map(j => (
                                <div key={j} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                                    <div className="h-4 bg-slate-100 rounded flex-1"></div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                 {/* Column 2 - Semi Finals */}
                 <div className="flex flex-col justify-around min-w-[200px] py-10">
                    <div className="text-xs text-center mb-2 font-medium -mt-8">Semi Finals</div>
                    {[1, 2].map(i => (
                        <div key={i} className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                                <div className="h-6 bg-slate-100 rounded flex-1"></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                                <div className="h-6 bg-slate-100 rounded flex-1"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Column 3 - Finals */}
                <div className="flex flex-col justify-center min-w-[200px]">
                    <div className="text-xs text-center mb-2 font-medium">Finals</div>
                    <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                            <div className="h-8 bg-slate-100 rounded flex-1"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                            <div className="h-8 bg-slate-100 rounded flex-1"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LeagueBracket;
