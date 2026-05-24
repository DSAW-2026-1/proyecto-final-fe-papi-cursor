import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const AuthFeature = ({ icon, title, desc }) => (
  <div className="auth-feature">
    <span>{icon}</span>
    <div>
      <strong>{title}</strong>
      <p>{desc}</p>
    </div>
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // Mostrar mensaje de suspensión si viene redirigido desde el interceptor
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const suspended = params.get('suspended');
    if (suspended) setError(decodeURIComponent(suspended));
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@unisabana.edu.co')) {
      setError('Solo se permiten correos @unisabana.edu.co');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      const roles = result.user?.roles || [];
      const destination = roles.includes('admin') ? '/admin' : from;
      navigate(destination, { replace: true });
    } else {
      // Mensaje especial si la cuenta está suspendida
      if (result.suspended) {
        setError(result.error);
      } else {
        setError(result.error || 'Correo o contraseña incorrectos');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
          <h2>Sabana Market</h2>
          <p>La comunidad de compra y venta exclusiva para estudiantes de la Universidad de La Sabana</p>
        </div>
        <div className="auth-features">
          <AuthFeature icon="📚" title="Libros y materiales" desc="Encuentra todo lo que necesitas para tu semestre" />
          <AuthFeature icon="🎓" title="Tutorías especializadas" desc="Aprende de otros estudiantes en tu carrera" />
          <AuthFeature icon="🔒" title="100% seguro" desc="Solo estudiantes verificados con correo institucional" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs-row">
            <span className="auth-tab active">Iniciar sesión</span>
            <Link to="/register" className="auth-tab">Registrarse</Link>
          </div>

          <div className="auth-form-header">
            <h3>Bienvenido de nuevo</h3>
            <p>Ingresa con tu correo institucional</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo institucional</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="tu.nombre@unisabana.edu.co"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div className="pw-wrap">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading ? 'Verificando...' : 'Iniciar sesión →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: 'var(--blue-mid)', fontWeight: 600 }}>Regístrate aquí</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
