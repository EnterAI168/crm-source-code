import { execSync } from 'child_process';

/**
 * 同步檢查埠是否可用（通過系統命令）
 * @param {number} port - 要檢查的埠
 * @returns {boolean} - 是否可用
 */
function isPortAvailableSync(port: number): boolean {
  try {
    if (process.platform === 'win32') {
      // Windows 使用 netstat 檢查埠，排除 TIME_WAIT 狀態
      const result = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf-8',
      });
      // 如果埠只處於 TIME_WAIT 狀態，則認為埠可用
      return !result || result.toLowerCase().includes('time_wait');
    } else {
      // Linux/Mac 使用 lsof 檢查埠，只檢查 LISTEN 狀態
      const result = execSync(`lsof -i :${port} -sTCP:LISTEN`, {
        encoding: 'utf-8',
      });
      return !result;
    }
  } catch (error) {
    // 命令執行失敗，埠可用
    return true;
  }
}

/**
 * 查詢可用埠（同步）
 * @param {number} startPort - 起始埠
 * @returns {number} - 可用的埠
 */
export function availablePort(startPort: number): number {
  if (!process['pkg']) return startPort;
  let port = startPort;
  while (port <= 8010) {
    if (isPortAvailableSync(port)) {
      if (port !== startPort) {
        console.warn(
          '\x1b[33m%s\x1b[0m',
          `Port ${startPort} is occupied, using port ${port}`
        );
      }
      return port;
    }
    port++;
  }
  return 8001;
}
