/* ============================================================
   CBE Website — Main JS (shared by index, about, quality, contact)
   Chris Barron Engineering Pty Ltd

   bull-bars.html has its own inline script and does not load this file.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileNav();
  initScrollAnimations();
  initCounters();
  initFinishes();
  initBackToTop();
  initContactForm();
  initFinderCta();
});

/* ── HEADER ──────────────────────────────────────────────────── */
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── MOBILE NAV ──────────────────────────────────────────────── */
function initMobileNav() {
  const btn = document.getElementById('hamburger');
  const overlay = document.getElementById('mobile-nav-overlay');
  const close = document.getElementById('mobile-nav-close');
  const backdrop = overlay?.querySelector('.mobile-nav-backdrop');
  if (!btn || !overlay) return;

  const open = () => {
    overlay.classList.add('open'); btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
    close?.focus();
  };
  const closeNav = () => {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open'); btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
    btn.focus();
  };

  btn.addEventListener('click', open);
  close?.addEventListener('click', closeNav);
  backdrop?.addEventListener('click', closeNav);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
}

/* ── SCROLL REVEAL ────────────────────────────────────────────── */
function initScrollAnimations() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => observer.observe(el));
}

/* ── COUNTERS ─────────────────────────────────────────────────── */
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const finish = el => { el.textContent = (el.dataset.prefix || '') + parseInt(el.dataset.count, 10).toLocaleString() + (el.dataset.suffix || ''); };
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(finish);
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      let current = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = prefix + current.toLocaleString() + suffix;
        if (current >= target) clearInterval(timer);
      }, 20);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}

/* ── FINISH CARDS → contact page ──────────────────────────────── */
function initFinishes() {
  document.querySelectorAll('.finish-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = 'contact.html?enquiry=finish&finish=' + encodeURIComponent(card.dataset.finish || '');
    });
  });
}

/* ── BACK TO TOP ──────────────────────────────────────────────── */
function initBackToTop() {
  const topBtn = document.getElementById('back-to-top');
  if (!topBtn) return;
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    topBtn.style.setProperty('opacity', window.scrollY > 400 ? '1' : '0');
  }, { passive: true });
}

/* ── MOBILE FINDER BUTTON ─────────────────────────────────────── */
function initFinderCta() {
  const cta = document.getElementById('mobile-finder-cta');
  const card = document.getElementById('find');
  if (!cta || !card || !('IntersectionObserver' in window)) return;
  // On the home page the finder is in the hero; hide the floating button while it's already on screen.
  new IntersectionObserver(entries => {
    entries.forEach(e => cta.classList.toggle('is-hidden', e.isIntersecting));
  }, { threshold: 0.25 }).observe(card);
}

/* ── CONTACT FORM (Netlify Forms) ─────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('form-status');
  const btn = form.querySelector('.form-submit');
  const params = new URLSearchParams(window.location.search);

  // Pre-fill from links on other pages (?product=… / ?finish=…)
  const product = params.get('product');
  const finish = params.get('finish');
  if (product) {
    const el = document.getElementById('form-product');
    if (el) el.value = `Quote request: ${product}`;
  }
  if (finish) {
    const el = document.getElementById('form-message');
    if (el) el.value = `I'm interested in the ${finish} finish option.`;
  }

  const show = (msg, kind) => {
    if (!status) return;
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  };
  const SENT = 'Thanks! Your quote request has been sent. We reply within 1 business day.';
  const FAILED = 'Sorry, the message could not be sent. Please call (08) 8162 5347 or email admin@chrisbarronengineering.com.au.';

  // No-JS fallback: the native POST returns to /contact?sent=1
  if (params.get('sent') === '1') {
    show(SENT, 'ok');
    form.querySelector('h3')?.scrollIntoView({ block: 'center' });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    show('', '');
    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.reset();
      if (btn) { btn.textContent = '✓ Sent — we\'ll be in touch'; btn.style.background = 'var(--green)'; }
      show(SENT, 'ok');
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = original; }
      show(FAILED, 'err');
    }
  });
}
