process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = "true";
import * as electron from 'electron';
import { app, BrowserWindow, Menu } from 'electron';
import { AppMenu } from './menu';

class MyApplication {
	mainWindow: Electron.BrowserWindow = null;

	constructor(public app: Electron.App){
		this.app.on('window-all-closed', this.onWindowAllClosed);
		this.app.on('ready', this.onReady);
	}

	onWindowAllClosed(){
		if(process.platform != 'darwin'){
			app.quit();
		}
	}

	onReady(){
		this.mainWindow = new BrowserWindow({
			width: 1024,
			height: 805,
			minWidth: 1024,
			maxHeight: 805,
			minHeight: 805,
			maxWidth: 1024,
			acceptFirstMouse: true,
			webPreferences: {
				webSecurity: false,
				nodeIntegration: true
			},
		});

		// this.mainWindow.webContents.openDevTools();
		this.mainWindow.loadURL('file://' + __dirname + '/index.html');

		this.mainWindow.on('closed', () => {
			this.mainWindow = null;
		});
		Menu.setApplicationMenu(AppMenu);
	}
}

const myapp = new MyApplication(app);