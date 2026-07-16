const state = { data: null, readOnly: true, collapsed: new Set(JSON.parse(localStorage.getItem('collapsed') || '[]')) };
const $ = id => document.getElementById(id);
const colors = ['coral', 'blue', 'green', 'gold'];

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
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
        <span class="section-count">${remaining ? `${remaining} 项待办` : '已完成'}</span><span class="chevron">⌄</span>
      </button>
      <ul class="todo-list">${section.todos.length ? section.todos.map(todo => `<li class="todo ${todo.done ? 'done' : ''}" data-todo="${todo.id}">
        <button class="check" data-action="check" aria-label="${todo.done ? '标记为未完成' : '标记为完成'}"></button>
        <span class="todo-text">${escapeHtml(todo.text)}</span><button class="delete" data-action="delete" aria-label="删除任务">×</button>
      </li>`).join('') : '<li class="empty">这里还没有任务</li>'}</ul>
      <form class="add-row editor-only"><input name="todo" maxlength="120" placeholder="添加一项任务…" aria-label="新任务"><button>添加</button></form>
    </section>`;
  }).join('');
  const all = sections.flatMap(section => section.todos); const done = all.filter(todo => todo.done).length;
  $('leftCount').textContent = all.length - done; $('percent').textContent = all.length ? `${Math.round(done / all.length * 100)}%` : '0%';
  $('progressBar').style.width = all.length ? `${done / all.length * 100}%` : '0%';
}

async function save() {
  if (state.readOnly) return;
  try {
    const response = await fetch('/api/todos', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(state.data) });
    if (!response.ok) throw new Error((await response.json()).error);
    state.data = await response.json(); toast('已保存到 JSON');
  } catch (error) { toast(error.message || '保存失败'); }
}

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

$('addSection').addEventListener('click', () => {
  const title = prompt('分区名称'); if (!title?.trim()) return;
  state.data.sections.push({ id:uid(), title:title.trim().slice(0, 30), color:colors[state.data.sections.length % colors.length], todos:[] }); render(); save();
});

async function init() {
  $('date').textContent = new Intl.DateTimeFormat('zh-CN', { month:'long', day:'numeric', weekday:'long' }).format(new Date());
  try {
    let config = { readOnly:true }; let todos;
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('静态托管');
      config = await response.json();
      const dataResponse = await fetch('/api/todos');
      if (!dataResponse.ok) throw new Error('数据读取失败');
      todos = await dataResponse.json();
    } catch {
      const staticResponse = await fetch('./data/todos.json', { cache:'no-store' });
      if (!staticResponse.ok) throw new Error('数据读取失败');
      todos = await staticResponse.json();
      config = { readOnly:true };
    }
    state.readOnly = config.readOnly; state.data = todos;
    document.body.classList.toggle('readonly', state.readOnly); $('mode').textContent = state.readOnly ? '只读浏览' : '本地编辑'; $('readonlyNote').hidden = !state.readOnly;
    render();
  } catch { $('sections').innerHTML = '<p class="empty">清单加载失败，请稍后重试。</p>'; $('mode').textContent = '加载失败'; }
}
init();
