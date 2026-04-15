/**
 * 在已有「客户管理」目录下写入「客户列表」菜单及按钮权限（与 menu.json 一致）。
 * 若路由 /crm/customer/list 已存在则跳过。
 *
 * 用法（在 cool-admin-midway 目录）：
 *   node scripts/append-customer-list-menu.mjs
 *
 * 可通过环境变量覆盖数据库连接：
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
        '未找到父级目录「客户管理」(router=/crm/customer)。请先部署客户模块或手动导入客户菜单。'
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
      console.log('「客户列表」菜单已存在 (id=%s)，无需重复导入。', existing.id);
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
        '客户列表',
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
      ['分页', null, 'crm:customerList:page', 2, 1],
      ['新增', null, 'crm:customerList:add', 2, 2],
      ['编辑', null, 'crm:customerList:update', 2, 3],
      ['删除', null, 'crm:customerList:delete', 2, 4],
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
      '已写入「客户列表」菜单 (id=%s) 及 4 条按钮权限。非超管角色请在「角色权限」中勾选新菜单。',
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
