-- 報價價格最低佔預設價格比例（%），預設 85
INSERT INTO `base_sys_param` (`keyName`, `name`, `data`, `dataType`, `remark`, `createTime`, `updateTime`)
SELECT
  'quote_min_price_rate',
  '報價最低價格比例',
  '85',
  0,
  '報價單明細：報價價格必須高於「預設價格 × 本比例%」。例如 85 表示必須高於預設價格的 85%',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `base_sys_param` WHERE `keyName` = 'quote_min_price_rate'
);
