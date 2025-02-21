/*
Wrapper: Offline
License: MIT
*/
// assign config and env.json stuff to process.env
const env = Object.assign(process.env, require("./env"), require("./config"));
const { app, BrowserWindow, Menu } = require("electron");
const fs = require("fs");
const path = require("path");
const assets = path.join(__dirname, env.ASSET_FOLDER);
const cache = path.join(__dirname, env.CACHÉ_FOLDER);
const logs = path.join(__dirname, env.LOG_FOLDER);
const saved = path.join(__dirname, env.SAVED_FOLDER);

/*
initialization
*/
// create directories if they're missing
if (!fs.existsSync(assets)) fs.mkdirSync(assets);
if (!fs.existsSync(cache)) fs.mkdirSync(cache);
if (!fs.existsSync(logs)) fs.mkdirSync(logs);
if (!fs.existsSync(saved)) fs.mkdirSync(saved);
const settings = (new (require("./data/database"))(true)).select();
const server = require("./wrapper/server");
server();

/*
log files
*/
if (settings.SAVE_LOG_FILES) {
	const filePath = path.join(logs, new Date().valueOf() + ".txt");
	const writeStream = fs.createWriteStream(filePath);
	console.log = console.error = function (c) {
		writeStream.write(c + "\n");
		process.stdout.write(c + "\n");
	};
	process.on("exit", () => {
		console.log("Exiting...");
		writeStream.close();
	});
}

/*
load flash player
*/
let pluginName;
switch (process.platform) {
	case "win32": {
		pluginName = "./extensions/pepflashplayer.dll";
		break;
	} case "darwin": {
		pluginName = "./extensions/PepperFlashPlayer.plugin";
		break;
	} case "linux": {
		pluginName = "./extensions/libpepflashplayer.so";
		// i don't know what this does but it makes flash work
		app.commandLine.appendSwitch("no-sandbox");
		break;
	}
}
app.commandLine.appendSwitch("ppapi-flash-path", path.join(__dirname, pluginName));
app.commandLine.appendSwitch("ppapi-flash-version", "32.0.0.371");

let mainWindow;
const createWindow = () => {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 700,
		title: "Wrapper: Offline",
		icon: path.join(__dirname, "./server/favicon.ico"),
		webPreferences: {
			plugins: true,
			contextIsolation: true
		}
	});
	// use it in external scripts
	process.env.MAIN_WINDOW_ID = mainWindow.id;

	mainWindow.setAutoHideMenuBar(settings.HIDE_NAVBAR);
	Menu.setApplicationMenu(Menu.buildFromTemplate([
		{
			label: "Home",
			click: () => {
				const id = +process.env.MAIN_WINDOW_ID;
				BrowserWindow.fromId(id).loadURL("http://localhost:4343")
			}
		},
		{
			label: "View",
			submenu: [
				{ type: "separator" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ role: "resetZoom" },
				{ type: "separator" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "minimize" },
				...(process.platform == "darwin" ? [
					{ role: "front" },
					{ type: "separator" },
					{ role: "window" }
				] : [
					{ role: "close" }
				]),
			]
		},
		{
			role: "Help",
			submenu: [
				{
					label: "Discord Server",
					click: async () => {
						const { shell } = require("electron");
						await shell.openExternal("https://discord.gg/Kf7BzSw");
					}
				},
				{
					label: "GitHub",
					click: async () => {
						const { shell } = require("electron");
						await shell.openExternal("https://github.com/Wrapper-Offline/Wrapper-Offline");
					}
				}
			]
		}
	]));
	// load the video list
	mainWindow.loadURL("http://localhost:" + env.SERVER_PORT);
	mainWindow.on("closed", () => mainWindow = null);
};

app.whenReady().then(() => {
	// wait for the server
	setTimeout(createWindow, 2000);
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	if (mainWindow === null) createWindow();
});
