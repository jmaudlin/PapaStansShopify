/* ─── Shared cart JS — do not duplicate in individual sections ─── */
const PS_FREE_SHIP_CENTS = (typeof window.PS_FREE_SHIP_CENTS === 'number' && window.PS_FREE_SHIP_CENTS >= 0) ? window.PS_FREE_SHIP_CENTS : 10000;

function psMoney(c) { return '$' + (c / 100).toFixed(2); }

async function psAddToCart(variantId, title) {
  psShowToast('Adding to cart… 🛒');
  try {
    const r = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    });
    if (!r.ok) throw new Error('Failed');
    await psRefreshCart();
    psShowToast('✅ ' + title + ' added!');
    const pill = document.querySelector('.ps-cart-pill');
    if (pill) { pill.classList.remove('ps-bump'); void pill.offsetWidth; pill.classList.add('ps-bump'); }
    psOpenCart();
  } catch(e) { psShowToast('Something went wrong, please try again.'); }
}

async function psUpdateQty(key, qty) {
  const u = {}; u[key] = qty;
  await fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates: u }) });
  await psRefreshCart();
}
async function psRemoveLine(key) { await psUpdateQty(key, 0); }

async function psRefreshCart() {
  const r = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
  const cart = await r.json();
  psRenderCart(cart);
  const countEl = document.getElementById('psCartCount');
  if (countEl) countEl.textContent = cart.item_count || 0;
}

function psRenderCart(cart) {
  const el = document.getElementById('psCartItems');
  const ft = document.getElementById('psCartFoot');
  if (!el) return;
  if (!cart.items || !cart.items.length) {
    el.innerHTML = '<p class="ps-cart-empty">Your cart is empty!<br>Go find something wonderful 🌿</p>';
    if (ft) ft.style.display = 'none';
    return;
  }
  if (ft) ft.style.display = 'block';
  el.innerHTML = cart.items.map(item => `
    <div class="ps-cart-item">
      <img class="ps-ci-img" src="${item.image ? item.image.replace('http:', 'https:') : ''}" alt="${item.title}" onerror="this.style.visibility='hidden'">
      <div>
        <div class="ps-ci-name">${item.product_title}</div>
        <div class="ps-ci-price">${psMoney(item.price)}</div>
        <div class="ps-ci-qty">
          <button onclick="psUpdateQty('${item.key}',${item.quantity - 1})">−</button>
          <span>${item.quantity}</span>
          <button onclick="psUpdateQty('${item.key}',${item.quantity + 1})">+</button>
        </div>
      </div>
      <button class="ps-ci-remove" onclick="psRemoveLine('${item.key}')">✕</button>
    </div>`).join('');
  document.getElementById('psCartTotal').textContent = psMoney(cart.total_price);
  const shipWrap = document.querySelector('.ps-ship-bar-wrap');
  if (PS_FREE_SHIP_CENTS <= 0) { if (shipWrap) shipWrap.style.display = 'none'; return; }
  if (shipWrap) shipWrap.style.display = '';
  const pct = Math.min((cart.total_price / PS_FREE_SHIP_CENTS) * 100, 100);
  document.getElementById('psShipFill').style.width = pct + '%';
  const rem = psMoney(Math.max(PS_FREE_SHIP_CENTS - cart.total_price, 0));
  document.getElementById('psShipMsg').innerHTML = cart.total_price >= PS_FREE_SHIP_CENTS
    ? '<strong>🎉 Free shipping unlocked!</strong>'
    : `Add <strong>${rem} more</strong> for free shipping 🚚`;
}

let psCartLastFocus = null;
function psOpenCart() {
  psRefreshCart();
  psCartLastFocus = document.activeElement;
  const d = document.getElementById('psCartDrawer');
  d.classList.add('open');
  document.getElementById('psCartOverlay').classList.add('open');
  d.focus();
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const d = document.getElementById('psCartDrawer');
  if (d && d.classList.contains('open')) psCloseCart();
});
function psCloseCart() {
  document.getElementById('psCartDrawer').classList.remove('open');
  document.getElementById('psCartOverlay').classList.remove('open');
  if (psCartLastFocus && psCartLastFocus.focus) psCartLastFocus.focus();
}

let psToastTimer;
function psShowToast(msg) {
  const t = document.getElementById('psToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(psToastTimer);
  psToastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

window.addEventListener('scroll', () => {
  const nav = document.getElementById('psNav');
  if (nav) nav.classList.toggle('scrolled', (document.documentElement.scrollTop || document.body.scrollTop || window.scrollY) > 10);
}, { passive: true });

psRefreshCart();