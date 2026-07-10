<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-search :items="poolSearchItems" />
		</cl-row>

		<cl-row>
			<cl-add-btn />
			<cl-multi-delete-btn />
			<el-button v-if="canImport" type="primary" @click="openImport">匯入</el-button>
			<el-button type="success" :loading="exporting" @click="exportPoolData">匯出</el-button>
			<cl-flex1 />
		</cl-row>

		<cl-row>
			<cl-table ref="Table">
				<template #column-companyInfo="{ scope }">
					<!-- <div class="crm-pool-card"> -->
						<div class="crm-pool-line">
							<span class="crm-pool-k">公司名稱：</span>
							<span class="crm-pool-v">{{ scope.row.companyName || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">地址：</span>
							<span class="crm-pool-v">{{ scope.row.address || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">統一編號：</span>
							<span class="crm-pool-v">{{ scope.row.taxNumber || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">匯款本公司：</span>
							<span class="crm-pool-v">{{ scope.row.remittanceLast5 || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">廣告投放：</span>
							<span class="crm-pool-v">{{ getAdCustomerLabel(scope.row) }}</span>
						</div>
					<!-- </div> -->
				</template>

				<template #column-contactInfo="{ scope }">
					<!-- <div class="crm-pool-card crm-pool-card--light"> -->
						<div class="crm-pool-line">
							<span class="crm-pool-k">聯絡人：</span>
							<span class="crm-pool-v">{{ scope.row.contactName || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">手機號碼：</span>
							<span class="crm-pool-v">{{ scope.row.mobile || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">信箱：</span>
							<span class="crm-pool-v">{{ scope.row.email || '—' }}</span>
						</div>
					<!-- </div> -->
				</template>

				<template #column-level="{ scope }">
					<el-tag :type="scope.row.isVip ? 'warning' : 'info'" effect="light" round>
						{{ getLevelLabel(scope.row) }}
					</el-tag>
				</template>

				<template #column-dealCount="{ scope }">
					<span class="crm-pool-stat">{{ toNumber(scope.row.dealCount) }}</span>
				</template>

				<template #column-dealAmount="{ scope }">
					<span class="crm-pool-stat">{{ toMoney(scope.row.dealAmount) }}</span>
				</template>

				<template #column-createTime="{ scope }">
					<span class="crm-pool-time">{{ scope.row.createTime || '—' }}</span>
				</template>
			</cl-table>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />
	</cl-crud>

	<el-dialog v-model="importDialogVisible" title="匯入客戶公池" width="520px">
		<div class="crm-import-dialog">
			<div class="crm-import-dialog__tip">
				請先下載匯入模板，按模板填寫客戶資料後選擇 Excel 檔案匯入。
			</div>
			<div class="crm-import-dialog__actions">
				<el-button type="primary" plain @click="downloadTpl">下載匯入模板</el-button>
				<el-button type="primary" :loading="importing" @click="selectImportFile">
					選擇檔案匯入
				</el-button>
			</div>
			<input
				ref="fileRef"
				type="file"
				accept=".xlsx,.xls"
				style="display: none"
				@change="onFile"
			/>
		</div>
	</el-dialog>

	<el-dialog v-model="assignVisible" title="分配業務員" width="420px" destroy-on-close>
		<el-form label-width="100px">
			<el-form-item label="業務員" required>
				<el-select v-model="assignForm.salesmanId" filterable placeholder="請選擇業務員" style="width: 100%">
					<el-option
						v-for="user in userOptions"
						:key="user.id"
						:label="`${user.name || ''} (${user.username})`"
						:value="user.id"
					/>
				</el-select>
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="assignVisible = false">取消</el-button>
			<el-button type="primary" @click="submitAssign">確定</el-button>
		</template>
	</el-dialog>

	<quote-order-dialog
		v-model="sharedQuoteDialogVisible"
		:customer="quoteCustomer"
		@saved="handleSharedQuoteSaved"
	/>
</template>

<script lang="ts" setup>
defineOptions({ name: 'crm-customer-pool' });

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';
import { checkPerm } from '/$/base';
import { useCrmIndustryDict } from '../utils/industryDict';
import { useCrmCustomerStatusDict } from '../utils/statusDict';
import CustomerPoolService from '../service/pool';
import QuoteOrderDialog from '../components/quote-order-dialog.vue';
import {
	customerEmailRules,
	EMAIL_PATTERN,
	validateCustomerImportContact,
	validateCustomerImportRequired
} from '../utils/validate';

const customerPool = new CustomerPoolService();
const { options: industryOptions } = useCrmIndustryDict();
const { options: customerStatusOptions } = useCrmCustomerStatusDict();

const Crud = useCrud({ service: customerPool }, app => app.refresh());

const poolSearchItems = computed(() => [
	{
		label: '客戶名稱',
		prop: 'contactName',
		component: {
			name: 'el-input',
			props: { clearable: true, placeholder: '請輸入客戶名稱' }
		}
	},
	{
		label: '狀態',
		prop: 'status',
		component: {
			name: 'cl-select',
			props: {
				clearable: true,
				placeholder: '請選擇狀態',
				options: customerStatusOptions
			}
		}
	},
	{
		label: '手機號碼',
		prop: 'mobile',
		component: {
			name: 'el-input',
			props: { clearable: true, placeholder: '請輸入手機號碼' }
		}
	},
	{
		label: '信箱',
		prop: 'email',
		component: {
			name: 'el-input',
			props: { clearable: true, placeholder: '請輸入信箱' }
		}
	},
	{
		label: '是否廣告投放客戶',
		prop: 'isAdCustomer',
		component: {
			name: 'cl-select',
			props: {
				clearable: true,
				placeholder: '請選擇',
				options: [
					{ label: '是', value: 1 },
					{ label: '否', value: 0 }
				]
			}
		}
	}
]);

const canAssign = computed(() => checkPerm('crm:customerPool:assignSalesman'));
const canImport = computed(() => checkPerm('crm:customerPool:import'));
const canSendMail = computed(() => checkPerm('crm:customerPool:sendMail'));
const canQuotationAdd = computed(
	() => checkPerm('crm:customerPool:quotationAdd') && checkPerm('crm:quoteOrder:add')
);

const assignVisible = ref(false);
const assignForm = ref<{ id: number | null; salesmanId: number | undefined }>({
	id: null,
	salesmanId: undefined
});
const userOptions = ref<any[]>([]);
const fileRef = ref<HTMLInputElement | null>(null);
const importDialogVisible = ref(false);
const importing = ref(false);
const exporting = ref(false);
const sendingMail = ref(false);
const sharedQuoteDialogVisible = ref(false);
const quoteCustomer = ref<Record<string, any> | null>(null);

useTable({
	columns: [
		{ type: 'selection' },
		{
			label: '公司資訊',
			prop: 'companyInfo',
			minWidth: 320,
			align: 'left'
		},
		{
			label: '聯絡人資訊',
			prop: 'contactInfo',
			minWidth: 260,
			align: 'left'
		},
		{
			label: '等級',
			prop: 'level',
			width: 100,
			align: 'center'
		},
		{
			label: '累計成交次數',
			prop: 'dealCount',
			width: 110,
			align: 'center'
		},
		{
			label: '累計成交金額',
			prop: 'dealAmount',
			width: 110,
			align: 'center'
		},
		{
			label: '備註',
			prop: 'remark',
			minWidth: 150,
			showOverflowTooltip: true
		},
		{
			label: '建立時間',
			prop: 'createTime',
			minWidth: 180,
			showOverflowTooltip: true
		},
		{
			type: 'op',
			width: 320,
			fixed: 'right',
			buttons: ({ scope }) => [
				{
					label: '新增報價單',
					type: 'primary',
					hidden: !canQuotationAdd.value,
					onClick() {
						openQuoteDialog(scope.row);
					}
				},
				{
					label: '分配',
					type: 'primary',
					hidden: !canAssign.value,
					onClick() {
						assignForm.value = { id: scope.row.id, salesmanId: undefined };
						assignVisible.value = true;
					}
				},
				'edit',
				'delete',
				{
					label: '傳送郵件',
					type: 'success',
					hidden: !canSendMail.value,
					onClick() {
						sendMail(scope.row);
					}
				}
			]
		}
	]
});

useUpsert({
	dialog: { width: '720px' },
	props: { labelWidth: '110px' },
	items: [
		sectionDivider('公司資訊', '_secCo'),
		{
			label: '公司名稱',
			prop: 'companyName',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入公司名稱' } }
		},
		{
			label: '地址',
			prop: 'address',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入地址' } }
		},
		{
			label: '統一編號',
			prop: 'taxNumber',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入統一編號' } }
		},
		{
			label: '匯款本公司',
			prop: 'remittanceLast5',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入匯款本公司' } }
		},
		{
			label: '是否廣告投放客戶',
			prop: 'isAdCustomer',
			value: 0,
			component: {
				name: 'el-switch',
				props: { activeValue: 1, inactiveValue: 0 }
			}
		},
		sectionDivider('聯絡人資訊', '_secCt'),
		{
			label: '聯絡人',
			prop: 'contactName',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入聯絡人' } }
		},
		{
			label: '手機號碼',
			prop: 'mobile',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入手機號碼' } }
		},
		{
			label: '信箱',
			prop: 'email',
			rules: customerEmailRules,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入信箱' } }
		},
		{
			label: '備註',
			prop: 'remark',
			component: { name: 'el-input', props: { type: 'textarea', rows: 4, placeholder: '請輸入備註' } }
		},
		{
			label: '行業',
			prop: 'industry',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					filterable: true,
					placeholder: '請選擇行業',
					options: industryOptions
				}
			}
		}
	],
	onSubmit(data, { next }) {
		const payload: Record<string, any> = { ...data };
		Object.keys(payload).forEach(key => {
			if (key.startsWith('_')) {
				delete payload[key];
			}
		});
		delete payload.salesmanId;
		delete payload.isVip;
		return next(payload);
	}
});

function sectionDivider(title: string, prop: string) {
	return {
		label: '',
		prop,
		span: 24,
		component: {
			name: 'el-divider',
			props: { contentPosition: 'left' },
			slots: {
				default: () => title
			}
		}
	};
}

function getLevelLabel(row: any) {
	return Number(row?.isVip || 0) === 1 ? 'VIP' : '普通';
}

function getAdCustomerLabel(row: any) {
	return Number(row?.isAdCustomer || 0) === 1 ? '是' : '否';
}

function toNumber(value: any) {
	const amount = Number(value ?? 0);
	return Number.isNaN(amount) ? 0 : amount;
}

function toMoney(value: any) {
	return `${toNumber(value).toLocaleString('zh-TW', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	})}`;
}

function validateCustomerRequiredForQuote(row: any) {
	const requiredFields = [
		{ key: 'companyName', label: '公司名稱' },
		{ key: 'address', label: '地址' },
		{ key: 'taxNumber', label: '統一編號' },
		{ key: 'remittanceLast5', label: '匯款本公司' },
		{ key: 'contactName', label: '聯絡人' },
		{ key: 'mobile', label: '手機號碼' },
		{ key: 'email', label: '信箱' }
	];
	const missingFields = requiredFields
		.filter(item => String(row?.[item.key] ?? '').trim() === '')
		.map(item => item.label);

	if (missingFields.length > 0) {
		ElMessage.warning(`請先補全客戶必填資訊：${missingFields.join('、')}`);
		return false;
	}

	const email = String(row?.email || '').trim();
	if (!EMAIL_PATTERN.test(email)) {
		ElMessage.warning('請先補全正確的客戶信箱後再新增報價單');
		return false;
	}

	return true;
}

function openQuoteDialog(row: any) {
	if (!validateCustomerRequiredForQuote(row)) {
		return;
	}
	quoteCustomer.value = row ? { ...row } : null;
	sharedQuoteDialogVisible.value = true;
}

async function handleSharedQuoteSaved() {
	sharedQuoteDialogVisible.value = false;
	await Crud.value?.refresh();
}

async function loadUsers() {
	userOptions.value = (await customerPool.salesmenOptions()) || [];
}

function openImport() {
	importDialogVisible.value = true;
}

function selectImportFile() {
	fileRef.value?.click();
}

function downloadTpl() {
	const header = ['公司名稱', '地址', '統一編號', '匯款本公司', '是否廣告投放客戶', '聯絡人', '手機號碼', '信箱', '備註'];
	const ws = XLSX.utils.aoa_to_sheet([header]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, '客戶匯入');
	XLSX.writeFile(wb, '客戶公池匯入模板.xlsx');
}

function getCurrentSearchParams() {
	const params = Crud.value?.getParams?.() || {};
	const query: Record<string, any> = { ...params, page: 1, size: 10000 };
	Object.keys(query).forEach(key => {
		if (query[key] === undefined || query[key] === null || query[key] === '') {
			delete query[key];
		}
	});
	return query;
}

async function exportPoolData() {
	if (exporting.value) {
		return;
	}
	exporting.value = true;
	try {
		const res: any = await customerPool.page(getCurrentSearchParams());
		const rows = Array.isArray(res?.list) ? res.list : [];
		if (!rows.length) {
			ElMessage.warning('暫無可匯出資料');
			return;
		}

		const sheetRows = rows.map((row: any) => ({
			公司名稱: row.companyName || '',
			地址: row.address || '',
			統一編號: row.taxNumber || '',
			匯款本公司: row.remittanceLast5 || '',
			廣告投放: getAdCustomerLabel(row),
			聯絡人: row.contactName || '',
			手機號碼: row.mobile || '',
			信箱: row.email || '',
			等級: getLevelLabel(row),
			累計成交次數: toNumber(row.dealCount),
			累計成交金額: toMoney(row.dealAmount),
			備註: row.remark || '',
			建立時間: row.createTime || ''
		}));
		const ws = XLSX.utils.json_to_sheet(sheetRows);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, '客戶公池');
		XLSX.writeFile(wb, '客戶公池匯出.xlsx');
		ElMessage.success('客戶公池匯出成功');
	} catch (error: any) {
		ElMessage.error(error?.message || '客戶公池匯出失敗');
	} finally {
		exporting.value = false;
	}
}

function normalizeRow(raw: Record<string, any>) {
	const pick = (keys: string[]) => {
		for (const key of keys) {
			if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
				return String(raw[key]).trim();
			}
		}
		return '';
	};

	const adCustomerText = pick(['是否廣告投放客戶', '廣告投放客戶', 'isAdCustomer']);

	return {
		companyName: pick(['公司名稱', 'companyName']),
		address: pick(['地址', 'address']),
		taxNumber: pick(['統一編號', '統一編碼', 'taxNumber']),
		remittanceLast5: pick(['匯款本公司', '匯款本卡號', '匯款末五碼', 'remittanceLast5']),
		isAdCustomer: adCustomerText === '1' || adCustomerText === '是' ? 1 : 0,
		contactName: pick(['聯絡人', '客戶名稱', 'contactName']),
		mobile: pick(['手機號碼', 'mobile', '電話']),
		email: pick(['信箱', 'email']),
		remark: pick(['備註', 'remark']),
		isVip: pick(['是否VIP', 'isVip']) === '1' || pick(['是否VIP', 'isVip']) === '是' ? 1 : 0
	};
}

async function onFile(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';

	if (!file) return;

	importing.value = true;
	try {
		const buffer = await file.arrayBuffer();
		const workbook = XLSX.read(buffer, { type: 'array' });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
		const list: ReturnType<typeof normalizeRow>[] = [];

		for (let index = 0; index < rows.length; index++) {
			const row = normalizeRow(rows[index]);
			if (!row.companyName && !row.contactName && !row.mobile) continue;

			const excelRow = index + 2;
			const requiredError = validateCustomerImportRequired(row, excelRow);
			if (requiredError) {
				ElMessage.error(requiredError);
				return;
			}
			const error = validateCustomerImportContact(row.mobile, row.email, excelRow);
			if (error) {
				ElMessage.error(error);
				return;
			}

			list.push(row);
		}

		if (!list.length) {
			ElMessage.warning('未解析到有效資料');
			return;
		}

		await customerPool.importData({ list });
		ElMessage.success(`成功匯入 ${list.length} 條`);
		importDialogVisible.value = false;
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '匯入失敗');
	} finally {
		importing.value = false;
	}
}

async function sendMail(row: any) {
	const email = String(row?.email || '').trim();
	if (!email) {
		ElMessage.warning('該客戶暫無信箱');
		return;
	}
	if (!EMAIL_PATTERN.test(email)) {
		ElMessage.warning('客戶信箱格式不正確，請先修改後再傳送');
		return;
	}
	const id = Number(row?.id || 0);
	if (!id || sendingMail.value) {
		return;
	}
	sendingMail.value = true;
	try {
		await customerPool.sendMail({
			id
		});
		ElMessage.success('郵件傳送成功');
	} catch (error: any) {
		ElMessage.error(error?.message || '郵件傳送失敗');
	} finally {
		sendingMail.value = false;
	}
}

async function submitAssign() {
	if (assignForm.value.salesmanId == null || !assignForm.value.id) {
		ElMessage.warning('請選擇業務員');
		return;
	}

	await customerPool.assignSalesman({
		id: assignForm.value.id,
		salesmanId: assignForm.value.salesmanId
	});
	ElMessage.success('分配成功');
	assignVisible.value = false;
	Crud.value?.refresh();
}

onMounted(() => {
	if (canAssign.value) {
		loadUsers();
	}
});
</script>

<style scoped lang="scss">
.crm-pool-card {
	padding: 10px 12px;
	border-radius: 12px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
	border: 1px solid rgba(226, 232, 240, 0.9);
}

.crm-pool-card--light {
	background: #fcfdff;
}

.crm-pool-card__title {
	margin-bottom: 8px;
	font-size: 14px;
	font-weight: 700;
	color: #0f172a;
}

.crm-pool-line {
	display: flex;
	align-items: flex-start;
	gap: 4px;
	margin-bottom: 4px;

	&:last-child {
		margin-bottom: 0;
	}
}

.crm-pool-k {
	flex: 0 0 auto;
	color: #64748b;
	white-space: nowrap;
}

.crm-pool-v {
	flex: 1;
	min-width: 0;
	color: #1e293b;
	word-break: break-all;
}

.crm-pool-stat {
	font-weight: 700;
	color: #0f172a;
}

.crm-pool-time {
	display: inline-block;
	white-space: nowrap;
}

.crm-pool-money {
	font-weight: 700;
	color: #2563eb;
}

.crm-import-dialog {
	padding: 4px 0 8px;
}

.crm-import-dialog__tip {
	margin-bottom: 18px;
	color: var(--el-text-color-regular);
	line-height: 1.7;
}

.crm-import-dialog__actions {
	display: flex;
	justify-content: center;
	gap: 12px;
}

:deep(.cl-form__items .el-divider--horizontal) {
	margin: 4px 0 14px;
}

:deep(.el-table .cell) {
	line-height: 1.45;
}
</style>
