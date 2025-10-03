const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {

	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			plugins: true, 
			contextIsolation: false,
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			enableRemoteModule: true,
			backgroundThrottling: false,
			nativeWindowOpen: false,
		},
	})

	win.loadFile('../index.html');

	// Open the DevTools.
	// win.webContents.openDevTools()
}

app.whenReady().then(() => {

	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})