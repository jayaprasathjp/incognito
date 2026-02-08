import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Gavel, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const Disputes = () => {
    const { token } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState(null);

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
            const data = await api.post(`/admin/disputes/${selectedDispute.id}/resolve`, { action });
            if (data.message) {
                toast.success(`Dispute ${action}d`);
                setSelectedDispute(null);
                fetchDisputes();
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

export default Disputes;
