export const ENTITIES = {
  apartments: {
    title: 'Квартири',
    single: 'квартиру',
    table: 'apartments',
    label: 'address',
    photo: true,
    list: ['address', 'rooms', 'area', 'floor', 'price_per_day', 'status', 'created_at'],
    fields: [
      { name: 'address', label: 'Адреса', type: 'text', required: true },
      { name: 'rooms', label: 'Кімнат', type: 'int', required: true, min: 1 },
      { name: 'area', label: 'Площа, м²', type: 'float', required: true, min: 0.01 },
      { name: 'floor', label: 'Поверх', type: 'int', required: true, min: 0 },
      { name: 'price_per_day', label: 'Ціна, грн/добу', type: 'float', required: true, min: 0.01 },
      {
        name: 'status',
        label: 'Статус',
        type: 'choice',
        required: true,
        choices: [
          ['available', 'доступна'],
          ['maintenance', 'на ремонті'],
        ],
      },
      { name: 'description', label: 'Опис', type: 'textarea' },
      { name: 'created_at', label: 'Дата додавання (авто, якщо порожньо)', type: 'date' },
    ],
  },
};

export function publicMeta() {
  const out = {};
  for (const [key, e] of Object.entries(ENTITIES)) {
    out[key] = { title: e.title, single: e.single, photo: Boolean(e.photo), list: e.list, fields: e.fields };
  }
  return out;
}

export function coerce(field, raw) {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  if (field.type === 'int') {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) throw new Error(`Поле «${field.label}» має бути цілим числом`);
    return n;
  }
  if (field.type === 'float') {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error(`Поле «${field.label}» має бути числом`);
    return n;
  }
  if (field.type === 'ref') {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) throw new Error(`Поле «${field.label}» має бути обране зі списку`);
    return n;
  }
  return String(raw).trim();
}

export function parseBody(entity, body) {
  const row = {};
  for (const field of entity.fields) {
    const value = coerce(field, body?.[field.name]);
    if ((value === null || value === '') && field.required) {
      throw new Error(`Заповніть поле «${field.label}»`);
    }
    if (field.min !== undefined && value !== null && value < field.min) {
      throw new Error(`Поле «${field.label}» не може бути меншим за ${field.min}`);
    }
    row[field.name] = value;
  }
  return row;
}

export function constraintMessage(err) {
  const msg = String(err.message || '');
  if (msg.includes('apartments.address')) return 'Квартира з такою адресою вже існує';
  if (msg.includes('CHECK')) return 'Дані не відповідають правилам бази (перевірте числа та статус)';
  if (msg.includes('NOT NULL')) return 'Не заповнено обов’язкове поле';
  if (msg.includes('UNIQUE')) return 'Такий запис уже існує';
  return 'Порушення обмежень бази даних';
}
