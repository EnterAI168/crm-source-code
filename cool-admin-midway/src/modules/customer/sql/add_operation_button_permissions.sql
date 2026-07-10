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

SET @customer_pool_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/customer/pool'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @customer_pool_menu_id, '傳送郵件', NULL, 'crm:customerPool:sendMail', 2, NULL, 7, NULL, 0, 0, NOW(), NOW()
WHERE @customer_pool_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @customer_pool_menu_id AND perms = 'crm:customerPool:sendMail'
  );

SET @invoice_audit_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/invoice/audit'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @invoice_audit_menu_id, '檢視報價單', NULL, 'crm:quoteInvoice:quoteInfo', 2, NULL, 3, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_audit_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @invoice_audit_menu_id AND perms = 'crm:quoteInvoice:quoteInfo'
  );

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @invoice_audit_menu_id, '傳送發票', NULL, 'crm:quoteInvoice:send', 2, NULL, 6, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_audit_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @invoice_audit_menu_id AND perms = 'crm:quoteInvoice:send'
  );

SET @quote_order_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/quote/list'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @quote_order_menu_id, '新增報價單', NULL, 'crm:quoteOrder:add', 2, NULL, 2, NULL, 0, 0, NOW(), NOW()
WHERE @quote_order_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @quote_order_menu_id AND perms = 'crm:quoteOrder:add'
  );

UPDATE base_sys_menu
SET name = '新增報價單', updateTime = NOW()
WHERE parentId = @quote_order_menu_id
  AND perms = 'crm:quoteOrder:add';

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @quote_order_menu_id, '回款', NULL, 'crm:quoteOrder:receipt', 2, NULL, 9, NULL, 0, 0, NOW(), NOW()
WHERE @quote_order_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @quote_order_menu_id AND perms = 'crm:quoteOrder:receipt'
  );

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @quote_order_menu_id, '發票', NULL, 'crm:quoteOrder:invoice', 2, NULL, 10, NULL, 0, 0, NOW(), NOW()
WHERE @quote_order_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @quote_order_menu_id AND perms = 'crm:quoteOrder:invoice'
  );

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @quote_order_menu_id, '報價單PDF下載', NULL, 'crm:quoteOrder:downloadPdf', 2, NULL, 15, NULL, 0, 0, NOW(), NOW()
WHERE @quote_order_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @quote_order_menu_id AND perms = 'crm:quoteOrder:downloadPdf'
  );

UPDATE base_sys_menu
SET name = '報價單PDF下載', orderNum = 15, updateTime = NOW()
WHERE parentId = @quote_order_menu_id
  AND perms = 'crm:quoteOrder:downloadPdf';
