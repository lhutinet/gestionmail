const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app } = require('electron');

function todoPaths(localDirectory = '') {
  const directory = localDirectory ? path.resolve(String(localDirectory)) : app.getPath('userData');
  return {
    json: path.join(directory, 'todos.json'),
    markdown: path.join(directory, 'TODO.md')
  };
}

function migrationStatePath() {
  return path.join(app.getPath('userData'), 'todo-migrations.json');
}

function migrationKey(directory) {
  return path.resolve(directory).toLocaleLowerCase('fr');
}

function readMigrationState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(migrationStatePath(), 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function markMigrationComplete(directory) {
  const state = readMigrationState();
  state[migrationKey(directory)] = new Date().toISOString();
  const filename = migrationStatePath();
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(state, null, 2), 'utf8');
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

function writeTodos(todos, localDirectory = '') {
  const paths = todoPaths(localDirectory);
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  const temporaryPath = `${paths.json}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(todos, null, 2), 'utf8');
  fs.renameSync(temporaryPath, paths.json);
  const open = todos.filter((todo) => !todo.done).length;
  const lines = [
    '# TODO Monmail', '',
    `Total : ${todos.length} — Ouvertes : ${open} — Terminées : ${todos.length - open}`, ''
  ];
  for (const todo of todos) {
    lines.push(`- [${todo.done ? 'x' : ' '}] **${todo.category}** — ${todo.title} (${todo.priority})`);
  }
  fs.writeFileSync(paths.markdown, `${lines.join('\n')}\n`, 'utf8');
  return todos;
}

function readTodoFile(filename) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('Format invalide');
    return parsed.map((todo) => ({
      ...normaliseTodo(todo, todo),
      updatedAt: todo.updatedAt || new Date().toISOString()
    }));
  } catch {
    return null;
  }
}

function mergeTodos(current, legacy) {
  const merged = [...current];
  const identities = new Map();
  const identity = (todo) => `${String(todo.title).trim().toLocaleLowerCase('fr')}\u0000${String(todo.category).trim().toLocaleLowerCase('fr')}`;
  merged.forEach((todo, index) => {
    identities.set(`id:${todo.id}`, index);
    identities.set(`text:${identity(todo)}`, index);
  });
  for (const todo of legacy) {
    const index = identities.get(`id:${todo.id}`) ?? identities.get(`text:${identity(todo)}`);
    if (index === undefined) {
      identities.set(`id:${todo.id}`, merged.length);
      identities.set(`text:${identity(todo)}`, merged.length);
      merged.push(todo);
    } else if (String(todo.updatedAt || '') > String(merged[index].updatedAt || '')) {
      merged[index] = { ...todo, id: merged[index].id };
    }
  }
  return merged;
}

function listTodos(localDirectory = '') {
  const paths = todoPaths(localDirectory);
  let todos = readTodoFile(paths.json);
  const legacyPaths = todoPaths();
  const usesSharedDirectory = path.resolve(paths.json) !== path.resolve(legacyPaths.json);
  if (usesSharedDirectory && !readMigrationState()[migrationKey(path.dirname(paths.json))]) {
    const legacyTodos = readTodoFile(legacyPaths.json);
    if (legacyTodos?.length) todos = mergeTodos(todos || [], legacyTodos);
    markMigrationComplete(path.dirname(paths.json));
    if (todos) return writeTodos(todos, localDirectory);
  }
  if (todos) return todos;
  return writeTodos(initialTodos(), localDirectory);
}

function saveTodo(todo, localDirectory = '') {
  const todos = listTodos(localDirectory);
  const index = todos.findIndex((item) => item.id === todo?.id);
  const saved = normaliseTodo(todo, index >= 0 ? todos[index] : null);
  if (index >= 0) todos[index] = saved;
  else todos.push(saved);
  writeTodos(todos, localDirectory);
  return saved;
}

function deleteTodo(todoId, localDirectory = '') {
  const todos = listTodos(localDirectory);
  const remaining = todos.filter((todo) => todo.id !== String(todoId));
  if (remaining.length === todos.length) throw new Error('Tâche introuvable.');
  writeTodos(remaining, localDirectory);
  return { deleted: true };
}

module.exports = { deleteTodo, listTodos, saveTodo };
