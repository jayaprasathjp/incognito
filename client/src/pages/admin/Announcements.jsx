import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Send, Megaphone } from "lucide-react";
import toast from "react-hot-toast";

const Announcements = () => {
    const { token } = useAuth();
    const [announcement, setAnnouncement] = useState("");

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
            <h1 className="text-3xl font-bold">Announcements</h1>
            
            <div className="bg-white rounded-2xl overflow-hidden p-6 shadow-sm border border-slate-200">
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
            </div>
        </div>
    );
};

export default Announcements;
