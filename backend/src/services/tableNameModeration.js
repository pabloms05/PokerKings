const BLOCKED_WORDS = [
  'sexo',
  'sexual',
  'vagina',
  'pornografia',
  'porno',
  'violacion',
  'desnudo',
  'desnuda',
  'hijo de puta',
  'hijoputa',
  'hdp',
  'puta',
  'puto',
  'zorra',
  'mierda',
  'cabrón',
  'cabron',
  'pendejo',
  'pendeja',
  'boludo',
  'pelotudo',
  'malparido',
  'gonorrea',
  'culero',
  'verga',
  'polla',
  'pollas',
  'pene',
  'pija',
  'joder',
  'follar',
  'coger',
  'chupar',
  'mamar',
  'violar',
  'pajero',
  'paja',
  'semen',
  'lefa',
  'idiota',
  'imbecil',
  'estupido',
  'estupida',
  'retrasado',
  'retrasada',
  'asqueroso',
  'asquerosa',
  'maricon',
  'marica',
  'trolo',
  'traba',
  'travelo',
  'sudaca',
  'panchito',
  'moro',
  'negrata',
  'nazi',
  'esclavo',
  'esclava',
  'cagon',
  'subnormal',
  'fuck',
  'fucking',
  'bitch',
  'whore',
  'slut',
  'nigger',
  'faggot',
  'retard',
  'gilipollas',
  'coño',
  'cono',
  'chocho'
];

const BLOCKED_COMPACT_TERMS = [
  'hijodeputa',
  'putamadre',
  'valeverga',
  'chingatumadre'
];

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[@4]/g, 'a')
  .replace(/[3]/g, 'e')
  .replace(/[1!|]/g, 'i')
  .replace(/[0]/g, 'o')
  .replace(/[5$]/g, 's')
  .replace(/[7]/g, 't')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compactText = (value) => normalizeText(value).replace(/\s+/g, '');

const containsBlockedWord = (normalizedText) => {
  const words = normalizedText.split(' ').filter(Boolean);
  return BLOCKED_WORDS.find((blockedWord) => words.includes(normalizeText(blockedWord)));
};

const containsBlockedCompactTerm = (text) => {
  const compact = compactText(text);
  return BLOCKED_COMPACT_TERMS.find((term) => compact.includes(normalizeText(term)));
};

export const validateTableNameModeration = (tableName) => {
  const rawTrimmed = String(tableName || '').trim();
  const normalized = normalizeText(tableName);

  if (!rawTrimmed) {
    return { isValid: false, code: 'TABLE_NAME_EMPTY', message: 'El nombre de la mesa es obligatorio.' };
  }

  if (rawTrimmed.length < 3) {
    return { isValid: false, code: 'TABLE_NAME_TOO_SHORT', message: 'El nombre de la mesa debe tener al menos 3 caracteres.' };
  }

  if (rawTrimmed.length > 50) {
    return { isValid: false, code: 'TABLE_NAME_TOO_LONG', message: 'El nombre de la mesa no puede superar 50 caracteres.' };
  }

  const blockedWord = containsBlockedWord(normalized);
  const blockedCompact = containsBlockedCompactTerm(normalized);

  if (blockedWord || blockedCompact) {
    return {
      isValid: false,
      code: 'TABLE_NAME_PROFANITY',
      message: 'El nombre de la mesa contiene lenguaje no permitido.'
    };
  }

  return { isValid: true };
};

export const sanitizeTableName = (tableName) => String(tableName || '').trim().replace(/\s+/g, ' ');
