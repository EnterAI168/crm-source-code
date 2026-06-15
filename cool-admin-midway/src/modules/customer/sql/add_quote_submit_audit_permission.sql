-- 給業務員角色補上報價單「申請審核」介面權限。
-- 角色僅依 base_sys_role.label = 'salesperson' 判斷，不依角色名稱判斷。

SET @quote_order_menu_id := (
  SELECT id
  FROM base_sys_menu
  WHERE router = '/crm/quote/list'
    AND type = 1
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @quote_order_menu_id, '申請審核', NULL, 'crm:quoteOrder:submitAudit', 2, NULL, 6, NULL, 0, 0, NOW(), NOW()
WHERE @quote_order_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_menu
    WHERE parentId = @quote_order_menu_id
      AND perms = 'crm:quoteOrder:submitAudit'
  );

UPDATE base_sys_menu
SET name = '申請審核',
    orderNum = 6,
    updateTime = NOW()
WHERE parentId = @quote_order_menu_id
  AND perms = 'crm:quoteOrder:submitAudit';

SET @submit_audit_menu_id := (
  SELECT id
  FROM base_sys_menu
  WHERE parentId = @quote_order_menu_id
    AND perms = 'crm:quoteOrder:submitAudit'
  LIMIT 1
);

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT r.id, @submit_audit_menu_id, NOW(), NOW()
FROM base_sys_role r
WHERE r.label = 'salesperson'
  AND @submit_audit_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id
      AND rm.menuId = @submit_audit_menu_id
  );
