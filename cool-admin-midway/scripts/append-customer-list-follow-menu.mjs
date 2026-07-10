/**
 * 在「客戶列表」選單下補充「跟進記錄」按鈕權限（crm:customerList:follow）。
 * 適用於選單已存在但庫中缺少該子權限的情況（initMenu 不會自動補全子節點）。
 *
 * 用法（在 cool-admin-midway 目錄）：
 *   node scripts/append-customer-list-follow-menu.mjs
 *
 * 環境變數：MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE
 */

import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

const PERMS = 'crm:customerList:follow';

function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    const [[listMenu]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 1 LIMIT 1',
      ['/crm/customer/list']
    );
    if (!listMenu) {
      console.error('未找到「客戶列表」選單 (router=/crm/customer/list, type=1)。');
      process.exitCode = 1;
      return;
    }
    const listId = listMenu.id;

    const [[exists]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE parentId = ? AND perms = ? LIMIT 1',
      [listId, PERMS]
    );
    if (exists) {
      console.log('「跟進記錄」權限已存在 (id=%s)，跳過。', exists.id);
      return;
    }

    const t = nowStr();
    await conn.query(
      `INSERT INTO base_sys_menu
        (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
       VALUES (?, ?, NULL, ?, ?, NULL, ?, 2, NULL, 3, NULL, 0, 0)`,
      [t, t, listId, '跟進記錄', PERMS]
    );
    console.log(
      '已寫入「跟進記錄」權限 (parentId=%s, perms=%s)。請在角色權限中勾選後重新整理頁面。',
      listId,
      PERMS
    );
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exitCode = 1;
});
