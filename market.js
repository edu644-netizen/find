// 가상 중고거래소 (CarrotMarket) 클라이언트 스크립트

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
});

// REST API로 중고 상품 목록 불러오기
async function fetchProducts() {
  try {
    const res = await fetch('/api/market/items');
    const data = await res.json();
    if (data.status === 'success') {
      renderProducts(data.items);
    }
  } catch (err) {
    console.error('상품 로드 실패:', err);
  }
}

// 화면 렌더링 (삭제 버튼 포함)
function renderProducts(items) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 30px; color:#868e96;">등록된 중고 물품이 없습니다.</p>';
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="card">
      <img class="card-img" src="${item.imageUrl}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&auto=format&fit=crop&q=60'">
      <div class="card-body">
        <h4 class="card-title">${item.title}</h4>
        <div class="card-price">${item.price.toLocaleString()}원</div>
        <div class="card-meta">
          <span><i class="fa-solid fa-location-dot"></i> ${item.location}</span>
          <span>${item.seller}</span>
        </div>
        <button class="btn-delete" onclick="deleteProduct('${item.id}', event)">
          <i class="fa-solid fa-trash-can"></i> 게시글 삭제
        </button>
      </div>
    </div>
  `).join('');
}

// 게시글 삭제 처리
async function deleteProduct(id, e) {
  if (e) e.stopPropagation();

  if (!confirm('정말로 이 중고 게시글을 삭제하시겠습니까?')) {
    return;
  }

  try {
    const res = await fetch(`/api/market/items/${id}`, {
      method: 'DELETE'
    });
    const result = await res.json();

    if (result.status === 'success') {
      alert('🗑️ 게시글이 삭제되었습니다.');
      fetchProducts(); // 목록 새로고침
    } else {
      alert('삭제 중 오류가 발생했습니다.');
    }
  } catch (err) {
    console.error('삭제 에러:', err);
    alert('삭제 처리 중 오류가 발생했습니다.');
  }
}

// 판매물품 등록 API 요청
async function submitProduct(e) {
  e.preventDefault();

  const productData = {
    title: document.getElementById('title').value,
    category: document.getElementById('category').value,
    price: document.getElementById('price').value,
    location: document.getElementById('location').value,
    seller: document.getElementById('seller').value,
    imageUrl: document.getElementById('imageUrl').value,
    description: document.getElementById('description').value
  };

  try {
    const res = await fetch('/api/market/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const result = await res.json();
    if (result.status === 'success') {
      alert('🥕 당근 중고 거래소에 성공적으로 판매물품이 등록되었습니다!');
      closeModal('modal-add');
      document.getElementById('form-add').reset();
      fetchProducts(); // 리스트 갱신
    }
  } catch (err) {
    alert('등록 중 오류가 발생했습니다.');
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}
