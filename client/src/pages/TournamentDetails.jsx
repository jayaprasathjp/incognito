import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const TournamentDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [tournament, setTournament] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            // In a real app, we might want a single endpoint for all this, but this works for MVP
            const tData = await api.get('/tournaments'); // We should have get /tournaments/:id but we'll filter for now or add endpoint
            const t = tData.find(x => x.id === parseInt(id));
            setTournament(t);

            const pData = await api.get(`/tournaments/${id}/participants`);
            setParticipants(pData);

            const mData = await api.get(`/matches/${id}`);
            setMatches(mData);
        } catch (error) {
            console.error('Error loading tournament data', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleJoin = async () => {
        try {
            await api.post(`/tournaments/${id}/join`, {});
            loadData();
            alert('Join request sent!');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to join');
        }
    };

    const handleApprove = async (userId, status) => {
        try {
            await api.put(`/tournaments/${id}/participants/${userId}`, { status });
            loadData();
        } catch (error) {
            console.error('Action failed');
        }
    };
    
    // Admin: Determine Match Winner
    const handleSetWinner = async (matchId, winnerId) => {
        try {
            await api.put(`/matches/${matchId}`, { winner_id: winnerId });
            loadData();
        } catch (error) {
            console.error('Failed to set winner');
        }
    };

    const handleStart = async () => {
        if (!window.confirm("Start tournament? This will generate fixtures.")) return;
        try {
            await api.post(`/tournaments/${id}/start`, {});
            loadData();
        } catch (error) {
            alert('Failed to start tournament: ' + (error.error || 'Unknown error'));
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', minHeight: '50vh', alignItems: 'center' }}>
                <Loader />
            </div>
        );
    }
    if (!tournament) return <div style={{padding: '2rem'}}>Tournament not found</div>;

    const isAdmin = user?.role === 'admin';
    const isParticipant = participants.some(p => p.user_id === user?.id);
    const pendingParticipants = participants.filter(p => p.status === 'pending');
    const approvedParticipants = participants.filter(p => p.status === 'approved');

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <Link to={isAdmin ? "/admin" : "/dashboard"} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>&larr; Back to Dashboard</Link>
            
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{tournament.title}</h1>
                        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>{tournament.description}</p>
                    </div>
                    {tournament.status === 'open' && !isAdmin && !isParticipant && (
                        <button onClick={handleJoin} className="btn btn-primary">JOIN TOURNAMENT</button>
                    )}
                    {tournament.status === 'open' && isAdmin && approvedParticipants.length >= 2 && (
                        <button onClick={handleStart} className="btn" style={{ background: '#facc15', color: 'black' }}>START TOURNAMENT</button>
                    )}
                    {isParticipant && <span style={{ padding: '0.5rem 1rem', background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '8px' }}>Joined</span>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Sidebar: Participants */}
                <div>
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Participants ({approvedParticipants.length})</h3>
                    
                    {isAdmin && pendingParticipants.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ color: '#facc15' }}>Pending Requests</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {pendingParticipants.map(p => (
                                    <div key={p.id} className="glass-card" style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{p.username}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => handleApprove(p.user_id, 'approved')} className="btn" style={{ background: '#4ade80', color: 'black', padding: '5px 10px', fontSize: '0.8rem' }}>Accept</button>
                                            <button onClick={() => handleApprove(p.user_id, 'rejected')} className="btn" style={{ background: '#ef4444', color: 'white', padding: '5px 10px', fontSize: '0.8rem' }}>Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {approvedParticipants.map(p => (
                            <div key={p.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                {p.username}
                            </div>
                        ))}
                        {approvedParticipants.length === 0 && <p style={{ opacity: 0.5 }}>No active participants.</p>}
                    </div>
                </div>

                {/* Main: Brackets / Matches */}
                <div>
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Bracket</h3>
                    {matches.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, border: '1px dashed var(--glass-border)', borderRadius: '16px' }}>
                            Matches not generated yet.
                            {/* In MVP v2, add "Generate Fixtures" button here for Admin */}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {matches.map(m => (
                                <div key={m.id} className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: 1, textAlign: 'right', fontWeight: m.winner_id === m.player1_id ? 'bold' : 'normal', color: m.winner_id === m.player1_id ? '#4ade80' : 'inherit' }}>
                                        {m.player1_name || 'Bye'}
                                    </div>
                                    <div style={{ padding: '0 1rem', opacity: 0.5 }}>vs</div>
                                    <div style={{ flex: 1, textAlign: 'left', fontWeight: m.winner_id === m.player2_id ? 'bold' : 'normal', color: m.winner_id === m.player2_id ? '#4ade80' : 'inherit' }}>
                                        {m.player2_name || 'Bye'}
                                    </div>
                                    
                                    {isAdmin && !m.winner_id && m.player1_id && m.player2_id && (
                                        <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => handleSetWinner(m.id, m.player1_id)} className="btn" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}>P1 Win</button>
                                            <button onClick={() => handleSetWinner(m.id, m.player2_id)} className="btn" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}>P2 Win</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TournamentDetails;
