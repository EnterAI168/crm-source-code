ALTER TABLE `crm_supplier`
ADD COLUMN `remittanceInfo` varchar(500) NULL COMMENT '匯款資訊' AFTER `email`;
