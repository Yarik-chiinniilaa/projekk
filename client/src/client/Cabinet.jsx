import { useAuth } from '../auth.jsx';
import ChangePassword from '../ChangePassword.jsx';

export default function Cabinet() {
  const { user, logout } = useAuth();
  const rows = [
    ['ПІБ', user.full_name],
    ['Email', user.email],
    ['Телефон', user.phone],
    ['Дата реєстрації', user.created_at],
  ];
  return (
    <>
      <div className="page-head"><h2>Кабінет</h2></div>
      <div className="form profile">
        {rows.map(([k, v]) => (
          <div className="profile-row" key={k}><span className="muted">{k}</span><b>{v}</b></div>
        ))}
        <div className="actions"><button className="btn" onClick={logout}>Вийти з кабінету</button></div>
      </div>
      <div className="page-head sub"><h2>Змінити пароль</h2></div>
      <ChangePassword />
    </>
  );
}
