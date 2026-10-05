/**
 * TravelGoGo - Core Application Logic (v3.0)
 * 
 * Key features:
 * - 10-min interval vertical timeline from 00:00-24:00
 * - Calendar date-range picker (auto-generates days)
 * - Multi-day span view (1/3/5/7 day columns)
 * - Drag-and-drop with confirmation
 * - Overlap detection & side-by-side layout
 * - Route map: Leaflet nodes, polylines, transport tags, Google route URL
 * - Google Maps URL parsing & interactive embed
 * - Budget/cost tracking per card & daily/total summary
 * - Manual save-to-cache button
 * - JSON LocalStorage, import, export, share code, paste-import
 * - Wishlist/pocket places with batch Google Maps list import
 * - Copy & Move card to other day via modal
 * - Delete day, Undo last card deletion
 * - Transport: subway, walk, bus, taxi, car, plane
 */

// ── Constants ────────────────────────────────────────────────────────────────

const SLOT_MINUTES = 10;
const TOTAL_SLOTS  = 144;          // 24h * 60min / 10min
const SLOT_HEIGHT  = 20;           // px per 10-min slot
const START_HOUR   = 0;            // timeline begins at 00:00

const COLOR_PRESETS = [
  '#38bdf8', '#818cf8', '#c084fc', '#34d399',
  '#fbbf24', '#fb7185', '#fb923c', '#2dd4bf'
];

const TRANSPORT_MAP = {
  subway: '🚇 地鐵/火車',
  walk:   '🚶 步行',
  bus:    '🚌 公車',
  taxi:   '🚕 計程車',
  car:    '🚗 自駕/租車',
  plane:  '✈️ 飛機'
};

const KNOWN_GEO_DICT = {
  "羽田":[35.5494,139.7798],"haneda":[35.5494,139.7798],
  "成田":[35.7720,140.3929],"narita":[35.7720,140.3929],
  "新宿":[35.6909,139.7003],"shinjuku":[35.6909,139.7003],
  "敘敘苑":[35.6918,139.7015],"jojoen":[35.6918,139.7015],
  "明治神宮":[35.6764,139.6993],"meiji":[35.6764,139.6993],
  "shibuya sky":[35.6585,139.7023],
  "澀谷":[35.6595,139.7005],"shibuya":[35.6595,139.7005],
  "淺草":[35.7148,139.7967],"sensoji":[35.7148,139.7967],
  "晴空塔":[35.7101,139.8107],"skytree":[35.7101,139.8107],
  "迪士尼":[35.6267,139.8851],"disney":[35.6267,139.8851],
  "銀座":[35.6719,139.7640],"ginza":[35.6719,139.7640],
  "六本木":[35.6628,139.7313],"roppongi":[35.6628,139.7313],
  "台北":[25.0330,121.5654],"taipei":[25.0330,121.5654],
  "東京車站":[35.6812,139.7671],"tokyo station":[35.6812,139.7671],
  "秋葉原":[35.6984,139.7731],"akihabara":[35.6984,139.7731],
  "池袋":[35.7295,139.7109],"ikebukuro":[35.7295,139.7109],
  "上野":[35.7141,139.7774],"ueno":[35.7141,139.7774],
  "原宿":[35.6702,139.7026],"harajuku":[35.6702,139.7026],
  "表參道":[35.6653,139.7121],"omotesando":[35.6653,139.7121],
  "台場":[35.6268,139.7753],"odaiba":[35.6268,139.7753],
  "京都":[35.0116,135.7681],"kyoto":[35.0116,135.7681],
  "大阪":[34.6937,135.5023],"osaka":[34.6937,135.5023],
  "首爾":[37.5665,126.9780],"seoul":[37.5665,126.9780],
  "曼谷":[13.7563,100.5018],"bangkok":[13.7563,100.5018]
};

const CURRENCY_OPTIONS = ['TWD','JPY','KRW','USD','EUR','THB','CNY'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultEmptyTrip() {
  const today = new Date();
  const ds = today.toISOString().split('T')[0];
  return {
    title: '我的專屬旅遊行程',
    startDate: ds,
    endDate: ds,
    currency: 'JPY',
    currentDayIndex: 0,
    days: [{ dayNumber:1, date:ds, label:'Day 1', cards:[] }]
  };
}

function dateDiffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function formatDateStr(iso) {
  const d = new Date(iso + 'T00:00:00');
  const wd = ['日','一','二','三','四','五','六'][d.getDay()];
  return `${d.getMonth()+1}/${d.getDate()}(${wd})`;
}

// ── Main Class ───────────────────────────────────────────────────────────────

class TripManager {
  constructor() {
    this.storageKey         = 'travelgogo_itinerary_data';
    this.wishlistStorageKey = 'travelgogo_wishlist_data';
    this.themeKey           = 'travelgogo_theme';
    this.currentViewMode    = 'timeline';
    this.selectedTransportType = 'subway';
    this.selectedColor      = COLOR_PRESETS[0];
    this.currentSpanDays    = 1;
    this.leafletMap         = null;
    this.mapLayersGroup     = null;
    this.wishlist           = [];
    this.undoStack          = [];
    this.timeIndicatorInterval = null;
    this.wishlistSelectMode = false;
    this.init();
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  init() {
    this.loadData();
    this.loadWishlist();
    this.initTheme();
    this.setupEventListeners();
    this.renderAll();
    this.renderWishlist();
    this.initLucide();
    this.startTimeIndicator();
  }

  loadData() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try { this.data = JSON.parse(raw); }
      catch(e) { this.data = createDefaultEmptyTrip(); }
    } else {
      this.data = createDefaultEmptyTrip();
      this.saveData();
    }
    if (typeof this.data.currentDayIndex !== 'number' || this.data.currentDayIndex >= this.data.days.length)
      this.data.currentDayIndex = 0;
    if (!this.data.currency) this.data.currency = 'JPY';
    if (!this.data.startDate) this.data.startDate = this.data.days[0]?.date || new Date().toISOString().split('T')[0];
    if (!this.data.endDate) this.data.endDate = this.data.days[this.data.days.length-1]?.date || this.data.startDate;
  }

  saveData() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  loadWishlist() {
    const raw = localStorage.getItem(this.wishlistStorageKey);
    try { this.wishlist = raw ? JSON.parse(raw) : []; }
    catch(e) { this.wishlist = []; }
  }

  saveWishlist() {
    localStorage.setItem(this.wishlistStorageKey, JSON.stringify(this.wishlist));
    this.renderWishlist();
  }

  initTheme() {
    const t = localStorage.getItem(this.themeKey) || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    this.updateThemeIcon(t);
  }

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const nxt = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nxt);
    localStorage.setItem(this.themeKey, nxt);
    this.updateThemeIcon(nxt);
  }

  updateThemeIcon(theme) {
    const el = document.getElementById('themeIcon');
    if (el) { el.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon'); this.initLucide(); }
  }

  initLucide() { if (window.lucide) window.lucide.createIcons(); }

  getCurrentDay() { return this.data.days[this.data.currentDayIndex] || this.data.days[0]; }

  // ── Time helpers (10-min slots from 00:00) ───────────────────────────────

  timeToSlot(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return Math.max(0, Math.min(TOTAL_SLOTS, Math.round((h * 60 + m) / SLOT_MINUTES)));
  }

  slotToTime(slot) {
    const totalMin = Math.round(slot * SLOT_MINUTES);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  // ── Current time indicator ───────────────────────────────────────────────

  startTimeIndicator() {
    this.updateTimeIndicator();
    this.timeIndicatorInterval = setInterval(() => this.updateTimeIndicator(), 60000);
  }

  updateTimeIndicator() {
    const old = document.querySelector('.current-time-line');
    if (old) old.remove();
    const now = new Date();
    const totalMin = now.getHours() * 60 + now.getMinutes();
    const slot = totalMin / SLOT_MINUTES;
    const topPx = slot * SLOT_HEIGHT;
    const canvas = document.getElementById('scheduleCanvas');
    if (!canvas || this.currentViewMode !== 'timeline' || this.currentSpanDays > 1) return;
    const line = document.createElement('div');
    line.className = 'current-time-line';
    line.style.top = `${topPx}px`;
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    line.innerHTML = `<span class="current-time-label">${ts}</span>`;
    canvas.appendChild(line);
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  renderAll() {
    this.renderHeader();
    this.renderDayTabs();
    if (this.currentSpanDays > 1) {
      this.renderMultiDayView();
    } else {
      this.renderTimeRuler();
      this.renderSchedule();
    }
    this.renderCardsList();
    if (this.currentViewMode === 'route') this.renderRouteMap();
    this.initLucide();
    this.updateTimeIndicator();
    this.updateUndoButton();
  }

  renderHeader() {
    document.getElementById('tripTitleDisplay').textContent = this.data.title;
    const n = this.data.days.length;
    const s = this.data.days[0]?.date || '';
    const e = this.data.days[n-1]?.date || '';
    document.getElementById('tripDatesDisplay').textContent = `${s} ~ ${e} (${n} 天)`;
  }

  renderDayTabs() {
    const container = document.getElementById('dayTabsList');
    container.innerHTML = '';
    this.data.days.forEach((day, i) => {
      const tab = document.createElement('button');
      tab.className = `day-tab ${i === this.data.currentDayIndex ? 'active' : ''}`;
      tab.innerHTML = `<span>Day ${day.dayNumber}</span><small style="opacity:0.8">${formatDateStr(day.date)}</small>`;
      tab.addEventListener('click', () => { this.data.currentDayIndex = i; this.saveData(); this.renderAll(); });
      tab.addEventListener('contextmenu', (e) => { e.preventDefault(); this.showDayContextMenu(i, e); });
      container.appendChild(tab);
    });

    const cur = this.getCurrentDay();
    document.getElementById('currentDayBadge').textContent = `Day ${cur.dayNumber}`;
    const budget = cur.cards.reduce((s, c) => s + (parseFloat(c.cost) || 0), 0);
    const d = new Date(cur.date + 'T00:00:00');
    const wd = ['日','一','二','三','四','五','六'][d.getDay()];
    document.getElementById('currentDayDateText').textContent =
      `${d.getMonth()+1}月${d.getDate()}日 (週${wd})`;
    let info = `${cur.cards.length} 個行程`;
    if (budget > 0) info += ` ・ ${this.data.currency} ${budget.toLocaleString()}`;
    document.getElementById('currentDayCardCount').textContent = info;
  }

  // ── Day context menu ─────────────────────────────────────────────────────

  showDayContextMenu(dayIndex, event) {
    document.querySelectorAll('.day-context-menu').forEach(m => m.remove());
    const day = this.data.days[dayIndex];
    const menu = document.createElement('div');
    menu.className = 'day-context-menu';
    menu.style.cssText = `position:fixed;left:${Math.min(event.clientX, innerWidth-180)}px;top:${event.clientY}px;z-index:999;`;
    menu.innerHTML = `
      <div class="ctx-menu-card">
        <div class="ctx-menu-title">Day ${day.dayNumber} (${day.date})</div>
        <button class="ctx-menu-item" data-action="edit-date"><i data-lucide="calendar" style="width:14px;height:14px;"></i> 修改日期</button>
        <button class="ctx-menu-item" data-action="edit-label"><i data-lucide="pen-line" style="width:14px;height:14px;"></i> 修改標籤</button>
        ${this.data.days.length > 1 ? `<button class="ctx-menu-item ctx-menu-danger" data-action="delete-day"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> 刪除此天</button>` : ''}
      </div>`;
    document.body.appendChild(menu);
    this.initLucide();
    const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } };
    setTimeout(() => document.addEventListener('click', close), 10);
    menu.querySelectorAll('.ctx-menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.action;
        menu.remove(); document.removeEventListener('click', close);
        if (act === 'edit-date') {
          const nd = prompt(`修改 Day ${day.dayNumber} 的日期 (YYYY-MM-DD)：`, day.date);
          if (nd && /^\d{4}-\d{2}-\d{2}$/.test(nd)) { day.date = nd; this.saveData(); this.renderAll(); this.showToast(`已更新日期為 ${nd}`); }
        } else if (act === 'edit-label') {
          const nl = prompt(`修改 Day ${day.dayNumber} 的標籤：`, day.label || `Day ${day.dayNumber}`);
          if (nl !== null) { day.label = nl.trim() || `Day ${day.dayNumber}`; this.saveData(); this.renderAll(); }
        } else if (act === 'delete-day') {
          if (confirm(`確定要刪除 Day ${day.dayNumber} 嗎？\n其中 ${day.cards.length} 個行程卡片也會一併刪除。`)) {
            this.data.days.splice(dayIndex, 1);
            this.data.days.forEach((d, i) => d.dayNumber = i + 1);
            if (this.data.currentDayIndex >= this.data.days.length) this.data.currentDayIndex = this.data.days.length - 1;
            this.saveData(); this.renderAll(); this.showToast('已刪除該天行程');
          }
        }
      });
    });
  }

  // ── Time ruler (10-min, labels every 30 min) ─────────────────────────────

  renderTimeRuler() {
    const ruler = document.getElementById('timeRuler');
    ruler.innerHTML = '';
    for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
      const totalMin = slot * SLOT_MINUTES;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const el = document.createElement('div');
      el.className = 'time-slot-label';
      if (m === 0) {
        el.classList.add('hour-mark');
        el.textContent = `${String(h).padStart(2,'0')}:00`;
      } else if (m === 30) {
        el.classList.add('half-mark');
        el.textContent = `${String(h).padStart(2,'0')}:30`;
      }
      // 10-min and 20-min marks are blank (just grid lines)
      ruler.appendChild(el);
    }
  }

  // ── Multi-day span view ──────────────────────────────────────────────────

  renderMultiDayView() {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';
    container.classList.add('multi-day-mode');

    const startIdx = this.data.currentDayIndex;
    const endIdx = Math.min(startIdx + this.currentSpanDays, this.data.days.length);
    const vis = this.data.days.slice(startIdx, endIdx);

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'multi-day-header-row';
    const rh = document.createElement('div');
    rh.className = 'multi-day-ruler-header';
    rh.textContent = '時間';
    hdr.appendChild(rh);
    vis.forEach(day => {
      const ch = document.createElement('div');
      ch.className = 'multi-day-col-header';
      ch.innerHTML = `<span class="multi-day-label">D${day.dayNumber}</span><span class="multi-day-date">${formatDateStr(day.date)}</span>`;
      hdr.appendChild(ch);
    });
    container.appendChild(hdr);

    // Columns
    const wrap = document.createElement('div');
    wrap.className = 'multi-day-columns';

    // Ruler col
    const rc = document.createElement('div');
    rc.className = 'multi-day-ruler-col';
    for (let s = 0; s < TOTAL_SLOTS; s++) {
      const tm = s * SLOT_MINUTES;
      const h = Math.floor(tm / 60), m = tm % 60;
      const el = document.createElement('div');
      el.className = 'time-slot-label';
      if (m === 0) { el.classList.add('hour-mark'); el.textContent = `${String(h).padStart(2,'0')}:00`; }
      else if (m === 30) { el.classList.add('half-mark'); el.textContent = `${String(h).padStart(2,'0')}:30`; }
      rc.appendChild(el);
    }
    wrap.appendChild(rc);

    // Day cols
    vis.forEach((day, di) => {
      const col = document.createElement('div');
      col.className = 'multi-day-col';
      col.style.position = 'relative';
      col.style.minHeight = `${TOTAL_SLOTS * SLOT_HEIGHT}px`;
      const sorted = [...day.cards].sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime));
      sorted.forEach(card => {
        const ss = this.timeToSlot(card.startTime);
        const es = Math.max(ss + 1, this.timeToSlot(card.endTime));
        const top = ss * SLOT_HEIGHT;
        const ht = Math.max(24, (es - ss) * SLOT_HEIGHT - 2);
        const ce = document.createElement('div');
        ce.className = 'activity-card multi-day-card';
        ce.style.cssText = `top:${top}px;height:${ht}px;border-left-color:${card.color || '#38bdf8'}`;
        ce.innerHTML = `<div class="card-title" style="font-size:0.72rem;">${card.title}</div><div class="card-time-span" style="font-size:0.6rem;">${card.startTime}-${card.endTime}</div>`;
        ce.addEventListener('click', () => { this.data.currentDayIndex = startIdx + di; this.openDetailModal(card); });
        col.appendChild(ce);
      });
      if (sorted.length === 0) {
        const em = document.createElement('div');
        em.className = 'multi-day-empty';
        em.textContent = '尚無行程';
        col.appendChild(em);
      }
      wrap.appendChild(col);
    });
    container.appendChild(wrap);
  }

  // ── Single-day schedule ──────────────────────────────────────────────────

  renderSchedule() {
    const container = document.getElementById('timelineContainer');
    container.classList.remove('multi-day-mode');

    // Ensure structure exists
    if (!document.getElementById('timeRuler') || !document.getElementById('scheduleCanvas')) {
      container.innerHTML = '<div class="time-ruler" id="timeRuler"></div><div class="schedule-canvas" id="scheduleCanvas"></div>';
      this.renderTimeRuler();
    }

    const canvas = document.getElementById('scheduleCanvas');
    canvas.innerHTML = '';
    const cur = this.getCurrentDay();
    const sorted = [...cur.cards].sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime));

    if (sorted.length === 0) {
      canvas.innerHTML = `
        <div class="timeline-empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>這一天還沒有行程安排</h3>
          <p>點擊下方「快速排程」或右上角「新增行程」開始規劃吧！</p>
          <button class="btn btn-primary" onclick="window.tripManager.openAddModal()"><i data-lucide="plus"></i> 新增第一個行程</button>
        </div>`;
      this.initLucide();
      return;
    }

    const layout = this.calculateOverlapLayout(sorted);

    sorted.forEach((card, idx) => {
      const ss = this.timeToSlot(card.startTime);
      const es = Math.max(ss + 1, this.timeToSlot(card.endTime));
      const dur = es - ss;
      const top = ss * SLOT_HEIGHT;
      const ht = Math.max(32, dur * SLOT_HEIGHT - 4);

      const el = document.createElement('div');
      el.className = 'activity-card';
      el.id = `activity_${card.id}`;
      el.dataset.cardId = card.id;
      el.style.cssText = `top:${top}px;height:${ht}px;border-left-color:${card.color || '#38bdf8'}`;

      const lay = layout[card.id];
      if (lay && lay.totalCols > 1) {
        const wp = (100 / lay.totalCols) - 2;
        const lp = lay.colIndex * (100 / lay.totalCols) + 1;
        el.style.left = `${lp}%`; el.style.width = `${wp}%`; el.style.right = 'auto';
      }

      const tLabel = TRANSPORT_MAP[card.transportType] || '';
      const costHtml = (card.cost && parseFloat(card.cost) > 0)
        ? `<span class="card-cost-badge">${this.data.currency} ${parseFloat(card.cost).toLocaleString()}</span>` : '';

      el.innerHTML = `
        <div class="card-top">
          <div class="card-title-group">
            <h4 class="card-title">${card.title}</h4>
            <div class="card-time-span"><i data-lucide="clock" style="width:12px;height:12px;"></i><span>${card.startTime} - ${card.endTime}</span>${costHtml}</div>
          </div>
          <div class="card-badges">
            ${card.mapLink ? '<span class="badge-icon-btn" title="有 Google 地圖定位"><i data-lucide="map-pin" style="width:13px;height:13px;"></i></span>' : ''}
            <span class="card-drag-handle" title="按住拖曳調整時段"><i data-lucide="grip-vertical" style="width:14px;height:14px;"></i></span>
          </div>
        </div>
        <div class="card-bottom">
          <span class="card-location">${card.location ? `📍 ${card.location}` : '無特定地點'}</span>
          ${card.transportType ? `<span class="card-transport-badge">${tLabel.split(' ')[0]}</span>` : ''}
        </div>`;

      el.addEventListener('click', (e) => { if (!el.classList.contains('is-dragging')) this.openDetailModal(card); });
      this.attachDragEvents(el, card, ss, dur);
      canvas.appendChild(el);

      // Transit indicator
      if (idx < sorted.length - 1) {
        const next = sorted[idx + 1];
        const ns = this.timeToSlot(next.startTime);
        if (ns >= es && next.transportNote) {
          const tTop = es * SLOT_HEIGHT;
          const tHt = (ns - es) * SLOT_HEIGHT;
          if (tHt >= 16) {
            const te = document.createElement('div');
            te.className = 'transit-indicator';
            te.style.top = `${tTop + (tHt / 2) - 10}px`;
            te.innerHTML = `<span>${TRANSPORT_MAP[next.transportType] || '🚗 交通'}：${next.transportNote}</span>`;
            te.addEventListener('click', (e) => { e.stopPropagation(); this.openEditModal(next); });
            canvas.appendChild(te);
          }
        }
      }
    });
    this.initLucide();
  }

  calculateOverlapLayout(cards) {
    const layout = {};
    for (let i = 0; i < cards.length; i++) {
      const c1 = cards[i];
      const s1 = this.timeToSlot(c1.startTime), e1 = this.timeToSlot(c1.endTime);
      const over = [c1];
      for (let j = 0; j < cards.length; j++) {
        if (i === j) continue;
        const s2 = this.timeToSlot(cards[j].startTime), e2 = this.timeToSlot(cards[j].endTime);
        if (s1 < e2 && e1 > s2) over.push(cards[j]);
      }
      if (over.length > 1) {
        over.sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime) || a.id.localeCompare(b.id));
        layout[c1.id] = { colIndex: over.findIndex(c => c.id === c1.id), totalCols: Math.min(over.length, 2) };
      } else {
        layout[c1.id] = { colIndex: 0, totalCols: 1 };
      }
    }
    return layout;
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  attachDragEvents(element, card, origSlot, durSlots) {
    let startY = 0, initTop = 0, moved = false, scrollIv = null;
    const viewport = document.querySelector('.main-viewport');
    const handle = element.querySelector('.card-drag-handle');
    if (!handle) return;

    const onDown = (e) => {
      if (!e.target.closest('.card-drag-handle')) return;
      e.stopPropagation();
      startY = e.clientY || e.touches?.[0]?.clientY;
      initTop = parseFloat(element.style.top) || 0;
      moved = false;

      const onMove = (me) => {
        const cy = me.clientY || me.touches?.[0]?.clientY;
        const dy = cy - startY;
        if (Math.abs(dy) > 6) { moved = true; element.classList.add('is-dragging'); }
        if (moved) {
          if (me.cancelable) me.preventDefault();
          let nt = Math.max(0, Math.min((TOTAL_SLOTS - 1) * SLOT_HEIGHT, initTop + dy));
          element.style.top = `${nt}px`;
          // Edge auto-scroll
          if (viewport) {
            const r = viewport.getBoundingClientRect();
            clearInterval(scrollIv); scrollIv = null;
            if (cy < r.top + 50) scrollIv = setInterval(() => viewport.scrollTop -= 12, 30);
            else if (cy > r.bottom - 50) scrollIv = setInterval(() => viewport.scrollTop += 12, 30);
          }
        }
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
        clearInterval(scrollIv);
        if (moved) {
          element.classList.remove('is-dragging');
          const ns = Math.round(parseFloat(element.style.top) / SLOT_HEIGHT);
          const newStart = this.slotToTime(ns);
          const newEnd = this.slotToTime(ns + durSlots);
          if (newStart === card.startTime) { element.style.top = `${initTop}px`; return; }
          if (confirm(`確定要將「${card.title}」調整為：\n🕒 ${newStart} - ${newEnd} 嗎？`)) {
            card.startTime = newStart; card.endTime = newEnd;
            this.saveData(); this.renderSchedule(); this.renderCardsList();
            this.showToast(`已移動「${card.title}」至 ${newStart}`);
          } else {
            element.style.top = `${initTop}px`;
          }
        }
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    };

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
  }

  // ── Cards list view ──────────────────────────────────────────────────────

  renderCardsList() {
    const list = document.getElementById('cardsList');
    list.innerHTML = '';
    const cur = this.getCurrentDay();
    if (cur.cards.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-dim);"><p>這一天目前還沒有安排行程</p>
        <button class="btn btn-primary" style="margin-top:12px;" onclick="window.tripManager.openAddModal()"><i data-lucide="plus"></i> 新增行程</button></div>`;
      this.initLucide(); return;
    }
    const sorted = [...cur.cards].sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime));
    sorted.forEach(card => {
      const el = document.createElement('div');
      el.className = 'list-item-card';
      const costStr = (card.cost && parseFloat(card.cost) > 0) ? `<span style="color:var(--accent-amber);font-size:0.72rem;font-weight:600;">💰 ${this.data.currency} ${parseFloat(card.cost).toLocaleString()}</span>` : '';
      el.innerHTML = `
        <div class="list-time-block" style="border-left:4px solid ${card.color||'#38bdf8'};padding-left:8px;">
          <div>${card.startTime}</div><small style="color:var(--text-dim);">${card.endTime}</small>
        </div>
        <div class="list-info-block">
          <h4 style="font-size:0.95rem;font-weight:700;">${card.title}</h4>
          <p style="font-size:0.8rem;color:var(--text-muted);">${card.location || '無地點備註'}</p>
          ${card.notes ? `<small style="color:var(--text-dim);display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📝 ${card.notes}</small>` : ''}
          ${costStr}
        </div>
        <i data-lucide="chevron-right" style="color:var(--text-dim);width:18px;height:18px;"></i>`;
      el.addEventListener('click', () => this.openDetailModal(card));
      list.appendChild(el);
    });
    this.initLucide();
  }

  // ── Route Map (Leaflet) ──────────────────────────────────────────────────

  resolveCoordinates(card, index) {
    if (typeof card.lat === 'number' && typeof card.lng === 'number') return [card.lat, card.lng];
    const t = (card.location + ' ' + card.title + ' ' + (card.mapLink || '')).toLowerCase();
    for (const [k, v] of Object.entries(KNOWN_GEO_DICT)) { if (t.includes(k)) return v; }
    return [35.6812 + index * 0.015, 139.7671 + index * 0.012];
  }

  renderRouteMap() {
    const cur = this.getCurrentDay();
    const sorted = [...cur.cards].sort((a, b) => this.timeToSlot(a.startTime) - this.timeToSlot(b.startTime));
    const stepper = document.getElementById('routeStepperList');
    stepper.innerHTML = '';
    document.getElementById('routeTotalInfo').textContent = `共 ${sorted.length} 個景點節點串聯`;

    if (!this.leafletMap) {
      this.leafletMap = L.map('routeLeafletMap', { zoomControl: true, attributionControl: false }).setView([35.6895, 139.6917], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.leafletMap);
      this.mapLayersGroup = L.layerGroup().addTo(this.leafletMap);
    } else { this.mapLayersGroup.clearLayers(); }

    if (sorted.length === 0) { stepper.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:16px;">今日尚無景點資料</p>'; return; }

    const pts = [], wps = [];
    sorted.forEach((card, i) => {
      const n = i + 1, co = this.resolveCoordinates(card, i);
      pts.push(co); wps.push(encodeURIComponent(card.location || card.title));
      const icon = L.divIcon({ className: 'custom-map-node', html: `<div class="node-pin-bubble" style="background:${card.color||'#38bdf8'}">${n}</div>`, iconSize: [32,32], iconAnchor: [16,16] });
      const marker = L.marker(co, { icon }).addTo(this.mapLayersGroup);
      const costLine = (card.cost && parseFloat(card.cost) > 0) ? `<div style="font-size:0.75rem;color:#f59e0b;margin-top:2px;">💰 ${this.data.currency} ${parseFloat(card.cost).toLocaleString()}</div>` : '';
      marker.bindPopup(`<div style="font-family:var(--font-family);min-width:130px;"><b style="font-size:0.95rem;">#${n} ${card.title}</b><div style="font-size:0.8rem;color:#475569;margin-top:2px;">🕒 ${card.startTime} - ${card.endTime}</div><div style="font-size:0.8rem;color:#0284c7;">📍 ${card.location || '無地點'}</div>${costLine}</div>`);

      const next = sorted[i + 1];
      const si = document.createElement('div');
      si.className = 'stepper-node-item';
      si.innerHTML = `<div class="stepper-line"></div><div class="stepper-badge" style="background:${card.color||'#38bdf8'}">${n}</div>
        <div class="stepper-info"><div class="stepper-header"><span class="stepper-name">${card.title}</span><span class="stepper-time">${card.startTime}</span></div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${card.location||'自訂目標'}</div>
        ${next && next.transportNote ? `<div class="stepper-transit-tag">${TRANSPORT_MAP[next.transportType]||'🚗 交通'}：${next.transportNote}</div>` : ''}</div>`;
      si.addEventListener('click', () => { this.leafletMap.flyTo(co, 14, { duration: 0.8 }); marker.openPopup(); });
      stepper.appendChild(si);
    });

    if (pts.length > 1) {
      const poly = L.polyline(pts, { color: '#38bdf8', weight: 4, opacity: 0.85, dashArray: '8,8', lineCap: 'round' }).addTo(this.mapLayersGroup);
      this.leafletMap.fitBounds(poly.getBounds(), { padding: [40, 40] });
    } else { this.leafletMap.setView(pts[0], 13); }

    const btn = document.getElementById('btnOpenFullGoogleMapsRoute');
    if (wps.length >= 2) {
      let gUrl = `https://www.google.com/maps/dir/?api=1&origin=${wps[0]}&destination=${wps[wps.length-1]}`;
      if (wps.length > 2) gUrl += `&waypoints=${wps.slice(1,-1).join('|')}`;
      btn.href = gUrl; btn.classList.remove('hidden');
    } else if (wps.length === 1) { btn.href = `https://maps.google.com/?q=${wps[0]}`; btn.classList.remove('hidden'); }
    else { btn.classList.add('hidden'); }

    setTimeout(() => this.leafletMap.invalidateSize(), 200);
    this.initLucide();
  }

  // ── Event Listeners ──────────────────────────────────────────────────────

  setupEventListeners() {
    // Theme
    document.getElementById('btnThemeToggle').addEventListener('click', () => this.toggleTheme());

    // Save to cache
    document.getElementById('btnSaveCache').addEventListener('click', () => {
      this.saveData();
      this.saveWishlist();
      this.showToast('✅ 所有設定已儲存至本地快取 (LocalStorage)！');
    });

    // Add day
    document.getElementById('btnAddDay').addEventListener('click', () => {
      const n = this.data.days.length + 1;
      const last = new Date(this.data.days[this.data.days.length - 1].date);
      last.setDate(last.getDate() + 1);
      const ds = last.toISOString().split('T')[0];
      this.data.days.push({ dayNumber: n, date: ds, label: `Day ${n}`, cards: [] });
      this.data.currentDayIndex = this.data.days.length - 1;
      this.data.endDate = ds;
      this.saveData(); this.renderAll();
      this.showToast(`已新增 Day ${n}`);
    });

    // View switchers
    const bT = document.getElementById('btnViewTimeline');
    const bC = document.getElementById('btnViewCards');
    const bR = document.getElementById('btnViewRoute');
    const vT = document.getElementById('timelineContainer');
    const vC = document.getElementById('cardsListContainer');
    const vR = document.getElementById('routeMapContainer');

    bT.addEventListener('click', () => {
      this.currentViewMode = 'timeline';
      bT.classList.add('active'); bC.classList.remove('active'); bR.classList.remove('active');
      vT.classList.remove('hidden'); vC.classList.add('hidden'); vR.classList.add('hidden');
      this.renderAll();
    });
    bC.addEventListener('click', () => {
      this.currentViewMode = 'cards';
      bC.classList.add('active'); bT.classList.remove('active'); bR.classList.remove('active');
      vC.classList.remove('hidden'); vT.classList.add('hidden'); vR.classList.add('hidden');
    });
    bR.addEventListener('click', () => {
      this.currentViewMode = 'route';
      bR.classList.add('active'); bT.classList.remove('active'); bC.classList.remove('active');
      vR.classList.remove('hidden'); vT.classList.add('hidden'); vC.classList.add('hidden');
      this.renderRouteMap();
    });

    // Multi-day span
    document.querySelectorAll('#spanRangePills .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#spanRangePills .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSpanDays = parseInt(btn.dataset.days, 10);
        this.renderAll();
      });
    });

    // Trip title edit
    document.getElementById('tripTitleDisplay').addEventListener('blur', () => {
      const v = document.getElementById('tripTitleDisplay').textContent.trim();
      if (v) { this.data.title = v; this.saveData(); }
    });

    // Form setup
    this.populateTimeDropdowns();
    this.renderColorPalette();

    // Quick add
    document.getElementById('btnQuickAdd').addEventListener('click', () => this.openAddModal());
    document.getElementById('btnFloatAdd').addEventListener('click', () => this.openAddModal());

    // Card modal
    document.getElementById('btnModalClose').addEventListener('click', () => this.closeCardModal());
    document.getElementById('btnCancelCard').addEventListener('click', () => this.closeCardModal());
    document.getElementById('cardForm').addEventListener('submit', (e) => this.handleSaveCard(e));
    document.getElementById('btnDeleteCard').addEventListener('click', () => this.handleDeleteCard());

    // Detail modal
    document.getElementById('btnDetailClose').addEventListener('click', () => this.closeDetailModal());
    document.getElementById('btnDetailEdit').addEventListener('click', () => {
      const c = this.findCardById(document.getElementById('detailModal').dataset.activeCardId);
      this.closeDetailModal(); if (c) this.openEditModal(c);
    });
    document.getElementById('btnDetailDelete').addEventListener('click', () => {
      const id = document.getElementById('detailModal').dataset.activeCardId;
      this.deleteCardById(id); this.closeDetailModal(); this.renderAll();
      this.showToast('已刪除行程卡片（可點擊復原按鈕撤銷）');
    });

    // Copy / Move
    document.getElementById('btnDetailCopyDay')?.addEventListener('click', () => {
      const c = this.findCardById(document.getElementById('detailModal').dataset.activeCardId);
      if (c) this.openDayPickerModal('copy', c);
    });
    document.getElementById('btnDetailMoveDay')?.addEventListener('click', () => {
      const c = this.findCardById(document.getElementById('detailModal').dataset.activeCardId);
      if (c) this.openDayPickerModal('move', c);
    });

    // Transport buttons
    document.querySelectorAll('.transport-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTransportType = btn.dataset.type;
      });
    });

    // Data modal
    document.getElementById('btnDataMenu').addEventListener('click', () => this.openDataModal());
    document.getElementById('btnExportJson').addEventListener('click', () => this.exportJsonFile());
    document.getElementById('btnImportJsonTrigger').addEventListener('click', () => document.getElementById('fileJsonInput').click());
    document.getElementById('fileJsonInput').addEventListener('change', (e) => this.handleImportFile(e));
    document.getElementById('btnDataModalClose').addEventListener('click', () => this.closeDataModal());
    document.getElementById('btnActionDownload').addEventListener('click', () => this.exportJsonFile());
    document.getElementById('btnActionUpload').addEventListener('click', () => document.getElementById('fileJsonInput').click());
    document.getElementById('btnActionCopyCode').addEventListener('click', () => this.copyShareCode());
    document.getElementById('btnActionPasteCode')?.addEventListener('click', () => this.pasteShareCode());

    document.getElementById('btnActionCreateNewTrip').addEventListener('click', () => {
      if (confirm('確定要清空並建立全新的空白行程嗎？\n（建議先備份目前行程 JSON 檔案）')) {
        this.data = createDefaultEmptyTrip(); this.saveData(); this.closeDataModal(); this.renderAll();
        this.showToast('已建立全新空白行程！');
      }
    });

    // Date range picker
    document.getElementById('btnApplyDateRange')?.addEventListener('click', () => this.applyDateRange());

    // Currency selector
    document.getElementById('currencySelect')?.addEventListener('change', () => {
      this.data.currency = document.getElementById('currencySelect').value;
      this.saveData(); this.renderAll(); this.updateBudgetSummary();
      this.showToast(`貨幣已切換為 ${this.data.currency}`);
    });

    // Wishlist
    document.getElementById('btnWishlistMenu')?.addEventListener('click', () => this.openWishlistModal());
    document.getElementById('btnFloatWishlist')?.addEventListener('click', () => this.openWishlistModal());
    document.getElementById('btnWishlistModalClose').addEventListener('click', () => this.closeWishlistModal());

    const tabI = document.getElementById('tabWishlistItems');
    const tabIm = document.getElementById('tabWishlistImport');
    const panI = document.getElementById('panelWishlistItems');
    const panIm = document.getElementById('panelWishlistImport');
    tabI.addEventListener('click', () => { tabI.classList.add('active'); tabIm.classList.remove('active'); panI.classList.remove('hidden'); panIm.classList.add('hidden'); });
    tabIm.addEventListener('click', () => { tabIm.classList.add('active'); tabI.classList.remove('active'); panIm.classList.remove('hidden'); panI.classList.add('hidden'); });

    document.getElementById('btnAddSingleWishlist').addEventListener('click', () => this.handleAddSingleWishlist());
    document.getElementById('btnRunBatchImport').addEventListener('click', () => this.handleBatchGoogleMapsImport());
    document.getElementById('btnPickFromWishlist')?.addEventListener('click', () => this.openWishlistModal(true));

    // Undo
    document.getElementById('btnUndo')?.addEventListener('click', () => this.undoLastDelete());

    // Day picker modal close
    document.getElementById('btnDayPickerClose')?.addEventListener('click', () => this.closeDayPickerModal());

    // Close modals on backdrop
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) { modal.classList.add('hidden'); const mf = document.getElementById('mapFrame'); if (mf) mf.src = ''; }
      });
    });
  }

  // ── Date Range Picker ────────────────────────────────────────────────────

  applyDateRange() {
    const sd = document.getElementById('tripStartDate').value;
    const ed = document.getElementById('tripEndDate').value;
    if (!sd || !ed) { alert('請選擇開始與結束日期！'); return; }
    if (new Date(ed) < new Date(sd)) { alert('結束日期不能早於開始日期！'); return; }

    const diff = dateDiffDays(sd, ed) + 1;
    if (diff > 30) { alert('行程最多支援 30 天！'); return; }

    // Preserve existing cards by date mapping
    const existingByDate = {};
    this.data.days.forEach(d => { existingByDate[d.date] = d.cards; });

    const newDays = [];
    for (let i = 0; i < diff; i++) {
      const dt = new Date(sd);
      dt.setDate(dt.getDate() + i);
      const ds = dt.toISOString().split('T')[0];
      newDays.push({
        dayNumber: i + 1,
        date: ds,
        label: `Day ${i + 1}`,
        cards: existingByDate[ds] || []
      });
    }

    this.data.days = newDays;
    this.data.startDate = sd;
    this.data.endDate = ed;
    this.data.currentDayIndex = 0;
    this.saveData();
    this.closeDataModal();
    this.renderAll();
    this.showToast(`已套用日期區間：${sd} ~ ${ed} (${diff} 天)`);
  }

  // ── Time Dropdowns (10-min) ──────────────────────────────────────────────

  populateTimeDropdowns() {
    const ss = document.getElementById('cardStartTime');
    const se = document.getElementById('cardEndTime');
    ss.innerHTML = ''; se.innerHTML = '';
    // 00:00 to 24:00, every 10 min → 145 options
    for (let slot = 0; slot <= TOTAL_SLOTS; slot++) {
      const tm = slot * SLOT_MINUTES;
      const h = Math.floor(tm / 60), m = tm % 60;
      const ts = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      ss.appendChild(new Option(ts, ts));
      se.appendChild(new Option(ts, ts));
    }
  }

  renderColorPalette() {
    const c = document.getElementById('colorPalette');
    c.innerHTML = '';
    COLOR_PRESETS.forEach(color => {
      const sw = document.createElement('div');
      sw.className = `color-swatch ${color === this.selectedColor ? 'selected' : ''}`;
      sw.style.backgroundColor = color;
      sw.addEventListener('click', () => {
        c.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        this.selectedColor = color;
        document.getElementById('cardColor').value = color;
      });
      c.appendChild(sw);
    });
  }

  populateDayDropdown(sel) {
    const dd = document.getElementById('cardTargetDay');
    if (!dd) return;
    dd.innerHTML = '';
    this.data.days.forEach((day, i) => {
      const opt = new Option(`Day ${day.dayNumber} (${formatDateStr(day.date)})`, i);
      if (i === sel) opt.selected = true;
      dd.appendChild(opt);
    });
  }

  // ── Card CRUD ────────────────────────────────────────────────────────────

  findCardById(id) {
    for (const d of this.data.days) { const c = d.cards.find(x => x.id === id); if (c) return c; }
    return null;
  }

  findCardDayIndex(id) {
    for (let i = 0; i < this.data.days.length; i++) { if (this.data.days[i].cards.find(x => x.id === id)) return i; }
    return -1;
  }

  deleteCardById(id) {
    for (const d of this.data.days) {
      const idx = d.cards.findIndex(x => x.id === id);
      if (idx !== -1) {
        const del = d.cards.splice(idx, 1)[0];
        this.undoStack.push({ card: JSON.parse(JSON.stringify(del)), dayIndex: this.data.days.indexOf(d) });
        this.saveData(); return del;
      }
    }
    return null;
  }

  undoLastDelete() {
    if (this.undoStack.length === 0) { this.showToast('沒有可以復原的操作'); return; }
    const last = this.undoStack.pop();
    if (last.dayIndex >= 0 && last.dayIndex < this.data.days.length) {
      this.data.days[last.dayIndex].cards.push(last.card);
      this.saveData(); this.data.currentDayIndex = last.dayIndex;
      this.renderAll(); this.showToast(`已復原「${last.card.title}」！`);
    }
  }

  updateUndoButton() {
    const b = document.getElementById('btnUndo');
    if (b) b.classList.toggle('hidden', this.undoStack.length === 0);
  }

  openAddModal() {
    document.getElementById('modalTitle').textContent = '新增行程卡片';
    document.getElementById('editCardId').value = '';
    document.getElementById('cardTitle').value = '';
    this.populateDayDropdown(this.data.currentDayIndex);
    document.getElementById('cardStartTime').value = '10:00';
    document.getElementById('cardEndTime').value = '11:30';
    document.getElementById('cardLocation').value = '';
    document.getElementById('cardMapLink').value = '';
    document.getElementById('cardUrl').value = '';
    document.getElementById('cardTransportNote').value = '';
    document.getElementById('cardNotes').value = '';
    document.getElementById('cardCost').value = '';
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
    this.populateDayDropdown(Math.max(0, this.findCardDayIndex(card.id)));
    document.getElementById('cardStartTime').value = card.startTime || '10:00';
    document.getElementById('cardEndTime').value = card.endTime || '11:30';
    document.getElementById('cardLocation').value = card.location || '';
    document.getElementById('cardMapLink').value = card.mapLink || '';
    document.getElementById('cardUrl').value = card.url || '';
    document.getElementById('cardTransportNote').value = card.transportNote || '';
    document.getElementById('cardNotes').value = card.notes || '';
    document.getElementById('cardCost').value = card.cost || '';
    document.getElementById('btnDeleteCard').classList.remove('hidden');
    this.selectedColor = card.color || COLOR_PRESETS[0];
    this.renderColorPalette();
    this.selectTransportType(card.transportType || 'subway');
    document.getElementById('cardModal').classList.remove('hidden');
  }

  closeCardModal() { document.getElementById('cardModal').classList.add('hidden'); }

  selectTransportType(type) {
    this.selectedTransportType = type;
    document.querySelectorAll('.transport-btn').forEach(b => b.classList.toggle('selected', b.dataset.type === type));
  }

  handleSaveCard(e) {
    e.preventDefault();
    const id = document.getElementById('editCardId').value;
    const title = document.getElementById('cardTitle').value.trim();
    const tdi = parseInt(document.getElementById('cardTargetDay').value, 10);
    const st = document.getElementById('cardStartTime').value;
    const et = document.getElementById('cardEndTime').value;
    const loc = document.getElementById('cardLocation').value.trim();
    let ml = document.getElementById('cardMapLink').value.trim();
    const url = document.getElementById('cardUrl').value.trim();
    const tn = document.getElementById('cardTransportNote').value.trim();
    const notes = document.getElementById('cardNotes').value.trim();
    const cost = document.getElementById('cardCost').value.trim();
    const color = this.selectedColor;

    if (!ml && loc) ml = `https://maps.google.com/?q=${encodeURIComponent(loc)}`;

    const targetDay = this.data.days[tdi] || this.getCurrentDay();

    if (id) {
      let found = null, origIdx = -1;
      this.data.days.forEach((d, di) => { const c = d.cards.find(x => x.id === id); if (c) { found = c; origIdx = di; } });
      if (found) {
        Object.assign(found, { title, startTime: st, endTime: et, color, location: loc, mapLink: ml, url, transportType: this.selectedTransportType, transportNote: tn, notes, cost });
        if (origIdx !== tdi) {
          this.data.days[origIdx].cards = this.data.days[origIdx].cards.filter(c => c.id !== id);
          targetDay.cards.push(found);
          this.data.currentDayIndex = tdi;
        }
      }
    } else {
      targetDay.cards.push({
        id: `card_${Date.now()}`, title, startTime: st, endTime: et, color, location: loc, mapLink: ml, url,
        transportType: this.selectedTransportType, transportNote: tn, notes, cost
      });
      this.data.currentDayIndex = tdi;
    }
    this.saveData(); this.closeCardModal(); this.renderAll();
    this.showToast('行程已成功儲存！');
  }

  handleDeleteCard() {
    const id = document.getElementById('editCardId').value;
    if (!id) return;
    if (confirm('確定要刪除這筆行程嗎？')) {
      this.deleteCardById(id); this.closeCardModal(); this.renderAll();
      this.showToast('已刪除行程卡片（可點擊復原按鈕撤銷）');
    }
  }

  // ── Day Picker Modal ─────────────────────────────────────────────────────

  openDayPickerModal(action, card) {
    const modal = document.getElementById('dayPickerModal');
    if (!modal) return;
    modal.dataset.action = action;
    modal.dataset.cardId = card.id;
    document.getElementById('dayPickerTitle').textContent = action === 'copy' ? `複製「${card.title}」到：` : `搬移「${card.title}」到：`;
    const list = document.getElementById('dayPickerList');
    list.innerHTML = '';
    const curIdx = this.findCardDayIndex(card.id);
    this.data.days.forEach((day, i) => {
      const btn = document.createElement('button');
      btn.className = 'day-picker-item';
      if (i === curIdx && action === 'move') { btn.classList.add('disabled'); btn.disabled = true; }
      btn.innerHTML = `<span class="day-picker-badge" style="background:var(--accent-gradient)">Day ${day.dayNumber}</span>
        <span class="day-picker-date">${formatDateStr(day.date)}</span>
        <span class="day-picker-count">${day.cards.length} 項</span>`;
      btn.addEventListener('click', () => {
        if (action === 'copy') this.executeCopyCard(card, i);
        else this.executeMoveCard(card, curIdx, i);
        this.closeDayPickerModal(); this.closeDetailModal();
      });
      list.appendChild(btn);
    });
    modal.classList.remove('hidden');
    this.initLucide();
  }

  closeDayPickerModal() { document.getElementById('dayPickerModal')?.classList.add('hidden'); }

  executeCopyCard(card, tdi) {
    const cp = JSON.parse(JSON.stringify(card));
    cp.id = `card_${Date.now()}_${Math.random().toString(36).substr(2,4)}`;
    this.data.days[tdi].cards.push(cp);
    this.saveData(); this.data.currentDayIndex = tdi; this.renderAll();
    this.showToast(`已複製「${card.title}」至 Day ${tdi + 1}！`);
  }

  executeMoveCard(card, from, to) {
    if (from === to) { this.showToast('此行程已在當天！'); return; }
    this.data.days[from].cards = this.data.days[from].cards.filter(c => c.id !== card.id);
    this.data.days[to].cards.push(card);
    this.saveData(); this.data.currentDayIndex = to; this.renderAll();
    this.showToast(`已將「${card.title}」搬移至 Day ${to + 1}！`);
  }

  // ── Detail Modal ─────────────────────────────────────────────────────────

  openDetailModal(card) {
    const modal = document.getElementById('detailModal');
    modal.dataset.activeCardId = card.id;
    document.getElementById('detailTitle').textContent = card.title;
    document.getElementById('detailTimeBadge').textContent = `${card.startTime} - ${card.endTime}`;

    const cb = document.getElementById('detailCostBadge');
    if (cb) {
      if (card.cost && parseFloat(card.cost) > 0) { cb.textContent = `💰 ${this.data.currency} ${parseFloat(card.cost).toLocaleString()}`; cb.classList.remove('hidden'); }
      else cb.classList.add('hidden');
    }

    const tb = document.getElementById('detailTransportBox');
    if (card.transportNote || card.transportType) {
      tb.classList.remove('hidden');
      document.getElementById('detailTransportTag').textContent = TRANSPORT_MAP[card.transportType] || '🚇 交通方式';
      document.getElementById('detailTransportDesc').textContent = card.transportNote || '未填寫';
    } else tb.classList.add('hidden');

    const li = document.getElementById('detailLocationItem');
    const lt = document.getElementById('detailLocationText');
    const mb = document.getElementById('detailMapOpenBtn');
    if (card.location || card.mapLink) {
      li.classList.remove('hidden');
      lt.textContent = card.location || '查看 Google 地圖位置';
      mb.href = card.mapLink || `https://maps.google.com/?q=${encodeURIComponent(card.location)}`;
      mb.classList.remove('hidden');
    } else { lt.textContent = '未填寫具體地點'; mb.classList.add('hidden'); }

    const lk = document.getElementById('detailLinkItem');
    const el = document.getElementById('detailExternalLink');
    if (card.url) { lk.classList.remove('hidden'); el.href = card.url; el.textContent = card.url; }
    else lk.classList.add('hidden');

    const mf = document.getElementById('mapFrame');
    const mfb = document.getElementById('mapFallback');
    const q = card.location || (card.mapLink ? this.extractMapQuery(card.mapLink) : card.title);
    if (q) { mf.classList.remove('hidden'); mfb.classList.add('hidden'); mf.src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`; }
    else { mf.classList.add('hidden'); mfb.classList.remove('hidden'); }

    document.getElementById('detailNotesText').textContent = card.notes || '尚無特別備註。點擊下方「編輯」隨時補充！';
    modal.classList.remove('hidden');
    this.initLucide();
  }

  extractMapQuery(url) { try { return new URL(url).searchParams.get('q') || ''; } catch { return ''; } }

  closeDetailModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mapFrame').src = '';
  }

  // ── Data Modal ───────────────────────────────────────────────────────────

  openDataModal() {
    document.getElementById('dataModal').classList.remove('hidden');
    const cs = document.getElementById('currencySelect');
    if (cs) cs.value = this.data.currency || 'JPY';
    const sd = document.getElementById('tripStartDate');
    const ed = document.getElementById('tripEndDate');
    if (sd) sd.value = this.data.startDate || '';
    if (ed) ed.value = this.data.endDate || '';
    this.updateBudgetSummary();
    this.initLucide();
  }

  updateBudgetSummary() {
    const el = document.getElementById('totalBudgetDisplay');
    if (!el) return;
    let total = 0;
    this.data.days.forEach(d => d.cards.forEach(c => { total += parseFloat(c.cost) || 0; }));
    el.textContent = `總預算：${this.data.currency} ${total.toLocaleString()}`;
  }

  closeDataModal() { document.getElementById('dataModal').classList.add('hidden'); }

  exportJsonFile() {
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.data, null, 2));
    a.download = `${this.data.title.replace(/\s+/g, '_')}_travelgogo.json`;
    document.body.appendChild(a); a.click(); a.remove();
    this.showToast('已匯出行程 JSON 檔案！');
  }

  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        if (d?.days && Array.isArray(d.days)) {
          this.data = d; this.data.currentDayIndex = 0;
          if (!this.data.currency) this.data.currency = 'JPY';
          this.saveData(); this.renderAll(); this.closeDataModal();
          this.showToast('成功匯入行程！');
        } else alert('JSON 格式不符合規範。');
      } catch { alert('解析 JSON 失敗。'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  copyShareCode() {
    try {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
      navigator.clipboard.writeText(code).then(() => this.showToast('行程代碼已複製！')).catch(() => prompt('請手動複製：', code));
    } catch(e) { alert('壓縮失敗：' + e.message); }
  }

  pasteShareCode() {
    const code = prompt('請貼上旅伴分享的行程代碼：');
    if (!code) return;
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (d?.days && Array.isArray(d.days)) {
        this.data = d; this.data.currentDayIndex = 0;
        if (!this.data.currency) this.data.currency = 'JPY';
        this.saveData(); this.closeDataModal(); this.renderAll();
        this.showToast('成功從代碼匯入行程！');
      } else alert('代碼格式不正確。');
    } catch { alert('解析代碼失敗。'); }
  }

  showToast(msg) {
    const t = document.getElementById('toastNotification');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.add('hidden'), 2800);
  }

  // ── Wishlist ─────────────────────────────────────────────────────────────

  openWishlistModal(selectMode = false) {
    this.wishlistSelectMode = selectMode;
    document.getElementById('wishlistModal').classList.remove('hidden');
    document.getElementById('tabWishlistItems').click();
    this.renderWishlist();
    this.initLucide();
  }

  closeWishlistModal() { document.getElementById('wishlistModal').classList.add('hidden'); this.wishlistSelectMode = false; }

  renderWishlist() {
    const c = document.getElementById('wishlistItemsContainer');
    if (!c) return;
    c.innerHTML = '';
    const ce = document.getElementById('wishlistCount');
    if (ce) ce.textContent = this.wishlist.length;
    const dot = document.getElementById('wishlistBadgeDot');
    if (dot) dot.classList.toggle('hidden', this.wishlist.length === 0);

    if (this.wishlist.length === 0) {
      c.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--text-dim);">
        <p>口袋名單目前是空的</p>
        <small>在上方輸入景點名稱，或切換到「批次匯入」標籤貼上 Google Maps 清單。</small></div>`;
      return;
    }

    this.wishlist.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'wishlist-item-card';
      card.innerHTML = `
        <div class="wishlist-item-main">
          <div class="wishlist-item-title">📍 ${item.title}</div>
          <div class="wishlist-item-sub">${item.location || (item.mapLink ? '有 Google Maps 連結' : '尚未設定地址')}</div>
        </div>
        <div class="wishlist-item-actions">
          <button type="button" class="btn-wishlist-add-to-plan" data-idx="${idx}">
            <i data-lucide="${this.wishlistSelectMode ? 'check' : 'plus'}"></i>
            <span>${this.wishlistSelectMode ? '帶入此點' : '加入行程'}</span>
          </button>
          <button type="button" class="btn-wishlist-del" data-idx="${idx}" title="刪除"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
        </div>`;
      card.querySelector('.btn-wishlist-add-to-plan').addEventListener('click', () => this.useWishlistItem(item));
      card.querySelector('.btn-wishlist-del').addEventListener('click', () => {
        this.wishlist.splice(idx, 1); this.saveWishlist(); this.showToast(`已從口袋名單移除「${item.title}」`);
      });
      c.appendChild(card);
    });
    this.initLucide();
  }

  handleAddSingleWishlist() {
    const ni = document.getElementById('inputWishlistName');
    const li = document.getElementById('inputWishlistLoc');
    const title = ni.value.trim(), loc = li.value.trim();
    if (!title) { alert('請輸入地點名稱！'); return; }
    let mapLink = '', location = '';
    if (loc.startsWith('http')) { mapLink = loc; location = title; }
    else { location = loc || title; mapLink = `https://maps.google.com/?q=${encodeURIComponent(location)}`; }
    this.wishlist.push({ id: `wish_${Date.now()}_${Math.random().toString(36).substr(2,4)}`, title, location, mapLink });
    this.saveWishlist(); ni.value = ''; li.value = '';
    this.showToast(`已將「${title}」加入口袋名單！`);
  }

  handleBatchGoogleMapsImport() {
    const ta = document.getElementById('textareaGoogleMapsImport');
    const text = ta.value.trim();
    if (!text) { alert('請先貼上景點名稱或網址清單！'); return; }

    const lines = text.split('\n');
    let count = 0;

    lines.forEach(line => {
      let raw = line.trim();
      if (!raw) return;

      // Try to extract URL
      const urlMatch = raw.match(/(https?:\/\/[^\s]+)/);
      let mapLink = urlMatch ? urlMatch[0] : '';
      let title = raw.replace(/(https?:\/\/[^\s]+)/, '').trim();
      
      // Clean prefix numbering
      title = title.replace(/^[\d\.\-\*\•\s]+/, '').trim();

      // If line is purely a Google Maps list URL, mark it for special handling
      if (!title && mapLink) {
        // Check if it's a Google Maps place URL - extract place name from URL
        const placeMatch = mapLink.match(/place\/([^\/\?]+)/);
        if (placeMatch) {
          title = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
        } else {
          title = 'Google Maps 景點';
        }
      }

      if (title || mapLink) {
        if (!mapLink && title) mapLink = `https://maps.google.com/?q=${encodeURIComponent(title)}`;
        this.wishlist.push({
          id: `wish_${Date.now()}_${Math.random().toString(36).substr(2,4)}_${count}`,
          title: title || '自訂景點',
          location: title || '',
          mapLink
        });
        count++;
      }
    });

    if (count > 0) {
      this.saveWishlist(); ta.value = '';
      document.getElementById('tabWishlistItems').click();
      this.showToast(`成功批次匯入 ${count} 個口袋景點！`);
    } else { alert('未識別到有效景點。'); }
  }

  useWishlistItem(item) {
    if (this.wishlistSelectMode) {
      document.getElementById('cardTitle').value = item.title || '';
      document.getElementById('cardLocation').value = item.location || item.title || '';
      document.getElementById('cardMapLink').value = item.mapLink || '';
      this.closeWishlistModal();
      this.showToast(`已將「${item.title}」帶入表單！`);
    } else {
      this.closeWishlistModal();
      this.openAddModal();
      document.getElementById('cardTitle').value = item.title || '';
      document.getElementById('cardLocation').value = item.location || item.title || '';
      document.getElementById('cardMapLink').value = item.mapLink || '';
      this.showToast('已開啟快速排程，請選擇時段後儲存！');
    }
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  window.tripManager = new TripManager();
});
