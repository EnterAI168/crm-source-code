<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-search :items="poolSearchItems" />
		</cl-row>

		<cl-row>
			<cl-add-btn />
			<cl-multi-delete-btn />
			<el-button v-if="canImport" type="primary" @click="openImport">导入</el-button>
			<el-button link type="primary" @click="downloadTpl">下载导入模板</el-button>
			<input
				ref="fileRef"
				type="file"
				accept=".xlsx,.xls"
				style="display: none"
				@change="onFile"
			/>
			<cl-flex1 />
			<cl-search-key placeholder="关键字" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table">
				<template #column-companyInfo="{ scope }">
					<div class="crm-pool-block">
						<div class="crm-pool-line">
							<span class="crm-pool-k">公司名称：</span>
							<span class="crm-pool-v">{{ scope.row.companyName || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">地址：</span>
							<span class="crm-pool-v">{{ scope.row.address || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">统一编号：</span>
							<span class="crm-pool-v">{{ scope.row.taxNumber || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">汇款本公司：</span>
							<span class="crm-pool-v">{{ scope.row.remittanceLast5 || '—' }}</span>
						</div>
					</div>
				</template>
				<template #column-contactInfo="{ scope }">
					<div class="crm-pool-block">
						<div class="crm-pool-line">
							<span class="crm-pool-k">联系人：</span>
							<span class="crm-pool-v">{{ scope.row.contactName || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">手机号：</span>
							<span class="crm-pool-v">{{ scope.row.mobile || '—' }}</span>
						</div>
						<div class="crm-pool-line">
							<span class="crm-pool-k">邮箱：</span>
							<span class="crm-pool-v">{{ scope.row.email || '—' }}</span>
						</div>
					</div>
				</template>
			</cl-table>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />
	</cl-crud>

	<el-dialog v-model="assignVisible" title="分配业务员" width="420px" destroy-on-close>
		<el-form label-width="100px">
			<el-form-item label="业务员" required>
				<el-select
					v-model="assignForm.salesmanId"
					filterable
					placeholder="请选择业务员"
					style="width: 100%"
				>
					<el-option
						v-for="u in userOptions"
						:key="u.id"
						:label="`${u.name || u.nickName || ''} (${u.username})`"
						:value="u.id"
					/>
				</el-select>
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="assignVisible = false">取消</el-button>
			<el-button type="primary" @click="submitAssign">确定</el-button>
		</template>
	</el-dialog>
</template>

<script lang="ts" setup>
defineOptions({ name: 'crm-customer-pool' });

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';
import { checkPerm } from '/$/base';
import { useCrmIndustryDict } from '../utils/industryDict';
import CustomerPoolService from '../service/pool';
import {
	customerEmailRules,
	customerMobileRules,
	validateCustomerImportContact
} from '../utils/validate';

const customerPool = new CustomerPoolService();

const { options: industryOptions, tableDict: industryTableDict } = useCrmIndustryDict();

const Crud = useCrud({ service: customerPool }, app => app.refresh());

const poolSearchItems = computed(() => {
	const items: any[] = [
		{ label: '公司名称', prop: 'companyName', component: { name: 'el-input' } },
		{ label: '客户名称', prop: 'contactName', component: { name: 'el-input' } },
		{ label: '手机号', prop: 'mobile', component: { name: 'el-input' } },
		{
			label: '邮箱',
			prop: 'email',
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入' } }
		},
		{
			label: '行业',
			prop: 'industry',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					placeholder: '请选择',
					options: industryOptions
				}
			}
		}
	];
	return items;
});

const canAssign = computed(() => checkPerm('crm:customerPool:assignSalesman'));
const canImport = computed(() => checkPerm('crm:customerPool:import'));

const assignVisible = ref(false);
const assignForm = ref<{ id: number | null; salesmanId: number | undefined }>({
	id: null,
	salesmanId: undefined
});
const userOptions = ref<any[]>([]);
const fileRef = ref<HTMLInputElement | null>(null);
const currentRow = ref<any>(null);

useTable({
	columns: [
		{ type: 'selection' },
		{
			label: '公司信息',
			prop: 'companyInfo',
			minWidth: 300,
			align: 'left'
		},
		{
			label: '联系人信息',
			prop: 'contactInfo',
			minWidth: 260,
			align: 'left'
		},
		{
			label: '行业',
			prop: 'industry',
			minWidth: 100,
			dict: industryTableDict
		},
		{ label: '备注', prop: 'remark', minWidth: 140, showOverflowTooltip: true },
		{ label: '创建时间', prop: 'createTime', minWidth: 160 },
		{
			type: 'op',
			width: 360,	
			buttons: () => {
				const btns: any[] = ['edit', 'delete'];
				if (canAssign.value) {
					btns.push({
						label: '分配业务员',
						type: 'primary',
						onClick({ scope }: { scope: any }) {
							currentRow.value = scope.row;
							assignForm.value = { id: scope.row.id, salesmanId: undefined };
							assignVisible.value = true;
						}
					});
				}
				return btns;
			}
		}
	]
});

useUpsert({
	dialog: { width: '720px' },
	props: { labelWidth: '110px' },
	items: [
		sectionDivider('公司信息', '_secCo'),
		{
			label: '公司名称',
			prop: 'companyName',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入公司名称' } }
		},
		{
			label: '地址',
			prop: 'address',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入地址' } }
		},
		{
			label: '统一编号',
			prop: 'taxNumber',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入统一编号' } }
		},
		{
			label: '汇款本公司',
			prop: 'remittanceLast5',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入汇款本公司' } }
		},
		sectionDivider('联系人信息', '_secCt'),
		{
			label: '客户名称',
			prop: 'contactName',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入客户名称' } }
		},
		{
			label: '手机号',
			prop: 'mobile',
			rules: customerMobileRules,
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入11位手机号' } }
		},
		{
			label: '邮箱',
			prop: 'email',
			rules: customerEmailRules,
			component: { name: 'el-input', props: { clearable: true, placeholder: '请输入邮箱' } }
		},
		{
			label: '备注',
			prop: 'remark',
			component: { name: 'el-input', props: { type: 'textarea', rows: 4, placeholder: '请输入备注' } }
		},
		{
			label: '行业',
			prop: 'industry',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					filterable: true,
					placeholder: '请选择行业',
					options: industryOptions
				}
			}
		}
	],
	onSubmit(data, { next }) {
		const payload: Record<string, any> = { ...data };
		Object.keys(payload).forEach(k => {
			if (k.startsWith('_')) {
				delete payload[k];
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

async function loadUsers() {
	userOptions.value = (await customerPool.salesmenOptions()) || [];
}

function openImport() {
	fileRef.value?.click();
}

function downloadTpl() {
	const header = [
		'公司名称',
		'地址',
		'统一编号',
		'汇款本公司',
		'客户名称',
		'手机号',
		'邮箱',
		'备注',
		'行业'
	];
	const ws = XLSX.utils.aoa_to_sheet([header]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, '客户导入');
	XLSX.writeFile(wb, '客户公池导入模板.xlsx');
}

function normalizeRow(raw: Record<string, any>) {
	const pick = (keys: string[]) => {
		for (const k of keys) {
			if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
				return String(raw[k]).trim();
			}
		}
		return '';
	};
	return {
		companyName: pick(['公司名称', 'companyName']),
		address: pick(['地址', 'address']),
		taxNumber: pick(['统一编号', '统一编码', 'taxNumber']),
		remittanceLast5: pick(['汇款本公司', '汇款本卡号', '汇款末五码', 'remittanceLast5']),
		contactName: pick(['客户名称', 'contactName', '联系人']),
		mobile: pick(['手机号', 'mobile', '电话']),
		email: pick(['邮箱', 'email']),
		remark: pick(['备注', 'remark']),
		isVip: pick(['是否VIP', 'isVip']) === '1' || pick(['是否VIP', 'isVip']) === '是' ? 1 : 0,
		industry: pick(['行业', 'industry'])
	};
}

async function onFile(ev: Event) {
	const input = ev.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;
	try {
		const buf = await file.arrayBuffer();
		const wb = XLSX.read(buf, { type: 'array' });
		const sheet = wb.Sheets[wb.SheetNames[0]];
		const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
		const list: ReturnType<typeof normalizeRow>[] = [];
		for (let i = 0; i < rows.length; i++) {
			const r = normalizeRow(rows[i]);
			if (!r.companyName && !r.contactName && !r.mobile) {
				continue;
			}
			const excelRow = i + 2;
			const err = validateCustomerImportContact(r.mobile, r.email, excelRow);
			if (err) {
				ElMessage.error(err);
				return;
			}
			list.push(r);
		}
		if (!list.length) {
			ElMessage.warning('未解析到有效数据');
			return;
		}
		await customerPool.importData({ list });
		ElMessage.success(`成功导入 ${list.length} 条`);
		Crud.value?.refresh();
	} catch (e: any) {
		ElMessage.error(e?.message || '导入失败');
	}
}

async function submitAssign() {
	if (assignForm.value.salesmanId == null || !assignForm.value.id) {
		ElMessage.warning('请选择业务员');
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
.crm-pool-block {
	line-height: 1.65;
	font-size: 13px;
	color: var(--el-text-color-primary);
}

.crm-pool-line {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 0 4px;
	margin-bottom: 4px;

	&:last-child {
		margin-bottom: 0;
	}
}

.crm-pool-k {
	flex: 0 0 auto;
	color: var(--el-text-color-secondary);
	white-space: nowrap;
}

.crm-pool-v {
	flex: 1;
	min-width: 0;
	word-break: break-all;
}

/* 表单内分组分割线间距（新增/编辑弹窗） */
:deep(.cl-form__items .el-divider--horizontal) {
	margin: 4px 0 14px;
}
</style>
