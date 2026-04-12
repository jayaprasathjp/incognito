import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';

const Rules = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const rules = [
        {
            id: 1,
            title: 'Tournament Structure',
            description: 'The tournament is a 1024 player tournament, single elimination style tournament, each round being unique and played daily.'
        },
        {
            id: 2,
            title: 'Immediate Fixtures & Match Times',
            description: 'Immediately tournament kicks off, times will be dropped alongside fixture so that players know their opponent and respective times.'
        },
        {
            id: 3,
            title: '15 Mins Early & Room Setup',
            description: 'Ensure you are ready 15 mins before the scheduled match time to avoid complications. Chat box will be opened so that "home" players create the match room and send the code and "away" players receives match codes sent.'
        },
        {
            id: 4,
            title: 'No Reschedules & Availability',
            description: 'There are no reschedules of any kind. If you are not available for a match, you are automatically out and your opponent advances. If both players are also not available, both will also be out. Ensure to click the “Ready” button to signify availability.'
        },
        {
            id: 5,
            title: 'Play Within Time Limit',
            description: 'All fixtures should be played within the limited hours (1 hour). It will be impossible to play or submit match results after that.'
        },
        {
            id: 6,
            title: 'Match Settings',
            description: 'Match time - 10Mins. Match Condition: Excellent. Number of Substitutions - 6. Extra time & PK: ON. Only 1 match should be played between players. Ensure to verify match settings before clicking READY.'
        },
        {
            id: 7,
            title: 'Connection Quality & Restarts',
            description: 'If a game experiences network issues within the first 3 minutes or before the first goal (whichever comes first), players must quit and restart. Continuing past this point constitutes acceptance of the connection quality. You\'re advised to resolve network issues before playing.'
        },
        {
            id: 8,
            title: 'Submit Results Punctually',
            description: 'Match result after deadline will not be recorded, ensure to do that during the stated one hour.'
        },
        {
            id: 9,
            title: 'Upload Match Proof',
            description: 'Ensure to upload match result proof after each round. Failure to do so will result in you being disqualified and your opponent advances if he submits and you don’t.'
        },
        {
            id: 10,
            title: 'Mutual Disqualification',
            description: 'If the two players do not send the match result proof, they will both be automatically disqualified.'
        },
        {
            id: 11,
            title: 'Disconnects & Rematches',
            description: 'If a match gets disconnected before full time after a goal(s) has been scored, click on dispute, make your claim and play a 5 minutes rematch. Your previous scores will be automatically added.'
        },
        {
            id: 12,
            title: 'Sponsored Quests & Referrals',
            description: 'Sponsored gifts will be given in-between tournament to the highest referral as well as to those taking on quests.'
        }
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

            {/* Additional Notes */}
            <div className="max-w-md mx-auto mt-12 bg-slate-100 p-6 rounded-2xl border border-slate-200 mb-8">
                 <p className="text-slate-500 font-medium text-xs mb-4 leading-relaxed uppercase tracking-widest">
                     * INCASE OF ANY COMPLICATIONS THAT HASN'T BEEN ADDRESSED HERE, A POLL WILL BE CREATED FOR ALL PLAYERS TO VOTE AND THE HIGHEST VOTE DECISION WILL BE FOLLOWED.
                 </p>
                 <p className="text-slate-800 font-bold text-xs leading-relaxed uppercase tracking-widest">
                     * THE PRIZE POOL IS SUBJECT TO CHANGE, THE OFFICIAL PRIZE POOL STATED IS EXPLICITLY FOR 1000+ PARTICIPANTS.
                 </p>
            </div>

            </div>
        </div>
    );
};

export default Rules;
