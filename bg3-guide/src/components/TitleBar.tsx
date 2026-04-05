import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const appWindow = getCurrentWindow();
      setIsMaximized(await appWindow.isMaximized());
    };
    checkMaximized();
  }, []);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const appWindow = getCurrentWindow();
    if (isMaximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 bg-gray-800 flex items-center justify-between select-none"
      style={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
    >
      {/* App title */}
      <div
        data-tauri-drag-region
        className="flex items-center h-full pl-3"
      >
        <span className="text-sm text-gray-300 font-medium">博德之门3 攻略工具</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          title="最小化"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          title={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? (
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 8v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth={2} />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center hover:bg-red-600 transition-colors rounded-tr-lg"
          title="关闭"
        >
          <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}