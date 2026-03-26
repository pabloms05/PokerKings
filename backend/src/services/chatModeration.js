const forbiddenWords = [
  // Sexual
  'sexo', 'sexual', 'vagina', 'pene', 'polla', 'pollas', 'verga', 'pija', 'coño', 'cono', 'chocho',
  'follar', 'coger', 'chupar', 'mamar', 'violar', 'violacion', 'porno', 'pornografia', 'desnudo',
  'desnuda', 'tet4', 'teta', 'tetas', 'culo', 'culito', 'semen', 'lefa', 'paja', 'pajero',

  // Insultos/ofensivo
  'hijo de puta', 'hijoputa', 'hdp', 'cabron', 'gilipollas', 'pendejo', 'boludo', 'pelotudo',
  'malparido', 'gonorrea', 'puta', 'puto', 'zorra', 'mierda', 'cagon', 'subnormal', 'idiota',
  'imbecil', 'estupido', 'estupida', 'retrasado', 'retrasada', 'asqueroso', 'asquerosa',

  // Homofobo/transfobo
  'maricon', 'marica', 'trolo', 'invertido', 'traba', 'travelo',

  // Xenofobo/racista
  'sudaca', 'panchito', 'moro', 'negrata', 'nazi', 'esclavo', 'esclava',

  // Ingles comun
  'fuck', 'fucking', 'bitch', 'whore', 'slut', 'nigger', 'faggot', 'retard',

  // Duplicados y legado
  'hijo de puta', 'hijoputa', 'hdp', 'cabron', 'gilipollas', 'pendejo', 'boludo', 'pelotudo',
  'malparido', 'gonorrea', 'puta', 'puto', 'zorra', 'polla', 'verga', 'pija', 'cono', 'coño', 'chocho',
  'follar', 'coger', 'chupar', 'mamar', 'violar', 'pajero', 'paja', 'semen', 'lefa',
  'maricon', 'marica', 'sudaca', 'panchito', 'nazi', 'mierda', 'cagon', 'subnormal'
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildWordPattern = (word) => {
  const cleaned = String(word || '').trim();
  if (!cleaned) return null;
  const escaped = escapeRegex(cleaned).replace(/\s+/g, '\\s+');
  return escaped;
};

const WORD_BOUNDARY = '[^\\p{L}\\p{N}]';

const censorshipPatterns = forbiddenWords
  .map(buildWordPattern)
  .filter(Boolean)
  .map((pattern) => new RegExp(`(^|${WORD_BOUNDARY})(${pattern})(?=$|${WORD_BOUNDARY})`, 'giu'));

export const filterChat = (text) => {
  let filteredText = String(text || '');

  for (const regex of censorshipPatterns) {
    filteredText = filteredText.replace(regex, (_, prefix, match) => {
      return `${prefix}${'*'.repeat(match.length)}`;
    });
  }

  return filteredText;
};
