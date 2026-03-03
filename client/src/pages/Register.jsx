import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';

const Register = () => {
    const [formData, setFormData] = useState({
        alias: '',
        institution: '',
        whatsapp: '',
        email: '',
        password: '',
        referralCode: ''
    });
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!agreed) {
            setError('You must agree to the tournament rules.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                username: formData.alias, // Map alias to username
                email: formData.email,
                password: formData.password,
                institution: formData.institution,
                whatsapp_number: formData.whatsapp,
                referralCode: formData.referralCode
            };

            const data = await api.post('/auth/register', payload);
            
            if (data.id) {
                // Auto login after register
                 const loginData = await api.post('/auth/login', { 
                    email: formData.email, 
                    password: formData.password 
                });
                if (loginData.token) {
                    login(loginData.token, loginData.user);
                    navigate('/dashboard'); // Or wherever appropriate
                } else {
                     navigate('/login');
                }
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError(err.message || 'Server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-10 pb-6 bg-white text-slate-900 font-sans">
            <div className="w-full max-w-md px-6">
                
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-6">
                     <img src={appIcon} alt="Logo" className="w-16 h-16 object-contain drop-shadow-lg mb-4" />
                    <h2 className="text-2xl font-normal tracking-wider text-slate-800 uppercase">Register</h2>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Alias */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Enter your alias</label>
                        <input 
                            type="text" 
                            name="alias"
                            placeholder="Your alias" 
                            value={formData.alias} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-500 transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Institution */}
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-sm text-slate-600">Select your institution</label>
                        <div className="relative">
                            <select
                                name="institution"
                                value={formData.institution}
                                onChange={handleChange}
                                required
                                className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-500 transition-all text-slate-800 appearance-none"
                            >
                                <option value="" disabled>Select institution...</option>
                                <option value="University A">University A</option>
                                <option value="University B">University B</option>
                                <option value="Other">Other</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp */}
                     <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Enter your WhatsApp phone number</label>
                        <input 
                            type="tel" 
                            name="whatsapp"
                            placeholder="+234 xxx xxx xxxx" 
                            value={formData.whatsapp} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-500 transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Enter your e-mail address</label>
                        <input 
                            type="email" 
                            name="email"
                            placeholder="email@example.com" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-500 transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Enter a password</label>
                        <input 
                            type="password" 
                            name="password"
                            placeholder="........" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-500 transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                    
                    {/* Referral Code (Optional) */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Referral Code (Optional)</label>
                        <input 
                            type="text" 
                            name="referralCode"
                            placeholder="Enter referral code" 
                            value={formData.referralCode} 
                            onChange={handleChange} 
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-500 transition-all text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                    
                    {/* Terms Checkbox */}
                    <div className="flex items-start gap-3 mt-4 mb-6">
                        <input 
                            type="checkbox" 
                            id="terms"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-1 w-5 h-5 border-slate-300 rounded text-slate-900 focus:ring-slate-500"
                        />
                        <label htmlFor="terms" className="text-sm text-slate-600 leading-tight cursor-pointer">
                            I agree to follow the rules of the tournament and any non-compliance will lead to my immediate disqualification
                        </label>
                    </div>

                    {/* Button */}
                    <button 
                        type="submit" 
                        disabled={!agreed || loading}
                        className={`w-full py-4 rounded-lg font-bold shadow-md uppercase tracking-wide text-sm transition-all
                            ${agreed && !loading
                                ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95' 
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        {loading ? 'REGISTERING...' : 'REGISTER'}
                    </button>
                    
                </form>
            </div>
        </div>
    );
};

export default Register;
