import { useState } from 'react';
import { api } from './api.js';

export default function ChangePassword() {
  const empty = { current: '', next: '', repeat: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => { setDone(false); setForm((p) => ({ ...p, [k]: v })); };
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (form.next !== form.repeat) return setError('Нові паролі не збігаються');
    setBusy(true);
    try {
      await api.changePassword({ current: form.current, next: form.next });
      setForm(empty);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <label><span>Поточний пароль</span>
        <input type="password" required autoComplete="current-password" value={form.current} onChange={(e) => set('current', e.target.value)} />
      </label>
      <label><span>Новий пароль (мінімум 8 символів)</span>
        <input type="password" required minLength={8} autoComplete="new-password" value={form.next} onChange={(e) => set('next', e.target.value)} />
      </label>
      <label><span>Повторіть новий пароль</span>
        <input type="password" required minLength={8} autoComplete="new-password" value={form.repeat} onChange={(e) => set('repeat', e.target.value)} />
      </label>
      {error && <p className="alert error">{error}</p>}
      {done && <p className="alert ok">Пароль змінено.</p>}
      <div className="actions"><button className="btn primary" disabled={busy}>{busy ? 'Збереження…' : 'Змінити пароль'}</button></div>
    </form>
  );
}
