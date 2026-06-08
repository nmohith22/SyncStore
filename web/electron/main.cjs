const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  console.log('Spawning FastAPI backend...');
  const isDev = !app.isPackaged;
  
  // In development, we run python main.py
  // In production, we run the packaged executable syncstore-backend.exe
  const backendPath = isDev 
    ? path.join(__dirname, '../../backend/main.py')
    : path.join(process.resourcesPath, 'syncstore-backend.exe');

  if (isDev) {
    // Run python directly
    backendProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--port', '8001'], {
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
  if (backendProcess) {
    console.log('Terminating FastAPI backend...');
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
