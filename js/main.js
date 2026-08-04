/* ==========================================================================
   بتن‌یار | Beton Yar — main.js
   --------------------------------------------------------------------------
   ES6+ modular scripts. Loaded with `defer`, so DOM is ready on run.
   Each concern lives in its own guarded IIFE module:
   · Header / back-to-top        · Scroll reveal
   · Animated counters           · Mobile drawer
   · Scroll-spy                  · Seamless marquee
   · Catalog filter              · FAQ accordion
   · Contact form validation     · WhatsApp order links
   · Materials calculator        · Jalali price date
   · Ambient canvas particles
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

    const supportsInert = 'inert' in HTMLElement.prototype;
    const rest = Array.from(document.body.children).filter(
      (el) => el !== drawer && el !== backdrop
    );
    let lastFocus = null;

    const setRestInert = (inert) => {
      if (!supportsInert) return;
      rest.forEach((el) => {
        el.inert = inert;
      });
    };

    const setState = (open) => {
      drawer.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
      backdrop.classList.toggle('show', open);
      document.body.classList.toggle('no-scroll', open);
      if (open) {
        lastFocus = document.activeElement;
        setRestInert(true);
        closeBtn.focus();
      } else {
        setRestInert(false);
        (lastFocus || burger).focus();
      }
    };

    const open = () => setState(true);
    const close = () => setState(false);

    burger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    drawer.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(drawer.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

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
    items.forEach((item, index) => {
      const btn = item.querySelector('.faq-btn');
      const panel = item.querySelector('.faq-panel');
      if (panel && !panel.id) {
        const panelId = 'faqPanel' + (index + 1);
        panel.id = panelId;
        btn.setAttribute('aria-controls', panelId);
      }
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

    const SUBJECT_LABELS = {
      price: 'استعلام قیمت روز',
      order: 'ثبت سفارش',
      delivery: 'پیگیری بار',
      other: 'سایر موارد',
    };

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
      field.setAttribute('aria-invalid', String(!ok));
      el.querySelector('.field-error').textContent = ok ? '' : errors[field.name];
      return ok;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let valid = true;
      let firstInvalid = null;
      Object.keys(rules).forEach((name) => {
        const field = form.elements[name];
        if (!setState(field, rules[name](field.value))) {
          valid = false;
          if (!firstInvalid) firstInvalid = field;
        }
      });
      if (!valid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      const message = [
        'سلام بتن‌یار، از فرم سایت پیام می‌فرستم.',
        'نام: ' + form.elements.name.value.trim(),
        'شماره تماس: ' + toLatin(form.elements.phone.value).replace(/[^0-9]/g, ''),
        'موضوع: ' + (SUBJECT_LABELS[form.elements.subject.value] || 'سایر موارد'),
        form.elements.message.value.trim()
          ? 'توضیحات: ' + form.elements.message.value.trim()
          : null,
      ]
        .filter(Boolean)
        .join('\n');
      window.open(
        'https://wa.me/989113274610?text=' + encodeURIComponent(message),
        '_blank',
        'noopener'
      );
      form.hidden = true;
      success.hidden = false;
      success.focus();
    });

    form.addEventListener('input', (event) => {
      const field = event.target;
      if (rules[field.name] && rules[field.name](field.value)) setState(field, true);
    });
  })();

  /* ------------------------------------------------------------------
     WhatsApp — prefill order links with the product name
     ------------------------------------------------------------------ */
  (() => {
    const WA = '989113274610';
    document.querySelectorAll('.pc-wa').forEach((link) => {
      const card = link.closest('.price-card');
      const titleEl = card && card.querySelector('.pc-title');
      const title = (titleEl && titleEl.textContent.trim()) || '';
      const text = `سلام، لطفاً قیمت و موجودی «${title}» را اعلام کنید.`;
      link.href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
    });
  })();

  /* ------------------------------------------------------------------
     Materials calculator — area × thickness → cement / aggregate / water
     ------------------------------------------------------------------ */
  (() => {
    const area = document.getElementById('calcArea');
    const depth = document.getElementById('calcDepth');
    const mix = document.getElementById('calcMix');
    const vol = document.getElementById('calcVol');
    const cement = document.getElementById('calcCement');
    const sand = document.getElementById('calcSand');
    const water = document.getElementById('calcWater');
    if (!area || !depth || !mix || !vol || !cement || !sand || !water) return;

    const fmt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
    const fmt0 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });

    const render = () => {
      const a = Number.parseFloat(area.value) || 0;
      const d = (Number.parseFloat(depth.value) || 0) / 100;
      const c = Number.parseInt(mix.value, 10) || 350;
      const v = a * d;
      const cementKg = v * c;
      const bags = Math.ceil(cementKg / 50);
      const sandT = v * 1.55;
      const waterL = v * 180;
      vol.textContent = v > 0 ? fmt.format(v) : '—';
      cement.textContent = bags > 0 ? fmt0.format(bags) : '—';
      sand.textContent = v > 0 ? fmt.format(sandT) : '—';
      water.textContent = v > 0 ? fmt0.format(waterL) : '—';
    };

    [area, depth, mix].forEach((el) => el.addEventListener('input', render));
  })();

  /* ------------------------------------------------------------------
     Price date — today in the Jalali calendar next to the price list
     ------------------------------------------------------------------ */
  (() => {
    const el = document.getElementById('priceDate');
    if (!el) return;
    try {
      el.textContent = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch (err) {
      el.textContent = '';
    }
  })();

  /* ------------------------------------------------------------------
     Ambient canvas particles — subtle drifting dust in dark hero areas
     ------------------------------------------------------------------ */
  (() => {
    const host = document.querySelector('.hero, .page-hero');
    if (!host || prefersReducedMotion) return;
    if (!document.createElement('canvas').getContext) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'ambient';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const COLORS = ['255,255,255', '244,161,64', '226,110,35'];
    const rand = (min, max) => min + Math.random() * (max - min);

    let width = 0;
    let height = 0;
    let particles = [];
    let running = false;
    let hostVisible = true;
    let last = performance.now();

    const fit = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * DPR));
      canvas.height = Math.max(1, Math.round(height * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const spawn = () => {
      const count = width < 768 ? 22 : 36;
      particles = Array.from({ length: count }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(1, 2.6),
        vx: rand(-0.12, 0.12),
        vy: rand(-0.22, -0.05),
        a: rand(0.08, 0.5),
        tw: rand(0.0004, 0.0016),
        phase: rand(0, Math.PI * 2),
        c: COLORS[(Math.random() * COLORS.length) | 0],
      }));
    };

    const tick = (now) => {
      if (!running) return;
      const delta = Math.min(now - last, 50);
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.phase += p.tw * delta;
        p.x += p.vx * (delta / 16) + Math.sin(p.phase) * 0.02;
        p.y += p.vy * (delta / 16);
        if (p.y < -6) {
          p.y = height + 6;
          p.x = rand(0, width);
        }
        if (p.x < -6) p.x = width + 6;
        if (p.x > width + 6) p.x = -6;
        const alpha = p.a * (0.55 + 0.45 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${alpha.toFixed(3)})`;
        ctx.fill();
      }
      requestAnimationFrame(tick);
    };

    const sync = () => {
      const shouldRun = hostVisible && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        last = performance.now();
        requestAnimationFrame(tick);
      } else if (!shouldRun) {
        running = false;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        hostVisible = entry.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );

    let resizeTicking = false;
    window.addEventListener(
      'resize',
      () => {
        if (resizeTicking) return;
        resizeTicking = true;
        requestAnimationFrame(() => {
          fit();
          spawn();
          resizeTicking = false;
        });
      },
      { passive: true }
    );

    document.addEventListener('visibilitychange', sync);

    fit();
    spawn();
    observer.observe(host);
    sync();
  })();
})();

/* --------------------------------------------------------------------------
   Footer year — keeps the copyright year current in the Jalali calendar.
   Falls back to the static markup value when Intl is unavailable.
-------------------------------------------------------------------------- */
(() => {
  const els = document.querySelectorAll('.footer-year');
  if (!els.length) return;
  let year = '';
  try {
    year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
    }).format(new Date());
  } catch (_) {
    return;
  }
  if (!year) return;
  els.forEach((el) => {
    el.textContent = year;
  });
})();
