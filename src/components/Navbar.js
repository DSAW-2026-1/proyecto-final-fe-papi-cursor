import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cartService, notificationService } from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated, isSeller, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && !isAdmin()) {
      loadCartCount();
      loadNotifications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const loadCartCount = async () => {
    try {
      const res = await cartService.get();
      const count = res.data.cart.items.reduce((s, i) => s + i.quantity, 0);
      setCartCount(count);
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationService.getAll();
      setNotifCount(res.data.unreadCount || 0);
      setNotifications(res.data.notifications || []);
    } catch {}
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listing?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    setOpenDropdown(null);
    navigate('/login');
  };

  const toggleDropdown = (name) => {
    setOpenDropdown(prev => {
      const opening = prev !== name;
      if (opening && name === 'notif' && isAuthenticated) {
        loadNotifications();
      }
      return opening ? name : null;
    });
  };

  const isActive = (path) => location.pathname === path;
  const notifIcons = { order: '📦', message: '💬', review: '⭐', info: 'ℹ️' };

  // ── Navbar exclusivo para administrador ──────────────────────────────────────
  // Solo muestra el logo (sin link) y el botón de cerrar sesión
  if (isAuthenticated && isAdmin()) {
    return (
      <nav className="navbar" ref={navRef}>
        <div className="nav-inner container">
          {/* Logo sin enlace — admin no puede navegar al home */}
          <div className="nav-logo" style={{ cursor: 'default', pointerEvents: 'none' }}>
            <div className="nav-logo-icon">🎓</div>
            <div className="nav-logo-text">
              Sabana Market
              <span>Panel de Administrador</span>
            </div>
          </div>

          {/* Solo el avatar con opción de cerrar sesión */}
          <div className="nav-actions">
            <div className="nav-dropdown-wrap">
              <div
                className="nav-avatar"
                onClick={() => toggleDropdown('user')}
                title={user?.name}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              {openDropdown === 'user' && (
                <div className="nav-dropdown user-dropdown">
                  <div className="user-dropdown-info">
                    <div className="user-dropdown-name">{user?.name}</div>
                    <div className="user-dropdown-email">{user?.email}</div>
                    <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 600, marginTop: 2 }}>
                      🛡️ Administrador
                    </div>
                  </div>
                  <div className="user-dropdown-divider" />
                  <button className="user-dropdown-link danger" onClick={handleLogout}>
                    🚪 Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ── Navbar normal para compradores y vendedores ───────────────────────────────
  return (
    <nav className="navbar" ref={navRef}>
      <div className="nav-inner container">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">🎓</div>
          <div className="nav-logo-text">
            Sabana Market
            <span>Universidad de La Sabana</span>
          </div>
        </Link>

        <form className="nav-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Buscar productos, libros, servicios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="nav-search-btn">🔍</button>
        </form>

        <div className="nav-links">
          <Link to="/listing" className={`nav-link${isActive('/listing') ? ' active' : ''}`}>Explorar</Link>
          <Link to="/listing?cat=libros" className="nav-link">Libros</Link>
          <Link to="/listing?cat=tutorias" className="nav-link">Tutorías</Link>
          {isAuthenticated && isSeller() && (
            <Link to="/create-product" className={`nav-link${isActive('/create-product') ? ' active' : ''}`}>Publicar</Link>
          )}
        </div>

        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <div className="nav-dropdown-wrap">
                <button
                  className="nav-icon-btn"
                  onClick={() => toggleDropdown('notif')}
                  title="Notificaciones"
                >
                  🔔
                  {notifCount > 0 && <span className="nav-badge">{notifCount}</span>}
                </button>
                {openDropdown === 'notif' && (
                  <div className="nav-dropdown">
                    <div className="dropdown-header">
                      <h4>Notificaciones</h4>
                      <Link to="/notifications" onClick={() => setOpenDropdown(null)}>Ver todas</Link>
                    </div>
                    <div className="dropdown-list">
                      {notifications.filter(n => !n.read).length === 0 ? (
                        <div className="dropdown-empty">No tienes notificaciones sin leer</div>
                      ) : (
                        notifications.filter(n => !n.read).slice(0, 6).map(n => (
                          <div key={n.id} className="dropdown-item unread">
                            <span className="dropdown-item-icon">{notifIcons[n.type] || 'ℹ️'}</span>
                            <div>
                              <div className="dropdown-item-text">{n.message || n.text}</div>
                              <div className="dropdown-item-time">{n.createdAt ? new Date(n.createdAt).toLocaleDateString('es-CO') : ''}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="nav-dropdown-wrap">
                <button
                  className="nav-icon-btn"
                  onClick={() => navigate('/cart')}
                  title="Carrito"
                >
                  🛒
                  {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
                </button>
              </div>

              {/* User */}
              <div className="nav-dropdown-wrap">
                <div
                  className="nav-avatar"
                  onClick={() => toggleDropdown('user')}
                  title={user?.name}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                {openDropdown === 'user' && (
                  <div className="nav-dropdown user-dropdown">
                    <div className="user-dropdown-info">
                      <div className="user-dropdown-name">{user?.name}</div>
                      <div className="user-dropdown-email">{user?.email}</div>
                    </div>
                    <Link to="/profile" className="user-dropdown-link" onClick={() => setOpenDropdown(null)}>👤 Mi Perfil</Link>
                    <Link to="/my-orders" className="user-dropdown-link" onClick={() => setOpenDropdown(null)}>📦 Mis Compras</Link>
                    {isSeller() && (
                      <>
                        <Link to="/my-products" className="user-dropdown-link" onClick={() => setOpenDropdown(null)}>🏪 Mis Productos</Link>
                        <Link to="/my-sales" className="user-dropdown-link" onClick={() => setOpenDropdown(null)}>💰 Mis Ventas</Link>
                      </>
                    )}
                    <Link to="/conversations" className="user-dropdown-link" onClick={() => setOpenDropdown(null)}>💬 Mensajes</Link>
                    {!isSeller() && (
                      <Link to="/become-seller" className="user-dropdown-link" onClick={() => setOpenDropdown(null)}>🚀 Vender aquí</Link>
                    )}
                    <div className="user-dropdown-divider" />
                    <button className="user-dropdown-link danger" onClick={handleLogout}>🚪 Cerrar sesión</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn btn-outline-white">Iniciar sesión</Link>
              <Link to="/register" className="nav-btn btn-gold">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
