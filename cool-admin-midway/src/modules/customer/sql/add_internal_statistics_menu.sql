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
  @home_menu_id, '內勤統計', '/crm/internal/statistics', 'crm:internalStatistics:page', 1, 'icon-data', -1,
  'modules/customer/views/internal-statistics.vue', 1, 1, NOW(), NOW()
WHERE @home_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE router = '/crm/internal/statistics');

UPDATE base_sys_menu
SET parentId = @home_menu_id,
    name = '內勤統計',
    perms = 'crm:internalStatistics:page',
    type = 1,
    icon = 'icon-data',
    orderNum = -1,
    viewPath = 'modules/customer/views/internal-statistics.vue',
    keepAlive = 1,
    isShow = 1,
    updateTime = NOW()
WHERE router = '/crm/internal/statistics'
  AND @home_menu_id IS NOT NULL;

SET @internal_statistics_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/internal/statistics'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @internal_statistics_menu_id, '頁面', NULL, 'crm:internalStatistics:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @internal_statistics_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @internal_statistics_menu_id
      AND perms = 'crm:internalStatistics:page'
  );

SET @internal_statistics_page_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE parentId = @internal_statistics_menu_id
    AND perms = 'crm:internalStatistics:page'
  LIMIT 1
);

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT r.id, @home_menu_id, NOW(), NOW()
FROM base_sys_role r
WHERE r.label IN ('office_clerk', 'office_clerk_manager')
  AND @home_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id
      AND rm.menuId = @home_menu_id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT r.id, @internal_statistics_menu_id, NOW(), NOW()
FROM base_sys_role r
WHERE r.label IN ('office_clerk', 'office_clerk_manager')
  AND @internal_statistics_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id
      AND rm.menuId = @internal_statistics_menu_id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT r.id, @internal_statistics_page_menu_id, NOW(), NOW()
FROM base_sys_role r
WHERE r.label IN ('office_clerk', 'office_clerk_manager')
  AND @internal_statistics_page_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id
      AND rm.menuId = @internal_statistics_page_menu_id
  );
