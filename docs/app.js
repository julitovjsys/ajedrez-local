/* global Chess, Swal, confetti */
(() => {
  const boardEl = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const btnStart = document.getElementById("btnStart");
  const timerDisplay = document.getElementById("mainTimer");

  // Sonidos
  const sndMove = document.getElementById("sndMove");
  const sndCapture = document.getElementById("sndCapture");
  const sndCheck = document.getElementById("sndCheck");

  let game = new Chess();

  let scores = JSON.parse(localStorage.getItem("chess_scores")) || { w: 0, b: 0 };
  let gameStarted = false;
  let autoFlip = true;
  let isAnalysisMode = false;

  let playerNames = { w: "GAEL", b: "OPONENTE" };
  let lastMove = { from: null, to: null };

  let seconds = 0;
  let timerInterval = null;

  // Tap-to-move state (para Android)
  let tapFrom = null;
  let tapTargets = new Set();

  const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const PIECE_NAMES = { p: "Peón", n: "Caballo", b: "Alfil", r: "Torre", q: "Dama", k: "Rey" };

  const PIECE_IMG = {
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
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `${m}:${s}`;
  }

  function calculateAdvantage() {
    let w = 0,
      b = 0;
    game
      .board()
      .flat()
      .forEach((p) => {
        if (p) p.color === "w" ? (w += PIECE_VAL[p.type]) : (b += PIECE_VAL[p.type]);
      });
    const diff = w - b;
    document.getElementById("advantageW").textContent = diff > 0 ? `+${diff}` : "";
    document.getElementById("advantageB").textContent = diff < 0 ? `+${Math.abs(diff)}` : "";
  }

  function clearTapUI() {
    tapFrom = null;
    tapTargets.clear();
    [...boardEl.querySelectorAll(".square")].forEach((sq) => {
      sq.classList.remove("hint", "capture-hint", "selected");
    });
  }

  function setTapFrom(square) {
    clearTapUI();
    tapFrom = square;

    const fromEl = boardEl.querySelector(`.square[data-square="${square}"]`);
    if (fromEl) fromEl.classList.add("selected");

    // movimientos legales desde chess.js
    const moves = game.moves({ square, verbose: true });

    moves.forEach((m) => {
      tapTargets.add(m.to);
      const el = boardEl.querySelector(`.square[data-square="${m.to}"]`);
      if (!el) return;
      if (m.captured) el.classList.add("capture-hint");
      else el.classList.add("hint");
    });
  }

  function canSelectSquare(square) {
    const p = game.get(square);
    if (!p) return false;

    if (isAnalysisMode) return true; // modo profesor puede mover piezas libremente (por click/drag)
    if (!gameStarted) return false;

    return p.color === game.turn();
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

    try {
      if (game.in_check()) sndCheck && sndCheck.play();
      else if (move.captured) sndCapture && sndCapture.play();
      else sndMove && sndMove.play();
    } catch (_) {}

    render();

    if (game.game_over()) {
      clearInterval(timerInterval);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      Swal.fire(
        "Fin de partida",
        `Ganador: ${game.turn() === "w" ? playerNames.b : playerNames.w}`,
        "success"
      ).then(() => location.reload());
    } else {
      startTurnClock();
    }
  }

  function onDrop(e) {
    const to = e.target.closest(".square")?.dataset.square;
    const from = window.selectedSq;

    if (!to || !from) return;

    // En móvil drag casi no funciona, pero en PC sí
    if (isAnalysisMode) {
      doMove(from, to);
    } else {
      // Solo si el jugador está moviendo su turno
      const p = game.get(from);
      if (!p || p.color !== game.turn()) return;
      doMove(from, to);
    }

    clearTapUI();
  }

  function onSquareTap(e) {
    const cell = e.target.closest(".square");
    if (!cell) return;

    // evita que el tap haga scroll raro en móviles
    e.preventDefault();

    const sq = cell.dataset.square;

    // Si juego no empezó, igual permitimos seleccionar pero no mover (para no confundir)
    if (!gameStarted && !isAnalysisMode) {
      // solo limpiamos UI
      clearTapUI();
      return;
    }

    // Si no hay selección previa: intenta seleccionar una pieza válida
    if (!tapFrom) {
      if (canSelectSquare(sq)) {
        setTapFrom(sq);
      } else {
        clearTapUI();
      }
      return;
    }

    // Si ya hay from: si toca otro de su turno, cambia selección
    if (canSelectSquare(sq)) {
      setTapFrom(sq);
      return;
    }

    // Si toca un target legal: mueve
    if (tapTargets.has(sq)) {
      const from = tapFrom;
      clearTapUI();
      doMove(from, sq);
      return;
    }

    // Si toca algo no válido: limpiar selección
    clearTapUI();
  }

  function render() {
    boardEl.innerHTML = "";

    const board = game.board();
    const turn = game.turn();
    const isCheck = game.in_check();

    // Auto giro en modo juego
    if (gameStarted && turn === "b" && autoFlip && !isAnalysisMode) boardEl.classList.add("flipped");
    else boardEl.classList.remove("flipped");

    if (gameStarted) {
      document.getElementById("turnAnnouncer").textContent = `TURNO DE: ${playerNames[turn]}`;
    } else {
      document.getElementById("turnAnnouncer").textContent = "ESPERANDO...";
    }

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = String.fromCharCode(97 + f) + (8 - r);

        const cell = document.createElement("div");
        cell.className = `square ${(r + f) % 2 === 0 ? "light" : "dark"}`;
        cell.dataset.square = sq;

        if (sq === lastMove.from || sq === lastMove.to) cell.classList.add("last-move");

        const piece = board[r][f];
        if (piece) {
          if (piece.type === "k" && piece.color === turn && isCheck) cell.classList.add("in-check");

          const div = document.createElement("div");
          div.className = "piece";
          div.style.backgroundImage = `url(${PIECE_IMG[piece.color][piece.type]})`;

          // Drag para PC
          if (isAnalysisMode || (gameStarted && piece.color === turn)) {
            div.draggable = true;
            div.ondragstart = () => {
              window.selectedSq = sq;
            };
          } else {
            div.draggable = false;
          }

          cell.appendChild(div);
        }

        // Drag handlers
        cell.ondragover = (ev) => ev.preventDefault();
        cell.ondrop = onDrop;

        // Tap-to-move (móvil)
        cell.addEventListener("click", onSquareTap, { passive: false });
        cell.addEventListener("touchstart", onSquareTap, { passive: false });

        boardEl.appendChild(cell);
      }
    }

    updateUI();
    calculateAdvantage();
  }

  function updateUI() {
    document.getElementById("scoreBlancas").textContent = scores.w;
    document.getElementById("scoreNegras").textContent = scores.b;

    movesEl.innerHTML = "";
    game.history({ verbose: true }).forEach((m, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${Math.floor(i / 2) + 1}.${m.color === "w" ? "" : ".."}</b> ${
        playerNames[m.color]
      }: ${PIECE_NAMES[m.piece]} a ${m.to}`;
      movesEl.appendChild(li);
    });
    movesEl.scrollTop = movesEl.scrollHeight;
  }

  // ===== Botones =====
  btnStart.onclick = () => {
    playerNames.b = document.getElementById("guestName").value.trim() || "AMIGO";
    document.getElementById("name-b").textContent = playerNames.b;
    document.getElementById("avatar-opponent").src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      playerNames.b
    )}`;
    document.getElementById("setupMatch").classList.add("hidden");

    gameStarted = true;
    clearTapUI();
    startTurnClock();
    render();
  };

  document.getElementById("btnFlipToggle").onclick = function () {
    autoFlip = !autoFlip;
    this.textContent = `🔄 Giro: ${autoFlip ? "ON" : "OFF"}`;
    clearTapUI();
    render();
  };

  document.getElementById("btnAnalysis").onclick = function () {
    isAnalysisMode = !isAnalysisMode;
    this.classList.toggle("active");
    this.textContent = isAnalysisMode ? "🎓 Profesor: ON" : "🎓 Profesor: OFF";
    clearTapUI();
    render();
  };

  document.getElementById("btnReset").onclick = () => {
    localStorage.clear();
    location.reload();
  };

  document.getElementById("btnUndo").onclick = () => {
    game.undo();
    clearTapUI();
    render();
  };

  // Primer render
  render();
})();
