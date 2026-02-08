import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createPortal } from "react-dom";
import { 
    LayoutDashboard, 
    Users, 
    Trophy, 
    Swords, 
    CreditCard, 
    LogOut,
    Megaphone,
    Gavel,
    X
} from "lucide-react";

const AdminSidebar = ({ isOpen, onClose }) => {
    const { logout } = useAuth();
    const location = useLocation();
    const sidebarRef = useRef(null);

    const isActive = (path) => location.pathname === path;

    // Close on click outside (mobile)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    const navItems = [
        { path: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { path: "/admin/players", label: "Players", icon: <Users size={20} /> },
        { path: "/admin/tournament", label: "Tournament", icon: <Trophy size={20} /> },
        { path: "/admin/matches", label: "Matches", icon: <Swords size={20} /> },
        { path: "/admin/disputes", label: "Disputes", icon: <Gavel size={20} /> },
        { path: "/admin/payments", label: "Payments", icon: <CreditCard size={20} /> },
        { path: "/admin/announcements", label: "Announcements", icon: <Megaphone size={20} /> },
    ];

    const linkClass = (path) => `
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        ${isActive(path) 
            ? "bg-slate-900 text-white shadow-md" 
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}
    `;

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <img src="/web-icon.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">INCØGNITØ</h1>
                </div>
                <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <Link 
                        key={item.path} 
                        to={item.path} 
                        className={linkClass(item.path)}
                        onClick={() => onClose && onClose()} 
                    >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-200">
                <button 
                    onClick={() => {
                        logout();
                        onClose && onClose();
                    }}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar (Fixed) */}
            <div className="hidden md:flex w-64 h-screen bg-white border-l border-slate-200 flex-col fixed right-0 top-0 z-30 shadow-sm">
                <SidebarContent />
            </div>

            {/* Mobile Sidebar (Drawer) */}
            {createPortal(
                <div className={`fixed inset-0 z-[9999] md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"></div>
                    
                    {/* Drawer */}
                    <div 
                        ref={sidebarRef}
                        className={`absolute right-0 top-0 h-full w-[80%] max-w-xs bg-white shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    >
                        <SidebarContent />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default AdminSidebar;
