
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "Deen-E-Islam School Management Pro",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Agar future mein use karna ho
    },
    icon: path.join(__dirname, 'public/icon.ico')
  });

  // Custom Menu (Optional: Professional look ke liye sirf print aur exit rakha hai)
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Print', accelerator: 'CmdOrCtrl+P', click: () => { win.webContents.print(); } },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Load implementation
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173' 
    : url.format({
        pathname: path.join(__dirname, 'dist/index.html'),
        protocol: 'file:',
        slashes: true
      });

  win.loadURL(startUrl);

  // Agar development hai toh dev tools khol dega
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
