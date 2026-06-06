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

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    const [[parent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/customer']
    );
    if (!parent) {
      throw new Error('未找到客戶管理目錄：router=/crm/customer');
    }

    const [[existing]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
      ['/crm/invoice/audit']
    );

    let menuId = existing?.id;
    if (!menuId) {
      const t = nowStr();
      const [result] = await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, ?, '發票稽核', '/crm/invoice/audit', 'crm:quoteInvoice:page', 1, 'icon-list', 3, 'modules/customer/views/invoice-audit.vue', 1, 1)`,
        [t, t, parent.id]
      );
      menuId = result.insertId;
    } else {
      await conn.query(
        `UPDATE base_sys_menu
         SET name = '發票稽核',
             parentId = ?,
             perms = 'crm:quoteInvoice:page',
             type = 1,
             icon = 'icon-list',
             orderNum = 3,
             viewPath = 'modules/customer/views/invoice-audit.vue',
             keepAlive = 1,
             isShow = 1
         WHERE id = ?`,
        [parent.id, menuId]
      );
    }

    await insertButton(conn, menuId, '列表', 'crm:quoteInvoice:page', 1);
    await insertButton(conn, menuId, '詳情', 'crm:quoteInvoice:info', 2);
    await insertButton(conn, menuId, '稽核', 'crm:quoteInvoice:audit', 3);
    await insertButton(conn, menuId, '預覽', 'crm:quoteInvoice:preview', 4);

    console.log(`發票稽核選單已寫入/更新，id=${menuId}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
