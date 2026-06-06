import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import * as moment from 'moment';
import * as path from 'path';

/**
 * 幫助類
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class Utils {
  @Inject()
  baseDir;

  /**
   * 獲得dist路徑
   */
  getDistPath() {
    const runPath = __dirname;
    const distIndex =
      runPath.lastIndexOf('/dist/') !== -1
        ? runPath.lastIndexOf('/dist/')
        : runPath.lastIndexOf('\\dist\\');
    if (distIndex !== -1) {
      return path.join(runPath.substring(0, distIndex), 'dist');
    }
    return path.join(runPath, 'dist');
  }

  /**
   * 獲得請求IP
   */
  async getReqIP(ctx: Context) {
    const req = ctx.req;
    return (
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress?.replace('::ffff:', '') ||
      ''
    );
  }

  /**
   * 去除物件的空值屬性
   * @param obj
   */
  async removeEmptyP(obj) {
    Object.keys(obj).forEach(key => {
      if (obj[key] === null || obj[key] === '' || obj[key] === 'undefined') {
        delete obj[key];
      }
    });
  }

  /**
   * 執行緒阻塞毫秒數
   * @param ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 獲得最近幾天的日期集合
   * @param recently
   */
  getRecentlyDates(recently, format = 'YYYY-MM-DD') {
    moment.locale('zh-tw');
    const dates = [];
    for (let i = 0; i < recently; i++) {
      dates.push(moment().subtract(i, 'days').format(format));
    }
    return dates.reverse();
  }
  /**
   * 獲得最近幾個月的月數
   * @param recently
   */
  getRecentlyMonths(recently, format = 'YYYY-MM') {
    moment.locale('zh-tw');
    const dates = [];
    const date = moment(Date.now()).format('YYYY-MM');
    for (let i = 0; i < recently; i++) {
      dates.push(moment(date).subtract(i, 'months').format(format));
    }
    return dates.reverse();
  }

  /**
   * 根據開始和結束時間，獲得時間段內的日期集合
   * @param start
   * @param end
   */
  getBetweenDays(start, end, format = 'YYYY-MM-DD') {
    moment.locale('zh-tw');
    const dates = [];
    const startTime = moment(start).format(format);
    const endTime = moment(end).format(format);
    const days = moment(endTime).diff(moment(startTime), 'days');
    for (let i = 0; i <= days; i++) {
      dates.push(moment(startTime).add(i, 'days').format(format));
    }
    return dates;
  }

  /**
   * 根據開始和結束時間，獲得時間段內的月份集合
   * @param start
   * @param end
   */
  getBetweenMonths(start, end, format = 'YYYY-MM') {
    moment.locale('zh-tw');
    const dates = [];
    const startTime = moment(start).format(format);
    const endTime = moment(end).format(format);
    const months = moment(endTime).diff(moment(startTime), 'months');
    for (let i = 0; i <= months; i++) {
      dates.push(moment(startTime).add(i, 'months').format(format));
    }
    return dates;
  }

  /**
   * 根據開始和結束時間，獲得時間段內的小時集合
   * @param start
   * @param end
   */
  getBetweenHours(start, end, format = 'YYYY-MM-DD HH') {
    moment.locale('zh-tw');
    const dates = [];
    const startTime = moment(start).format(format);
    const endTime = moment(end).format(format);
    const hours = moment(endTime).diff(moment(startTime), 'hours');
    for (let i = 0; i <= hours; i++) {
      dates.push(moment(startTime).add(i, 'hours').format(format));
    }
    return dates;
  }

  /**
   * 欄位轉駝峰法
   * @param obj
   * @returns
   */
  toCamelCase(obj) {
    const camelCaseObject = {};
    for (const i in obj) {
      const camelCase = i.replace(/([-_][a-z])/gi, $1 => {
        return $1.toUpperCase().replace('-', '').replace('_', '');
      });
      camelCaseObject[camelCase] = obj[i];
    }
    return camelCaseObject;
  }

  /**
   * 匹配URL
   * @param pattern
   * @param url
   * @returns
   */
  matchUrl(pattern, url) {
    // 將 pattern 和 url 按 `/` 分割
    const patternParts = pattern.split('/').filter(Boolean);
    const urlParts = url.split('/').filter(Boolean);
    // 如果長度不匹配且 pattern 不包含 **，直接返回 false
    if (patternParts.length !== urlParts.length && !pattern.includes('**')) {
      return false;
    }
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const urlPart = urlParts[i];
      // 如果 patternPart 是 **，匹配剩餘的所有部分
      if (patternPart === '**') {
        return true;
      }
      // 如果 patternPart 以 : 開頭，說明是參數，直接匹配任意非空值
      if (patternPart.startsWith(':')) {
        if (!urlPart) {
          return false;
        }
        continue;
      }
      // 如果 patternPart 是 *，匹配任意非空部分
      if (patternPart === '*') {
        if (!urlPart) {
          return false;
        }
      } else if (patternPart !== urlPart) {
        return false;
      }
    }
    // 如果 pattern 和 url 的部分數量一致，則匹配成功
    return patternParts.length === urlParts.length;
  }

  /**
   * 從文本中提取 JSON 字串並轉換為物件
   * @param {string} text - 可能包含 JSON 的文本
   * @returns {Object|Array|null} - 解析出的 JSON 物件，如果沒有找到有效 JSON 則返回 null
   */
  extractJSONFromText(text) {
    if (!text || typeof text !== 'string') {
      return null;
    }

    try {
      // 嘗試直接解析整個文本
      return JSON.parse(text);
    } catch (e) {
      // 整個文本不是有效的 JSON，嘗試提取 JSON 部分
    }

    // 查詢可能的 JSON 開始位置（{ 或 [）
    const possibleStarts = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{' || text[i] === '[') {
        possibleStarts.push(i);
      }
    }

    // 從每個可能的起始位置嘗試提取 JSON
    for (const startIndex of possibleStarts) {
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = startIndex; i < text.length; i++) {
        const char = text[i];

        // 處理跳脫字元
        if (inString && !escapeNext && char === '\\') {
          escapeNext = true;
          continue;
        }

        // 處理字串邊界
        if (!escapeNext && char === '"') {
          inString = !inString;
        }

        if (!inString) {
          // 只在不在字串內部時才計算括號
          if (char === '{') openBraces++;
          else if (char === '}') openBraces--;
          else if (char === '[') openBrackets++;
          else if (char === ']') openBrackets--;
        }

        escapeNext = false;

        // 檢查是否找到了完整的 JSON 結構
        if (
          (openBraces === 0 && text[startIndex] === '{' && char === '}') ||
          (openBrackets === 0 && text[startIndex] === '[' && char === ']')
        ) {
          const jsonStr = text.substring(startIndex, i + 1);
          try {
            const result = JSON.parse(jsonStr);
            return result;
          } catch (e) {
            // 這個候選 JSON 無效，繼續嘗試下一個
            break;
          }
        }
      }
    }

    return null; // 沒有找到有效的 JSON
  }
}
