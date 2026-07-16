const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dataFile = path.join(root, 'data', 'todos.json');
const port = Number(process.env.PORT) || 3000;
const readOnly = process.env.READ_ONLY === 'true' || process.env.NODE_ENV === 'production';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function validData(value) {
  return value && Array.isArray(value.sections) && value.sections.every(section =>
    typeof section.id === 'string' && typeof section.title === 'string' && Array.isArray(section.todos) &&
    section.todos.every(todo => typeof todo.id === 'string' && typeof todo.text === 'string' && typeof todo.done === 'boolean')
  );
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/config') return send(res, 200, JSON.stringify({ readOnly }));
  if (url.pathname === '/api/todos' && req.method === 'GET') {
    return fs.readFile(dataFile, (error, data) => error ? send(res, 500, JSON.stringify({ error: '读取数据失败' })) : send(res, 200, data));
  }
  if (url.pathname === '/api/todos' && req.method === 'PUT') {
    if (readOnly) return send(res, 403, JSON.stringify({ error: '在线版本为只读模式' }));
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!validData(data)) return send(res, 400, JSON.stringify({ error: '数据格式不正确' }));
        data.updatedAt = new Date().toISOString();
        const temp = `${dataFile}.tmp`;
        fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, error => {
          if (error) return send(res, 500, JSON.stringify({ error: '保存失败' }));
          fs.rename(temp, dataFile, renameError => renameError ? send(res, 500, JSON.stringify({ error: '保存失败' })) : send(res, 200, JSON.stringify(data)));
        });
      } catch { send(res, 400, JSON.stringify({ error: '无效的 JSON' })); }
    });
    return;
  }

  if (req.method !== 'GET') return send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(root, 'public', requested));
  if (!file.startsWith(path.join(root, 'public'))) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    send(res, 200, data, types[path.extname(file)] || 'application/octet-stream');
  });
});

server.listen(port, () => console.log(`Clearlist: http://localhost:${port} (${readOnly ? '只读' : '本地可编辑'})`));
