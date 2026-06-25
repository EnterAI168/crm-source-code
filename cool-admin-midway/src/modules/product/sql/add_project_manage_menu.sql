SET @product_root_id := (
  SELECT id FROM base_sys_menu
  WHERE name = '產品管理'
    AND type = 0
  LIMIT 1
);

SET @product_list_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/product/list'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @product_root_id, '專案管理列表', '/product/project-list', NULL, 1, 'icon-list', 3,
  'modules/product/views/project-list.vue', 1, 1, NOW(), NOW()
WHERE @product_root_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE router = '/product/project-list');

UPDATE base_sys_menu
SET parentId = @product_root_id,
    name = '專案管理列表',
    perms = NULL,
    type = 1,
    icon = 'icon-list',
    orderNum = 3,
    viewPath = 'modules/product/views/project-list.vue',
    keepAlive = 1,
    isShow = 1,
    updateTime = NOW()
WHERE router = '/product/project-list'
  AND @product_root_id IS NOT NULL;

SET @project_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/product/project-list'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @project_menu_id, '列表', NULL, 'product:project:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @project_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @project_menu_id AND perms = 'product:project:page');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @project_menu_id, '詳情', NULL, 'product:project:info', 2, NULL, 2, NULL, 0, 0, NOW(), NOW()
WHERE @project_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @project_menu_id AND perms = 'product:project:info');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @project_menu_id, '編輯', NULL, 'product:project:update', 2, NULL, 3, NULL, 0, 0, NOW(), NOW()
WHERE @project_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @project_menu_id AND perms = 'product:project:update');

SET @project_page_button_id := (
  SELECT id FROM base_sys_menu
  WHERE parentId = @project_menu_id
    AND perms = 'product:project:page'
  LIMIT 1
);

SET @project_info_button_id := (
  SELECT id FROM base_sys_menu
  WHERE parentId = @project_menu_id
    AND perms = 'product:project:info'
  LIMIT 1
);

SET @project_update_button_id := (
  SELECT id FROM base_sys_menu
  WHERE parentId = @project_menu_id
    AND perms = 'product:project:update'
  LIMIT 1
);

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source.roleId, @project_menu_id, NOW(), NOW()
FROM base_sys_role_menu source
WHERE source.menuId = @product_list_menu_id
  AND @project_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target
    WHERE target.roleId = source.roleId
      AND target.menuId = @project_menu_id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source.roleId, @project_page_button_id, NOW(), NOW()
FROM base_sys_role_menu source
INNER JOIN base_sys_menu source_menu ON source_menu.id = source.menuId
WHERE source_menu.parentId = @product_list_menu_id
  AND source_menu.perms = 'product:info:page,product:info:list,product:info:info,product:info:add,product:info:update,product:info:delete'
  AND @project_page_button_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target
    WHERE target.roleId = source.roleId
      AND target.menuId = @project_page_button_id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source.roleId, @project_info_button_id, NOW(), NOW()
FROM base_sys_role_menu source
INNER JOIN base_sys_menu source_menu ON source_menu.id = source.menuId
WHERE source_menu.parentId = @product_list_menu_id
  AND source_menu.perms = 'product:info:page,product:info:list,product:info:info,product:info:add,product:info:update,product:info:delete'
  AND @project_info_button_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target
    WHERE target.roleId = source.roleId
      AND target.menuId = @project_info_button_id
  );

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source.roleId, @project_update_button_id, NOW(), NOW()
FROM base_sys_role_menu source
INNER JOIN base_sys_menu source_menu ON source_menu.id = source.menuId
WHERE source_menu.parentId = @product_list_menu_id
  AND source_menu.perms = 'product:info:page,product:info:list,product:info:info,product:info:add,product:info:update,product:info:delete'
  AND @project_update_button_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target
    WHERE target.roleId = source.roleId
      AND target.menuId = @project_update_button_id
  );
