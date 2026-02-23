/* global Chess */
(() => {
  const boardEl = document.getElementById("board");
  const msgEl = document.getElementById("msg");
  const movesEl = document.getElementById("moves");
  const modal = document.getElementById("victoryModal");
  
  let game = new Chess();
  let selectedSquare = null;

  const PIECES = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
  };

  const PIECE_NAMES = { 'p': 'Peón', 'n': 'Caballo', 'b': 'Alfil', 'r': 'Torre', 'q': 'Dama', 'k': 'Rey' };

  function render() {
    boardEl.innerHTML = "";
    const board = game.board();
    const moves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
    const legalDestinations = moves.map(m => m.to);

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        const sqName = String.fromCharCode(97 + f) + (8 - r);
        const cell = document.createElement("div");
        cell.className = `square ${(r + f) % 2 === 0 ? 'light' : 'dark'}`;
        cell.dataset.square = sqName;
        if (selectedSquare === sqName) cell.classList.add("selected");
        if (legalDestinations.includes(sqName)) cell.classList.add("legal");
        if (piece) {
          const span = document.createElement("span");
          span.textContent = PIECES[piece.color][piece.type];
          cell.appendChild(span);
        }
        boardEl.appendChild(cell);
      }
    }
    updateUI();
  }

  function onSquareClick(e) {
    const cell = e.target.closest(".square");
    if (!cell) return;
    const sq = cell.dataset.square;
    const piece = game.get(sq);

    if (!selectedSquare) {
      if (piece && piece.color === game.turn()) selectedSquare = sq;
    } else {
      const move = game.move({ from: selectedSquare, to: sq, promotion: "q" });
      if (!move && piece && piece.color === game.turn()) selectedSquare = sq;
      else selectedSquare = null;
    }
    render();
  }

  function updateUI() {
    document.getElementById("turnLabel").textContent = `Turno: ${game.turn() === 'w' ? 'Blancas' : 'Negras'}`;
    
    // DETECCIÓN DE MATE
    if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? 'NEGRAS' : 'BLANCAS';
      triggerVictory(winner);
    } else if (game.in_draw()) {
      triggerVictory("EMPATE");
    } else if (game.in_check()) {
      msgEl.textContent = "⚠️ ¡ATENCIÓN: JAQUE!";
    } else {
      msgEl.textContent = "Partida en curso...";
    }
    updateHistory();
  }

  function triggerVictory(winner) {
    const title = document.getElementById("victoryTitle");
    const message = document.getElementById("victoryMessage");
    
    if (winner === "EMPATE") {
      title.textContent = "¡TABLAS!";
      message.textContent = "La partida terminó en empate.";
    } else {
      title.textContent = "¡JAQUE MATE!";
      message.textContent = `¡Ganan las ${winner}!`;
    }
    
    // Forzamos el modal a mostrarse
    if (modal) modal.style.display = "flex";
  }

  function updateHistory() {
    if (!movesEl) return;
    movesEl.innerHTML = "";
    game.history({ verbose: true }).forEach((move) => {
      const li = document.createElement("li");
      const colorName = move.color === 'w' ? 'Blancas' : 'Negras';
      const pieza = PIECE_NAMES[move.piece];
      
      li.textContent = `${colorName}: ${pieza} a ${move.to}`;
      if (move.flags.includes('c')) li.textContent += " ⚔️ (Captura)";
      
      movesEl.appendChild(li);
    });
    movesEl.scrollTop = movesEl.scrollHeight;
  }

  boardEl.onclick = onSquareClick;
  document.getElementById("btnUndo").onclick = () => { game.undo(); render(); };
  document.getElementById("btnReset").onclick = () => { game.reset(); render(); };

  render();
})();
