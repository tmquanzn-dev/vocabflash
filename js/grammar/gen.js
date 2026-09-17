import { shuffle, sample } from '../utils.js?v=11';

/**
 * Bộ sinh câu hỏi ngữ pháp tự động: ghép chủ ngữ × động từ × dấu hiệu nhận biết rồi chia động từ đúng theo thì.
 * Mỗi lần luyện sẽ sinh ra tổ hợp mới nên gần như không lặp lại. Dùng kèm ngân hàng câu soạn tay trong bank.js.
 */

// Chủ ngữ: s = viết hoa đầu câu, l = viết thường (dùng trong câu hỏi), p = ngôi: 1s | 2 | 3s | pl
const SUBJECTS = [
  { s: 'I', l: 'I', p: '1s' }, { s: 'You', l: 'you', p: '2' }, { s: 'He', l: 'he', p: '3s' }, { s: 'She', l: 'she', p: '3s' },
  { s: 'We', l: 'we', p: 'pl' }, { s: 'They', l: 'they', p: 'pl' },
  { s: 'Tom', l: 'Tom', p: '3s' }, { s: 'Anna', l: 'Anna', p: '3s' }, { s: 'My sister', l: 'my sister', p: '3s' }, { s: 'Our teacher', l: 'our teacher', p: '3s' },
  { s: 'My boss', l: 'my boss', p: '3s' }, { s: 'The students', l: 'the students', p: 'pl' }, { s: 'My parents', l: 'my parents', p: 'pl' },
  { s: 'The children', l: 'the children', p: 'pl' }, { s: 'The boys', l: 'the boys', p: 'pl' }, { s: 'Mr. Brown', l: 'Mr. Brown', p: '3s' },
];

// Động từ: [nguyên mẫu, ngôi 3 số ít, quá khứ, phân từ 2, V-ing, tân ngữ, bất quy tắc?, kéo dài được? (dùng với for/since/all day)]
const VERBS = [
  ['work', 'works', 'worked', 'worked', 'working', 'hard', 0, 1],
  ['study', 'studies', 'studied', 'studied', 'studying', 'English', 0, 1],
  ['play', 'plays', 'played', 'played', 'playing', 'football', 0, 1],
  ['watch', 'watches', 'watched', 'watched', 'watching', 'TV', 0, 1],
  ['read', 'reads', 'read', 'read', 'reading', 'books', 1, 1],
  ['cook', 'cooks', 'cooked', 'cooked', 'cooking', 'dinner', 0, 1],
  ['clean', 'cleans', 'cleaned', 'cleaned', 'cleaning', 'the house', 0, 1],
  ['write', 'writes', 'wrote', 'written', 'writing', 'emails', 1, 1],
  ['learn', 'learns', 'learned', 'learned', 'learning', 'Japanese', 0, 1],
  ['wait', 'waits', 'waited', 'waited', 'waiting', 'for the bus', 0, 1],
  ['live', 'lives', 'lived', 'lived', 'living', 'in Hanoi', 0, 1],
  ['teach', 'teaches', 'taught', 'taught', 'teaching', 'math', 1, 1],
  ['drive', 'drives', 'drove', 'driven', 'driving', 'to work', 1, 1],
  ['run', 'runs', 'ran', 'run', 'running', 'in the park', 1, 1],
  ['swim', 'swims', 'swam', 'swum', 'swimming', 'in the lake', 1, 1],
  ['talk', 'talks', 'talked', 'talked', 'talking', 'on the phone', 0, 1],
  ['listen', 'listens', 'listened', 'listened', 'listening', 'to music', 0, 1],
  ['paint', 'paints', 'painted', 'painted', 'painting', 'the fence', 0, 1],
  ['build', 'builds', 'built', 'built', 'building', 'a house', 1, 1],
  ['exercise', 'exercises', 'exercised', 'exercised', 'exercising', 'at the gym', 0, 1],
  ['use', 'uses', 'used', 'used', 'using', 'the computer', 0, 1],
  ['eat', 'eats', 'ate', 'eaten', 'eating', 'lunch', 1, 0],
  ['drink', 'drinks', 'drank', 'drunk', 'drinking', 'coffee', 1, 0],
  ['sleep', 'sleeps', 'slept', 'slept', 'sleeping', 'on the sofa', 1, 1],
  ['sing', 'sings', 'sang', 'sung', 'singing', 'in the choir', 1, 1],
  ['make', 'makes', 'made', 'made', 'making', 'a cake', 1, 0],
  ['take', 'takes', 'took', 'taken', 'taking', 'the bus', 1, 0],
  ['go', 'goes', 'went', 'gone', 'going', 'to school', 1, 0],
  ['do', 'does', 'did', 'done', 'doing', 'homework', 1, 1],
  ['speak', 'speaks', 'spoke', 'spoken', 'speaking', 'Chinese', 1, 1],
  ['grow', 'grows', 'grew', 'grown', 'growing', 'vegetables', 1, 1],
  ['fix', 'fixes', 'fixed', 'fixed', 'fixing', 'the car', 0, 1],
  ['visit', 'visits', 'visited', 'visited', 'visiting', 'the museum', 0, 0],
  ['help', 'helps', 'helped', 'helped', 'helping', 'the neighbours', 0, 1],
  ['shop', 'shops', 'shopped', 'shopped', 'shopping', 'online', 0, 1],
  ['dance', 'dances', 'danced', 'danced', 'dancing', 'at the party', 0, 1],
  ['sell', 'sells', 'sold', 'sold', 'selling', 'flowers', 1, 1],
  ['buy', 'buys', 'bought', 'bought', 'buying', 'groceries', 1, 0],
  ['fly', 'flies', 'flew', 'flown', 'flying', 'to Tokyo', 1, 0],
  ['meet', 'meets', 'met', 'met', 'meeting', 'new people', 1, 0],
  ['think', 'thinks', 'thought', 'thought', 'thinking', 'about the problem', 1, 1],
  ['carry', 'carries', 'carried', 'carried', 'carrying', 'heavy boxes', 0, 1],
  ['practise', 'practises', 'practised', 'practised', 'practising', 'the piano', 0, 1],
  ['walk', 'walks', 'walked', 'walked', 'walking', 'to the station', 0, 1],
  ['travel', 'travels', 'traveled', 'traveled', 'traveling', 'abroad', 0, 1],
  ['begin', 'begins', 'began', 'begun', 'beginning', 'the lesson', 1, 0],
  ['forget', 'forgets', 'forgot', 'forgotten', 'forgetting', 'the keys', 1, 0],
  ['bring', 'brings', 'brought', 'brought', 'bringing', 'lunch to work', 1, 0],
  ['wear', 'wears', 'wore', 'worn', 'wearing', 'a uniform', 1, 1],
  ['win', 'wins', 'won', 'won', 'winning', 'the game', 1, 0],
];
// Động từ chỉ trạng thái: chỉ dùng ở các thì đơn / hoàn thành (không có dạng tiếp diễn)
const STATIVE = [
  ['know', 'knows', 'knew', 'known', '', 'the answer', 1, 0],
  ['like', 'likes', 'liked', 'liked', '', 'pizza', 0, 0],
  ['want', 'wants', 'wanted', 'wanted', '', 'a new phone', 0, 0],
  ['need', 'needs', 'needed', 'needed', '', 'help', 0, 0],
  ['believe', 'believes', 'believed', 'believed', '', 'the story', 0, 0],
  ['understand', 'understands', 'understood', 'understood', '', 'the lesson', 1, 0],
  ['own', 'owns', 'owned', 'owned', '', 'a car', 0, 1],
  ['love', 'loves', 'loved', 'loved', '', 'music', 0, 1],
  ['hate', 'hates', 'hated', 'hated', '', 'cold weather', 0, 1],
  ['remember', 'remembers', 'remembered', 'remembered', '', 'his name', 0, 0],
  ['prefer', 'prefers', 'preferred', 'preferred', '', 'tea', 0, 1],
  ['have', 'has', 'had', 'had', '', 'a big garden', 1, 1],
];
const CONTINUOUS = new Set(['pc', 'ppc', 'pac', 'papc', 'fc', 'fpc']);
const PERFECT = new Set(['pp', 'pap', 'fp']);
// Động từ trạng thái đi với dấu hiệu riêng ở thì đơn (không hợp với "every day", "yesterday"...)
const STATIVE_SIGNALS = { ps: ['{}.', 'Of course {}.', 'I know that {}.', 'Everyone says {}.'], pas: ['{} at that time.', '{} back then.', '{} years ago.', '{} as a child.'] };

// Mẫu câu theo thì: {} = mệnh đề (chủ ngữ + chỗ trống + tân ngữ). d: 1 = cần động từ kéo dài được
const SIGNALS = {
  ps: ['{} every day.', '{} every weekend.', '{} on Sundays.', '{} twice a week.', 'Every morning, {}.', '{} once a month.', '{} in the evening.', '{} after work every day.'],
  pc: ['{} right now.', '{} at the moment.', 'Look! {}.', 'Listen! {}.', 'Be quiet – {}.', '{} now.', 'Don\'t disturb – {} at the moment.'],
  pp: ['{} many times.', '{} several times this year.', '{} before.', '{} this week.', '{} twice today.', '{} this month.', { t: '{} for three years.', d: 1 }, { t: '{} since 2015.', d: 1 }, { t: '{} since last Monday.', d: 1 }],
  ppc: [{ t: '{} for two hours.', d: 1 }, { t: '{} since morning.', d: 1 }, { t: '{} all day.', d: 1 }, { t: '{} since 9 o\'clock.', d: 1 }, { t: '{} for a long time.', d: 1 }, { t: '{} for the past week.', d: 1 }],
  pas: ['{} yesterday.', '{} last week.', '{} two days ago.', '{} last night.', '{} in 2019.', '{} last summer.', '{} the day before yesterday.', '{} last Sunday.', '{} an hour ago.'],
  pac: ['{} at 8 o\'clock last night.', '{} at this time yesterday.', '{} when the phone rang.', '{} while it was raining.', { t: '{} all afternoon yesterday.', d: 1 }, '{} when I called.', '{} at noon yesterday.'],
  pap: ['By the time the guests arrived, {}.', 'Before the meeting started, {}.', 'By 2010, {}.', 'Before moving to Hanoi, {}.', 'By the time the bell rang, {}.', '{} before the trip.', 'By last Christmas, {}.'],
  papc: [{ t: '{} for two hours when the bus finally came.', d: 1 }, { t: '{} for hours before the storm hit.', d: 1 }, { t: '{} all night before the exam.', d: 1 }, { t: 'By the time the boss arrived, {} for three hours.', d: 1 }, { t: 'When I saw them, {} for a long time.', d: 1 }, { t: '{} since dawn when it started to rain.', d: 1 }],
  fs: ['{} tomorrow.', '{} next week.', '{} soon.', 'I think {} next year.', '{} in 2030.', '{} next summer.', 'Perhaps {} tonight.', 'I promise {} tomorrow.'],
  fc: [{ t: '{} at this time tomorrow.', d: 1 }, { t: '{} at 9 o\'clock tomorrow morning.', d: 1 }, { t: '{} all day tomorrow.', d: 1 }, { t: 'This time next week, {}.', d: 1 }, { t: 'When you arrive, {}.', d: 1 }, { t: 'Don\'t call at 7 – {} then.', d: 1 }],
  fp: ['By next year, {}.', 'By the time you get home, {}.', 'By 2030, {}.', 'By the end of this month, {}.', 'Before the deadline, {}.', 'By this time tomorrow, {}.', 'By the time the movie starts, {}.'],
  fpc: [{ t: 'By next month, {} for five years.', d: 1 }, { t: 'By the time you arrive, {} for three hours.', d: 1 }, { t: 'By 2030, {} for a decade.', d: 1 }, { t: 'By midnight, {} for 12 hours.', d: 1 }, { t: 'By the end of the year, {} for ten months.', d: 1 }],
  nf: ['{} tomorrow.', '{} next weekend.', '{} tonight.', '{} next year.', '{} after lunch.', '{} this summer.', '{} when the exams are over.'],
};

// Các thì "gần nhau" – lấy làm đáp án nhiễu trước, thiếu mới lấy thì khác
const NEIGHBORS = {
  ps: ['pc', 'pas', 'pp'], pc: ['ps', 'pac', 'pp'], pp: ['pas', 'ppc', 'pap'], ppc: ['pp', 'pac', 'papc'],
  pas: ['ps', 'pp', 'pac'], pac: ['pas', 'pc', 'papc'], pap: ['pas', 'pp', 'papc'], papc: ['pap', 'ppc', 'pac'],
  fs: ['nf', 'fc', 'ps'], fc: ['fs', 'pc', 'fp'], fp: ['fs', 'pp', 'fpc'], fpc: ['fp', 'ppc', 'fc'], nf: ['fs', 'pc', 'ps'],
};
export const ALL_TENSES = Object.keys(SIGNALS);

const bePres = p => p === '1s' ? 'am' : p === '3s' ? 'is' : 'are';
const bePast = p => (p === '1s' || p === '3s') ? 'was' : 'were';
const have = p => p === '3s' ? 'has' : 'have';
const doo = p => p === '3s' ? 'does' : 'do';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const NEG_SHORT = { 'is not': "isn't", 'are not': "aren't", 'was not': "wasn't", 'were not': "weren't", 'has not': "hasn't", 'have not': "haven't", 'had not': "hadn't", 'does not': "doesn't", 'do not': "don't", 'did not': "didn't", 'will not': "won't" };

/**
 * Chia động từ theo thì. form: aff | neg | q
 * Trả về { a: đáp án chuẩn, alts: các cách viết khác được chấp nhận, hint: gợi ý trong ngoặc }
 */
export function conjugate(tense, subj, v, form) {
  const [base, s3, past, pp, ing] = v; const p = subj.p;
  // [trợ động từ, phần còn lại] cho từng thì – khẳng định
  const parts = {
    ps: [null, p === '3s' ? s3 : base], pc: [bePres(p), ing], pp: [have(p), pp], ppc: [have(p), 'been ' + ing],
    pas: [null, past], pac: [bePast(p), ing], pap: ['had', pp], papc: ['had', 'been ' + ing],
    fs: ['will', base], fc: ['will', 'be ' + ing], fp: ['will', 'have ' + pp], fpc: ['will', 'have been ' + ing],
    nf: [bePres(p), 'going to ' + base],
  }[tense];
  let [aux, rest] = parts;
  if (form === 'aff') return { a: aux ? `${aux} ${rest}` : rest, alts: [], hint: `(${base})` };
  // Phủ định / nghi vấn của thì đơn cần do/does/did
  if (!aux) { aux = tense === 'ps' ? doo(p) : 'did'; rest = base; }
  if (form === 'neg') {
    const full = `${aux} not ${rest}`;
    const short = NEG_SHORT[`${aux} not`] ? `${NEG_SHORT[`${aux} not`]} ${rest}` : null;
    return { a: short || full, alts: short ? [full] : [], hint: `(not / ${base})` };
  }
  return { a: `${cap(aux)} ${subj.l} ${rest}`, alts: [], hint: `(${subj.l} / ${base})` };
}

// Lỗi chia sai ngôi (đáp án nhiễu "gần đúng"): đổi trợ động từ / -s
function agreementError(tense, subj, v, form) {
  const wrongP = subj.p === '3s' ? 'pl' : '3s';
  return conjugate(tense, { ...subj, p: wrongP }, v, form).a;
}

// Mẫu câu hỏi chỉ dùng được khi mệnh đề đứng đầu câu hoặc sau cụm trạng ngữ (By 2010, …) – không sau "I think", "Perhaps"...
const Q_OK = /^(|By.*|Before.*|After.*|When.*|This time.*|Every.*|At.*|Look! |Listen! )$/;
function pickSignal(tense, verb, form) {
  let list = (!verb[4] && STATIVE_SIGNALS[tense]) ? STATIVE_SIGNALS[tense] : SIGNALS[tense].filter(x => typeof x === 'string' || !x.d || verb[7]);
  if (!list.length) list = SIGNALS[tense];
  list = list.map(x => typeof x === 'string' ? x : x.t);
  if (form === 'q') { const ok = list.filter(t => Q_OK.test(t.split('{}')[0].trim() ? t.split('{}')[0] : '')); if (ok.length) list = ok; }
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Sinh một câu hỏi. lv: 1 cơ bản (khẳng định, trắc nghiệm) · 2 khó (phủ định / nghi vấn, bất quy tắc) · 3 siêu khó (tự gõ)
 * → { tense, lv, kind: 'mc' | 'fill', q, a, alts, opts, x }
 */
export function genQuestion(tense, lv) {
  // Thì tiếp diễn: không dùng động từ trạng thái; thì hoàn thành / tương lai gần: chỉ dùng trạng thái kéo dài được (own, love...)
  let pool = CONTINUOUS.has(tense) ? VERBS : (PERFECT.has(tense) || tense === 'nf') ? VERBS.concat(STATIVE.filter(v => v[7])) : VERBS.concat(STATIVE);
  // Thì nhấn mạnh thời lượng (for / since / all day) chỉ dùng động từ kéo dài được
  if (SIGNALS[tense].every(x => typeof x !== 'string' && x.d)) pool = pool.filter(v => v[7]);
  let verbs = pool;
  if (lv >= 2) { const irr = pool.filter(v => v[6]); verbs = Math.random() < .7 ? irr : pool; }
  const v = verbs[Math.floor(Math.random() * verbs.length)];
  const subj = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
  const form = lv === 1 ? (Math.random() < .8 ? 'aff' : 'neg') : ['aff', 'neg', 'q', 'neg', 'q'][Math.floor(Math.random() * 5)];
  const c = conjugate(tense, subj, v, form);
  const tpl = pickSignal(tense, v, form);
  const obj = v[5] ? ' ' + v[5] : '';
  const atStart = tpl.startsWith('{}');
  const clause = form === 'q' ? `___ ${c.hint}${obj}` : `${atStart ? subj.s : subj.l} ___ ${c.hint}${obj}`; // giữa câu → chủ ngữ viết thường
  let q = tpl.replace('{}', clause);
  if (form === 'q') q = q.replace(/\.$/, '?');
  q = cap(q);
  // Đáp án nhiễu: cùng động từ ở các thì lân cận + lỗi chia sai ngôi
  const wrong = new Set();
  const near = shuffle(NEIGHBORS[tense]).concat(shuffle(ALL_TENSES.filter(t => t !== tense && !NEIGHBORS[tense].includes(t))));
  const agree = agreementError(tense, subj, v, form);
  if (agree !== c.a && Math.random() < .6) wrong.add(agree);
  for (const t of near) { if (wrong.size >= 3) break; if (CONTINUOUS.has(t) && !v[4]) continue; const w = conjugate(t, subj, v, form).a; if (w !== c.a) wrong.add(w); }
  const kind = lv === 3 ? 'fill' : 'mc';
  return { tense, lv, kind, q, a: c.a, alts: c.alts, opts: shuffle([c.a, ...[...wrong].slice(0, 3)]), gen: true };
}

/** Sinh n câu cho một thì (không trùng câu hỏi) */
export function genMany(tense, lv, n) {
  const out = [], seen = new Set();
  for (let i = 0; i < n * 6 && out.length < n; i++) { const g = genQuestion(tense, lv); if (!seen.has(g.q)) { seen.add(g.q); out.push(g); } }
  return out;
}

export { sample };
