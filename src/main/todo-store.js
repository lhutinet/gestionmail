const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app } = require('electron');

function todoPaths() {
  const directory = app.getPath('userData');
  return {
    json: path.join(directory, 'todos.json'),
    markdown: path.join(directory, 'TODO.md')
  };
}

function initialTodos() {
  const titles = [
    ['Brouillons automatiques et protection contre la fermeture', 'Rédaction', 'high'],
    ['Conserver les messages envoyés', 'Messagerie', 'high'],
    ['Sélection et actions multiples sur les mails', 'Messagerie', 'high'],
    ['Recherche globale dans tous les comptes et dossiers locaux', 'Recherche', 'high'],
    ['Annulation, doublons et suppression récursive des dossiers locaux', 'Stockage local', 'normal'],
    ['Importer, exporter et fusionner les contacts', 'Contacts', 'normal'],
    ['Signatures, images et modèles de messages', 'Rédaction', 'normal'],
    ['Règles de tri automatique des messages', 'Automatisation', 'high']
  ];
  const now = new Date().toISOString();
  return titles.map(([title, category, priority]) => ({
    id: randomUUID(), title, category, priority, done: true, createdAt: now, updatedAt: now
  }));
}

function normaliseTodo(todo, existing = null) {
  const title = String(todo?.title || '').trim();
  if (!title) throw new Error('Le titre de la tâche est obligatoire.');
  if (title.length > 240) throw new Error('Le titre de la tâche est trop long.');
  const now = new Date().toISOString();
  return {
    id: existing?.id || String(todo.id || randomUUID()),
    title,
    category: String(todo.category || 'Général').trim().slice(0, 80) || 'Général',
    priority: ['low', 'normal', 'high'].includes(todo.priority) ? todo.priority : 'normal',
    done: Boolean(todo.done),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

function writeTodos(todos) {
  const paths = todoPaths();
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  const temporaryPath = `${paths.json}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(todos, null, 2), 'utf8');
  fs.renameSync(temporaryPath, paths.json);
  const open = todos.filter((todo) => !todo.done).length;
  const lines = [
    '# TODO GestionMail', '',
    `Total : ${todos.length} — Ouvertes : ${open} — Terminées : ${todos.length - open}`, ''
  ];
  for (const todo of todos) {
    lines.push(`- [${todo.done ? 'x' : ' '}] **${todo.category}** — ${todo.title} (${todo.priority})`);
  }
  fs.writeFileSync(paths.markdown, `${lines.join('\n')}\n`, 'utf8');
  return todos;
}

function listTodos() {
  const paths = todoPaths();
  try {
    const parsed = JSON.parse(fs.readFileSync(paths.json, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('Format invalide');
    return parsed.map((todo) => normaliseTodo(todo, todo));
  } catch {
    return writeTodos(initialTodos());
  }
}

function saveTodo(todo) {
  const todos = listTodos();
  const index = todos.findIndex((item) => item.id === todo?.id);
  const saved = normaliseTodo(todo, index >= 0 ? todos[index] : null);
  if (index >= 0) todos[index] = saved;
  else todos.push(saved);
  writeTodos(todos);
  return saved;
}

function deleteTodo(todoId) {
  const todos = listTodos();
  const remaining = todos.filter((todo) => todo.id !== String(todoId));
  if (remaining.length === todos.length) throw new Error('Tâche introuvable.');
  writeTodos(remaining);
  return { deleted: true };
}

module.exports = { deleteTodo, listTodos, saveTodo };
