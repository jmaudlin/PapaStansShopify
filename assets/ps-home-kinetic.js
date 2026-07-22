(function(){
  var herowrap = document.getElementById('psHeroWrap');
  var heroBgDark = document.getElementById('psHeroBgDark');
  var heroPhoto = document.getElementById('psHeroPhoto');
  var heroBucket = document.getElementById('psHeroBucket');
  var heroPanel = document.getElementById('psHeroPanel');
  var heroPanelContent = document.getElementById('psHeroPanelContent');
  var heroZoomLabel = document.getElementById('psHeroZoomLabel');
  var heroRunway = document.getElementById('psHeroRunway');
  var heroTestimonials = document.getElementById('psHeroTestimonials');
  var heroNewsletter = document.getElementById('psHeroNewsletter');
  var wipeD = document.getElementById('psWipeD');
  var wipeBlog = document.getElementById('psWipeBlog');
  var heroBlog = document.getElementById('psHeroBlog');
  var wipeF = document.getElementById('psWipeF');
  var marqueeLayer = document.getElementById('psMarqueeLayer');
  var marqueeRevealed = false;
  var bubbleField = document.getElementById('psBubbleField');
  var heroPin = document.querySelector('.ps-heropin');
  var heroBucketEl = document.getElementById('psHeroBucket');
  var cuesDismissed = false;
  var lastActivity = Date.now();
  var nudgeCooldownUntil = 0;
  var latestP = 0;
  if (!herowrap || !bubbleField) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Phones get the static stacked layout (see the unpin CSS block) — pinned
  // scrubbing fights touch momentum scrolling and iOS URL-bar viewport changes.
  if (window.matchMedia('(max-width: 680px)').matches) {
    // If a rotation/resize crosses back above the breakpoint, the pinned CSS
    // returns but the engine isn't running — reload once to boot it.
    var mq680 = window.matchMedia('(max-width: 680px)');
    var onCross = function (e) { if (!e.matches) location.reload(); };
    if (mq680.addEventListener) { mq680.addEventListener('change', onCross); }
    else if (mq680.addListener) { mq680.addListener(onCross); }
    return;
  }

  // One continuous pin, six phases back to back:
  //   A  bucket tips, panel grows in (covers screen)
  //   B  panel shrinks away, revealing Pick Your Favorites (products)
  //   C  products dwell -- browse via cat tabs / arrows
  //   D  wipe (right-anchored, opposite of B's left-anchored reveal):
  //      products -> blog
  //   E  blog dwell -- latest posts, kinetic cards
  //   W2 wipe (left-anchored): blog -> testimonials
  //   E2 testimonials dwell -- browse the Judge.me carousel
  //   F  wipe (right-anchored): testimonials -> newsletter
  //   G  newsletter dwell, then the pin releases into the footer
  //
  // D+E (testimonials) and F+G (newsletter) are each sized to take exactly
  // the same total scroll distance as A+B (hero -> products), so every
  // "chapter" of the page has the same pacing. Wipe segments (B, D, F) are
  // all equal-length too. Phase C (products dwell) got an extra ~150vh on
  // top of that baseline so there's more time to browse before it wipes on.
  // Chapter order: hero -> products -> blog -> testimonials -> newsletter.
  // Wrapper is 2200vh. Each chapter after the hero gets the same ~436vh of
  // scroll (wipe ~109vh + dwell ~327vh); products dwell keeps its extra ~150vh.
  // Wipes alternate anchor sides: B left, D right, blog left, F right.
  var PA_END = 0.1495, PB_END = 0.1984, PC_END = 0.4032, PD_END = 0.4528,
      PE_END = 0.6016, PW2_END = 0.6512, PE2_END = 0.8000, PF_END = 0.8496;

  var BUBBLE_COUNT = 40;
  var bubbleBase = Array.from({ length: BUBBLE_COUNT }, function(_, i) {
    var ambient = i < 6;
    return {
      ambient: ambient,
      size: ambient ? 8 + Math.random() * 14 : 12 + Math.random() * 46,
      dx: ambient ? (Math.random() - 0.5) * 60 : -(0.15 + Math.random() * 0.85),
      dy: (Math.random() - 0.5) * 2,
      amp: ambient ? 30 + Math.random() * 40 : 120 + Math.random() * 260,
      appearAt: ambient ? 0 : 0.1 + Math.random() * 0.55,
      speed: 0.7 + Math.random() * 0.9
    };
  });
  var bubbles = bubbleBase.map(function() {
    var el = document.createElement('div');
    el.className = 'ps-hb-bubble';
    bubbleField.appendChild(el);
    return el;
  });
  bubbleBase.forEach(function(b, i) {
    bubbles[i].style.width = b.size + 'px';
    bubbles[i].style.height = b.size + 'px';
    bubbles[i].style.opacity = '0';
  });
  var lerp = function(a, b, t) { return a + (b - a) * t; };
  var easeInOutCubic = function(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  var productGrid = document.getElementById('psProductGrid');
  var productGridTarget = 0;

  function onHeroScroll() {
    var rect = herowrap.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var p = Math.min(1, Math.max(0, -rect.top / total));
    latestP = p;
    lastActivity = Date.now();

    // ── First-visit cues: chevron + hint bubbles vanish permanently on first real scroll ──
    if (!cuesDismissed && p > 0.005) {
      cuesDismissed = true;
      if (heroPin) heroPin.classList.add('ps-cues-off');
    }
    var pA = Math.min(1, p / PA_END);
    var ep = easeInOutCubic(pA);
    var pB = Math.min(1, Math.max(0, (p - PA_END) / (PB_END - PA_END)));
    var epB = easeInOutCubic(pB);
    var vw = window.innerWidth, vh = window.innerHeight;

    var bucketW = 140, bucketH = 140;
    var bucketX = vw - bucketW - vw * 0.06;
    var bucketY = vh - bucketH - vh * 0.05;
    heroPhoto.style.left = bucketX + 'px';
    heroPhoto.style.top = bucketY + 'px';
    heroPhoto.style.width = bucketW + 'px';
    heroPhoto.style.height = bucketH + 'px';

    var tip = Math.min(1, Math.max(0, (ep - 0.12) / 0.35));
    var angle = lerp(0, -104, tip);
    heroBucket.style.transform = 'rotate(' + angle + 'deg)';

    heroBgDark.style.opacity = String(1 - Math.min(1, Math.max(0, (ep - 0.6) / 0.35)));

    var spoutX = bucketX + bucketW * lerp(0.55, 0.05, tip);
    var spoutY = bucketY + bucketH * lerp(0.15, 0.45, tip);

    bubbles.forEach(function(el, i) {
      var base = bubbleBase[i];
      var lp = base.ambient ? ep : Math.min(1, Math.max(0, (ep - base.appearAt) / (1 - base.appearAt)));
      var rise = lp * base.amp * base.speed;
      var spread = base.ambient ? base.dx : base.dx * (220 + tip * 900) * lp;
      var x = spoutX + spread;
      var y = spoutY - rise + base.dy * 30 * lp;
      var scale = lerp(base.ambient ? 0.8 : 0.5, base.ambient ? 1.2 : 1.9, lp);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transform = 'scale(' + scale + ')';
      var fadeOut = Math.max(0, lp - 0.78) * 3.5;
      // Ambient bubbles fade in with the pour -- at rest (lp=0) they're invisible
      // so they don't sit frozen at the rim next to the animated stream.
      var baseOpacity = base.ambient ? Math.min(1, lp * 8) * (0.5 + lp * 0.4) : Math.min(1, lp * 1.8);
      el.style.opacity = (!base.ambient && lp <= 0) ? '0' : String(Math.max(0, baseOpacity * (1 - fadeOut)));
    });

    var openT = Math.max(0, ep - epB);
    var topX = lerp(0, 100, openT), bottomX = lerp(0, 78, openT);
    heroPanel.style.clipPath = 'polygon(0 0, ' + topX + '% 0, ' + bottomX + '% 100%, 0 100%)';

    var contentP = Math.min(1, Math.max(0, (ep - 0.45) / 0.55)) * (1 - epB);
    heroPanelContent.style.opacity = contentP;
    heroPanelContent.style.transform = 'translateX(' + lerp(-40, 0, contentP) + 'px)';
    heroPanelContent.style.pointerEvents = contentP > 0.5 ? 'auto' : 'none';

    var labelOpacity = (1 - Math.min(1, ep / 0.3)) * (1 - epB);
    heroZoomLabel.style.opacity = labelOpacity;
    heroZoomLabel.style.pointerEvents = labelOpacity > 0.5 ? 'auto' : 'none';

    heroPhoto.style.opacity = String(1 - epB);
    bubbleField.style.opacity = String(1 - epB);

    // ── Phase D: products -> testimonials (right-anchored wipe, opposite of B) ──
    var pD = Math.min(1, Math.max(0, (p - PC_END) / (PD_END - PC_END)));
    var pD_grow = easeInOutCubic(Math.min(1, pD / 0.5));
    var pD_shrink = easeInOutCubic(Math.max(0, (pD - 0.5) / 0.5));
    var openD = pD_grow - pD_shrink;
    var topXD = lerp(0, 100, openD), bottomXD = lerp(0, 78, openD);
    if (wipeD) wipeD.style.clipPath = 'polygon(' + (100 - topXD) + '% 0, 100% 0, 100% 100%, ' + (100 - bottomXD) + '% 100%)';

    // ── W2 wipe: blog -> testimonials (left-anchored, same direction as B) ──
    var pW2 = Math.min(1, Math.max(0, (p - PE_END) / (PW2_END - PE_END)));
    var pW2_grow = easeInOutCubic(Math.min(1, pW2 / 0.5));
    var pW2_shrink = easeInOutCubic(Math.max(0, (pW2 - 0.5) / 0.5));
    var openW2 = pW2_grow - pW2_shrink;
    var topXW2 = lerp(0, 100, openW2), bottomXW2 = lerp(0, 78, openW2);
    if (wipeBlog) wipeBlog.style.clipPath = 'polygon(0 0, ' + topXW2 + '% 0, ' + bottomXW2 + '% 100%, 0 100%)';

    // ── Phase F: testimonials -> newsletter (right-anchored wipe, opposite of W2) ──
    var pF = Math.min(1, Math.max(0, (p - PE2_END) / (PF_END - PE2_END)));
    var pF_grow = easeInOutCubic(Math.min(1, pF / 0.5));
    var pF_shrink = easeInOutCubic(Math.max(0, (pF - 0.5) / 0.5));
    var openF = pF_grow - pF_shrink;
    var topXF = lerp(0, 100, openF), bottomXF = lerp(0, 78, openF);
    if (wipeF) wipeF.style.clipPath = 'polygon(' + (100 - topXF) + '% 0, 100% 0, 100% 100%, ' + (100 - bottomXF) + '% 100%)';

    var runwayOpacity = epB * (1 - pD_grow);
    heroRunway.style.opacity = String(runwayOpacity);
    heroRunway.style.pointerEvents = runwayOpacity > 0.5 ? 'auto' : 'none';

    // ── Phase C: auto-scroll the product carousel horizontally as the page scrolls.
    //     Sets a target here; a separate rAF loop eases scrollLeft toward it each
    //     frame instead of jumping straight to it on every scroll tick. ──
    if (productGrid) {
      var pC = Math.min(1, Math.max(0, (p - PB_END) / (PC_END - PB_END)));
      var maxScroll = productGrid.scrollWidth - productGrid.clientWidth;
      productGridTarget = maxScroll > 0 ? pC * maxScroll : 0;
    }

    if (heroBlog) {
      var blogOpacity = pD_shrink * (1 - pW2_grow);
      heroBlog.style.opacity = String(blogOpacity);
      heroBlog.style.pointerEvents = blogOpacity > 0.5 ? 'auto' : 'none';
    }

    if (heroTestimonials) {
      var testimOpacity = pW2_shrink * (1 - pF_grow);
      heroTestimonials.style.opacity = String(testimOpacity);
      heroTestimonials.style.pointerEvents = testimOpacity > 0.5 ? 'auto' : 'none';
    }

    if (heroNewsletter) {
      var newsletterOpacity = pF_shrink;
      heroNewsletter.style.opacity = String(newsletterOpacity);
      heroNewsletter.style.pointerEvents = newsletterOpacity > 0.5 ? 'auto' : 'none';
    }

    // ── Persistent ticker: revealed once phase B is well underway, stays
    //    visible through every phase after that. Only hides again once you
    //    scroll all the way back to the hero's starting state. No movement
    //    tied to scroll -- it just sits still once shown. ──
    if (epB > 0.5) marqueeRevealed = true;
    if (p <= 0.01) marqueeRevealed = false;
    if (marqueeLayer) {
      marqueeLayer.style.opacity = marqueeRevealed ? '1' : '0';
      marqueeLayer.style.pointerEvents = marqueeRevealed ? 'auto' : 'none';
    }
  }

  function smoothProductGrid() {
    if (productGrid) {
      var dist = productGridTarget - productGrid.scrollLeft;
      if (Math.abs(dist) > 0.5) productGrid.scrollLeft += dist * 0.12;
    }
    requestAnimationFrame(smoothProductGrid);
  }
  requestAnimationFrame(smoothProductGrid);

  // NOTE: this theme scrolls on <body>, not <window> — 'scroll' events on window alone
  // never fire here. Listen on both so this keeps working if that ever changes.
  // ── Ambient bubble stream: a steady trickle rises from the bucket mouth
  //    until the pour begins (p passes the tip threshold). Uses the Web
  //    Animations API so it never fights the scroll-driven bubble field.
  //    Resumes if the visitor scrolls back to the upright bucket. ──
  var STREAM_STOP_P = 0.02;
  function spawnStreamBubble() {
    if (!heroPin || latestP > STREAM_STOP_P || document.hidden) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var bucketW = heroPhoto ? heroPhoto.offsetWidth : 120;
    var bucketH = heroPhoto ? heroPhoto.offsetHeight : 120;
    var bucketX = vw - bucketW - vw * 0.06;
    var bucketY = vh - bucketH - vh * 0.05;
    var mouthX = bucketX + bucketW * (0.35 + Math.random() * 0.35);
    var mouthY = bucketY + bucketH * 0.12;
    var size = 7 + Math.random() * 13;
    var el = document.createElement('div');
    el.className = 'ps-stream-bubble';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = mouthX + 'px';
    el.style.top = mouthY + 'px';
    heroPin.appendChild(el);
    var rise = vh * (0.35 + Math.random() * 0.3);
    var sway = (Math.random() - 0.5) * 90;
    var dur = 3200 + Math.random() * 2200;
    var anim = el.animate([
      { transform: 'translate(0, 0) scale(.55)', opacity: 0 },
      { transform: 'translate(' + (sway * 0.35) + 'px, ' + (-rise * 0.3) + 'px) scale(.85)', opacity: .85, offset: 0.2 },
      { transform: 'translate(' + (sway * 0.7) + 'px, ' + (-rise * 0.65) + 'px) scale(1)', opacity: .7, offset: 0.6 },
      { transform: 'translate(' + sway + 'px, ' + (-rise) + 'px) scale(1.15)', opacity: 0 }
    ], { duration: dur, easing: 'ease-out' });
    anim.onfinish = function () { el.remove(); };
  }
  setInterval(spawnStreamBubble, 420);
  spawnStreamBubble();

  // ── Idle bucket nudge: at rest on the hero, tease the pour every few seconds ──
  setInterval(function () {
    if (cuesDismissed || !heroBucketEl) return;
    var now = Date.now();
    if (latestP > 0.005) return;
    if (now - lastActivity < 2500 || now < nudgeCooldownUntil) return;
    heroBucketEl.classList.add('ps-nudge');
    nudgeCooldownUntil = now + 6000;
  }, 500);
  if (heroBucketEl) heroBucketEl.addEventListener('animationend', function (e) {
    if (e.animationName === 'ps-bucket-nudge') heroBucketEl.classList.remove('ps-nudge');
  });

  document.body.addEventListener('scroll', onHeroScroll, { passive: true });
  window.addEventListener('scroll', onHeroScroll, { passive: true });
  window.addEventListener('resize', onHeroScroll);
  onHeroScroll();
})();

// ── Parallax ──
const psHeroBgEl   = document.getElementById('psHeroBg');
const psHeroArtEl  = document.getElementById('psHeroArt');

function psRatio(el) {
  const r = el.getBoundingClientRect();
  return (window.innerHeight - r.top) / (window.innerHeight + r.height);
}
function psSetNavTop() {
  const rainbow  = document.querySelector('.ps-rainbow-bar');
  const announce = document.querySelector('.ps-announce');
  const nav      = document.getElementById('psNav');
  const h = (rainbow  ? rainbow.offsetHeight  : 8)
          + (announce ? announce.offsetHeight : 36);
  document.documentElement.style.setProperty('--nav-top', h + 'px');
  document.documentElement.style.setProperty('--nav-height', (nav ? nav.offsetHeight : 70) + 'px');
}
function psOnScroll() {
  const sy = document.documentElement.scrollTop || document.body.scrollTop || window.scrollY;
  if (psHeroBgEl)   psHeroBgEl.style.transform  = `translateY(${sy * 0.45}px)`;
  if (psHeroArtEl)  psHeroArtEl.style.transform  = `translateY(${sy * 0.25}px) scaleX(-1)`;
  document.getElementById('psNav').classList.toggle('scrolled', sy > 50);
  document.documentElement.style.setProperty('--nav-height', (document.getElementById('psNav')?.offsetHeight || 70) + 'px');
}
window.addEventListener('scroll', psOnScroll, { passive: true });
window.addEventListener('resize', psSetNavTop, { passive: true });
psSetNavTop();
psOnScroll();

// ── Reveal on scroll ──
const psRevObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); psRevObs.unobserve(e.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.ps-reveal').forEach(el => psRevObs.observe(el));

// ── Category filter tabs ──
// Link tabs (<a>) navigate directly to collection pages.
// The "All" button still filters/resets the in-page grid.
document.getElementById('psCatTabs').addEventListener('click', e => {
  const tab = e.target.closest('.ps-cat-tab');
  if (!tab) return;
  // Only intercept the "All" button; let <a> links navigate normally
  if (tab.tagName === 'A') return;
  document.querySelectorAll('.ps-cat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  const isMobile = window.innerWidth < 680;
  let shown = 0;
  document.querySelectorAll('#psProductGrid .ps-pc').forEach(card => {
    const overMobileLimit = isMobile && shown >= 6;
    const visible = !overMobileLimit;
    card.style.display = visible ? 'flex' : 'none';
    if (visible) shown++;
  });
  var grid = document.getElementById('psProductGrid');
  if (grid) {
    grid.scrollLeft = 0;
    grid.dispatchEvent(new Event('scroll'));
  }
});

// ── Smooth anchor scrolling ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href'));
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
  });
});
// ── Product slider (large screens only) ──
(function() {
  var grid = document.getElementById('psProductGrid');
  var prev = document.getElementById('psPrev');
  var next = document.getElementById('psNext');
  if (!grid || !prev || !next) return;

  function scrollBy(dir) {
    var card = grid.querySelector('.ps-pc');
    if (!card) return;
    var step = (card.offsetWidth + parseInt(getComputedStyle(grid).gap || 24)) * 2;
    grid.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  function updateArrows() {
    var atStart = grid.scrollLeft <= 4;
    var atEnd = grid.scrollLeft >= grid.scrollWidth - grid.offsetWidth - 4;
    prev.style.opacity = atStart ? '0.3' : '1';
    prev.style.pointerEvents = atStart ? 'none' : 'auto';
    next.style.opacity = atEnd ? '0.3' : '1';
    next.style.pointerEvents = atEnd ? 'none' : 'auto';
  }

  prev.addEventListener('click', function() { scrollBy(-1); });
  next.addEventListener('click', function() { scrollBy(1); });
  grid.addEventListener('scroll', updateArrows, { passive: true });
  updateArrows();
})();

