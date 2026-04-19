import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await api.post('/auth/login', { identifier, password });
            if (data.token) {
                login(data.token, data.user);
                navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src={appIcon} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-md" />
                    <h2 className="text-3xl font-intro tracking-wider text-slate-800">LOG IN</h2>
                    <p className="text-slate-500 text-sm mt-2">Welcome back to INCØGNITØ</p>
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input 
                            type="text" 
                            placeholder="Email or Alias" 
                            value={identifier} 
                            onChange={(e) => setIdentifier(e.target.value)} 
                            required 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    
                    <div className="flex justify-end">
                        <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
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
            
            <div className="mt-8 text-center">
                 <Link to="/" className="text-slate-400 text-sm hover:text-slate-600 transition-colors">
                    &larr; Back to Home
                </Link>
            </div>
        </div>
    );
};

export default Login;
