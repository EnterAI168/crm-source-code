-- 客戶狀態字典：crmCustomerStatus
-- 執行後，前端客戶公池狀態篩選將從字典表讀取這 6 個選項

INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`)
SELECT '客戶狀態', 'crmCustomerStatus', NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_type` WHERE `key` = 'crmCustomerStatus'
);

SET @crm_customer_status_type_id := (
	SELECT `id` FROM `dict_type` WHERE `key` = 'crmCustomerStatus' LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `createTime`, `updateTime`)
SELECT @crm_customer_status_type_id, '跟進中', '1', 1, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_info` WHERE `typeId` = @crm_customer_status_type_id AND `value` = '1'
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `createTime`, `updateTime`)
SELECT @crm_customer_status_type_id, '已失效', '2', 2, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_info` WHERE `typeId` = @crm_customer_status_type_id AND `value` = '2'
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `createTime`, `updateTime`)
SELECT @crm_customer_status_type_id, '報價中', '3', 3, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_info` WHERE `typeId` = @crm_customer_status_type_id AND `value` = '3'
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `createTime`, `updateTime`)
SELECT @crm_customer_status_type_id, '已發報價單', '4', 4, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_info` WHERE `typeId` = @crm_customer_status_type_id AND `value` = '4'
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `createTime`, `updateTime`)
SELECT @crm_customer_status_type_id, '報價審核中', '5', 5, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_info` WHERE `typeId` = @crm_customer_status_type_id AND `value` = '5'
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `createTime`, `updateTime`)
SELECT @crm_customer_status_type_id, '已完成', '6', 6, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_info` WHERE `typeId` = @crm_customer_status_type_id AND `value` = '6'
);
