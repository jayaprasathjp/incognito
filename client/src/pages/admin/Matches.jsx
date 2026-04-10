import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Eye } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const Matches = () => {
    const { token } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const data = await api.get('/admin/matches');
            if (Array.isArray(data)) setMatches(data);
        } catch (error) {
            toast.error("Failed to load matches");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, [token]);

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
                fetchMatches();
            } else {
                 toast.error(data.error || "Failed to override");
            }
        } catch (err) {
            toast.error("Failed to override");
        }
    };

    const handleRematch = async (e) => {
        e.preventDefault();
        try {
            const data = await api.post(`/admin/matches/${selectedMatch.id}/rematch`);
            if (data.message) {
                toast.success("Match has been reset for a rematch.");
                setSelectedMatch(null);
                fetchMatches();
            } else {
                toast.error(data.error || "Failed to reset match");
            }
        } catch (err) {
            toast.error("Failed to reset match");
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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Matches</h1>
                <button onClick={fetchMatches} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                    Refresh
                </button>
            </div>

            {loading ? <div className="p-10 text-center"><Loader /></div> : (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                    <div className="overflow-x-auto">
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
                    </div>
                </div>
            )}

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

                        <button onClick={handleOverride} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors mb-2 border border-red-100">
                            Override Result (Set P1 Win)
                        </button>
                        <button onClick={handleRematch} className="w-full py-3 bg-orange-50 text-orange-600 rounded-xl font-bold hover:bg-orange-100 transition-colors mb-2 border border-orange-100">
                            Force Rematch (Reset & Restart)
                        </button>
                        <button onClick={() => setSelectedMatch(null)} className="w-full py-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matches;
