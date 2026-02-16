import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Loader from '../components/Loader';
import Sidebar from '../components/Sidebar';

const ReferralProgram = () => {
    const { token } = useAuth();
    const [referralCode, setReferralCode] = useState("");
    const [stats, setStats] = useState({ totalReferrals: 0, rewardsEarned: 0 });
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const fetchReferralData = async () => {
            setLoading(true);
            try {
                const data = await api.get('/user/referral');
                setReferralCode(data.referralCode);
                setStats({
                    totalReferrals: data.totalReferrals,
                    rewardsEarned: data.rewardsEarned
                });
            } catch (error) {
                console.error("Failed to fetch referral data", error);
                setReferralCode("Error");
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchReferralData();
    }, [token]);

    const handleCopy = () => {
        if (referralCode && referralCode !== "Error") {
            navigator.clipboard.writeText(referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white text-slate-900 font-sans p-6 flex flex-col items-center justify-center">
                 <Loader />
            </div>
        );
    }

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
            <div className="max-w-md mx-auto">
                <h1 className="text-xl font-light text-center text-slate-900 uppercase mb-8 tracking-[0.2em]">
                    REFERRAL PROGRAM
                </h1>

                {/* Code Card */}
                <div className="bg-slate-50 rounded-2xl p-8 text-center shadow-inner mb-8 border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-4">Your Referral Code</p>
                    
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl py-4 px-4 text-slate-900 font-mono text-xl font-bold tracking-widest shadow-sm">
                            {referralCode}
                        </div>
                        <button 
                            onClick={handleCopy}
                            className="bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95"
                        >
                            {copied ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Share this code with friends. You earn rewards when they join and participate!
                    </p>
                </div>

                {/* Share Button */}
                <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 mb-12">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    SHARE CODE
                </button>

                {/* Stats */}
                <h3 className="text-slate-900 font-bold mb-4 px-1">Your Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-4xl font-light text-slate-900 mb-1">{stats.totalReferrals}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Referrals</span>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-4xl font-light text-slate-900 mb-1">{stats.rewardsEarned}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rewards</span>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default ReferralProgram;
