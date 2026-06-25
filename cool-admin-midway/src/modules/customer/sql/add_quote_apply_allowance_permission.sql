SET @quote_order_menu_id := (
  SELECT id
  FROM base_sys_menu
  WHERE perms = 'crm:quoteOrder:page'
  ORDER BY id ASC
  LIMIT 1
);

INSERT INTO base_sys_menu (
  parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime
)
SELECT
  @quote_order_menu_id, '申請折讓', NULL, 'crm:quoteOrder:applyAllowance', 2, NULL, 18, NULL, 0, 0, NOW(), NOW()
FROM DUAL
WHERE @quote_order_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM base_sys_menu
    WHERE parentId = @quote_order_menu_id
      AND perms = 'crm:quoteOrder:applyAllowance'
  );

UPDATE base_sys_menu
SET name = '申請折讓', orderNum = 18, updateTime = NOW()
WHERE parentId = @quote_order_menu_id
  AND perms = 'crm:quoteOrder:applyAllowance';
