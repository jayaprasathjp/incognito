import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Loader from '../components/Loader';
import Sidebar from '../components/Sidebar';
import MenuButton from '../components/MenuButton';

const BankDetails = () => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        account_name: '',
        account_number: '',
        bank_name: ''
    });
    const [savedData, setSavedData] = useState(null); // Store fetched data to revert
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(true); // Default to editing (for new users)
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await api.get('/user/bank-details');
                if (data.account_name) {
                    setFormData(data);
                    setSavedData(data);
                    setIsEditing(false); // Switch to view mode if data exists
                }
            } catch (error) {
                console.error("Error fetching bank details", error);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchDetails();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEdit = () => {
        setIsEditing(true);
        setStatus('');
    };

    const handleCancel = () => {
        setFormData(savedData); // Revert to saved data
        setIsEditing(false);
        setStatus('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('Saving...');
        try {
            const updated = await api.post('/user/bank-details', formData);
            setSavedData(updated); // Update saved reference
            setFormData(updated);
            setStatus('Saved successfully!');
            setTimeout(() => {
                setStatus('');
                setIsEditing(false); // Switch back to view mode after save
            }, 1000);
        } catch (error) {
            console.error("Error saving bank details", error);
            setStatus('Error occurred.');
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans relative">
            {/* Header */}
            <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative">
                <img src={appIcon} alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <MenuButton onClick={() => setIsMenuOpen(true)} />
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <div className="p-6">
            <div className="max-w-md mx-auto">
                <h1 className="text-xl font-light text-center text-slate-900 uppercase mb-10 tracking-[0.2em]">
                    BANK DETAILS
                </h1>

                {loading ? (
                    <Loader />
                ) : !isEditing && savedData ? (
                    // View Mode
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Name</h3>
                            <p className="text-lg font-medium text-slate-900">{savedData.account_name}</p>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Number</h3>
                            <p className="text-lg font-medium text-slate-900 tracking-wide">{savedData.account_number}</p>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bank Name</h3>
                            <p className="text-base font-medium text-slate-900 capitalize">{savedData.bank_name}</p>
                        </div>

                        <button 
                            onClick={handleEdit}
                            className="w-full py-3 mt-4 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-transform active:scale-95 text-sm uppercase tracking-wide"
                        >
                            Edit Details
                        </button>
                    </div>
                ) : (
                    // Edit Mode (Form)
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Account Name */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Account Name</label>
                            <input 
                                type="text" 
                                name="account_name"
                                value={formData.account_name || ''}
                                onChange={handleChange}
                                placeholder="Full account name" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                                required
                            />
                        </div>

                        {/* Account Number */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Account Number</label>
                            <input 
                                type="text" 
                                name="account_number"
                                value={formData.account_number || ''}
                                onChange={handleChange}
                                placeholder="0000 0000 00" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-medium tracking-wide"
                                required
                            />
                        </div>

                        {/* Bank Name */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Bank Name</label>
                            <input 
                                type="text" 
                                name="bank_name"
                                value={formData.bank_name || ''}
                                onChange={handleChange}
                                placeholder="Bank name" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                                required
                            />
                        </div>



                        {/* Actions */}
                        <div className="flex gap-3 mt-8">
                            {savedData && (
                                <button 
                                    type="button" 
                                    onClick={handleCancel}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm uppercase tracking-wide"
                                >
                                    Cancel
                                </button>
                            )}
                            <button 
                                type="submit" 
                                className={`flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 text-sm uppercase tracking-wide ${!savedData ? 'w-full' : ''}`}
                            >
                                {status || 'Save Details'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            </div>
        </div>
    );
};

export default BankDetails;
