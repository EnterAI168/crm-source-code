/**
 * 在「客户列表」菜单下补充「跟进记录」按钮权限（crm:customerList:follow）。
 * 适用于菜单已存在但库中缺少该子权限的情况（initMenu 不会自动补全子节点）。
 *
 * 用法（在 cool-admin-midway 目录）：
 *   node scripts/append-customer-list-follow-menu.mjs
 *
 * 环境变量：MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE
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
      console.error('未找到「客户列表」菜单 (router=/crm/customer/list, type=1)。');
      process.exitCode = 1;
      return;
    }
    const listId = listMenu.id;

    const [[exists]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE parentId = ? AND perms = ? LIMIT 1',
      [listId, PERMS]
    );
    if (exists) {
      console.log('「跟进记录」权限已存在 (id=%s)，跳过。', exists.id);
      return;
    }

    const t = nowStr();
    await conn.query(
      `INSERT INTO base_sys_menu
        (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
       VALUES (?, ?, NULL, ?, ?, NULL, ?, 2, NULL, 3, NULL, 0, 0)`,
      [t, t, listId, '跟进记录', PERMS]
    );
    console.log(
      '已写入「跟进记录」权限 (parentId=%s, perms=%s)。请在角色权限中勾选后刷新页面。',
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
