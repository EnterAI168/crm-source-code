/**
 * 在「客戶列表」下補充報價單 / 移入公池 / VIP 等按鈕權限（menu.json 中 orderNum 4～8）。
 * 已存在相同 perms 則跳過。
 *
 * 用法：在 cool-admin-midway 目錄執行
 *   node scripts/append-customer-list-action-menus.mjs
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
  [4, '檢視報價單', 'crm:customerList:quotationView'],
  [5, '新增報價單', 'crm:customerList:quotationAdd'],
  [6, '移入公池', 'crm:customerList:moveToPool'],
  [7, '設為VIP', 'crm:customerList:setVip'],
  [8, '取消VIP', 'crm:customerList:cancelVip'],
];

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
    const t = nowStr();
    let n = 0;
    for (const [orderNum, name, perms] of ROWS) {
      const [[ex]] = await conn.query(
        'SELECT id FROM base_sys_menu WHERE parentId = ? AND perms = ? LIMIT 1',
        [listId, perms]
      );
      if (ex) continue;
      await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, ?, ?, NULL, ?, 2, NULL, ?, NULL, 0, 0)`,
        [t, t, listId, name, perms, orderNum]
      );
      n++;
      console.log('已寫入: %s (%s)', name, perms);
    }
    if (n === 0) {
      console.log('上述權限均已存在，無需插入。');
    }
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exitCode = 1;
});
