import { useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminSidebar from "../components/AdminSidebar";
import { Menu } from "lucide-react";

const AdminLayout = () => {
    const { user, loading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    
    // Close sidebar on route change (mobile UX)
    // useEffect(() => setIsSidebarOpen(false), [location]); // handled in sidebar link click

    if (loading) return (
            <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
                Loading...
            </div>
    );
    
    // Redirect if not admin
    if (!user || user.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
            {/* Mobile Header */}
            <div className="md:hidden absolute top-0 left-0 right-0 p-4 flex items-center justify-center z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <img src="/web-icon.png" alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <button onClick={() => setIsSidebarOpen(true)} className="absolute right-4 p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                    <Menu size={24} />
                </button>
            </div>

            <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 md:mr-64 overflow-y-auto p-4 md:p-8 relative pt-20 md:pt-8 w-full">
                 {/* Background Gradient Effect - Subtle light mode version */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50 pointer-events-none z-0 opacity-50"></div>
                
                <div className="relative z-10 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
