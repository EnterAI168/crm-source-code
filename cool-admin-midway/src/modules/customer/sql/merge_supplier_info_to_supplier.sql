INSERT INTO `crm_supplier` (
  `createTime`,
  `updateTime`,
  `companyName`,
  `category`,
  `unifiedNo`,
  `contactName`,
  `contactPhone`,
  `email`,
  `address`,
  `status`,
  `remark`,
  `isDeleted`
)
SELECT
  a.`createTime`,
  a.`updateTime`,
  a.`companyName`,
  a.`category`,
  a.`taxNumber`,
  NULL,
  NULL,
  a.`email`,
  a.`address`,
  1,
  a.`remark`,
  IFNULL(a.`isDeleted`, 0)
FROM `crm_supplier_info` a
LEFT JOIN `crm_supplier` b
  ON b.`companyName` = a.`companyName`
 AND IFNULL(b.`unifiedNo`, '') = IFNULL(a.`taxNumber`, '')
 AND IFNULL(b.`isDeleted`, 0) = 0
WHERE b.`id` IS NULL;
