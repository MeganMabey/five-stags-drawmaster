const STORAGE_KEY = "fiveStagsRaffleDrumV2";

const canvas = document.getElementById("drumCanvas");
const ctx = canvas.getContext("2d");

const maxNumberInput = document.getElementById("maxNumber");
const applyBtn = document.getElementById("applyBtn");
const drawBtn = document.getElementById("drawBtn");
const resetBtn = document.getElementById("resetBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const remainingCount = document.getElementById("remainingCount");
const drawnCount = document.getElementById("drawnCount");
const setupMessage = document.getElementById("setupMessage");
const statusText = document.getElementById("statusText");
const ticketBadge = document.getElementById("ticketBadge");
const winnerNumber = document.getElementById("winnerNumber");
const winnerBall = document.getElementById("winnerBall");
const winnerOverlay = document.getElementById("winnerOverlay");
const overlayNumber = document.getElementById("overlayNumber");
const closeWinnerBtn = document.getElementById("closeWinnerBtn");
const historyList = document.getElementById("historyList");
const confirmDialog = document.getElementById("confirmDialog");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const soundBtn = document.getElementById("soundBtn");
const confetti = document.getElementById("confetti");

let state = {
  maxNumber: 200,
  drawnNumbers: [],
  currentWinner: null,
  soundOn: true
};

let balls = [];
let animationFrame = null;
let isDrawing = false;
let mixingStrength = 0.35;
let audioContext = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isInteger(saved.maxNumber) && Array.isArray(saved.drawnNumbers)) {
      state.maxNumber = saved.maxNumber;
      state.drawnNumbers = saved.drawnNumbers.filter(
        n => Number.isInteger(n) && n >= 1 && n <= saved.maxNumber
      );
      state.currentWinner = Number.isInteger(saved.currentWinner) ? saved.currentWinner : null;
      state.soundOn = saved.soundOn !== false;
    }
  } catch (error) {
    console.warn("Could not load saved draw:", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function availableNumbers() {
  const used = new Set(state.drawnNumbers);
  const list = [];
  for (let i = 1; i <= state.maxNumber; i += 1) {
    if (!used.has(i)) list.push(i);
  }
  return list;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function buildBalls() {
  const available = availableNumbers();
  const maxVisible = 90;
  const visibleNumbers =
    available.length <= maxVisible
      ? available
      : [...available].sort(() => Math.random() - 0.5).slice(0, maxVisible);

  balls = visibleNumbers.map(number => ({
    number,
    x: randomBetween(165, canvas.width - 165),
    y: randomBetween(130, canvas.height - 135),
    vx: randomBetween(-1.2, 1.2),
    vy: randomBetween(-1.2, 1.2),
    radius: available.length > 300 ? 14 : available.length > 150 ? 16 : 19,
    angle: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-0.035, 0.035)
  }));
}

function drumBounds(ball) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 8;
  const rx = 278 - ball.radius;
  const ry = 190 - ball.radius;
  return { cx, cy, rx, ry };
}

function updateBalls() {
  for (const ball of balls) {
    const { cx, cy, rx, ry } = drumBounds(ball);

    ball.vx += randomBetween(-mixingStrength, mixingStrength);
    ball.vy += randomBetween(-mixingStrength, mixingStrength);
    ball.vy += 0.018;

    const speed = Math.hypot(ball.vx, ball.vy);
    const maxSpeed = isDrawing ? 6.8 : 2.7;
    if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.angle += ball.spin;

    const nx = (ball.x - cx) / rx;
    const ny = (ball.y - cy) / ry;
    const distance = nx * nx + ny * ny;

    if (distance > 1) {
      const normalLength = Math.sqrt(
        ((ball.x - cx) / (rx * rx)) ** 2 +
        ((ball.y - cy) / (ry * ry)) ** 2
      ) || 1;

      const normalX = ((ball.x - cx) / (rx * rx)) / normalLength;
      const normalY = ((ball.y - cy) / (ry * ry)) / normalLength;
      const dot = ball.vx * normalX + ball.vy * normalY;

      ball.vx -= 2 * dot * normalX;
      ball.vy -= 2 * dot * normalY;
      ball.vx *= 0.86;
      ball.vy *= 0.86;

      const angle = Math.atan2((ball.y - cy) / ry, (ball.x - cx) / rx);
      ball.x = cx + Math.cos(angle) * rx * 0.985;
      ball.y = cy + Math.sin(angle) * ry * 0.985;
    }
  }
}

function drawBall(ball) {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.angle);

  const gradient = ctx.createRadialGradient(
    -ball.radius * 0.35,
    -ball.radius * 0.45,
    ball.radius * 0.1,
    0,
    0,
    ball.radius
  );
  gradient.addColorStop(0, "#fff8dc");
  gradient.addColorStop(0.25, "#f0d08d");
  gradient.addColorStop(1, "#b77924");

  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(85,50,8,.55)";
  ctx.stroke();

  ctx.fillStyle = "#172017";
  ctx.font = `900 ${Math.max(10, ball.radius * 0.72)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ball.number, 0, 1);

  ctx.restore();
}

function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const glass = ctx.createRadialGradient(
    canvas.width / 2 - 90,
    canvas.height / 2 - 70,
    40,
    canvas.width / 2,
    canvas.height / 2,
    310
  );
  glass.addColorStop(0, "rgba(255,255,255,.065)");
  glass.addColorStop(0.58, "rgba(255,255,255,.018)");
  glass.addColorStop(1, "rgba(0,0,0,.06)");

  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height / 2 + 8, 286, 198, 0, 0, Math.PI * 2);
  ctx.fillStyle = glass;
  ctx.fill();

  for (const ball of balls) drawBall(ball);
}

function animate() {
  updateBalls();
  renderCanvas();
  animationFrame = requestAnimationFrame(animate);
}

function renderUI() {
  const remaining = state.maxNumber - state.drawnNumbers.length;

  maxNumberInput.value = state.maxNumber;
  remainingCount.textContent = remaining;
  drawnCount.textContent = state.drawnNumbers.length;
  ticketBadge.textContent = `${remaining} ticket${remaining === 1 ? "" : "s"}`;
  winnerNumber.textContent = state.currentWinner ?? "—";
  soundBtn.textContent = state.soundOn ? "Sound: On" : "Sound: Off";
  soundBtn.setAttribute("aria-pressed", String(state.soundOn));

  drawBtn.disabled = remaining === 0 || isDrawing;
  drawBtn.textContent =
    remaining === 0 ? "All tickets drawn" : isDrawing ? "Mixing..." : "Start the drum";

  setupMessage.textContent =
    `Tickets 1–${state.maxNumber} are loaded. ${remaining} remaining.`;

  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (state.drawnNumbers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "No numbers drawn yet.";
    historyList.appendChild(empty);
    return;
  }

  [...state.drawnNumbers].reverse().forEach((number, index) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const label = document.createElement("small");
    label.textContent = `Draw ${state.drawnNumbers.length - index}`;

    const value = document.createElement("strong");
    value.textContent = number;

    item.append(label, value);
    historyList.appendChild(item);
  });
}

function validateMax() {
  const value = Number(maxNumberInput.value);
  if (!Number.isInteger(value) || value < 1 || value > 2000) {
    setupMessage.textContent = "Enter a whole number between 1 and 2,000.";
    maxNumberInput.focus();
    return null;
  }
  return value;
}

function applyRange() {
  if (isDrawing) return;
  const nextMax = validateMax();
  if (nextMax === null) return;

  if (state.drawnNumbers.length > 0 && nextMax !== state.maxNumber) {
    const proceed = window.confirm(
      "Changing the highest ticket number will start a fresh draw. Continue?"
    );
    if (!proceed) {
      maxNumberInput.value = state.maxNumber;
      return;
    }
  }

  state.maxNumber = nextMax;
  state.drawnNumbers = [];
  state.currentWinner = null;
  statusText.textContent = "New ticket range loaded.";
  buildBalls();
  saveState();
  renderUI();
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(frequency, duration, type = "sine", volume = 0.08, delay = 0) {
  if (!state.soundOn) return;
  ensureAudio();

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime + delay;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playWinnerSound() {
  playTone(523.25, 0.45, "triangle", 0.09, 0);
  playTone(659.25, 0.45, "triangle", 0.09, 0.14);
  playTone(783.99, 0.65, "triangle", 0.1, 0.28);
}

async function drawWinner() {
  if (isDrawing) return;

  const available = availableNumbers();
  if (available.length === 0) return;

  isDrawing = true;
  mixingStrength = 0.95;
  statusText.textContent = "The drum is mixing...";
  renderUI();

  if (state.soundOn) {
    ensureAudio();
    if (audioContext.state === "suspended") await audioContext.resume();
  }

  const pulseTimer = setInterval(() => {
    playTone(randomBetween(110, 175), 0.09, "square", 0.018);
  }, 175);

  await new Promise(resolve => setTimeout(resolve, 3200));

  clearInterval(pulseTimer);
  const winner = randomChoice(available);

  state.currentWinner = winner;
  state.drawnNumbers.push(winner);
  isDrawing = false;
  mixingStrength = 0.35;

  winnerNumber.textContent = winner;
  winnerBall.classList.remove("pop");
  void winnerBall.offsetWidth;
  winnerBall.classList.add("pop");

  statusText.textContent = `Ticket ${winner} is the winner!`;

  saveState();
  buildBalls();
  renderUI();
  playWinnerSound();

  setTimeout(() => showWinner(winner), 650);
}

function showWinner(number) {
  overlayNumber.textContent = number;
  winnerOverlay.classList.add("show");
  winnerOverlay.setAttribute("aria-hidden", "false");
  launchConfetti();
}

function closeWinner() {
  winnerOverlay.classList.remove("show");
  winnerOverlay.setAttribute("aria-hidden", "true");
  confetti.innerHTML = "";
}

function launchConfetti() {
  confetti.innerHTML = "";
  for (let i = 0; i < 85; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * .4}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 1.1}s`;
    piece.style.setProperty("--drift", `${-160 + Math.random() * 320}px`);
    piece.style.background =
      i % 3 === 0 ? "var(--gold-pale)" :
      i % 3 === 1 ? "var(--rust)" : "var(--cream)";
    confetti.appendChild(piece);
  }
}

function resetDraw() {
  state.drawnNumbers = [];
  state.currentWinner = null;
  winnerNumber.textContent = "—";
  statusText.textContent = "The draw has been reset.";
  closeWinner();
  buildBalls();
  saveState();
  renderUI();
}

function requestReset() {
  if (state.drawnNumbers.length === 0) {
    resetDraw();
    return;
  }

  if (typeof confirmDialog.showModal === "function") {
    confirmDialog.showModal();
  } else if (window.confirm("Reset the draw and clear all previous winners?")) {
    resetDraw();
  }
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.warn("Full screen unavailable:", error);
  }
}

applyBtn.addEventListener("click", applyRange);
maxNumberInput.addEventListener("keydown", event => {
  if (event.key === "Enter") applyRange();
});

drawBtn.addEventListener("click", drawWinner);
resetBtn.addEventListener("click", requestReset);
clearHistoryBtn.addEventListener("click", requestReset);
closeWinnerBtn.addEventListener("click", closeWinner);
winnerOverlay.addEventListener("click", event => {
  if (event.target === winnerOverlay) closeWinner();
});

confirmDialog.addEventListener("close", () => {
  if (confirmDialog.returnValue === "confirm") resetDraw();
});

fullscreenBtn.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  fullscreenBtn.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
});

soundBtn.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  saveState();
  renderUI();
});

loadState();
buildBalls();
renderUI();
animate();
