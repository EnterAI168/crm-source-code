-- 給老闆角色補上參數列表與參數值查詢權限。
-- 角色僅依 base_sys_role.label = 'boss' 判斷，不依角色名稱判斷。

SET @boss_role_id := (
  SELECT id
  FROM base_sys_role
  WHERE label = 'boss'
  LIMIT 1
);

SET @param_config_parent_id := (
  SELECT id
  FROM base_sys_menu
  WHERE name = '參數配置'
    AND type = 0
  LIMIT 1
);

INSERT INTO base_sys_menu
  (createTime, updateTime, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
SELECT
  NOW(), NOW(), @param_config_parent_id, '參數列表', '/sys/param', NULL, 1, 'icon-menu', 0, 'cool/modules/base/views/param.vue', 1, 1
WHERE @param_config_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_menu
    WHERE router = '/sys/param'
      AND type = 1
  );

SET @param_menu_id := (
  SELECT id
  FROM base_sys_menu
  WHERE router = '/sys/param'
    AND type = 1
  LIMIT 1
);

INSERT INTO base_sys_menu
  (createTime, updateTime, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
SELECT
  NOW(), NOW(), @param_menu_id, '檢視', NULL, 'base:sys:param:page,base:sys:param:list,base:sys:param:info', 2, NULL, 0, NULL, 0, 0
WHERE @param_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_menu
    WHERE parentId = @param_menu_id
      AND perms = 'base:sys:param:page,base:sys:param:list,base:sys:param:info'
  );

INSERT INTO base_sys_menu
  (createTime, updateTime, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
SELECT
  NOW(), NOW(), @param_menu_id, '取得參數值', NULL, 'base:sys:param:data', 2, NULL, 1, NULL, 0, 0
WHERE @param_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_menu
    WHERE parentId = @param_menu_id
      AND perms = 'base:sys:param:data'
  );

INSERT INTO base_sys_role_menu (createTime, updateTime, roleId, menuId)
SELECT NOW(), NOW(), @boss_role_id, m.id
FROM base_sys_menu m
WHERE @boss_role_id IS NOT NULL
  AND (
    m.id = @param_menu_id
    OR (
      m.parentId = @param_menu_id
      AND m.perms IN (
        'base:sys:param:page,base:sys:param:list,base:sys:param:info',
        'base:sys:param:data'
      )
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_role_menu rm
    WHERE rm.roleId = @boss_role_id
      AND rm.menuId = m.id
  );
