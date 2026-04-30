import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';
import SEO from '../components/SEO';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const data = await api.post('/auth/login', { identifier, password });
            if (data.token) {
                login(data.token, data.user);
                navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
            }
        } catch (err) {
            const data = err.response?.data;
            if (data?.field) {
                setErrors({ [data.field]: data.error });
            } else {
                setErrors({ submit: data?.error || 'Login failed' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 relative">
            {/* Back to Home Button */}
            <Link 
                to="/" 
                className="absolute top-6 left-6 p-2 rounded-full hover:bg-white transition-colors text-slate-600 hover:text-slate-900 shadow-sm"
                aria-label="Back to home"
            >
                <ArrowLeft size={24} />
            </Link>

            <SEO

                title="Login"
                description="Log in to your INCØGNITØ player account to manage tournaments, matches, and rankings."
                noindex={true}
            />
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src={appIcon} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-md" />
                    <h2 className="text-3xl font-intro tracking-wider text-slate-800">LOG IN</h2>
                    <p className="text-slate-500 text-sm mt-2">Welcome back to INCØGNITØ</p>
                </div>
                
                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {errors.submit}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Email or Alias</label>
                        <div className="flex flex-col gap-1">
                            <input 
                                type="text" 
                                placeholder="Email or Alias" 
                                value={identifier} 
                                onChange={(e) => setIdentifier(e.target.value)} 
                                required 
                                className={`w-full p-4 bg-slate-50 border rounded-xl outline-none focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 ${errors.identifier ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'}`}
                            />
                            {errors.identifier && <span className="text-xs text-red-500 ml-1">{errors.identifier}</span>}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Password</label>
                        <div className="flex flex-col gap-1">
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
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
                    
                    <div className="flex justify-end">
                        <Link to="/forgot-password" university className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                            Forgot Password?
                        </Link>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-4 mt-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'LOGGING IN...' : 'LOG IN'}
                    </button>
                    
                    <p className="text-center text-sm text-slate-500 mt-6">
                        Need an account?{' '}
                        <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700">
                            Register
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
