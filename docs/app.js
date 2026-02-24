/* global Chess, Swal, confetti */
(() => {
  const $ = (id) => document.getElementById(id);

  const boardEl = $("board");
  const movesEl = $("moves");

  // Elementos UI (pueden existir o no, pero ya no tronamos)
  const btnStart = $("btnStart");
  const guestName = $("guestName");
  const setupMatch = $("setupMatch");

  const btnUndo = $("btnUndo");
  const btnFlipToggle = $("btnFlipToggle");
  const btnAnalysis = $("btnAnalysis");
  const btnReset = $("btnReset");

  const timerDisplay = $("mainTimer");
  const turnAnnouncer = $("turnAnnouncer");

  const scoreW = $("scoreBlancas");
  const scoreB = $("scoreNegras");
  const nameB = $("name-b");
  const avatarB = $("avatar-opponent");
  const advW = $("advantageW");
  const advB = $("advantageB");

  if (!boardEl) {
    alert("ERROR: No existe #board en index.html");
    return;
  }
  if (typeof Chess === "undefined") {
    alert("ERROR: Chess no cargó. Revisa /vendor/chess.js");
    return;
  }

  // ===== Estado =====
  let game = new Chess();
  let gameStarted = false;
  let autoFlip = true;
  let isAnalysisMode = false;

  let playerNames = { w: "GAEL", b: "INVITADO" };
  let lastMove = { from: null, to: null };

  let seconds = 0;
  let timerInterval = null;

  // Tap-to-move
  let tapFrom = null;
  let tapTargets = new Set();

  const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const PIECE_NAMES = { p: "Peón", n: "Caballo", b: "Alfil", r: "Torre", q: "Dama", k: "Rey" };

  const IMG = {
    w: {
      p: "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
      n: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
      b: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
      r: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
      q: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
      k: "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg",
    },
    b: {
      p: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg",
      n: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
      b: "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
      r: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
      q: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
      k: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg",
    },
  };

  // Scores (persistentes)
  let scores = JSON.parse(localStorage.getItem("chess_scores") || "null") || { w: 0, b: 0 };

  function saveScores() {
    localStorage.setItem("chess_scores", JSON.stringify(scores));
  }

  function startTurnClock() {
    clearInterval(timerInterval);
    seconds = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      if (gameStarted && !game.game_over() && !isAnalysisMode) {
        seconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    if (!timerDisplay) return;
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `${m}:${s}`;
  }

  function calculateAdvantage() {
    let w = 0, b = 0;
    game.board().flat().forEach(p => {
      if (!p) return;
      if (p.color === "w") w += PIECE_VAL[p.type];
      else b += PIECE_VAL[p.type];
    });
    const diff = w - b;
    if (advW) advW.textContent = diff > 0 ? `+${diff}` : "";
    if (advB) advB.textContent = diff < 0 ? `+${Math.abs(diff)}` : "";
  }

  function clearTapUI() {
    tapFrom = null;
    tapTargets.clear();
    [...boardEl.querySelectorAll(".square")].forEach(sq => {
      sq.classList.remove("hint", "capture-hint", "selected");
    });
  }

  function canSelectSquare(square) {
    const p = game.get(square);
    if (!p) return false;
    if (isAnalysisMode) return true;
    if (!gameStarted) return false;
    return p.color === game.turn();
  }

  function setTapFrom(square) {
    clearTapUI();
    tapFrom = square;

    const fromEl = boardEl.querySelector(`.square[data-square="${square}"]`);
    if (fromEl) fromEl.classList.add("selected");

    const moves = game.moves({ square, verbose: true });
    moves.forEach(m => {
      tapTargets.add(m.to);
      const el = boardEl.querySelector(`.square[data-square="${m.to}"]`);
      if (!el) return;
      if (m.captured) el.classList.add("capture-hint");
      else el.classList.add("hint");
    });
  }

  function doMove(from, to) {
    if (isAnalysisMode) {
      const p = game.get(from);
      if (p) {
        game.remove(from);
        game.put(p, to);
        lastMove = { from, to };
        render();
      }
      return;
    }

    const move = game.move({ from, to, promotion: "q" });
    if (!move) return;

    lastMove = { from, to };
    render();

    if (game.game_over()) {
      clearInterval(timerInterval);
      try { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); } catch {}
      const winner = game.turn() === "w" ? "Negras" : "Blancas";
      Swal.fire("Fin de partida", `Ganador: ${winner}`, "success");
    } else {
      startTurnClock();
    }
  }

  function onDrop(e) {
    const to = e.target.closest(".square")?.dataset.square;
    const from = window.selectedSq;
    if (!to || !from) return;

    if (!isAnalysisMode) {
      const p = game.get(from);
      if (!p || p.color !== game.turn()) return;
    }

    doMove(from, to);
    clearTapUI();
  }

  function onSquareTap(e) {
    const cell = e.target.closest(".square");
    if (!cell) return;
    e.preventDefault();

    const sq = cell.dataset.square;

    if (!tapFrom) {
      if (canSelectSquare(sq)) setTapFrom(sq);
      else clearTapUI();
      return;
    }

    if (canSelectSquare(sq)) {
      setTapFrom(sq);
      return;
    }

    if (tapTargets.has(sq)) {
      const from = tapFrom;
      clearTapUI();
      doMove(from, sq);
      return;
    }

    clearTapUI();
  }

  function updateUI() {
    if (scoreW) scoreW.textContent = scores.w;
    if (scoreB) scoreB.textContent = scores.b;

    if (!movesEl) return;
    movesEl.innerHTML = "";

    game.history({ verbose: true }).forEach((m, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${Math.floor(i/2)+1}${m.color==="w" ? "." : "..."}</b> ${PIECE_NAMES[m.piece]} → ${m.to}`;
      movesEl.appendChild(li);
    });

    movesEl.scrollTop = movesEl.scrollHeight;
  }

  function render() {
    boardEl.innerHTML = "";

    const board = game.board();
    const turn = game.turn();

    if (turnAnnouncer) {
      turnAnnouncer.textContent = gameStarted ? `TURNO: ${turn === "w" ? "BLANCAS" : "NEGRAS"}` : "ESPERANDO...";
    }

    if (gameStarted && turn === "b" && autoFlip && !isAnalysisMode) boardEl.classList.add("flipped");
    else boardEl.classList.remove("flipped");

    for (let r=0; r<8; r++){
      for (let f=0; f<8; f++){
        const sq = String.fromCharCode(97+f) + (8-r);
        const cell = document.createElement("div");
        cell.className = `square ${(r+f)%2===0 ? "light":"dark"}`;
        cell.dataset.square = sq;

        if (sq === lastMove.from || sq === lastMove.to) cell.classList.add("last-move");

        const piece = board[r][f];
        if (piece){
          if (piece.type === "k" && piece.color === turn && game.in_check()) cell.classList.add("in-check");

          const div = document.createElement("div");
          div.className = "piece";
          div.style.backgroundImage = `url(${IMG[piece.color][piece.type]})`;

          if (isAnalysisMode || (gameStarted && piece.color === turn)) {
            div.draggable = true;
            div.ondragstart = () => (window.selectedSq = sq);
          } else {
            div.draggable = false;
          }

          cell.appendChild(div);
        }

        cell.ondragover = (ev) => ev.preventDefault();
        cell.ondrop = onDrop;

        cell.addEventListener("click", onSquareTap, { passive: false });
        cell.addEventListener("touchstart", onSquareTap, { passive: false });

        boardEl.appendChild(cell);
      }
    }

    calculateAdvantage();
    updateUI();
  }

  // ===== Handlers (null-safe) =====
  if (btnStart) {
    btnStart.onclick = () => {
      const g = (guestName?.value || "").trim();
      playerNames.b = g || "INVITADO";

      if (nameB) nameB.textContent = playerNames.b;
      if (avatarB) avatarB.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(playerNames.b)}`;

      if (setupMatch) setupMatch.style.display = "none";

      gameStarted = true;
      clearTapUI();
      startTurnClock();
      render();
    };
  }

  if (btnFlipToggle) {
    btnFlipToggle.onclick = () => {
      autoFlip = !autoFlip;
      clearTapUI();
      render();
    };
  }

  if (btnAnalysis) {
    btnAnalysis.onclick = () => {
      isAnalysisMode = !isAnalysisMode;
      btnAnalysis.classList.toggle("active", isAnalysisMode);
      clearTapUI();
      render();
    };
  }

  if (btnReset) {
    btnReset.onclick = () => {
      localStorage.clear();
      location.reload();
    };
  }

  if (btnUndo) {
    btnUndo.onclick = () => {
      game.undo();
      clearTapUI();
      render();
    };
  }

  // ===== init =====
  saveScores();
  render();
})();
