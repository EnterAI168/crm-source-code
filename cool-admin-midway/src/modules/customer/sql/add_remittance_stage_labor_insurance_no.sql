ALTER TABLE `crm_remittance_stage`
ADD COLUMN `laborInsuranceNo` varchar(100) NULL COMMENT '勞保單' AFTER `voucherFile`;
