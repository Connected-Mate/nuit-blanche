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
