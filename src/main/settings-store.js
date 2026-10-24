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
    dataDirectory: patch.dataDirectory ? path.resolve(String(patch.dataDirectory)) : current.dataDirectory
  };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  const temporaryPath = `${settingsPath()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(temporaryPath, settingsPath());
  return next;
}

module.exports = { getSettings, saveSettings };

