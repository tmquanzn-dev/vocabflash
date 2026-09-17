import { $ } from './utils.js?v=10';
import { Auth } from './auth.js?v=10';
import { Store } from './store.js?v=10';
import { TTS } from './tts.js?v=10';
import { setNavActive, renderSidebar, closeSidebar } from './shell.js?v=10';
import { viewLanding } from './views/landing.js?v=10';
import { viewAuth } from './views/auth.js?v=10';
import { viewHome } from './views/home.js?v=10';
import { viewTopic } from './views/topic.js?v=10';
import { viewFlash } from './views/flashcards.js?v=10';
import { viewReview } from './views/review.js?v=10';
import { viewQuiz } from './views/quiz.js?v=10';
import { viewSearch } from './views/search.js?v=10';
import { viewSettings } from './views/settings.js?v=10';
import { viewProfile } from './views/profile.js?v=10';
import { viewMatch } from './views/match.js?v=10';
import { viewLeaderboard } from './views/leaderboard.js?v=10';
import { viewAudio } from './views/audio.js?v=10';
import { viewGrammar } from './views/grammar.js?v=10';
import { viewExplore } from './views/explore.js?v=10';
import { viewAI } from './views/ai.js?v=10';
import { viewSpell } from './views/spell.js?v=10';
import { viewInbox } from './views/inbox.js?v=10';
import { viewAdd } from './views/add.js?v=10';

/* Điều hướng theo hash: #/topic/<id>, #/quiz/<id>, ... */
const PUBLIC_ROUTES = { landing: viewLanding, login: viewAuth, register: viewAuth };
const APP_ROUTES = { home: viewHome, topic: viewTopic, flash: viewFlash, quiz: viewQuiz, match: viewMatch, audio: viewAudio, leaderboard: viewLeaderboard, review: viewReview, search: viewSearch, settings: viewSettings, profile: viewProfile, grammar: viewGrammar, explore: viewExplore, ai: viewAI, spell: viewSpell, inbox: viewInbox, add: viewAdd };

let cleanup = null;
/** View đăng ký hàm dọn dẹp (gỡ phím tắt...) khi rời khỏi view */
export function onLeave(fn) { cleanup = fn; }
export function go(path) { location.hash = '#' + (path.startsWith('/') ? path : '/' + path); }

export function parseHash() {
  const [path, query = ''] = (location.hash || '#/').replace(/^#\/?/, '').split('?');
  const parts = path.split('/');
  return { view: parts[0] || 'home', id: parts[1], parts, query: new URLSearchParams(query) };
}

export function render() {
  if (cleanup) { cleanup(); cleanup = null; }
  TTS.stop();
  const { view, id, parts, query } = parseHash();
  const loggedIn = !!Auth.user && !!Store.data;

  if (!loggedIn) {
    const fn = PUBLIC_ROUTES[view] || viewLanding;
    if (!PUBLIC_ROUTES[view] && view !== 'home') { sessionStorage.setItem('vocabflash.redirect', location.hash); }
    showPublic(true);
    fn($('#public'), { view, id });
    return;
  }
  if (PUBLIC_ROUTES[view]) {
    // Khách vẫn được vào trang đăng nhập / đăng ký để nâng cấp tài khoản
    if (Auth.user.guest && view !== 'landing') { showPublic(true); PUBLIC_ROUTES[view]($('#public'), { view, id }); return; }
    go('/'); return;
  }

  showPublic(false);
  setNavActive(view);
  renderSidebar(['topic', 'flash', 'quiz', 'match', 'audio', 'spell'].includes(view) ? id : null);
  closeSidebar();
  window.scrollTo(0, 0);
  const fn = APP_ROUTES[view] || viewHome;
  // Tạo lại #view để các listener của màn hình trước không còn dính lại
  const old = $('#view'); const fresh = old.cloneNode(false); old.replaceWith(fresh);
  fn(fresh, { view, id, parts, query });
}

function showPublic(isPublic) {
  $('#public').hidden = !isPublic;
  $('#app').hidden = isPublic;
  document.body.classList.toggle('public', isPublic);
}
