const alphabetGroups = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  ['J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q'],
  ['R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
];

const wordBank = [
  'abeja', 'abrigo', 'agua', 'aire', 'amigo', 'amor', 'árbol', 'avión', 'azul',
  'barco', 'bebé', 'bicicleta', 'blanco', 'bosque', 'botella', 'bueno',
  'cabaña', 'caballo', 'café', 'caja', 'camino', 'canción', 'casa', 'castillo', 'cielo', 'ciudad', 'clase', 'cocina', 'colibrí', 'cometa', 'corazón', 'cuaderno', 'cuento',
  'dado', 'dedo', 'delfín', 'deporte', 'día', 'dinosaurio', 'dulce',
  'elefante', 'estrella', 'familia', 'flor', 'fuego', 'gato', 'girasol', 'globo', 'grande', 'helado', 'hermano', 'hielo', 'historia', 'hoja',
  'isla', 'jardín', 'juego', 'jirafa', 'juguete', 'lápiz', 'leche', 'libro', 'lluvia', 'luna', 'mar', 'mariposa', 'mesa', 'montaña', 'música', 'naranja', 'nube', 'número', 'ñandú', 'niño', 'noche', 'oso', 'otoño', 'pájaro', 'palabra', 'papel', 'parque', 'patito', 'pelota', 'perro', 'pez', 'piano', 'piña', 'planeta', 'playa', 'queso', 'ratón', 'reina', 'reloj', 'río', 'rosa', 'sapo', 'semilla', 'sol', 'sombrero', 'sonrisa', 'taza', 'teatro', 'teléfono', 'tigre', 'tortuga', 'tren', 'universo', 'vaca', 'ventana', 'verde', 'viaje', 'volcán', 'yogur', 'zapato',
];

const elements = {
  input: document.querySelector('#word-input'),
  suggestions: document.querySelector('#suggestions-list'),
  clearInput: document.querySelector('#clear-input'),
  wordTrack: document.querySelector('#word-track'),
  progressLabel: document.querySelector('#progress-label'),
  progressBar: document.querySelector('#progress-bar'),
  undo: document.querySelector('#undo-button'),
  reset: document.querySelector('#reset-button'),
  grid: document.querySelector('#letter-grid'),
  setLabel: document.querySelector('#set-label'),
  callout: document.querySelector('#target-callout'),
  calloutText: document.querySelector('#callout-text'),
  findLetter: document.querySelector('#find-letter-button'),
  nextSet: document.querySelector('#next-set-button'),
  toast: document.querySelector('#toast'),
};

const state = {
  groupIndex: 0,
  letters: [],
  target: '',
  toastTimer: null,
};

const normalize = (value) => value
  .toLocaleUpperCase('es')
  .replace(/Ñ/g, '§')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/§/g, 'Ñ');

function renderGrid() {
  const targetLetter = state.target[state.letters.length];
  elements.grid.replaceChildren();
  alphabetGroups[state.groupIndex].forEach((letter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'letter-button';
    button.textContent = letter;
    button.setAttribute('aria-label', `Letra ${letter}`);
    const alreadyUsed = state.letters.some((selected) => selected === letter);
    if (alreadyUsed) button.classList.add('is-used');
    if (targetLetter && normalize(targetLetter) === normalize(letter)) {
      button.classList.add('is-target');
      button.setAttribute('aria-label', `Letra ${letter}, la siguiente letra de la palabra`);
    }
    button.addEventListener('click', () => selectLetter(letter));
    elements.grid.append(button);
  });

  elements.setLabel.textContent = `Grupo ${state.groupIndex + 1} de ${alphabetGroups.length}`;
  const hasTarget = Boolean(state.target);
  const nextLetter = state.target[state.letters.length];
  elements.callout.classList.toggle('is-guided', hasTarget && Boolean(nextLetter));
  elements.findLetter.hidden = !hasTarget || !nextLetter;

  if (hasTarget && !nextLetter) {
    elements.calloutText.textContent = '¡Palabra completa! Muy bien hecho.';
    elements.callout.classList.add('is-guided');
  } else if (hasTarget) {
    elements.calloutText.textContent = `La siguiente letra es ${nextLetter.toLocaleUpperCase('es')}. Búscala en el tablero.`;
  } else if (state.letters.length) {
    elements.calloutText.textContent = '¡Buen comienzo! Sigue eligiendo las letras de tu palabra.';
    elements.callout.classList.remove('is-guided');
  } else {
    elements.calloutText.textContent = 'Toca una letra para empezar a formar tu palabra.';
    elements.callout.classList.remove('is-guided');
  }
}

function renderWord() {
  elements.wordTrack.replaceChildren();
  if (!state.letters.length) {
    const placeholder = document.createElement('span');
    placeholder.className = 'empty-track';
    placeholder.textContent = 'Las letras que elijas aparecerán aquí';
    elements.wordTrack.append(placeholder);
  } else {
    state.letters.forEach((letter, index) => {
      const chip = document.createElement('span');
      chip.className = `letter-chip${index === state.letters.length - 1 ? ' latest' : ''}`;
      chip.textContent = letter;
      chip.setAttribute('aria-label', `Letra ${index + 1}: ${letter}`);
      elements.wordTrack.append(chip);
    });
  }

  const total = state.target.length;
  const completed = state.letters.length;
  elements.progressLabel.textContent = total
    ? `${completed} de ${total} letras`
    : `${completed} ${completed === 1 ? 'letra' : 'letras'}`;
  elements.progressBar.style.width = total ? `${Math.min((completed / total) * 100, 100)}%` : '0%';
  elements.undo.disabled = completed === 0;
  elements.input.value = state.target || state.letters.join('').toLocaleLowerCase('es');
  elements.clearInput.hidden = !state.target;
  renderGrid();
}

function selectLetter(letter) {
  const expected = state.target[state.letters.length];
  if (state.target && !expected) {
    showToast('¡Ya completaste esa palabra! Puedes reiniciar para empezar otra.');
    return;
  }
  if (expected && normalize(expected) !== normalize(letter)) {
    showToast(`Busca la letra ${expected.toLocaleUpperCase('es')} en otro grupo.`);
    return;
  }

  state.letters.push(letter);
  renderWord();
  if (state.target && state.letters.length === state.target.length) {
    showToast('¡Palabra completa! ¡Lo hiciste genial!');
  } else if (!state.target) {
    renderSuggestions(state.letters.join(''));
  }
}

function moveGroup(direction) {
  state.groupIndex = (state.groupIndex + direction + alphabetGroups.length) % alphabetGroups.length;
  renderGrid();
}

function findNextLetter() {
  const nextLetter = state.target[state.letters.length];
  if (!nextLetter) return;
  const letterIndex = alphabetGroups.findIndex((group) => group.some((letter) => normalize(letter) === normalize(nextLetter)));
  if (letterIndex >= 0) {
    state.groupIndex = letterIndex;
    renderGrid();
  }
}

function renderSuggestions(query) {
  elements.suggestions.replaceChildren();
  const cleanQuery = normalize(query.trim());
  if (!cleanQuery) {
    elements.suggestions.hidden = true;
    return;
  }

  const matches = wordBank
    .filter((word) => normalize(word).startsWith(cleanQuery) && normalize(word) !== cleanQuery)
    .slice(0, 5);
  if (!matches.length) {
    elements.suggestions.hidden = true;
    return;
  }

  matches.forEach((word) => {
    const item = document.createElement('li');
    item.setAttribute('role', 'option');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-option';
    const wordLabel = document.createElement('span');
    wordLabel.className = 'suggestion-word';
    wordLabel.textContent = word;
    const hint = document.createElement('span');
    hint.className = 'suggestion-hint';
    hint.textContent = 'usar palabra →';
    button.append(wordLabel, hint);
    button.addEventListener('click', () => chooseTarget(word));
    item.append(button);
    elements.suggestions.append(item);
  });
  elements.suggestions.hidden = false;
}

function chooseTarget(word) {
  state.target = word.toLocaleLowerCase('es');
  state.letters = [];
  elements.suggestions.hidden = true;
  findNextLetter();
  renderWord();
  showToast(`Listo: vamos a formar «${state.target}».`);
}

function submitTypedWord() {
  const word = elements.input.value.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  if (!word) return;
  if (/[^a-záéíóúüñ\s]/i.test(word)) {
    showToast('Usa letras para escribir tu palabra.');
    return;
  }
  state.target = word;
  state.letters = [];
  elements.suggestions.hidden = true;
  findNextLetter();
  renderWord();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2300);
}

function resetBoard() {
  state.letters = [];
  state.target = '';
  state.groupIndex = 0;
  elements.suggestions.hidden = true;
  renderWord();
  elements.input.focus();
}

function undoLetter() {
  if (!state.letters.length) return;
  state.letters.pop();
  renderWord();
}

elements.input.addEventListener('input', () => {
  elements.clearInput.hidden = elements.input.value.length === 0;
  renderSuggestions(elements.input.value);
});
elements.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const firstSuggestion = elements.suggestions.querySelector('button');
    if (firstSuggestion && !elements.suggestions.hidden) firstSuggestion.click();
    else submitTypedWord();
  }
  if (event.key === 'Escape') elements.suggestions.hidden = true;
});
elements.input.addEventListener('blur', () => {
  window.setTimeout(() => { elements.suggestions.hidden = true; }, 140);
});
elements.clearInput.addEventListener('click', () => {
  elements.input.value = '';
  elements.input.focus();
  renderSuggestions('');
  elements.clearInput.hidden = true;
});
elements.nextSet.addEventListener('click', () => moveGroup(1));
elements.findLetter.addEventListener('click', findNextLetter);
elements.undo.addEventListener('click', undoLetter);
elements.reset.addEventListener('click', resetBoard);
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return;
  if (event.key === 'ArrowRight') moveGroup(1);
  if (event.key === 'ArrowLeft') moveGroup(-1);
});

renderWord();
