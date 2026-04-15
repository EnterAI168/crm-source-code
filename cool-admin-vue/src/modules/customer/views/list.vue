<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-search :items="listSearchItems" />
		</cl-row>

		<cl-row>
			<cl-add-btn />
			<el-button v-if="canImport" type="primary" @click="openImport">导入</el-button>
			<el-button v-if="canImport" link type="primary" @click="downloadTpl">下载导入模板</el-button>
			<input
				ref="fileRef"
				type="file"
				accept=".xlsx,.xls"
				style="display: none"
				@change="onImportFile"
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
				<template #column-rowActions="{ scope }">
					<div class="crm-list-actions">
						<div class="crm-list-actions-row">
							<el-button v-if="canQuotationView" link @click="onQuotationView">查看报价单</el-button>
							<el-button v-if="canFollow" type="primary" link @click="openFollow(scope.row)">
								跟进记录
							</el-button>
							<el-dropdown
								v-if="moreMenuVisible(scope.row)"
								trigger="click"
								@command="(cmd: string) => onMoreCommand(cmd, scope.row)"
							>
								<span class="crm-more-link">
									更多
									<el-icon class="crm-more-icon"><ArrowDown /></el-icon>
								</span>
								<template #dropdown>
									<el-dropdown-menu>
										<el-dropdown-item v-if="canEditCustomer" command="editCustomer">
											编辑客户信息
										</el-dropdown-item>
										<el-dropdown-item v-if="canQuotationAdd" command="quotationAdd">
											新增报价单
										</el-dropdown-item>
										<el-dropdown-item v-if="canMoveToPool" command="moveToPool">
											移入公池
										</el-dropdown-item>
										<el-dropdown-item
											v-if="canRowSetVip && Number(scope.row.isVip) !== 1"
											command="setVip"
										>
											设为VIP
										</el-dropdown-item>
										<el-dropdown-item
											v-if="canRowCancelVip && Number(scope.row.isVip) === 1"
											command="cancelVip"
										>
											取消VIP
										</el-dropdown-item>
									</el-dropdown-menu>
								</template>
							</el-dropdown>
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

	<!-- 跟进记录 -->
	<el-dialog
		v-model="followVisible"
		:title="followTitle"
		width="960px"
		destroy-on-close
		class="crm-follow-dialog"
		@open="onFollowDialogOpen"
	>
		<el-table v-loading="followLoading" :data="followList" border stripe style="width: 100%">
			<el-table-column type="index" label="序号" width="64" :index="followIndexMethod" />
			<el-table-column prop="content" label="跟进内容" min-width="160" show-overflow-tooltip />
			<el-table-column prop="followTime" label="跟进时间" width="170" />
			<el-table-column prop="nextFollowTime" label="预计下次跟进时间" width="170" />
			<el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
		</el-table>

		<div class="follow-page">
			<el-pagination
				v-model:current-page="followQuery.page"
				v-model:page-size="followQuery.size"
				:total="followTotal"
				:page-sizes="[10, 20, 50]"
				layout="total, sizes, prev, pager, next"
				background
				@size-change="loadFollowList"
				@current-change="loadFollowList"
			/>
		</div>

		<div v-if="canFollow" class="follow-add-bar">
			<el-button type="primary" @click="openAddFollow">新增跟进记录</el-button>
		</div>
	</el-dialog>

	<!-- 新增跟进 -->
	<el-dialog v-model="addFollowVisible" title="新增跟进记录" width="520px" destroy-on-close append-to-body>
		<el-form ref="addFollowFormRef" :model="addFollowForm" :rules="addFollowRules" label-width="140px">
			<el-form-item label="跟进内容" prop="content">
				<el-input v-model="addFollowForm.content" type="textarea" :rows="4" placeholder="请输入跟进内容" />
			</el-form-item>
			<el-form-item label="跟进时间" prop="followTime">
				<el-date-picker
					v-model="addFollowForm.followTime"
					type="datetime"
					placeholder="选择跟进时间"
					value-format="YYYY-MM-DD HH:mm:ss"
					style="width: 100%"
				/>
			</el-form-item>
			<el-form-item label="预计下次跟进时间" prop="nextFollowTime">
				<el-date-picker
					v-model="addFollowForm.nextFollowTime"
					type="datetime"
					placeholder="选填"
					value-format="YYYY-MM-DD HH:mm:ss"
					style="width: 100%"
				/>
			</el-form-item>
			<el-form-item label="备注" prop="remark">
				<el-input v-model="addFollowForm.remark" type="textarea" :rows="2" placeholder="选填" />
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="addFollowVisible = false">取消</el-button>
			<el-button type="primary" @click="submitAddFollow">确定</el-button>
		</template>
	</el-dialog>
</template>

<script lang="ts" setup>
defineOptions({ name: 'crm-customer-list' });

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { computed, onMounted, reactive, ref } from 'vue';
import { checkPerm } from '/$/base';
import { ArrowDown } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import * as XLSX from 'xlsx';
import CustomerListService from '../service/list';
import { useCrmIndustryDict } from '../utils/industryDict';
import CustomerFollowupService from '../service/followup';
import {
	customerEmailRules,
	customerMobileRules,
	validateCustomerImportContact
} from '../utils/validate';

const customerList = new CustomerListService();
const followupService = new CustomerFollowupService();

const { options: industryOptions, tableDict: industryTableDict } = useCrmIndustryDict();

const Crud = useCrud({ service: customerList }, app => app.refresh());

const canSetVip = computed(() => checkPerm('crm:customerPool:assignSalesman'));
/** 与菜单「客户列表」下按钮权限「跟进记录」一致 */
const canFollow = computed(() => checkPerm('crm:customerList:follow'));
const canQuotationView = computed(() => checkPerm('crm:customerList:quotationView'));
const canQuotationAdd = computed(() => checkPerm('crm:customerList:quotationAdd'));
const canMoveToPool = computed(() => checkPerm('crm:customerList:moveToPool'));
/** 列表「设为VIP」：新权限 或 与原表单 VIP 权限（老板）一致 */
const canRowSetVip = computed(
	() => checkPerm('crm:customerList:setVip') || checkPerm('crm:customerPool:assignSalesman')
);
/** 取消 VIP：独立权限 / 设为VIP权限 / 分配业务员（老板） */
const canRowCancelVip = computed(
	() =>
		checkPerm('crm:customerList:cancelVip') ||
		checkPerm('crm:customerList:setVip') ||
		checkPerm('crm:customerPool:assignSalesman')
);

/** 与公池「分配业务员」一致：老板/超管可按业务员筛选列表 */
const canFilterBySalesman = computed(() => checkPerm('crm:customerPool:assignSalesman'));

/** 列表导入：独立「导入」权限，或与「新增」一致（避免未同步菜单子权限时不显示按钮） */
const canImport = computed(
	() => checkPerm('crm:customerList:import') || checkPerm('crm:customerList:add')
);

/** 「更多」— 编辑客户信息：需「编辑」或「新增」权限（与接口映射一致） */
const canEditCustomer = computed(
	() => checkPerm('crm:customerList:update') || checkPerm('crm:customerList:add')
);

const salesmanSelectOptions = ref<{ label: string; value: number }[]>([]);
/** 生成模板「业务员列表」工作表 */
const salesmenRows = ref<any[]>([]);
const fileRef = ref<HTMLInputElement | null>(null);

const listSearchItems = computed(() => {
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
	if (canFilterBySalesman.value) {
		items.push({
			label: '业务员',
			prop: 'salesmanId',
			component: {
				name: 'cl-select',
				props: {
					filterable: true,
					clearable: true,
					placeholder: '请选择业务员',
					options: salesmanSelectOptions
				}
			}
		});
	}
	return items;
});

onMounted(async () => {
	if (!canFilterBySalesman.value) return;
	try {
		const rows = await customerList.salesmenOptions();
		salesmenRows.value = rows || [];
		salesmanSelectOptions.value = salesmenRows.value.map((u: any) => ({
			label: `${u.name || u.nickName || ''} (${u.username})`,
			value: u.id
		}));
	} catch {
		salesmenRows.value = [];
		salesmanSelectOptions.value = [];
	}
});

/** 与公池导入列一致；老板/可分配角色多一列「业务员账号」（系统用户名，选填；不填则进公池） */
const LIST_IMPORT_BASE_HEADERS = [
	'公司名称',
	'地址',
	'统一编号',
	'汇款本公司',
	'客户名称',
	'手机号',
	'邮箱',
	'备注',
	'行业'
] as const;

function openImport() {
	fileRef.value?.click();
}

async function downloadTpl() {
	if (!canFilterBySalesman.value) {
		const ws = XLSX.utils.aoa_to_sheet([[...LIST_IMPORT_BASE_HEADERS]]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, '客户导入');
		XLSX.writeFile(wb, '客户列表导入模板.xlsx');
		return;
	}
	let salesmen = salesmenRows.value;
	if (!salesmen.length) {
		try {
			salesmen = (await customerList.salesmenOptions()) || [];
			salesmenRows.value = salesmen;
		} catch {
			salesmen = [];
		}
	}
	const header = [...LIST_IMPORT_BASE_HEADERS, '业务员账号'];
	const ws1 = XLSX.utils.aoa_to_sheet([header]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws1, '客户导入');
	if (salesmen.length) {
		const ws2rows: string[][] = [
			['选填：填写「业务员账号」（系统登录名）分配给业务员；不填则该条进入客户公池', ''],
			['姓名', '业务员账号'],
			...salesmen.map((u: any) => [`${u.name || u.nickName || ''}`.trim(), u.username || ''])
		];
		const ws2 = XLSX.utils.aoa_to_sheet(ws2rows);
		ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
		XLSX.utils.book_append_sheet(wb, ws2, '业务员列表');
	}
	XLSX.writeFile(wb, '客户列表导入模板.xlsx');
}

function normalizeListImportRow(raw: Record<string, any>) {
	const pick = (keys: string[]) => {
		for (const k of keys) {
			if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
				return String(raw[k]).trim();
			}
		}
		return '';
	};
	const salesmanUsername = pick([
		'业务员账号',
		'登录账号',
		'业务员登录名',
		'业务员',
		'业务员ID',
		'salesmanId',
		'salesmanUsername'
	]);
	return {
		companyName: pick(['公司名称', 'companyName']),
		address: pick(['地址', 'address']),
		taxNumber: pick(['统一编号', '统一编码', 'taxNumber']),
		remittanceLast5: pick(['汇款本公司', '汇款本卡号', '汇款末五码', 'remittanceLast5']),
		contactName: pick(['客户名称', 'contactName', '联系人']),
		mobile: pick(['手机号', 'mobile', '电话']),
		email: pick(['邮箱', 'email']),
		remark: pick(['备注', 'remark']),
		industry: pick(['行业', 'industry']),
		isVip: pick(['是否VIP', 'isVip']) === '1' || pick(['是否VIP', 'isVip']) === '是' ? 1 : 0,
		salesmanUsername
	};
}

async function onImportFile(ev: Event) {
	const input = ev.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;
	try {
		const buf = await file.arrayBuffer();
		const wb = XLSX.read(buf, { type: 'array' });
		const sheet = wb.Sheets[wb.SheetNames[0]];
		const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
		const list: Record<string, any>[] = [];
		for (let i = 0; i < rows.length; i++) {
			const r = normalizeListImportRow(rows[i]);
			if (!r.companyName && !r.contactName && !r.mobile) {
				continue;
			}
			const excelRow = i + 2;
			const err = validateCustomerImportContact(r.mobile, r.email, excelRow);
			if (err) {
				ElMessage.error(err);
				return;
			}
			if (canFilterBySalesman.value) {
				const row: Record<string, any> = {
					companyName: r.companyName,
					address: r.address,
					taxNumber: r.taxNumber,
					remittanceLast5: r.remittanceLast5,
					contactName: r.contactName,
					mobile: r.mobile,
					email: r.email,
					remark: r.remark,
					isVip: r.isVip,
					...(r.industry ? { industry: r.industry } : {})
				};
				const su = (r.salesmanUsername || '').trim();
				if (su) {
					row.salesmanUsername = su;
				}
				list.push(row);
			} else {
				list.push({
					companyName: r.companyName,
					address: r.address,
					taxNumber: r.taxNumber,
					remittanceLast5: r.remittanceLast5,
					contactName: r.contactName,
					mobile: r.mobile,
					email: r.email,
					remark: r.remark,
					isVip: r.isVip,
					...(r.industry ? { industry: r.industry } : {})
				});
			}
		}
		if (!list.length) {
			ElMessage.warning('未解析到有效数据');
			return;
		}
		await customerList.importData({ list });
		ElMessage.success(`成功导入 ${list.length} 条`);
		Crud.value?.refresh();
	} catch (e: any) {
		ElMessage.error(e?.message || '导入失败');
	}
}

const followVisible = ref(false);
const followCustomer = ref<Record<string, any> | null>(null);
const followTitle = computed(() => {
	const c = followCustomer.value;
	return c ? `跟进记录 — ${c.companyName || ''} / ${c.contactName || ''}` : '跟进记录';
});

const followQuery = reactive({
	page: 1,
	size: 10
});

const followList = ref<any[]>([]);
const followTotal = ref(0);
const followLoading = ref(false);

const addFollowVisible = ref(false);
const addFollowFormRef = ref<FormInstance>();
const addFollowForm = reactive({
	content: '',
	followTime: '',
	nextFollowTime: '',
	remark: ''
});

const addFollowRules: FormRules = {
	content: [{ required: true, message: '请输入跟进内容', trigger: 'blur' }],
	followTime: [{ required: true, message: '请选择跟进时间', trigger: 'change' }]
};

function followIndexMethod(index: number) {
	return (followQuery.page - 1) * followQuery.size + index + 1;
}

async function loadFollowList() {
	if (!followCustomer.value?.id) return;
	followLoading.value = true;
	try {
		const res: any = await followupService.page({
			customerId: followCustomer.value.id,
			page: followQuery.page,
			size: followQuery.size
		});
		followList.value = res?.list ?? [];
		followTotal.value = Number(res?.pagination?.total ?? res?.total ?? 0);
	} catch (e: any) {
		ElMessage.error(e?.message || '加载跟进记录失败');
	} finally {
		followLoading.value = false;
	}
}

function onFollowDialogOpen() {
	followQuery.page = 1;
	loadFollowList();
}

function openFollow(row: any) {
	if (!canFollow.value) {
		ElMessage.warning('无跟进记录权限');
		return;
	}
	followCustomer.value = row;
	followQuery.page = 1;
	followQuery.size = 10;
	followVisible.value = true;
}

function openAddFollow() {
	if (!canFollow.value) {
		ElMessage.warning('无跟进记录权限');
		return;
	}
	addFollowForm.content = '';
	addFollowForm.followTime = '';
	addFollowForm.nextFollowTime = '';
	addFollowForm.remark = '';
	addFollowVisible.value = true;
}

async function submitAddFollow() {
	try {
		await addFollowFormRef.value?.validate();
	} catch {
		return;
	}
	if (!followCustomer.value?.id) return;
	try {
		await followupService.add({
			customerId: followCustomer.value.id,
			content: addFollowForm.content,
			followTime: addFollowForm.followTime || undefined,
			nextFollowTime: addFollowForm.nextFollowTime || undefined,
			remark: addFollowForm.remark || undefined
		});
		ElMessage.success('保存成功');
		addFollowVisible.value = false;
		loadFollowList();
	} catch (e: any) {
		ElMessage.error(e?.message || '保存失败');
	}
}

function onQuotationView() {
	ElMessage.info('查看报价单功能开发中');
}

function onQuotationAdd() {
	ElMessage.info('新增报价单功能开发中');
}

/** 「更多」内是否至少有一项可操作 */
function moreMenuVisible(row: Record<string, any>) {
	const vip = Number(row.isVip) === 1;
	return (
		canEditCustomer.value ||
		canQuotationAdd.value ||
		canMoveToPool.value ||
		(canRowSetVip.value && !vip) ||
		(canRowCancelVip.value && vip)
	);
}

function onMoreCommand(cmd: string, row: { id: number; isVip?: number }) {
	switch (cmd) {
		case 'editCustomer':
			if (!canEditCustomer.value) return;
			Crud.value?.rowEdit(row);
			break;
		case 'quotationAdd':
			onQuotationAdd();
			break;
		case 'moveToPool':
			onMoveToPool(row);
			break;
		case 'setVip':
			onSetVip(row);
			break;
		case 'cancelVip':
			onCancelVip(row);
			break;
		default:
			break;
	}
}

async function onMoveToPool(row: { id: number }) {
	try {
		await ElMessageBox.confirm(
			'确认将该客户移入公池？将取消当前业务员归属，客户可在「客户公池」中再次分配。',
			'移入公池',
			{ type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
		);
	} catch {
		return;
	}
	try {
		await customerList.moveToPool({ id: row.id });
		ElMessage.success('已移入公池');
		Crud.value?.refresh();
	} catch (e: any) {
		ElMessage.error(e?.message || '操作失败');
	}
}

async function onSetVip(row: { id: number }) {
	try {
		await ElMessageBox.confirm('确认将该客户设为 VIP？', '设为VIP', {
			type: 'warning',
			confirmButtonText: '确定',
			cancelButtonText: '取消'
		});
	} catch {
		return;
	}
	try {
		await customerList.setVip({ id: row.id });
		ElMessage.success('已设为 VIP');
		Crud.value?.refresh();
	} catch (e: any) {
		ElMessage.error(e?.message || '操作失败');
	}
}

async function onCancelVip(row: { id: number }) {
	try {
		await ElMessageBox.confirm('确认取消该客户的 VIP 标识？', '取消VIP', {
			type: 'warning',
			confirmButtonText: '确定',
			cancelButtonText: '取消'
		});
	} catch {
		return;
	}
	try {
		await customerList.cancelVip({ id: row.id });
		ElMessage.success('已取消 VIP');
		Crud.value?.refresh();
	} catch (e: any) {
		ElMessage.error(e?.message || '操作失败');
	}
}

useTable({
	columns: [
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
			label: 'VIP',
			prop: 'isVip',
			width: 72,
			dict: [
				{ label: '否', value: 0, type: 'info' },
				{ label: '是', value: 1, type: 'danger' }
			]
		},
		{
			label: '行业',
			prop: 'industry',
			minWidth: 100,
			dict: industryTableDict
		},
		{
			label: '业务员',
			prop: 'salesmanName',
			minWidth: 120,
			formatter(row: any) {
				return row.salesmanName || (row.salesmanId != null ? `ID:${row.salesmanId}` : '—');
			}
		},
		{ label: '备注', prop: 'remark', minWidth: 140, showOverflowTooltip: true },
		{ label: '创建时间', prop: 'createTime', minWidth: 160 },
		{
			label: '操作',
			prop: 'rowActions',
			width: 260,
			align: 'center',
			fixed: 'right'
		}
	]
});

const Upsert = useUpsert({
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
		},
		{
			label: '业务员',
			prop: 'salesmanId',
			hidden: () =>
				!canFilterBySalesman.value || Upsert.value?.mode === 'update',
			component: {
				name: 'cl-select',
				props: {
					filterable: true,
					clearable: true,
					placeholder: '选填，不选则进入客户公池',
					options: salesmanSelectOptions
				}
			}
		},
		{
			label: '是否VIP',
			prop: 'isVip',
			value: 0,
			hidden: () => {
				if (Upsert.value?.mode === 'update') {
					return true;
				}
				if (canFilterBySalesman.value) {
					return true;
				}
				return !canSetVip.value;
			},
			component: {
				name: 'el-radio-group',
				options: [
					{ label: '否', value: 0 },
					{ label: '是', value: 1 }
				]
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
		if (Upsert.value?.mode === 'update') {
			delete payload.isVip;
		}
		delete payload.salesmanName;
		if (!(canFilterBySalesman.value && Upsert.value?.mode === 'add')) {
			delete payload.salesmanId;
		}
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

:deep(.cl-form__items .el-divider--horizontal) {
	margin: 4px 0 14px;
}

.follow-page {
	display: flex;
	justify-content: flex-end;
	margin-top: 12px;
}

.follow-add-bar {
	display: flex;
	justify-content: flex-end;
	margin-top: 14px;
}

.crm-list-actions {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2px 0;
	min-width: 0;
}

.crm-list-actions-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 8px 12px;
}

.crm-more-link {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	cursor: pointer;
	color: var(--el-color-primary);
	font-size: var(--el-font-size-base);
	line-height: 1;
	outline: none;
}

.crm-more-link:hover {
	opacity: 0.85;
}

.crm-more-icon {
	font-size: 12px;
}
</style>
