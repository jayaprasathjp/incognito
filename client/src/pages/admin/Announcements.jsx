import { useEffect, useMemo, useState } from "react";
import { Check, Megaphone, Send, Trash2, Users, UserRound, UserSquare2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../utils/api";

const Announcements = () => {
    const [announcement, setAnnouncement] = useState("");
    const [target, setTarget] = useState("all");
    const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
    const [search, setSearch] = useState("");
    const [sending, setSending] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [audience, setAudience] = useState({ allPlayers: [], currentTournamentPlayers: [], currentTournament: null });
    const [history, setHistory] = useState([]);

    const loadAnnouncementData = async () => {
        setLoading(true);
        try {
            const [audienceData, historyData] = await Promise.all([
                api.get('/admin/announcements/audience'),
                api.get('/admin/announcements'),
            ]);

            if (audienceData.error) {
                throw new Error(audienceData.error);
            }

            if (historyData.error) {
                throw new Error(historyData.error);
            }

            setAudience({
                allPlayers: audienceData.allPlayers || [],
                currentTournamentPlayers: audienceData.currentTournamentPlayers || [],
                currentTournament: audienceData.currentTournament || null,
            });
            setHistory(historyData.announcements || []);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to load announcement tools');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncementData();
    }, []);

    const filteredPlayers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return audience.allPlayers;

        return audience.allPlayers.filter((player) =>
            player.username.toLowerCase().includes(query) ||
            player.email.toLowerCase().includes(query)
        );
    }, [audience.allPlayers, search]);

    const recipientCount = target === 'all'
        ? audience.allPlayers.length
        : target === 'current_tournament'
            ? audience.currentTournamentPlayers.length
            : selectedRecipientIds.length;

    const toggleRecipient = (id) => {
        setSelectedRecipientIds((current) => (
            current.includes(id)
                ? current.filter((recipientId) => recipientId !== id)
                : [...current, id]
        ));
    };

    const handleSendAnnouncement = async () => {
        if (!announcement.trim()) {
            toast.error('Please enter a message');
            return;
        }

        if (target === 'individuals' && selectedRecipientIds.length === 0) {
            toast.error('Select at least one player');
            return;
        }

        setSending(true);

        try {
            const data = await api.post('/admin/announcements', {
                message: announcement,
                target,
                recipientIds: selectedRecipientIds,
            });

            if (data.error) {
                throw new Error(data.error);
            }

            toast.success(`Announcement sent to ${data.recipientCount} player${data.recipientCount === 1 ? '' : 's'}`);
            setAnnouncement('');
            setSelectedRecipientIds([]);
            await loadAnnouncementData();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to send announcement');
        } finally {
            setSending(false);
        }
    };

    const handleDeleteAnnouncement = async (announcementId) => {
        const confirmed = window.confirm('Delete this announcement and all related rows from the announcement tables?');

        if (!confirmed) {
            return;
        }

        setDeletingId(announcementId);

        try {
            const data = await api.delete(`/admin/announcements/${announcementId}`);

            if (data.error) {
                throw new Error(data.error);
            }

            setHistory((current) => current.filter((item) => item.id !== announcementId));
            toast.success('Announcement deleted');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to delete announcement');
        } finally {
            setDeletingId(null);
        }
    };

    const targetOptions = [
        {
            value: 'all',
            label: 'All users',
            description: 'Broadcast to every player account in the system.',
            count: audience.allPlayers.length,
            icon: <Users size={20} />,
        },
        {
            value: 'current_tournament',
            label: 'Current tournament players',
            description: audience.currentTournament
                ? `Only active (In) players in ${audience.currentTournament.title}.`
                : 'Only active (In) players in the latest tournament.',
            count: audience.currentTournamentPlayers.length,
            icon: <UserRound size={20} />,
        },
        {
            value: 'individuals',
            label: 'Specific individuals',
            description: 'Search and hand-pick one or many players.',
            count: selectedRecipientIds.length,
            icon: <UserSquare2 size={20} />,
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Announcements</h1>
                    <p className="hidden sm:block text-sm sm:text-base text-slate-500 mt-2">Broadcast updates to all players, the tournament field, or individuals.</p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:px-4 sm:py-3 text-[10px] sm:text-sm font-bold text-slate-600 shadow-sm whitespace-nowrap">
                    <Megaphone size={14} className="text-blue-600 sm:w-[18px] sm:h-[18px]" />
                    {recipientCount}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.9fr)]">
                <div className="bg-white rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-4 sm:space-y-6">
                    <div className="flex sm:grid gap-3 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 snap-x">
                        {targetOptions.map((option) => {
                            const isActive = target === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setTarget(option.value)}
                                    className={`text-left rounded-2xl border p-2.5 sm:p-4 transition-all flex-1 min-w-[100px] sm:min-w-0 snap-center ${
                                        isActive
                                            ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                                            : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-4">
                                        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center ${isActive ? 'bg-white/10' : 'bg-white text-slate-700 border border-slate-200'}`}>
                                            {option.icon}
                                        </div>
                                        <span className={`text-[9px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                                            {option.count}
                                        </span>
                                    </div>
                                    <h2 className={`font-black text-[11px] sm:text-base leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>{option.label}</h2>
                                    <p className={`mt-1 sm:mt-2 text-xs sm:text-sm leading-relaxed sm:leading-6 hidden sm:block ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{option.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    {target === 'individuals' && (
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Choose recipients</h3>
                                    <p className="text-sm text-slate-500">Search players and select who should receive this message.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRecipientIds(filteredPlayers.map((player) => player.id))}
                                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300"
                                    >
                                        Select filtered
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRecipientIds([])}
                                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by username or email"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:border-slate-900"
                            />

                            <div className="grid gap-3 max-h-80 overflow-y-auto pr-1">
                                {filteredPlayers.map((player) => {
                                    const checked = selectedRecipientIds.includes(player.id);

                                    return (
                                        <button
                                            key={player.id}
                                            type="button"
                                            onClick={() => toggleRecipient(player.id)}
                                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                                                checked
                                                    ? 'border-slate-900 bg-slate-900 text-white'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div>
                                                <div className={`font-bold ${checked ? 'text-white' : 'text-slate-900'}`}>{player.username}</div>
                                                <div className={`text-sm ${checked ? 'text-slate-200' : 'text-slate-500'}`}>{player.email}</div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${checked ? 'border-white bg-white text-slate-900' : 'border-slate-300 text-transparent'}`}>
                                                <Check size={14} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredPlayers.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500">
                                    No players match that search.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2 sm:space-y-3">
                        <label className="text-xs sm:text-sm font-semibold text-slate-600">Message</label>
                        <textarea
                            className="w-full min-h-[140px] sm:min-h-[190px] rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:py-4 text-slate-900 focus:outline-none focus:border-slate-900 leading-normal sm:leading-7 text-sm sm:text-base shadow-inner"
                            placeholder="Write the announcement your players should receive..."
                            value={announcement}
                            onChange={(event) => setAnnouncement(event.target.value)}
                        ></textarea>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500">
                            {target === 'current_tournament' && audience.currentTournament && (
                                <span>Current tournament: <span className="font-semibold text-slate-700">{audience.currentTournament.title}</span></span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleSendAnnouncement}
                            disabled={sending || loading || recipientCount === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-white font-bold shadow-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                            {sending ? 'Sending...' : 'Send announcement'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 text-center sm:text-left">Delivery preview</h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2 text-center sm:text-left">Quick glance at your target audience.</p>

                        <div className="mt-4 sm:mt-5 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 sm:p-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 sm:mb-2">Target</div>
                                <div className="text-sm sm:text-lg font-black text-slate-900 truncate">
                                    {targetOptions.find((option) => option.value === target)?.label}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 sm:p-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 sm:mb-2">Recipients</div>
                                <div className="text-xl sm:text-3xl font-black text-slate-900">{recipientCount}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900">Recent broadcasts</h2>
                                <p className="text-sm text-slate-500">Latest messages sent from the admin panel.</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[34rem] overflow-y-auto pr-1">
                            {loading ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-medium text-slate-500">
                                    Loading announcement history...
                                </div>
                            ) : history.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-medium text-slate-500">
                                    No broadcasts sent yet.
                                </div>
                            ) : history.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 border border-slate-200">
                                            {item.audience_type === 'all' ? 'All users' : item.audience_type === 'current_tournament' ? 'Tournament players' : 'Individuals'}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAnnouncement(item.id)}
                                                disabled={deletingId === item.id}
                                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Trash2 size={14} />
                                                {deletingId === item.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">{item.message}</p>
                                    <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                                        <span>{item.recipient_count} recipients</span>
                                        <span>{item.read_count} read</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Announcements;
