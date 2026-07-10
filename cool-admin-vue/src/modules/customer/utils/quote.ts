export const quoteTypeOptions = [
	{ label: '新客', value: 1 },
	{ label: '續約', value: 2 }
];

export const quoteStatusOptions = [
	{ label: '跟進中', value: 1, type: 'info' },
	{ label: '待審核', value: 2, type: 'warning' },
	{ label: '審核失敗', value: 3, type: 'danger' },
	{ label: '審核成功', value: 4, type: 'success' },
	{ label: '已發報價', value: 5, type: 'success' },
	{ label: '已完成', value: 6, type: 'success' },
	{ label: '已結束', value: 7, type: 'info' }
];

export const quoteAuditStatusOptions = [
	{ label: '未提交', value: 0, type: 'info' },
	{ label: '待審核', value: 1, type: 'warning' },
	{ label: '審核通過', value: 2, type: 'success' },
	{ label: '審核拒絕', value: 3, type: 'danger' }
];

export const quoteAssignStatusOptions = [
	{ label: '未分配', value: 0, type: 'info' },
	{ label: '待分配', value: 1, type: 'warning' },
	{ label: '已分配', value: 2, type: 'success' }
];

export const quoteProductTypeOptions = [
	{ label: '主力產品', value: 1 },
	{ label: '一次性產品', value: 2 },
	{ label: '附加產品', value: 3 }
];

export const quoteSendTypeOptions = [
	{ label: '郵件傳送', value: 1 },
	{ label: '僅標記已傳送', value: 2 }
];

export const quoteAuditActionOptions = [
	{ label: '審核通過', value: 2 },
	{ label: '審核拒絕', value: 3 }
];

function getLabel(options: Array<{ label: string; value: number | string }>, value?: number | string) {
	return options.find(item => String(item.value) === String(value))?.label || '-';
}

export function getQuoteTypeLabel(value?: number) {
	return getLabel(quoteTypeOptions, value);
}

export function getQuoteStatusLabel(value?: number) {
	return getLabel(quoteStatusOptions, value);
}

export function getQuoteAuditStatusLabel(value?: number) {
	return getLabel(quoteAuditStatusOptions, value);
}

export function getQuoteAssignStatusLabel(value?: number) {
	return getLabel(quoteAssignStatusOptions, value);
}

export function getQuoteProductTypeLabel(value?: number) {
	return getLabel(quoteProductTypeOptions, value);
}

export function getQuoteSendTypeLabel(value?: number) {
	return getLabel(quoteSendTypeOptions, value);
}
