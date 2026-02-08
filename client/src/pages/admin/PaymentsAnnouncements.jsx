import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle, Send, DollarSign, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { api } from "../../utils/api";

const PaymentsAnnouncements = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState("payments"); // payments | announcements
    const [payments, setPayments] = useState([]);
    const [announcement, setAnnouncement] = useState("");
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
        if (activeTab === 'payments') fetchPayments();
    }, [activeTab, token]); // Fixed dependency

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

    const handleSendAnnouncement = async (target) => { // target: 'all' | 'round'
        if (!announcement.trim()) return toast.error("Please enter a message");
        if (!confirm(`Send to ${target === 'all' ? 'ALL players' : 'Current Round players'}?`)) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/announcements`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: announcement, target })
            });

            if (res.ok) {
                toast.success("Announcement sent successfully");
                setAnnouncement("");
            }
        } catch (error) {
            toast.error("Failed to send announcement");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Payments & Announcements</h1>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 w-fit border border-slate-200">
                <button 
                    onClick={() => setActiveTab('payments')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'payments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Payments
                </button>
                <button 
                    onClick={() => setActiveTab('announcements')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'announcements' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Announcements
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl overflow-hidden p-6 shadow-sm border border-slate-200">
                {activeTab === 'payments' ? (
                    <div>
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
                        </div>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                <Megaphone size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Broadcast Announcement</h2>
                            <p className="text-slate-500">Send messages to players via their dashboard.</p>
                        </div>

                        <div className="space-y-2">
                             <label className="text-sm text-slate-500 font-medium">Message</label>
                            <textarea
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 min-h-[150px] transition-all shadow-inner"
                                placeholder="Type your announcement here..."
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleSendAnnouncement('all')}
                                className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                                <Send size={20} /> Send to All Players
                            </button>
                            <button 
                                onClick={() => handleSendAnnouncement('round')}
                                className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                            >
                                <Send size={20} /> Send to Current Round
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentsAnnouncements;
