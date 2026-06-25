ALTER TABLE `crm_remittance`
ADD COLUMN `accountInfo` varchar(500) NULL COMMENT '賬戶資訊' AFTER `supplierEmail`;
