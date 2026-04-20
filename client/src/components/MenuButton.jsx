import { useAuth } from '../context/AuthContext';

const MenuButton = ({ onClick, className = '' }) => {
    const { user, unreadAnnouncements } = useAuth();
    const showBadge = Boolean(user) && unreadAnnouncements > 0;
    const badgeLabel = unreadAnnouncements > 99 ? '99+' : unreadAnnouncements;

    return (
        <button
            onClick={onClick}
            className={`absolute right-4 p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 focus:outline-none ${className}`}
            aria-label="Menu"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {showBadge && (
                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm border-2 border-white">
                    {badgeLabel}
                </span>
            )}
        </button>
    );
};

export default MenuButton;