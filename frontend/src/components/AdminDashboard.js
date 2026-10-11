import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hivesAPI } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Plus, Trash2, MapPin, User, LayoutGrid, Map, Shield, LogOut, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import '../styles/AdminDashboard.css';
import ThemeToggle from './ThemeToggle';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const NAV = [
  { id: 'cards', icon: LayoutGrid, label: 'Hive Overview' },
  { id: 'map',   icon: Map,        label: 'Map View' },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [hives, setHives]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [viewMode, setViewMode]       = useState('cards');
  const [newHive, setNewHive]         = useState({
    hive_id: '', name: '', location: '',
    lat: 19.076, lng: 72.8777, owner: '', smsAlertsEnabled: true
  });

  useEffect(() => {
    fetchHives();
    const interval = setInterval(fetchHives, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchHives = async () => {
    try {
      const res = await hivesAPI.getAllHives();
      setHives(res.data.data);
    } catch { toast.error('Failed to load hives'); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await hivesAPI.createHive({ ...newHive, coordinates: { lat: newHive.lat, lng: newHive.lng } });
      toast.success('Hive registered!');
      setShowModal(false);
      fetchHives();
      setNewHive({ hive_id: '', name: '', location: '', lat: 19.076, lng: 72.8777, owner: '', smsAlertsEnabled: true });
    } catch (err) { toast.error(err.response?.data?.message || 'Create failed'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await hivesAPI.deleteHive(id); toast.success('Hive deleted'); fetchHives(); }
    catch { toast.error('Delete failed'); }
  };

  const statusOf = (t) => {
    if (!t) return { label: 'No data', color: '#4b5569' };
    const m = (Date.now() - new Date(t)) / 60000;
    if (m < 5)  return { label: 'Active',  color: '#22c55e' };
    if (m < 30) return { label: 'Idle',    color: '#eab308' };
    return         { label: 'Offline', color: '#ef4444' };
  };

  const activeCount = hives.filter(h => h.lastDataReceived && (Date.now() - new Date(h.lastDataReceived)) / 60000 < 5).length;
  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return <div className="page-loading"><div className="spinner" />Loading admin panel…</div>;

  return (
    <div className="app-layout">
      {/* ══ Sidebar ══ */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚙️</div>
          <span className="sidebar-logo-text"><span>Admin</span> Panel</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Views</div>
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`sidebar-link ${viewMode === id ? 'active' : ''}`}
              onClick={() => setViewMode(id)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 8 }}>Actions</div>
          <button className="sidebar-link" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add New Hive
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}>
              {initials(user?.name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button className="sidebar-logout" onClick={logout} title="Sign out"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      {/* ══ Main ══ */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-crumb">Admin</span>
            <span className="topbar-crumb-sep">›</span>
            <span className="topbar-title">
              {viewMode === 'cards' ? 'Hive Overview' : 'Map View'}
            </span>
          </div>
          <div className="topbar-right">
            <span className="topbar-badge" style={{ background: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.18)', color: '#a78bfa' }}>
              <Shield size={12} /> {hives.length} hives
            </span>
            <button className="topbar-primary-btn" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Add Hive
            </button>
            <ThemeToggle compact={true} />
          </div>
        </header>

        <div className="page-body">

          {/* ── Stat row ── */}
          <div className="bento-grid">
            <div className="bento-card col-4 stat-tile tile-cyan">
              <div className="stat-tile-icon"><LayoutGrid size={18} /></div>
              <div className="stat-tile-value">{hives.length}</div>
              <div className="stat-tile-label">Total Hives</div>
            </div>
            <div className="bento-card col-4 stat-tile tile-green">
              <div className="stat-tile-icon"><div style={{ width:12,height:12,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e' }} /></div>
              <div className="stat-tile-value">{activeCount}</div>
              <div className="stat-tile-label">Active Now</div>
            </div>
            <div className="bento-card col-4 stat-tile tile-violet">
              <div className="stat-tile-icon"><Bell size={18} /></div>
              <div className="stat-tile-value">{hives.filter(h => h.smsAlertsEnabled).length}</div>
              <div className="stat-tile-label">SMS Alerts ON</div>
            </div>
          </div>

          {/* ── Cards View ── */}
          {viewMode === 'cards' && (
            <div className="hive-cards-grid">
              {hives.map(hive => {
                const { label, color } = statusOf(hive.lastDataReceived);
                return (
                  <div className="hive-card" key={hive._id}>
                    <div className="hive-card-top">
                      <span className="hive-card-id">{hive.hive_id}</span>
                      <div className="hive-card-actions">
                        <button className="hive-card-action-btn" onClick={() => handleDelete(hive._id, hive.name)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="hive-card-name">{hive.name}</div>
                    <div className="hive-card-location">
                      <MapPin size={12} /> {hive.location}
                    </div>
                    <div className="hive-card-footer">
                      <div className="hive-card-status">
                        <div className="hive-status-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                        <span style={{ color }}>{label}</span>
                      </div>
                      <div className="hive-card-owner">
                        <User size={12} />
                        {hive.owner?.name || 'Unassigned'}
                      </div>
                    </div>
                    {/* SMS badge */}
                    <div style={{ position: 'absolute', top: 16, right: 52 }}>
                      {hive.smsAlertsEnabled
                        ? <span className="sensor-row-status status-ok" style={{ fontSize: 10 }}>SMS ON</span>
                        : <span className="sensor-row-status status-bad" style={{ fontSize: 10 }}>SMS OFF</span>}
                    </div>
                  </div>
                );
              })}

              {hives.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <div className="empty-state-icon">🏚️</div>
                  <h3>No Hives Yet</h3>
                  <p>Click "Add Hive" to register your first beehive.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Map View ── */}
          {viewMode === 'map' && (
            <div className="bento-card" style={{ padding: 16 }}>
              <MapContainer center={[19.076, 72.8777]} zoom={10} style={{ height: 520, width: '100%', borderRadius: 10 }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {hives.map(h => h.coordinates && (
                  <Marker key={h._id} position={[h.coordinates.lat, h.coordinates.lng]}>
                    <Popup>
                      <strong>{h.name}</strong><br />
                      {h.hive_id} · {h.location}<br />
                      Owner: {h.owner?.name || 'Unassigned'}<br />
                      <span style={{ color: statusOf(h.lastDataReceived).color, fontWeight: 600 }}>
                        ● {statusOf(h.lastDataReceived).label}
                      </span>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      {/* ══ Add Hive Modal ══ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title-row">
              <div className="modal-icon"><Plus size={18} /></div>
              <h2>Register New Hive</h2>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Hive ID *</label>
                <input value={newHive.hive_id} onChange={e => setNewHive({ ...newHive, hive_id: e.target.value.toUpperCase() })} placeholder="HIVE002" required />
              </div>
              <div className="form-group">
                <label>Hive Name *</label>
                <input value={newHive.name} onChange={e => setNewHive({ ...newHive, name: e.target.value })} placeholder="Main Apiary – Hive 2" required />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input value={newHive.location} onChange={e => setNewHive({ ...newHive, location: e.target.value })} placeholder="North Field, Farm A" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input type="number" step="0.000001" value={newHive.lat} onChange={e => setNewHive({ ...newHive, lat: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input type="number" step="0.000001" value={newHive.lng} onChange={e => setNewHive({ ...newHive, lng: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label>Owner User ID *</label>
                <input value={newHive.owner} onChange={e => setNewHive({ ...newHive, owner: e.target.value })} placeholder="MongoDB ObjectId" required />
                <small>Copy from Users collection in your database</small>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Create Hive</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
