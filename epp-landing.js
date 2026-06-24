  // smooth scroll cu durată controlată (ms)
  const SCROLL_DURATION = 800;
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const start = window.scrollY;
      const end = target.getBoundingClientRect().top + start;
      const t0 = performance.now();
      const step = now => {
        const p = Math.min((now - t0) / SCROLL_DURATION, 1);
        const ease = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
        window.scrollTo(0, start + (end - start) * ease);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });

  // navbar scroll
  const nav = document.getElementById('nav');
  const SOLID_AT = 165;  // 0-150 transparent, mai jos = background alb solid
  const onScroll = () => {
    const past = window.scrollY > SOLID_AT;
    nav.classList.toggle('scrolled', past);
    nav.classList.toggle('solid', past);
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === id));
    });
  });

  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold: 0.12});
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // pornește pagina de la un anumit nivel de scroll
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 158);
