SET @crm_customer_parent_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/customer' AND type = 0
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @crm_customer_parent_id, '發票審核', '/crm/invoice/audit', 'crm:quoteInvoice:page', 1, 'icon-list', 3,
  'modules/customer/views/invoice-audit.vue', 1, 1, NOW(), NOW()
WHERE @crm_customer_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu WHERE router = '/crm/invoice/audit'
  );

SET @invoice_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/invoice/audit'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @invoice_menu_id, '列表', NULL, 'crm:quoteInvoice:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @invoice_menu_id AND perms = 'crm:quoteInvoice:page');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @invoice_menu_id, '詳情', NULL, 'crm:quoteInvoice:info', 2, NULL, 2, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @invoice_menu_id AND perms = 'crm:quoteInvoice:info');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @invoice_menu_id, '審核', NULL, 'crm:quoteInvoice:audit', 2, NULL, 3, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @invoice_menu_id AND perms = 'crm:quoteInvoice:audit');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @invoice_menu_id, '預覽', NULL, 'crm:quoteInvoice:preview', 2, NULL, 4, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @invoice_menu_id AND perms = 'crm:quoteInvoice:preview');
