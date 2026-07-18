const STORAGE_KEY = "fiveStagsRaffleV3";

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
const winnerNumber = document.getElementById("winnerNumber");
const winnerBall = document.getElementById("winnerBall");
const winnerOverlay = document.getElementById("winnerOverlay");
const overlayNumber = document.getElementById("overlayNumber");
const closeWinnerBtn = document.getElementById("closeWinnerBtn");
const historyList = document.getElementById("historyList");
const confirmDialog = document.getElementById("confirmDialog");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const soundBtn = document.getElementById("soundBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsDrawer = document.getElementById("settingsDrawer");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const countdownToggle = document.getElementById("countdownToggle");
const overlayToggle = document.getElementById("overlayToggle");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = document.getElementById("countdownNumber");
const confetti = document.getElementById("confetti");
const stage = document.querySelector(".stage-card");

let state = {
  maxNumber: 200,
  drawnNumbers: [],
  currentWinner: null,
  soundOn: true,
  countdownOn: true,
  winnerOverlayOn: true
};

let balls = [];
let isDrawing = false;
let mixingStrength = 0.33;
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
      state.countdownOn = saved.countdownOn !== false;
      state.winnerOverlayOn = saved.winnerOverlayOn !== false;
    }
  } catch (error) {
    console.warn("Could not load saved raffle:", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function availableNumbers() {
  const used = new Set(state.drawnNumbers);
  const available = [];
  for (let i = 1; i <= state.maxNumber; i += 1) {
    if (!used.has(i)) available.push(i);
  }
  return available;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function buildBalls() {
  const available = availableNumbers();
  const maxVisible = 95;
  const visible =
    available.length <= maxVisible
      ? available
      : [...available].sort(() => Math.random() - 0.5).slice(0, maxVisible);

  balls = visible.map(number => ({
    number,
    x: randomBetween(165, canvas.width - 165),
    y: randomBetween(130, canvas.height - 140),
    vx: randomBetween(-1.2, 1.2),
    vy: randomBetween(-1.2, 1.2),
    radius: available.length > 300 ? 15 : available.length > 150 ? 17 : 20,
    angle: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-0.038, 0.038)
  }));
}

function drumBounds(ball) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 10;
  const rx = 366 - ball.radius;
  const ry = 250 - ball.radius;
  return { cx, cy, rx, ry };
}

function updateBalls() {
  for (const ball of balls) {
    const { cx, cy, rx, ry } = drumBounds(ball);

    ball.vx += randomBetween(-mixingStrength, mixingStrength);
    ball.vy += randomBetween(-mixingStrength, mixingStrength);
    ball.vy += 0.018;

    const speed = Math.hypot(ball.vx, ball.vy);
    const maxSpeed = isDrawing ? 7.8 : 2.7;

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
      ball.vx *= 0.88;
      ball.vy *= 0.88;

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
  gradient.addColorStop(0, "#fff8dd");
  gradient.addColorStop(0.26, "#f1d190");
  gradient.addColorStop(1, "#b87723");

  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(85,50,8,.58)";
  ctx.stroke();

  ctx.fillStyle = "#172017";
  ctx.font = `900 ${Math.max(11, ball.radius * 0.72)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ball.number, 0, 1);

  ctx.restore();
}

function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const glass = ctx.createRadialGradient(
    canvas.width / 2 - 100,
    canvas.height / 2 - 90,
    50,
    canvas.width / 2,
    canvas.height / 2,
    390
  );

  glass.addColorStop(0, "rgba(255,255,255,.055)");
  glass.addColorStop(0.58, "rgba(255,255,255,.014)");
  glass.addColorStop(1, "rgba(0,0,0,.06)");

  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height / 2 + 10, 374, 258, 0, 0, Math.PI * 2);
  ctx.fillStyle = glass;
  ctx.fill();

  for (const ball of balls) drawBall(ball);
}

function animate() {
  updateBalls();
  renderCanvas();
  requestAnimationFrame(animate);
}

function renderUI() {
  const remaining = state.maxNumber - state.drawnNumbers.length;

  maxNumberInput.value = state.maxNumber;
  remainingCount.textContent = remaining;
  drawnCount.textContent = state.drawnNumbers.length;
  winnerNumber.textContent = state.currentWinner ?? "—";

  soundBtn.textContent = state.soundOn ? "Sound: On" : "Sound: Off";
  countdownToggle.checked = state.countdownOn;
  overlayToggle.checked = state.winnerOverlayOn;

  drawBtn.disabled = remaining === 0 || isDrawing;
  drawBtn.querySelector(".draw-btn-main").textContent =
    remaining === 0 ? "All tickets drawn" : isDrawing ? "Mixing..." : "Draw a number";
  drawBtn.querySelector(".draw-btn-sub").textContent =
    remaining === 0 ? "Reset to start again" : isDrawing ? "The stag is spinning" : "Start the drum";

  setupMessage.textContent = `Tickets 1–${state.maxNumber} are loaded. ${remaining} remaining.`;
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (state.drawnNumbers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "No winners yet.";
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
      "Changing the ticket range will start a fresh raffle. Continue?"
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
  closeSettings();
}

function secureRandomIndex(length) {
  if (window.crypto && window.crypto.getRandomValues) {
    const maxUint = 0xFFFFFFFF;
    const limit = maxUint - (maxUint % length);
    const array = new Uint32Array(1);

    do {
      window.crypto.getRandomValues(array);
    } while (array[0] >= limit);

    return array[0] % length;
  }

  return Math.floor(Math.random() * length);
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
  playTone(783.99, 0.7, "triangle", 0.1, 0.28);
}

async function runCountdown() {
  if (!state.countdownOn) return;

  countdownOverlay.classList.add("show");
  countdownOverlay.setAttribute("aria-hidden", "false");

  for (const number of [3, 2, 1]) {
    countdownNumber.textContent = number;
    countdownNumber.style.animation = "none";
    void countdownNumber.offsetWidth;
    countdownNumber.style.animation = "";
    playTone(320 + number * 55, 0.18, "triangle", 0.06);
    await new Promise(resolve => setTimeout(resolve, 720));
  }

  countdownOverlay.classList.remove("show");
  countdownOverlay.setAttribute("aria-hidden", "true");
}

async function drawWinner() {
  if (isDrawing) return;

  const available = availableNumbers();
  if (available.length === 0) return;

  if (state.soundOn) {
    ensureAudio();
    if (audioContext.state === "suspended") await audioContext.resume();
  }

  isDrawing = true;
  renderUI();

  await runCountdown();

  stage.classList.add("mixing");
  mixingStrength = 1.06;
  statusText.textContent = "The stag is turning the drum...";

  const pulseTimer = setInterval(() => {
    playTone(randomBetween(105, 165), 0.09, "square", 0.018);
  }, 160);

  await new Promise(resolve => setTimeout(resolve, 3600));

  clearInterval(pulseTimer);

  const winner = available[secureRandomIndex(available.length)];

  state.currentWinner = winner;
  state.drawnNumbers.push(winner);
  isDrawing = false;
  mixingStrength = 0.33;
  stage.classList.remove("mixing");

  winnerNumber.textContent = winner;
  winnerBall.classList.remove("pop");
  void winnerBall.offsetWidth;
  winnerBall.classList.add("pop");

  statusText.textContent = `Ticket ${winner} is the winner!`;

  saveState();
  buildBalls();
  renderUI();
  playWinnerSound();

  if (state.winnerOverlayOn) {
    setTimeout(() => showWinner(winner), 650);
  }
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

  for (let i = 0; i < 100; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * .4}s`;
    piece.style.animationDuration = `${1.7 + Math.random() * 1.1}s`;
    piece.style.setProperty("--drift", `${-180 + Math.random() * 360}px`);
    piece.style.background =
      i % 3 === 0 ? "var(--gold-light)" :
      i % 3 === 1 ? "var(--rust)" : "var(--cream)";
    confetti.appendChild(piece);
  }
}

function resetRaffle() {
  state.drawnNumbers = [];
  state.currentWinner = null;
  statusText.textContent = "The raffle has been reset.";
  closeWinner();
  buildBalls();
  saveState();
  renderUI();
}

function requestReset() {
  if (state.drawnNumbers.length === 0) {
    resetRaffle();
    return;
  }

  if (typeof confirmDialog.showModal === "function") {
    confirmDialog.showModal();
  } else if (window.confirm("Reset the raffle and clear all winners?")) {
    resetRaffle();
  }
}

function openSettings() {
  settingsDrawer.classList.add("open");
  settingsDrawer.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  settingsDrawer.classList.remove("open");
  settingsDrawer.setAttribute("aria-hidden", "true");
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
  if (confirmDialog.returnValue === "confirm") resetRaffle();
});

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
drawerBackdrop.addEventListener("click", closeSettings);

fullscreenBtn.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  fullscreenBtn.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
});

soundBtn.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  saveState();
  renderUI();
});

countdownToggle.addEventListener("change", () => {
  state.countdownOn = countdownToggle.checked;
  saveState();
});

overlayToggle.addEventListener("change", () => {
  state.winnerOverlayOn = overlayToggle.checked;
  saveState();
});

loadState();
buildBalls();
renderUI();
animate();
