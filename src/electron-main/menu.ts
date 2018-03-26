import { app, Menu, BrowserWindow } from 'electron';

let menuTemplate:any = [{
  label: 'Edit',
  submenu: [{
    role: 'undo'
  }, {
    role: 'redo'
  }, {
    type: 'separator'
  }, {
    role: 'cut'
  }, {
    role: 'copy'
  }, {
    role: 'paste'
  }, {
    role: 'pasteandmatchstyle'
  }, {
    role: 'delete'
  }, {
    role: 'selectall'
  }]
}, {
  label: 'View',
  submenu: [{
    label: 'Reload',
    accelerator: 'CmdOrCtrl+R',
    click(item:any, focusedWindow:any) {
      if(focusedWindow) focusedWindow.reload()
    }
  }, {
    label: 'Toggle Developer Tools',
    accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
    click (item:any, focusedWindow:any) {
      if(focusedWindow) focusedWindow.webContents.toggleDevTools()
    }
  }, {
    type: 'separator'
  }, {
    role: 'resetzoom'
  }, {
    role: 'zoomin'
  }, {
    role: 'zoomout'
  }, {
    type: 'separator'
  }, {
    role: 'togglefullscreen'
  }]
}, {
  role: 'window',
  submenu: [
    { role: 'minimize' },
    { role: 'close' }
  ]
}, {
  role: 'help',
  submenu: [{
    label: 'Learn More',
    click () { require('electron').shell.openExternal('http://electron.atom.io') }
  }]
}]

if(process.platform === 'win32') {
  menuTemplate[menuTemplate.length -1].submenu.push({
    label: 'Check for Updates...',
    click(item: any, focusedWindow: any) {
      focusedWindow.webContents.send('update');
    }
  });
}

if(process.platform === 'darwin') {
  const name = 'Cisco Codec Emulator' //app.getName()
  menuTemplate.unshift({
    label: name,
    submenu: [{
      role: 'about'
    }, {
      label: 'Check for Updates...',
      click(item: any, focusedWindow: any) {
        focusedWindow.webContents.send('update');
      }
    }, {
      type: 'separator'
    }, {
      role: 'services',
      submenu: []
    }, {
      type: 'separator'
    }, {
      role: 'hide'
    }, {
      role: 'hideothers'
    }, {
      role: 'unhide'
    }, {
      type: 'separator'
    }, {
      role: 'quit'
    }]
  })
  // Edit menu.
  menuTemplate[1].submenu.push({
    type: 'separator'
  },{
    label: 'Speech',
    submenu: [{
      role: 'startspeaking'
    }, {
      role: 'stopspeaking'
    }]
  })
  // Window menu.
  menuTemplate[3].submenu = [{
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  }, {
    label: 'Minimize',
    accelerator: 'CmdOrCtrl+M',
    role: 'minimize'
  }, {
    label: 'Zoom',
    role: 'zoom'
  }, {
    type: 'separator'
  }, {
    label: 'Bring All to Front',
    role: 'front'
  }]
}

export const AppMenu = Menu.buildFromTemplate(menuTemplate)
