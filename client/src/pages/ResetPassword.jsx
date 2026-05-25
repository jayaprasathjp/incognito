import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        if (password !== confirmPassword) {
            setErrors({ confirmPassword: "Passwords don't match" });
            return;
        }

        if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            setErrors({ password: 'Password must be at least 6 characters and contain both letters and numbers' });
            return;
        }

        setLoading(true);
        setMessage('');
        setErrors({});
        
        try {
            const data = await api.post(`/auth/reset-password/${token}`, { password });
            setMessage(data.message);
            // Optional: Redirect to login after a few seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            const data = err.response?.data;
            setErrors({ submit: data?.error || 'Failed to reset password. Link may be expired.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
            <div className="w-full max-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
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

                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {errors.submit}
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-600 ml-1">New Password</label>
                            <div className="flex flex-col gap-1">
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="New Password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                        minLength={6}
                                        className={`w-full p-4 pr-12 bg-slate-50 border rounded-xl outline-none focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.password && <span className="text-xs text-red-500 ml-1">{errors.password}</span>}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-600 ml-1">Confirm New Password</label>
                            <div className="flex flex-col gap-1">
                                <div className="relative">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        placeholder="Confirm New Password" 
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword(e.target.value)} 
                                        required 
                                        minLength={6}
                                        className={`w-full p-4 pr-12 bg-slate-50 border rounded-xl outline-none focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <span className="text-xs text-red-500 ml-1">{errors.confirmPassword}</span>}
                            </div>
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
