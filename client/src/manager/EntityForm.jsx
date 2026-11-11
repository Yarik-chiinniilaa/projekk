import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { prepare } from './photos.js';

const INPUT_TYPES = { int: 'number', float: 'number', date: 'date', email: 'email' };

export default function EntityForm({ meta, entity, base }) {
  const { id } = useParams();
  const cfg = meta[entity];
  const navigate = useNavigate();
  const [values, setValues] = useState({});
  const [options, setOptions] = useState({});
  const [error, setError] = useState(useLocation().state?.error || '');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [queue, setQueue] = useState([]);
  const [busyPhoto, setBusyPhoto] = useState(false);

  useEffect(() => {
    if (cfg?.photo && id) api.photos(id).then(setPhotos).catch((e) => setError(e.message));
  }, [cfg, id]);

  useEffect(() => () => queue.forEach((q) => URL.revokeObjectURL(q.preview)), []);

  const addFiles = (fileList) => {
    setError('');
    const picked = Array.from(fileList).map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setQueue((q) => [...q, ...picked]);
  };

  const dropQueued = (key) =>
    setQueue((q) => {
      const item = q.find((x) => x.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return q.filter((x) => x.key !== key);
    });

  const photoAction = async (fn) => {
    setBusyPhoto(true);
    setError('');
    try {
      setPhotos(await fn());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyPhoto(false);
    }
  };

  const uploadQueue = async (apartmentId) => {
    const failed = [];
    for (const item of queue) {
      try {
        await api.uploadPhoto(apartmentId, await prepare(item.file));
      } catch (e) {
        failed.push(e.message);
      }
    }
    return failed;
  };

  useEffect(() => {
    if (!cfg) return;
    setError('');
    cfg.fields
      .filter((f) => f.type === 'ref')
      .forEach((f) =>
        api.options(f.ref).then((o) => setOptions((prev) => ({ ...prev, [f.name]: o }))).catch((e) => setError(e.message)),
      );
    if (id) {
      api.get(entity, id).then(setValues).catch((e) => setError(e.message));
    } else {
      const defaults = {};
      cfg.fields.forEach((f) => {
        if (f.type === 'choice') defaults[f.name] = f.choices[0][0];
      });
      setValues(defaults);
    }
  }, [entity, id, cfg]);

  if (!cfg) return <Navigate to={base} replace />;

  const set = (name, v) => setValues((prev) => ({ ...prev, [name]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = id ? await api.update(entity, id, values) : await api.create(entity, values);
      if (cfg.photo && queue.length) {
        const failed = await uploadQueue(saved.id);
        if (failed.length) {
          navigate(`${base}/${entity}/${saved.id}/edit`, {
            replace: true,
            state: { error: `Дані збережено, але деякі фото не завантажились: ${failed.join('; ')}` },
          });
          return;
        }
      }
      navigate(`${base}/${entity}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h2>{id ? `Редагування: ${cfg.single} №${id}` : `Новий запис: ${cfg.single}`}</h2>
      </div>
      <form className="form" onSubmit={submit}>
        {cfg.fields.map((f) => (
          <label key={f.name}>
            <span>{f.label}{f.required && ' *'}</span>
            {f.type === 'ref' ? (
              <select value={values[f.name] ?? ''} required={f.required} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">— оберіть —</option>
                {(options[f.name] || []).map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'choice' ? (
              <select value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)}>
                {f.choices.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea rows={3} value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
            ) : (
              <input
                type={INPUT_TYPES[f.type] || 'text'}
                step={f.type === 'float' ? '0.01' : undefined}
                min={f.min}
                required={f.required}
                value={values[f.name] ?? ''}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
          </label>
        ))}
        {cfg.photo && (
          <div className="photo-field">
            <span>Фото квартири</span>
            {(photos.length > 0 || queue.length > 0) && (
              <ul className="photo-grid">
                {photos.map((p, i) => (
                  <li key={p.id} className="photo-item">
                    <img src={p.url} alt={`Фото ${i + 1}`} loading="lazy" />
                    {i === 0 && <span className="photo-tag">Головне</span>}
                    <div className="photo-actions">
                      {i > 0 && (
                        <button type="button" className="btn" disabled={busyPhoto} onClick={() => photoAction(() => api.makeCover(p.id))}>Зробити головним</button>
                      )}
                      <button type="button" className="btn danger" disabled={busyPhoto}
                        onClick={() => window.confirm('Видалити це фото?') && photoAction(() => api.deletePhoto(p.id))}>Видалити</button>
                    </div>
                  </li>
                ))}
                {queue.map((q) => (
                  <li key={q.key} className="photo-item new">
                    <img src={q.preview} alt={q.file.name} />
                    <span className="photo-tag new">Буде додано</span>
                    <div className="photo-actions">
                      <button type="button" className="btn" onClick={() => dropQueued(q.key)}>Прибрати</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
            />
            <span className="muted small">
              Можна вибрати одразу кілька фото (JPG, PNG або WebP, до 12 на квартиру). Перше фото — головне, воно показується в каталозі першим.
              {!id && ' Фото завантажаться після збереження.'}
            </span>
          </div>
        )}
        {error && <p className="alert error">{error}</p>}
        <div className="actions">
          <button className="btn primary" disabled={saving}>{saving ? 'Збереження…' : 'Зберегти'}</button>
          <Link className="btn" to={`${base}/${entity}`}>Скасувати</Link>
        </div>
      </form>
    </>
  );
}
