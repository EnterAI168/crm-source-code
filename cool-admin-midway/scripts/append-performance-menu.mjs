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
    CREATE TABLE IF NOT EXISTS crm_performance (
      id bigint NOT NULL AUTO_INCREMENT,
      createTime varchar(255) NULL,
      updateTime varchar(255) NULL,
      tenantId int NULL,
      performanceMonth varchar(7) NOT NULL COMMENT '考核月份 YYYY-MM',
      performanceName varchar(50) NOT NULL COMMENT '獎金名稱',
      userId int NOT NULL COMMENT '考核使用者ID',
      userName varchar(100) NULL COMMENT '考核使用者名稱稱',
      roleType varchar(32) NOT NULL COMMENT '考核角色 sales-業務 internal-內勤',
      periodStart varchar(30) NOT NULL COMMENT '考核開始時間',
      periodEnd varchar(30) NOT NULL COMMENT '考核結束時間',
      invoiceAmount decimal(12,2) NOT NULL DEFAULT 0 COMMENT '本月開票金額',
      expectedBonus decimal(12,2) NOT NULL DEFAULT 0 COMMENT '預計獎金',
      receiptAmount decimal(12,2) NOT NULL DEFAULT 0 COMMENT '本月回款金額',
      actualBonus decimal(12,2) NOT NULL DEFAULT 0 COMMENT '實際獎金',
      status tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-未申請 2-已申請 3-已完成',
      remark text NULL COMMENT '備註',
      isDeleted tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
      PRIMARY KEY (id),
      UNIQUE KEY UK_crm_performance_month_user_role_deleted (performanceMonth, userId, roleType, isDeleted),
      KEY IDX_crm_performance_month (performanceMonth),
      KEY IDX_crm_performance_user (userId),
      KEY IDX_crm_performance_role (roleType)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='CRM業績考核'
  `);
  const [[uniqueIndex]] = await conn.query(
    `SELECT COUNT(1) AS count
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'crm_performance'
       AND index_name = 'UK_crm_performance_month_user_role_deleted'`
  );
  if (Number(uniqueIndex.count || 0) === 0) {
    await conn.query(
      `ALTER TABLE crm_performance
       ADD UNIQUE KEY UK_crm_performance_month_user_role_deleted (performanceMonth, userId, roleType, isDeleted)`
    );
  }
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
  return await grantMenusToRoles(conn, roles, menuIds);
}

async function grantToRoleLabels(conn, labels, menuIds) {
  if (!labels.length || !menuIds.length) {
    return 0;
  }
  const [roles] = await conn.query(
    'SELECT id FROM base_sys_role WHERE label IN (?)',
    [labels]
  );
  return await grantMenusToRoles(conn, roles, menuIds);
}

async function grantMenusToRoles(conn, roles, menuIds) {
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

async function ensureTask(conn) {
  const [[existing]] = await conn.query(
    'SELECT id FROM task_info WHERE jobId = ? LIMIT 1',
    ['crm-performance-monthly-generate']
  );
  if (existing) {
    await conn.query(
      `UPDATE task_info
       SET name = '每月生成業績考核記錄',
           cron = '0 0 0 1 * *',
           service = 'CrmPerformanceService.monthlyGenerate()',
           status = 1,
           taskType = 0,
           remark = '每月1號00:00自動建立業務/內勤業績考核記錄'
       WHERE id = ?`,
      [existing.id]
    );
    return existing.id;
  }
  const t = nowStr();
  const [result] = await conn.query(
    `INSERT INTO task_info
      (createTime, updateTime, tenantId, jobId, repeatConf, name, cron, \`limit\`, every, remark, status, startDate, endDate, data, service, type, nextRunTime, taskType, lastExecuteTime, lockExpireTime)
     VALUES (?, ?, NULL, 'crm-performance-monthly-generate', NULL, '每月生成業績考核記錄', '0 0 0 1 * *', NULL, NULL,
       '每月1號00:00自動建立業務/內勤業績考核記錄', 1, NULL, NULL, NULL, 'CrmPerformanceService.monthlyGenerate()', 0, NULL, 0, NULL, NULL)`,
    [t, t]
  );
  return result.insertId;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    await ensureTable(conn);

    const [[parent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/customer']
    );
    if (!parent) {
      throw new Error('未找到客戶管理目錄：router=/crm/customer');
    }

    const [[existing]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
      ['/crm/performance/list']
    );

    let menuId = existing?.id;
    if (!menuId) {
      const t = nowStr();
      const [result] = await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, ?, '業績管理', '/crm/performance/list', 'crm:performance:page', 1, 'icon-chart', 5, 'modules/customer/views/performance.vue', 1, 1)`,
        [t, t, parent.id]
      );
      menuId = result.insertId;
    } else {
      await conn.query(
        `UPDATE base_sys_menu
         SET name = '業績管理',
             parentId = ?,
             perms = 'crm:performance:page',
             type = 1,
             icon = 'icon-chart',
             orderNum = 5,
             viewPath = 'modules/customer/views/performance.vue',
             keepAlive = 1,
             isShow = 1
         WHERE id = ?`,
        [parent.id, menuId]
      );
    }

    const buttonIds = [
      await insertButton(conn, menuId, '列表', 'crm:performance:page', 1),
      await insertButton(conn, menuId, '預計獎金', 'crm:performance:expectedDetail', 2),
      await insertButton(conn, menuId, '實際獎金', 'crm:performance:actualDetail', 3),
      await insertButton(conn, menuId, '檢視詳情', 'crm:performance:detail', 4),
    ];
    const pageButtonId = buttonIds[0];
    const expectedButtonId = buttonIds[1];
    const actualButtonId = buttonIds[2];
    const detailButtonId = buttonIds[3];
    const roleCount = await grantToAdminRoles(conn, [menuId, ...buttonIds]);
    const salesRoleCount = await grantToRoleLabels(conn, ['salesperson'], [
      menuId,
      pageButtonId,
      expectedButtonId,
      actualButtonId,
    ]);
    const internalRoleCount = await grantToRoleLabels(
      conn,
      ['office_clerk', 'office_clerk_manager'],
      [menuId, pageButtonId, detailButtonId]
    );
    const taskId = await ensureTask(conn);
    console.log(`業績管理選單已寫入/更新，id=${menuId}，管理授權角色數=${roleCount}，業務授權角色數=${salesRoleCount}，內勤授權角色數=${internalRoleCount}，定時任務id=${taskId}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
