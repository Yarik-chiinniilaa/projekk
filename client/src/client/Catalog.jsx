import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ApartmentCard from './ApartmentCard.jsx';

const ROOM_CHIPS = [
  ['', 'Усі'],
  ['1', '1 кімната'],
  ['2', '2 кімнати'],
  ['3', '3 і більше'],
];

function plural(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'квартира';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'квартири';
  return 'квартир';
}

const EMPTY_FILTERS = { min_price: '', max_price: '' };

export default function Catalog() {
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState(null);
  const [text, setText] = useState('');
  const [rooms, setRooms] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.cities()
      .then((list) => {
        setCities(list);
        setCity(list.includes('Полтава') ? 'Полтава' : '');
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (city === null) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      api.catalog({ city, q: text, rooms, ...filters })
        .then((rows) => { if (!cancelled) { setItems(rows); setError(''); } })
        .catch((e) => { if (!cancelled) { setItems([]); setError(e.message); } });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [city, text, rooms, filters]);

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const activeFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <div className="topbar">
        <div className="searchbar">
          <select className="city" value={city ?? ''} onChange={(e) => setCity(e.target.value)} aria-label="Місто">
            <option value="">Усі міста</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="search"
            placeholder="Вулиця, район або опис"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`filters-btn${showFilters || activeFilters ? ' on' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          Фільтри
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <label><span>Ціна від, грн/добу</span>
            <input type="number" min="0" value={filters.min_price} onChange={(e) => setFilter('min_price', e.target.value)} />
          </label>
          <label><span>Ціна до, грн/добу</span>
            <input type="number" min="0" value={filters.max_price} onChange={(e) => setFilter('max_price', e.target.value)} />
          </label>
          <button type="button" className="btn" onClick={() => setFilters(EMPTY_FILTERS)}>Скинути</button>
        </div>
      )}

      <div className="chips">
        {ROOM_CHIPS.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            className={`chip${rooms === value ? ' active' : ''}`}
            onClick={() => setRooms(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="catalog-head">
        <h2>Оренда квартир{city ? ` ${city}` : ''}</h2>
        {items && <div className="muted">{items.length} {plural(items.length)}</div>}
      </div>

      {error && <p className="alert error">{error}</p>}
      {!items ? (
        <p className="muted">Завантаження…</p>
      ) : (
        <div className="cards-grid">
          {items.map((a) => <ApartmentCard key={a.id} apt={a} />)}
          {!items.length && <p className="empty">За цими умовами квартир немає. Змініть місто, кількість кімнат або діапазон цін.</p>}
        </div>
      )}
    </>
  );
}
