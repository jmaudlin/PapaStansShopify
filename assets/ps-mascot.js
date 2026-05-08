(function(){
  if(window.innerWidth < 900) return;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  let W, H;
  function resize(){
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W*dpr; cv.height = H*dpr;
    cv.style.width = W+'px'; cv.style.height = H+'px';
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
  }
  resize();
  window.addEventListener('resize', resize, {passive:true});

  const R = 35;
  let x = W*0.85, y = H*0.35;
  let vx = rnd(-30,30), vy = 0;
  let angle = 0, spin = 0;
  let sqX = 1, sqY = 1;
  let opacity = 0, targetOp = 0;
  let mouth = 'smile', eyeW = false, blush = 1;
  let bobT = 0, last = 0;

  function rnd(a,b){ return a+(b-a)*Math.random(); }
  function lerp(a,b,t){ return a+(b-a)*Math.max(0,Math.min(1,t)); }

  const isHome = !!document.getElementById('psMascotCanvas');
  const heroH = window.innerHeight;

  function shouldShow(){
    const st = document.documentElement.scrollTop || document.body.scrollTop || window.scrollY;
    if(isHome) return st > heroH * 0.55;
    return true;
  }

  let fartBubbles = [];
  let fartState = 0, fartT = 0;

  function triggerFart(){
    if(fartState > 0) return;
    fartState = 1; fartT = 0;
    // propulsion kick
    vx += rnd(-40,40); vy -= rnd(20,50);
    spin += rnd(-.4,.4);
    // spawn fart bubbles from butt (below mascot center)
    const buttX = x + Math.sin(angle) * R * .6;
    const buttY = y + Math.cos(angle) * R * .85;
    const count = Math.floor(rnd(7,12));
    for(let i=0;i<count;i++){
      fartBubbles.push({
        x: buttX + rnd(-10,10),
        y: buttY + rnd(-5,5),
        vx: rnd(-55,55),
        vy: rnd(20,80),
        r: rnd(4,14),
        a: rnd(.7,1),
        life: rnd(.9,1.8)
      });
    }
  }

  document.addEventListener('click', e=>{
    const dx = e.clientX - x, dy = e.clientY - y;
    if(Math.sqrt(dx*dx+dy*dy) < R+12) triggerFart();
  });

  function drawFartBubbles(){
    fartBubbles.forEach(b=>{
      ctx.save(); ctx.globalAlpha = b.a * opacity;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(190,150,255,.12)'; ctx.fill();
      ctx.strokeStyle = `rgba(210,170,255,${b.a*.7})`; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(b.x-b.r*.28,b.y-b.r*.28,b.r*.3,b.r*.18,0,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${b.a*.4})`; ctx.fill();
      ctx.restore();
    });
  }

  function updateFart(dt){
    if(fartState===0) return;
    fartT += dt;
    fartBubbles.forEach(b=>{
      b.x += b.vx*dt; b.y += b.vy*dt;
      b.vy -= 60*dt; // bubbles float up after initial burst
      b.vx *= Math.pow(.96, dt*60);
      b.r += .15;
      b.a -= dt / b.life;
    });
    fartBubbles = fartBubbles.filter(b=>b.a>0);
    if(fartT > 2.8){ fartState=0; fartT=0; }
  }

  function getMouthPath(type){
    if(type==='smile'){ return (c)=>{ c.moveTo(-11,12); c.quadraticCurveTo(0,22,11,12); }; }
    if(type==='open'){ return (c)=>{ c.moveTo(-11,10); c.quadraticCurveTo(0,24,11,10); }; }
    if(type==='embarrassed'){ return (c)=>{ c.moveTo(-8,16); c.quadraticCurveTo(-4,12,0,16); c.quadraticCurveTo(4,20,8,16); }; }
    return (c)=>{ c.moveTo(-9,17); c.quadraticCurveTo(0,10,9,17); };
  }
  document.body.addEventListener('scroll', ()=>{
    const st = document.documentElement.scrollTop || document.body.scrollTop || window.scrollY;
    scrollV = st - lastST; lastST = st;
    if(targetOp > 0.1 && Math.abs(scrollV) > 4){
      vy += scrollV * 0.38;
      vx += rnd(-55, 55);
      spin += scrollV * 0.009;
    }
  }, {passive:true});

  function drawMascot(){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(sqX, sqY);

    const limbs=[{dx:-48,dy:-2,r:7.5},{dx:48,dy:-2,r:7.5},{dx:-16,dy:48,r:7.5},{dx:16,dy:48,r:7.5}];
    limbs.forEach(l=>{
      ctx.beginPath(); ctx.arc(l.dx,l.dy,l.r,0,Math.PI*2);
      ctx.fillStyle='#b87de8'; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=1.5; ctx.stroke();
    });

    ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2);
    const g=ctx.createRadialGradient(-R*.28,-R*.28,R*.06,0,0,R);
    g.addColorStop(0,'#ddb8f8'); g.addColorStop(1,'#a055d8');
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=2; ctx.stroke();

    ctx.beginPath(); ctx.ellipse(-R*.28,-R*.28,R*.3,R*.18,-.35,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,.32)'; ctx.fill();

    const speed=Math.sqrt(vx*vx+vy*vy);
    const lx = speed>10 ? Math.max(-2,Math.min(2,vx*.012)) : 0;
    const ly = speed>10 ? Math.max(-2,Math.min(2,vy*.012)) : 0;
    const ew=eyeW?11:9, eh=eyeW?13:10.5;
    if(fartState===0){
      [-14,14].forEach(ex=>{
        ctx.beginPath(); ctx.ellipse(ex,-5,ew,eh,0,0,Math.PI*2);
        ctx.fillStyle='white'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex+lx+1.5,ly-4,5.2,0,Math.PI*2);
        ctx.fillStyle='#1e0838'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex+lx+3,ly-5.5,1.9,0,Math.PI*2);
        ctx.fillStyle='white'; ctx.fill();
      });
    }

    const br=blush>1?Math.min(blush*7,20):8;
    ctx.beginPath(); ctx.ellipse(-19,7,br,br*.55,0,0,Math.PI*2); ctx.fillStyle='rgba(255,130,165,.55)'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(19,7,br,br*.55,0,0,Math.PI*2); ctx.fillStyle='rgba(255,130,165,.55)'; ctx.fill();

    // embarrassed U-eyes override
    if(fartState>0){
      [-14,14].forEach(ex=>{
        ctx.beginPath(); ctx.arc(ex,-4,8.5,Math.PI,0,false);
        ctx.strokeStyle='#1e0838'; ctx.lineWidth=3; ctx.stroke();
        // tears of embarrassment - tiny drops
        ctx.beginPath(); ctx.ellipse(ex+6,2,2,3,0,0,Math.PI*2);
        ctx.fillStyle='rgba(150,200,255,.7)'; ctx.fill();
      });
    }

    ctx.beginPath();
    getMouthPath(mouth)(ctx);
    ctx.strokeStyle='#1e0838'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.stroke();

    ctx.restore();
  }

  function tick(now){
    const dt = Math.min((now-last)/1000, 0.05); last=now;
    ctx.clearRect(0,0,W,H);

    targetOp = shouldShow() ? 1 : 0;
    if(!isHome && opacity===0 && targetOp===0){
      const st=document.documentElement.scrollTop||document.body.scrollTop||window.scrollY;
      if(now>1800) targetOp=1;
    }
    opacity = lerp(opacity, targetOp, dt*2.5);

    if(opacity > 0.02){
      bobT += dt*0.9;
      const speed = Math.sqrt(vx*vx+vy*vy);

      vy += 220*dt;
      vx *= Math.pow(0.991, dt*60);
      vy *= Math.pow(0.994, dt*60);
      spin *= Math.pow(0.91, dt*60);
      angle += spin*dt*55;

      if(speed < 25){
        vy -= 90*dt;
        vx += Math.sin(bobT*1.1)*12*dt;
      }

      x += vx*dt; y += vy*dt;

      const pad=R+6;
      if(x < pad){ x=pad; vx=Math.abs(vx)*0.58; spin+=rnd(.2,.5); sqX=0.72; sqY=1.28; }
      if(x > W-pad){ x=W-pad; vx=-Math.abs(vx)*0.58; spin-=rnd(.2,.5); sqX=0.72; sqY=1.28; }
      if(y < pad){ y=pad; vy=Math.abs(vy)*0.52; spin+=rnd(-.4,.4); }
      if(y > H-pad){
        y=H-pad; vy=-Math.abs(vy)*0.52;
        spin+=rnd(-.6,.6); sqX=1.45; sqY=0.68;
        if(Math.abs(vy)<15) vy=-rnd(40,80);
      }

      sqX = sqX>1 ? Math.max(sqX-dt*10,1) : Math.min(sqX+dt*10,1);
      sqY = sqY>1 ? Math.max(sqY-dt*10,1) : Math.min(sqY+dt*10,1);
      sqX = Math.max(.55,Math.min(1.55,sqX));
      sqY = Math.max(.55,Math.min(1.55,sqY));

    mouth = speed>180 ? 'open' : speed>60 ? 'smile' : 'smile';
    eyeW = speed>160;
    blush = speed<20 ? 1.5 : 1;

    // fart overrides expression
    if(fartState>0){
      mouth = 'embarrassed';
      eyeW = false;
      blush = 3.5;
    }

    updateFart(dt);
    ctx.globalAlpha = opacity;
    drawMascot();
    drawFartBubbles();
    ctx.globalAlpha = 1;
    }
    requestAnimationFrame(tick);
  }

  if(!isHome){
    setTimeout(()=>{ targetOp=1; }, 1800);
  } else {
    const poll=setInterval(()=>{
      if(window.psMascotFormed){ clearInterval(poll); }
    },300);
    setTimeout(()=>{ clearInterval(poll); },15000);
  }

  requestAnimationFrame(t=>{ last=t; requestAnimationFrame(tick); });
})();