import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
    const [tournaments, setTournaments] = useState([]);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(true);
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        try {
            const data = await api.get('/tournaments');
            setTournaments(data);
        } catch (error) {
            console.error('Failed to load tournaments');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tournaments', { title, description: desc });
            setTitle('');
            setDesc('');
            loadTournaments();
        } catch (error) {
            alert('Failed to create tournament');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Admin Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span>Welcome, {user?.username}</span>
                    <button onClick={logout} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Logout</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Create Tournament Form */}
                <div className="glass-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
                    <h3>Create Tournament</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <input 
                            type="text" 
                            placeholder="Tournament Title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            required 
                        />
                        <textarea 
                            placeholder="Description" 
                            value={desc} 
                            onChange={(e) => setDesc(e.target.value)}
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.05)', 
                                border: '1px solid var(--glass-border)', 
                                color: 'white', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                minHeight: '100px',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button type="submit" className="btn btn-primary">CREATE</button>
                    </form>
                </div>

                {/* Tournament List */}
                <div>
                    <h3>Active Tournaments</h3>
                    {loading ? <p>Loading...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            {tournaments.map(t => (
                                <div key={t.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>{t.title}</h4>
                                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                            Status: <span style={{ textTransform: 'uppercase', color: t.status === 'open' ? '#4ade80' : '#facc15' }}>{t.status}</span>
                                        </div>
                                    </div>
                                    <Link to={`/tournament/${t.id}`} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none' }}>
                                        MANAGE
                                    </Link>
                                </div>
                            ))}
                            {tournaments.length === 0 && <p style={{ opacity: 0.5 }}>No tournaments found.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
