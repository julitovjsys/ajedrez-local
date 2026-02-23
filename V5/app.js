/* global Chess, Swal */
(() => {
  const boardEl = document.getElementById("board");
  const msgEl = document.getElementById("msg");
  const movesEl = document.getElementById("moves");
  
  let game = new Chess();
  let selectedSquare = null;
  
  // Cargamos score de la sesión o empezamos en 0
  let scoreBlancas = 0;
  let scoreNegras = 0;

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
    const turnLabel = document.getElementById("turnLabel");
    if(turnLabel) turnLabel.textContent = `Turno: ${game.turn() === 'w' ? 'Blancas' : 'Negras'}`;
    
    // Si hay mate, primero actualizamos el historial y el score, luego mostramos la alerta
    if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? 'Negras' : 'Blancas';
      updateHistory(true); // Forzamos el mensaje de "Rey capturado"
      finalizarPartida(winner);
    } else if (game.in_draw()) {
      updateHistory();
      finalizarPartida("Empate");
    } else if (game.in_check()) {
      msgEl.textContent = "⚠️ ¡ATENCIÓN: JAQUE!";
      updateHistory();
    } else {
      msgEl.textContent = "Partida en curso...";
      updateHistory();
    }
  }

  function finalizarPartida(ganador) {
    // Actualización inmediata de los números en pantalla
    if (ganador === "Blancas") scoreBlancas++;
    if (ganador === "Negras") scoreNegras++;
    
    document.getElementById("scoreBlancas").textContent = scoreBlancas;
    document.getElementById("scoreNegras").textContent = scoreNegras;

    // Alerta profesional con SweetAlert2
    setTimeout(() => {
      Swal.fire({
        title: ganador === "Empate" ? "¡TABLAS!" : `¡VICTORIA: GANAN ${ganador.toUpperCase()}!`,
        text: ganador === "Empate" ? "No hay más movimientos posibles." : `El Rey enemigo ha sido acorralado.`,
        icon: ganador === "Empate" ? 'info' : 'success',
        confirmButtonText: 'Siguiente Partida',
        background: '#162238',
        color: '#fff',
        confirmButtonColor: '#7ff0b2'
      }).then(() => {
        game.reset();
        render();
      });
    }, 500); // Pequeño delay para que el usuario vea el último movimiento en el historial
  }

  function updateHistory(isMate = false) {
    movesEl.innerHTML = "";
    const history = game.history({ verbose: true });
    
    history.forEach((move) => {
      const li = document.createElement("li");
      const color = move.color === 'w' ? 'Blancas' : 'Negras';
      li.textContent = `${color}: ${PIECE_NAMES[move.piece]} a ${move.to}`;
      if (move.flags.includes('c')) li.textContent += " ⚔️";
      movesEl.appendChild(li);
    });

    // IMPLEMENTACIÓN: El movimiento final que pediste
    if (isMate) {
      const liFinal = document.createElement("li");
      const winnerColor = game.turn() === 'w' ? 'Negras' : 'Blancas';
      liFinal.style.color = "#7ff0b2";
      liFinal.style.fontWeight = "bold";
      liFinal.textContent = `🏆 ${winnerColor}: ¡CAPTURA AL REY!`;
      movesEl.appendChild(liFinal);
    }

    movesEl.scrollTop = movesEl.scrollHeight;
  }

  boardEl.onclick = onSquareClick;
  document.getElementById("btnUndo").onclick = () => { game.undo(); render(); };
  document.getElementById("btnReset").onclick = () => { game.reset(); render(); };
  document.getElementById("btnFinish").onclick = () => {
    const winner = game.turn() === 'w' ? 'Negras' : 'Blancas';
    finalizarPartida(winner);
  };

  render();
})();
