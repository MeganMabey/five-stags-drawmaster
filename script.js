const KEY="fiveStagsRaffleV4";
const $=id=>document.getElementById(id);
const canvas=$("drumCanvas"),ctx=canvas.getContext("2d");
const els={
 max:$("maxNumber"),apply:$("applyBtn"),draw:$("drawBtn"),reset:$("resetBtn"),
 remain:$("remainingCount"),drawn:$("drawnCount"),winnerSmall:$("winnerSmall"),
 history:$("historyList"),overlay:$("winnerOverlay"),winnerLarge:$("winnerLarge"),
 closeWinner:$("closeWinnerBtn"),confetti:$("confetti"),sound:$("soundBtn"),
 settings:$("settingsBtn"),drawer:$("settingsDrawer"),closeSettings:$("closeSettingsBtn"),
 backdrop:$("drawerBackdrop"),fullscreen:$("fullscreenBtn"),countdownToggle:$("countdownToggle"),
 overlayToggle:$("overlayToggle"),countdownOverlay:$("countdownOverlay"),
 countdownNumber:$("countdownNumber"),setup:$("setupMessage"),confirm:$("confirmDialog"),
 screen:document.querySelector(".raffle-screen")
};
let state={maxNumber:200,drawnNumbers:[],currentWinner:null,soundOn:true,countdownOn:true,overlayOn:true};
let balls=[],drawing=false,mix=.28,audio=null;

function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Number.isInteger(s.maxNumber)){state={...state,...s};state.drawnNumbers=(s.drawnNumbers||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=s.maxNumber)}}catch(e){}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function available(){const used=new Set(state.drawnNumbers),a=[];for(let i=1;i<=state.maxNumber;i++)if(!used.has(i))a.push(i);return a}
function rnd(a,b){return a+Math.random()*(b-a)}
function buildBalls(){
 const av=available(),maxVisible=58,vis=av.length<=maxVisible?av:[...av].sort(()=>Math.random()-.5).slice(0,maxVisible);
 balls=vis.map(number=>({number,x:rnd(180,780),y:rnd(115,425),vx:rnd(-1.2,1.2),vy:rnd(-1.2,1.2),r:av.length>150?19:22,a:rnd(0,Math.PI*2),spin:rnd(-.04,.04)}))
}
function bounds(b){return{cx:480,cy:280,rx:390-b.r,ry:220-b.r}}
function updateBalls(){
 for(const b of balls){
  const {cx,cy,rx,ry}=bounds(b);b.vx+=rnd(-mix,mix);b.vy+=rnd(-mix,mix)+.018;
  let sp=Math.hypot(b.vx,b.vy),mx=drawing?7.6:2.6;if(sp>mx){b.vx=b.vx/sp*mx;b.vy=b.vy/sp*mx}
  b.x+=b.vx;b.y+=b.vy;b.a+=b.spin;
  const nx=(b.x-cx)/rx,ny=(b.y-cy)/ry;
  if(nx*nx+ny*ny>1){
   const nl=Math.sqrt(((b.x-cx)/(rx*rx))**2+((b.y-cy)/(ry*ry))**2)||1;
   const nX=((b.x-cx)/(rx*rx))/nl,nY=((b.y-cy)/(ry*ry))/nl,dot=b.vx*nX+b.vy*nY;
   b.vx=(b.vx-2*dot*nX)*.88;b.vy=(b.vy-2*dot*nY)*.88;
   const ang=Math.atan2((b.y-cy)/ry,(b.x-cx)/rx);b.x=cx+Math.cos(ang)*rx*.985;b.y=cy+Math.sin(ang)*ry*.985
  }
 }
}
function drawBall(b){
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);
 const g=ctx.createRadialGradient(-b.r*.35,-b.r*.45,b.r*.1,0,0,b.r);
 g.addColorStop(0,"#fff8dd");g.addColorStop(.26,"#f1d190");g.addColorStop(1,"#b87723");
 ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="rgba(80,45,7,.58)";ctx.stroke();
 ctx.fillStyle="#172017";ctx.font=`900 ${Math.max(12,b.r*.72)}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(b.number,0,1);ctx.restore()
}
function renderCanvas(){ctx.clearRect(0,0,960,540);for(const b of balls)drawBall(b)}
function animate(){updateBalls();renderCanvas();requestAnimationFrame(animate)}
function render(){
 const rem=state.maxNumber-state.drawnNumbers.length;els.max.value=state.maxNumber;els.remain.textContent=rem;els.drawn.textContent=state.drawnNumbers.length;els.winnerSmall.textContent=state.currentWinner??"—";
 els.sound.textContent=state.soundOn?"Sound: On":"Sound: Off";els.countdownToggle.checked=state.countdownOn;els.overlayToggle.checked=state.overlayOn;
 els.draw.disabled=rem===0||drawing;els.draw.querySelector(".main-label").textContent=rem===0?"All tickets drawn":drawing?"Mixing...":"Draw a number";
 els.draw.querySelector(".sub-label").textContent=rem===0?"Reset to start again":drawing?"The stag is spinning":"Start the raffle drum";
 els.setup.textContent=`Tickets 1–${state.maxNumber} are loaded. ${rem} remaining.`;renderHistory()
}
function renderHistory(){
 els.history.innerHTML="";if(!state.drawnNumbers.length){els.history.innerHTML='<span class="empty">No winners yet.</span>';return}
 [...state.drawnNumbers].reverse().forEach((n,i)=>{const d=document.createElement("div");d.className="history-item";d.innerHTML=`<small>Draw ${state.drawnNumbers.length-i}</small><strong>${n}</strong>`;els.history.appendChild(d)})
}
function secureIndex(len){if(crypto?.getRandomValues){const max=0xFFFFFFFF,limit=max-(max%len),a=new Uint32Array(1);do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%len}return Math.floor(Math.random()*len)}
function tone(f,d,t="sine",v=.07,delay=0){if(!state.soundOn)return;if(!audio)audio=new(AudioContext||webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime+delay;o.type=t;o.frequency.setValueAtTime(f,now);g.gain.setValueAtTime(v,now);g.gain.exponentialRampToValueAtTime(.001,now+d);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+d)}
async function countdown(){if(!state.countdownOn)return;els.countdownOverlay.classList.add("show");for(const n of[3,2,1]){els.countdownNumber.textContent=n;tone(320+n*55,.18,"triangle",.06);await new Promise(r=>setTimeout(r,700))}els.countdownOverlay.classList.remove("show")}
async function drawWinner(){
 if(drawing)return;const av=available();if(!av.length)return;drawing=true;render();if(state.soundOn){if(!audio)audio=new(AudioContext||webkitAudioContext)();if(audio.state==="suspended")await audio.resume()}
 await countdown();els.screen.classList.add("mixing");mix=1.02;const pulse=setInterval(()=>tone(rnd(105,165),.09,"square",.016),160);
 await new Promise(r=>setTimeout(r,3300));clearInterval(pulse);const winner=av[secureIndex(av.length)];
 state.currentWinner=winner;state.drawnNumbers.push(winner);drawing=false;mix=.28;els.screen.classList.remove("mixing");
 els.winnerSmall.textContent=winner;els.winnerSmall.classList.remove("pop");void els.winnerSmall.offsetWidth;els.winnerSmall.classList.add("pop");
 save();buildBalls();render();tone(523,.42,"triangle",.09);tone(659,.42,"triangle",.09,.14);tone(784,.65,"triangle",.1,.28);if(state.overlayOn)setTimeout(()=>showWinner(winner),550)
}
function showWinner(n){els.winnerLarge.textContent=n;els.overlay.classList.add("show");launchConfetti()}
function closeWinner(){els.overlay.classList.remove("show");els.confetti.innerHTML=""}
function launchConfetti(){els.confetti.innerHTML="";for(let i=0;i<95;i++){const p=document.createElement("span");p.className="confetti-piece";p.style.left=`${Math.random()*100}%`;p.style.animationDelay=`${Math.random()*.4}s`;p.style.animationDuration=`${1.7+Math.random()*1.1}s`;p.style.setProperty("--drift",`${-180+Math.random()*360}px`);p.style.background=i%3===0?"var(--gold2)":i%3===1?"var(--rust)":"var(--cream)";els.confetti.appendChild(p)}}
function resetNow(){state.drawnNumbers=[];state.currentWinner=null;closeWinner();buildBalls();save();render()}
function requestReset(){if(!state.drawnNumbers.length)return resetNow();if(els.confirm.showModal)els.confirm.showModal();else if(confirm("Reset raffle?"))resetNow()}
function applyRange(){const n=Number(els.max.value);if(!Number.isInteger(n)||n<1||n>2000){els.setup.textContent="Enter a whole number between 1 and 2,000.";return}if(state.drawnNumbers.length&&n!==state.maxNumber&&!confirm("Changing the ticket range starts a fresh raffle. Continue?"))return;state.maxNumber=n;state.drawnNumbers=[];state.currentWinner=null;buildBalls();save();render();closeSettings()}
function openSettings(){els.drawer.classList.add("open")}function closeSettings(){els.drawer.classList.remove("open")}
els.draw.onclick=drawWinner;els.reset.onclick=requestReset;els.apply.onclick=applyRange;els.max.onkeydown=e=>{if(e.key==="Enter")applyRange()};
els.closeWinner.onclick=closeWinner;els.overlay.onclick=e=>{if(e.target===els.overlay)closeWinner()};
els.settings.onclick=openSettings;els.closeSettings.onclick=closeSettings;els.backdrop.onclick=closeSettings;
els.sound.onclick=()=>{state.soundOn=!state.soundOn;save();render()};
els.countdownToggle.onchange=()=>{state.countdownOn=els.countdownToggle.checked;save()};
els.overlayToggle.onchange=()=>{state.overlayOn=els.overlayToggle.checked;save()};
els.fullscreen.onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch(e){}};
document.onfullscreenchange=()=>els.fullscreen.textContent=document.fullscreenElement?"Exit full screen":"Full screen";
els.confirm.onclose=()=>{if(els.confirm.returnValue==="confirm")resetNow()};
load();buildBalls();render();animate();
