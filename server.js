// ====================================================================
// 🚀 분실물 자동 추적 & 가상 중고거래 웹 서비스 백엔드 (server.js)
// ====================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

// ====================================================================
// 🏪 1. 가상 중고 거래 전용 서버 (Port 4000)
// ====================================================================
const marketApp = express();
marketApp.use(cors());
marketApp.use(express.json());
marketApp.use(express.static(path.join(__dirname, 'public_market')));

// 중고 거래소 가상 데이터베이스
let marketProducts = [
  {
    id: 'm-101',
    title: '삼천리 자전거 24인치 하이브리드 민트색',
    category: '스포츠/레저',
    price: 90000,
    location: '서울 서대문구 신촌동',
    description: '신촌역 근처에서 타던 자전거입니다. 상태 양호합니다.',
    seller: '라이더킴',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&auto=format&fit=crop&q=60',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 'm-102',
    title: '샤넬 클래식 카드지갑 블랙 (사용감 적음)',
    category: '패션/잡화',
    price: 450000,
    location: '서울 강남구 역삼동',
    description: '선물 받고 몇 번 안 쓴 샤넬 카드지갑입니다.',
    seller: '역삼명품',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&auto=format&fit=crop&q=60',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  }
];

// 중고 상품 목록 조회 REST API
marketApp.get('/api/market/items', (req, res) => {
  res.json({
    status: 'success',
    count: marketProducts.length,
    items: marketProducts
  });
});

// 중고 상품 신규 등록 REST API
marketApp.post('/api/market/items', (req, res) => {
  const { title, category, price, location, description, seller, imageUrl } = req.body;
  if (!title) {
    return res.status(400).json({ error: '제목은 필수 항목입니다.' });
  }

  const defaultImg = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&auto=format&fit=crop&q=60';

  const newProduct = {
    id: 'm-' + Date.now(),
    title: title,
    category: category || '기타',
    price: Number(price) || 0,
    location: location || '서울 마포구 상암동',
    description: description || '',
    seller: seller || '익명 판매자',
    imageUrl: (imageUrl && imageUrl.trim()) ? imageUrl.trim() : defaultImg,
    createdAt: new Date().toISOString()
  };

  marketProducts.unshift(newProduct);
  console.log(`🛒 [중고 거래소] 새 판매글 게시됨: "${newProduct.title}"`);
  res.status(201).json({ status: 'success', item: newProduct });
});

// 🗑️ 중고 상품 삭제 REST API
marketApp.delete('/api/market/items/:id', (req, res) => {
  const { id } = req.params;
  const initialCount = marketProducts.length;
  marketProducts = marketProducts.filter(item => item.id !== id);

  if (marketProducts.length < initialCount) {
    console.log(`🗑️ [중고 거래소] 게시글 삭제됨 (ID: ${id})`);
    res.json({ status: 'success', message: '게시글이 삭제되었습니다.' });
  } else {
    res.status(404).json({ error: '해당 게시글을 찾을 수 없습니다.' });
  }
});

marketApp.listen(4000, '0.0.0.0', () => {
  console.log(`🏪 가상 중고 거래 웹사이트 구동: http://localhost:4000`);
});


// ====================================================================
// 🤖 2. 분실물 자동 추적 전용 서버 (Port 3000)
// ====================================================================
const finderApp = express();
const finderServer = http.createServer(finderApp);
const io = new Server(finderServer, { cors: { origin: "*" } });

finderApp.use(cors());
finderApp.use(express.json());
finderApp.use(express.static(path.join(__dirname, 'public_finder')));

let lostItems = [
  {
    id: 'l-201',
    title: '뚱이 핑크 키링 인형 (가방 고리)',
    category: '패션/잡화',
    keywords: ['뚱이', '인형', '핑크', '키링'],
    lostLocation: '서울 마포구 상암동 DMC역',
    description: '가방에 걸고 다니다가 잃어버린 뚱이 핑크색 인형 키링입니다. 바지에 연보라 꽃무늬가 있어요.',
    owner: '스폰지밥',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];

io.on('connection', (socket) => {
  console.log(`🟢 분실물 추적 클라이언트 접속: [ID: ${socket.id}]`);
  socket.emit('init-finder-data', { lostItems });

  socket.on('add-lost-item', (item) => {
    const newLost = {
      id: 'l-' + Date.now(),
      title: item.title,
      category: item.category || '패션/잡화',
      keywords: item.keywords ? item.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      lostLocation: item.lostLocation || '서울 마포구',
      description: item.description || '',
      owner: item.owner || '분실자',
      createdAt: new Date().toISOString()
    };
    lostItems.unshift(newLost);
    io.emit('lost-item-updated', { lostItems });
    console.log(`🚨 [분실물 추적] 새 분실물 등록됨: "${newLost.title}"`);
  });
});

finderServer.listen(3000, '0.0.0.0', () => {
  console.log(`🤖 분실물 자동 추적 사이트 구동: http://localhost:3000`);
});
