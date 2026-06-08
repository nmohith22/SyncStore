const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

ipcMain.handle('get-steam-cookies', async () => {
  try {
    const cookies = await session.defaultSession.cookies.get({ url: 'https://steamcommunity.com' });
    const cookieDict = {};
    cookies.forEach(c => {
      cookieDict[c.name] = c.value;
    });
    return cookieDict;
  } catch (e) {
    console.error('Failed to get Steam cookies:', e);
    return {};
  }
});

let mainWindow;
let backendProcess;

function killBackend() {
  if (backendProcess) {
    console.log('Terminating FastAPI backend...');
    const pid = backendProcess.pid;
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.error('Failed to kill backend process tree:', err);
        }
      });
    } else {
      backendProcess.kill();
    }
    backendProcess = null;
  }
}

function startBackend() {
  console.log('Spawning FastAPI backend...');
  const isDev = !app.isPackaged;
  
  // In development, we run python main.py
  // In production, we run the packaged executable syncstore-backend.exe
  const backendPath = isDev 
    ? path.join(__dirname, '../../backend/main.py')
    : path.join(process.resourcesPath, 'syncstore-backend.exe');

  if (isDev) {
    const fs = require('fs');
    // Check if virtual environment python exists
    const venvPythonPath = path.join(__dirname, '../../backend/venv/Scripts/python.exe');
    const pythonExe = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python';
    
    console.log(`Using python executable: ${pythonExe}`);
    backendProcess = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--port', '8001'], {
      cwd: path.join(__dirname, '../../backend'),
      shell: true
    });
  } else {
    // Run compiled binary
    backendProcess = spawn(backendPath, [], {
      cwd: process.resourcesPath,
      shell: true
    });
  }

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend]: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error]: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#111111'
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startBackend();
  // Wait a short bit for backend to start before showing window
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  killBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  killBackend();
});
