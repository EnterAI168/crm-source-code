/**
 * 在「報價單管理」下補充操作按鈕許可權。
 * 已存在相同 perms 則更新名稱和排序。
 *
 * 用法：在 cool-admin-midway 目錄執行
 *   node scripts/append-quote-order-action-menus.mjs
 */

import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

const ROWS = [
  [2, '新增報價單', 'crm:quoteOrder:add'],
  [5, '檢視報價單', 'crm:quoteOrder:info'],
  [6, '申請審核', 'crm:quoteOrder:submitAudit'],
  [14, '歷史記錄', 'crm:quoteOrder:history'],
  [15, '報價單PDF下載', 'crm:quoteOrder:downloadPdf'],
  [16, '成本核算', 'crm:quoteOrder:departmentCost'],
];

function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    const [[menu]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 1 LIMIT 1',
      ['/crm/quote/list']
    );
    if (!menu) {
      console.error('未找到「報價單管理」選單 (router=/crm/quote/list, type=1)。');
      process.exitCode = 1;
      return;
    }

    const t = nowStr();
    let changed = 0;
    for (const [orderNum, name, perms] of ROWS) {
      const [[existing]] = await conn.query(
        'SELECT id FROM base_sys_menu WHERE parentId = ? AND perms = ? LIMIT 1',
        [menu.id, perms]
      );

      if (existing) {
        await conn.query(
          'UPDATE base_sys_menu SET name = ?, orderNum = ?, updateTime = ? WHERE id = ?',
          [name, orderNum, t, existing.id]
        );
        console.log('已更新: %s (%s)', name, perms);
      } else {
        await conn.query(
          `INSERT INTO base_sys_menu
            (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
           VALUES (?, ?, NULL, ?, ?, NULL, ?, 2, NULL, ?, NULL, 0, 0)`,
          [t, t, menu.id, name, perms, orderNum]
        );
        console.log('已寫入: %s (%s)', name, perms);
      }
      changed++;
    }

    console.log(`報價單管理按鈕許可權同步完成，共處理 ${changed} 條。`);
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exitCode = 1;
});
