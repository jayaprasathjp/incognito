import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, GraduationCap, Link2, Loader2, Save, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import MenuButton from '../components/MenuButton';
import appIcon from '../assets/app-icon.png';
import nigerianUniversities from '../data/nigerianUniversities';
import SEO from '../components/SEO';

const PersonalDetails = () => {
    const { logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        whatsapp_number: '',
        institution: '',
    });

    const [institutionSearch, setInstitutionSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const filteredUniversities = nigerianUniversities.filter(uni =>
        uni.toLowerCase().includes(institutionSearch.toLowerCase())
    ).slice(0, 20);

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
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await api.get('/user/profile');
            setFormData({
                username: data.username || '',
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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/user/profile', {
                email: formData.email,
                whatsapp_number: formData.whatsapp_number,
                institution: formData.institution,
            });
            toast.success("Profile updated successfully!");
            setIsEditing(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update profile");
        } finally {
            setSaving(false);
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
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Alias Field - Disabled */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Alias (Username)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        disabled
                                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium focus:outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
                                    <Link2 size={10} /> Alias cannot be changed after registration
                                </p>
                            </div>

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
                                        onChange={handleChange}
                                        required
                                        disabled={!isEditing}
                                        className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${!isEditing ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
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
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${!isEditing ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                        placeholder="+1234567890"
                                    />
                                </div>
                            </div>

                            {/* Institution Field */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Institution / School
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 z-10">
                                        <GraduationCap size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search university..."
                                        value={formData.institution ? formData.institution : institutionSearch}
                                        onChange={(e) => {
                                            setInstitutionSearch(e.target.value);
                                            setFormData({ ...formData, institution: '' });
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => isEditing && setShowDropdown(true)}
                                        disabled={!isEditing}
                                        className={`w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${!isEditing ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                    />
                                    {formData.institution && isEditing && (
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
                                {showDropdown && !formData.institution && isEditing && (
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

                            <div className="pt-4 flex gap-3">
                                {!isEditing ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-slate-900/20 active:scale-[0.98]"
                                    >
                                        <Edit2 size={18} />
                                        <span>Edit Profile</span>
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                fetchProfile(); // Reset changes
                                            }}
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-slate-900/20 active:scale-[0.98]"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Save size={18} />
                                                    <span>Save Changes</span>
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalDetails;
