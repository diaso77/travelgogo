/**
 * TravelGoGo - Core Application Logic
 * Features:
 * - 30-min vertical timeline calculation
 * - Multi-day switching & dynamic day creation
 * - Drag and drop card rescheduling (drag up/down to adjust 30m slots)
 * - Overlap detection & visual side-by-side / offset layout
 * - Interactive Route Map: Target Nodes, sequential polylines, transport mode tags & Google Multi-stop Route URL
 * - Google Maps URL parsing & automatic interactive embed
 * - JSON LocalStorage persistence, import, export & share code
 * - Transport method selection between spots
 */

// Preset Theme Color Choices for cards
const COLOR_PRESETS = [
  '#38bdf8', // Ocean Sky Blue
  '#818cf8', // Indigo
  '#c084fc', // Lavender Purple
  '#34d399', // Emerald Mint
  '#fbbf24', // Warm Amber
  '#fb7185', // Rose Pink
  '#fb923c', // Sunset Coral
  '#2dd4bf'  // Cyan Turquoise
];

// Transport icons/emoji dictionary
const TRANSPORT_MAP = {
  subway: '🚇 地鐵/火車',
  walk: '🚶 步行',
  bus: '🚌 公車',
  taxi: '🚕 計程車',
  car: '🚗 自駕/租車'
};

// Known coordinates dictionary for instant mapping without geocoding delays
const KNOWN_GEO_DICT = {
  "羽田": [35.5494, 139.7798],
  "haneda": [35.5494, 139.7798],
  "新宿": [35.6909, 139.7003],
  "shinjuku": [35.6909, 139.7003],
  "敘敘苑": [35.6918, 139.7015],
  "jojoen": [35.6918, 139.7015],
  "明治神宮": [35.6764, 139.6993],
  "meiji": [35.6764, 139.6993],
  "shibuya sky": [35.6585, 139.7023],
  "澀谷": [35.6595, 139.7005],
  "shibuya": [35.6595, 139.7005],
  "淺草": [35.7148, 139.7967],
  "sensoji": [35.7148, 139.7967],
  "晴空塔": [35.7101, 139.8107],
  "skytree": [35.7101, 139.8107],
  "迪士尼": [35.6267, 139.8851],
  "disney": [35.6267, 139.8851],
  "銀座": [35.6719, 139.7640],
  "ginza": [35.6719, 139.7640],
  "六本木": [35.6628, 139.7313],
  "roppongi": [35.6628, 139.7313],
  "台北": [25.0330, 121.5654],
  "taipei": [25.0330, 121.5654]
};

// Default Initial Demo Itinerary (Tokyo 5 Days) with Geo-coordinates
const INITIAL_DEMO_DATA = {
  title: "東京探索自由行 5 天 4 夜",
  startDate: "2026-10-10",
  currentDayIndex: 0,
  days: [
    {
      dayNumber: 1,
      date: "2026-10-10",
      label: "抵達東京 & 新宿散策",
      cards: [
        {
          id: "card_1_1",
          title: "抵達羽田機場第3航廈",
          startTime: "09:00",
          endTime: "10:30",
          color: "#38bdf8",
          location: "東京羽田機場",
          lat: 35.5494,
          lng: 139.7798,
          mapLink: "https://maps.google.com/?q=Tokyo+Haneda+Airport",
          url: "https://tokyo-haneda.com/",
          transportType: "subway",
          transportNote: "搭乘東京單軌電車 (Monorail) 前往濱松町轉 JR 山手線",
          notes: "出關領乘車票卡 (Suica / Welcome Suica) 與租借 WiFi 機。"
        },
        {
          id: "card_1_2",
          title: "新宿飯店 Check-in & 放行李",
          startTime: "11:30",
          endTime: "12:30",
          color: "#818cf8",
          location: "新宿燦路都廣場大飯店",
          lat: 35.6882,
          lng: 139.6995,
          mapLink: "https://maps.google.com/?q=Hotel+Sunroute+Plaza+Shinjuku",
          url: "",
          transportType: "walk",
          transportNote: "飯店步行 3 分鐘即達新宿南口",
          notes: "櫃台先寄存大型行李，領取房卡準備輕裝出發。"
        },
        {
          id: "card_1_3",
          title: "午餐：敘敘苑燒肉 (新宿中央東口店)",
          startTime: "13:00",
          endTime: "14:30",
          color: "#fb923c",
          location: "敘敘苑 新宿中央東口店",
          lat: 35.6918,
          lng: 139.7015,
          mapLink: "https://maps.google.com/?q=Jojoen+Shinjuku",
          url: "https://www.jojoen.co.jp/",
          transportType: "walk",
          transportNote: "步行約 8 分鐘穿過新宿地下街",
          notes: "已預約超值商業午餐組合，高樓層景觀極佳！"
        },
        {
          id: "card_1_4",
          title: "明治神宮參道漫步",
          startTime: "15:00",
          endTime: "17:00",
          color: "#34d399",
          location: "明治神宮",
          lat: 35.6764,
          lng: 139.6993,
          mapLink: "https://maps.google.com/?q=Meiji+Jingu",
          url: "https://www.meijijingu.or.jp/",
          transportType: "subway",
          transportNote: "JR 山手線：新宿站 ➔ 原宿站 (4分鐘)",
          notes: "參拜祈福，欣賞大鳥居與森林林蔭步道。"
        },
        {
          id: "card_1_5",
          title: "SHIBUYA SKY 澀谷高空夜景",
          startTime: "17:30",
          endTime: "19:30",
          color: "#c084fc",
          location: "SHIBUYA SKY",
          lat: 35.6585,
          lng: 139.7023,
          mapLink: "https://maps.google.com/?q=Shibuya+Sky",
          url: "https://www.shibuya-scramble-square.com/sky/",
          transportType: "subway",
          transportNote: "JR 山手線：原宿站 ➔ 澀谷站 (3分鐘)",
          notes: "★ 預約票時間 17:40，需提早 10 分鐘報到，日落與夜景交替最美時刻！"
        }
      ]
    },
    {
      dayNumber: 2,
      date: "2026-10-11",
      label: "經典淺草與晴空塔",
      cards: [
        {
          id: "card_2_1",
          title: "淺草寺雷門 & 仲見世商店街",
          startTime: "09:30",
          endTime: "12:00",
          color: "#fb7185",
          location: "淺草寺 雷門",
          lat: 35.7118,
          lng: 139.7967,
          mapLink: "https://maps.google.com/?q=Sensoji+Temple",
          url: "https://www.senso-ji.jp/",
          transportType: "subway",
          transportNote: "東京地鐵銀座線直達淺草站",
          notes: "品嘗人形燒、炸肉餅、抹茶冰淇淋。"
        },
        {
          id: "card_2_2",
          title: "東京晴空塔展望台 & 晴空街道血拚",
          startTime: "12:30",
          endTime: "15:30",
          color: "#38bdf8",
          location: "東京晴空塔 Tokyo Skytree",
          lat: 35.7101,
          lng: 139.8107,
          mapLink: "https://maps.google.com/?q=Tokyo+Skytree",
          url: "https://www.tokyo-skytree.jp/",
          transportType: "walk",
          transportNote: "過隅田川水上步道 Sumida River Walk 步行約 15 分鐘",
          notes: "午餐在晴空街道吃六厘舍沾麵。"
        }
      ]
    },
    {
      dayNumber: 3,
      date: "2026-10-12",
      label: "東京迪士尼海洋一日遊",
      cards: [
        {
          id: "card_3_1",
          title: "東京迪士尼海洋 (Fantasy Springs 探險)",
          startTime: "08:30",
          endTime: "21:30",
          color: "#fbbf24",
          location: "Tokyo DisneySea",
          lat: 35.6267,
          lng: 139.8851,
          mapLink: "https://maps.google.com/?q=Tokyo+DisneySea",
          url: "https://www.tokyodisneyresort.jp/tc/tds/",
          transportType: "subway",
          transportNote: "搭乘 JR 京葉線至舞濱站，轉迪士尼度假區線單軌電車",
          notes: "入園立即抽取 DPA 與預約 Standby Pass！穿好走的運動鞋。"
        }
      ]
    },
    {
      dayNumber: 4,
      date: "2026-10-13",
      label: "銀座質感美學與六本木",
      cards: []
    },
    {
      dayNumber: 5,
      date: "2026-10-14",
      label: "最後伴手禮採買 & 返程",
      cards: []
    }
  ]
};

// Main State Container
class TripManager {
  constructor() {
    this.storageKey = 'travelgogo_itinerary_data';
    this.themeKey = 'travelgogo_theme';
    this.currentViewMode = 'timeline'; // 'timeline' | 'cards' | 'route'
    this.selectedTransportType = 'subway';
    this.selectedColor = COLOR_PRESETS[0];
    
    // Leaflet map instance
    this.leafletMap = null;
    this.mapLayersGroup = null;
    
    // Drag state
    this.draggedCardId = null;
    this.dragStartY = 0;
    this.dragStartSlot = 0;
    
    this.init();
  }

  init() {
    this.loadData();
    this.initTheme();
    this.setupEventListeners();
    this.renderAll();
    this.initLucide();
  }

  loadData() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse local storage data, using fallback demo", e);
        this.data = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
      }
    } else {
      this.data = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
      this.saveData();
    }
    if (typeof this.data.currentDayIndex !== 'number' || this.data.currentDayIndex >= this.data.days.length) {
      this.data.currentDayIndex = 0;
    }
  }

  saveData() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  initTheme() {
    const savedTheme = localStorage.getItem(this.themeKey) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(this.themeKey, next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      this.initLucide();
    }
  }

  initLucide() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  getCurrentDay() {
    return this.data.days[this.data.currentDayIndex] || this.data.days[0];
  }

  // --- Rendering Functions ---
  renderAll() {
    this.renderHeader();
    this.renderDayTabs();
    this.renderTimeRuler();
    this.renderSchedule();
    this.renderCardsList();
    if (this.currentViewMode === 'route') {
      this.renderRouteMap();
    }
    this.initLucide();
  }

  renderHeader() {
    const titleEl = document.getElementById('tripTitleDisplay');
    const datesEl = document.getElementById('tripDatesDisplay');
    titleEl.textContent = this.data.title;
    
    const count = this.data.days.length;
    datesEl.textContent = `${this.data.days[0]?.date || ''} - ${this.data.days[count - 1]?.date || ''} (${count} 天)`;
  }

  renderDayTabs() {
    const container = document.getElementById('dayTabsList');
    container.innerHTML = '';

    this.data.days.forEach((day, index) => {
      const tab = document.createElement('button');
      tab.className = `day-tab ${index === this.data.currentDayIndex ? 'active' : ''}`;
      tab.innerHTML = `<span>Day ${day.dayNumber}</span><small style="opacity:0.8">${day.date.slice(5)}</small>`;
      tab.addEventListener('click', () => {
        this.data.currentDayIndex = index;
        this.saveData();
        this.renderAll();
      });
      container.appendChild(tab);
    });

    const currentDay = this.getCurrentDay();
    document.getElementById('currentDayBadge').textContent = `Day ${currentDay.dayNumber}`;
    document.getElementById('currentDayDateText').textContent = currentDay.label || currentDay.date;
    document.getElementById('currentDayCardCount').textContent = `${currentDay.cards.length} 個行程`;
  }

  // Build 30-min time ruler from 06:00 to 24:00 (36 slots of 30 mins)
  renderTimeRuler() {
    const ruler = document.getElementById('timeRuler');
    ruler.innerHTML = '';
    
    for (let slot = 0; slot < 36; slot++) {
      const totalMinutes = (6 * 60) + (slot * 30);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      const slotEl = document.createElement('div');
      slotEl.className = `time-slot-label ${m === 0 ? 'hour-mark' : ''}`;
      slotEl.textContent = timeStr;
      ruler.appendChild(slotEl);
    }
  }

  // Helper to convert HH:MM to slot index (0 = 06:00)
  timeToSlot(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m;
    const startMinutes = 6 * 60; // 06:00
    const slot = (totalMinutes - startMinutes) / 30;
    return Math.max(0, Math.min(36, slot));
  }

  // Helper to convert slot index back to HH:MM string
  slotToTime(slot) {
    const totalMinutes = (6 * 60) + Math.round(slot * 30);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Render cards on the vertical canvas
  renderSchedule() {
    const canvas = document.getElementById('scheduleCanvas');
    canvas.innerHTML = '';

    const currentDay = this.getCurrentDay();
    const sortedCards = [...currentDay.cards].sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime));

    // Calculate layout for overlaps
    const layoutInfo = this.calculateOverlapLayout(sortedCards);

    sortedCards.forEach((card, index) => {
      const startSlot = this.timeToSlot(card.startTime);
      const endSlot = Math.max(startSlot + 1, this.timeToSlot(card.endTime));
      const durationSlots = endSlot - startSlot;

      const topPx = startSlot * 48; // 48px per slot
      const heightPx = Math.max(44, (durationSlots * 48) - 6);

      const cardEl = document.createElement('div');
      cardEl.className = 'activity-card';
      cardEl.id = `activity_${card.id}`;
      cardEl.dataset.cardId = card.id;
      cardEl.style.top = `${topPx}px`;
      cardEl.style.height = `${heightPx}px`;
      cardEl.style.borderLeftColor = card.color || '#38bdf8';

      // Apply overlap styling if overlapping
      const layout = layoutInfo[card.id];
      if (layout && layout.totalCols > 1) {
        const widthPercent = (100 / layout.totalCols) - 2;
        const leftPercent = layout.colIndex * (100 / layout.totalCols) + 1;
        cardEl.style.left = `${leftPercent}%`;
        cardEl.style.width = `${widthPercent}%`;
        cardEl.style.right = 'auto';
      }

      const transportLabel = TRANSPORT_MAP[card.transportType] || '';

      cardEl.innerHTML = `
        <div class="card-top">
          <div class="card-title-group">
            <h4 class="card-title">${card.title}</h4>
            <div class="card-time-span">
              <i data-lucide="clock" style="width:12px;height:12px;"></i>
              <span>${card.startTime} - ${card.endTime}</span>
            </div>
          </div>
          <div class="card-badges">
            ${card.mapLink ? `<span class="badge-icon-btn" title="有 Google 地圖定位"><i data-lucide="map-pin" style="width:13px;height:13px;"></i></span>` : ''}
            ${card.url ? `<span class="badge-icon-btn" title="有外鏈網站"><i data-lucide="link" style="width:13px;height:13px;"></i></span>` : ''}
          </div>
        </div>
        <div class="card-bottom">
          <span class="card-location">
            ${card.location ? `📍 ${card.location}` : '無特定地點'}
          </span>
          ${card.transportType ? `
            <span class="card-transport-badge" title="${card.transportNote || transportLabel}">
              ${transportLabel.split(' ')[0]}
            </span>
          ` : ''}
        </div>
      `;

      // Click to view details / edit
      cardEl.addEventListener('click', (e) => {
        if (!cardEl.classList.contains('is-dragging')) {
          this.openDetailModal(card);
        }
      });

      // Drag and Drop implementation for 30m slots
      this.attachDragEvents(cardEl, card, startSlot, durationSlots);

      canvas.appendChild(cardEl);

      // Render Transit line between consecutive cards if next card exists
      if (index < sortedCards.length - 1) {
        const nextCard = sortedCards[index + 1];
        const nextStartSlot = this.timeToSlot(nextCard.startTime);
        if (nextStartSlot >= endSlot) {
          const transitTop = endSlot * 48;
          const transitHeight = (nextStartSlot - endSlot) * 48;
          if (transitHeight >= 20 && nextCard.transportNote) {
            const transitEl = document.createElement('div');
            transitEl.className = 'transit-indicator';
            transitEl.style.top = `${transitTop + (transitHeight / 2) - 12}px`;
            transitEl.innerHTML = `
              <span>${TRANSPORT_MAP[nextCard.transportType] || '🚗 交通'}：${nextCard.transportNote}</span>
            `;
            transitEl.addEventListener('click', (e) => {
              e.stopPropagation();
              this.openEditModal(nextCard);
            });
            canvas.appendChild(transitEl);
          }
        }
      }
    });

    this.initLucide();
  }

  // Handle simultaneous or overlapping cards side-by-side
  calculateOverlapLayout(cards) {
    const layout = {};
    for (let i = 0; i < cards.length; i++) {
      const c1 = cards[i];
      const start1 = this.timeToSlot(c1.startTime);
      const end1 = this.timeToSlot(c1.endTime);
      
      const overlapping = [c1];
      for (let j = 0; j < cards.length; j++) {
        if (i === j) continue;
        const c2 = cards[j];
        const start2 = this.timeToSlot(c2.startTime);
        const end2 = this.timeToSlot(c2.endTime);
        if (start1 < end2 && end1 > start2) {
          overlapping.push(c2);
        }
      }

      if (overlapping.length > 1) {
        overlapping.sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime) || a.id.localeCompare(b.id));
        const colIndex = overlapping.findIndex(c => c.id === c1.id);
        layout[c1.id] = { colIndex, totalCols: Math.min(overlapping.length, 2) };
      } else {
        layout[c1.id] = { colIndex: 0, totalCols: 1 };
      }
    }
    return layout;
  }

  // Touch and Mouse Drag to move 30m vertical slot
  attachDragEvents(element, card, originalStartSlot, durationSlots) {
    let startY = 0;
    let initialTop = 0;
    let hasMoved = false;

    const onPointerDown = (e) => {
      if (e.target.closest('.badge-icon-btn')) return;
      
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      initialTop = parseFloat(element.style.top) || 0;
      hasMoved = false;

      const onPointerMove = (moveEvent) => {
        const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
        const deltaY = currentY - startY;
        if (Math.abs(deltaY) > 8) {
          hasMoved = true;
          element.classList.add('is-dragging');
        }

        if (hasMoved) {
          let newTop = initialTop + deltaY;
          newTop = Math.max(0, Math.min(35 * 48, newTop));
          element.style.top = `${newTop}px`;
        }
      };

      const onPointerUp = (upEvent) => {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);

        if (hasMoved) {
          element.classList.remove('is-dragging');
          const finalTop = parseFloat(element.style.top);
          const newSlot = Math.round(finalTop / 48);
          const newStartTime = this.slotToTime(newSlot);
          const newEndTime = this.slotToTime(newSlot + durationSlots);

          card.startTime = newStartTime;
          card.endTime = newEndTime;
          this.saveData();
          this.renderSchedule();
          this.renderCardsList();
          this.showToast(`已移動「${card.title}」至 ${newStartTime}`);
        }
      };

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    };

    element.addEventListener('mousedown', onPointerDown);
    element.addEventListener('touchstart', onPointerDown, { passive: true });
  }

  renderCardsList() {
    const list = document.getElementById('cardsList');
    list.innerHTML = '';
    const currentDay = this.getCurrentDay();

    if (currentDay.cards.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-dim);">
          <i data-lucide="calendar" style="width:48px;height:48px;margin-bottom:12px;opacity:0.5;"></i>
          <p>這一天目前還沒有安排行程</p>
          <button class="btn btn-primary" style="margin-top:12px;" onclick="window.tripManager.openAddModal()">
            <i data-lucide="plus"></i> 立即新增行程卡片
          </button>
        </div>
      `;
      this.initLucide();
      return;
    }

    currentDay.cards.forEach(card => {
      const item = document.createElement('div');
      item.className = 'list-item-card';
      item.innerHTML = `
        <div class="list-time-block" style="border-left: 4px solid ${card.color || '#38bdf8'}; padding-left: 8px;">
          <div>${card.startTime}</div>
          <small style="color:var(--text-dim);font-weight:normal;">${card.endTime}</small>
        </div>
        <div class="list-info-block">
          <h4 style="font-size:0.95rem;font-weight:700;">${card.title}</h4>
          <p style="font-size:0.8rem;color:var(--text-muted);">${card.location || '無地點備註'}</p>
          ${card.notes ? `<small style="color:var(--text-dim);display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📝 ${card.notes}</small>` : ''}
        </div>
        <i data-lucide="chevron-right" style="color:var(--text-dim);width:18px;height:18px;"></i>
      `;
      item.addEventListener('click', () => this.openDetailModal(card));
      list.appendChild(item);
    });
    this.initLucide();
  }

  // ==========================================================================
  // Target Node Route Map & Sequential Polyline Logic (Leaflet)
  // ==========================================================================
  resolveCoordinates(card, index) {
    if (typeof card.lat === 'number' && typeof card.lng === 'number') {
      return [card.lat, card.lng];
    }
    const targetStr = (card.location + ' ' + card.title + ' ' + (card.mapLink || '')).toLowerCase();
    for (const [key, coords] of Object.entries(KNOWN_GEO_DICT)) {
      if (targetStr.includes(key)) {
        return coords;
      }
    }
    // Default fallback coordinates around central Tokyo with slight offset per index
    return [35.6812 + (index * 0.015), 139.7671 + (index * 0.012)];
  }

  renderRouteMap() {
    const currentDay = this.getCurrentDay();
    const sortedCards = [...currentDay.cards].sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime));
    const stepperList = document.getElementById('routeStepperList');
    stepperList.innerHTML = '';

    document.getElementById('routeTotalInfo').textContent = `共 ${sortedCards.length} 個景點節點串聯`;

    // Initialize Leaflet Map if not already initialized
    if (!this.leafletMap) {
      this.leafletMap = L.map('routeLeafletMap', {
        zoomControl: true,
        attributionControl: false
      }).setView([35.6895, 139.6917], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.leafletMap);

      this.mapLayersGroup = L.layerGroup().addTo(this.leafletMap);
    } else {
      this.mapLayersGroup.clearLayers();
    }

    if (sortedCards.length === 0) {
      stepperList.innerHTML = `
        <p style="color:var(--text-dim);text-align:center;padding:16px;">今日尚無景點資料，請先新增行程！</p>
      `;
      return;
    }

    const latLngPoints = [];
    const googleWaypoints = [];

    sortedCards.forEach((card, i) => {
      const nodeNum = i + 1;
      const coords = this.resolveCoordinates(card, i);
      latLngPoints.push(coords);
      googleWaypoints.push(encodeURIComponent(card.location || card.title));

      // Custom HTML Marker with Step Number Badge
      const customIcon = L.divIcon({
        className: 'custom-map-node',
        html: `<div class="node-pin-bubble" style="background-color:${card.color || '#38bdf8'}">${nodeNum}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(this.mapLayersGroup);
      
      const popupHtml = `
        <div style="font-family:var(--font-family);min-width:140px;">
          <b style="font-size:0.95rem;color:#0f172a;">#${nodeNum} ${card.title}</b>
          <div style="font-size:0.8rem;color:#475569;margin-top:2px;">🕒 ${card.startTime} - ${card.endTime}</div>
          <div style="font-size:0.8rem;color:#0284c7;margin-top:2px;">📍 ${card.location || '無地點'}</div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      // Render Step sequence item in the stepper list below map
      const nextCard = sortedCards[i + 1];
      const stepperItem = document.createElement('div');
      stepperItem.className = 'stepper-node-item';
      stepperItem.innerHTML = `
        <div class="stepper-line"></div>
        <div class="stepper-badge" style="background:${card.color || '#38bdf8'}">${nodeNum}</div>
        <div class="stepper-info">
          <div class="stepper-header">
            <span class="stepper-name">${card.title}</span>
            <span class="stepper-time">${card.startTime}</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);">${card.location || '自訂目標'}</div>
          ${nextCard && nextCard.transportNote ? `
            <div class="stepper-transit-tag">
              ${TRANSPORT_MAP[nextCard.transportType] || '🚗 交通'}：${nextCard.transportNote}
            </div>
          ` : ''}
        </div>
      `;
      stepperItem.addEventListener('click', () => {
        this.leafletMap.flyTo(coords, 14, { duration: 0.8 });
        marker.openPopup();
      });
      stepperList.appendChild(stepperItem);
    });

    // Draw Connected Polyline between consecutive nodes
    if (latLngPoints.length > 1) {
      const polyline = L.polyline(latLngPoints, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(this.mapLayersGroup);

      this.leafletMap.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    } else {
      this.leafletMap.setView(latLngPoints[0], 13);
    }

    // Google Maps multi-point route direction generation
    const fullRouteBtn = document.getElementById('btnOpenFullGoogleMapsRoute');
    if (googleWaypoints.length >= 2) {
      const origin = googleWaypoints[0];
      const destination = googleWaypoints[googleWaypoints.length - 1];
      const waypointsStr = googleWaypoints.slice(1, -1).join('|');
      let gUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
      if (waypointsStr) {
        gUrl += `&waypoints=${waypointsStr}`;
      }
      fullRouteBtn.href = gUrl;
      fullRouteBtn.classList.remove('hidden');
    } else if (googleWaypoints.length === 1) {
      fullRouteBtn.href = `https://maps.google.com/?q=${googleWaypoints[0]}`;
      fullRouteBtn.classList.remove('hidden');
    } else {
      fullRouteBtn.classList.add('hidden');
    }

    // Leaflet map refresh size
    setTimeout(() => {
      this.leafletMap.invalidateSize();
    }, 200);

    this.initLucide();
  }

  // --- Modals & User Actions ---

  setupEventListeners() {
    // Theme toggle
    document.getElementById('btnThemeToggle').addEventListener('click', () => this.toggleTheme());

    // Add day button
    document.getElementById('btnAddDay').addEventListener('click', () => {
      const nextDayNum = this.data.days.length + 1;
      const lastDate = new Date(this.data.days[this.data.days.length - 1].date);
      lastDate.setDate(lastDate.getDate() + 1);
      const nextDateStr = lastDate.toISOString().split('T')[0];

      this.data.days.push({
        dayNumber: nextDayNum,
        date: nextDateStr,
        label: `Day ${nextDayNum} 自訂行程`,
        cards: []
      });
      this.data.currentDayIndex = this.data.days.length - 1;
      this.saveData();
      this.renderAll();
      this.showToast(`已新增 Day ${nextDayNum}`);
    });

    // View switchers
    const btnTimeline = document.getElementById('btnViewTimeline');
    const btnCards = document.getElementById('btnViewCards');
    const btnRoute = document.getElementById('btnViewRoute');
    const viewTimeline = document.getElementById('timelineContainer');
    const viewCards = document.getElementById('cardsListContainer');
    const viewRoute = document.getElementById('routeMapContainer');

    btnTimeline.addEventListener('click', () => {
      this.currentViewMode = 'timeline';
      btnTimeline.classList.add('active');
      btnCards.classList.remove('active');
      btnRoute.classList.remove('active');
      viewTimeline.classList.remove('hidden');
      viewCards.classList.add('hidden');
      viewRoute.classList.add('hidden');
    });

    btnCards.addEventListener('click', () => {
      this.currentViewMode = 'cards';
      btnCards.classList.add('active');
      btnTimeline.classList.remove('active');
      btnRoute.classList.remove('active');
      viewCards.classList.remove('hidden');
      viewTimeline.classList.add('hidden');
      viewRoute.classList.add('hidden');
    });

    btnRoute.addEventListener('click', () => {
      this.currentViewMode = 'route';
      btnRoute.classList.add('active');
      btnTimeline.classList.remove('active');
      btnCards.classList.remove('active');
      viewRoute.classList.remove('hidden');
      viewTimeline.classList.add('hidden');
      viewCards.classList.add('hidden');
      this.renderRouteMap();
    });

    // Editable Trip Title
    const tripTitleDisplay = document.getElementById('tripTitleDisplay');
    tripTitleDisplay.addEventListener('blur', () => {
      const val = tripTitleDisplay.textContent.trim();
      if (val) {
        this.data.title = val;
        this.saveData();
      }
    });

    // Populate Time Dropdown Options (30-min intervals)
    this.populateTimeDropdowns();
    this.renderColorPalette();

    // Quick Add Buttons
    document.getElementById('btnQuickAdd').addEventListener('click', () => this.openAddModal());
    document.getElementById('btnFloatAdd').addEventListener('click', () => this.openAddModal());

    // Card Modal Close & Submit
    document.getElementById('btnModalClose').addEventListener('click', () => this.closeCardModal());
    document.getElementById('btnCancelCard').addEventListener('click', () => this.closeCardModal());
    document.getElementById('cardForm').addEventListener('submit', (e) => this.handleSaveCard(e));
    document.getElementById('btnDeleteCard').addEventListener('click', () => this.handleDeleteCard());

    // Detail Modal actions
    document.getElementById('btnDetailClose').addEventListener('click', () => this.closeDetailModal());
    document.getElementById('btnDetailEdit').addEventListener('click', () => {
      const cardId = document.getElementById('detailModal').dataset.activeCardId;
      const currentDay = this.getCurrentDay();
      const card = currentDay.cards.find(c => c.id === cardId);
      this.closeDetailModal();
      if (card) this.openEditModal(card);
    });
    document.getElementById('btnDetailDelete').addEventListener('click', () => {
      const cardId = document.getElementById('detailModal').dataset.activeCardId;
      const currentDay = this.getCurrentDay();
      currentDay.cards = currentDay.cards.filter(c => c.id !== cardId);
      this.saveData();
      this.closeDetailModal();
      this.renderAll();
      this.showToast('已刪除行程卡片');
    });

    // Transport buttons in form
    document.querySelectorAll('.transport-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTransportType = btn.dataset.type;
      });
    });

    // Data Management Modal
    document.getElementById('btnDataMenu').addEventListener('click', () => this.openDataModal());
    document.getElementById('btnExportJson').addEventListener('click', () => this.exportJsonFile());
    document.getElementById('btnImportJsonTrigger').addEventListener('click', () => {
      document.getElementById('fileJsonInput').click();
    });

    document.getElementById('fileJsonInput').addEventListener('change', (e) => this.handleImportFile(e));
    document.getElementById('btnDataModalClose').addEventListener('click', () => this.closeDataModal());
    document.getElementById('btnActionDownload').addEventListener('click', () => this.exportJsonFile());
    document.getElementById('btnActionUpload').addEventListener('click', () => {
      document.getElementById('fileJsonInput').click();
    });
    document.getElementById('btnActionCopyCode').addEventListener('click', () => this.copyShareCode());
    document.getElementById('btnActionResetDemo').addEventListener('click', () => {
      if (confirm('確定要載入示範範本嗎？現有編輯內容將會被覆蓋。')) {
        this.data = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
        this.saveData();
        this.closeDataModal();
        this.renderAll();
        this.showToast('已重新載入示範行程！');
      }
    });
  }

  populateTimeDropdowns() {
    const startSelect = document.getElementById('cardStartTime');
    const endSelect = document.getElementById('cardEndTime');
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    for (let slot = 0; slot <= 36; slot++) {
      const totalMinutes = (6 * 60) + (slot * 30);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      const opt1 = new Option(timeStr, timeStr);
      const opt2 = new Option(timeStr, timeStr);
      startSelect.appendChild(opt1);
      endSelect.appendChild(opt2);
    }
  }

  renderColorPalette() {
    const container = document.getElementById('colorPalette');
    container.innerHTML = '';
    COLOR_PRESETS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch ${color === this.selectedColor ? 'selected' : ''}`;
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.selectedColor = color;
        document.getElementById('cardColor').value = color;
      });
      container.appendChild(swatch);
    });
  }

  openAddModal() {
    document.getElementById('modalTitle').textContent = '新增行程卡片';
    document.getElementById('editCardId').value = '';
    document.getElementById('cardTitle').value = '';
    document.getElementById('cardStartTime').value = '10:00';
    document.getElementById('cardEndTime').value = '11:30';
    document.getElementById('cardLocation').value = '';
    document.getElementById('cardMapLink').value = '';
    document.getElementById('cardUrl').value = '';
    document.getElementById('cardTransportNote').value = '';
    document.getElementById('cardNotes').value = '';
    document.getElementById('btnDeleteCard').classList.add('hidden');

    this.selectedColor = COLOR_PRESETS[0];
    this.renderColorPalette();
    this.selectTransportType('subway');

    document.getElementById('cardModal').classList.remove('hidden');
  }

  openEditModal(card) {
    document.getElementById('modalTitle').textContent = '編輯行程卡片';
    document.getElementById('editCardId').value = card.id;
    document.getElementById('cardTitle').value = card.title || '';
    document.getElementById('cardStartTime').value = card.startTime || '10:00';
    document.getElementById('cardEndTime').value = card.endTime || '11:30';
    document.getElementById('cardLocation').value = card.location || '';
    document.getElementById('cardMapLink').value = card.mapLink || '';
    document.getElementById('cardUrl').value = card.url || '';
    document.getElementById('cardTransportNote').value = card.transportNote || '';
    document.getElementById('cardNotes').value = card.notes || '';
    document.getElementById('btnDeleteCard').classList.remove('hidden');

    this.selectedColor = card.color || COLOR_PRESETS[0];
    this.renderColorPalette();
    this.selectTransportType(card.transportType || 'subway');

    document.getElementById('cardModal').classList.remove('hidden');
  }

  closeCardModal() {
    document.getElementById('cardModal').classList.add('hidden');
  }

  selectTransportType(type) {
    this.selectedTransportType = type;
    document.querySelectorAll('.transport-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.type === type);
    });
  }

  handleSaveCard(e) {
    e.preventDefault();
    const id = document.getElementById('editCardId').value;
    const title = document.getElementById('cardTitle').value.trim();
    const startTime = document.getElementById('cardStartTime').value;
    const endTime = document.getElementById('cardEndTime').value;
    const location = document.getElementById('cardLocation').value.trim();
    let mapLink = document.getElementById('cardMapLink').value.trim();
    const url = document.getElementById('cardUrl').value.trim();
    const transportNote = document.getElementById('cardTransportNote').value.trim();
    const notes = document.getElementById('cardNotes').value.trim();
    const color = this.selectedColor;

    if (!mapLink && location) {
      mapLink = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
    }

    const currentDay = this.getCurrentDay();

    if (id) {
      const card = currentDay.cards.find(c => c.id === id);
      if (card) {
        Object.assign(card, {
          title, startTime, endTime, color, location, mapLink, url,
          transportType: this.selectedTransportType, transportNote, notes
        });
      }
    } else {
      const newCard = {
        id: `card_${Date.now()}`,
        title, startTime, endTime, color, location, mapLink, url,
        transportType: this.selectedTransportType, transportNote, notes
      };
      currentDay.cards.push(newCard);
    }

    this.saveData();
    this.closeCardModal();
    this.renderAll();
    this.showToast('行程已成功儲存！');
  }

  handleDeleteCard() {
    const id = document.getElementById('editCardId').value;
    if (!id) return;
    if (confirm('確定要刪除這筆行程嗎？')) {
      const currentDay = this.getCurrentDay();
      currentDay.cards = currentDay.cards.filter(c => c.id !== id);
      this.saveData();
      this.closeCardModal();
      this.renderAll();
      this.showToast('已刪除行程卡片');
    }
  }

  openDetailModal(card) {
    const modal = document.getElementById('detailModal');
    modal.dataset.activeCardId = card.id;

    document.getElementById('detailTitle').textContent = card.title;
    document.getElementById('detailTimeBadge').textContent = `${card.startTime} - ${card.endTime}`;
    
    const transportBox = document.getElementById('detailTransportBox');
    if (card.transportNote || card.transportType) {
      transportBox.classList.remove('hidden');
      document.getElementById('detailTransportTag').textContent = TRANSPORT_MAP[card.transportType] || '🚇 交通方式';
      document.getElementById('detailTransportDesc').textContent = card.transportNote || '未填寫詳細說明';
    } else {
      transportBox.classList.add('hidden');
    }

    const locItem = document.getElementById('detailLocationItem');
    const locText = document.getElementById('detailLocationText');
    const mapOpenBtn = document.getElementById('detailMapOpenBtn');

    if (card.location || card.mapLink) {
      locItem.classList.remove('hidden');
      locText.textContent = card.location || '查看 Google 地圖位置';
      mapOpenBtn.href = card.mapLink || `https://maps.google.com/?q=${encodeURIComponent(card.location)}`;
      mapOpenBtn.classList.remove('hidden');
    } else {
      locText.textContent = '未填寫具體地點';
      mapOpenBtn.classList.add('hidden');
    }

    const linkItem = document.getElementById('detailLinkItem');
    const externalLink = document.getElementById('detailExternalLink');
    if (card.url) {
      linkItem.classList.remove('hidden');
      externalLink.href = card.url;
      externalLink.textContent = card.url;
    } else {
      linkItem.classList.add('hidden');
    }

    const mapFrame = document.getElementById('mapFrame');
    const mapFallback = document.getElementById('mapFallback');
    const query = card.location || (card.mapLink ? this.extractMapQuery(card.mapLink) : card.title);

    if (query) {
      mapFrame.classList.remove('hidden');
      mapFallback.classList.add('hidden');
      const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      mapFrame.src = embedUrl;
    } else {
      mapFrame.classList.add('hidden');
      mapFallback.classList.remove('hidden');
    }

    const notesText = document.getElementById('detailNotesText');
    notesText.textContent = card.notes || '尚無特別備註。點擊下方「編輯此卡片」隨時補充！';

    modal.classList.remove('hidden');
    this.initLucide();
  }

  extractMapQuery(url) {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('q') || parsed.pathname;
    } catch {
      return '';
    }
  }

  closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.add('hidden');
    document.getElementById('mapFrame').src = '';
  }

  openDataModal() {
    document.getElementById('dataModal').classList.remove('hidden');
    this.initLucide();
  }

  closeDataModal() {
    document.getElementById('dataModal').classList.add('hidden');
  }

  exportJsonFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data, null, 2));
    const downloadAnchor = document.createElement('a');
    const fileName = `${this.data.title.replace(/\s+/g, '_')}_travelgogo.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('已匯出行程 JSON 檔案！');
  }

  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData && importedData.days && Array.isArray(importedData.days)) {
          this.data = importedData;
          this.data.currentDayIndex = 0;
          this.saveData();
          this.renderAll();
          this.closeDataModal();
          this.showToast('成功匯入行程！');
        } else {
          alert('匯入的 JSON 格式不符合 TravelGoGo 行程規範。');
        }
      } catch (err) {
        alert('解析 JSON 檔案失敗，請確認檔案格式是否正確。');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  copyShareCode() {
    try {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
      navigator.clipboard.writeText(code).then(() => {
        this.showToast('行程代碼已複製至剪貼簿！');
      }).catch(() => {
        prompt('請手動複製下方行程代碼：', code);
      });
    } catch (e) {
      alert('壓縮代碼失敗：' + e.message);
    }
  }

  showToast(message) {
    const toast = document.getElementById('toastNotification');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }
}

// Global Initialization
window.addEventListener('DOMContentLoaded', () => {
  window.tripManager = new TripManager();
});
