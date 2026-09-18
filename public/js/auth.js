/* +Sports · auth.js
   Gerencia sessão do usuário via localStorage.
   Inclua este script em todas as páginas com nav completa. */

(function () {

  // ── Utilitários públicos (usados em login.html e cadastro.html) ────────────
  window.SportsAuth = {
    setUser:  function (d) { try { localStorage.setItem('sportsUser', JSON.stringify(d)); } catch (_) {} },
    getUser:  function ()  { try { return JSON.parse(localStorage.getItem('sportsUser') || 'null'); } catch (_) { return null; } },
    clearUser:function ()  { try { localStorage.removeItem('sportsUser'); } catch (_) {} },
  };

  var user = window.SportsAuth.getUser();
  if (!user) return;

  // ── Nome: prefere profileData.name (tela de perfil) sobre sportsUser.nome ──
  function getDisplayName() {
    try {
      var pd = JSON.parse(localStorage.getItem('profileData') || 'null');
      if (pd && pd.name && pd.name.trim()) return pd.name.trim();
    } catch (_) {}
    return (user.nome || 'Usuário').trim();
  }

  function initials(nome) {
    var p = (nome || '').trim().split(/\s+/);
    return (((p[0] || '')[0] || '') + ((p[1] || '')[0] || '')).toUpperCase() || '?';
  }

  function logout() {
    window.SportsAuth.clearUser();
    window.location.href = 'login.html';
  }

  function run() {
    var header = document.querySelector('header');
    if (!header) return;

    var name      = getDisplayName();
    var firstName = name.split(/\s+/)[0];
    var INI       = initials(name);

    // ── Desktop widget ────────────────────────────────────────────────────────
    var dLogin  = header.querySelector('a[href="login.html"][class*="hidden"], a[href="telaPerfil.html"][class*="hidden"]');
    var dSignup = header.querySelector('a[href="cadastro.html"][class*="hidden"]');

    if (dLogin)  dLogin.style.display  = 'none';
    if (dSignup) dSignup.style.display = 'none';

    if ((dLogin || dSignup) && !document.getElementById('authWidget')) {
      // Widget (trigger button) — vai para o nav
      var w = document.createElement('div');
      w.id = 'authWidget';
      w.style.cssText = 'align-items:center;position:relative;';

      // Responsividade via matchMedia (evita depender do Tailwind CDN em
      // elementos criados dinamicamente após a varredura inicial)
      var mq = window.matchMedia('(min-width:768px)');
      function syncWidget(e) { w.style.display = e.matches ? 'flex' : 'none'; }
      syncWidget(mq);
      if (mq.addEventListener) mq.addEventListener('change', syncWidget);
      else if (mq.addListener) mq.addListener(syncWidget);

      w.innerHTML =
        '<button id="authUserBtn" style="display:flex;align-items:center;gap:8px;padding:6px 10px;' +
        'border-radius:12px;background:transparent;border:none;cursor:pointer;transition:background .15s;" ' +
        'onmouseover="this.style.background=\'#1f2024\'" onmouseout="this.style.background=\'transparent\'">' +
          '<div style="width:28px;height:28px;border-radius:50%;background:#bef264;color:#0c0c0e;font-size:11px;' +
          'font-weight:700;font-family:\'JetBrains Mono\',monospace;display:flex;align-items:center;' +
          'justify-content:center;flex-shrink:0;">' + INI + '</div>' +
          '<span style="font-size:14px;color:#f3f3f3;font-family:\'Barlow\',sans-serif;font-weight:500;' +
          'max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + firstName + '</span>' +
          '<svg style="width:12px;height:12px;color:#9ca39e;flex-shrink:0;" fill="none" viewBox="0 0 24 24"' +
          ' stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>' +
        '</button>';

      // Dropdown — vai direto no <body> para ficar FORA do stacking context
      // do header (z-50). Sem isso, páginas com Leaflet (z-index 400-800 na
      // raiz) ficam acima do dropdown, bloqueando cliques.
      var dd = document.createElement('div');
      dd.id = 'authDropdown';
      dd.style.cssText =
        'display:none;flex-direction:column;position:fixed;width:180px;' +
        'background:#161618;border:1px solid rgba(255,255,255,.1);border-radius:12px;' +
        'box-shadow:0 20px 40px rgba(0,0,0,.75);overflow:hidden;z-index:99999;';
      dd.innerHTML =
        '<a id="authProfileLink" href="telaPerfil.html" style="display:flex;align-items:center;gap:10px;' +
        'padding:12px 16px;font-size:14px;color:#f3f3f3;font-family:\'Barlow\',sans-serif;text-decoration:none;' +
        'transition:background .15s,color .15s;" ' +
        'onmouseover="this.style.background=\'#1f2024\';this.style.color=\'#bef264\'" ' +
        'onmouseout="this.style.background=\'\';this.style.color=\'#f3f3f3\'">' +
          '<svg style="width:16px;height:16px;color:#9ca39e;flex-shrink:0;" fill="none" viewBox="0 0 24 24"' +
          ' stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round"' +
          ' d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>' +
        'Meu Perfil</a>' +
        '<div style="border-top:1px solid rgba(255,255,255,.08);"></div>' +
        '<button id="authLogoutBtn" style="width:100%;display:flex;align-items:center;gap:10px;' +
        'padding:12px 16px;font-size:14px;color:#f87171;font-family:\'Barlow\',sans-serif;' +
        'background:transparent;border:none;cursor:pointer;text-align:left;transition:background .15s;" ' +
        'onmouseover="this.style.background=\'#1f2024\'" onmouseout="this.style.background=\'transparent\'">' +
          '<svg style="width:16px;height:16px;flex-shrink:0;" fill="none" viewBox="0 0 24 24"' +
          ' stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round"' +
          ' d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>' +
        'Sair</button>';

      document.body.appendChild(dd);

      var hamburger = header.querySelector('#btnMenu');
      var parent    = (dSignup || dLogin).parentElement;
      if (hamburger && hamburger.parentElement === parent) parent.insertBefore(w, hamburger);
      else parent.appendChild(w);

      // Abre/fecha dropdown posicionado sob o botão
      document.getElementById('authUserBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        if (dd.style.display !== 'none') {
          dd.style.display = 'none';
          return;
        }
        var rect = this.getBoundingClientRect();
        dd.style.top   = (rect.bottom + 6) + 'px';
        dd.style.right = (window.innerWidth - rect.right) + 'px';
        dd.style.left  = 'auto';
        dd.style.display = 'flex';
      });

      // Fecha ao clicar fora
      document.addEventListener('click', function (e) {
        if (!w.contains(e.target) && e.target !== dd && !dd.contains(e.target)) {
          dd.style.display = 'none';
        }
      });

      // "Meu Perfil" — navegação explícita para garantir funcionamento
      document.getElementById('authProfileLink').addEventListener('click', function (e) {
        e.preventDefault();
        dd.style.display = 'none';
        window.location.href = 'telaPerfil.html';
      });

      document.getElementById('authLogoutBtn').addEventListener('click', logout);
    }

    // ── Mobile drawer ─────────────────────────────────────────────────────────
    var mobile = document.getElementById('menuMobile');
    if (!mobile) return;

    var mLogin  = mobile.querySelector('a[href="login.html"]:not([id]), a[href="telaPerfil.html"]:not(.bg-lime)');
    var mSignup = mobile.querySelector('a[href="cadastro.html"]');

    if (mLogin)  mLogin.style.display  = 'none';
    if (mSignup) mSignup.style.display = 'none';

    if ((mLogin || mSignup) && !document.getElementById('authMobileSlot')) {
      var slot = document.createElement('div');
      slot.id = 'authMobileSlot';
      slot.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
      slot.innerHTML =
        '<a href="telaPerfil.html" style="display:flex;align-items:center;gap:8px;font-size:14px;' +
        'color:#f3f3f3;font-family:\'Barlow\',sans-serif;font-weight:500;text-decoration:none;padding:2px 0;">' +
          '<div style="width:24px;height:24px;border-radius:50%;background:#bef264;color:#0c0c0e;font-size:10px;' +
          'font-weight:700;font-family:\'JetBrains Mono\',monospace;display:flex;align-items:center;' +
          'justify-content:center;flex-shrink:0;">' + INI + '</div>' +
          firstName +
        '</a>' +
        '<button id="authLogoutMobile" style="background:transparent;border:none;font-size:14px;color:#f87171;' +
        'font-family:\'Barlow\',sans-serif;text-align:left;cursor:pointer;padding:2px 0;">Sair</button>';

      var hr = mobile.querySelector('hr');
      if (hr) mobile.insertBefore(slot, hr);
      else    mobile.appendChild(slot);

      document.getElementById('authLogoutMobile').addEventListener('click', logout);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

})();
