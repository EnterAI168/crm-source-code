/**
 * 在已有「客戶管理」目錄下寫入「客戶列表」選單及按鈕許可權（與 menu.json 一致）。
 * 若路由 /crm/customer/list 已存在則跳過。
 *
 * 用法（在 cool-admin-midway 目錄）：
 *   node scripts/append-customer-list-menu.mjs
 *
 * 可通過環境變數覆蓋資料庫連線：
 *   MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE
 */

import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    const [[parent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/customer']
    );
    if (!parent) {
      console.error(
        '未找到父級目錄「客戶管理」(router=/crm/customer)。請先部署客戶模組或手動匯入客戶選單。'
      );
      process.exitCode = 1;
      return;
    }
    const parentId = parent.id;

    const [[existing]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
      ['/crm/customer/list']
    );
    if (existing) {
      console.log('「客戶列表」選單已存在 (id=%s)，無需重複匯入。', existing.id);
      return;
    }

    const t = nowStr();
    const [ins] = await conn.query(
      `INSERT INTO base_sys_menu
        (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t,
        t,
        parentId,
        '客戶列表',
        '/crm/customer/list',
        'crm:customerList:page',
        1,
        'icon-list',
        1,
        'modules/customer/views/list.vue',
        1,
        1,
      ]
    );
    const listId = ins.insertId;

    const buttons = [
      ['分頁', null, 'crm:customerList:page', 2, 1],
      ['新增', null, 'crm:customerList:add', 2, 2],
      ['編輯', null, 'crm:customerList:update', 2, 3],
      ['刪除', null, 'crm:customerList:delete', 2, 4],
    ];
    for (const [name, router, perms, type, orderNum] of buttons) {
      await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?)`,
        [t, t, listId, name, router, perms, type, orderNum, 0, 0]
      );
    }

    console.log(
      '已寫入「客戶列表」選單 (id=%s) 及 4 條按鈕許可權。非超管角色請在「角色許可權」中勾選新選單。',
      listId
    );
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exitCode = 1;
});
