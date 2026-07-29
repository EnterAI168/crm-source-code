import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3308),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function insertButton(conn, parentId, name, perms, orderNum) {
  const [[existing]] = await conn.query(
    'SELECT id FROM base_sys_menu WHERE parentId = ? AND perms = ? LIMIT 1',
    [parentId, perms]
  );
  if (existing) {
    return existing.id;
  }

  const t = nowStr();
  const [result] = await conn.query(
    `INSERT INTO base_sys_menu
      (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
     VALUES (?, ?, NULL, ?, ?, NULL, ?, 2, NULL, ?, NULL, 0, 0)`,
    [t, t, parentId, name, perms, orderNum]
  );
  return result.insertId;
}

async function grantToAdminRoles(conn, menuIds) {
  const [roles] = await conn.query(
    "SELECT id FROM base_sys_role WHERE label IN ('admin', 'boss') OR name IN ('管理員', '老闆')"
  );
  const t = nowStr();
  for (const role of roles) {
    for (const menuId of menuIds) {
      await conn.query(
        `INSERT INTO base_sys_role_menu (createTime, updateTime, tenantId, roleId, menuId)
         SELECT ?, ?, NULL, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM base_sys_role_menu WHERE roleId = ? AND menuId = ?
         )`,
        [t, t, role.id, menuId, role.id, menuId]
      );
    }
  }
  return roles.length;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    const [[parent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/quote']
    );
    if (!parent) {
      throw new Error('未找到報價單管理目錄 (router=/crm/quote)');
    }

    const [[existing]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
      ['/crm/quote/bank-account']
    );

    let menuId = existing?.id;
    if (!menuId) {
      const t = nowStr();
      const [result] = await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, ?, '存摺帳戶', '/crm/quote/bank-account', 'crm:quoteBankAccount:page', 1, 'icon-wallet', 8, 'modules/customer/views/quote-bank-account.vue', 1, 1)`,
        [t, t, parent.id]
      );
      menuId = result.insertId;
    } else {
      await conn.query(
        `UPDATE base_sys_menu
         SET name = '存摺帳戶',
             parentId = ?,
             perms = 'crm:quoteBankAccount:page',
             type = 1,
             icon = 'icon-wallet',
             orderNum = 8,
             viewPath = 'modules/customer/views/quote-bank-account.vue',
             keepAlive = 1,
             isShow = 1
         WHERE id = ?`,
        [parent.id, menuId]
      );
    }

    const buttonIds = [
      await insertButton(conn, menuId, '列表', 'crm:quoteBankAccount:page', 1),
      await insertButton(conn, menuId, '新增', 'crm:quoteBankAccount:add', 2),
      await insertButton(conn, menuId, '編輯', 'crm:quoteBankAccount:update', 3),
      await insertButton(conn, menuId, '刪除', 'crm:quoteBankAccount:delete', 4),
    ];

    const roleCount = await grantToAdminRoles(conn, [menuId, ...buttonIds]);
    console.log(`存摺帳戶選單已寫入/更新，id=${menuId}，授權角色數=${roleCount}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
