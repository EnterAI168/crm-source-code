-- 1. 查詢 CRM Customer 父選單的 ID
-- SELECT id FROM base_sys_menu WHERE name = 'CRM Customer';
-- 假設父選單 ID 為 X，將下面的 X 替換為實際的 ID

-- 2. 插入匯款單主選單
INSERT INTO base_sys_menu (createTime, updateTime, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
VALUES (NOW(), NOW(), X, 'Remittance', '/crm/remittance/list', 'crm:remittance:page', 1, 'icon-money', 3, 'modules/customer/views/remittance.vue', 1, 1);

-- 3. 獲取剛插入的匯款單選單 ID
-- SELECT id FROM base_sys_menu WHERE name = 'Remittance' AND router = '/crm/remittance/list';
-- 假設匯款單選單 ID 為 Y，將下面的 Y 替換為實際的 ID

-- 4. 插入匯款單子選單（權限按鈕）
INSERT INTO base_sys_menu (createTime, updateTime, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
VALUES
(NOW(), NOW(), Y, '列表', NULL, 'crm:remittance:page', 2, NULL, 1, NULL, 0, 0),
(NOW(), NOW(), Y, 'Add', NULL, 'crm:remittance:add', 2, NULL, 2, NULL, 0, 0),
(NOW(), NOW(), Y, 'Update', NULL, 'crm:remittance:update', 2, NULL, 3, NULL, 0, 0),
(NOW(), NOW(), Y, 'Delete', NULL, 'crm:remittance:delete', 2, NULL, 4, NULL, 0, 0),
(NOW(), NOW(), Y, '檢視', NULL, 'crm:remittance:info', 2, NULL, 5, NULL, 0, 0),
(NOW(), NOW(), Y, 'Remittance', NULL, 'crm:remittance:remit', 2, NULL, 6, NULL, 0, 0);

-- 5. 為管理員角色分配匯款單選單權限
-- 查詢管理員角色 ID
-- SELECT id FROM base_sys_role WHERE label = 'admin' OR name = '管理員';
-- 假設管理員角色 ID 為 Z，將下面的 Z 替換為實際的 ID

-- 6. 插入角色選單關聯
INSERT INTO base_sys_role_menu (createTime, updateTime, roleId, menuId)
SELECT NOW(), NOW(), Z, id FROM base_sys_menu WHERE perms LIKE 'crm:remittance:%';
