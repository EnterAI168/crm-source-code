-- 新增角色：業務主管(sales_manager)、整合PM(integration_pm)
-- 並複製對應選單權限（業務主管對齊業務員；整合PM對齊內勤）

INSERT INTO base_sys_role (createTime, updateTime, userId, name, label, remark, relevance)
SELECT NOW(), NOW(), '', '業務主管', 'sales_manager', '業務主管：級距固獎 + 主力滿70萬加碼3%', 0
WHERE NOT EXISTS (
  SELECT 1 FROM base_sys_role WHERE label = 'sales_manager'
);

INSERT INTO base_sys_role (createTime, updateTime, userId, name, label, remark, relevance)
SELECT NOW(), NOW(), '', '整合PM', 'integration_pm', '整合PM：單月執案滿200萬+5000', 0
WHERE NOT EXISTS (
  SELECT 1 FROM base_sys_role WHERE label = 'integration_pm'
);

-- 業務主管：複製業務員選單權限
INSERT INTO base_sys_role_menu (createTime, updateTime, tenantId, roleId, menuId)
SELECT NOW(), NOW(), NULL, sm.id, rm.menuId
FROM base_sys_role sm
INNER JOIN base_sys_role sp ON sp.label = 'salesperson'
INNER JOIN base_sys_role_menu rm ON rm.roleId = sp.id
WHERE sm.label = 'sales_manager'
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu x
    WHERE x.roleId = sm.id AND x.menuId = rm.menuId
  );

-- 整合PM：複製內勤選單權限
INSERT INTO base_sys_role_menu (createTime, updateTime, tenantId, roleId, menuId)
SELECT NOW(), NOW(), NULL, pm.id, rm.menuId
FROM base_sys_role pm
INNER JOIN base_sys_role oc ON oc.label = 'office_clerk'
INNER JOIN base_sys_role_menu rm ON rm.roleId = oc.id
WHERE pm.label = 'integration_pm'
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu x
    WHERE x.roleId = pm.id AND x.menuId = rm.menuId
  );
