import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, GraduationCap, Link2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import MenuButton from '../components/MenuButton';
import appIcon from '../assets/app-icon.png';
import SEO from '../components/SEO';

const PersonalDetails = () => {
    const { logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        whatsapp_number: '',
        institution: '',
    });


    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await api.get('/user/profile');
            setFormData({
                email: data.email || '',
                whatsapp_number: data.whatsapp_number || '',
                institution: data.institution || '',
            });
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            if (error.response?.status === 401) {
                logout();
            } else {
                toast.error("Failed to load personal details");
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
            <SEO title="Personal Details" description="View and edit your personal information." />
            
            {/* Header */}
            <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative z-40">
                <img src={appIcon} alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <MenuButton onClick={() => setIsMenuOpen(true)} />
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <div className="p-6 max-w-lg mx-auto pb-24">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest mb-1">Personal Details</h1>
                    <p className="text-slate-500 text-sm">Manage your profile information</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="space-y-5">
                            
                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>

                            {/* WhatsApp Field */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    WhatsApp Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Phone size={18} />
                                    </div>
                                    <input
                                        type="tel"
                                        name="whatsapp_number"
                                        value={formData.whatsapp_number}
                                        disabled
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                                        placeholder="+1234567890"
                                    />
                                </div>
                            </div>

                            {/* Institution Field */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Institution / School
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 z-10">
                                        <GraduationCap size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Institution..."
                                        value={formData.institution}
                                        disabled
                                        className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalDetails;
