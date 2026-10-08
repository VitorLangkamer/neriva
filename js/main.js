/* NERIVA — interações (site demonstrativo).
   A página funciona sem este arquivo; aqui só entram camadas de conforto. */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasIO = 'IntersectionObserver' in window;
  const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const pad = (n) => String(n).padStart(2, '0');

  /* Ano no rodapé ---------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* Cabeçalho: transparente sobre a foto da hero, sólido com borda ao rolar - */
  const header = document.querySelector('.site-header');
  const sentinel = document.querySelector('[data-header-sentinel]');
  const setHeaderState = (atTop) => {
    header.classList.toggle('is-top', atTop);
    header.classList.toggle('is-scrolled', !atTop);
  };
  if (header && sentinel && hasIO) {
    setHeaderState(window.scrollY < 1); // já na primeira pintura, sem piscar
    new IntersectionObserver(([entry]) => setHeaderState(entry.isIntersecting)).observe(sentinel);
  }

  /* Menu do celular -------------------------------------------------------- */
  const toggle = document.querySelector('.menu-toggle');
  const panel = document.getElementById('menu-mobile');
  const outside = [document.querySelector('main'), document.querySelector('.site-footer')];
  const desktop = window.matchMedia('(min-width: 64rem)');

  function setMenu(open, { returnFocus = true } = {}) {
    if (!toggle || !panel) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('[data-menu-label]').textContent = open ? 'Fechar' : 'Menu';
    panel.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    outside.forEach((el) => { if (el) el.inert = open; });
    // Foca no quadro seguinte, quando a visibility do painel já virou "visible".
    if (open) requestAnimationFrame(() => panel.querySelector('a')?.focus());
    else if (returnFocus) toggle.focus();
  }

  toggle?.addEventListener('click', () => {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  panel?.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false, { returnFocus: false });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel?.classList.contains('is-open')) setMenu(false);
  });
  desktop.addEventListener('change', (e) => {
    if (e.matches && panel?.classList.contains('is-open')) setMenu(false, { returnFocus: false });
  });

  /* Rolagem suave das âncoras (GSAP + ScrollToPlugin) ---------------------- */
  // Sem a CDN, o clique segue o salto nativo (scroll-padding-top desconta o cabeçalho).
  const gsap = window.gsap;
  const canTween = Boolean(gsap && window.ScrollToPlugin);
  if (canTween) gsap.registerPlugin(window.ScrollToPlugin);

  // Destino: o rótulo "N.0x" da seção, logo abaixo do cabeçalho, com o mesmo respiro em todas.
  function anchorY(section) {
    if (!section) return 0;
    const mark = section.querySelector('.eyebrow') || section;
    const gap = parseFloat(getComputedStyle(root).fontSize) * 2; // 2rem
    const y = mark.getBoundingClientRect().top + window.scrollY - header.offsetHeight - gap;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(Math.max(0, Math.round(y)), max);
  }

  function scrollToSection(hash) {
    const section = hash === '#topo' ? null : document.querySelector(hash);
    const y = anchorY(section);
    const distance = Math.abs(y - window.scrollY);
    // Percurso longo pede mais tempo; movimento interno usa ease-in-out.
    const duration = reduceMotion.matches ? 0 : gsap.utils.clamp(0.6, 1.4, 0.45 + distance / 3500);

    gsap.to(window, {
      duration,
      ease: 'power3.inOut',
      scrollTo: { y, autoKill: true }, // a roda do mouse da pessoa interrompe a animação
      overwrite: true,
      onComplete() {
        // Se algo mudou de altura durante o percurso, corrige no fim: cai sempre no lugar certo.
        const finalY = anchorY(section);
        if (Math.abs(finalY - window.scrollY) > 2) window.scrollTo(0, finalY);
        if (section) {
          section.setAttribute('tabindex', '-1');
          section.focus({ preventScroll: true });
        }
      },
    });

    history.pushState(null, '', section ? hash : window.location.pathname + window.location.search);
  }

  document.addEventListener('click', (e) => {
    if (!canTween || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href^="#"]');
    const hash = link?.getAttribute('href');
    if (!hash || hash === '#') return;
    // Só seções da página e o topo; o "Pular para o conteúdo" mantém o comportamento nativo.
    if (hash !== '#topo' && !document.querySelector(hash)?.matches('main > section')) return;
    e.preventDefault();
    scrollToSection(hash);
  });

  /* Links externos desativados (site demonstrativo) ------------------------ */
  const toast = document.querySelector('[data-toast]');
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-demo-link]')) return;
    e.preventDefault();
    showToast('Site demonstrativo: este link não leva a lugar nenhum.');
  });

  /* Seção atual na navegação ---------------------------------------------- */
  const navLinks = [...document.querySelectorAll('.nav__link, .mobile-nav__link')];
  const watched = [...document.querySelectorAll('main > section[id]')];
  if (hasIO && navLinks.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hash = `#${entry.target.id}`;
        navLinks.forEach((a) => {
          if (a.getAttribute('href') === hash) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    watched.forEach((s) => spy.observe(s));
  }

  /* Entrada por rolagem (uma vez) ------------------------------------------ */
  if (hasIO && !reduceMotion.matches) {
    root.classList.add('motion-ok');
    const reveal = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));
  }

  /* Portfólio: filtros ----------------------------------------------------- */
  const works = document.querySelector('.works');
  const toolbar = document.querySelector('[data-filters]');
  const filterBtns = [...document.querySelectorAll('.filter')];
  const countEl = document.querySelector('[data-count]');

  function applyFilter(value) {
    if (!works) return;
    filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === value)));
    works.dataset.activeFilter = value;

    const shown = [];
    works.querySelectorAll('.work').forEach((item) => {
      const match = value === 'all' || item.dataset.style === value;
      item.hidden = !match;
      if (match) shown.push(item);
    });

    if (countEl) countEl.textContent = `${shown.length} ${shown.length === 1 ? 'trabalho' : 'trabalhos'}`;

    if (!reduceMotion.matches) {
      shown.forEach((item, i) => {
        item.animate(
          [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, delay: i * 50, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' }
        );
      });
    }
  }

  if (works && toolbar) {
    toolbar.hidden = false;
    filterBtns.forEach((btn) => btn.addEventListener('click', () => applyFilter(btn.dataset.filter)));
    document.querySelectorAll('[data-filter-link]').forEach((a) => {
      a.addEventListener('click', () => applyFilter(a.dataset.filterLink));
    });
  }

  /* Portfólio: visualizador ----------------------------------------------- */
  const dialog = document.getElementById('lightbox');
  if (works && dialog && typeof dialog.showModal === 'function') {
    const lbImg = dialog.querySelector('.lightbox__img');
    const lbTitle = dialog.querySelector('[data-lb-title]');
    const lbMeta = dialog.querySelector('[data-lb-meta]');
    const lbCount = dialog.querySelector('[data-lb-count]');
    let list = [];
    let current = 0;
    let opener = null;

    const visibleWorks = () => [...works.querySelectorAll('.work:not([hidden])')];

    function show(index) {
      current = (index + list.length) % list.length;
      const item = list[current];
      const link = item.querySelector('.work__open');
      const thumb = link.querySelector('img');

      lbImg.src = link.getAttribute('href');
      lbImg.alt = thumb.alt;
      lbImg.width = thumb.width;
      lbImg.height = thumb.height;
      lbTitle.textContent = item.querySelector('.work__title').textContent;
      lbMeta.textContent = `${item.querySelector('.work__meta').textContent} · ${item.querySelector('.work__year').textContent}`;
      lbCount.textContent = `${pad(current + 1)} / ${pad(list.length)}`;

      lbImg.classList.remove('is-entering');
      void lbImg.offsetWidth; // reinicia a animação de troca
      lbImg.classList.add('is-entering');
    }

    works.addEventListener('click', (e) => {
      const link = e.target.closest('.work__open');
      if (!link) return;
      e.preventDefault();
      opener = link;
      list = visibleWorks();
      show(list.indexOf(link.closest('.work')));
      dialog.showModal();
    });

    dialog.addEventListener('click', (e) => {
      const action = e.target.closest('[data-lb]')?.dataset.lb;
      if (action === 'prev') show(current - 1);
      else if (action === 'next') show(current + 1);
      else if (action === 'close' || e.target.matches('[data-lb-backdrop], .lightbox__figure')) dialog.close();
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    });

    dialog.addEventListener('close', () => {
      lbImg.removeAttribute('src');
      opener?.focus();
    });
  }

  /* Formulário de agendamento (envio simulado) ----------------------------- */
  const form = document.getElementById('form-agendamento');
  if (!form) return;

  const submitBtn = form.querySelector('[type="submit"]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const statusEl = form.querySelector('.form__status');
  const groups = [...form.querySelectorAll('fieldset.form__group')];
  const MIN_IDEA = 20;
  let busy = false;

  // Tolerante na entrada (Postel): telefone com ou sem traço, espaço, parênteses ou +55.
  const rules = {
    nome: (el) => el.value.trim().length >= 2 || 'Informe seu nome.',
    email: (el) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())
      || 'Informe um e-mail válido, como nome@exemplo.com.',
    telefone: (el) => {
      const digits = el.value.replace(/\D/g, '');
      return !digits || digits.length >= 10 || 'Confira o número: inclua o DDD, como 11 91234-5678.';
    },
    ideia: (el) => {
      const missing = MIN_IDEA - el.value.trim().length;
      return missing <= 0 || `Conte um pouco mais da ideia: faltam ${missing} ${missing === 1 ? 'caractere' : 'caracteres'}.`;
    },
    maioridade: (el) => el.checked || 'Confirme que você tem 18 anos ou mais.',
  };

  function setError(el, message) {
    const field = el.closest('.field');
    const errorEl = document.getElementById(`${el.id}-erro`);
    field?.classList.toggle('is-invalid', Boolean(message));
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.hidden = !message;
      errorEl.innerHTML = message ? `${icon('i-alert')}<span></span>` : '';
      if (message) errorEl.querySelector('span').textContent = message;
    }
  }

  function check(el) {
    const rule = rules[el.name];
    if (!rule) return true;
    const result = rule(el);
    setError(el, result === true ? '' : result);
    return result === true;
  }

  // Valida ao sair do campo; depois do primeiro erro, revalida a cada digitação.
  Object.keys(rules).forEach((name) => {
    const el = form.elements[name];
    if (!el) return;
    el.addEventListener('blur', () => { if (el.type !== 'checkbox' && el.value) check(el); });
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      if (el.getAttribute('aria-invalid') === 'true') check(el);
    });
  });

  function setBusy(state) {
    busy = state;
    submitBtn.setAttribute('aria-busy', String(state));
    submitBtn.setAttribute('aria-disabled', String(state));
    submitLabel.textContent = state ? 'Enviando…' : 'Enviar ideia';
    groups.forEach((g) => { g.disabled = state; });
  }

  function showStatus(message, note) {
    statusEl.dataset.type = 'success';
    statusEl.innerHTML = `${icon('i-check')}<div><p></p><p class="form__status-note"></p></div>`;
    const [msgEl, noteEl] = statusEl.querySelectorAll('p');
    msgEl.textContent = message;
    noteEl.textContent = note;
    statusEl.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;

    const fields = Object.keys(rules).map((n) => form.elements[n]).filter(Boolean);
    const invalid = fields.filter((el) => !check(el));
    if (invalid.length) {
      statusEl.hidden = true;
      invalid[0].focus();
      return;
    }

    // Nada sai do navegador: só o estado de carregamento e a confirmação.
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    setBusy(false);
    form.reset();
    showStatus('Ideia recebida! Respondemos em até 48 horas úteis.', 'Site demonstrativo: nenhum dado foi enviado.');
  });
})();
