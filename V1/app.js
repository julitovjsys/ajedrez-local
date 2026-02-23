/* global Chess */
(() => {
  const boardEl = document.getElementById("board");
  const msgEl = document.getElementById("msg");
  
  // Fuente de verdad única
  let game = new Chess();
  let selectedSquare = null;

  const PIECES = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
  };

  function render() {
    boardEl.innerHTML = "";
    const board = game.board(); // Matriz de chess.js

    // Calculamos movimientos legales solo si hay algo seleccionado
    const moves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
    const legalDestinations = moves.map(m => m.to);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        const sqName = String.fromCharCode(97 + c) + (8 - r);
        
        const cell = document.createElement("div");
        cell.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        cell.dataset.square = sqName;

        // Visual: Selección y puntos legales
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

    // LÓGICA DE MOVIMIENTO
    if (!selectedSquare) {
      // Intentar seleccionar (solo si es el turno del color correcto)
      if (piece && piece.color === game.turn()) {
        selectedSquare = sq;
      }
    } else {
      // Intentar mover
      const move = game.move({ from: selectedSquare, to: sq, promotion: "q" });
      
      if (move) {
        msgEl.textContent = "✅ Movimiento legal.";
        selectedSquare = null;
      } else {
        // Si falló pero clicas otra de tus piezas, cambiamos la selección
        if (piece && piece.color === game.turn()) {
          selectedSquare = sq;
        } else {
          msgEl.textContent = "❌ Movimiento ilegal.";
          selectedSquare = null;
        }
      }
    }
    render();
  }

  function updateUI() {
    document.getElementById("turnLabel").textContent = `Turno: ${game.turn() === 'w' ? 'Blancas' : 'Negras'}`;
    if (game.in_checkmate()) msgEl.textContent = "🏁 ¡JAQUE MATE!";
    else if (game.in_check()) msgEl.textContent = "⚠️ ¡JAQUE!";
  }

  boardEl.onclick = onSquareClick;
  document.getElementById("btnReset").onclick = () => { game.reset(); selectedSquare = null; render(); };
  document.getElementById("btnUndo").onclick = () => { game.undo(); selectedSquare = null; render(); };

  render(); // Primer renderizado
})();
