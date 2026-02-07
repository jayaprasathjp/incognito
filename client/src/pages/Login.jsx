import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await api.post('/auth/login', { email, password });
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
                    <h2 className="text-3xl font-light tracking-widest text-slate-800">LOGIN</h2>
                    <p className="text-slate-500 text-sm mt-2">Welcome back to Incognito</p>
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                    <div>
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-4 mt-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'LOGGING IN...' : 'ENTER'}
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
