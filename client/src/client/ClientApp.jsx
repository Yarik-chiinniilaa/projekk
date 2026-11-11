import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Cabinet from './Cabinet.jsx';
import Catalog from './Catalog.jsx';
import { Login, Register } from './AuthPages.jsx';

function RequireClient({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="muted">Завантаження…</p>;
  if (!user || user.role !== 'client') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function ClientApp() {
  const { user, logout } = useAuth();
  const isClient = user?.role === 'client';

  return (
    <div className="layout">
      <aside className="sidebar pills">
        <div className="brand">Оренда квартир<small>Полтава та не тільки</small></div>
        <nav>
          {isClient ? (
            <button type="button" className="pill" onClick={logout}>Вийти</button>
          ) : (
            <>
              <NavLink to="/login" className="pill">Увійти</NavLink>
              <NavLink to="/register" className="pill">Реєстрація</NavLink>
            </>
          )}
          <span className="spacer" />
          <NavLink to="/" end className="pill">Каталог</NavLink>
          <NavLink to="/cabinet" className="pill">Кабінет</NavLink>
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cabinet" element={<RequireClient><Cabinet /></RequireClient>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
