import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validators, validateForm, sanitize } from '../utils/validators';
import './Auth.css';

const CAREERS = [
  'Administración de Empresas', 'Comunicación Social', 'Derecho', 'Diseño Gráfico',
  'Enfermería', 'Ingeniería de Sistemas', 'Ingeniería Industrial', 'Lenguas Modernas',
  'Medicina', 'Psicología', 'Química Farmacéutica',
];

const AuthFeature = ({ icon, title, desc }) => (
  <div className="auth-feature">
    <span>{icon}</span>
    <div>
      <strong>{title}</strong>
      <p>{desc}</p>
    </div>
  </div>
);

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', career: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validación con validators.js (sanitizando inputs primero)
    const rules = {
      name:     [v => validators.required(v, 'Nombre'), v => validators.minLength(v, 3, 'Nombre')],
      email:    [v => validators.required(v, 'Correo'), v => validators.unisabanaEmail(v)],
      career:   [v => validators.required(v, 'Carrera')],
      password: [v => validators.required(v, 'Contraseña'), v => validators.minLength(v, 6, 'Contraseña')],
      confirm:  [v => validators.match(v, form.password, 'Las contraseñas')],
    };
    const { isValid, errors: fieldErrors } = validateForm(form, rules);

    if (!isValid) { setErrors(fieldErrors); return; }
    if (!terms) { setErrors({ terms: 'Debes aceptar el reglamento para continuar' }); return; }

    setLoading(true);
    const result = await register(sanitize(form.name), form.email.trim(), form.password);
    if (result.success) {
      navigate('/');
    } else {
      setErrors({ email: result.error || 'Error al crear la cuenta' });
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
            <Link to="/login" className="auth-tab">Iniciar sesión</Link>
            <span className="auth-tab active">Registrarse</span>
          </div>

          <div className="auth-form-header">
            <h3>Crear cuenta</h3>
            <p>Únete a la comunidad Sabana Market</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input type="text" className={`input ${errors.name ? 'error' : ''}`} placeholder="Tu nombre completo" value={form.name} onChange={set('name')} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Correo institucional</label>
              <input type="email" className={`input ${errors.email ? 'error' : ''}`} placeholder="tu.nombre@unisabana.edu.co" value={form.email} onChange={set('email')} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Carrera</label>
              <select className={`input ${errors.career ? 'error' : ''}`} value={form.career} onChange={set('career')}>
                <option value="">Selecciona tu carrera</option>
                {CAREERS.map(c => <option key={c}>{c}</option>)}
              </select>
              {errors.career && <span className="form-error">{errors.career}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`input ${errors.password ? 'error' : ''}`}
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={set('password')}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña</label>
              <div className="pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`input ${errors.confirm ? 'error' : ''}`}
                  placeholder="Repite tu contraseña"
                  value={form.confirm}
                  onChange={set('confirm')}
                />
              </div>
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                <input type="checkbox" checked={terms} onChange={e => { setTerms(e.target.checked); if (errors.terms) setErrors(p => ({ ...p, terms: null })); }} style={{ marginTop: 2, accentColor: 'var(--blue-dark)' }} />
                Acepto el reglamento de Sabana Market y las políticas institucionales
              </label>
              {errors.terms && <span className="form-error">{errors.terms}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--blue-mid)', fontWeight: 600 }}>Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
