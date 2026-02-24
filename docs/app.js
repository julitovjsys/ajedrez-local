/* global Chess, Swal, confetti */
(() => {
  const boardEl = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const btnStart = document.getElementById("btnStart");
  const timerDisplay = document.getElementById("mainTimer");
  
  let game = new Chess();
  let scores = JSON.parse(localStorage.getItem('chess_scores')) || { w: 0, b: 0 };
  let gameStarted = false, autoFlip = true, isAnalysisMode = false;
  let playerNames = { w: "GAEL", b: "OPONENTE" };
  let lastMove = { from: null, to: null };
  let seconds = 0, timerInterval = null;

  const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const PIECE_NAMES = { 'p': 'Peón', 'n': 'Caballo', 'b': 'Alfil', 'r': 'Torre', 'q': 'Dama', 'k': 'Rey' };
  const PIECE_IMG = {
    w: { p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg', n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg', b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg', r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg', q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg', k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg' },
    b: { p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg', n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg', b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg', r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg', q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg', k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg' }
  };

  function startTurnClock() {
    clearInterval(timerInterval);
    seconds = 0; // REPARA: Cada que inicia un turno, el cronómetro se va a 0
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (gameStarted && !game.game_over() && !isAnalysisMode) {
        seconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
  }

  function calculateAdvantage() {
    const board = game.board();
    let w = 0, b = 0;
    board.forEach(row => row.forEach(p => {
      if (!p) return;
      const v = PIECE_VAL[p.type] || 0;
      if (p.color === 'w') w += v;
      else b += v;
    }));
    return w - b;
  }

  function advantageLabel(diff) {
    if (diff === 0) return "0";
    return diff > 0 ? `+${diff}` : `-${Math.abs(diff)}`;
  }

  function render() {
    boardEl.innerHTML = "";
    const board = game.board();
    const turn = game.turn();
    const isCheck = game.in_check();

    if (gameStarted && turn === 'b' && autoFlip && !isAnalysisMode) boardEl.classList.add("flipped");
    else boardEl.classList.remove("flipped");

    if (gameStarted) document.getElementById("turnAnnouncer").textContent = `TURNO DE: ${playerNames[turn]}`;

    const diff = calculateAdvantage();
    document.getElementById("advantage").textContent = advantageLabel(diff);

    // Marca casillas del último movimiento
    const lastFrom = lastMove.from, lastTo = lastMove.to;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = String.fromCharCode(97 + f) + (8 - r);
        const cell = document.createElement("div");
        cell.className = `square ${(r + f) % 2 === 0 ? 'light' : 'dark'}`;

        // Last move highlight
        if (sq === lastFrom || sq === lastTo) cell.classList.add("last-move");

        // Check highlight
        if (isCheck) {
          const kingSq = findKingSquare(turn);
          if (sq === kingSq) cell.classList.add("in-check");
        }

        cell.dataset.square = sq;

        const piece = board[r][f];
        if (piece) {
          const p = document.createElement("div");
          p.className = "piece";
          p.dataset.piece = piece.color + piece.type;
          p.style.backgroundImage = `url(${PIECE_IMG[piece.color][piece.type]})`;

          // Click move (modo profesor / click)
          p.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!gameStarted) return;
            if (!isAnalysisMode) return; // modo profesor solamente
            showLegalMoves(sq);
          });

          cell.appendChild(p);
        }

        // Click square
        cell.addEventListener("click", () => {
          if (!gameStarted) return;
          if (!isAnalysisMode) return;
          handleSquareClick(sq);
        });

        boardEl.appendChild(cell);
      }
    }

    updateUI();
    updateGameState();
  }

  function findKingSquare(color) {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === color) {
          return String.fromCharCode(97 + f) + (8 - r);
        }
      }
    }
    return null;
  }

  let selectedSquare = null;

  function showLegalMoves(from) {
    clearHighlights();
    selectedSquare = from;
    const moves = game.moves({ square: from, verbose: true });
    moves.forEach(m => {
      const el = document.querySelector(`.square[data-square="${m.to}"]`);
      if (el) el.style.outline = "3px solid rgba(149,187,74,.9)";
    });
    const fromEl = document.querySelector(`.square[data-square="${from}"]`);
    if (fromEl) fromEl.style.outline = "3px solid rgba(255,255,255,.75)";
  }

  function clearHighlights() {
    document.querySelectorAll(".square").forEach(sq => {
      sq.style.outline = "none";
    });
  }

  function handleSquareClick(to) {
    if (!selectedSquare) return;
    const move = game.move({ from: selectedSquare, to, promotion: "q" });
    if (move) {
      lastMove = { from: move.from, to: move.to };
      startTurnClock();
      selectedSquare = null;
      render();
    }
  }

  function updateGameState() {
    const statusEl = document.getElementById("status");
    if (!gameStarted) { statusEl.textContent = "Esperando…"; return; }

    if (game.in_checkmate()) {
      statusEl.textContent = "Jaque mate";
      const winner = game.turn() === 'w' ? 'b' : 'w';
      scores[winner]++;
      localStorage.setItem('chess_scores', JSON.stringify(scores));
      celebrate(winner);
      gameStarted = false;
      clearInterval(timerInterval);
      return;
    }

    if (game.in_draw()) {
      statusEl.textContent = "Tablas";
      gameStarted = false;
      clearInterval(timerInterval);
      return;
    }

    statusEl.textContent = game.in_check() ? "Jaque" : "En juego";
  }

  function celebrate(winner) {
    try {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
    Swal.fire({
      icon: "success",
      title: "¡Ganador!",
      text: `Ganó ${playerNames[winner]}`,
      confirmButtonText: "OK"
    });
  }

  btnStart.onclick = () => {
    playerNames.b = document.getElementById("guestName").value.trim() || "AMIGO";
    document.getElementById("name-b").textContent = playerNames.b;
    document.getElementById("avatar-opponent").src = `https://api.dicebear.com/7.x/bottts/svg?seed=${playerNames.b}`;
    document.getElementById("setupMatch").classList.add("hidden");
    gameStarted = true;
    startTurnClock(); // Inicia el primer turno en 0
    render();
  };

  function updateUI() {
    document.getElementById("scoreBlancas").textContent = scores.w;
    document.getElementById("scoreNegras").textContent = scores.b;
    movesEl.innerHTML = "";
    game.history({ verbose: true }).forEach((m, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${Math.floor(i/2)+1}.${m.color==='w'?'':'..'}</b> ${playerNames[m.color]}: ${PIECE_NAMES[m.piece]} a ${m.to}`;
      movesEl.appendChild(li);
    });
    movesEl.scrollTop = movesEl.scrollHeight;
  }

  document.getElementById("btnFlipToggle").onclick = function() {
    autoFlip = !autoFlip;
    this.textContent = `🔄 Giro: ${autoFlip ? 'ON' : 'OFF'}`;
    render();
  };

  document.getElementById("btnAnalysis").onclick = function() {
    isAnalysisMode = !isAnalysisMode;
    this.classList.toggle("active");
    this.textContent = isAnalysisMode ? "🎓 Profesor: ON" : "🎓 Profesor: OFF";
    render();
  };

  document.getElementById("btnReset").onclick = () => { localStorage.clear(); location.reload(); };
  document.getElementById("btnUndo").onclick = () => { game.undo(); render(); };

  // Mobile: re-render en cambios de tamaño/orientación (Android)
  const _rerender = () => {
    try { render(); } catch (e) {}
  };
  window.addEventListener('resize', () => requestAnimationFrame(_rerender));
  window.addEventListener('orientationchange', () => setTimeout(_rerender, 50));

  render();
})();
