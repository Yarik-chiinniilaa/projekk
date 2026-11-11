import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function ManagerLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'manager') return <Navigate to="/manager/apartments" replace />;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ ...form, area: 'manager' });
      navigate('/manager/apartments', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="form" onSubmit={submit}>
        <h2>Вхід для менеджерів</h2>
        <label><span>Email</span>
          <input type="email" required autoComplete="username" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label><span>Пароль</span>
          <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
        </label>
        {error && <p className="alert error">{error}</p>}
        <div className="actions">
          <button className="btn primary" disabled={busy}>{busy ? 'Вхід…' : 'Увійти'}</button>
          <Link className="btn" to="/">На сайт</Link>
        </div>
      </form>
    </div>
  );
}
