import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, money } from '../api.js';

function cellValue(f, row) {
  const v = row[f.name];
  if (v === null || v === undefined || v === '') return '—';
  if (f.type === 'ref') return row[`${f.name}_label`] ?? v;
  if (f.type === 'choice') return f.choices.find(([val]) => val === v)?.[1] ?? v;
  if (f.type === 'float' && f.label.includes('грн')) return money(v);
  return String(v);
}

export default function EntityList({ meta, entity, base }) {
  const cfg = meta[entity];
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.list(entity).then(setRows).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [entity]);

  useEffect(() => {
    setError('');
    if (cfg) load();
  }, [entity, cfg, load]);

  if (!cfg) return <Navigate to={base} replace />;

  const fields = cfg.list.map((name) => cfg.fields.find((f) => f.name === name));
  const visible = rows;

  const remove = async (row) => {
    if (!window.confirm(`Видалити запис №${row.id}?`)) return;
    try {
      await api.remove(entity, row.id);
      setError('');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h2>{cfg.title}</h2>
      </div>

      {error && <p className="alert error">{error}</p>}
      {loading ? (
        <p className="muted">Завантаження…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>№</th>
              {cfg.photo && <th>Фото</th>}
              {fields.map((f) => <th key={f.name}>{f.label.replace(' (авто, якщо порожньо)', '')}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                {cfg.photo && (
                  <td className="thumb-cell">
                    {r.photo ? <img className="thumb" src={r.photo} alt="" loading="lazy" /> : <span className="thumb none" />}
                    {r.photo_count > 1 && <span className="thumb-count">{r.photo_count}</span>}
                  </td>
                )}
                {fields.map((f) => (
                  <td key={f.name} className={f.type === 'float' ? 'num' : ''}>
                    {f.type === 'choice' ? (
                      <span className={`badge ${r[f.name]}`}>{cellValue(f, r)}</span>
                    ) : (
                      cellValue(f, r)
                    )}
                  </td>
                ))}
                <td className="row-actions">
                  <Link className="btn" to={`${base}/${entity}/${r.id}/edit`}>Редагувати</Link>
                  <button className="btn danger" onClick={() => remove(r)}>Видалити</button>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={fields.length + (cfg.photo ? 3 : 2)} className="muted center">Записів немає</td></tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
