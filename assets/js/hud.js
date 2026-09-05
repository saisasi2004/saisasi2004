'use strict';

/*==================================================================
  HUD / IMMERSION LAYER
  Progressive enhancement only. Every block is independently guarded
  so a failure in one feature can never take down another - or the
  original script.js behaviour.
==================================================================*/

(function () {

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function safe(name, fn) {
    try { fn(); } catch (e) { /* never let the HUD break the page */ }
  }


  /*----------------------------------------------------------------
    1. BOOT SEQUENCE
  ----------------------------------------------------------------*/

  safe('boot', function () {

    var boot = document.querySelector('[data-hud-boot]');
    if (!boot) return;

    var finish = function () { boot.classList.add('is-done'); };

    // only the first visit of a session gets the full sequence
    var seen = false;
    try { seen = sessionStorage.getItem('hud-booted') === '1'; } catch (e) {}

    if (reduced || seen) { finish(); return; }

    try { sessionStorage.setItem('hud-booted', '1'); } catch (e) {}

    var lines = boot.querySelectorAll('.hud-boot-line');
    var bar   = boot.querySelector('.hud-boot-bar i');
    var step  = 260;

    for (var i = 0; i < lines.length; i++) {
      (function (el, idx) {
        setTimeout(function () {
          el.classList.add('is-in');
          if (bar) bar.style.width = Math.round(((idx + 1) / lines.length) * 100) + '%';
        }, idx * step);
      })(lines[i], i);
    }

    setTimeout(finish, lines.length * step + 550);
  });


  /*----------------------------------------------------------------
    2. TELEMETRY READOUT
  ----------------------------------------------------------------*/

  safe('telemetry', function () {

    var clock = document.querySelector('[data-hud-clock]');
    var fps   = document.querySelector('[data-hud-fps]');
    if (!clock && !fps) return;

    if (clock) {
      var tick = function () {
        var d = new Date();
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        clock.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
      };
      tick();
      setInterval(tick, 1000);
    }

    // uptime since page load, reads like a session counter
    if (fps) {
      var t0 = Date.now();
      setInterval(function () {
        var s = Math.floor((Date.now() - t0) / 1000);
        var m = Math.floor(s / 60);
        fps.textContent = (m < 10 ? '0' : '') + m + ':' + ((s % 60) < 10 ? '0' : '') + (s % 60);
      }, 1000);
    }
  });


  /*----------------------------------------------------------------
    3. RETICLE CURSOR  (desktop, fine pointer, motion allowed)
  ----------------------------------------------------------------*/

  safe('reticle', function () {

    var dot = document.querySelector('[data-hud-reticle]');
    if (!dot || reduced) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.innerWidth < 1024) return;

    var x = 0, y = 0, cx = 0, cy = 0, on = false;

    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!on) { on = true; cx = x; cy = y; dot.classList.add('is-on'); }
    }, { passive: true });

    // lagged follow gives it a mechanical, servo-driven feel
    (function loop() {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      dot.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();

    var HOT = 'a, button, .project-item > a, .service-item, .content-card, [data-nav-link]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(HOT)) dot.classList.add('is-hot');
    }, { passive: true });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(HOT)) dot.classList.remove('is-hot');
    }, { passive: true });
  });


  /*----------------------------------------------------------------
    4. SCROLL REVEAL
  ----------------------------------------------------------------*/

  safe('reveal', function () {

    if (reduced || !('IntersectionObserver' in window)) return;

    var targets = document.querySelectorAll(
      '.service-item, .project-item, .blog-post-item, .timeline-item, .experience-item, .soft-skills-item'
    );
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    for (var i = 0; i < targets.length; i++) {
      targets[i].classList.add('hud-reveal');
      io.observe(targets[i]);
    }
  });


  /*----------------------------------------------------------------
    5. SKILL METERS - hold at 0, then fill when scrolled into view.
    The inline width="NN%" stays the source of truth, so with JS off
    the bars simply render full.
  ----------------------------------------------------------------*/

  safe('skills', function () {

    var list = document.querySelector('.skills-list');
    if (!list || reduced || !('IntersectionObserver' in window)) return;

    list.classList.add('is-armed');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          list.classList.remove('is-armed');
          io.disconnect();
        }
      });
    }, { threshold: 0.25 });

    io.observe(list);
  });


  /*----------------------------------------------------------------
    6. NAV - replay the page-in animation on every tab switch
  ----------------------------------------------------------------*/

  safe('nav', function () {

    var links = document.querySelectorAll('[data-nav-link]');
    if (!links.length || reduced) return;

    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        // run after script.js has swapped the .active class
        setTimeout(function () {
          var page = document.querySelector('article.active');
          if (!page) return;
          page.style.animation = 'none';
          void page.offsetWidth;          // force reflow so it restarts
          page.style.animation = '';
        }, 0);
      });
    }
  });

})();
