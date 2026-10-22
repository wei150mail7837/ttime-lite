import { ElectronAPI } from '@electron-toolkit/preload'

declare global {

  interface api {
    updateTranslateShortcutKeyEvent
    getSystemTypeEvent
    closeSetWinEvent
    autoLaunchEvent
    updateTranslateServiceNotify
    apiUniteTranslateCheck
    apiCheckTranslateCallbackEvent
    apiUniteAgentCheck
    apiUniteAgentCheckCallbackEvent
    apiUniteOcrCheck
    apiCheckOcrCallbackEvent
    getVersionEvent
    alwaysOnTopAllowEscStatusNotify
    openDirectoryDialog
    openDirectoryDialogCallback
    updateConfigInfoPath
    setWinFocusEvent
    hideTrayIconStatusNotify
    winFontSizeNotify
    winShowEvent
  }

  interface Window {
    electron: ElectronAPI
    api: api
  }

}
