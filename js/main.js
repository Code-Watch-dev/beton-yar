/* ==========================================================================
   بتن‌یار | Beton Yar — main.js
   --------------------------------------------------------------------------
   ES6+ modular scripts. Loaded with `defer`, so DOM is ready on run.
   Each concern lives in its own guarded IIFE module:
   · Header / back-to-top        · Scroll reveal
   · Animated counters           · Mobile drawer
   · Seamless marquee
   All modules are defensive (no-op when their root element is absent).
   ========================================================================== */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Shared scroll bus — single rAF-throttled listener, no scroll jank
     ------------------------------------------------------------------ */
  const scrollHandlers = [];
  let scrollTicking = false;

  window.addEventListener(
    'scroll',
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        scrollHandlers.forEach((handler) => handler(y));
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  /* ------------------------------------------------------------------
     Header shrink + back-to-top
     ------------------------------------------------------------------ */
  (() => {
    const header = document.getElementById('header');
    const toTop = document.getElementById('toTop');
    if (!header || !toTop) return;

    scrollHandlers.push((y) => {
      header.classList.toggle('shrunk', y > 10);
      toTop.classList.toggle('show', y > 600);
    });

    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  })();

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  (() => {
    const items = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -5% 0px' }
    );

    items.forEach((el) => observer.observe(el));
  })();

  /* ------------------------------------------------------------------
     Animated counters
     ------------------------------------------------------------------ */
  (() => {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const formatFa = new Intl.NumberFormat('fa-IR');
    const settle = (el) => {
      el.textContent = formatFa.format(Number.parseInt(el.dataset.count, 10));
    };

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      counters.forEach(settle);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = Number.parseInt(el.dataset.count, 10);
          const duration = 1400;
          const start = performance.now();

          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            el.textContent = formatFa.format(
              Math.floor(target * Math.pow(progress, 0.6))
            );
            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              settle(el);
            }
          };

          requestAnimationFrame(tick);
          observer.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((el) => observer.observe(el));
  })();

  /* ------------------------------------------------------------------
     Mobile drawer navigation
     ------------------------------------------------------------------ */
  (() => {
    const burger = document.getElementById('burger');
    const drawer = document.getElementById('drawer');
    const closeBtn = document.getElementById('navClose');
    const backdrop = document.getElementById('navBackdrop');
    if (!burger || !drawer || !closeBtn || !backdrop) return;

    const setState = (open) => {
      drawer.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      backdrop.classList.toggle('show', open);
      document.body.classList.toggle('no-scroll', open);
      (open ? closeBtn : burger).focus();
    };

    const open = () => setState(true);
    const close = () => setState(false);

    burger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('open')) close();
    });
  })();

  /* ------------------------------------------------------------------
     Seamless marquee — duplicates the track once for an infinite loop
     ------------------------------------------------------------------ */
  (() => {
    const track = document.getElementById('marqueeTrack');
    if (!track) return;

    const items = Array.from(track.children);
    items.forEach((item) => track.appendChild(item.cloneNode(true)));
    track.style.setProperty('--marquee-dur', `${Math.max(20, items.length * 1.7)}s`);
  })();
})();
