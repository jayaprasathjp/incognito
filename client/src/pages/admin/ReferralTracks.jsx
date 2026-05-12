import React, { useState, useEffect } from 'react';
import { Share2, Calendar, User, Trophy, Activity, X, ChevronRight, ChevronLeft, Search, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';

const ReferralTracks = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReferrer, setSelectedReferrer] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchReferrals();
    }, []);

    const fetchReferrals = async () => {
        try {
            setLoading(true);
            const data = await api.get('/admin/referrals');
            setReferrals(data);
        } catch (error) {
            console.error("Failed to fetch referrals:", error);
            toast.error("Failed to load referral tracks");
        } finally {
            setLoading(false);
        }
    };

    // Group referrals by referrer
    const groupedData = {};
    let totalTournamentsJoined = 0;

    referrals.forEach(ref => {
        const joins = parseInt(ref.tournaments_joined || 0);
        if (joins > 0) totalTournamentsJoined++;

        if (!groupedData[ref.referrer_id]) {
            groupedData[ref.referrer_id] = {
                id: ref.referrer_id,
                name: ref.referrer_name,
                registeredCount: 0,
                activeCount: 0,
                referredUsers: []
            };
        }
        
        groupedData[ref.referrer_id].registeredCount += 1;
        if (joins > 0) {
            groupedData[ref.referrer_id].activeCount += 1;
        }
        groupedData[ref.referrer_id].referredUsers.push(ref);
    });

    const referrersList = Object.values(groupedData).sort((a, b) => b.registeredCount - a.registeredCount);
    
    // Filter
    const filteredList = referrersList.filter(ref => 
        (ref.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.id.toString().includes(searchQuery)
    );

    // Pagination
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);
    const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const activeReferrals = totalTournamentsJoined; 
    const topReferrer = referrersList.length > 0 ? referrersList[0] : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Share2 className="text-indigo-600" size={24} />
                        Referral Tracker
                    </h1>
                </div>
            </div>

            {/* Stats Row - 4 items single row on mobile */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-white border border-slate-200 p-2 md:p-4 rounded-xl shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter md:tracking-widest mb-1 truncate">Total</p>
                    <p className="text-lg md:text-2xl font-black text-slate-900">{referrals.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-2 md:p-4 rounded-xl shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase tracking-tighter md:tracking-widest mb-1 truncate flex justify-center items-center gap-1">
                        <Activity size={10} className="hidden md:block"/> Active (Played)
                    </p>
                    <p className="text-lg md:text-2xl font-black text-emerald-900 leading-none">{activeReferrals}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 p-2 md:p-4 rounded-xl shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[8px] md:text-[10px] font-black text-indigo-600 uppercase tracking-tighter md:tracking-widest mb-1 truncate flex justify-center items-center gap-1">
                        <Share2 size={10} className="hidden md:block"/> Rate
                    </p>
                    <p className="text-lg md:text-2xl font-black text-indigo-900 leading-none">
                        {referrals.length > 0 ? Math.round((activeReferrals / referrals.length) * 100) : 0}%
                    </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2 md:p-4 rounded-xl shadow-sm flex flex-col justify-center text-center">
                    <p className="text-[8px] md:text-[10px] font-black text-amber-600 uppercase tracking-tighter md:tracking-widest mb-1 truncate flex justify-center items-center gap-1">
                        <Trophy size={10} className="hidden md:block"/> Top
                    </p>
                    <p className="text-xs md:text-base font-bold text-amber-900 truncate">
                        {topReferrer && topReferrer.name ? topReferrer.name.split(' ')[0] : '-'}
                    </p>
                </div>
            </div>

            {/* Filter & Refresh */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search referrer name or ID..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm shadow-sm"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to page 1 on search
                        }}
                    />
                </div>
                <button 
                    onClick={fetchReferrals}
                    className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 hover:text-indigo-600 shadow-sm flex items-center justify-center shrink-0"
                    title="Refresh data"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Main Content Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-medium animate-pulse text-sm">Fetching...</p>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <Search className="text-slate-300" size={24} />
                        </div>
                        <h3 className="text-slate-900 font-bold text-base">No matches found</h3>
                    </div>
                ) : (
                    <div className="w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-3 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referrer</th>
                                    <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Invited</th>
                                    <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active (Played)</th>
                                    <th className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedList.map((referrer, idx) => (
                                    <tr 
                                        key={referrer.id} 
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedReferrer(referrer)}
                                    >
                                        <td className="px-3 md:px-6 py-3">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className={`hidden md:flex w-8 h-8 rounded-lg items-center justify-center font-bold text-xs shrink-0 ${
                                                    (currentPage === 1 && idx === 0 && !searchQuery) ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                }`}>
                                                    {(currentPage === 1 && idx === 0 && !searchQuery) ? <Trophy size={14} /> : <User size={14} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs md:text-sm font-bold text-slate-900 truncate max-w-[100px] md:max-w-[200px]">{referrer.name}</p>
                                                    <p className="text-[9px] md:text-[10px] font-medium text-slate-400 truncate">ID: #{referrer.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                                                {referrer.registeredCount}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md text-xs font-bold border ${
                                                referrer.activeCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                                            }`}>
                                                {referrer.activeCount}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 text-right">
                                            <button className="p-1 md:p-2 text-slate-300 group-hover:text-indigo-600 transition-colors inline-flex items-center justify-center">
                                                <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Pagination Controls */}
                {!loading && filteredList.length > itemsPerPage && (
                    <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredList.length)}</span> of <span className="font-medium">{filteredList.length}</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Popup Dialog for Referred Users */}
            {selectedReferrer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedReferrer(null)}>
                    <div 
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col border border-slate-200 overflow-hidden transform transition-all max-h-[85vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-3 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                                    <User className="text-indigo-500" size={18} />
                                    {selectedReferrer.name || 'Unknown'}'s Referrals
                                </h3>
                                <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-0.5">
                                    {selectedReferrer.registeredCount} invited • {selectedReferrer.activeCount} active
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedReferrer(null)}
                                className="p-1.5 md:p-2 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto p-3 md:p-4 flex-1">
                            <div className="space-y-1.5">
                                {selectedReferrer.referredUsers.map(user => {
                                    const joins = parseInt(user.tournaments_joined || 0);
                                    const isActive = joins > 0;
                                    
                                    return (
                                        <div key={user.id} className={`p-2 rounded-lg border grid grid-cols-3 items-center gap-2 transition-colors ${
                                            isActive ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-200'
                                        }`}>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-[11px] md:text-xs truncate">{user.referred_name}</p>
                                            </div>
                                            
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500 font-medium">
                                                    {new Date(user.created_at).toLocaleDateString(undefined, { 
                                                        month: 'short', day: 'numeric', year: '2-digit'
                                                    })}
                                                </p>
                                            </div>

                                            <div className="flex justify-end">
                                                <div className={`px-2 py-0.5 rounded-md border text-[9px] md:text-[10px] font-bold flex items-center gap-1 whitespace-nowrap ${
                                                    isActive ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                                }`}>
                                                    <Activity size={10} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                                                    {joins} {joins === 1 ? 'Join' : 'Joins'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReferralTracks;

