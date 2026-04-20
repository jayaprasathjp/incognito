import { useEffect, useState } from 'react';
import { BellRing, CheckCheck, Megaphone } from 'lucide-react';
import appIcon from '../assets/app-icon.png';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import MenuButton from '../components/MenuButton';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const audienceLabelMap = {
    all: 'All players',
    current_tournament: 'Current tournament players',
    individuals: 'Selected players',
};

const PlayerAnnouncements = () => {
    const { token, refreshUnreadAnnouncements, announcementEvent } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newlyReadCount, setNewlyReadCount] = useState(0);

    const fetchAnnouncements = async ({ markAsRead = true } = {}) => {
            setLoading(true);

            try {
                const data = await api.get('/user/announcements');

                if (data.error) {
                    setAnnouncements([]);
                    return;
                }

                setAnnouncements(data.announcements || []);

                if (markAsRead && (data.unreadCount || 0) > 0) {
                    await api.post('/user/announcements/read-all', {});
                    setNewlyReadCount(data.unreadCount || 0);
                    await refreshUnreadAnnouncements();
                } else if (markAsRead) {
                    setNewlyReadCount(0);
                }
            } catch (error) {
                console.error('Failed to fetch announcements', error);
                setAnnouncements([]);
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        const loadPage = async () => {
            await fetchAnnouncements({ markAsRead: true });
        };

        if (token) {
            loadPage();
        }
    }, [token, refreshUnreadAnnouncements]);

    useEffect(() => {
        if (!announcementEvent?.announcement) return;

        setAnnouncements((current) => {
            const exists = current.some((item) => item.id === announcementEvent.announcement.id);
            if (exists) return current;
            return [announcementEvent.announcement, ...current];
        });

        const syncReadState = async () => {
            await api.post('/user/announcements/read-all', {});
            await refreshUnreadAnnouncements();
        };

        syncReadState();
    }, [announcementEvent, refreshUnreadAnnouncements]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-400/15 blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/15 blur-[120px] pointer-events-none"></div>

            <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm relative z-20">
                <img src={appIcon} alt="Logo" className="absolute left-4 w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-wider text-slate-800">INCØGNITØ</span>
                <MenuButton onClick={() => setIsMenuOpen(true)} />
            </div>

            <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <div className="max-w-4xl mx-auto px-4 py-6 sm:py-9 relative z-10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
                    <div>
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-emerald-600 mb-1">Inbox</p>
                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">Announcements</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">Official updates from the admin team land here.</p>
                    </div>
                    {newlyReadCount > 0 && (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700">
                            <CheckCheck size={18} />
                            {newlyReadCount} new announcement{newlyReadCount === 1 ? '' : 's'} marked as read
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader /></div>
                ) : announcements.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                            <BellRing size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">No announcements yet</h2>
                        <p className="text-slate-500 font-medium">When admins broadcast updates, they will show up here.</p>
                    </div>
                ) : (
                    <div className="space-y-2 sm:space-y-3">
                        {announcements.map((announcement) => (
                            <div key={announcement.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-5">
                                <div className="flex gap-2 sm:gap-4 items-start min-w-0">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg sm:rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                                        <Megaphone size={14} className="sm:w-[18px] sm:h-[18px]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                    {audienceLabelMap[announcement.audience_type] || 'Announcement'}
                                                </span>
                                                {announcement.tournament_title && (
                                                    <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-sky-700">
                                                        {announcement.tournament_title}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-slate-500 shrink-0 text-right">
                                                <span className="hidden sm:inline">By {announcement.created_by_username || 'Admin'} • </span>
                                                {new Date(announcement.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <p className="text-xs sm:text-base leading-relaxed text-slate-800 whitespace-pre-wrap">{announcement.message}</p>
                                        <div className="sm:hidden text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                                            By {announcement.created_by_username || 'Admin'} • {new Date(announcement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerAnnouncements;