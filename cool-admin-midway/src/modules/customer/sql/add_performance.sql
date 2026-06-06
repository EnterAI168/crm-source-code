CREATE TABLE IF NOT EXISTS `crm_performance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `createTime` varchar(255) NULL,
  `updateTime` varchar(255) NULL,
  `tenantId` int NULL,
  `performanceMonth` varchar(7) NOT NULL COMMENT '考核月份 YYYY-MM',
  `performanceName` varchar(50) NOT NULL COMMENT '獎金名稱',
  `userId` int NOT NULL COMMENT '考核使用者ID',
  `userName` varchar(100) NULL COMMENT '考核使用者名稱稱',
  `roleType` varchar(32) NOT NULL COMMENT '考核角色 sales-業務 internal-內勤',
  `periodStart` varchar(30) NOT NULL COMMENT '考核開始時間',
  `periodEnd` varchar(30) NOT NULL COMMENT '考核結束時間',
  `invoiceAmount` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '本月開票金額',
  `expectedBonus` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '預計獎金',
  `receiptAmount` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '本月回款金額',
  `actualBonus` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '實際獎金',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-未申請 2-已申請 3-已完成',
  `remark` text NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_crm_performance_month_user_role_deleted` (`performanceMonth`, `userId`, `roleType`, `isDeleted`),
  KEY `IDX_crm_performance_month` (`performanceMonth`),
  KEY `IDX_crm_performance_user` (`userId`),
  KEY `IDX_crm_performance_role` (`roleType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='CRM業績考核';

SET @crm_performance_unique_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_performance'
    AND index_name = 'UK_crm_performance_month_user_role_deleted'
);

SET @crm_performance_unique_sql := IF(
  @crm_performance_unique_exists = 0,
  'ALTER TABLE `crm_performance` ADD UNIQUE KEY `UK_crm_performance_month_user_role_deleted` (`performanceMonth`, `userId`, `roleType`, `isDeleted`)',
  'SELECT 1'
);

PREPARE crm_performance_unique_stmt FROM @crm_performance_unique_sql;
EXECUTE crm_performance_unique_stmt;
DEALLOCATE PREPARE crm_performance_unique_stmt;

SET @crm_customer_parent_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/customer' AND type = 0
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @crm_customer_parent_id, '業績管理', '/crm/performance/list', 'crm:performance:page', 1, 'icon-chart', 5,
  'modules/customer/views/performance.vue', 1, 1, NOW(), NOW()
WHERE @crm_customer_parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE router = '/crm/performance/list');

SET @performance_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/performance/list'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @performance_menu_id, '列表', NULL, 'crm:performance:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @performance_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @performance_menu_id AND perms = 'crm:performance:page');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @performance_menu_id, '預計獎金', NULL, 'crm:performance:expectedDetail', 2, NULL, 2, NULL, 0, 0, NOW(), NOW()
WHERE @performance_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @performance_menu_id AND perms = 'crm:performance:expectedDetail');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @performance_menu_id, '實際獎金', NULL, 'crm:performance:actualDetail', 2, NULL, 3, NULL, 0, 0, NOW(), NOW()
WHERE @performance_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @performance_menu_id AND perms = 'crm:performance:actualDetail');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @performance_menu_id, '檢視詳情', NULL, 'crm:performance:detail', 2, NULL, 4, NULL, 0, 0, NOW(), NOW()
WHERE @performance_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @performance_menu_id AND perms = 'crm:performance:detail');

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT r.id, m.id, NOW(), NOW()
FROM base_sys_role r
INNER JOIN base_sys_menu m
  ON m.router = '/crm/performance/list'
  OR (m.parentId = @performance_menu_id AND m.perms IN (
    'crm:performance:page',
    'crm:performance:expectedDetail',
    'crm:performance:actualDetail',
    'crm:performance:detail'
  ))
WHERE (r.label IN ('admin', 'boss') OR r.name IN ('管理員', '老闆'))
  AND @performance_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id AND rm.menuId = m.id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT r.id, m.id, NOW(), NOW()
FROM base_sys_role r
INNER JOIN base_sys_menu m
  ON m.router = '/crm/performance/list'
  OR (m.parentId = @performance_menu_id AND m.perms IN (
    'crm:performance:page',
    'crm:performance:expectedDetail',
    'crm:performance:actualDetail'
  ))
WHERE r.label = 'salesperson'
  AND @performance_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id AND rm.menuId = m.id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT r.id, m.id, NOW(), NOW()
FROM base_sys_role r
INNER JOIN base_sys_menu m
  ON m.router = '/crm/performance/list'
  OR (m.parentId = @performance_menu_id AND m.perms IN (
    'crm:performance:page',
    'crm:performance:detail'
  ))
WHERE r.label IN ('office_clerk', 'office_clerk_manager')
  AND @performance_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id AND rm.menuId = m.id
  );

INSERT INTO task_info
  (createTime, updateTime, tenantId, jobId, repeatConf, name, cron, `limit`, every, remark, status, startDate, endDate, data, service, type, nextRunTime, taskType, lastExecuteTime, lockExpireTime)
SELECT
  NOW(), NOW(), NULL, 'crm-performance-monthly-generate', NULL, '每月生成業績考核記錄',
  '0 0 0 1 * *', NULL, NULL, '每月1號00:00自動建立業務/內勤業績考核記錄',
  1, NULL, NULL, NULL, 'CrmPerformanceService.monthlyGenerate()', 0, NULL, 0, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM task_info WHERE jobId = 'crm-performance-monthly-generate');
