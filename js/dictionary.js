import { fetchTimeout } from './utils.js';

/* Tra từ điển online để lấy phiên âm IPA, loại từ, ví dụ, audio.
   Nguồn 1: dictionaryapi.dev (IPA chuẩn + audio người thật, nhưng hay chậm/lỗi)
   Nguồn 2: Datamuse (nhanh, ổn định; phiên âm ARPABET → tự chuyển sang IPA) */

async function lookupDictApi(word) {
  const r = await fetchTimeout('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), 6000);
  if (!r.ok) throw new Error(r.status === 404 ? 'notfound' : 'unavailable');
  const e = (await r.json())[0];
  const phs = e.phonetics || [];
  const withAudio = phs.find(p => p.audio && /us\.mp3/i.test(p.audio)) || phs.find(p => p.audio);
  const meaning = e.meanings?.[0];
  const def = meaning?.definitions?.[0];
  const exDef = meaning?.definitions?.find(d => d.example);
  return {
    phonetic: e.phonetic || phs.find(p => p.text)?.text || withAudio?.text || '',
    audio: withAudio?.audio || '',
    pos: meaning?.partOfSpeech || '',
    definition: def?.definition || '',
    example: exDef?.example || '',
  };
}

const ARPA = {
  AA: 'ɑː', AE: 'æ', AH: 'ʌ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ', EH: 'e', ER: 'ɜːr', EY: 'eɪ', IH: 'ɪ', IY: 'iː', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'uː',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

export function arpabetToIpa(str) {
  const out = [];
  let onsetStart = 0; // vị trí bắt đầu cụm phụ âm đứng trước nguyên âm hiện tại (để chèn dấu nhấn)
  str.trim().split(/\s+/).forEach(ph => {
    const m = ph.match(/^([A-Z]+)(\d)?$/); if (!m) return;
    const [, base, stress] = m;
    const isVowel = stress !== undefined;
    let ipa = ARPA[base] || base.toLowerCase();
    if (isVowel) {
      if (base === 'AH' && stress === '0') ipa = 'ə';
      if (base === 'ER' && stress === '0') ipa = 'ər';
      if (stress === '1') out.splice(onsetStart, 0, 'ˈ');
      else if (stress === '2') out.splice(onsetStart, 0, 'ˌ');
      out.push(ipa);
      onsetStart = out.length;
    } else out.push(ipa);
  });
  return '/' + out.join('') + '/';
}

async function lookupDatamuse(word) {
  const r = await fetchTimeout('https://api.datamuse.com/words?sp=' + encodeURIComponent(word) + '&md=rdp&max=1', 8000);
  if (!r.ok) throw new Error('unavailable');
  const e = (await r.json())[0];
  if (!e || e.word.toLowerCase() !== word) throw new Error('notfound');
  const pron = (e.tags || []).find(t => t.startsWith('pron:'));
  const posMap = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', pron: 'pronoun', conj: 'conjunction', interj: 'interjection' };
  const posTag = (e.tags || []).find(t => posMap[t]);
  const def = (e.defs || [])[0];
  return {
    phonetic: pron ? arpabetToIpa(pron.slice(5)) : '',
    audio: '',
    pos: posTag ? posMap[posTag] : '',
    definition: def ? def.split('\t')[1] || '' : '',
    example: '',
  };
}

export async function lookupWord(text) {
  const w = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!w) throw new Error('Chưa nhập từ');
  if (w.includes(' ')) return lookupPhrase(w);
  return lookupSingle(w);
}

// Cụm từ: tra từng từ rồi ghép phiên âm, vd "i like beach" → /aɪ laɪk biːtʃ/
async function lookupPhrase(phrase) {
  const parts = phrase.split(' ').map(p => p.replace(/[^a-z'-]/g, '')).filter(Boolean);
  if (!parts.length) throw new Error('Cụm từ không hợp lệ');
  const results = await Promise.all(parts.map(p => lookupSingle(p).catch(() => null)));
  if (!results.some(r => r?.phonetic)) throw new Error('Không tra được phiên âm cho cụm từ này');
  const ipa = results.map((r, i) => {
    if (!r?.phonetic) return parts[i];
    let p = r.phonetic.replace(/^\/|\/$/g, '').split(',')[0].trim();
    // Từ một âm tiết thì bỏ dấu nhấn đầu (/ˈlaɪk/ → laɪk) cho phiên âm cụm từ tự nhiên hơn
    const syllables = (p.match(/[aeiouæɑɒɔəɛɜɪʊʌ]+/g) || []).length;
    if (syllables <= 1) p = p.replace(/^[ˈˌ]/, '');
    return p;
  });
  return { phonetic: '/' + ipa.join(' ') + '/', audio: '', pos: 'phrase', definition: '', example: '' };
}

async function lookupSingle(w) {
  // Gọi song song cả 2 nguồn: ưu tiên nguồn 1 (có audio), lỗi/chậm thì lấy nguồn 2
  const p1 = lookupDictApi(w), p2 = lookupDatamuse(w);
  p2.catch(() => {});
  let e1;
  try { return await p1; } catch (e) { e1 = e; }
  try { return await p2; }
  catch (e2) {
    if (e1.message === 'notfound' || e2.message === 'notfound') throw new Error('Không tìm thấy từ này trong từ điển');
    throw new Error('Không kết nối được từ điển (kiểm tra internet hoặc thử lại sau)');
  }
}
