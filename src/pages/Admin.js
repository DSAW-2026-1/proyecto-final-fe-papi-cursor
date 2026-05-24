import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/api';

// ── Panel de administración ───────────────────────────────────────────────────

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('users');

  useEffect(() => {
    const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';
    if (!isAdmin) navigate('/');
  }, [user, navigate]);

  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';
  if (!isAdmin) return null;

  return (
    <div>
      <h1>Panel de Administración</h1>
      <nav>
        <button onClick={() => setTab('users')}>Usuarios</button>{' '}
        <button onClick={() => setTab('products')}>Productos</button>{' '}
        <button onClick={() => setTab('reports')}>Reportes</button>
      </nav>
      <hr />
      {tab === 'users'    && <UsersPanel />}
      {tab === 'products' && <ProductsPanel />}
      {tab === 'reports'  && <ReportsPanel />}
    </div>
  );
};

// ── Usuarios ──────────────────────────────────────────────────────────────────
const UsersPanel = () => {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [days, setDays]     = useState({});
  const [msg, setMsg]       = useState('');

  const load = (q = '') => {
    adminService.getUsers(q)
      .then(res => setUsers(res.data.users || []))
      .catch(() => setMsg('Error al cargar usuarios'));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  const handleSuspend = async (userId) => {
    const d = parseInt(days[userId]);
    if (!d || d < 1) return alert('Ingresa un número de días válido');
    try {
      await adminService.suspendUser(userId, d);
      setMsg(`Usuario suspendido por ${d} día(s).`);
      load(search);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al suspender');
    }
  };

  const handleRehabilitate = async (userId) => {
    try {
      await adminService.updateUserStatus(userId, { status: 'active' });
      setMsg('Usuario rehabilitado.');
      load(search);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al rehabilitar');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Eliminar este usuario permanentemente?')) return;
    try {
      await adminService.deleteUser(userId);
      setMsg('Usuario eliminado.');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div>
      <h2>Usuarios</h2>
      {msg && <p><strong>{msg}</strong></p>}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            <strong>{u.name}</strong> — {u.email} — roles: {(u.roles || []).join(', ')} — estado: {u.status || 'active'}
            {u.suspendedUntil && <span> (suspendido hasta {new Date(u.suspendedUntil).toLocaleDateString('es-CO')})</span>}
            <br />
            {!u.roles?.includes('admin') && (
              <>
                {u.status === 'suspended'
                  ? <button onClick={() => handleRehabilitate(u.id)}>Rehabilitar</button>
                  : (
                    <>
                      <input
                        type="number"
                        min="1"
                        placeholder="Días"
                        value={days[u.id] || ''}
                        onChange={e => setDays(prev => ({ ...prev, [u.id]: e.target.value }))}
                        style={{ width: 60 }}
                      />
                      <button onClick={() => handleSuspend(u.id)}>Suspender</button>
                    </>
                  )
                }
                {' '}
                <button onClick={() => handleDelete(u.id)}>Eliminar</button>
              </>
            )}
          </li>
        ))}
        {users.length === 0 && <li>Sin resultados.</li>}
      </ul>
    </div>
  );
};

// ── Productos ─────────────────────────────────────────────────────────────────
const ProductsPanel = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch]     = useState('');
  const [msg, setMsg]           = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const load = (q = '') => {
    adminService.getProducts(q)
      .then(res => setProducts(res.data.products || []))
      .catch(() => setMsg('Error al cargar productos'));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(search);
  };

  // Separar productos activos de eliminados
  const activeProducts  = products.filter(p => p.isActive);
  const deletedProducts = products.filter(p => !p.isActive);

  const handleDelete = async (productId) => {
    if (!window.confirm('¿Eliminar este producto? Podrás restaurarlo después desde la sección de eliminados.')) return;
    try {
      const res = await adminService.deleteProduct(productId);
      setMsg('Producto eliminado.');
      // Mover a eliminados en el estado local
      const updated = res.data.product;
      setProducts(prev => prev.map(p => p.id === productId ? (updated || { ...p, isActive: false }) : p));
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleRestore = async (productId) => {
    try {
      const res = await adminService.restoreProduct(productId);
      setMsg('Producto restaurado.');
      // Mover a activos en el estado local
      const updated = res.data.product;
      setProducts(prev => prev.map(p => p.id === productId ? (updated || { ...p, isActive: true }) : p));
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al restaurar');
    }
  };

  const handleHide = async (productId) => {
    try {
      const res = await adminService.hideProduct(productId);
      setMsg(res.data.message);
      const updated = res.data.product;
      if (updated) {
        setProducts(prev => prev.map(p => p.id === productId ? updated : p));
      } else {
        setProducts(prev => prev.map(p =>
          p.id === productId ? { ...p, hidden: !p.hidden } : p
        ));
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al ocultar/mostrar');
    }
  };

  return (
    <div>
      <h2>Productos</h2>
      {msg && <p><strong>{msg}</strong></p>}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {/* ── Productos activos ── */}
      <h3>Activos ({activeProducts.length})</h3>
      <ul>
        {activeProducts.map(p => (
          <li key={p.id}>
            <strong>{p.name}</strong> — ${p.price} — stock: {p.stock}
            {' '}— {p.hidden ? '🙈 OCULTO' : '👁️ visible'}
            <br />
            <button onClick={() => handleDelete(p.id)}>Eliminar</button>
            {' '}
            <button onClick={() => handleHide(p.id)}>
              {p.hidden ? 'Mostrar' : 'Ocultar'}
            </button>
          </li>
        ))}
        {activeProducts.length === 0 && <li>Sin productos activos.</li>}
      </ul>

      {/* ── Productos eliminados ── */}
      <h3
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setShowDeleted(v => !v)}
      >
        🗑️ Eliminados ({deletedProducts.length}) {showDeleted ? '▲' : '▼'}
      </h3>
      {showDeleted && (
        <ul>
          {deletedProducts.map(p => (
            <li key={p.id} style={{ color: '#888' }}>
              <strong>{p.name}</strong> — ${p.price} — stock: {p.stock}
              {' '}— ❌ eliminado
              <br />
              <button onClick={() => handleRestore(p.id)}>♻️ Restaurar</button>
            </li>
          ))}
          {deletedProducts.length === 0 && <li>Sin productos eliminados.</li>}
        </ul>
      )}
    </div>
  );
};

// ── Reportes ──────────────────────────────────────────────────────────────────
const ReportsPanel = () => {
  const [reports, setReports] = useState([]);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    adminService.getReports()
      .then(res => setReports(res.data.reports || []))
      .catch(() => setMsg('Error al cargar reportes'));
  }, []);

  const handleResolve = async (reportId) => {
    try {
      await adminService.resolveReport(reportId);
      setMsg('Reporte resuelto.');
      setReports(prev => prev.map(r =>
        r.id === reportId ? { ...r, status: 'resolved' } : r
      ));
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al resolver');
    }
  };

  return (
    <div>
      <h2>Reportes</h2>
      {msg && <p><strong>{msg}</strong></p>}
      <ul>
        {reports.map(r => (
          <li key={r.id}>
            <strong>{r.targetType === 'product' ? 'Producto' : 'Usuario'}</strong>
            {' '}— Motivo: {r.reason} — Estado: {r.status}
            {' '}— Fecha: {new Date(r.createdAt).toLocaleDateString('es-CO')}
            <br />
            {r.status !== 'resolved' && (
              <button onClick={() => handleResolve(r.id)}>Resolver</button>
            )}
          </li>
        ))}
        {reports.length === 0 && <li>Sin reportes.</li>}
      </ul>
    </div>
  );
};

export default Admin;
