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
  @home_menu_id, '平臺統計', '/crm/platform/statistics', 'crm:platformStatistics:page', 1, 'icon-data', 0,
  'modules/customer/views/platform-statistics.vue', 1, 1, NOW(), NOW()
WHERE @home_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE router = '/crm/platform/statistics');

UPDATE base_sys_menu
SET parentId = @home_menu_id,
    name = '平臺統計',
    perms = 'crm:platformStatistics:page',
    type = 1,
    icon = 'icon-data',
    orderNum = 0,
    viewPath = 'modules/customer/views/platform-statistics.vue',
    keepAlive = 1,
    isShow = 1,
    updateTime = NOW()
WHERE router = '/crm/platform/statistics'
  AND @home_menu_id IS NOT NULL;

SET @platform_statistics_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/platform/statistics'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @platform_statistics_menu_id, '頁面', NULL, 'crm:platformStatistics:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @platform_statistics_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @platform_statistics_menu_id AND perms = 'crm:platformStatistics:page');
