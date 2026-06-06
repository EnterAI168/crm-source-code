-- 客戶表增加「行業」欄位（字典型別編碼：crmIndustry，請在「資料字典」中維護選項後執行本指令碼）
ALTER TABLE `crm_customer_info`
  ADD COLUMN `industry` varchar(64) NULL COMMENT '行業(字典crmIndustry)' AFTER `remark`;
