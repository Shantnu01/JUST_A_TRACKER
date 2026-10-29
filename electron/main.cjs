const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function getLocalDistPath() {
  // In packaged app, files are at app.getAppPath()/client/dist/index.html
  // or relative to __dirname
  const candidates = [
    path.join(app.getAppPath(), 'client/dist/index.html'),
    path.join(__dirname, '../client/dist/index.html'),
    path.join(__dirname, 'client/dist/index.html')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 860,
    minHeight: 620,
    title: 'Daymark Routine Tracker',
    backgroundColor: '#0c0f17',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Disable background throttling so routine alarms and sounds ring on time even when minimized
      backgroundThrottling: false,
      webSecurity: false
    }
  });

  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const distPath = getLocalDistPath();

  if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(distPath).catch(err => {
        console.error('Failed to load local HTML in dev fallback:', err);
      });
    });
  } else {
    // Packaged production app: load bundled client HTML directly
    mainWindow.loadFile(distPath).catch(err => {
      console.error('Failed to load bundled HTML file:', err, distPath);
      // Fallback to live web URL if local load fails
      mainWindow.loadURL('https://just-a-tracker.onrender.com').catch(urlErr => {
        dialog.showErrorBox(
          'Daymark Loading Error',
          `Could not load local application bundle at:\n${distPath}\n\nError: ${err.message}`
        );
      });
    });
  }

  // Ensure window is shown even if ready-to-show takes time
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 2500);

  // Open external links (e.g. GitHub, external docs) in the system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock so multiple copies of the desktop app don't conflict
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
