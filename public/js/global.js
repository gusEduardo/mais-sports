(() => {
  const THEME_KEY = 'sportsTheme';
  const DARK = 'dark';
  const LIGHT = 'light';
  const DARK_LOGO = 'img/logo.svg';
  const LIGHT_LOGO = 'img/logoClaro.svg';
  const eventLinkSelector = '[data-event-link]';
  const interactiveSelector = 'a, button, input, select, textarea, label, summary, [data-no-nav]';

  const getStoredTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY) === LIGHT ? LIGHT : DARK;
    } catch {
      return DARK;
    }
  };

  const updateToggleState = theme => {
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const nextTheme = theme === DARK ? LIGHT : DARK;
      button.setAttribute('aria-label', `Alternar para modo ${nextTheme === LIGHT ? 'claro' : 'escuro'}`);
      button.setAttribute('title', `Modo ${nextTheme === LIGHT ? 'claro' : 'escuro'}`);
    });
  };

  const applyTheme = (theme, shouldStore = true) => {
    const normalizedTheme = theme === LIGHT ? LIGHT : DARK;
    const root = document.documentElement;

    root.dataset.theme = normalizedTheme;
    root.classList.toggle(DARK, normalizedTheme === DARK);
    root.classList.toggle(LIGHT, normalizedTheme === LIGHT);
    root.style.colorScheme = normalizedTheme;

    if (shouldStore) {
      try {
        localStorage.setItem(THEME_KEY, normalizedTheme);
      } catch {
        // Local storage can be unavailable in stricter browser contexts.
      }
    }

    updateToggleState(normalizedTheme);
    updateThemeLogos(normalizedTheme);
  };

  const updateThemeLogos = theme => {
    document.querySelectorAll('img[alt="+Sports"]').forEach(logo => {
      if (!logo.dataset.darkLogo) {
        logo.dataset.darkLogo = DARK_LOGO;
        logo.dataset.lightLogo = LIGHT_LOGO;
      }

      logo.src = theme === LIGHT ? logo.dataset.lightLogo : logo.dataset.darkLogo;
    });
  };

  const injectThemeStyles = () => {
    if (document.getElementById('sports-theme-styles')) return;

    const style = document.createElement('style');
    style.id = 'sports-theme-styles';
    style.textContent = `
      html {
        transition: background-color 180ms ease, color 180ms ease;
      }

      html[data-theme="light"] {
        --color-zinc950: #f4f7ef;
        --color-surface: #ffffff;
        --color-secondary: #e8eee1;
        --color-fg: #141712;
        --color-muted: #63705f;
        --color-lime: #84cc16;
        --color-lime-hover: #65a30d;
      }

      html[data-theme="light"] body {
        background-color: var(--color-zinc950);
        color: var(--color-fg);
      }

      html[data-theme="light"] header,
      html[data-theme="light"] footer,
      html[data-theme="light"] #menuMobile {
        background-color: rgba(244, 247, 239, 0.94) !important;
      }

      html[data-theme="light"] .bg-zinc950\\/90 {
        background-color: rgba(244, 247, 239, 0.92) !important;
      }

      html[data-theme="light"] .bg-zinc950\\/80,
      html[data-theme="light"] .bg-zinc950\\/85 {
        background-color: rgba(244, 247, 239, 0.82) !important;
      }

      html[data-theme="light"] .border-white\\/5,
      html[data-theme="light"] .border-white\\/10,
      html[data-theme="light"] .border-white\\/15,
      html[data-theme="light"] .border-white\\/20,
      html[data-theme="light"] .border-white\\/30 {
        border-color: rgba(20, 23, 18, 0.12) !important;
      }

      html[data-theme="light"] .bg-white\\/5 {
        background-color: rgba(20, 23, 18, 0.04) !important;
      }

      html[data-theme="light"] .bg-white\\/10 {
        background-color: rgba(20, 23, 18, 0.07) !important;
      }

      html[data-theme="light"] .theme-image-media {
        opacity: 1 !important;
      }

      html[data-theme="light"] .theme-image-scrim {
        opacity: 0.16 !important;
      }

      html[data-theme="light"] .theme-card-edge-scrim {
        opacity: 0.08 !important;
      }

      html[data-theme="light"] .input-field,
      html[data-theme="light"] .select-field {
        background: #ffffff !important;
        border-color: rgba(20, 23, 18, 0.14) !important;
        color: #1f271d !important;
      }

      html[data-theme="light"] .input-field::placeholder {
        color: #7b8677 !important;
      }

      html[data-theme="light"] .input-field:focus,
      html[data-theme="light"] .select-field:focus {
        border-color: rgba(132, 204, 22, 0.62) !important;
        box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.14) !important;
      }

      html[data-theme="light"] .select-field option {
        background: #ffffff !important;
        color: #1f271d !important;
      }

      html[data-theme="light"] .sport-chip label {
        background: #ffffff !important;
        border-color: rgba(20, 23, 18, 0.14) !important;
        color: #63705f !important;
      }

      html[data-theme="light"] .sport-chip input:checked + label {
        background: rgba(132, 204, 22, 0.13) !important;
        border-color: #84cc16 !important;
        color: #4d7c0f !important;
      }

      html[data-theme="light"] .strength-bar {
        background: rgba(20, 23, 18, 0.12) !important;
      }

      html[data-theme="light"] #authUserBtn span,
      html[data-theme="light"] #authMobileSlot a {
        color: #141712 !important;
      }

      html[data-theme="light"] #authUserBtn:hover {
        background: #e8eee1 !important;
      }

      html[data-theme="light"] #authDropdown {
        background: #ffffff !important;
        border-color: rgba(20, 23, 18, 0.14) !important;
        box-shadow: 0 20px 40px rgba(20, 23, 18, 0.16) !important;
      }

      html[data-theme="light"] #authProfileLink {
        color: #141712 !important;
      }

      html[data-theme="light"] #authProfileLink:hover,
      html[data-theme="light"] #authLogoutBtn:hover {
        background: #e8eee1 !important;
      }

      .site-theme-toggle {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
      }

      .site-theme-toggle img {
        width: 1rem;
        height: 1rem;
        pointer-events: none;
      }

      html[data-theme="dark"] .theme-icon-moon,
      html[data-theme="light"] .theme-icon-sun {
        display: none;
      }

      html[data-theme="dark"] .theme-icon-sun,
      html[data-theme="light"] .theme-icon-moon {
        display: block;
      }

      html[data-theme="dark"] .theme-icon-sun {
        filter: invert(96%) sepia(7%) saturate(105%) hue-rotate(45deg) brightness(110%) contrast(92%);
        opacity: 0.92;
      }

      html[data-theme="light"] .theme-icon-moon {
        opacity: 0.78;
      }

      .site-theme-toggle--floating {
        position: fixed;
        top: 0.875rem;
        right: 0.875rem;
        z-index: 80;
      }

      .site-search {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.5rem;
        border: 1px solid rgb(255 255 255 / 0.1);
        background-color: var(--color-surface);
        color: var(--color-fg);
        overflow: hidden;
        transition: width 220ms ease, border-color 180ms ease, background-color 180ms ease;
      }

      .site-search:hover,
      .site-search:focus-within {
        width: min(11rem, 28vw);
        border-color: color-mix(in srgb, var(--color-lime) 55%, transparent);
      }

      .site-search-icon {
        width: 2.125rem;
        height: 2.125rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        color: var(--color-muted);
      }

      .site-search-input {
        min-width: 0;
        width: 8.5rem;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--color-fg);
        font-size: 0.875rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease;
      }

      .site-search:hover .site-search-input,
      .site-search:focus-within .site-search-input {
        opacity: 1;
        pointer-events: auto;
      }

      .site-search-input::placeholder {
        color: var(--color-muted);
      }
    `;

    document.head.appendChild(style);
  };

  const createThemeToggle = () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.themeToggle = 'true';
    button.className = 'site-theme-toggle border border-white/15 bg-surface text-fg hover:border-lime/60 hover:text-lime transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60';
    button.innerHTML = `
      <img src="img/sol.svg" alt="" class="theme-icon-sun" aria-hidden="true" />
      <img src="img/lua.svg" alt="" class="theme-icon-moon" aria-hidden="true" />
    `;

    button.addEventListener('click', () => {
      const currentTheme = document.documentElement.dataset.theme === LIGHT ? LIGHT : DARK;
      applyTheme(currentTheme === DARK ? LIGHT : DARK);
    });

    updateToggleState(document.documentElement.dataset.theme || DARK);
    return button;
  };

  const ensureThemeToggle = () => {
    const headers = Array.from(document.querySelectorAll('header')).filter(header =>
      header.querySelector('nav') || header.querySelector('#btnMenu') || header.querySelector('img[alt="+Sports"]')
    );

    if (!headers.length) {
      if (document.querySelector('[data-theme-toggle]')) return;
      const floatingToggle = createThemeToggle();
      floatingToggle.classList.add('site-theme-toggle--floating');
      document.body.appendChild(floatingToggle);
      updateToggleState(document.documentElement.dataset.theme || DARK);
      return;
    }

    headers.forEach(header => {
      if (header.querySelector('[data-theme-toggle]')) return;

      const toggle = createThemeToggle();
      const menuButton = header.querySelector('#btnMenu');
      const authAction = header.querySelector('a[href="login.html"], a[href="./login.html"], a[href="cadastro.html"], a[href="./cadastro.html"], #logoutBtn');
      const navControls = menuButton?.parentElement || authAction?.parentElement || header.querySelector('nav') || header;

      if (authAction?.parentElement) {
        authAction.parentElement.insertBefore(toggle, authAction);
      } else if (menuButton?.parentElement) {
        menuButton.parentElement.insertBefore(toggle, menuButton);
      } else {
        navControls.appendChild(toggle);
      }
    });

    updateToggleState(document.documentElement.dataset.theme || DARK);
  };

  const enhanceHeaderSearch = () => {
    document.querySelectorAll('header input[placeholder="Pesquisar..."]').forEach(input => {
      if (input.closest('.site-search')) return;

      const wrapper = document.createElement('label');
      wrapper.className = 'site-search hidden lg:flex items-center cursor-text';
      wrapper.setAttribute('aria-label', 'Pesquisar');

      const icon = document.createElement('span');
      icon.className = 'site-search-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      `;

      input.parentElement.insertBefore(wrapper, input);
      input.className = 'site-search-input';
      input.type = 'search';
      wrapper.appendChild(icon);
      wrapper.appendChild(input);
    });
  };

  const initMobileMenu = () => {
    const btnMenu = document.getElementById('btnMenu');
    const menuMobile = document.getElementById('menuMobile');

    if (!btnMenu || !menuMobile) return;

    btnMenu.addEventListener('click', () => {
      menuMobile.classList.toggle('hidden');
    });

    menuMobile.querySelectorAll('a').forEach(anchor => {
      anchor.addEventListener('click', () => menuMobile.classList.add('hidden'));
    });
  };

  const initEventLinks = () => {
    document.querySelectorAll(eventLinkSelector).forEach(surface => {
      if (surface.dataset.eventLinkBound === 'true') return;

      const navigateToEvent = () => {
        const targetUrl = surface.getAttribute('data-event-link');
        if (targetUrl) window.location.href = targetUrl;
      };

      surface.addEventListener('click', event => {
        if (event.target.closest(interactiveSelector)) return;
        navigateToEvent();
      });

      surface.addEventListener('keydown', event => {
        if (event.target !== surface) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        navigateToEvent();
      });

      surface.dataset.eventLinkBound = 'true';
    });
  };

  injectThemeStyles();
  applyTheme(getStoredTheme(), false);

  document.addEventListener('DOMContentLoaded', () => {
    injectThemeStyles();
    enhanceHeaderSearch();
    ensureThemeToggle();
    updateThemeLogos(document.documentElement.dataset.theme || DARK);
    initMobileMenu();
    initEventLinks();
  });
})();
