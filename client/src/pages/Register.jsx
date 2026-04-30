import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import appIcon from '../assets/app-icon.png';
import nigerianUniversities from '../data/nigerianUniversities';
import SEO from '../components/SEO';

const Register = () => {

    const [formData, setFormData] = useState({
        alias: '',
        institution: '',
        whatsapp: '',
        email: '',
        password: '',
        confirmPassword: '',
        referralCode: ''
    });
    const [agreed, setAgreed] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Institution search state
    const [institutionSearch, setInstitutionSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const filteredUniversities = nigerianUniversities.filter(uni =>
        uni.toLowerCase().includes(institutionSearch.toLowerCase())
    ).slice(0, 20); // Show max 20 results for performance

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const referralFromUrl = searchParams.get('ref') || searchParams.get('referralCode');
        if (!referralFromUrl) {
            return;
        }

        setFormData((prev) => ({
            ...prev,
            referralCode: referralFromUrl.trim().toUpperCase()
        }));
    }, [searchParams]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const newErrors = {};
        if (!formData.institution) {
            newErrors.institution = 'Please select your institution.';
        }

        if (!agreed) {
            newErrors.agreed = 'You must agree to the tournament rules.';
        }

        if (!/^[a-zA-Z0-9]+$/.test(formData.alias)) {
            newErrors.alias = 'Alias must be alphanumeric. No spaces or special characters allowed.';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (formData.password.length < 6 || !/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
            newErrors.password = 'Password must be at least 6 characters and contain both letters and numbers';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
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
                    navigate('/dashboard'); 
                } else {
                     navigate('/login');
                }
            }
        } catch (err) {
            const data = err.response?.data;
            if (data?.field) {
                setErrors({ [data.field]: data.error });
            } else {
                setErrors({ submit: data?.error || 'Registration failed. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-10 pb-6 bg-white text-slate-900 font-sans relative">
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900"
                aria-label="Go back"
            >
                <ArrowLeft size={24} />
            </button>

            <SEO

                title="Register"
                description="Create your INCØGNITØ account and join anonymous university eFootball tournaments in Nigeria."
                noindex={true}
            />
            <div className="w-full max-w-md px-6">
                
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-6">
                     <img src={appIcon} alt="Logo" className="w-16 h-16 object-contain drop-shadow-lg mb-4" />
                    <h2 className="text-2xl font-normal tracking-wider text-slate-800 uppercase">Register</h2>
                </div>

                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {errors.submit}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Alias */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Enter your alias</label>
                        <div className="flex flex-col gap-1">
                            <input 
                                type="text" 
                                name="alias"
                                placeholder="Your alias" 
                                value={formData.alias} 
                                onChange={handleChange} 
                                required 
                                className={`w-full p-3 bg-white border rounded-lg outline-none transition-all text-slate-800 placeholder:text-slate-400 ${errors.alias ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'}`}
                            />
                            {errors.alias && <span className="text-xs text-red-500 ml-1">{errors.alias}</span>}
                        </div>
                    </div>

                    {/* Institution - Searchable Dropdown */}
                    <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
                        <label className="text-sm text-slate-600">Select your institution</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search university..."
                                value={formData.institution ? formData.institution : institutionSearch}
                                onChange={(e) => {
                                    setInstitutionSearch(e.target.value);
                                    setFormData({ ...formData, institution: '' });
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                className={`w-full p-3 bg-white border rounded-lg outline-none transition-all text-slate-800 placeholder:text-slate-400 pr-10 ${errors.institution ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'}`}
                            />
                            {formData.institution && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, institution: '' });
                                        setInstitutionSearch('');
                                        setShowDropdown(true);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {errors.institution && <span className="text-xs text-red-500 ml-1">{errors.institution}</span>}
                        {showDropdown && !formData.institution && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                                {filteredUniversities.length > 0 ? (
                                    filteredUniversities.map((uni, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, institution: uni });
                                                setInstitutionSearch('');
                                                setShowDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            {uni}
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-slate-400">No universities found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* WhatsApp */}
                     <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Enter your WhatsApp phone number</label>
                        <div className="flex flex-col gap-1">
                            <input 
                                type="tel" 
                                name="whatsapp"
                                placeholder="+234 xxx xxx xxxx" 
                                value={formData.whatsapp} 
                                onChange={handleChange} 
                                required 
                                className={`w-full p-3 bg-white border rounded-lg outline-none transition-all text-slate-800 placeholder:text-slate-400 ${errors.whatsapp ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'}`}
                            />
                            {errors.whatsapp && <span className="text-xs text-red-500 ml-1">{errors.whatsapp}</span>}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-600">Enter your e-mail address</label>
                        <div className="flex flex-col gap-1">
                            <input 
                                type="email" 
                                name="email"
                                placeholder="email@example.com" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                                className={`w-full p-3 bg-white border rounded-lg outline-none transition-all text-slate-800 placeholder:text-slate-400 ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'}`}
                            />
                            {errors.email && <span className="text-xs text-red-500 ml-1">{errors.email}</span>}
                        </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-sm text-slate-600">Enter a password</label>
                        <div className="flex flex-col gap-1">
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    name="password"
                                    placeholder="........" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    required 
                                    className={`w-full p-3 pr-10 bg-white border rounded-lg outline-none transition-all text-slate-800 placeholder:text-slate-400 ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && <span className="text-xs text-red-500 ml-1">{errors.password}</span>}
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-sm text-slate-600">Confirm password</label>
                        <div className="flex flex-col gap-1">
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    placeholder="........"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className={`w-full p-3 pr-10 bg-white border rounded-lg outline-none transition-all text-slate-800 placeholder:text-slate-400 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <span className="text-xs text-red-500 ml-1">{errors.confirmPassword}</span>}
                        </div>
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
                        <label htmlFor="terms" className={`text-sm leading-tight cursor-pointer ${errors.agreed ? 'text-red-500' : 'text-slate-600'}`}>
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
