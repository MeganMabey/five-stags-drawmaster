const STORAGE_KEY = "fiveStagsRafflePro";

const ui = {
  soundBtn: document.getElementById("sound-btn"),
  settingsBtn: document.getElementById("settings-btn"),
  fullscreenBtn: document.getElementById("fullscreen-btn"),
  remaining: document.getElementById("remaining-value"),
  drawn: document.getElementById("drawn-value"),
  drawBtn: document.getElementById("draw-btn"),
  resetBtn: document.getElementById("reset-btn"),
  history: document.getElementById("history-list"),
  panel: document.getElementById("settings-panel"),
  backdrop: document.getElementById("settings-backdrop"),
  closeSettings: document.getElementById("close-settings"),
  highestTicket: document.getElementById("highest-ticket"),
  applySettings: document.getElementById("apply-settings"),
  settingsMessage: document.getElementById("settings-message"),
  countdownToggle: document.getElementById("countdown-toggle"),
  celebrationToggle: document.getElementById("celebration-toggle"),
  countdownOverlay: document.getElementById("countdown-overlay"),
  countdownValue: document.getElementById("countdown-value"),
  winnerOverlay: document.getElementById("winner-overlay"),
  winnerValue: document.getElementById("winner-value"),
  closeWinner: document.getElementById("close-winner"),
  confetti: document.getElementById("confetti-layer"),
  resetDialog: document.getElementById("reset-dialog")
};

let state = {
  maxNumber: 200,
  drawnNumbers: [],
  currentWinner: null,
  soundOn: true,
  countdownOn: true,
  celebrationOn: true
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isInteger(saved.maxNumber)) {
      state = { ...state, ...saved };
      state.drawnNumbers = (saved.drawnNumbers || []).filter(
        n => Number.isInteger(n) && n >= 1 && n <= saved.maxNumber
      );
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
  const result = [];
  for (let i = 1; i <= state.maxNumber; i += 1) {
    if (!used.has(i)) result.push(i);
  }
  return result;
}

function secureRandomIndex(length) {
  if (window.crypto?.getRandomValues) {
    const max = 0xFFFFFFFF;
    const limit = max - (max % length);
    const values = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(values);
    } while (values[0] >= limit);
    return values[0] % length;
  }
  return Math.floor(Math.random() * length);
}

function updateDOM() {
  const remaining = state.maxNumber - state.drawnNumbers.length;

  ui.remaining.textContent = remaining;
  ui.drawn.textContent = state.drawnNumbers.length;
  ui.highestTicket.value = state.maxNumber;
  ui.soundBtn.textContent = state.soundOn ? "Sound: On" : "Sound: Off";
  ui.countdownToggle.checked = state.countdownOn;
  ui.celebrationToggle.checked = state.celebrationOn;
  ui.settingsMessage.textContent =
    `Tickets 1–${state.maxNumber} are loaded. ${remaining} remaining.`;

  ui.drawBtn.disabled = gameScene?.isDrawing || remaining === 0;
  ui.drawBtn.querySelector("strong").textContent =
    remaining === 0 ? "ALL TICKETS DRAWN" :
    gameScene?.isDrawing ? "MIXING..." :
    "DRAW A NUMBER";

  if (state.drawnNumbers.length === 0) {
    ui.history.textContent = "No winners yet.";
  } else {
    ui.history.innerHTML = "";
    [...state.drawnNumbers].reverse().forEach((number, index) => {
      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = `Draw ${state.drawnNumbers.length - index}: ${number}`;
      ui.history.appendChild(chip);
    });
  }
}

function launchConfetti() {
  ui.confetti.innerHTML = "";
  for (let i = 0; i < 100; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * .4}s`;
    piece.style.animationDuration = `${1.7 + Math.random() * 1.1}s`;
    piece.style.setProperty("--drift", `${-180 + Math.random() * 360}px`);
    piece.style.background =
      i % 3 === 0 ? "#f2d28f" :
      i % 3 === 1 ? "#a75d42" : "#f3ead8";
    ui.confetti.appendChild(piece);
  }
}

async function runCountdown() {
  if (!state.countdownOn) return;

  ui.countdownOverlay.classList.add("show");
  ui.countdownOverlay.setAttribute("aria-hidden", "false");

  for (const number of [3, 2, 1]) {
    ui.countdownValue.textContent = number;
    gameScene?.playCountdownTone(number);
    await new Promise(resolve => setTimeout(resolve, 700));
  }

  ui.countdownOverlay.classList.remove("show");
  ui.countdownOverlay.setAttribute("aria-hidden", "true");
}

function showWinner(number) {
  ui.winnerValue.textContent = number;
  ui.winnerOverlay.classList.add("show");
  ui.winnerOverlay.setAttribute("aria-hidden", "false");
  launchConfetti();
}

function closeWinner() {
  ui.winnerOverlay.classList.remove("show");
  ui.winnerOverlay.setAttribute("aria-hidden", "true");
  ui.confetti.innerHTML = "";
}

class RaffleScene extends Phaser.Scene {
  constructor() {
    super("RaffleScene");
    this.isDrawing = false;
    this.ballBodies = [];
    this.audioContext = null;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b150f");

    this.createBackground();
    this.createTitle();
    this.createMascotPlaceholder();
    this.createDrum();
    this.createWinnerDisplay();
    this.createBallField();

    this.scale.on("resize", () => {
      this.scene.restart();
    });

    updateDOM();
  }

  createBackground() {
    const width = this.scale.width;
    const height = this.scale.height;

    const graphics = this.add.graphics();

    graphics.fillStyle(0x0d1a12, 1);
    graphics.fillRoundedRect(14, 14, width - 28, height - 28, 28);

    graphics.lineStyle(2, 0xd4a34b, .48);
    graphics.strokeRoundedRect(14, 14, width - 28, height - 28, 28);

    for (let x = 45; x < width; x += 86) {
      graphics.lineStyle(1, 0xffffff, .018);
      graphics.lineBetween(x, 20, x, height - 20);
    }
  }

  createTitle() {
    const width = this.scale.width;

    this.add.text(width * .5, 42, "FIVE STAGS", {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#d4a34b",
      letterSpacing: 8
    }).setOrigin(.5, 0);

    this.add.text(width * .5, 65, "MEAT RAFFLE", {
      fontFamily: "Georgia",
      fontSize: `${Math.max(50, Math.min(92, width * .065))}px`,
      fontStyle: "bold",
      color: "#f3ead8"
    }).setOrigin(.5, 0);
  }

  createMascotPlaceholder() {
    const width = this.scale.width;
    const height = this.scale.height;
    const x = width * .15;
    const y = height * .53;

    const mascot = this.add.container(x, y);

    const antlers = this.add.graphics();
    antlers.lineStyle(8, 0xa96f42, 1);
    antlers.beginPath();
    antlers.moveTo(-20, -130);
    antlers.lineTo(-65, -188);
    antlers.lineTo(-72, -236);
    antlers.moveTo(-35, -162);
    antlers.lineTo(-92, -182);
    antlers.lineTo(-120, -220);
    antlers.moveTo(20, -130);
    antlers.lineTo(65, -188);
    antlers.lineTo(72, -236);
    antlers.moveTo(35, -162);
    antlers.lineTo(92, -182);
    antlers.lineTo(120, -220);
    antlers.strokePath();

    const body = this.add.ellipse(0, 95, 210, 300, 0x1e422f);
    const apron = this.add.ellipse(0, 120, 150, 250, 0x101713);
    const head = this.add.ellipse(0, -72, 125, 165, 0x9d6640);
    const muzzle = this.add.ellipse(0, -30, 72, 55, 0x6f422c);
    const eye1 = this.add.circle(-25, -92, 7, 0x111111);
    const eye2 = this.add.circle(25, -92, 7, 0x111111);
    const smile = this.add.text(0, -43, "⌣", {
      fontSize: "48px",
      color: "#f3ead8"
    }).setOrigin(.5);

    const logo = this.add.text(0, 100, "FIVE\nSTAGS", {
      align: "center",
      fontFamily: "Georgia",
      fontSize: "25px",
      fontStyle: "bold",
      color: "#e0b45d"
    }).setOrigin(.5);

    const arm = this.add.rectangle(85, 60, 170, 36, 0x9d6640)
      .setOrigin(0, .5)
      .setRotation(.16);

    const hand = this.add.circle(245, 87, 24, 0x9d6640);

    mascot.add([antlers, body, apron, head, muzzle, eye1, eye2, smile, logo, arm, hand]);

    this.mascot = mascot;
    this.mascotArm = arm;
    this.mascotHand = hand;

    const crank = this.add.container(width * .265, height * .57);
    const crankBar = this.add.rectangle(0, 0, 126, 15, 0xd4a34b)
      .setOrigin(1, .5);
    const crankHandle = this.add.rectangle(-126, 0, 24, 55, 0x49301d);
    crank.add([crankBar, crankHandle]);
    this.crank = crank;
  }

  createDrum() {
    const width = this.scale.width;
    const height = this.scale.height;

    const x = width * .57;
    const y = height * .51;
    const drumWidth = width * .56;
    const drumHeight = height * .5;

    const shadow = this.add.ellipse(x, y + drumHeight * .48, drumWidth * .8, 45, 0x000000, .28);

    const drum = this.add.graphics();
    drum.fillStyle(0x1c2c22, .88);
    drum.fillRoundedRect(x - drumWidth / 2, y - drumHeight / 2, drumWidth, drumHeight, drumHeight * .34);
    drum.lineStyle(10, 0xd4a34b, .78);
    drum.strokeRoundedRect(x - drumWidth / 2, y - drumHeight / 2, drumWidth, drumHeight, drumHeight * .34);

    drum.lineStyle(3, 0xffffff, .07);
    drum.strokeRoundedRect(
      x - drumWidth / 2 + 16,
      y - drumHeight / 2 + 16,
      drumWidth - 32,
      drumHeight - 32,
      drumHeight * .3
    );

    const badge = this.add.text(x, y - 25, "FIVE\nSTAGS", {
      align: "center",
      fontFamily: "Georgia",
      fontSize: "30px",
      fontStyle: "bold",
      color: "#d4a34b"
    }).setOrigin(.5).setAlpha(.47);

    this.drumBounds = new Phaser.Geom.Ellipse(x, y + 20, drumWidth * .82, drumHeight * .7);
    this.drumCenter = { x, y };
    this.drumGraphic = drum;
  }

  createWinnerDisplay() {
    const width = this.scale.width;
    const height = this.scale.height;

    const x = width * .91;
    const y = height * .36;

    this.add.text(x, y - 100, "WINNER", {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f2d28f",
      letterSpacing: 5
    }).setOrigin(.5);

    this.add.circle(x, y, 82, 0x101912)
      .setStrokeStyle(2, 0xd4a34b, .65);

    this.winnerBall = this.add.circle(x, y, 58, 0xe5b75b)
      .setStrokeStyle(5, 0xd4a34b);

    this.winnerText = this.add.text(x, y, state.currentWinner ?? "—", {
      fontFamily: "Arial",
      fontSize: "36px",
      fontStyle: "bold",
      color: "#172017"
    }).setOrigin(.5);
  }

  createBallField() {
    this.ballBodies.forEach(ball => ball.destroy());
    this.ballBodies = [];

    const available = availableNumbers();
    const visible = available.length <= 60
      ? available
      : Phaser.Utils.Array.Shuffle([...available]).slice(0, 60);

    visible.forEach(number => {
      const point = Phaser.Geom.Ellipse.Random(this.drumBounds);
      const ball = this.add.container(point.x, point.y);

      const circle = this.add.circle(0, 0, 19, 0xe5b75b)
        .setStrokeStyle(2, 0x85551d);

      const text = this.add.text(0, 0, String(number), {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#172017"
      }).setOrigin(.5);

      ball.add([circle, text]);
      ball.setData({
        vx: Phaser.Math.FloatBetween(-1.2, 1.2),
        vy: Phaser.Math.FloatBetween(-1.2, 1.2),
        spin: Phaser.Math.FloatBetween(-.03, .03)
      });

      this.ballBodies.push(ball);
    });
  }

  update() {
    const ellipse = this.drumBounds;
    const cx = ellipse.x;
    const cy = ellipse.y;
    const rx = ellipse.width / 2 - 22;
    const ry = ellipse.height / 2 - 22;

    this.ballBodies.forEach(ball => {
      let vx = ball.getData("vx");
      let vy = ball.getData("vy");

      const force = this.isDrawing ? .58 : .12;
      vx += Phaser.Math.FloatBetween(-force, force);
      vy += Phaser.Math.FloatBetween(-force, force) + .012;

      const maxSpeed = this.isDrawing ? 8 : 2.7;
      const speed = Math.hypot(vx, vy);

      if (speed > maxSpeed) {
        vx = vx / speed * maxSpeed;
        vy = vy / speed * maxSpeed;
      }

      ball.x += vx;
      ball.y += vy;
      ball.rotation += ball.getData("spin");

      const nx = (ball.x - cx) / rx;
      const ny = (ball.y - cy) / ry;

      if (nx * nx + ny * ny > 1) {
        const angle = Math.atan2((ball.y - cy) / ry, (ball.x - cx) / rx);
        ball.x = cx + Math.cos(angle) * rx * .985;
        ball.y = cy + Math.sin(angle) * ry * .985;
        vx *= -.8;
        vy *= -.8;
      }

      ball.setData("vx", vx);
      ball.setData("vy", vy);
    });
  }

  playCountdownTone(number) {
    if (!state.soundOn) return;
    this.playTone(340 + number * 55, .16);
  }

  playTone(frequency, duration) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const now = this.audioContext.currentTime;

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(.065, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);

      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn("Audio unavailable:", error);
    }
  }

  async drawWinner() {
    if (this.isDrawing) return;

    const available = availableNumbers();
    if (!available.length) return;

    this.isDrawing = true;
    updateDOM();

    await runCountdown();

    this.tweens.add({
      targets: this.crank,
      angle: 360 * 7,
      duration: 3300,
      ease: "Linear"
    });

    this.tweens.add({
      targets: this.mascot,
      y: this.mascot.y - 4,
      yoyo: true,
      repeat: 6,
      duration: 240
    });

    this.tweens.add({
      targets: this.mascotArm,
      rotation: .02,
      yoyo: true,
      repeat: 6,
      duration: 240
    });

    await new Promise(resolve => setTimeout(resolve, 3300));

    const winner = available[secureRandomIndex(available.length)];
    state.currentWinner = winner;
    state.drawnNumbers.push(winner);
    saveState();

    this.winnerText.setText(String(winner));
    this.tweens.add({
      targets: [this.winnerBall, this.winnerText],
      scale: { from: .2, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 650,
      ease: "Back.Out"
    });

    this.playTone(523, .35);
    setTimeout(() => this.playTone(659, .35), 140);
    setTimeout(() => this.playTone(784, .55), 280);

    this.isDrawing = false;
    this.createBallField();
    updateDOM();

    if (state.celebrationOn) {
      setTimeout(() => showWinner(winner), 450);
    }
  }

  resetRaffle() {
    state.drawnNumbers = [];
    state.currentWinner = null;
    saveState();
    this.winnerText.setText("—");
    this.createBallField();
    updateDOM();
  }
}

loadState();

let gameScene = null;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#08100b",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: true,
    roundPixels: false
  },
  scene: {
    create() {
      gameScene = new RaffleScene();
      this.scene.add("RaffleScene", gameScene, true);
    }
  }
});

ui.drawBtn.addEventListener("click", () => gameScene?.drawWinner());

ui.resetBtn.addEventListener("click", () => {
  if (state.drawnNumbers.length === 0) {
    gameScene?.resetRaffle();
  } else {
    ui.resetDialog.showModal();
  }
});

ui.resetDialog.addEventListener("close", () => {
  if (ui.resetDialog.returnValue === "confirm") {
    gameScene?.resetRaffle();
  }
});

ui.settingsBtn.addEventListener("click", () => {
  ui.panel.classList.add("open");
  ui.panel.setAttribute("aria-hidden", "false");
});

function closeSettings() {
  ui.panel.classList.remove("open");
  ui.panel.setAttribute("aria-hidden", "true");
}

ui.closeSettings.addEventListener("click", closeSettings);
ui.backdrop.addEventListener("click", closeSettings);

ui.applySettings.addEventListener("click", () => {
  const nextMax = Number(ui.highestTicket.value);

  if (!Number.isInteger(nextMax) || nextMax < 1 || nextMax > 2000) {
    ui.settingsMessage.textContent = "Enter a whole number between 1 and 2,000.";
    return;
  }

  if (state.drawnNumbers.length > 0 && nextMax !== state.maxNumber) {
    const proceed = window.confirm(
      "Changing the ticket range starts a fresh raffle. Continue?"
    );
    if (!proceed) return;
  }

  state.maxNumber = nextMax;
  state.drawnNumbers = [];
  state.currentWinner = null;
  saveState();
  gameScene?.winnerText.setText("—");
  gameScene?.createBallField();
  updateDOM();
  closeSettings();
});

ui.soundBtn.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  saveState();
  updateDOM();
});

ui.countdownToggle.addEventListener("change", () => {
  state.countdownOn = ui.countdownToggle.checked;
  saveState();
});

ui.celebrationToggle.addEventListener("change", () => {
  state.celebrationOn = ui.celebrationToggle.checked;
  saveState();
});

ui.fullscreenBtn.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.warn("Full screen unavailable:", error);
  }
});

document.addEventListener("fullscreenchange", () => {
  ui.fullscreenBtn.textContent =
    document.fullscreenElement ? "Exit full screen" : "Full screen";
});

ui.closeWinner.addEventListener("click", closeWinner);
ui.winnerOverlay.addEventListener("click", event => {
  if (event.target === ui.winnerOverlay) closeWinner();
});

updateDOM();
