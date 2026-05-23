import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { validators, validateForm } from '../utils/validators';
import './Profile.css';

// Estrellitas estáticas para mostrar rating
const Stars = ({ rating }) => {
  const full = Math.round(rating || 0);
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= full ? '#C9A84C' : '#ddd', fontSize: 18 }}>★</span>
      ))}
    </span>
  );
};

const Profile = () => {
  const { user, logout, isSeller, leaveSeller, updateLocalUser } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('info');

  // ── Formulario editar perfil ──────────────────────────────────────────────
  const [editForm, setEditForm]     = useState({ name: '', career: '', photo: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // ── Calificación del vendedor (si aplica) ─────────────────────────────────
  const [sellerRating, setSellerRating] = useState(null);
  const [ratingLoaded, setRatingLoaded] = useState(false);

  // ── Cambiar contraseña ────────────────────────────────────────────────────
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors]   = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // ── Dejar de ser vendedor ─────────────────────────────────────────────────
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveMsg, setLeaveMsg]         = useState('');

  // Inicializar formulario de edición con datos actuales
  useEffect(() => {
    if (user) {
      setEditForm({
        name:   user.name   || '',
        career: user.career || '',
        photo:  user.photo  || '',
      });
    }
  }, [user]);

  // Cargar rating del vendedor al abrir la pestaña de info
  useEffect(() => {
    if (tab === 'info' && isSeller() && !ratingLoaded) {
      authService.getProfile()
        .then(res => {
          setSellerRating(res.data.user?.sellerRating ?? null);
          setRatingLoaded(true);
        })
        .catch(() => setRatingLoaded(true));
    }
  }, [tab, isSeller, ratingLoaded]);

  // ── Handlers editar perfil ────────────────────────────────────────────────
  const setEdit = (field) => (e) => {
    setEditForm(f => ({ ...f, [field]: e.target.value }));
    if (editErrors[field]) setEditErrors(p => ({ ...p, [field]: null }));
    setEditSuccess(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const rules = {
      name: [v => validators.required(v, 'Nombre')],
    };
    const { isValid, errors } = validateForm(editForm, rules);
    if (!isValid) { setEditErrors(errors); return; }

    setEditLoading(true);
    try {
      const res = await authService.updateProfile({
        name:   editForm.name.trim(),
        career: editForm.career.trim() || null,
        photo:  editForm.photo.trim()  || null,
      });
      // Actualizar el contexto de autenticación con los nuevos datos
      if (res.data.user) updateLocalUser(res.data.user);
      setEditSuccess(true);
    } catch (err) {
      setEditErrors({ name: err.response?.data?.error || 'Error al actualizar el perfil.' });
    }
    setEditLoading(false);
  };

  // ── Handlers contraseña ───────────────────────────────────────────────────
  const setPw = (field) => (e) => {
    setPwForm(f => ({ ...f, [field]: e.target.value }));
    if (pwErrors[field]) setPwErrors(p => ({ ...p, [field]: null }));
    setPwSuccess(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const rules = {
      current: [v => validators.required(v, 'Contraseña actual')],
      next:    [v => validators.required(v, 'Nueva contraseña'), v => validators.minLength(v, 6, 'Nueva contraseña')],
      confirm: [v => validators.match(v, pwForm.next, 'Las contraseñas')],
    };
    const { isValid, errors } = validateForm(pwForm, rules);
    if (!isValid) { setPwErrors(errors); return; }

    setPwLoading(true);
    try {
      await authService.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSuccess(true);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwErrors({ current: err.response?.data?.error || 'Error al cambiar contraseña' });
    }
    setPwLoading(false);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleLeaveSeller = async () => {
    if (!window.confirm('¿Seguro que quieres dejar de ser vendedor? Perderás acceso a publicar productos.')) return;
    setLeaveLoading(true);
    const result = await leaveSeller();
    if (result.success) {
      setLeaveMsg('✅ Has dejado de ser vendedor. Cerrando sesión para aplicar los cambios...');
      setTimeout(() => { logout(); navigate('/login'); }, 4000);
    } else {
      setLeaveMsg(result.error || 'No se pudo quitar el rol de vendedor');
    }
    setLeaveLoading(false);
  };

  const roleLabel = () => {
    if (user?.role === 'admin' || user?.roles?.includes('admin')) return 'Administrador';
    if (isSeller()) return 'Vendedor';
    return 'Comprador';
  };

  const roleIcon = () => {
    if (user?.role === 'admin' || user?.roles?.includes('admin')) return '🛡️';
    if (isSeller()) return '🏪';
    return '🎓';
  };

  return (
    <div className="profile-page">
      <div className="container profile-wrap">
        {/* Sidebar */}
        <div className="profile-sidebar">
          <div className="profile-avatar-wrap">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                className="profile-avatar"
                style={{ objectFit: 'cover', borderRadius: '50%' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="profile-avatar">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-role-badge">{roleIcon()} {roleLabel()}</div>
          </div>
          <h2 className="profile-name">{user?.name}</h2>
          <p className="profile-email">{user?.email}</p>
          {user?.career && (
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>{user.career}</p>
          )}

          {/* Rating del vendedor en el sidebar */}
          {isSeller() && ratingLoaded && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              {sellerRating !== null ? (
                <div>
                  <Stars rating={sellerRating} />
                  <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 600 }}>
                    {sellerRating.toFixed(1)} / 5
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Calificación como vendedor</div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sin calificación pública aún</div>
              )}
            </div>
          )}

          <nav className="profile-nav">
            <button className={`profile-nav-item ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
              👤 Mi información
            </button>
            <button className={`profile-nav-item ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
              ✏️ Editar perfil
            </button>
            <button className={`profile-nav-item ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
              🔒 Cambiar contraseña
            </button>
            {!isSeller() && (
              <button className="profile-nav-item" onClick={() => navigate('/become-seller')}>
                🏪 Ser vendedor
              </button>
            )}
            {isSeller() && (
              <>
                <button className="profile-nav-item" onClick={() => navigate('/my-products')}>📦 Mis productos</button>
                <button className="profile-nav-item" onClick={() => navigate('/my-sales')}>💰 Mis ventas</button>
              </>
            )}
            <button className="profile-nav-item" onClick={() => navigate('/my-orders')}>🛍️ Mis compras</button>
            <button className="profile-nav-item" onClick={() => navigate('/conversations')}>💬 Mensajes</button>
            <button className="profile-nav-item danger" onClick={handleLogout}>🚪 Cerrar sesión</button>
          </nav>
        </div>

        {/* Content */}
        <div className="profile-content">

          {/* ── TAB: Mi información ─────────────────────────────────────────── */}
          {tab === 'info' && (
            <div className="profile-card">
              <h2 className="profile-card-title">Mi información</h2>
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <label>Nombre completo</label>
                  <div className="profile-info-value">{user?.name}</div>
                </div>
                <div className="profile-info-item">
                  <label>Correo institucional</label>
                  <div className="profile-info-value">{user?.email}</div>
                </div>
                {user?.career && (
                  <div className="profile-info-item">
                    <label>Carrera</label>
                    <div className="profile-info-value">{user.career}</div>
                  </div>
                )}
                <div className="profile-info-item">
                  <label>Rol en el marketplace</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="profile-info-value">{roleIcon()} {roleLabel()}</div>
                    {isSeller() && !leaveMsg && (
                      <button
                        onClick={handleLeaveSeller}
                        disabled={leaveLoading}
                        style={{ background: 'none', border: '1px solid #c0392b', color: '#c0392b', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        {leaveLoading ? 'Procesando...' : '🚪 Dejar de ser vendedor'}
                      </button>
                    )}
                  </div>
                  {leaveMsg && (
                    <div className="alert alert-success" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      {leaveMsg}
                    </div>
                  )}
                </div>

                {/* Rating del vendedor en la tarjeta de info (TRD §4.5) */}
                {isSeller() && ratingLoaded && (
                  <div className="profile-info-item">
                    <label>Calificación como vendedor</label>
                    {sellerRating !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Stars rating={sellerRating} />
                        <span style={{ fontWeight: 700, color: '#C9A84C', fontSize: 16 }}>
                          {sellerRating.toFixed(1)}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>/ 5</span>
                      </div>
                    ) : (
                      <div className="profile-info-value" style={{ color: 'var(--muted)', fontSize: 13 }}>
                        Sin calificación pública aún (se requieren ≥20 reseñas)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="profile-quick-links">
                <h3>Accesos rápidos</h3>
                <div className="profile-quick-grid">
                  <div className="profile-quick-card" onClick={() => navigate('/my-orders')}>
                    <span className="pq-icon">🛍️</span>
                    <span>Mis compras</span>
                  </div>
                  <div className="profile-quick-card" onClick={() => navigate('/conversations')}>
                    <span className="pq-icon">💬</span>
                    <span>Mensajes</span>
                  </div>
                  {isSeller() && (
                    <>
                      <div className="profile-quick-card" onClick={() => navigate('/my-products')}>
                        <span className="pq-icon">📦</span>
                        <span>Mis productos</span>
                      </div>
                      <div className="profile-quick-card" onClick={() => navigate('/my-sales')}>
                        <span className="pq-icon">💰</span>
                        <span>Mis ventas</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Editar perfil ──────────────────────────────────────────── */}
          {tab === 'edit' && (
            <div className="profile-card">
              <h2 className="profile-card-title">Editar perfil</h2>
              {editSuccess && (
                <div className="alert alert-success">✅ Perfil actualizado correctamente.</div>
              )}
              <form onSubmit={handleUpdateProfile} noValidate>
                <div className="form-group">
                  <label className="form-label">Nombre completo</label>
                  <input
                    type="text"
                    className={`input ${editErrors.name ? 'error' : ''}`}
                    value={editForm.name}
                    onChange={setEdit('name')}
                    placeholder="Tu nombre completo"
                    maxLength={100}
                  />
                  {editErrors.name && <span className="form-error">{editErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Carrera <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span></label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.career}
                    onChange={setEdit('career')}
                    placeholder="Ej: Ingeniería Industrial, Derecho..."
                    maxLength={150}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Foto de perfil <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(URL — opcional)</span></label>
                  <input
                    type="url"
                    className={`input ${editErrors.photo ? 'error' : ''}`}
                    value={editForm.photo}
                    onChange={setEdit('photo')}
                    placeholder="https://..."
                  />
                  {editErrors.photo && <span className="form-error">{editErrors.photo}</span>}
                  {editForm.photo && /^https?:\/\/.+/.test(editForm.photo) && (
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={editForm.photo}
                        alt="preview"
                        style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </form>
            </div>
          )}

          {/* ── TAB: Cambiar contraseña ─────────────────────────────────────── */}
          {tab === 'password' && (
            <div className="profile-card">
              <h2 className="profile-card-title">Cambiar contraseña</h2>
              {pwSuccess && <div className="alert alert-success">✅ Contraseña actualizada correctamente.</div>}
              <form onSubmit={handleChangePassword} noValidate>
                <div className="form-group">
                  <label className="form-label">Contraseña actual</label>
                  <input type="password" className={`input ${pwErrors.current ? 'error' : ''}`} value={pwForm.current} onChange={setPw('current')} placeholder="Tu contraseña actual" />
                  {pwErrors.current && <span className="form-error">{pwErrors.current}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input type="password" className={`input ${pwErrors.next ? 'error' : ''}`} value={pwForm.next} onChange={setPw('next')} placeholder="Mínimo 6 caracteres" />
                  {pwErrors.next && <span className="form-error">{pwErrors.next}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar nueva contraseña</label>
                  <input type="password" className={`input ${pwErrors.confirm ? 'error' : ''}`} value={pwForm.confirm} onChange={setPw('confirm')} placeholder="Repite la nueva contraseña" />
                  {pwErrors.confirm && <span className="form-error">{pwErrors.confirm}</span>}
                </div>
                <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                  {pwLoading ? 'Actualizando...' : '🔒 Actualizar contraseña'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
