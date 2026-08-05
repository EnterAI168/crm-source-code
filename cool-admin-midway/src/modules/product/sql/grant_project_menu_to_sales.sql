-- 專案管理列表：授權業務員 / 業務主管（僅能透過資料權限看自己的專案）

SET @project_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/product/project-list'
  LIMIT 1
);

SET @project_parent_menu_id := (
  SELECT parentId FROM base_sys_menu
  WHERE id = @project_menu_id
  LIMIT 1
);

SET @project_grandparent_menu_id := (
  SELECT parentId FROM base_sys_menu
  WHERE id = @project_parent_menu_id
  LIMIT 1
);

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

INSERT INTO base_sys_role_menu (createTime, updateTime, tenantId, roleId, menuId)
SELECT NOW(), NOW(), NULL, r.id, m.menuId
FROM base_sys_role r
JOIN (
  SELECT @project_grandparent_menu_id AS menuId
  UNION ALL SELECT @project_parent_menu_id
  UNION ALL SELECT @project_menu_id
  UNION ALL SELECT @project_page_button_id
  UNION ALL SELECT @project_info_button_id
  UNION ALL SELECT @project_update_button_id
) m
WHERE r.label IN ('salesperson', 'sales_manager')
  AND m.menuId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id AND rm.menuId = m.menuId
  );
