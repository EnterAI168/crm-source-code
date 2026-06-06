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

async function ensureTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS crm_bonus_config (
      id bigint NOT NULL AUTO_INCREMENT,
      createTime datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
      updateTime datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      roleType varchar(32) NOT NULL COMMENT '適用角色 sales-業務 internal-內勤',
      groupCode varchar(64) NOT NULL COMMENT '分組編碼',
      groupName varchar(100) NOT NULL COMMENT '分組名稱',
      configCode varchar(100) NOT NULL COMMENT '配置編碼',
      configName varchar(160) NOT NULL COMMENT '配置名稱',
      configType varchar(32) NOT NULL COMMENT '配置型別 rate-比例 amount-金額 threshold-門檻 text-文本',
      conditionText text NULL COMMENT '條件說明',
      calcBase varchar(200) NULL COMMENT '計算基數',
      configValue varchar(64) NULL COMMENT '配置值',
      unit varchar(32) NULL COMMENT '單位',
      sortNum int NOT NULL DEFAULT 0 COMMENT '排序',
      isEnabled tinyint NOT NULL DEFAULT 1 COMMENT '啟用狀態 0-停用 1-啟用',
      remark text NULL COMMENT '備註',
      isDeleted tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
      PRIMARY KEY (id),
      UNIQUE KEY IDX_crm_bonus_config_code (configCode),
      KEY IDX_crm_bonus_config_role (roleType),
      KEY IDX_crm_bonus_config_group (groupCode),
      KEY IDX_crm_bonus_config_enabled (isEnabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='CRM獎金配置'
  `);
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
    await ensureTable(conn);

    const [[parent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE name = ? AND type = 0 LIMIT 1',
      ['使用者管理']
    );
    if (!parent) {
      throw new Error('未找到使用者管理目錄');
    }

    const [[existing]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
      ['/crm/bonus/config']
    );

    let menuId = existing?.id;
    if (!menuId) {
      const t = nowStr();
      const [result] = await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, ?, '獎金配置', '/crm/bonus/config', 'crm:bonusConfig:page', 1, 'icon-form', 3, 'modules/customer/views/bonus-config.vue', 1, 1)`,
        [t, t, parent.id]
      );
      menuId = result.insertId;
    } else {
      await conn.query(
        `UPDATE base_sys_menu
         SET name = '獎金配置',
             parentId = ?,
             perms = 'crm:bonusConfig:page',
             type = 1,
             icon = 'icon-form',
             orderNum = 3,
             viewPath = 'modules/customer/views/bonus-config.vue',
             keepAlive = 1,
             isShow = 1
         WHERE id = ?`,
        [parent.id, menuId]
      );
    }

    const buttonIds = [
      await insertButton(conn, menuId, '列表', 'crm:bonusConfig:page', 1),
      await insertButton(conn, menuId, '新增', 'crm:bonusConfig:add', 2),
      await insertButton(conn, menuId, '編輯', 'crm:bonusConfig:update', 3),
      await insertButton(conn, menuId, '刪除', 'crm:bonusConfig:delete', 4),
    ];

    const roleCount = await grantToAdminRoles(conn, [menuId, ...buttonIds]);
    console.log(`獎金配置選單已寫入/更新，id=${menuId}，授權角色數=${roleCount}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
