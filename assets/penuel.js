/* PENUELVISION build 20261103e */
/* ============================================================
   PENUELVISION STUDIOS — shared behaviour
   Header · nav dropdown · hero video · portfolio · photo gallery ·
   lightbox · contact form · footer year.

   Playback note (YouTube error 153)
   ---------------------------------
   Error 153 means the player could not determine the referring
   domain — it appears when a page is opened from file:// or when
   the Referer header is stripped. Fixes applied here:
     • the embed carries an explicit `origin` parameter
     • the iframe sends a referrer via referrerpolicy
     • serve over http(s), not by double-clicking the file
   ============================================================ */

(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ============================================================
     YOUTUBE HELPERS
     ========================================================== */

  function siteOrigin() {
    if (!location.origin || location.origin === 'null') {
      return location.protocol === 'file:' ? '' : location.protocol + '//' + location.host;
    }
    return location.origin;
  }

  function buildEmbedUrl(id, autoplay) {
    var params = [
      'rel=0',
      'modestbranding=1',
      'playsinline=1',
      'enablejsapi=0',
      'autoplay=' + (autoplay ? '1' : '0')
    ];

    var origin = siteOrigin();
    if (origin) { params.push('origin=' + encodeURIComponent(origin)); }

    return 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?' + params.join('&');
  }

  /* Thumbnails are served by YouTube's CDN with no cache-busting hook of
     their own: the URL for a given video never changes, so a browser that
     has already seen the old cover keeps showing it — sometimes for days —
     even after the owner uploads a new one. Append the build number so a
     redeploy forces a fresh fetch; bump it whenever a cover changes.

     The version lives in one place so index.html, the portfolio grid and
     the showreel all stay in step.

     The parameter must NOT be called v: i.ytimg.com reads ?v= as an
     alternate video id and answers with a 120x90 placeholder instead of
     the real cover. ?cb= is ignored by the CDN and only serves to give
     the browser a new cache key. */
  var THUMB_VERSION = '20261103h';

  /* YouTube serves the same frame at several sizes. maxresdefault is
     1280x720 and 180-380 KB; a grid tile is 350-413 CSS pixels wide, so
     even at DPR 3 a 640px frame is enough. Pulling maxres for every card
     cost roughly 18 MB per full scroll for no visible gain.

       grid -> sddefault     640x480  ~25 KB
       big  -> maxresdefault 1280x720  showreel and the home-page block

     sddefault is not published for every upload, so the markup falls
     back to hqdefault, which always exists. */
  function thumbUrl(id, big) {
    return 'https://i.ytimg.com/vi/' + id + '/' +
      (big ? 'maxresdefault' : 'sddefault') + '.jpg?cb=' + THUMB_VERSION;
  }

  /* Exposed so the statically written <img> tags on the home page can use
     the same version without hard-coding it in the markup. */
  window.PV_THUMB_VERSION = THUMB_VERSION;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ============================================================
     HEADER
     ========================================================== */

  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) { return; }

    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.pageYOffset > 40);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* Keep --header-h equal to the real header height. The header is
       fixed, so the content below it reserves that space via the
       variable. Hard-coding it per breakpoint drifts as soon as the
       header content changes — which is exactly what happened when the
       "Start a Project" button was removed and 17 px of dead space
       appeared under the bar. */
    syncHeaderHeight();

    if (window.ResizeObserver) {
      new ResizeObserver(syncHeaderHeight).observe(header);
    } else {
      window.addEventListener('resize', syncHeaderHeight);
    }

    window.addEventListener('orientationchange', function () {
      window.setTimeout(syncHeaderHeight, 120);
    });
  }

  function syncHeaderHeight() {
    var header = document.querySelector('.site-header');
    if (!header) { return; }

    var h = Math.round(header.getBoundingClientRect().height);
    if (h > 0) {
      document.documentElement.style.setProperty('--header-h', h + 'px');
    }
  }

  function markActiveNav() {
    var file = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.header-nav a');

    var matched = [];
    var i;

    for (i = 0; i < links.length; i++) {
      if ((links[i].getAttribute('href') || '') !== file) { continue; }
      links[i].classList.add('is-active');
      links[i].setAttribute('aria-current', 'page');
      matched.push(links[i]);
    }

    if (!matched.length) { return; }

    function rendered(node) {
      return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    }

    /* Is any match a link that is actually on screen and sits outside the
       dropdown? On phones that is the "Photos" entry: the dropdown is
       hidden there and replaced by that link. */
    var visibleTop = null;
    for (i = 0; i < matched.length; i++) {
      if (!rendered(matched[i])) { continue; }
      if (matched[i].closest('.nav-sub')) { continue; }
      visibleTop = matched[i];
      break;
    }

    /* Collect the Portfolio parent items that the matches belong to. */
    var parents = [];
    for (i = 0; i < matched.length; i++) {
      var p = matched[i].closest('.nav-item');
      if (p && parents.indexOf(p) === -1) { parents.push(p); }
    }

    /* The parent highlight exists because on desktop the photo page is
       reached through the dropdown, so "Portfolio" should read as the
       current section. Applying it on phones too left two items
       underlined at once — the parent and "Photos". When a visible
       top-level link already stands for the page, the parent drops out. */
    for (i = 0; i < parents.length; i++) {
      var parentLink = parents[i].querySelector('a');
      if (!parentLink) { continue; }

      var parentIsMatch = matched.indexOf(parentLink) !== -1;

      if (visibleTop && !parentIsMatch) {
        parentLink.classList.remove('is-active');
        parentLink.removeAttribute('aria-current');
      } else {
        parentLink.classList.add('is-active');
      }
    }
  }

  /* Layout can change which of those two links is on screen, so the state
     is recomputed when the window is resized or the phone is turned. */
  function watchActiveNav() {
    var timer = null;
    function redo() {
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(markActiveNav, 120);
    }
    window.addEventListener('resize', redo);
    window.addEventListener('orientationchange', redo);
  }

  /**
   * Touch devices have no hover, so the dropdown needs a tap target
   * separate from the link itself.
   */
  function initNavDropdown() {
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
      var items = document.querySelectorAll('.nav-item');

      for (var i = 0; i < items.length; i++) {
        (function (item) {
          var link = item.querySelector('a');
          var caret = item.querySelector('.nav-caret');

          if (!caret) { return; }

          caret.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            item.classList.toggle('is-open');
          });
        })(items[i]);
      }
    }

    /* Close the mobile drawer dropdown on outside tap. */
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.nav-item')) { return; }

      var open = document.querySelectorAll('.nav-item.is-open');
      for (var j = 0; j < open.length; j++) { open[j].classList.remove('is-open'); }
    });
  }

  /* ============================================================
     HERO VIDEO
     ========================================================== */

  function initHeroVideo() {
    var video = document.getElementById('hero-video');
    if (!video) { return; }

    /* WCAG 2.2.2 and 2.3.3: a visitor who asked the system for less motion
       gets the still poster instead of a looping background film. Nothing
       disappears — the poster is already in the markup. The setting can be
       switched while the page is open, so it is watched, not just read. */
    var motionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    function reducedMotion() {
      return !!(motionQuery && motionQuery.matches);
    }

    function stopForReducedMotion() {
      if (!reducedMotion()) { return false; }
      try {
        video.pause();
        video.removeAttribute('autoplay');
      } catch (e) { /* nothing to undo */ }
      video.classList.add('is-ready');
      return true;
    }

    if (motionQuery) {
      var onPref = function () { if (reducedMotion()) { stopForReducedMotion(); } };
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', onPref);
      } else if (motionQuery.addListener) {
        motionQuery.addListener(onPref);
      }
    }

    function reveal() { video.classList.add('is-ready'); }

    /* Safari sometimes resolves readyState before 'canplay', and a
       cached file can already be playable on load. */
    if (video.readyState >= 2) { reveal(); }

    video.addEventListener('canplay', reveal);
    video.addEventListener('playing', reveal);

    video.addEventListener('error', function () {
      video.style.display = 'none';
    });

    /* Some mobile browsers pause background video when the page is
       backgrounded. Resume on return. */
    document.addEventListener('visibilitychange', function () {
      if (reducedMotion()) { return; }
      if (document.visibilityState === 'visible' && video.paused) {
        var p = video.play();
        if (p && p.catch) { p.catch(function () {}); }
      }
    });

    if (stopForReducedMotion()) { return; }

    var attempt = video.play();
    if (attempt && attempt.catch) {
      /* Autoplay refused — the poster simply stays. */
      attempt.catch(function () {});
    }
  }

  /* ============================================================
     VIDEO MODAL
     ========================================================== */

  var lastFocused = null;

  function openVideo(id, title, desc) {
    var modal = document.getElementById('video-modal');
    if (!modal || !id) { return; }

    var frame = modal.querySelector('.video-modal-frame');
    var capTitle = modal.querySelector('.modal-title');
    var capDesc = modal.querySelector('.modal-desc');

    lastFocused = document.activeElement;

    frame.innerHTML = '';

    var iframe = document.createElement('iframe');
    iframe.setAttribute('src', buildEmbedUrl(id, true));
    iframe.setAttribute('title', title || 'Video player');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('frameborder', '0');

    frame.appendChild(iframe);

    if (capTitle) { capTitle.textContent = title || ''; }
    if (capDesc) { capDesc.textContent = desc || ''; }

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    var closeBtn = modal.querySelector('.video-modal-close');
    if (closeBtn) { closeBtn.focus(); }
  }

  function closeVideo() {
    var modal = document.getElementById('video-modal');
    if (!modal || !modal.classList.contains('is-open')) { return; }

    var frame = modal.querySelector('.video-modal-frame');
    if (frame) { frame.innerHTML = ''; }

    modal.classList.remove('is-open');
    document.body.style.overflow = '';

    if (lastFocused && lastFocused.focus) { lastFocused.focus(); }
  }

  /* Video cards written into the HTML by hand (the Featured Work block on
     the home page) used to be plain links to portfolio.html: the play icon
     promised a video and delivered a page navigation. These cards now open
     the same modal the portfolio uses. The href is kept as a fallback so
     the card still goes somewhere sensible with JavaScript disabled.
     Cards inside #work-grid are skipped — that grid wires its own handler. */
  function initStaticVideoCards() {
    document.addEventListener('click', function (e) {
      var thumb = e.target.closest ? e.target.closest('.work-thumb[data-video]') : null;
      if (!thumb) { return; }
      if (thumb.closest('#work-grid')) { return; }

      var id = thumb.getAttribute('data-video');
      if (!id) { return; }

      e.preventDefault();
      openVideo(id, thumb.getAttribute('data-title'), thumb.getAttribute('data-desc'));
    });
  }

  function initVideoModal() {
    document.addEventListener('click', function (e) {
      var closer = e.target.closest ? e.target.closest('.video-modal-close') : null;
      if (closer) { e.preventDefault(); closeVideo(); return; }

      var modal = document.getElementById('video-modal');
      if (modal && e.target === modal) { closeVideo(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) { closeVideo(); }
    });
  }

  /* ============================================================
     SHOWREEL
     ========================================================== */

  function initShowreel() {
    var wrap = document.querySelector('[data-showreel-wrap]');
    if (!wrap) { return; }

    /* The home page renders an empty cover and a dead play button when
       this object is missing — silent breakage. Say so instead. */
    if (typeof window.PV_SHOWREEL === 'undefined') {
      if (window.console && console.warn) {
        console.warn('PENUELVISION: window.PV_SHOWREEL is missing from ' +
                     'videos.js — the home-page showreel cannot render.');
      }
      return;
    }

    var reel = window.PV_SHOWREEL;

    var poster = wrap.querySelector('.showreel-frame');
    var cover = wrap.querySelector('.showreel-cover');
    var captionTitle = wrap.querySelector('.reel-title');
    var captionText = wrap.querySelector('.reel-desc');

    if (captionTitle) { captionTitle.textContent = reel.title; }
    if (captionText) { captionText.textContent = reel.desc; }

    if (cover) {
      cover.src = thumbUrl(reel.id, true);
      cover.alt = reel.title;

      cover.onerror = function () {
        this.onerror = null;
        this.src = thumbUrl(reel.id, false);
      };
    }

    if (poster) {
      poster.addEventListener('click', function (e) {
        e.preventDefault();

        var player = document.createElement('div');
        player.className = 'showreel-player';

        var iframe = document.createElement('iframe');
        iframe.setAttribute('src', buildEmbedUrl(reel.id, true));
        iframe.setAttribute('title', reel.title);
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.setAttribute('frameborder', '0');

        player.appendChild(iframe);
        poster.parentNode.replaceChild(player, poster);
      });
    }
  }

  /* ============================================================
     VIDEO PORTFOLIO
     ========================================================== */

  var CAT_LABELS = {
    'ai-video': 'AI Video',
    'commercial': 'Commercial / Brand',
    'promotional': 'Promotional Video',
    'automotive': 'Automotive',
    'manufacturing': 'Manufacturing',
    'real-estate': 'Real Estate',
    'music-video': 'Music Video',
    'short-film': 'AI Short Films',
    'conferences': 'Conferences / Business Forums',
    'exhibitions': 'Exhibitions'
  };

  function prettyCats(catString) {
    return catString.split(' ').filter(Boolean).map(function (c) {
      return CAT_LABELS[c] || c;
    });
  }

  function initPortfolio() {
    var grid = document.getElementById('work-grid');
    if (!grid || typeof window.PV_VIDEOS === 'undefined') { return; }

    var videos = window.PV_VIDEOS;
    var html = [];

    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      var cats = prettyCats(v.cat);

      var tagHtml = '';
      for (var j = 0; j < cats.length; j++) {
        tagHtml += '<span class="tag' + (j === 0 ? ' is-warm' : '') + '">' +
          escapeHtml(cats[j]) + '</span>';
      }

      html.push(
        '<article class="work-card reveal" data-video-id="' + escapeHtml(v.id) + '" ' +
                'data-category="' + escapeHtml(v.cat) + '">' +
          '<button type="button" class="work-thumb" data-video="' + escapeHtml(v.id) + '" ' +
            'data-title="' + escapeHtml(v.title) + '" data-desc="' + escapeHtml(v.desc) + '" ' +
            'aria-label="Play ' + escapeHtml(v.title) + '">' +
            '<img src="' + thumbUrl(v.id, false) + '" alt="' + escapeHtml(v.title) + '" loading="lazy" ' +
              'decoding="async" ' +
              'onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg?cb=' + THUMB_VERSION + '\'">' +
            '<span class="work-play" aria-hidden="true">&#9654;</span>' +
          '</button>' +
          '<div class="work-body">' +
            '<h3 class="work-title">' + escapeHtml(v.title) + '</h3>' +
            '<p class="work-desc">' + escapeHtml(v.desc) + '</p>' +
            '<div class="work-tags">' + tagHtml + '</div>' +
          '</div>' +
        '</article>'
      );
    }

    grid.innerHTML = html.join('');

    grid.addEventListener('click', function (e) {
      var thumb = e.target.closest ? e.target.closest('.work-thumb') : null;
      if (!thumb) { return; }
      openVideo(thumb.dataset.video, thumb.dataset.title, thumb.dataset.desc);
    });

    /* Cards are written in PV_VIDEOS order, but the visitor's order lives
       in PV_ORDER. Without this pass the grid opens in array order and a
       newly added video sits at the very end of All until some filter is
       tapped — then orderCards() runs and everything jumps into place.
       Sorting once here makes the first paint match PV_ORDER. */
    orderCards(grid, 'all');

    initFilters('.filter-btn', '.work-card');
    initReveal();
  }

  /* Reorder the cards so the visible ones follow window.PV_ORDER[filter].
     Cards not named in that list keep their existing relative order and
     follow the named ones. The listener on the grid is delegated, so
     moving nodes does not break clicking. */
  /* Position of every video in window.PV_VIDEOS, which is itself stored
     in the All order. Used as the tie-breaker so that a category can be
     sorted deterministically even when it does not name every card. */
  function videoIndexMap() {
    if (orderCards.map) { return orderCards.map; }
    var map = {};
    var videos = window.PV_VIDEOS || [];
    for (var i = 0; i < videos.length; i++) { map[videos[i].id] = i; }
    orderCards.map = map;
    return map;
  }

  function orderCards(grid, filter) {
    if (!grid || !window.PV_ORDER) { return; }

    var ids = window.PV_ORDER[filter] || window.PV_ORDER['all'];
    if (!ids) { return; }

    var allIndex = videoIndexMap();

    var rank = {};
    for (var i = 0; i < ids.length; i++) { rank[ids[i]] = i; }

    var cards = [].slice.call(grid.querySelectorAll('.work-card'));
    var keyed = [];
    for (var c = 0; c < cards.length; c++) {
      var id = cards[c].getAttribute('data-video-id') || '';
      var named = Object.prototype.hasOwnProperty.call(rank, id);
      keyed.push({
        el: cards[c],
        named: named,
        rank: named ? rank[id] : 0,
        fallback: Object.prototype.hasOwnProperty.call(allIndex, id)
          ? allIndex[id] : 999999
      });
    }

    /* Cards named in the category list come first, in that order. The
       rest follow in All order. Nothing is left to DOM position, so the
       result is identical no matter which tab you arrived from. */
    keyed.sort(function (x, y) {
      if (x.named !== y.named) { return x.named ? -1 : 1; }
      if (x.named && x.rank !== y.rank) { return x.rank - y.rank; }
      return x.fallback - y.fallback;
    });

    for (var k = 0; k < keyed.length; k++) {
      grid.appendChild(keyed[k].el);
    }
  }

  function initFilters(btnSelector, cardSelector) {
    var buttons = document.querySelectorAll(btnSelector);
    if (!buttons.length) { return; }

    for (var b = 0; b < buttons.length; b++) {
      buttons[b].addEventListener('click', function () {
        var all = document.querySelectorAll(btnSelector);
        for (var k = 0; k < all.length; k++) {
          all[k].classList.remove('is-active');
          all[k].setAttribute('aria-selected', 'false');
        }

        this.classList.add('is-active');
        this.setAttribute('aria-selected', 'true');

        var filter = this.getAttribute('data-filter');
        var list = document.querySelectorAll(cardSelector);

        for (var c = 0; c < list.length; c++) {
          var cats = (list[c].getAttribute('data-category') || '').split(' ');
          var match = filter === 'all' || cats.indexOf(filter) !== -1;
          list[c].classList.toggle('is-hidden', !match);
        }

        orderCards(document.querySelector('.work-grid'), filter);
        if (window.PV_REVEAL_SWEEP) { window.PV_REVEAL_SWEEP(true); }
      });
    }
  }

  /* ============================================================
     PHOTO PORTFOLIO
     ========================================================== */

  var PHOTO_CATS = [
    { key: 'ai-photo',      label: 'AI Photo' },
    { key: 'real-estate',   label: 'Real Estate' },
    { key: 'manufacturing', label: 'Manufacturing' },
    { key: 'events',        label: 'Events / Performances' },
    { key: 'commercial',    label: 'Commercial' },
    { key: 'conferences',   label: 'Conferences / Launches' }
  ];

  var PHOTO_THUMB_DIR = 'assets/images/photos/thumbs/';
  var PHOTO_FULL_DIR = 'assets/images/photos/';

  /**
   * Grid shows 600 px thumbnails; the 2400 px original loads only when a
   * photo is opened. Each slot keeps its placeholder until its thumbnail
   * arrives. Empty slots are lazy-loaded, so a missing file costs nothing
   * until it scrolls near the viewport.
   */
  function initPhotoGrid() {
    var grid = document.getElementById('photo-grid');
    if (!grid) { return; }

    var html = [];

    for (var c = 0; c < PHOTO_CATS.length; c++) {
      var cat = PHOTO_CATS[c];

      for (var n = 1; n <= 40; n++) {
        var num = (n < 10 ? '0' : '') + n;
        var file = cat.key + '-' + num + '.jpg';

        html.push(
          '<button type="button" class="photo-cell" ' +
            'data-category="' + cat.key + '" ' +
            'data-full="' + PHOTO_FULL_DIR + file + '" ' +
            'data-caption="' + escapeHtml(cat.label + ' — ' + num) + '" ' +
            'aria-label="' + escapeHtml(cat.label + ' ' + n) + '">' +
            '<span class="photo-slot">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' +
                '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
                '<circle cx="8.5" cy="9.5" r="1.6" fill="currentColor"/>' +
                '<path d="M4 17l5-4 4 3 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
              '</svg>' +
              '<span>' + escapeHtml(cat.key + '-' + num) + '</span>' +
            '</span>' +
            '<img alt="" loading="lazy" decoding="async" src="' + PHOTO_THUMB_DIR + file + '">' +
          '</button>'
        );
      }
    }

    grid.innerHTML = html.join('');

    var imgs = grid.querySelectorAll('.photo-cell img');

    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        var cell = img.parentNode;

        img.addEventListener('load', function () {
          var slot = cell.querySelector('.photo-slot');
          if (slot) { slot.parentNode.removeChild(slot); }
          cell.setAttribute('data-loaded', '1');
        });

        /* Missing thumbnail: keep the placeholder, drop the broken image. */
        img.addEventListener('error', function () {
          cell.setAttribute('data-missing', '1');
          if (img.parentNode) { img.parentNode.removeChild(img); }
        });
      })(imgs[i]);
    }

    /* Only photos that loaded can be opened. */
    grid.addEventListener('click', function (e) {
      var cell = e.target.closest ? e.target.closest('.photo-cell') : null;
      if (!cell || cell.getAttribute('data-missing') === '1') { return; }

      /* Include lazy cells that have not loaded yet. The lightbox skips
         any file that turns out to be missing. */
      var list = grid.querySelectorAll('.photo-cell:not(.is-hidden):not([data-missing="1"])');
      var gallery = Array.prototype.slice.call(list);

      openLightbox(gallery, gallery.indexOf(cell));
    });

    initFilters('.photo-filters .filter-btn', '.photo-cell');
    initReveal();
  }

  /* ============================================================
     LIGHTBOX
     ========================================================== */

  var lightboxState = { items: [], index: 0 };
  var lightboxFocus = null;

  function openLightbox(items, index) {
    var box = document.getElementById('lightbox');
    if (!box || !items.length) { return; }

    lightboxState.items = items;
    lightboxState.index = index < 0 ? 0 : index;
    lightboxFocus = document.activeElement;

    renderLightbox();

    box.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    var closeBtn = box.querySelector('.lightbox-close');
    if (closeBtn) { closeBtn.focus(); }
  }

  function renderLightbox() {
    var box = document.getElementById('lightbox');
    if (!box) { return; }

    var item = lightboxState.items[lightboxState.index];
    if (!item) { return; }

    var img = box.querySelector('.lightbox-frame img');
    var cap = box.querySelector('.lightbox-caption');
    var thumb = item.querySelector('img');

    if (img) {
      /* Full image missing -> try the thumbnail. Both missing -> skip. */
      var triedThumb = false;
      img.onerror = function () {
        if (!triedThumb && thumb) {
          triedThumb = true;
          img.src = thumb.getAttribute('src');
          return;
        }
        img.onerror = null;
        lightboxSkip(item);
      };
      img.src = item.getAttribute('data-full');
      img.alt = thumb ? thumb.alt : '';
    }

    if (cap) {
      cap.textContent = item.getAttribute('data-caption') || '';
    }

    var multi = lightboxState.items.length > 1;
    var prev = box.querySelector('.lightbox-prev');
    var next = box.querySelector('.lightbox-next');

    if (prev) { prev.style.display = multi ? 'flex' : 'none'; }
    if (next) { next.style.display = multi ? 'flex' : 'none'; }
  }

  function lightboxSkip(item) {
    var items = lightboxState.items;
    var at = items.indexOf(item);
    if (at === -1) { return; }

    items.splice(at, 1);

    if (!items.length) { closeLightbox(); return; }

    if (lightboxState.index >= items.length) { lightboxState.index = 0; }
    if (at < lightboxState.index) { lightboxState.index--; }

    renderLightbox();
  }

  function stepLightbox(delta) {
    var total = lightboxState.items.length;
    if (total < 2) { return; }

    lightboxState.index = (lightboxState.index + delta + total) % total;
    renderLightbox();
  }

  function closeLightbox() {
    var box = document.getElementById('lightbox');
    if (!box || !box.classList.contains('is-open')) { return; }

    box.classList.remove('is-open');
    document.body.style.overflow = '';

    var img = box.querySelector('.lightbox-frame img');
    if (img) { img.removeAttribute('src'); }

    if (lightboxFocus && lightboxFocus.focus) { lightboxFocus.focus(); }
  }

  function initLightbox() {
    var box = document.getElementById('lightbox');
    if (!box) { return; }

    box.addEventListener('click', function (e) {
      if (e.target === box) { closeLightbox(); return; }

      if (e.target.closest('.lightbox-close')) { e.preventDefault(); closeLightbox(); return; }
      if (e.target.closest('.lightbox-prev')) { e.preventDefault(); stepLightbox(-1); return; }
      if (e.target.closest('.lightbox-next')) { e.preventDefault(); stepLightbox(1); }
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) { return; }

      if (e.key === 'Escape' || e.keyCode === 27) { closeLightbox(); }
      if (e.key === 'ArrowLeft' || e.keyCode === 37) { stepLightbox(-1); }
      if (e.key === 'ArrowRight' || e.keyCode === 39) { stepLightbox(1); }
    });
  }

  /* ============================================================
     CONTACT FORM — posts to the portal host, which sends the mail
     ========================================================== */

  var MAIL_ENDPOINT = 'https://portal.penuelvision.com/send-mail.php';
  var RECAPTCHA_SITE_KEY = '6Lce1QIuAAAAAL3kGOYCuWf7_kIY1GQCxsvmiZre';

  /**
   * Ask reCAPTCHA v3 for a token.
   *
   * v3 tokens are valid for two minutes, so the token is requested at
   * submit time rather than on page load — a visitor who spends ten
   * minutes writing would otherwise send a dead token and be rejected.
   */
  function getRecaptchaToken(action) {
    return new Promise(function (resolve, reject) {
      if (!window.grecaptcha || !window.grecaptcha.ready) {
        reject(new Error('reCAPTCHA did not load. Check the network or an ad blocker.'));
        return;
      }

      window.grecaptcha.ready(function () {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action: action })
          .then(resolve)
          .catch(function () {
            reject(new Error('reCAPTCHA could not issue a token.'));
          });
      });
    });
  }

  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) { return; }

    var submitBtn = form.querySelector('.form-submit');
    var success = document.getElementById('form-success');

    function showError(field, errId) {
      if (field) { field.classList.add('has-error'); }
      var el = document.getElementById(errId);
      if (el) { el.classList.add('is-visible'); }
    }

    function clearErrors() {
      var errs = form.querySelectorAll('.form-error');
      for (var i = 0; i < errs.length; i++) { errs[i].classList.remove('is-visible'); }

      var fields = form.querySelectorAll('.input, .select, .textarea');
      for (var j = 0; j < fields.length; j++) { fields[j].classList.remove('has-error'); }

      var banner = document.getElementById('form-error-banner');
      if (banner) { banner.style.display = 'none'; }
    }

    function banner(message) {
      var el = document.getElementById('form-error-banner');
      if (!el) { return; }
      el.textContent = message;
      el.style.display = 'block';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function resetButton() {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }

    function send(payload) {
      fetch(MAIL_ENDPOINT, {
        method: 'POST',
        body: payload,
        mode: 'cors'
      })
        /* Read the body as text first. If the server answers with an HTML
           error page, r.json() would throw and the real cause would be
           lost behind a generic message. */
        .then(function (r) {
          return r.text().then(function (text) {
            var data = null;
            try { data = JSON.parse(text); } catch (e) { /* not JSON */ }
            return { status: r.status, ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (res.ok && res.data && res.data.ok) {
            var blocks = form.querySelectorAll('.field, .field-row, .check-row, .form-submit');
            for (var i = 0; i < blocks.length; i++) { blocks[i].style.display = 'none'; }
            if (success) { success.classList.add('is-visible'); }
            return;
          }

          /* The server answered, so show what it said. */
          var shown = (res.data && res.data.error)
            ? res.data.error
            : 'The server returned an error (' + res.status + ').';

          console.error('contact form: server replied', res.status, res.data);
          banner(shown + ' Please email aivisuals@penuelvision.com directly.');
          resetButton();
        })
        .catch(function (err) {
          /* fetch rejects for a network failure AND for a blocked request —
             the browser hides which one. A cross-origin POST is blocked
             when this site's address is missing from PV_ALLOWED_ORIGINS
             in portal/config.php, so name that possibility. */
          console.error('contact form: request failed', err);

          var origin = location.origin;
          var hint = (origin === 'null' || location.protocol === 'file:')
            ? ' Open the site through http(s), not by double-clicking the file.'
            : ' The sending domain ' + origin + ' may not be allowed by the mail server.';

          banner('The message could not be sent.' + hint +
                 ' Please email aivisuals@penuelvision.com directly.');
          resetButton();
        });
    }

    /* Validation used to be cleared only by the next submit, so a visitor
       who fixed four fields still stared at four red warnings. Each field
       now clears its own message the moment it is edited, and re-checks on
       blur so a warning can come back if the value is still wrong. */
    var fieldErrorMap = {
      'field-name': 'err-name',
      'field-email': 'err-email',
      'field-type': 'err-type',
      'field-message': 'err-message',
      'field-privacy': 'err-privacy'
    };

    function clearFieldError(field) {
      if (!field || !field.id) { return; }
      field.classList.remove('has-error');
      var errId = fieldErrorMap[field.id];
      var el = errId ? document.getElementById(errId) : null;
      if (el) { el.classList.remove('is-visible'); }
    }

    function checkField(field) {
      if (!field || !field.id) { return true; }

      var ok = true;

      if (field.id === 'field-name') {
        ok = !!field.value.trim();
      } else if (field.id === 'field-email') {
        ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
      } else if (field.id === 'field-type') {
        ok = !!field.value;
      } else if (field.id === 'field-message') {
        ok = !!field.value.trim();
      } else if (field.id === 'field-privacy') {
        ok = !!field.checked;
      }

      field.classList.toggle('has-error', !ok);
      var errId = fieldErrorMap[field.id];
      var el = errId ? document.getElementById(errId) : null;
      if (el) { el.classList.toggle('is-visible', !ok); }

      return ok;
    }

    function fieldFromEvent(e) {
      var t = e.target;
      if (!t || !t.id) { return null; }
      return Object.prototype.hasOwnProperty.call(fieldErrorMap, t.id) ? t : null;
    }

    /* Typing clears the warning at once — the visitor is already fixing
       it, and nagging mid-word would only be noise. */
    form.addEventListener('input', function (e) {
      var f = fieldFromEvent(e);
      if (f) { clearFieldError(f); }
    });

    /* A choice is discrete, so it is checked immediately. */
    form.addEventListener('change', function (e) {
      var f = fieldFromEvent(e);
      if (f) { f.classList.remove('has-error'); checkField(f); }
    });

    /* Leaving a flagged field re-checks it, so an emptied name does not
       stay silently clean. */
    form.addEventListener('blur', function (e) {
      var f = fieldFromEvent(e);
      if (f && f.classList.contains('has-error')) { checkField(f); }
    }, true);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      var name = form.querySelector('#field-name');
      var email = form.querySelector('#field-email');
      var type = form.querySelector('#field-type');
      var message = form.querySelector('#field-message');
      var privacy = form.querySelector('#field-privacy');

      var valid = true;

      if (!name.value.trim()) { showError(name, 'err-name'); valid = false; }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email, 'err-email'); valid = false;
      }

      if (!type.value) { showError(type, 'err-type'); valid = false; }
      if (!message.value.trim()) { showError(message, 'err-message'); valid = false; }

      if (!privacy.checked) {
        var pErr = document.getElementById('err-privacy');
        if (pErr) { pErr.classList.add('is-visible'); }
        valid = false;
      }

      if (!valid) {
        var first = form.querySelector('.has-error');
        if (first) { first.focus(); }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      getRecaptchaToken('contact')
        .then(function (token) {
          var payload = new FormData(form);
          payload.set('g-recaptcha-response', token);
          payload.append('page_url', window.location.href);
          send(payload);
        })
        .catch(function (err) {
          var cErr = document.getElementById('err-captcha');
          if (cErr) { cErr.classList.add('is-visible'); }
          banner(err.message + ' Please email aivisuals@penuelvision.com directly.');
          resetButton();
        });
    });

    var emailField = form.querySelector('#field-email');
    if (emailField) {
      emailField.addEventListener('blur', function () {
        var value = this.value.trim();
        if (!value) { return; }

        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        this.classList.toggle('has-error', !ok);

        var err = document.getElementById('err-email');
        if (err) { err.classList.toggle('is-visible', !ok); }
      });
    }
  }

  /* ============================================================
     FOOTER YEAR
     ========================================================== */

  function initYear() {
    var year = String(new Date().getFullYear());
    var nodes = document.querySelectorAll('[data-current-year]');

    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = year;
    }
  }

  /* ============================================================
     REVEAL
     ========================================================== */

  /* Reveal-on-scroll, built so decoration can never hide content.
     The original version left the portfolio blank on iOS: the observer
     reported one card of eighty and nothing else ever fired.

     This version does not depend on the observer, on requestAnimationFrame
     or on any single event. Scrolling, resizing and a slow heartbeat all
     converge on sweep(), which only touches elements that have crossed
     the line and are still hidden. Failing every one of those, the CSS
     fallback in penuel.css shows the rest after three seconds. */
  function initReveal() {
    var items = [].slice.call(document.querySelectorAll('.reveal:not(.is-visible)'));
    if (!items.length) { return; }

    var done = 0;

    function vh() {
      return window.innerHeight || document.documentElement.clientHeight;
    }

    function show(el, delay) {
      if (el.classList.contains('is-visible')) { return; }
      if (delay) { el.style.transitionDelay = delay + 'ms'; }
      el.classList.add('is-visible');
      done++;
    }

    /* Reveal everything that has crossed the trigger line. Requiring a card
       to be fully inside the viewport would skip tall cards on short phone
       screens, so only the top edge is tested — anything scrolled past is
       caught too, which matters when a flick jumps several screens. */
    function sweep(stagger, full) {
      if (done >= items.length) { return; }
      /* 0.88 of the viewport is the aesthetic trigger: a card starts
         rising just before it is fully in view. 1.0 is the safety line:
         nothing that touches the screen may stay hidden, which is what
         the heartbeat and the scroll-stop pass use. */
      var line = full ? vh() : vh() * 0.88;
      var batch = 0;

      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        if (el.classList.contains('is-visible')) { continue; }
        if (el.getBoundingClientRect().top >= line) { continue; }

        show(el, stagger ? Math.min(batch * 60, 240) : 0);
        batch++;
      }
    }

    window.PV_REVEAL_SWEEP = sweep;

    /* First screen: one tick later, so the grid is laid out and the
       transition actually runs instead of being collapsed into nothing. */
    setTimeout(function () { sweep(true); }, 16);

    /* Scroll: throttled by time, not by frames. A frame-based throttle
       silently drops work when the compositor is busy. */
    var last = 0;
    var settle = null;

    function onScroll() {
      /* Full line, every event, no throttle on the safety part. This is
         what removes the flash of an invisible card during a fast flick:
         whatever touches the screen is shown before it can be seen empty.
         The staggered variant below keeps the softer entry animation. */
      sweep(false, true);

      var now = Date.now();
      if (now - last >= 80) {
        last = now;
        sweep(false);
      }

      /* When the finger stops, anything merely touching the screen is
         shown too. Without this a card could park just below the trigger
         line and stay invisible at a resting scroll position. */
      if (settle) { clearTimeout(settle); }
      settle = setTimeout(function () { sweep(false, true); }, 180);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('orientationchange', onScroll);

    /* Observer only accelerates; the sweep already covers everything. */
    if ('IntersectionObserver' in window) {
      try {
        var io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) { continue; }
            show(entries[i].target, 0);
            io.unobserve(entries[i].target);
          }
        }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

        for (var j = 0; j < items.length; j++) { io.observe(items[j]); }
      } catch (e) { /* the sweep covers it */ }
    }

    /* Heartbeat. Stops by itself once everything is shown. This is what
       keeps a page readable when scroll events are swallowed — in in-app
       browsers, when the page is restored from the back/forward cache,
       or when a filter re-lays out the grid under the user. */
    var beat = setInterval(function () {
      if (done >= items.length) { clearInterval(beat); return; }
      sweep(false, true);
    }, 700);

    setTimeout(function () { clearInterval(beat); }, 60000);
  }

  /* ============================================================
     IMAGE FALLBACK
     ========================================================== */

  function initImageFallbacks() {
    var imgs = document.querySelectorAll('img[data-fallback]');

    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        img.addEventListener('error', function () {
          var parent = img.parentNode;
          if (parent && !parent.querySelector('.img-missing')) {
            var note = document.createElement('div');
            note.className = 'img-missing';
            note.textContent = img.getAttribute('data-fallback');
            parent.appendChild(note);
          }
          img.style.display = 'none';
        });
      })(imgs[i]);
    }
  }

  /* ============================================================
     BOOT
     ========================================================== */

  function boot() {
    initHeader();
    markActiveNav();
    watchActiveNav();
    initNavDropdown();
    initHeroVideo();
    initVideoModal();
    initStaticVideoCards();
    initShowreel();
    initPortfolio();
    initPhotoGrid();
    initLightbox();
    initContactForm();
    initYear();
    initImageFallbacks();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
