/* Nuit Blanche — le peu de script du site. Tout fonctionne sans :
   l'interrupteur de démonstration, la vérification du téléchargement
   et la capsule qui s'efface ne sont que des améliorations. */

(function () {
  'use strict';

  var english = /^en/i.test(document.documentElement.lang || 'fr');
  var REPO = 'Connected-Mate/nuit-blanche';
  var COPY = english ? {
    soon: 'Coming soon',
    soonShort: 'Coming soon',
    soonNote: 'The first version is on its way — follow the releases page.'
  } : {
    soon: 'Bientôt disponible',
    soonShort: 'Bientôt',
    soonNote: 'La première version arrive très vite : suis la page des versions.'
  };

  /* — le choix de langue prime sur la détection automatique — */

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('[data-lang]') : null;
    if (!link) return;
    try { localStorage.setItem('nuitblanche-lang', link.getAttribute('data-lang')); } catch (err) {}
  });

  /* — l'interrupteur de la maquette — */

  var stage = document.getElementById('demo');
  var power = stage && stage.querySelector('[data-power]');
  if (power) {
    var state = stage.querySelector('.power__state');
    var pill = stage.querySelector('.app-head__pill');
    power.disabled = false;
    power.addEventListener('click', function () {
      var on = power.getAttribute('aria-checked') !== 'true';
      power.setAttribute('aria-checked', String(on));
      stage.classList.toggle('is-off', !on);
      state.textContent = state.getAttribute(on ? 'data-state-on' : 'data-state-off');
      if (pill) pill.textContent = pill.getAttribute(on ? 'data-pill-on' : 'data-pill-off');
    });
  }

  /* — le bouton de téléchargement ne doit jamais mener à une page d'erreur — */

  var links = document.querySelectorAll('[data-download]');

  function comingSoon() {
    Array.prototype.forEach.call(links, function (a) {
      a.href = 'https://github.com/' + REPO + '/releases';
      var label = a.querySelector('[data-download-label]');
      var short = a.querySelector('[data-download-short]');
      if (label) label.textContent = COPY.soon;
      if (short) short.textContent = COPY.soonShort;
    });
    var note = document.querySelector('[data-download-note]');
    if (note) { note.textContent = COPY.soonNote; note.hidden = false; }
  }

  function useAsset(url) {
    Array.prototype.forEach.call(links, function (a) { a.href = url; });
  }

  function apply(result) {
    if (result === 'none') comingSoon();
    else if (result && result.indexOf('https://github.com/') === 0) useAsset(result);
  }

  var cached = null;
  try { cached = sessionStorage.getItem('nuitblanche-release'); } catch (e) {}

  if (cached) {
    apply(cached);
  } else if (links.length && window.fetch) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 5000) : 0;
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (res.status === 404) return 'none';
      if (!res.ok) return null;          /* limite d'appels, panne : on garde le lien direct */
      return res.json().then(function (rel) {
        var dmg = (rel.assets || []).filter(function (x) { return /\.dmg$/i.test(x.name); })[0];
        return dmg ? dmg.browser_download_url : 'none';
      });
    }).then(function (result) {
      clearTimeout(timer);
      if (!result) return;
      apply(result);
      try { sessionStorage.setItem('nuitblanche-release', result); } catch (e) {}
    }).catch(function () { clearTimeout(timer); });
  }

  /* — mouvement : seulement à l'écran, et jamais si la personne l'a réduit — */

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasIO = 'IntersectionObserver' in window;

  /* scènes animées : elles ne tournent que visibles (batterie et processeur épargnés) */
  var lives = document.querySelectorAll('.stage, .vig');
  if (hasIO && lives.length) {
    var liveIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-live', en.isIntersecting); });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(lives, function (n) { liveIO.observe(n); });
  }

  /* apparitions au défilement : posées uniquement sous la ligne de flottaison,
     pour ne jamais faire clignoter ce qui est déjà à l'écran */
  if (hasIO && !still.matches) {
    var groups = [
      '.section > .kicker', '.section > .h2', '.section > .intro',
      '.feats > .feat', '.jobs > div', '.jobs__list > li', '.faq > div', '.wt', '.end'
    ];
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        revealIO.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    var fold = window.innerHeight * 0.92;
    groups.forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el, i) {
        if (el.getBoundingClientRect().top < fold) return;
        el.classList.add('reveal');
        el.style.setProperty('--rd', (Math.min(i, 5) * 0.07).toFixed(2) + 's');
        revealIO.observe(el);
      });
    });
  }

  /* — installation pas à pas — */

  var wt = document.querySelector('.wt');
  if (wt) {
    var stepBtns = wt.querySelectorAll('[data-go]');
    var total = stepBtns.length;
    var DUR = 6200;
    var current = 1;
    var timer = 0;
    var inView = false;
    var auto = !still.matches;

    wt.style.setProperty('--wt-dur', DUR + 'ms');
    wt.classList.toggle('is-auto', auto);

    var play = function () {
      wt.classList.remove('is-playing');
      void wt.offsetWidth;                       /* relance les animations de la scène */
      if (inView && !document.hidden) wt.classList.add('is-playing');
      clearTimeout(timer);
      if (auto && inView && !document.hidden) {
        timer = setTimeout(function () { go(current % total + 1); }, DUR + 700);
      }
    };

    var go = function (n) {
      current = n;
      wt.setAttribute('data-step', String(n));
      Array.prototype.forEach.call(stepBtns, function (b) {
        if (Number(b.getAttribute('data-go')) === n) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
      play();
    };

    Array.prototype.forEach.call(stepBtns, function (b) {
      b.addEventListener('click', function () {
        auto = false;                            /* la personne prend la main : on ne l'interrompt plus */
        wt.classList.remove('is-auto');
        go(Number(b.getAttribute('data-go')));
      });
    });

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) play();
        else { clearTimeout(timer); wt.classList.remove('is-playing'); }
      }, { threshold: 0.35 }).observe(wt);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearTimeout(timer); wt.classList.remove('is-playing'); }
      else if (inView) play();
    });
    still.addEventListener && still.addEventListener('change', function () {
      auto = !still.matches && wt.classList.contains('is-auto');
      play();
    });

    go(1);
  }

  /* — la capsule s'efface quand un grand bouton est déjà à l'écran — */

  var capsule = document.querySelector('.capsule');
  var anchors = document.querySelectorAll('.cta, .end');
  if (capsule && anchors.length && 'IntersectionObserver' in window) {
    var seen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target);
      });
      var hide = seen.size > 0;
      capsule.classList.toggle('is-hidden', hide);
      if (hide && capsule.contains(document.activeElement)) document.activeElement.blur();
      capsule.inert = hide;
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(anchors, function (n) { io.observe(n); });
  }
})();
