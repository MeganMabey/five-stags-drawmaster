const STORAGE_KEY = "fiveStagsLuckyDraw";

const maxNumberInput = document.getElementById("maxNumber");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const rangeMessage = document.getElementById("rangeMessage");
const remainingCount = document.getElementById("remainingCount");
const drawnCount = document.getElementById("drawnCount");
const drawBtn = document.getElementById("drawBtn");
const resetBtn = document.getElementById("resetBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const winningNumber = document.getElementById("winningNumber");
const numberDisplay = document.getElementById("numberDisplay");
const statusText = document.getElementById("statusText");
const historyList = document.getElementById("historyList");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const confirmDialog = document.getElementById("confirmDialog");
const confettiLayer = document.getElementById("confetti");

let state = {
  maxNumber: 200,
  drawnNumbers: [],
  currentWinner: null
};

let isDrawing = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (
      saved &&
      Number.isInteger(saved.maxNumber) &&
      Array.isArray(saved.drawnNumbers)
    ) {
      state.maxNumber = saved.maxNumber;
      state.drawnNumbers = saved.drawnNumbers.filter(
        number =>
          Number.isInteger(number) &&
          number >= 1 &&
          number <= saved.maxNumber
      );
      state.currentWinner =
        Number.isInteger(saved.currentWinner) ? saved.currentWinner : null;
    }
  } catch (error) {
    console.warn("Could not load saved draw:", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getAvailableNumbers() {
  const used = new Set(state.drawnNumbers);
  const available = [];

  for (let number = 1; number <= state.maxNumber; number += 1) {
    if (!used.has(number)) {
      available.push(number);
    }
  }

  return available;
}

function render() {
  const remaining = state.maxNumber - state.drawnNumbers.length;

  maxNumberInput.value = state.maxNumber;
  remainingCount.textContent = remaining;
  drawnCount.textContent = state.drawnNumbers.length;
  winningNumber.textContent = state.currentWinner ?? "—";

  drawBtn.disabled = remaining === 0 || isDrawing;
  drawBtn.textContent =
    remaining === 0 ? "All numbers drawn" : isDrawing ? "Drawing..." : "Draw a number";

  rangeMessage.textContent =
    `Tickets 1–${state.maxNumber} are ready. ` +
    `${remaining} number${remaining === 1 ? "" : "s"} remaining.`;

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

  [...state.drawnNumbers].reverse().forEach(number => {
    const chip = document.createElement("span");
    chip.className = "history-chip";
    chip.textContent = number;
    chip.title = `Ticket number ${number}`;
    historyList.appendChild(chip);
  });
}

function validateRange() {
  const nextMax = Number(maxNumberInput.value);

  if (!Number.isInteger(nextMax) || nextMax < 1 || nextMax > 10000) {
    rangeMessage.textContent = "Enter a whole number between 1 and 10,000.";
    maxNumberInput.focus();
    return null;
  }

  return nextMax;
}

function applyRange() {
  if (isDrawing) return;

  const nextMax = validateRange();
  if (nextMax === null) return;

  const invalidExistingNumbers = state.drawnNumbers.some(
    number => number > nextMax
  );

  if (state.drawnNumbers.length > 0 && nextMax !== state.maxNumber) {
    const okay = window.confirm(
      invalidExistingNumbers
        ? "Changing the range will clear the current draw because some drawn numbers are outside the new range. Continue?"
        : "Changing the ticket range will start a fresh draw. Continue?"
    );

    if (!okay) {
      maxNumberInput.value = state.maxNumber;
      return;
    }
  }

  state.maxNumber = nextMax;
  state.drawnNumbers = [];
  state.currentWinner = null;
  statusText.textContent = "Range updated. Ready when you are.";
  saveState();
  render();
}

function randomItem(items) {
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

function drawNumber() {
  if (isDrawing) return;

  const availableNumbers = getAvailableNumbers();

  if (availableNumbers.length === 0) {
    statusText.textContent = "Every number has already been drawn.";
    return;
  }

  isDrawing = true;
  numberDisplay.classList.remove("winner");
  numberDisplay.classList.add("rolling");
  statusText.textContent = "Good luck...";
  render();

  let rolls = 0;
  const totalRolls = 24;

  const rollingTimer = window.setInterval(() => {
    winningNumber.textContent = randomItem(availableNumbers);
    rolls += 1;

    if (rolls >= totalRolls) {
      window.clearInterval(rollingTimer);

      const winner = randomItem(availableNumbers);
      state.currentWinner = winner;
      state.drawnNumbers.push(winner);

      isDrawing = false;
      numberDisplay.classList.remove("rolling");
      void numberDisplay.offsetWidth;
      numberDisplay.classList.add("winner");

      statusText.textContent = `Ticket ${winner} is the winner!`;
      launchConfetti();
      saveState();
      render();
    }
  }, 70);
}

function launchConfetti() {
  confettiLayer.innerHTML = "";

  for (let i = 0; i < 65; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.animationDuration = `${1.4 + Math.random() * 1.1}s`;
    piece.style.setProperty("--drift", `${-130 + Math.random() * 260}px`);
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;

    if (i % 3 === 1) {
      piece.style.background = "var(--rust)";
    } else if (i % 3 === 2) {
      piece.style.background = "var(--ink)";
    }

    confettiLayer.appendChild(piece);
  }

  window.setTimeout(() => {
    confettiLayer.innerHTML = "";
  }, 2800);
}

function resetDraw() {
  state.drawnNumbers = [];
  state.currentWinner = null;
  statusText.textContent = "Draw reset. Ready when you are.";
  saveState();
  render();
}

function requestReset() {
  if (state.drawnNumbers.length === 0) {
    resetDraw();
    return;
  }

  if (typeof confirmDialog.showModal === "function") {
    confirmDialog.showModal();
  } else if (window.confirm("Reset the draw and clear all drawn numbers?")) {
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
    console.warn("Full screen was not available:", error);
  }
}

applyRangeBtn.addEventListener("click", applyRange);
maxNumberInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    applyRange();
  }
});

drawBtn.addEventListener("click", drawNumber);
resetBtn.addEventListener("click", requestReset);
clearHistoryBtn.addEventListener("click", requestReset);
fullscreenBtn.addEventListener("click", toggleFullscreen);

confirmDialog.addEventListener("close", () => {
  if (confirmDialog.returnValue === "confirm") {
    resetDraw();
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreenBtn.textContent = document.fullscreenElement
    ? "Exit full screen"
    : "Full screen";
});

loadState();
render();
