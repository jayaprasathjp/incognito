import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');
        
        try {
            const data = await api.post(`/auth/reset-password/${token}`, { password });
            setMessage(data.message);
            // Optional: Redirect to login after a few seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src={appIcon} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-md" />
                    <h2 className="text-2xl font-intro tracking-wider text-slate-800">RESET PASSWORD</h2>
                    <p className="text-slate-500 text-sm mt-2">Enter your new password below</p>
                </div>
                
                {message && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm text-center mb-6 border border-green-100">
                        {message}
                        <p className="mt-2 text-xs">Redirecting to login...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <input 
                                type="password" 
                                placeholder="New Password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                minLength={6}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                            />
                        </div>
                         <div>
                            <input 
                                type="password" 
                                placeholder="Confirm New Password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                                minLength={6}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-4 mt-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'RESETTING...' : 'RESET PASSWORD'}
                        </button>
                    </form>
                )}
                 <div className="mt-6 text-center">
                    <Link to="/login" className="text-slate-500 text-sm hover:text-slate-700 transition-colors font-medium">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
