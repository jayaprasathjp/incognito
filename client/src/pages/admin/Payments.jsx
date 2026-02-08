import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const Payments = () => {
    const { token } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const data = await api.get('/admin/payments');
            if (Array.isArray(data)) {
                setPayments(data);
            } else {
                 toast.error(data.error || "Failed to load payments");
            }
        } catch (error) {
            toast.error("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [token]); 

    const handleMarkPaid = async (id) => {
        try {
            const data = await api.post(`/admin/payments/${id}/mark-paid`, {});
            if (data.message) {
                toast.success("Marked as paid");
                fetchPayments(); // Refresh list
            } else {
                toast.error(data.error || "Failed to update status");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Payments</h1>

            <div className="bg-white rounded-2xl overflow-hidden p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-6 p-4 bg-green-50 border border-green-100 rounded-xl">
                    <div className="p-3 bg-white rounded-full text-green-600 shadow-sm">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">Total Collected</div>
                        <div className="text-2xl font-bold text-slate-900">₦150,000 <span className="text-sm text-slate-400 font-normal">(Mock)</span></div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? <Loader /> : (
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-medium text-slate-500">Player</th>
                                    <th className="p-4 font-medium text-slate-500">Amount</th>
                                    <th className="p-4 font-medium text-slate-500">Status</th>
                                    <th className="p-4 font-medium text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.length === 0 ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-slate-500">No pending payments found.</td></tr>
                                ) : payments.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-900">{p.username}</td>
                                        <td className="p-4 text-slate-900">₦{p.amount}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {p.status !== 'paid' && (
                                                <button onClick={() => handleMarkPaid(p.id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Payments;
