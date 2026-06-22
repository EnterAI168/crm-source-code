ALTER TABLE `crm_remittance`
ADD COLUMN `uploadFiles` text NULL COMMENT '上傳檔案' AFTER `salesmanId`,
ADD COLUMN `invoiceFiles` text NULL COMMENT '上傳發票' AFTER `uploadFiles`;
