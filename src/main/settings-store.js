const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function defaults() {
  return {
    autoSyncMinutes: 0,
    notificationsEnabled: true,
    fontSize: 15,
    interfaceSkin: 'classic',
    interfaceColor: '#6ee7d2',
    cornerRadius: 9,
    backgroundImage: '',
    backgroundDim: 20,
    minimizeToTray: false,
    groupConversations: true,
    toolbarShortcuts: ['inbox', 'compose', 'sent'],
    autoUpdateEnabled: true,
    dataDirectory: app.getPath('userData')
  };
}

function getSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    return { ...defaults(), ...saved };
  } catch {
    return defaults();
  }
}

function saveSettings(patch) {
  const allowedIntervals = [0, 1, 5, 15, 30];
  const allowedFontSizes = [13, 14, 15, 16, 17];
  const allowedInterfaceSkins = ['classic', 'ocean', 'graphite', 'sand', 'neon', 'candy', 'forest'];
  const allowedToolbarShortcuts = ['inbox', 'compose', 'sent', 'drafts', 'trash', 'sync', 'contacts'];
  const current = getSettings();
  const next = {
    ...current,
    autoSyncMinutes: allowedIntervals.includes(Number(patch.autoSyncMinutes))
      ? Number(patch.autoSyncMinutes)
      : current.autoSyncMinutes,
    notificationsEnabled: patch.notificationsEnabled === undefined
      ? current.notificationsEnabled
      : Boolean(patch.notificationsEnabled),
    fontSize: allowedFontSizes.includes(Number(patch.fontSize))
      ? Number(patch.fontSize)
      : current.fontSize,
    interfaceSkin: allowedInterfaceSkins.includes(String(patch.interfaceSkin || ''))
      ? String(patch.interfaceSkin)
      : current.interfaceSkin,
    interfaceColor: /^#[0-9a-f]{6}$/i.test(String(patch.interfaceColor || ''))
      ? String(patch.interfaceColor).toLowerCase()
      : current.interfaceColor,
    cornerRadius: Number.isInteger(Number(patch.cornerRadius)) && Number(patch.cornerRadius) >= 4 && Number(patch.cornerRadius) <= 28
      ? Number(patch.cornerRadius)
      : current.cornerRadius,
    backgroundImage: patch.backgroundImage === undefined
      ? current.backgroundImage
      : (/^background\.(?:png|jpe?g|webp|gif)$/i.test(String(patch.backgroundImage || '')) ? String(patch.backgroundImage) : ''),
    backgroundDim: Number.isInteger(Number(patch.backgroundDim)) && Number(patch.backgroundDim) >= 0 && Number(patch.backgroundDim) <= 70
      ? Number(patch.backgroundDim)
      : current.backgroundDim,
    minimizeToTray: patch.minimizeToTray === undefined
      ? current.minimizeToTray
      : Boolean(patch.minimizeToTray),
    groupConversations: patch.groupConversations === undefined
      ? current.groupConversations
      : Boolean(patch.groupConversations),
    toolbarShortcuts: patch.toolbarShortcuts === undefined
      ? current.toolbarShortcuts
      : [...new Set(Array.isArray(patch.toolbarShortcuts) ? patch.toolbarShortcuts : [])]
        .filter((shortcut) => allowedToolbarShortcuts.includes(String(shortcut))),
    autoUpdateEnabled: patch.autoUpdateEnabled === undefined
      ? current.autoUpdateEnabled
      : Boolean(patch.autoUpdateEnabled),
    dataDirectory: patch.dataDirectory ? path.resolve(String(patch.dataDirectory)) : current.dataDirectory
  };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  const temporaryPath = `${settingsPath()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(temporaryPath, settingsPath());
  return next;
}

module.exports = { getSettings, saveSettings };

