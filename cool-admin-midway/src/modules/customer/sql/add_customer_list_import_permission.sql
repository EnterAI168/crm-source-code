SET @customer_list_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/customer/list'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @customer_list_menu_id, '匯入', NULL, 'crm:customerList:import', 2, NULL, 4, NULL, 0, 0, NOW(), NOW()
WHERE @customer_list_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @customer_list_menu_id AND perms = 'crm:customerList:import'
  );
