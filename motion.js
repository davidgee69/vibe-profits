/* Vibe Profits — motion engine
   hardware-accelerated, reduced-motion aware, zero dependencies */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---------- scroll progress bar ---------- */
  (function initScrollProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.setProperty('--progress', p.toFixed(2) + '%');
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { raf(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  /* ---------- sticky header reveal on scroll past hero ---------- */
  (function initStickyHeader() {
    var header = document.getElementById('sticky-header');
    var hero = document.getElementById('hero');
    if (!header || !hero) return;
    var threshold = 0;
    function measure() { threshold = hero.offsetTop + hero.offsetHeight - 80; }
    measure();
    window.addEventListener('resize', measure, { passive: true });
    var ticking = false;
    function update() {
      var show = window.scrollY > threshold;
      header.classList.toggle('is-visible', show);
      header.setAttribute('aria-hidden', show ? 'false' : 'true');
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { raf(update); ticking = true; }
    }, { passive: true });
  })();

  if (reduced) return; /* skip decorative motion for reduced-motion users */

  /* ---------- ambient cursor orb (hero section only) ---------- */
  (function initCursorOrb() {
    var orb = document.querySelector('.cursor-orb');
    var hero = document.getElementById('hero');
    if (!orb || !hero) return;
    if (window.matchMedia('(hover: none)').matches) return; /* skip on touch */

    var x = 0, y = 0, tx = 0, ty = 0, active = false;

    hero.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!active) { active = true; orb.classList.add('is-active'); }
    });
    hero.addEventListener('mouseleave', function () {
      active = false; orb.classList.remove('is-active');
    });

    function tick() {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      orb.style.transform = 'translate3d(' + (x - 210) + 'px, ' + (y - 210) + 'px, 0)';
      raf(tick);
    }
    tick();
  })();

  /* ---------- magnetic CTA button ---------- */
  (function initMagnetic() {
    var btns = document.querySelectorAll('[data-magnetic]');
    if (!btns.length) return;
    if (window.matchMedia('(hover: none)').matches) return;

    btns.forEach(function (btn) {
      var bounds, tx = 0, ty = 0, cx = 0, cy = 0, raf_id = null, hovering = false;

      function enter() {
        hovering = true;
        bounds = btn.getBoundingClientRect();
      }
      function move(e) {
        if (!hovering || !bounds) return;
        var rx = e.clientX - (bounds.left + bounds.width / 2);
        var ry = e.clientY - (bounds.top + bounds.height / 2);
        tx = rx * 0.18;
        ty = ry * 0.28;
        if (!raf_id) raf_id = raf(tick);
      }
      function leave() {
        hovering = false;
        tx = 0; ty = 0;
        if (!raf_id) raf_id = raf(tick);
      }
      function tick() {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        btn.style.transform = 'translate3d(' + cx.toFixed(2) + 'px, ' + cy.toFixed(2) + 'px, 0)';
        if (Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05) {
          raf_id = raf(tick);
        } else {
          raf_id = null;
          if (!hovering) btn.style.transform = '';
        }
      }
      btn.addEventListener('mouseenter', enter);
      btn.addEventListener('mousemove', move);
      btn.addEventListener('mouseleave', leave);
    });
  })();

  /* ---------- parallax tilt on press tiles ---------- */
  (function initTilt() {
    var tiles = document.querySelectorAll('[data-tilt]');
    if (!tiles.length) return;
    if (window.matchMedia('(hover: none)').matches) return;

    tiles.forEach(function (tile) {
      var bounds, raf_id = null, targetX = 0, targetY = 0, curX = 0, curY = 0, hovering = false, mx = 50, my = 50;

      function enter() {
        hovering = true;
        bounds = tile.getBoundingClientRect();
      }
      function move(e) {
        if (!hovering) return;
        var rx = (e.clientX - bounds.left) / bounds.width;
        var ry = (e.clientY - bounds.top) / bounds.height;
        mx = rx * 100;
        my = ry * 100;
        targetX = (ry - 0.5) * -6;
        targetY = (rx - 0.5) * 6;
        if (!raf_id) raf_id = raf(tick);
      }
      function leave() {
        hovering = false;
        targetX = 0; targetY = 0;
        if (!raf_id) raf_id = raf(tick);
      }
      function tick() {
        curX += (targetX - curX) * 0.14;
        curY += (targetY - curY) * 0.14;
        tile.style.transform = 'perspective(800px) rotateX(' + curX.toFixed(2) + 'deg) rotateY(' + curY.toFixed(2) + 'deg)';
        tile.style.setProperty('--mx', mx.toFixed(1) + '%');
        tile.style.setProperty('--my', my.toFixed(1) + '%');
        if (Math.abs(curX - targetX) > 0.04 || Math.abs(curY - targetY) > 0.04) {
          raf_id = raf(tick);
        } else {
          raf_id = null;
          if (!hovering) tile.style.transform = '';
        }
      }
      tile.addEventListener('mouseenter', enter);
      tile.addEventListener('mousemove', move);
      tile.addEventListener('mouseleave', leave);
    });
  })();

  /* ---------- count-up on scroll into view (metrics) ---------- */
  (function initCountUp() {
    var nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length || !('IntersectionObserver' in window)) return;

    function format(n, target) {
      if (target >= 1000) return n.toLocaleString('en-US');
      return String(n);
    }
    function animate(node) {
      var target = parseInt(node.getAttribute('data-count'), 10);
      if (!target) return;
      var em = node.querySelector('em');
      if (!em) return;
      var start = performance.now();
      var duration = 1600;
      function step(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        var value = Math.round(eased * target);
        em.textContent = format(value, target);
        if (t < 1) raf(step); else em.textContent = format(target, target);
      }
      raf(step);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  /* ---------- cohort progress bar fill on view ---------- */
  (function initCohortFill() {
    var fill = document.getElementById('cohort-fill');
    var taken = document.getElementById('seats-taken');
    if (!fill || !('IntersectionObserver' in window)) return;
    var count = parseInt(taken ? taken.textContent : '7', 10) || 7;
    var pct = Math.min(100, (count / 50) * 100);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setTimeout(function () { fill.style.width = pct + '%'; }, 200);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    io.observe(fill);
  })();

  /* ---------- directional hover on footer links ---------- */
  (function initDirectionalHover() {
    var links = document.querySelectorAll('[data-hover]');
    if (!links.length) return;
    links.forEach(function (link) {
      link.addEventListener('mouseenter', function (e) {
        var b = link.getBoundingClientRect();
        var rx = (e.clientX - b.left) / b.width;
        link.style.setProperty('--hover-origin', rx < 0.5 ? 'left' : 'right');
      });
      link.addEventListener('mouseleave', function (e) {
        var b = link.getBoundingClientRect();
        var rx = (e.clientX - b.left) / b.width;
        link.style.setProperty('--hover-origin', rx < 0.5 ? 'left' : 'right');
      });
    });
  })();

  /* ---------- form: intercept submit, POST to AC, redirect to thanks.html ---------- */
  (function initForm() {
    var form = document.getElementById('waitlist-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.querySelector('.btn-label') : null;
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.85';
        if (label) label.textContent = 'Saving your seat…';
      }
      var data = new FormData(form);
      fetch(form.action, { method: 'POST', mode: 'no-cors', body: data })
        .catch(function () {})
        .finally(function () {
          setTimeout(function () { window.location.href = 'thanks.html'; }, 420);
        });
    });
  })();

  /* ---------- smooth scroll for in-page anchors ---------- */
  (function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
    });
  })();
})();
