import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Gavel, CheckCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const Disputes = () => {
    const { token } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [adminWinnerId, setAdminWinnerId] = useState("");
    const [adminS1, setAdminS1] = useState("");
    const [adminS2, setAdminS2] = useState("");
    const [dqPlayerId, setDqPlayerId] = useState("");
    const [rematchTime, setRematchTime] = useState("");

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const data = await api.get('/admin/disputes');
            if (Array.isArray(data)) setDisputes(data);
        } catch (error) {
            toast.error("Failed to load disputes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisputes();
    }, [token]);

    const handleResolveDispute = async (action) => {
        try {
            const body = { action };
            if (action === "winner_updated") {
                const w = parseInt(adminWinnerId, 10);
                const s1 = parseInt(adminS1, 10);
                const s2 = parseInt(adminS2, 10);
                if (!w || Number.isNaN(s1) || Number.isNaN(s2)) {
                    toast.error("Set winner and both scores for conflicting-score disputes.");
                    return;
                }
                body.winner_id = w;
                body.score_p1 = s1;
                body.score_p2 = s2;
            }
            if (action === "player_disqualified") {
                const dq = parseInt(dqPlayerId, 10);
                if (!dq) {
                    toast.error("Select which player is disqualified.");
                    return;
                }
                body.disqualified_player_id = dq;
            }
            if (action === "match_replay_scheduled") {
                if (!/^\d{2}:\d{2}$/.test(rematchTime)) {
                    toast.error("Set replay time in HH:mm format.");
                    return;
                }
                body.rematch_time = rematchTime;
            }
            const data = await api.post(`/admin/disputes/${selectedDispute.id}/resolve`, body);
            if (data.error) {
                toast.error(data.error);
                return;
            }
            if (data.message) {
                toast.success(`Dispute ${action}d`);
                setSelectedDispute(null);
                setAdminWinnerId("");
                setAdminS1("");
                setAdminS2("");
                setDqPlayerId("");
                setRematchTime("");
                fetchDisputes();
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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Disputes</h1>
                <button onClick={fetchDisputes} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                    Refresh
                </button>
            </div>

            {loading ? <div className="p-10 text-center"><Loader /></div> : (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                     <div className="overflow-x-auto">
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
                    </div>
                </div>
            )}

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
                            <p className="text-xs text-amber-700 font-medium mt-2">
                                Winner updated requires final scores + winner.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 mb-4">
                            <label className="text-xs font-bold text-slate-500">Winner (for Winner Updated)</label>
                            <select
                                value={adminWinnerId}
                                onChange={(e) => setAdminWinnerId(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg"
                            >
                                <option value="">Select winner</option>
                                <option value={selectedDispute.player1_id}>Home (player 1)</option>
                                <option value={selectedDispute.player2_id}>Away (player 2)</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Score home</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={adminS1}
                                        onChange={(e) => setAdminS1(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Score away</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                        value={adminS2}
                                        onChange={(e) => setAdminS2(e.target.value)}
                                    />
                                </div>
                            </div>
                            <label className="text-xs font-bold text-slate-500 mt-2">Disqualified player (for cheating)</label>
                            <select
                                value={dqPlayerId}
                                onChange={(e) => setDqPlayerId(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg"
                            >
                                <option value="">Select player</option>
                                <option value={selectedDispute.player1_id}>Home (player 1)</option>
                                <option value={selectedDispute.player2_id}>Away (player 2)</option>
                            </select>
                            <label className="text-xs font-bold text-slate-500 mt-2">Replay time (same date)</label>
                            <input
                                type="time"
                                value={rematchTime}
                                onChange={(e) => setRematchTime(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button onClick={() => handleResolveDispute('winner_updated')} className="py-3 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 border border-green-100 flex flex-col items-center transition-colors">
                                <CheckCircle className="mb-1" size={20} /> Winner Updated
                            </button>
                            <button onClick={() => handleResolveDispute('match_replay_scheduled')} className="py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 border border-blue-100 flex flex-col items-center transition-colors">
                                <RefreshCw className="mb-1" size={20} /> Match Replay
                            </button>
                            <button onClick={() => handleResolveDispute('player_disqualified')} className="py-3 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-100 border border-amber-100 flex flex-col items-center transition-colors">
                                <Gavel className="mb-1" size={20} /> Player Disqualified
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

export default Disputes;
