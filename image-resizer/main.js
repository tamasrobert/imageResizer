const path = require('path');
const os = require('os');
const fs = require('fs');
const ResizeImg = require('resize-img');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Image Resizer',
        width: isDev ? 1000 : 500,
        height: 600,
        webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                    nodeIntegration: true
                }
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        width: 300,
        height: 300
    });

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

app.whenReady().then(() => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('closed', () => {
        mainWindow = null;
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

const menu = [
    ...(isMac 
        ? [
            {
                label: app.name,
                submenu: [
                    {
                        label: 'About',
                        click: createAboutWindow
                    }
                ]
            }
        ]
        : []),
    {
        role: 'fileMenu',
    },
    ...(!isMac ? [{
        label: 'Help',
        submenu: [
                    {
                        label: 'About',
                        click: createAboutWindow
                    }
                ]
    }] : []),
];

ipcMain.on('image:resize', (event, options) => {
    options.dest = path.join(os.homedir(), 'imageResizer');
    resizeImage(options);
})

async function resizeImage({imgPath, width, height, dest}) {
    try {
        const newPath = await ResizeImg(fs.readFileSync(imgPath), {
            width: +width,
            height: +height,
        });

        const filename = path.basename(imgPath);

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }

        fs.writeFileSync(path.join(dest, filename), newPath);

        mainWindow.webContents.send('image:done');

        shell.openPath(dest);
    } catch (error) {
        console.log(error);
    }
}

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});