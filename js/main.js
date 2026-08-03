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
     Scroll-spy — highlight the section currently in view
     ------------------------------------------------------------------ */
  (() => {
    const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'))
      .filter((link) => !link.classList.contains('cta'));
    if (!navLinks.length || !('IntersectionObserver' in window)) return;
    if (document.body.dataset.scrollspy === undefined) return;

    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);
    if (!sections.length) return;

    const setActive = (id) => {
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
  })();

  /* ------------------------------------------------------------------
     Seamless marquee — duplicates the track once for an infinite loop
     ------------------------------------------------------------------ */
  (() => {
    const track = document.getElementById('marqueeTrack');
    if (!track) return;

    /* Clone the track at idle time so first paint stays fast */
    const build = () => {
      const items = Array.from(track.children);
      items.forEach((item) => track.appendChild(item.cloneNode(true)));
      track.style.setProperty('--marquee-dur', `${Math.max(20, items.length * 1.7)}s`);
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(build, { timeout: 2000 });
    } else {
      setTimeout(build, 0);
    }
  })();

  /* ------------------------------------------------------------------
     Catalog — live filter + search (products page)
     ------------------------------------------------------------------ */
  (() => {
    const grid = document.getElementById('catalogGrid');
    const chips = document.querySelectorAll('.filter-chips .chip');
    const search = document.getElementById('productSearch');
    const status = document.getElementById('catalogStatus');
    const empty = document.getElementById('emptyState');
    const resetBtn = document.getElementById('resetFilters');
    if (!grid || !chips.length) return;

    const formatFa = new Intl.NumberFormat('fa-IR');
    const toLatin = (value) =>
      value.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    const cards = Array.from(grid.children);
    let activeFilter = 'all';
    let query = '';

    const matches = (card) => {
      const catOk = activeFilter === 'all' || card.dataset.cat === activeFilter;
      const q = toLatin(query).trim().toLowerCase();
      const textOk = !q || toLatin(card.dataset.title).toLowerCase().includes(q);
      return catOk && textOk;
    };

    const render = () => {
      let visible = 0;
      cards.forEach((card) => {
        const show = matches(card);
        card.classList.toggle('is-hidden', !show);
        if (show) visible += 1;
      });
      empty.hidden = visible !== 0;
      status.hidden = visible === 0;
      status.textContent = `${formatFa.format(visible)} محصول`;
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter;
        chips.forEach((c) => {
          const on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', String(on));
        });
        render();
      });
    });

    search.addEventListener('input', () => {
      query = search.value;
      render();
    });

    resetBtn.addEventListener('click', () => {
      activeFilter = 'all';
      query = '';
      search.value = '';
      chips.forEach((c) => {
        const on = c.dataset.filter === 'all';
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      render();
    });

    render();
  })();

  /* ------------------------------------------------------------------
     FAQ accordion (contact page)
     ------------------------------------------------------------------ */
  (() => {
    const items = Array.from(document.querySelectorAll('.faq-item'));
    if (!items.length) return;
    items.forEach((item) => {
      const btn = item.querySelector('.faq-btn');
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach((other) => {
          other.classList.remove('open');
          other.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  })();

  /* ------------------------------------------------------------------
     Contact form — validation + success state (contact page)
     ------------------------------------------------------------------ */
  (() => {
    const form = document.getElementById('contactForm');
    const success = document.getElementById('formSuccess');
    if (!form || !success) return;

    const toLatin = (value) => value.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

    const rules = {
      name: (value) => value.trim().length >= 3,
      phone: (value) => {
        const digits = toLatin(value).replace(/[^0-9]/g, '');
        return /^09\d{9}$/.test(digits);
      },
      subject: (value) => value !== '',
    };

    const errors = {
      name: 'نام باید حداقل ۳ حرف باشد.',
      phone: 'شماره موبایل معتبر وارد کنید (مثلا ۰۹۱۲۳۴۵۶۷۸۹).',
      subject: 'لطفا موضوع را انتخاب کنید.',
    };

    const setState = (field, ok) => {
      const el = field.closest('.field');
      el.classList.toggle('invalid', !ok);
      el.querySelector('.field-error').textContent = ok ? '' : errors[field.name];
      return ok;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let valid = true;
      Object.keys(rules).forEach((name) => {
        const field = form.elements[name];
        if (!setState(field, rules[name](field.value))) valid = false;
      });
      if (!valid) return;
      form.hidden = true;
      success.hidden = false;
    });

    form.addEventListener('input', (event) => {
      const field = event.target;
      if (rules[field.name] && rules[field.name](field.value)) setState(field, true);
    });
  })();
})();
