/* global Chess */
(() => {
  const boardEl = document.getElementById("board");
  const msgEl = document.getElementById("msg");
  const movesEl = document.getElementById("moves");
  
  let game = new Chess();
  let selectedSquare = null;

  const PIECES = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
  };

  const PIECE_NAMES = {
    'p': 'Peón', 'n': 'Caballo', 'b': 'Alfil', 
    'r': 'Torre', 'q': 'Dama', 'k': 'Rey'
  };

  // Valores comerciales de las piezas para el contador
  const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  function calculateMaterial() {
    let white = 0;
    let black = 0;
    game.board().forEach(row => {
      row.forEach(sq => {
        if (sq) {
          if (sq.color === 'w') white += VALUES[sq.type];
          else black += VALUES[sq.type];
        }
      });
    });
    const diff = white - black;
    return diff > 0 ? `+${diff} Blancas` : diff < 0 ? `${diff} Negras` : "Igualdad";
  }

  function render() {
    boardEl.innerHTML = "";
    const board = game.board();
    const moves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
    const legalDestinations = moves.map(m => m.to);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        const sqName = String.fromCharCode(97 + c) + (8 - r);
        const cell = document.createElement("div");
        cell.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
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
      if (move) {
        selectedSquare = null;
      } else {
        if (piece && piece.color === game.turn()) selectedSquare = sq;
        else selectedSquare = null;
      }
    }
    render();
  }

  function updateUI() {
    const advantage = calculateMaterial();
    const turnLabel = document.getElementById("turnLabel");
    if(turnLabel) turnLabel.textContent = `Turno: ${game.turn() === 'w' ? 'Blancas' : 'Negras'} | Ventaja: ${advantage}`;
    
    updateHistory();
  }

  function updateHistory() {
    if (!movesEl) return;
    movesEl.innerHTML = "";
    const history = game.history({ verbose: true });
    history.forEach((move) => {
      const li = document.createElement("li");
      const color = move.color === 'w' ? 'Blancas' : 'Negras';
      const pieza = PIECE_NAMES[move.piece];
      li.textContent = `${color}: ${pieza} a ${move.to}`;
      if (move.flags.includes('c')) li.textContent += " (Captura ⚔️)";
      movesEl.appendChild(li);
    });
    movesEl.scrollTop = movesEl.scrollHeight;
  }

  boardEl.onclick = onSquareClick;
  document.getElementById("btnUndo").onclick = () => { game.undo(); selectedSquare = null; render(); };
  document.getElementById("btnReset").onclick = () => { game.reset(); selectedSquare = null; render(); };

  render();
})();
