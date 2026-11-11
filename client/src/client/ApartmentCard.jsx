import { useState } from 'react';
import { money } from '../api.js';

const ROOM_WORD = (n) => (n === 1 ? 'кімната' : n >= 2 && n <= 4 ? 'кімнати' : 'кімнат');

export default function ApartmentCard({ apt }) {
  const photos = apt.photos?.length ? apt.photos : apt.photo ? [apt.photo] : [];
  const [index, setIndex] = useState(0);
  const street = apt.address.split(',').slice(0, -1).join(',').trim() || apt.address;
  const go = (step) => setIndex((i) => (i + step + photos.length) % photos.length);

  return (
    <article className="apt-card">
      <div className={`apt-photo${photos.length ? ' has-photo' : ''}`}>
        {photos.length > 0 && <img className="apt-img" src={photos[index]} alt={`${street}, фото ${index + 1} з ${photos.length}`} loading="lazy" />}
        <div className="apt-rooms" aria-label={`${apt.rooms} ${ROOM_WORD(apt.rooms)}`}>
          <span className="apt-rooms-num">{apt.rooms}</span>
          <span className="apt-rooms-word">{ROOM_WORD(apt.rooms)}</span>
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" className="gal-btn prev" onClick={() => go(-1)} aria-label="Попереднє фото">‹</button>
            <button type="button" className="gal-btn next" onClick={() => go(1)} aria-label="Наступне фото">›</button>
            <div className="gal-dots" aria-hidden="true">
              {photos.map((_, i) => <span key={i} className={i === index ? 'on' : ''} />)}
            </div>
          </>
        )}
        <div className="apt-price">{money(apt.price_per_day)} грн<small> за добу</small></div>
      </div>
      <div className="apt-details">
        <h3 className="apt-address">{street}</h3>
        <div className="apt-city">{apt.city}</div>
        <dl className="apt-facts">
          <div><dt>Площа</dt><dd>{apt.area} м²</dd></div>
          <div><dt>Поверх</dt><dd>{apt.floor}</dd></div>
        </dl>
        {apt.description && <p className="apt-desc">{apt.description}</p>}
      </div>
    </article>
  );
}
