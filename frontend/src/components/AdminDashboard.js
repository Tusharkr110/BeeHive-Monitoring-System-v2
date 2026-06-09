import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hivesAPI } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Plus, Trash2, Edit, MapPin, User } from 'lucide-react';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import '../styles/AdminDashboard.css';

// Fix Leaflet default icon issue
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [hives, setHives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  
  const [newHive, setNewHive] = useState({
    hive_id: '',
    name: '',
    location: '',
    lat: 19.0760,
    lng: 72.8777,
    owner: '',
    smsAlertsEnabled: true
  });

  useEffect(() => {
    fetchHives();
  }, []);

  const fetchHives = async () => {
    try {
      const response = await hivesAPI.getAllHives();
      setHives(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch hives');
      setLoading(false);
    }
  };

  const handleCreateHive = async (e) => {
    e.preventDefault();
    
    try {
      await hivesAPI.createHive({
        ...newHive,
        coordinates: { lat: newHive.lat, lng: newHive.lng }
      });
      
      toast.success('Hive created successfully!');
      setShowAddModal(false);
      fetchHives();
      
      // Reset form
      setNewHive({
        hive_id: '',
        name: '',
        location: '',
        lat: 19.0760,
        lng: 72.8777,
        owner: '',
        smsAlertsEnabled: true
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create hive');
    }
  };

  const handleDeleteHive = async (hiveId, hiveName) => {
    if (!window.confirm(`Are you sure you want to delete ${hiveName}?`)) {
      return;
    }

    try {
      await hivesAPI.deleteHive(hiveId);
      toast.success('Hive deleted successfully');
      fetchHives();
    } catch (error) {
      toast.error('Failed to delete hive');
    }
  };

  const getHealthStatusColor = (lastDataReceived) => {
    if (!lastDataReceived) return '#94a3b8'; // Gray - no data
    
    const minutesSinceUpdate = (new Date() - new Date(lastDataReceived)) / 1000 / 60;
    
    if (minutesSinceUpdate < 5) return '#10b981'; // Green - active
    if (minutesSinceUpdate < 30) return '#f59e0b'; // Yellow - warning
    return '#ef4444'; // Red - offline
  };

  if (loading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🔧 Admin Dashboard</h1>
          <p>Manage all hive locations</p>
        </div>
        <div className="header-right">
          <span className="user-badge">👤 {user?.name}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="admin-controls">
        <button 
          className="add-hive-btn" 
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={20} />
          Add New Hive
        </button>

        <div className="view-toggle">
          <button 
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button 
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => setViewMode('map')}
          >
            Map View
          </button>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total Hives</h3>
          <div className="stat-value">{hives.length}</div>
        </div>
        <div className="stat-card">
          <h3>Active Hives</h3>
          <div className="stat-value">
            {hives.filter(h => h.status === 'active').length}
          </div>
        </div>
        <div className="stat-card">
          <h3>SMS Alerts ON</h3>
          <div className="stat-value">
            {hives.filter(h => h.smsAlertsEnabled).length}
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="hives-list">
          <table className="hives-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Hive ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Owner</th>
                <th>SMS Alerts</th>
                <th>Last Data</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hives.map(hive => (
                <tr key={hive._id}>
                  <td>
                    <div 
                      className="status-indicator"
                      style={{ background: getHealthStatusColor(hive.lastDataReceived) }}
                      title={hive.lastDataReceived ? 'Active' : 'No data yet'}
                    ></div>
                  </td>
                  <td><strong>{hive.hive_id}</strong></td>
                  <td>{hive.name}</td>
                  <td><MapPin size={14} /> {hive.location}</td>
                  <td>
                    <User size={14} /> {hive.owner?.name || 'Unassigned'}
                  </td>
                  <td>
                    <span className={`badge ${hive.smsAlertsEnabled ? 'enabled' : 'disabled'}`}>
                      {hive.smsAlertsEnabled ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td>
                    {hive.lastDataReceived 
                      ? new Date(hive.lastDataReceived).toLocaleString()
                      : 'Never'}
                  </td>
                  <td>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteHive(hive._id, hive.name)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="map-view">
          <MapContainer 
            center={[19.0760, 72.8777]} 
            zoom={10} 
            style={{ height: '500px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {hives.map(hive => (
              hive.coordinates && (
                <Marker 
                  key={hive._id}
                  position={[hive.coordinates.lat, hive.coordinates.lng]}
                >
                  <Popup>
                    <strong>{hive.name}</strong><br />
                    ID: {hive.hive_id}<br />
                    Location: {hive.location}<br />
                    Owner: {hive.owner?.name || 'Unassigned'}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      )}

      {/* Add Hive Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Hive</h2>
            <form onSubmit={handleCreateHive}>
              <div className="form-group">
                <label>Hive ID *</label>
                <input
                  type="text"
                  value={newHive.hive_id}
                  onChange={(e) => setNewHive({ ...newHive, hive_id: e.target.value.toUpperCase() })}
                  placeholder="HIVE002"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hive Name *</label>
                <input
                  type="text"
                  value={newHive.name}
                  onChange={(e) => setNewHive({ ...newHive, name: e.target.value })}
                  placeholder="Main Apiary - Hive 2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={newHive.location}
                  onChange={(e) => setNewHive({ ...newHive, location: e.target.value })}
                  placeholder="North Field, Farm A"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newHive.lat}
                    onChange={(e) => setNewHive({ ...newHive, lat: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newHive.lng}
                    onChange={(e) => setNewHive({ ...newHive, lng: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Owner User ID *</label>
                <input
                  type="text"
                  value={newHive.owner}
                  onChange={(e) => setNewHive({ ...newHive, owner: e.target.value })}
                  placeholder="User MongoDB ObjectId"
                  required
                />
                <small>Get this from the Users collection</small>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Hive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
