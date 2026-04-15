-- 客户表增加「行业」字段（字典类型编码：crmIndustry，请在「数据字典」中维护选项后执行本脚本）
ALTER TABLE `crm_customer_info`
  ADD COLUMN `industry` varchar(64) NULL COMMENT '行业(字典crmIndustry)' AFTER `remark`;
