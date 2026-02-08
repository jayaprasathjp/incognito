import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Search, Eye, Ban, CheckCircle, ChevronLeft } from "lucide-react";
import Loader from "../../components/Loader";
import toast from "react-hot-toast";
import { api } from "../../utils/api";

const PlayerManagement = () => {
    const { token } = useAuth();
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPlayers = players.slice(indexOfFirstItem, indexOfLastItem);

    // Fetch players logic
    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/admin/players?search=${search}`);
            if (Array.isArray(data)) {
                setPlayers(data);
            } else {
                toast.error(data.error || "Failed to load players");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load players");
        } finally {
            setLoading(false);
        }
    };

    // Effect to debounce search or just load on mount
    useEffect(() => {
        const timeout = setTimeout(() => {
            setCurrentPage(1); // Reset to page 1 on new search
            fetchPlayers();
        }, 500);
        return () => clearTimeout(timeout);
    }, [search, token]);

    // View Player Profile
    const handleViewPlayer = async (id) => {
        setLoading(true);
        try {
            const data = await api.get(`/admin/players/${id}`);
            if (data.profile) {
                setSelectedPlayer(data);
            } else {
                toast.error(data.error || "Failed to load profile");
            }
        } catch (error) {
             toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    }

    const handleBanPlayer = async () => {
        if (!confirm("Are you sure you want to ban this player?")) return;
        try {
            const data = await api.post(`/admin/players/${selectedPlayer.profile.id}/ban`, {});
            if (data.message) {
                toast.success("Player banned");
                // Refresh logic if needed
                handleViewPlayer(selectedPlayer.profile.id); // Refresh profile
                fetchPlayers(); // Refresh list background
            } else {
                toast.error(data.error || "Failed to ban player");
            }
        } catch (error) {
            toast.error("Failed to ban player");
        }
    };

    const handleMarkPaid = async () => {
        // This functionality might belong to Payments page, but wireframe showed button here too
        // For MVP, likely updating bank_details or a payments record
        toast.success("Payment marked as paid (Logic placeholder)");
    };

    // Back to list
    const handleBackInfo = () => {
        setSelectedPlayer(null);
    }

    if (selectedPlayer) {
        // PROFILE VIEW
        const { profile, bankDetails, referralStats } = selectedPlayer;
        return (
            <div className="space-y-6">
                <button onClick={handleBackInfo} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                    <ChevronLeft size={20} /> Back to Players
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    {/* Player Info */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl space-y-4 md:space-y-6 shadow-sm border border-slate-200">
                        <h2 className="text-xl md:text-2xl font-bold border-b border-slate-100 pb-2 md:pb-4 text-slate-900">Player Profile</h2>
                        <div className="space-y-3 md:space-y-4">
                            <div>
                                <label className="text-sm text-slate-500">Username / Alias</label>
                                <div className="text-lg md:text-xl font-medium text-slate-900">{profile.username}</div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">Email</label>
                                <div className="text-base md:text-lg text-slate-900">{profile.email}</div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">Status</label>
                                <div className={`text-base md:text-lg font-medium ${profile.status === 'banned' ? 'text-red-600' : 'text-green-600'}`}>
                                    {profile.status === 'banned' ? 'Banned' : 'Active'}
                                </div>
                            </div>
                             <div>
                                <label className="text-sm text-slate-500">Tournament Stage</label>
                                <div className="text-base md:text-lg text-slate-900">Round of 16 (Mock)</div>
                            </div>
                        </div>
                    </div>

                    {/* Bank & Referral */}
                    <div className="space-y-4 md:space-y-8">
                         <div className="bg-white p-4 md:p-6 rounded-2xl space-y-3 md:space-y-4 shadow-sm border border-slate-200">
                            <h2 className="text-lg md:text-xl font-bold border-b border-slate-100 pb-2 text-slate-900">Bank Details</h2>
                            {bankDetails && bankDetails.account_number ? (
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div>
                                        <label className="text-sm text-slate-500">Bank Name</label>
                                        <div className="text-slate-900 text-sm md:text-base">{bankDetails.bank_name}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-500">Account Type</label>
                                        <div className="text-slate-900 text-sm md:text-base">{bankDetails.account_type || 'Savings'}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-500">Account Number</label>
                                        <div className="text-slate-900 text-sm md:text-base font-mono">{bankDetails.account_number}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-500">Account Name</label>
                                        <div className="text-slate-900 text-sm md:text-base">{bankDetails.account_name}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-400 italic">No bank details provided.</div>
                            )}
                        </div>

                         <div className="bg-white p-4 md:p-6 rounded-2xl space-y-3 md:space-y-4 shadow-sm border border-slate-200">
                            <h2 className="text-lg md:text-xl font-bold border-b border-slate-100 pb-2 text-slate-900">Referral Code</h2>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xl md:text-2xl font-mono text-blue-600">{referralStats.code || 'N/A'}</div>
                                    <div className="text-xs md:text-sm text-slate-500">Player Code</div>
                                </div>
                                <div className="text-right">
                                     <div className="text-xl md:text-2xl font-bold text-slate-900">{referralStats.count}</div>
                                     <div className="text-xs md:text-sm text-slate-500">Times Used</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                    <button 
                        onClick={handleBanPlayer}
                        disabled={profile.status === 'banned'}
                        className={`px-6 py-3 border rounded-xl transition-colors flex items-center gap-2 font-bold ${
                            profile.status === 'banned' 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
                        }`}
                    >
                        <Ban size={20} /> {profile.status === 'banned' ? 'Banned' : 'Ban Player'}
                    </button>
                    <button 
                        onClick={handleMarkPaid}
                        className="px-6 py-3 bg-green-50 border border-green-100 text-green-600 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-2 font-bold"
                    >
                        <CheckCircle size={20} /> Mark Paid
                    </button>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-900">Players</h1>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search player..." 
                        className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 w-full md:w-64 transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="p-2 md:p-4 font-medium text-slate-500 text-xs md:text-base">ID</th>
                                <th className="p-2 md:p-4 font-medium text-slate-500 text-xs md:text-base">Username</th>
                                <th className="p-2 md:p-4 font-medium text-slate-500 text-xs md:text-base">Status</th>
                                <th className="p-2 md:p-4 font-medium text-slate-500 text-xs md:text-base">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500"><Loader /></td></tr>
                            ) : currentPlayers.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500">No players found.</td></tr>
                            ) : currentPlayers.map((player) => (
                                <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-2 md:p-4 text-slate-500 text-xs md:text-base">#{player.id}</td>
                                    <td className="p-2 md:p-4 font-bold text-slate-900 text-sm md:text-base break-all">{player.username}</td>
                                    <td className="p-2 md:p-4">
                                        <span className={`px-2 py-1 text-[10px] md:text-xs rounded-full font-bold ${player.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {player.status === 'banned' ? 'Banned' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="p-2 md:p-4">
                                        <button 
                                            onClick={() => handleViewPlayer(player.id)}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Eye size={16} className="md:w-5 md:h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                {!loading && players.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 md:px-4 md:py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs md:text-sm text-slate-600 font-medium">
                            Page {currentPage} of {Math.ceil(players.length / itemsPerPage)}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(players.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(players.length / itemsPerPage)}
                            className="px-3 py-1 md:px-4 md:py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerManagement;
