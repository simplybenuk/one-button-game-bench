(() => {
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const veil = document.querySelector('#veil'), start = document.querySelector('#start');
  const scoreEl = document.querySelector('#score'), comboEl = document.querySelector('#combo');
  const caption = document.querySelector('#caption'), toast = document.querySelector('#toast');
  let W, H, dpr, state = 'ready', last = 0, time = 0, score = 0, combo = 1, best = +localStorage.echoDiveBest || 0;
  let ship, gates = [], particles = [], stars = [], shake = 0, audio;
  const rnd = (a,b) => a + Math.random() * (b-a);
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(320, innerWidth); H = Math.max(420, innerHeight); canvas.width = W*dpr; canvas.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); if (state === 'ready') initStars(); };
  const initStars = () => { stars = Array.from({length: Math.max(50, Math.floor(W*H/11000))}, () => ({x:rnd(0,W), y:rnd(0,H), z:rnd(.25,1), s:rnd(.5,2)})); };
  const sound = (freq, duration=.08, type='sine') => { try { audio ||= new (AudioContext || webkitAudioContext)(); const o=audio.createOscillator(), g=audio.createGain(); o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(.035,audio.currentTime); g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime+duration); } catch(e) {} };
  const reset = () => { score=0; combo=1; time=0; shake=0; ship={x:W*.23,y:H*.5,vy:0,side:1,trail:[]}; gates=[]; particles=[]; for(let i=0;i<4;i++) addGate(W*.75+i*230); updateHud(); };
  const addGate = x => { const gap=Math.max(118, H*.29-time*.0025), center=rnd(H*.23,H*.77), width=Math.max(18, H*.012); gates.push({x,center,gap,width,passed:false}); };
  const begin = () => { reset(); state='playing'; veil.classList.add('hidden'); caption.textContent='SPACE / TAP / CLICK TO FLIP'; sound(220,.18,'triangle'); };
  const input = () => { if(state==='ready'||state==='dead') return begin(); if(state!=='playing') return; ship.side*=-1; ship.vy = ship.side * (H*.003 + time*.000012); burst(ship.x,ship.y,'#55f0d0',8); sound(ship.side>0?360:270,.06); };
  const burst = (x,y,color,n=10) => { for(let i=0;i<n;i++) particles.push({x,y,vx:rnd(-2,2),vy:rnd(-2,2),life:rnd(20,42),max:42,color,size:rnd(1,3)}); };
  const die = () => { if(state!=='playing') return; state='dead'; best=Math.max(best,score); localStorage.echoDiveBest=best; burst(ship.x,ship.y,'#ff5ebc',28); shake=14; sound(95,.32,'sawtooth'); caption.textContent=`RUN ENDED · ${String(score).padStart(6,'0')} POINTS · BEST ${String(best).padStart(6,'0')}`; veil.classList.remove('hidden'); document.querySelector('.eyebrow').textContent='SIGNAL LOST'; document.querySelector('h1').innerHTML='TRY<span>//</span>AGAIN'; document.querySelector('.card p').textContent='Every gate is a question. Your next flip is the answer.'; start.innerHTML='RE-ENTER THE DIVE <span>↗</span>'; };
  const updateHud = () => { scoreEl.textContent=String(score).padStart(6,'0'); comboEl.textContent=`×${combo}`; };
  const flash = text => { toast.textContent=text; toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),500); };
  const update = dt => {
    if(state!=='playing') return;
    time += dt; const speed=H*.00019 + time*.000000018;
    const frameScale=dt/16; ship.vy += ship.side * H*.00000072 * frameScale; ship.y += ship.vy*frameScale; ship.trail.push({x:ship.x,y:ship.y}); if(ship.trail.length>15) ship.trail.shift();
    gates.forEach(g=>{g.x-=speed*dt; if(!g.passed && g.x < ship.x-18){g.passed=true; score+=10*combo; combo=Math.min(9,combo+1); updateHud(); burst(ship.x,ship.y,'#ffcf70',14); sound(520+combo*35,.07); if(combo>2) flash(`CLEAN THREAD  ×${combo}`); } if(g.x < -50){ gates.shift(); addGate(gates[gates.length-1].x+230); }});
    const gate=gates.find(g=>g.x>ship.x-25 && g.x<ship.x+34);
    if(ship.y<28 || ship.y>H-28 || (gate && (ship.y < gate.center-gate.gap/2 || ship.y > gate.center+gate.gap/2))) die();
    particles.forEach(p=>{p.x+=p.vx*dt*.06;p.y+=p.vy*dt*.06;p.life-=dt*.06;}); particles=particles.filter(p=>p.life>0); shake=Math.max(0,shake-dt*.04);
  };
  const draw = () => {
    ctx.save(); const sx=rnd(-shake,shake), sy=rnd(-shake,shake); ctx.translate(sx,sy);
    const grad=ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,'#080b1d'); grad.addColorStop(.5,'#101331'); grad.addColorStop(1,'#1a0d2b'); ctx.fillStyle=grad; ctx.fillRect(-20,-20,W+40,H+40);
    stars.forEach(s=>{ const x=(s.x-time*.012*s.z)%W; ctx.globalAlpha=.2+s.z*.5; ctx.fillStyle=s.z>.7?'#c8d6ff':'#6572a0'; ctx.fillRect(x<0?x+W:x,s.y,s.s,s.s); }); ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(116,133,196,.1)'; ctx.lineWidth=1; for(let y=H*.23;y<H;y+=H*.18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    gates.forEach(g=>{ const top=g.center-g.gap/2, bot=g.center+g.gap/2; ctx.shadowBlur=18; ctx.shadowColor='#ff5ebc'; ctx.fillStyle='#ff5ebc'; ctx.fillRect(g.x,0,g.width,top);ctx.fillRect(g.x,bot,g.width,H-bot); ctx.shadowBlur=0; ctx.fillStyle='rgba(255,94,188,.23)';ctx.fillRect(g.x-7,top-3,g.width+14,3);ctx.fillRect(g.x-7,bot,g.width+14,3); });
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    if(ship){ ship.trail.forEach((p,i)=>{ctx.globalAlpha=i/ship.trail.length*.25;ctx.fillStyle='#55f0d0';ctx.beginPath();ctx.arc(p.x,p.y,2+i/8,0,Math.PI*2);ctx.fill();}); ctx.globalAlpha=1; ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.vy*.018);ctx.shadowBlur=24;ctx.shadowColor='#55f0d0';ctx.fillStyle='#55f0d0';ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-10,-8);ctx.lineTo(-6,0);ctx.lineTo(-10,8);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(2,0,3,0,Math.PI*2);ctx.fill();ctx.restore(); }
    ctx.restore();
  };
  const frame = now => { const dt=Math.min(32,now-last||16); last=now; update(dt); draw(); requestAnimationFrame(frame); };
  addEventListener('resize',resize); addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();input();}}); canvas.addEventListener('pointerdown',e=>{e.preventDefault();input();}); veil.addEventListener('pointerdown',e=>{e.preventDefault();input();}); resize(); reset(); requestAnimationFrame(frame);
})();
