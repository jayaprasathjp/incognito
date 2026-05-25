import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setErrors({});
        
        try {
            const data = await api.post('/auth/forgot-password', { email });
            setMessage(data.message || 'Success! A password reset link has been sent.');
        } catch (err) {
            const data = err.response?.data;
            if (data?.field) {
                setErrors({ [data.field]: data.error });
            } else {
                setErrors({ submit: data?.error || 'Failed to send reset email. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src={appIcon} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-md" />
                    <h2 className="text-2xl font-intro tracking-wider text-slate-800">FORGOT PASSWORD</h2>
                    <p className="text-slate-500 text-sm mt-2">Enter your email to reset your password</p>
                </div>
                
                {message && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm text-center mb-6 border border-green-100">
                        {message}
                    </div>
                )}

                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {errors.submit}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600 ml-1">Email Address</label>
                        <div className="flex flex-col gap-1">
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                className={`w-full p-4 bg-slate-50 border rounded-xl outline-none focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'}`}
                            />
                            {errors.email && <span className="text-xs text-red-500 ml-1">{errors.email}</span>}
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-4 mt-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'SENDING LINK...' : 'SEND RESET LINK'}
                    </button>
                    
                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-slate-500 text-sm hover:text-slate-700 transition-colors font-medium">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>

        </div>
    );
};

export default ForgotPassword;
