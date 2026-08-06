// 🧽 비키니시티 분실물 추적 스캐너 엔진 (public_finder/finder.js)

const socket = io();

let isMacroRunning = false;
let macroTimer = null;
let scanCount = 0;

let state = {
  lostItems: [],
  detectedMatches: []
};

document.addEventListener('DOMContentLoaded', () => {
  socket.on('init-finder-data', (data) => {
    state.lostItems = data.lostItems || [];
    renderLostItems();
  });

  socket.on('lost-item-updated', (data) => {
    state.lostItems = data.lostItems || [];
    renderLostItems();
  });
});

// 실시간 탐색 토글
function toggleMacro() {
  isMacroRunning = !isMacroRunning;
  const btn = document.getElementById('macro-toggle-btn');
  const statusText = document.getElementById('macro-status-text');

  if (isMacroRunning) {
    btn.className = 'sponge-switch on';
    statusText.innerText = 'ON (탐색 중)';
    addLogLine('sys', '🧽 [스캐너 가동] 중고 거래 사이트(localhost:4000)를 2.5초 간격으로 실시간 탐색합니다.');
    
    runMacroCycle();
    macroTimer = setInterval(runMacroCycle, 2500);
  } else {
    btn.className = 'sponge-switch off';
    statusText.innerText = 'OFF (정지)';
    addLogLine('sys', '☕ [스캐너 정지] 탐색 스캐너가 일시 정지되었습니다.');
    if (macroTimer) clearInterval(macroTimer);
  }
}

// 1회 탐색 사이클
async function runMacroCycle() {
  if (!isMacroRunning) return;

  scanCount++;
  document.getElementById('scan-counter').innerText = `탐색 횟수: ${scanCount}회`;

  const timeStr = new Date().toLocaleTimeString();
  addLogLine('scan', `[${timeStr}] 🌊 [탐색 #${scanCount}] 중고 거래소(localhost:4000) 물품 데이터를 크롤링 중...`);

  try {
    const res = await fetch('http://localhost:4000/api/market/items');
    const data = await res.json();

    if (data.status === 'success' && data.items) {
      addLogLine('scan', `   ↳ 총 ${data.items.length}개의 중고 상품 수신 완료. 분실물 비교 검사 중...`);
      analyzeMatches(data.items);
    }
  } catch (err) {
    addLogLine('sys', `⚠️ [탐색 실패] 중고 거래 사이트(http://localhost:4000)에 연결할 수 없습니다.`);
  }
}

// 매칭 분석
function analyzeMatches(marketItems) {
  state.lostItems.forEach(lost => {
    marketItems.forEach(market => {
      const score = calculateScore(lost, market);
      const matchKey = `${lost.id}-${market.id}`;
      const alreadyDetected = state.detectedMatches.some(m => m.key === matchKey);

      if (score >= 60 && !alreadyDetected) {
        const matchResult = { key: matchKey, score, lost, market, detectedAt: new Date().toLocaleTimeString() };
        state.detectedMatches.unshift(matchResult);

        addLogLine('found', `🌸 [감지 성공!] "${market.title}" ➔ 내 분실물 [${lost.title}]과 ${score}% 일치 발견!`);
        showToast(score, lost, market);
        playAlertBeep();

        renderMatches();
      }
    });
  });
}

// 유사도 점수 계산 (0~99%)
function calculateScore(lost, market) {
  let score = 0;
  const lostTitle = (lost.title || '').toLowerCase().replace(/\s+/g, '');
  const lostDesc = (lost.description || '').toLowerCase().replace(/\s+/g, '');
  const marketTitle = (market.title || '').toLowerCase().replace(/\s+/g, '');
  const marketDesc = (market.description || '').toLowerCase().replace(/\s+/g, '');

  if (lost.category && market.category && lost.category === market.category) {
    score += 20;
  }

  const keywords = lost.keywords || [];
  if (keywords.length > 0) {
    let matchCount = 0;
    keywords.forEach(kw => {
      const cleanKw = kw.toLowerCase().trim();
      if (cleanKw && (marketTitle.includes(cleanKw) || marketDesc.includes(cleanKw))) {
        matchCount++;
      }
    });
    score += Math.round((matchCount / keywords.length) * 50);
  }

  if (lost.lostLocation && market.location && market.location.includes(lost.lostLocation.slice(0, 3))) {
    score += 15;
  }

  ['뚱이', '인형', '핑크', '키링', '꽃무늬', '스티커'].forEach(kw => {
    if (lostDesc.includes(kw) && (marketTitle.includes(kw) || marketDesc.includes(kw))) {
      score += 5;
    }
  });

  return Math.min(score, 99);
}

// 콘솔 로그 출력
function addLogLine(type, text) {
  const body = document.getElementById('terminal-logs');
  if (!body) return;

  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerText = text;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

function renderLostItems() {
  const container = document.getElementById('lost-items-list');
  if (!container) return;

  container.innerHTML = state.lostItems.map(item => `
    <div class="lost-item-box">
      <div class="lost-item-head">
        <span><i class="fa-solid fa-heart text-pink"></i> ${item.title}</span>
      </div>
      <p style="font-size:0.82rem; color:var(--text-sub); margin-top:4px;">${item.description}</p>
      <div class="tags">
        ${(item.keywords || []).map(kw => `<span class="tag-item">#${kw}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderMatches() {
  const container = document.getElementById('matched-results');
  if (!container) return;

  if (state.detectedMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-waiting-box">
        <img src="https://static.wikia.nocookie.net/spongebob/images/5/53/Patrick_and_SpongeBob_cheeks.png" alt="볼 빵빵 원작 스폰지밥과 뚱이" class="waiting-img" onerror="this.src='https://images.unsplash.com/photo-1563089145-599997674d42?w=500'">
        <p>스폰지밥과 뚱이가 중고 거래 사이트를 모니터링 중입니다...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.detectedMatches.map(m => `
    <div class="match-box">
      <div>
        <h4 style="font-size:1rem; margin-bottom:4px; color:var(--sea-blue-deep);">
          <a href="http://localhost:4000" target="_blank" style="color: inherit; text-decoration: underline;">
            ${m.market.title}
          </a>
        </h4>
        <p style="font-size:0.83rem; color:var(--text-sub);">
          내 분실물 [${m.lost.title}] 과 매칭됨 | 판매가 ${m.market.price.toLocaleString()}원 (${m.market.seller})
        </p>
        <small style="font-size:0.75rem; color:#818cf8;">감지 시간: ${m.detectedAt}</small>
      </div>
      <div class="match-score-badge">🎯 ${m.score}% 일치</div>
    </div>
  `).join('');
}

// 토스트 팝업 (원작 무지개 스폰지밥 짤 연동!)
function showToast(score, lost, market) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <img src="https://static.wikia.nocookie.net/spongebob/images/e/e0/Imagination.png" alt="원작 무지개 스폰지밥" class="toast-rainbow-img" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500'">
    <div style="color:var(--sponge-yellow-dark); font-weight:800; font-size:1rem; margin-bottom:6px;">
      <i class="fa-solid fa-bell fa-bounce"></i> 🧽 [일치 중고물품 감지 성공!]
    </div>
    <div style="font-size:0.88rem;">
      중고 글 <strong>"${market.title}"</strong> 이(가)<br>
      내 분실물 <strong>[${lost.title}]</strong>과 <span style="color:var(--sea-blue-deep); font-weight:800;">${score}% 일치</span>합니다!
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 6000);
}

function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

function submitLostItem(e) {
  e.preventDefault();
  const newItem = {
    title: document.getElementById('lost-title').value,
    category: document.getElementById('lost-category').value,
    keywords: document.getElementById('lost-keywords').value,
    lostLocation: document.getElementById('lost-location').value,
    owner: document.getElementById('lost-owner').value,
    description: document.getElementById('lost-desc').value
  };

  socket.emit('add-lost-item', newItem);
  closeModal('modal-add-lost');
  document.getElementById('form-lost').reset();
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
