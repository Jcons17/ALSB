const alphabetGroups = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'Ñ', 'O', 'P', 'Q'],
  ['R', 'S', 'T', 'U', 'V', 'W'],
  ['X', 'Y', 'Z', 'A', 'E', 'O'],
];

const priorityWords = [
  'me duele', 'me gusta', 'me gusta mucho', 'me siento bien', 'me siento mal',
  'me siento triste', 'me siento feliz', 'me da miedo', 'me molesta', 'me da frío', 'me da calor',
  'agua', 'ayuda', 'abrir', 'adiós', 'ahora', 'amigo', 'amor', 'baño', 'bien', 'casa',
  'comer', 'descanso', 'dolor', 'espera', 'estoy', 'familia', 'feliz', 'gracias', 'hambre',
  'hola', 'jugar', 'leche', 'libro', 'mamá', 'más', 'menos', 'música', 'necesito', 'no',
  'ñandú', 'papá', 'parar', 'por favor', 'quiero', 'sí', 'sed', 'tengo', 'terminé', 'vamos',
  'amiga', 'calor', 'frío', 'medicina', 'miedo', 'escuela',
  'quiero agua', 'quiero comer', 'quiero descansar',
  'quiero ir al baño', 'necesito ayuda', 'no quiero', 'tengo frío', 'tengo calor',
  'tengo sed', 'tengo hambre', 'ayúdame', 'otra vez', 'ya terminé', 'estoy cansado',
];

const wordBank = [...new Set([...priorityWords, ...(window.spanishDictionary || [])])];

const elements = {
  grid: document.querySelector('#letter-grid'),
  setLabel: document.querySelector('#set-label'),
  message: document.querySelector('#word-track'),
  suggestions: document.querySelector('#suggestion-row'),
  clear: document.querySelector('#reset-button'),
  undo: document.querySelector('#undo-button'),
  space: document.querySelector('#space-button'),
  next: document.querySelector('#next-set-button'),
  previous: document.querySelector('#previous-set-button'),
  phrasesDialog: document.querySelector('#quick-phrases-dialog'),
  openPhrases: document.querySelector('#open-phrases-button'),
  closePhrases: document.querySelector('#close-phrases-button'),
  toast: document.querySelector('#toast'),
};

const state = {
  groupIndex: 0,
  message: '',
  toastTimer: null,
};

function normalize(value) {
  return value
    .toLocaleUpperCase('es')
    .replace(/Ñ/g, '§')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/§/g, 'Ñ');
}

function saveMessage() {
  try {
    localStorage.setItem('letterLoopMessage', state.message);
  } catch {
    // The board still works when browser storage is unavailable.
  }
}

function renderGrid() {
  elements.grid.replaceChildren();
  alphabetGroups[state.groupIndex].forEach((letter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'letter-button';
    button.textContent = letter;
    const repeatedVowel = state.groupIndex === alphabetGroups.length - 1 && ['A', 'E', 'O'].includes(letter);
    button.setAttribute('aria-label', `Añadir letra ${letter}${repeatedVowel ? ', vocal frecuente' : ''}`);
    button.addEventListener('click', () => addText(letter.toLocaleLowerCase('es')));
    elements.grid.append(button);
  });
  elements.setLabel.textContent = `${state.groupIndex + 1} / ${alphabetGroups.length}`;
  elements.previous.disabled = state.groupIndex === 0;
  elements.next.disabled = state.groupIndex === alphabetGroups.length - 1;
}

function currentWordStart() {
  const match = state.message.match(/[a-záéíóúüñ]+$/i);
  return match ? state.message.length - match[0].length : state.message.length;
}

function renderSuggestions() {
  elements.suggestions.replaceChildren();
  const start = currentWordStart();
  const prefix = state.message.slice(start);
  if (prefix.length < 2 || /\s/.test(prefix)) {
    elements.suggestions.hidden = true;
    return;
  }

  const cleanPrefix = normalize(prefix);
  const matches = wordBank.filter((word) => {
    const cleanWord = normalize(word);
    return cleanWord.startsWith(cleanPrefix) && cleanWord !== cleanPrefix;
  }).slice(0, 9);

  if (!matches.length) {
    elements.suggestions.hidden = true;
    return;
  }

  matches.forEach((word) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-button';
    button.setAttribute('aria-label', `Completar palabra: ${word}`);
    button.textContent = word;
    button.addEventListener('click', () => {
      state.message = `${state.message.slice(0, start)}${word}`;
      renderMessage();
      showToast(`Palabra añadida: ${word}`);
    });
    elements.suggestions.append(button);
  });
  elements.suggestions.hidden = false;
}

function renderMessage() {
  elements.message.textContent = state.message || 'Tu mensaje aparecerá aquí.';
  elements.message.classList.toggle('is-empty', !state.message);
  elements.undo.disabled = !state.message;
  elements.clear.disabled = !state.message;
  elements.space.disabled = !state.message || /\s$/.test(state.message);
  document.querySelectorAll('.punctuation-control').forEach((button) => {
    button.disabled = !state.message.trim();
  });
  saveMessage();
  renderSuggestions();
}

function addText(text) {
  state.message += text;
  renderMessage();
}

function addSpace() {
  if (!state.message || /\s$/.test(state.message)) return;
  state.message += ' ';
  renderMessage();
}

function addPunctuation(character) {
  if (!state.message.trim()) return;
  state.message = `${state.message.trimEnd()}${character} `;
  renderMessage();
}

function deleteLast() {
  state.message = Array.from(state.message).slice(0, -1).join('');
  renderMessage();
}

function changeGroup(direction) {
  const nextIndex = state.groupIndex + direction;
  if (nextIndex < 0 || nextIndex >= alphabetGroups.length) return;
  state.groupIndex = nextIndex;
  renderGrid();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2500);
}

elements.next.addEventListener('click', () => changeGroup(1));
elements.previous.addEventListener('click', () => changeGroup(-1));
elements.space.addEventListener('click', addSpace);
elements.undo.addEventListener('click', deleteLast);
elements.clear.addEventListener('click', () => {
  state.message = '';
  renderMessage();
});
elements.openPhrases.addEventListener('click', () => elements.phrasesDialog.showModal());
elements.closePhrases.addEventListener('click', () => elements.phrasesDialog.close());
elements.phrasesDialog.querySelectorAll('[data-phrase]').forEach((button) => {
  button.addEventListener('click', () => {
    state.message = button.dataset.phrase;
    renderMessage();
    elements.phrasesDialog.close();
    showToast('Frase añadida a tu mensaje.');
  });
});
document.querySelectorAll('.punctuation-control').forEach((button) => {
  button.addEventListener('click', () => addPunctuation(button.dataset.character));
});
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowRight') changeGroup(1);
  if (event.key === 'ArrowLeft') changeGroup(-1);
});

try {
  state.message = localStorage.getItem('letterLoopMessage') || '';
} catch {
  state.message = '';
}
renderGrid();
renderMessage();
