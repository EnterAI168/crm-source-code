SET @home_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE name = '首頁'
  LIMIT 1
);

UPDATE base_sys_menu
SET type = 0,
    icon = 'icon-home',
    viewPath = NULL,
    isShow = 1,
    updateTime = NOW()
WHERE id = @home_menu_id;

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @home_menu_id, '發票統計', '/crm/invoice/statistics', 'crm:invoiceStatistics:page', 1, 'icon-chart', 1,
  'modules/customer/views/invoice-statistics.vue', 1, 1, NOW(), NOW()
WHERE @home_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE router = '/crm/invoice/statistics');

UPDATE base_sys_menu
SET parentId = @home_menu_id,
    name = '發票統計',
    perms = 'crm:invoiceStatistics:page',
    type = 1,
    icon = 'icon-chart',
    orderNum = 1,
    viewPath = 'modules/customer/views/invoice-statistics.vue',
    keepAlive = 1,
    isShow = 1,
    updateTime = NOW()
WHERE router = '/crm/invoice/statistics'
  AND @home_menu_id IS NOT NULL;

SET @invoice_statistics_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/invoice/statistics'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @invoice_statistics_menu_id, '頁面', NULL, 'crm:invoiceStatistics:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_statistics_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @invoice_statistics_menu_id AND perms = 'crm:invoiceStatistics:page');

SET @invoice_statistics_page_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE parentId = @invoice_statistics_menu_id
    AND perms = 'crm:invoiceStatistics:page'
  LIMIT 1
);

SET @platform_statistics_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/platform/statistics'
  LIMIT 1
);

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source_role_menu.roleId, @home_menu_id, NOW(), NOW()
FROM base_sys_role_menu source_role_menu
WHERE source_role_menu.menuId = @platform_statistics_menu_id
  AND @home_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target_role_menu
    WHERE target_role_menu.roleId = source_role_menu.roleId
      AND target_role_menu.menuId = @home_menu_id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source_role_menu.roleId, @invoice_statistics_menu_id, NOW(), NOW()
FROM base_sys_role_menu source_role_menu
WHERE source_role_menu.menuId = @home_menu_id
  AND @invoice_statistics_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target_role_menu
    WHERE target_role_menu.roleId = source_role_menu.roleId
      AND target_role_menu.menuId = @invoice_statistics_menu_id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source_role_menu.roleId, @invoice_statistics_page_menu_id, NOW(), NOW()
FROM base_sys_role_menu source_role_menu
WHERE source_role_menu.menuId = @home_menu_id
  AND @invoice_statistics_page_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target_role_menu
    WHERE target_role_menu.roleId = source_role_menu.roleId
      AND target_role_menu.menuId = @invoice_statistics_page_menu_id
  );
