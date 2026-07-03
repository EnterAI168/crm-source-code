SET @customer_pool_menu_id := (
  SELECT id
  FROM base_sys_menu
  WHERE router = '/crm/customer/pool'
    AND type = 1
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @customer_pool_menu_id, '新增報價單', NULL, 'crm:customerPool:quotationAdd', 2, NULL, 8, NULL, 0, 0, NOW(), NOW()
WHERE @customer_pool_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_menu
    WHERE parentId = @customer_pool_menu_id
      AND perms = 'crm:customerPool:quotationAdd'
  );

UPDATE base_sys_menu
SET name = '新增報價單',
    orderNum = 8,
    updateTime = NOW()
WHERE parentId = @customer_pool_menu_id
  AND perms = 'crm:customerPool:quotationAdd';

SET @user_list_menu_id := (
  SELECT id
  FROM base_sys_menu
  WHERE router = '/user/list'
    AND type = 1
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @user_list_menu_id, '重置密碼', NULL, 'base:sys:user:resetPassword', 2, NULL, 6, NULL, 0, 0, NOW(), NOW()
WHERE @user_list_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_menu
    WHERE parentId = @user_list_menu_id
      AND perms = 'base:sys:user:resetPassword'
  );

UPDATE base_sys_menu
SET name = '重置密碼',
    orderNum = 6,
    updateTime = NOW()
WHERE parentId = @user_list_menu_id
  AND perms = 'base:sys:user:resetPassword';
