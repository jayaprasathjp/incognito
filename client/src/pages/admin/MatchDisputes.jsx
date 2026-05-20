import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Eye, Gavel, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const MatchDisputes = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState("matches"); // matches | disputes
    const [matches, setMatches] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [selectedDispute, setSelectedDispute] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'matches') {
                const data = await api.get('/admin/matches');
                if (Array.isArray(data)) setMatches(data);
            } else {
                const data = await api.get('/admin/disputes');
                if (Array.isArray(data)) setDisputes(data);
            }
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, token]);

    // Match Handlers
    const handleOverride = async (e) => {
        e.preventDefault();
        const winnerId = selectedMatch.player1_id;
        const s1 = 3; 
        const s2 = 0;
        
        try {
            const data = await api.post(`/admin/matches/${selectedMatch.id}/override`, { winner_id: winnerId, score_p1: s1, score_p2: s2 });
            if (data.id) {
                toast.success("Match result overridden");
                setSelectedMatch(null);
                fetchData();
            } else {
                 toast.error(data.error || "Failed to override");
            }
        } catch (err) {
            toast.error("Failed to override");
        }
    };

    const handleNoShow = async () => {
        if (!window.confirm(`Mark Match #${selectedMatch.id} as No-Show? Both players will be eliminated.`)) return;
        try {
            const data = await api.post(`/admin/matches/${selectedMatch.id}/no-show`, {});
            if (data.message) {
                toast.success("Match marked as no-show. Both players eliminated.");
                setSelectedMatch(null);
                fetchData();
            } else {
                toast.error(data.error || "Failed to mark no-show");
            }
        } catch (err) {
            toast.error("Failed to mark no-show");
        }
    };

    // Dispute Handlers
    const handleResolveDispute = async (action) => {
        try {
            const data = await api.post(`/admin/disputes/${selectedDispute.id}/resolve`, { action });
            if (data.message) {
                toast.success(`Dispute ${action}d`);
                setSelectedDispute(null);
                fetchData();
            } else {
                 toast.error(data.error || "Failed to resolve dispute");
            }
        } catch (err) {
            toast.error("Failed to resolve dispute");
        }
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            live: "bg-red-100 text-red-700",
            in_progress: "bg-green-100 text-green-700",
            completed: "bg-slate-100 text-slate-700",
            scheduled: "bg-blue-50 text-blue-700",
            pending: "bg-orange-100 text-orange-700",
            resolved: "bg-purple-100 text-purple-700",
            rejected: "bg-red-100 text-red-700"
        };
        return (
            <span className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider ${colors[status] || "bg-slate-100 text-slate-500"}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Matches & Disputes</h1>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 w-fit border border-slate-200">
                <button 
                    onClick={() => setActiveTab('matches')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'matches' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Matches
                </button>
                <button 
                    onClick={() => setActiveTab('disputes')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'disputes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Disputes
                </button>
            </div>

            {/* Content Area */}
            {loading ? <div className="p-10 text-center"><Loader /></div> : (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                    <div className="overflow-x-auto">
                        {activeTab === 'matches' ? (
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-medium text-slate-500">ID</th>
                                        <th className="p-4 font-medium text-slate-500">Player A</th>
                                        <th className="p-4 font-medium text-slate-500">Player B</th>
                                        <th className="p-4 font-medium text-slate-500">Status</th>
                                        <th className="p-4 font-medium text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {matches.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-500">#{m.id}</td>
                                            <td className="p-4 font-bold text-slate-900">{m.p1_name || 'TBD'}</td>
                                            <td className="p-4 font-bold text-slate-900">{m.p2_name || 'TBD'}</td>
                                            <td className="p-4"><StatusBadge status={m.status} /></td>
                                            <td className="p-4">
                                                <button onClick={() => setSelectedMatch(m)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-medium text-slate-500">Match ID</th>
                                        <th className="p-4 font-medium text-slate-500">Reason</th>
                                        <th className="p-4 font-medium text-slate-500">Status</th>
                                        <th className="p-4 font-medium text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {disputes.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-slate-500">No active disputes</td></tr> : 
                                    disputes.map(d => (
                                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-500">#{d.match_id}</td>
                                            <td className="p-4 font-medium text-slate-900 max-w-xs truncate" title={d.reason}>{d.reason}</td>
                                            <td className="p-4"><StatusBadge status={d.status} /></td>
                                            <td className="p-4">
                                                <button onClick={() => setSelectedDispute(d)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                                                    <Gavel size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Match Detail Modal (Simple implementation) */}
            {selectedMatch && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white max-w-md w-full p-6 rounded-2xl relative shadow-xl border border-slate-200">
                        <h2 className="text-2xl font-bold mb-4 text-slate-900">Match #{selectedMatch.id}</h2>
                        
                        <div className="grid grid-cols-3 text-center mb-6 items-center">
                            <div className="font-bold text-xl text-slate-900">{selectedMatch.p1_name}</div>
                            <div className="text-2xl font-mono text-blue-600">
                                {selectedMatch.score_player1} - {selectedMatch.score_player2}
                            </div>
                            <div className="font-bold text-xl text-slate-900">{selectedMatch.p2_name}</div>
                        </div>

                        <div className="text-center mb-6 text-slate-600">
                            Winner: <span className="text-green-600 font-bold">{selectedMatch.winner_id ? (selectedMatch.winner_id === selectedMatch.player1_id ? selectedMatch.p1_name : selectedMatch.p2_name) : 'Pending'}</span>
                        </div>

                        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 text-center">
                            Status: <span className="font-bold uppercase text-slate-700">{selectedMatch.status}</span>
                            {selectedMatch.round && <> &nbsp;·&nbsp; Round <span className="font-bold">{selectedMatch.round}</span></>}
                        </div>

                        <button onClick={handleOverride} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors mb-2 border border-red-100">
                            Override Result (Set P1 Win)
                        </button>

                        {selectedMatch.status === 'scheduled' && (
                            <button
                                onClick={handleNoShow}
                                className="w-full py-3 bg-orange-50 text-orange-700 rounded-xl font-bold hover:bg-orange-100 transition-colors mb-2 border border-orange-200 flex items-center justify-center gap-2"
                            >
                                <span>⚠️</span> Mark No-Show (Double DQ)
                            </button>
                        )}

                        <button onClick={() => setSelectedMatch(null)} className="w-full py-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Dispute Detail Modal */}
            {selectedDispute && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                     <div className="bg-white max-w-lg w-full p-6 rounded-2xl relative shadow-xl border border-slate-200">
                        <h2 className="text-2xl font-bold mb-4 text-slate-900">Dispute Resolution</h2>
                        <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                            <p className="text-slate-500 text-sm mb-1">Reason:</p>
                            <p className="text-slate-900">{selectedDispute.reason}</p>
                            {selectedDispute.evidence_url && (
                                <a href={selectedDispute.evidence_url} target="_blank" rel="noopener noreferrer" className="block mt-2 text-blue-600 hover:underline text-sm font-medium">
                                    View Evidence
                                </a>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleResolveDispute('approve')} className="py-3 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 border border-green-100 flex flex-col items-center transition-colors">
                                <CheckCircle className="mb-1" size={20} /> Approve
                            </button>
                            <button onClick={() => handleResolveDispute('reject')} className="py-3 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 border border-red-100 flex flex-col items-center transition-colors">
                                <XCircle className="mb-1" size={20} /> Reject
                            </button>
                            <button onClick={() => handleResolveDispute('rematch')} className="py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 border border-blue-100 flex flex-col items-center transition-colors">
                                <RefreshCw className="mb-1" size={20} /> Rematch
                            </button>
                        </div>
                        <button onClick={() => setSelectedDispute(null)} className="w-full mt-4 py-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchDisputes;
