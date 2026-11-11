import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'client') return <Navigate to={from} replace />;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ ...form, area: 'client' });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head"><h2>Вхід</h2></div>
      <form className="form" onSubmit={submit}>
        <label><span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label><span>Пароль</span>
          <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
        </label>
        {error && <p className="alert error">{error}</p>}
        <div className="actions">
          <button className="btn primary" disabled={busy}>{busy ? 'Вхід…' : 'Увійти'}</button>
          <Link className="btn" to="/register" state={{ from }}>Створити обліковий запис</Link>
        </div>
      </form>
      <p className="muted small">Ви менеджер? <Link to="/manager/login">Вхід для менеджерів</Link></p>
    </>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', repeat: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'client') return <Navigate to={from} replace />;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.repeat) return setError('Паролі не збігаються');
    setBusy(true);
    try {
      const { repeat, ...body } = form;
      await register(body);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head"><h2>Реєстрація</h2></div>
      <form className="form" onSubmit={submit}>
        <label><span>ПІБ *</span>
          <input required autoComplete="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
        </label>
        <label><span>Email *</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label><span>Телефон *</span>
          <input type="tel" required autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        <label><span>Пароль * (мінімум 8 символів)</span>
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
        </label>
        <label><span>Повторіть пароль *</span>
          <input type="password" required minLength={8} autoComplete="new-password" value={form.repeat} onChange={(e) => set('repeat', e.target.value)} />
        </label>
        {error && <p className="alert error">{error}</p>}
        <div className="actions">
          <button className="btn primary" disabled={busy}>{busy ? 'Збереження…' : 'Зареєструватися'}</button>
          <Link className="btn" to="/login" state={{ from }}>Вже є обліковий запис</Link>
        </div>
      </form>
    </>
  );
}
