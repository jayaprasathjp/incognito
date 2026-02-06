import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const BankDetails = () => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        account_name: '',
        account_number: '',
        bank_name: '',
        account_type: ''
    });
    const [status, setStatus] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await api.get('/user/bank-details');
                if (data.account_name) {
                    setFormData(data);
                }
            } catch (error) {
                console.error("Error fetching bank details", error);
            }
        };
        if (token) fetchDetails();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('Saving...');
        try {
            await api.post('/user/bank-details', formData);
            setStatus('Saved successfully!');
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            console.error("Error saving bank details", error);
            setStatus('Error occurred.');
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative">
                <Link to="/dashboard" className="text-slate-900 focus:outline-none absolute left-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="w-full flex justify-center">
                    <img src={appIcon} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
                </div>
            </div>

            <div className="max-w-md mx-auto">
                <h1 className="text-xl font-light text-center text-slate-900 uppercase mb-10 tracking-[0.2em]">
                    BANK DETAILS
                </h1>

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
                        />
                    </div>

                    {/* Bank Name Dropdown */}
                     <div className="flex flex-col gap-2 relative">
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Bank Name</label>
                        <div className="relative">
                            <select 
                                name="bank_name"
                                value={formData.bank_name || ''}
                                onChange={handleChange}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-900 appearance-none font-medium"
                            >
                                <option value="" disabled>Select bank...</option>
                                <option value="access">Access Bank</option>
                                <option value="gtb">GTB</option>
                                <option value="zenith">Zenith Bank</option>
                                <option value="opay">OPay</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Account Type Dropdown */}
                    <div className="flex flex-col gap-2 relative">
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Account Type</label>
                        <div className="relative">
                            <select 
                                name="account_type"
                                value={formData.account_type || ''}
                                onChange={handleChange}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-900 appearance-none font-medium"
                            >
                                <option value="" disabled>Select type...</option>
                                <option value="savings">Savings</option>
                                <option value="current">Current</option>
                            </select>
                             <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                     {/* Save Button */}
                    <button type="submit" className="w-full py-4 mt-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 text-base tracking-wide">
                        {status || 'SAVE DETAILS'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BankDetails;
