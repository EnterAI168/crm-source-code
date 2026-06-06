SET @crm_customer_parent_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/customer' AND type = 0
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @crm_customer_parent_id, '年度考核', '/crm/annual-assessment/list', 'crm:annualAssessment:page', 1, 'icon-chart', 7,
  'modules/customer/views/annual-assessment.vue', 1, 1, NOW(), NOW()
WHERE @crm_customer_parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE router = '/crm/annual-assessment/list');

SET @annual_assessment_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/annual-assessment/list'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @annual_assessment_menu_id, '列表', NULL, 'crm:annualAssessment:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @annual_assessment_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @annual_assessment_menu_id AND perms = 'crm:annualAssessment:page');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @annual_assessment_menu_id, '詳情', NULL, 'crm:annualAssessment:detail', 2, NULL, 2, NULL, 0, 0, NOW(), NOW()
WHERE @annual_assessment_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @annual_assessment_menu_id AND perms = 'crm:annualAssessment:detail');

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT r.id, m.id, NOW(), NOW()
FROM base_sys_role r
INNER JOIN base_sys_menu m
  ON m.router = '/crm/annual-assessment/list'
  OR (m.parentId = @annual_assessment_menu_id AND m.perms IN (
    'crm:annualAssessment:page',
    'crm:annualAssessment:detail'
  ))
WHERE (r.label IN ('admin', 'boss', 'salesperson', 'office_clerk', 'office_clerk_manager') OR r.name IN ('管理員', '老闆'))
  AND @annual_assessment_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id AND rm.menuId = m.id
  );
