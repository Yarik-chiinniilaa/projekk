import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api } from '../api.js';
import ChangePassword from '../ChangePassword.jsx';
import { useAuth } from '../auth.jsx';
import EntityForm from './EntityForm.jsx';
import EntityList from './EntityList.jsx';
import ManagerLogin from './ManagerLogin.jsx';

function Panel() {
  const { user, logout } = useAuth();
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="alert error">Не вдалося завантажити дані: {error}</p>;
  if (!meta) return <p className="muted center">Завантаження…</p>;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Оренда квартир<small>Кабінет менеджера</small></h1>
        <nav>
          <NavLink to="/manager/apartments" end>Квартири</NavLink>
          <NavLink to="/manager/apartments/new">Додати квартиру</NavLink>
          <NavLink to="/manager/password">Змінити пароль</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{user.full_name}</div>
          <button type="button" className="btn" onClick={logout}>Вийти</button>
          <Link to="/" className="small">← На сайт для клієнтів</Link>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="apartments" element={<EntityList meta={meta} entity="apartments" base="/manager" />} />
          <Route path="apartments/new" element={<EntityForm meta={meta} entity="apartments" base="/manager" />} />
          <Route path="apartments/:id/edit" element={<EntityForm meta={meta} entity="apartments" base="/manager" />} />
          <Route path="password" element={<><div className="page-head"><h2>Змінити пароль</h2></div><ChangePassword /></>} />
          <Route path="*" element={<Navigate to="/manager/apartments" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function ManagerApp() {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted center">Завантаження…</p>;
  return (
    <Routes>
      <Route path="login" element={<ManagerLogin />} />
      <Route path="*" element={user?.role === 'manager' ? <Panel /> : <Navigate to="/manager/login" replace />} />
    </Routes>
  );
}
