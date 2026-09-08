const DEVICE_DATA_KEY = 'clearlist-device-data';
const state = { data: null, onlineData: null, readOnly: true, deviceMode: false, staticHosting: false, collapsed: new Set(JSON.parse(localStorage.getItem('collapsed') || '[]')) };
const $ = id => document.getElementById(id);
const colors = ['coral', 'blue', 'green', 'gold'];

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 1800); }

function render() {
  const sections = state.data.sections;
  $('sections').innerHTML = sections.map(section => {
    const open = !state.collapsed.has(section.id);
    const remaining = section.todos.filter(todo => !todo.done).length;
    return `<section class="section ${open ? '' : 'collapsed'}" data-section="${section.id}">
      <button class="section-head" type="button" data-action="toggle" aria-expanded="${open}">
        <i class="dot ${section.color || ''}"></i><span class="section-title">${escapeHtml(section.title)}</span>
        <span class="section-count">${remaining ? `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left` : 'All done'}</span><span class="chevron">⌄</span>
      </button>
      <ul class="todo-list">${section.todos.length ? section.todos.map(todo => `<li class="todo ${todo.done ? 'done' : ''}" data-todo="${todo.id}">
        <button class="check" data-action="check" aria-label="${todo.done ? 'Mark as incomplete' : 'Mark as complete'}"></button>
        <span class="todo-text">${escapeHtml(todo.text)}</span><button class="delete" data-action="delete" aria-label="Delete task">×</button>
      </li>`).join('') : '<li class="empty">No tasks here yet</li>'}</ul>
      <form class="add-row editor-only"><input name="todo" maxlength="120" placeholder="Add a task…" aria-label="New task"><button>Add</button></form>
    </section>`;
  }).join('');
  const all = sections.flatMap(section => section.todos); const done = all.filter(todo => todo.done).length;
  $('leftCount').textContent = all.length - done; $('percent').textContent = all.length ? `${Math.round(done / all.length * 100)}%` : '0%';
  $('progressBar').style.width = all.length ? `${done / all.length * 100}%` : '0%';
}

async function save() {
  if (state.readOnly) return;
  if (state.deviceMode) {
    state.data.updatedAt = new Date().toISOString();
    localStorage.setItem(DEVICE_DATA_KEY, JSON.stringify(state.data));
    toast('Saved to this device');
    return;
  }
  try {
    const response = await fetch('/api/todos', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(state.data) });
    if (!response.ok) throw new Error((await response.json()).error);
    state.data = await response.json(); toast('Saved to JSON');
  } catch (error) { toast(error.message || 'Could not save'); }
}

function updateDeviceControls() {
  $('deviceActions').hidden = !state.staticHosting;
  $('enableDeviceEdit').hidden = state.deviceMode;
  $('exportData').hidden = !state.deviceMode;
  $('resetDevice').hidden = !state.deviceMode;
  $('deviceHint').textContent = state.deviceMode ? 'Changes are saved only in this browser and do not affect the public list.' : 'This public online list is read-only by default.';
}

$('enableDeviceEdit').addEventListener('click', () => {
  state.data = cloneData(state.onlineData);
  state.deviceMode = true; state.readOnly = false;
  localStorage.setItem(DEVICE_DATA_KEY, JSON.stringify(state.data));
  document.body.classList.remove('readonly'); $('mode').textContent = 'Editing on this device'; updateDeviceControls(); render(); toast('Device editing enabled');
});

$('resetDevice').addEventListener('click', () => {
  if (!confirm('Clear changes on this device and restore the public online list?')) return;
  localStorage.removeItem(DEVICE_DATA_KEY); state.data = cloneData(state.onlineData);
  state.deviceMode = false; state.readOnly = true;
  document.body.classList.add('readonly'); $('mode').textContent = 'Read only'; updateDeviceControls(); render(); toast('Online version restored');
});

$('exportData').addEventListener('click', () => {
  const blob = new Blob([`${JSON.stringify(state.data, null, 2)}\n`], { type:'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'todos.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0); toast('JSON exported');
});

$('sections').addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return;
  const sectionEl = event.target.closest('[data-section]'); const section = state.data.sections.find(item => item.id === sectionEl.dataset.section);
  if (action === 'toggle') { state.collapsed.has(section.id) ? state.collapsed.delete(section.id) : state.collapsed.add(section.id); localStorage.setItem('collapsed', JSON.stringify([...state.collapsed])); render(); return; }
  if (state.readOnly) return;
  const todo = section.todos.find(item => item.id === event.target.closest('[data-todo]').dataset.todo);
  if (action === 'check') todo.done = !todo.done;
  if (action === 'delete') section.todos = section.todos.filter(item => item.id !== todo.id);
  render(); save();
});

$('sections').addEventListener('submit', event => {
  event.preventDefault(); if (state.readOnly) return;
  const input = event.target.elements.todo; const text = input.value.trim(); if (!text) return;
  state.data.sections.find(item => item.id === event.target.closest('[data-section]').dataset.section).todos.push({ id:uid(), text, done:false });
  render(); save();
});

function toggleSectionComposer(open) {
  $('sectionComposer').hidden = !open;
  $('addSection').hidden = open;
  $('addSection').setAttribute('aria-expanded', String(open));
  if (open) requestAnimationFrame(() => $('sectionTitle').focus());
  else $('sectionComposer').reset();
}

$('addSection').addEventListener('click', () => toggleSectionComposer(true));
$('cancelSection').addEventListener('click', () => toggleSectionComposer(false));
$('sectionComposer').addEventListener('submit', event => {
  event.preventDefault(); if (state.readOnly) return;
  const title = event.target.elements.title.value.trim();
  if (!title) { $('sectionTitle').focus(); return; }
  state.data.sections.push({ id:uid(), title:title.slice(0, 30), color:colors[state.data.sections.length % colors.length], todos:[] });
  toggleSectionComposer(false); render(); save();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('sectionComposer').hidden) toggleSectionComposer(false);
});

async function init() {
  $('date').textContent = new Intl.DateTimeFormat('en', { month:'long', day:'numeric', weekday:'long' }).format(new Date());
  try {
    let config = { readOnly:true }; let todos;
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Static hosting');
      config = await response.json();
      const dataResponse = await fetch('/api/todos');
      if (!dataResponse.ok) throw new Error('Could not load data');
      todos = await dataResponse.json();
    } catch {
      const staticResponse = await fetch('./data/todos.json', { cache:'no-store' });
      if (!staticResponse.ok) throw new Error('Could not load data');
      todos = await staticResponse.json();
      config = { readOnly:true }; state.staticHosting = true;
    }
    state.onlineData = cloneData(todos);
    const saved = state.staticHosting ? localStorage.getItem(DEVICE_DATA_KEY) : null;
    if (saved) {
      try { state.data = JSON.parse(saved); state.deviceMode = true; state.readOnly = false; }
      catch { localStorage.removeItem(DEVICE_DATA_KEY); state.data = todos; state.readOnly = config.readOnly; }
    } else { state.readOnly = config.readOnly; state.data = todos; }
    document.body.classList.toggle('readonly', state.readOnly);
    $('mode').textContent = state.deviceMode ? 'Editing on this device' : state.readOnly ? 'Read only' : 'Local editing'; updateDeviceControls();
    render();
  } catch { $('sections').innerHTML = '<p class="empty">Could not load the list. Please try again later.</p>'; $('mode').textContent = 'Load failed'; }
}
init();
