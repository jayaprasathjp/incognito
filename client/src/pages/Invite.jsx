import { useSearchParams, useNavigate } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import SEO from '../components/SEO';

const Invite = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const referralCode = searchParams.get('ref') || searchParams.get('referralCode') || '';

    const handleContinue = () => {
        if (referralCode) {
            navigate(`/register?ref=${encodeURIComponent(referralCode)}`);
        } else {
            navigate('/register');
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col items-center justify-center p-6">
            <SEO
                title="You're Invited"
                description="You have been invited to join INCØGNITØ."
                noindex={true}
            />
            
            <div className="w-full max-w-md text-center bg-slate-50 p-10 rounded-3xl border border-slate-100 shadow-sm">
                <img src={appIcon} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-8 drop-shadow-lg" />
                
                <h1 className="text-2xl font-bold tracking-wider text-slate-800 uppercase mb-6">
                    You're Invited
                </h1>
                
                <p className="text-slate-600 text-lg leading-relaxed mb-10 italic">
                    "You have been invited because someone thinks you can survive the bracket."
                </p>
                
                <button 
                    onClick={handleContinue}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-wide"
                >
                    Continue to Registration
                </button>
            </div>
        </div>
    );
};

export default Invite;
