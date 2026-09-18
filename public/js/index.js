/* ============================================================
   +SPORTS — index.js
   JS específico da Home (index.html).
   Depende do Leaflet (carregado antes deste script no HTML).
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. GERADOR DO CALENDÁRIO ──────────────────────────────
  const calGrid = document.getElementById('calendario-grid');
  if (calGrid) {
    let html = '';
    const eventDays = [21, 28];
    const pastEventDays = [7, 14, 6, 19, 20, 13];

    // Junho 2026 começa na segunda-feira (índice 1)
    for (let i = 0; i < 1; i++) html += '<span></span>';
    for (let d = 1; d <= 30; d++) {
      const isEvent = eventDays.includes(d);
      const isPastEvent = pastEventDays.includes(d);
      if (isEvent) {
        html += `<span class="flex items-center justify-center h-6 rounded-md bg-zinc-800 text-lime font-bold font-mono text-[10px] cursor-pointer hover:bg-lime hover:text-zinc-900 transition-colors">${d}</span>`;
      } else if (isPastEvent) {
        html += `<span class="flex items-center justify-center h-6 rounded-md bg-zinc-800 text-white/80 font-semibold font-mono text-[10px] cursor-pointer hover:bg-lime hover:text-zinc-900 transition-colors">${d}</span>`;
      } else {
        html += `<span class="flex items-center justify-center h-6 rounded-md text-muted font-mono text-[10px] hover:bg-secondary cursor-pointer transition-colors">${d}</span>`;
      }
    }
    calGrid.innerHTML = html;
  }


  // ── 2. SLIDESHOW DO HERO BANNER ───────────────────────────
  const heroData = [
    {
      titulo: '2ª Corrida do Clube Comercial',
      sub:    '16 de Agosto · Volta Redonda, RJ · 5K',
      badge:  'INSCRIÇÕES ABERTAS',
      aberta: true,
      data:   new Date('2026-08-16T07:30:00'),
    },
    {
      titulo: 'Boltz Run 5K',
      sub:    '21 de Junho · Barra do Piraí, RJ · 5K',
      badge:  'INSCRIÇÕES ABERTAS',
      aberta: true,
      data:   new Date('2026-06-21T07:30:00'),
    },
    {
      titulo: 'Royal Night Run Resende',
      sub:    '08 de Agosto · Resende, RJ · 5K',
      badge:  'INSCRIÇÕES ABERTAS',
      aberta: true,
      data:   new Date('2026-08-08T19:30:00'),
    },
    {
      titulo: 'Corrida do Malte',
      sub:    '10 de Outubro · Bananal, SP · 5K',
      badge:  'INSCRIÇÕES ABERTAS',
      aberta: true,
      data:   new Date('2026-10-10T19:00:00'),
    },
  ];

  const slides = document.querySelectorAll('.slide');
  const dots   = document.querySelectorAll('.slide-dot');
  let current  = 0;
  let timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].style.cssText =
      'width:6px;height:6px;border-radius:9999px;background:rgba(255,255,255,0.3);transition:all .3s;';

    current = idx;

    slides[current].classList.add('active');
    dots[current].style.cssText =
      'width:24px;height:6px;border-radius:9999px;background:#bef264;transition:all .3s;';

    const d = heroData[current];
    document.getElementById('hero-title').textContent = d.titulo;
    document.getElementById('hero-sub').textContent   = d.sub;
    document.getElementById('hero-badge').innerHTML   =
      `<span class="w-1.5 h-1.5 rounded-full bg-lime ${d.aberta ? 'live-pin' : ''}"></span> ${d.badge}`;

    updateCountdown();
  }

  dots.forEach((dot, i) =>
    dot.addEventListener('click', () => {
      clearInterval(timer);
      goTo(i);
      startTimer();
    })
  );

  function startTimer() {
    timer = setInterval(() => goTo((current + 1) % slides.length), 5000);
  }
  startTimer();


  // ── 3. COUNTDOWN ─────────────────────────────────────────
  function updateCountdown() {
    const diff = heroData[current].data - new Date();
    if (diff <= 0) {
      ['cd-dias', 'cd-hrs', 'cd-min'].forEach(
        id => (document.getElementById(id).textContent = '00')
      );
      return;
    }
    document.getElementById('cd-dias').textContent =
      String(Math.floor(diff / 86400000)).padStart(2, '0');
    document.getElementById('cd-hrs').textContent =
      String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
    document.getElementById('cd-min').textContent =
      String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 60000);


  // ── 4. FILTROS DE EVENTOS ─────────────────────────────────
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => {
        b.classList.remove('bg-lime', 'text-zinc-900');
        b.classList.add('border', 'border-white/20', 'text-muted');
      });
      btn.classList.add('bg-lime', 'text-zinc-900');
      btn.classList.remove('border', 'border-white/20', 'text-muted');
    });
  });


  // ── 5. MINI MAPA — ASIDE (Joga Junto) ────────────────────
  const sportIcons = {
    society: 'img/pins/pin-society.svg',
    volei: 'img/pins/pin-volei.svg',
    basquete: 'img/pins/pin-basquete.svg',
    corrida: 'img/pins/pin-corrida.svg',
    ciclismo: 'img/pins/pin-bicicleta.svg',
    tenis: 'img/pins/pin-tenis.svg',
    futebol: 'img/pins/pin-futebol.svg',
    raquete: 'img/pins/pin-raquete.svg',
    beachTennis: 'img/pins/pin-raqueteCorpo.svg',
    natacao: 'img/pins/pin-natacao.svg',
    trilha: 'img/pins/pin-trilha.svg',
    montanha: 'img/pins/pin-montanha.svg',
    kart: 'img/pins/pin-capacete.svg',
    default: 'img/pins/pin-base.svg',
  };

  const statusLabels = {
    available: 'Com vagas',
    reserve: 'Reservas',
    unavailable: 'Completo',
  };

  const mapPlaces = [
    {
      title: 'Pelada de Domingo',
      sport: 'society',
      status: 'available',
      coords: [-22.508, -44.097],
    },
    {
      title: 'Vôlei no Aterrado',
      sport: 'volei',
      status: 'reserve',
      coords: [-22.502, -44.084],
    },
    {
      title: 'Basquete Livre',
      sport: 'basquete',
      status: 'unavailable',
      coords: [-22.504, -44.071],
    },
    {
      title: 'Treino de Corrida',
      sport: 'corrida',
      status: 'available',
      coords: [-22.537, -44.075],
    },
    {
      title: 'Pedal Urbano',
      sport: 'ciclismo',
      status: 'reserve',
      coords: [-22.524, -44.101],
    },
    {
      title: 'Tênis de Quadra',
      sport: 'tenis',
      status: 'unavailable',
      coords: [-22.514, -44.094],
    },
  ];

  function escapeAttr(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[char]);
  }

  function createSportsPin(place, variant = 'default') {
    const isMini = variant === 'mini';
    const selectedClass = place.selected ? ' is-selected' : '';
    const miniClass = isMini ? ' sports-map-pin--mini' : '';
    const icon = sportIcons[place.sport] || sportIcons.default;
    const title = `${place.title} - ${statusLabels[place.status]}`;

    return L.divIcon({
      html: `
        <div class="sports-map-pin sports-map-pin--${place.status}${miniClass}${selectedClass}" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}">
          <span class="sports-map-pin__drop"></span>
          <span class="sports-map-pin__icon">
            <img src="${icon}" alt="${escapeAttr(place.sport)}" />
          </span>
        </div>
      `,
      className: 'sports-map-marker',
      iconSize: isMini ? [30, 38] : [44, 56],
      iconAnchor: isMini ? [15, 37] : [22, 55],
    });
  }

  function selectMapPin(markerEntries, selectedEntry) {
    markerEntries.forEach(entry => {
      const pin = entry.marker.getElement()?.querySelector('.sports-map-pin');
      pin?.classList.toggle('is-selected', entry === selectedEntry);
      entry.marker.setZIndexOffset(entry === selectedEntry ? 1000 : 0);
    });
  }

  if (document.getElementById('mini-map-aside')) {
    const miniMap = L.map('mini-map-aside', {
      zoomControl:       false,
      dragging:          false,
      scrollWheelZoom:   false,
      doubleClickZoom:   false,
      attributionControl: false,
    }).setView([-22.508, -44.092], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(miniMap);

    mapPlaces.forEach(place => {
      L.marker(place.coords, {
        icon: createSportsPin(place, 'mini'),
        interactive: false,
      }).addTo(miniMap);
    });
  }


  // ── 6. MAPA GRANDE — SEÇÃO JOGA JUNTO ────────────────────
  if (document.getElementById('joga-map')) {
    const jogaMap = L.map('joga-map', {
      zoomControl:        false,
      attributionControl: false,
    }).setView([-22.508, -44.092], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(jogaMap);

    const markerEntries = mapPlaces.map(place => ({
      place,
      marker: L.marker(place.coords, {
        icon: createSportsPin(place),
        riseOnHover: true,
      }).addTo(jogaMap),
    }));

    markerEntries.forEach(entry => {
      entry.marker.on('click', () => selectMapPin(markerEntries, entry));
    });

    const selectedEntry = markerEntries.find(entry => entry.place.selected) || markerEntries[0];
    selectMapPin(markerEntries, selectedEntry);
  }

});
