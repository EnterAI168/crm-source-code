<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-search :items="searchItems" />
		</cl-row>

		<cl-row>
			<el-button v-if="canAdd" type="primary" @click="openAdd">新增匯款單</el-button>
			<cl-refresh-btn />
			<cl-flex1 />
		</cl-row>

		<cl-row>
			<div
				ref="remittanceTableWrapRef"
				class="remittance-table-wrap"
				@wheel="onRemittanceTableWheel"
			>
				<cl-table ref="Table" class="remittance-table" />

				<div
					ref="remittanceXScrollRef"
					class="remittance-x-scroll"
					@scroll="onRemittanceXScroll"
				>
					<div
						class="remittance-x-scroll__inner"
						:style="{ width: `${remittanceScrollWidth}px` }"
					></div>
				</div>
			</div>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>
	</cl-crud>

	<remittance-dialog
		v-model="remittanceDialogVisible"
		:remittance-id="remittanceEditId || undefined"
		:remittance-row="remittanceEditRow"
		@saved="onRemittanceSaved"
	/>

	<el-dialog v-model="detailVisible" title="匯款單詳情" width="1240px">
		<el-descriptions :column="3" border>
			<el-descriptions-item label="匯款單編號">{{ detailData.remittanceNo || '-' }}</el-descriptions-item>
			<el-descriptions-item label="匯款專案名稱">{{ detailData.remittanceName || '-' }}</el-descriptions-item>
			<el-descriptions-item label="狀態">{{ getRemittanceStatusLabel(detailData.status) }}</el-descriptions-item>
			<el-descriptions-item label="供應商名稱">{{ detailData.supplierCompanyName || '-' }}</el-descriptions-item>
			<el-descriptions-item label="供應商地址">{{ detailData.supplierAddress || '-' }}</el-descriptions-item>
			<el-descriptions-item label="統一編號">{{ detailData.supplierUnifiedNo || '-' }}</el-descriptions-item>
			<el-descriptions-item label="郵箱">{{ detailData.supplierEmail || '-' }}</el-descriptions-item>
			<el-descriptions-item label="賬戶資訊">{{ detailData.accountInfo || '-' }}</el-descriptions-item>
			<el-descriptions-item label="匯款型別">{{ getRemittanceTypeLabel(detailData.remittanceType) }}</el-descriptions-item>
			<el-descriptions-item label="業務員">{{ detailData.salesmanName || '-' }}</el-descriptions-item>
			<el-descriptions-item label="匯款總額">{{ toMoney(detailData.totalAmount) }}</el-descriptions-item>
			<el-descriptions-item label="已匯款金額">{{ toMoney(detailData.paidAmount) }}</el-descriptions-item>
			<el-descriptions-item label="是否收到勞保單">
				{{ Number(detailData.receivedLaborInsurance || 0) === 1 ? '是' : '否' }}
			</el-descriptions-item>
			<el-descriptions-item label="是否收到發票">
				{{ Number(detailData.receivedInvoice || 0) === 1 ? '是' : '否' }}
			</el-descriptions-item>
			<el-descriptions-item label="備註">
				<div class="remittance-remark">{{ detailData.remark || '-' }}</div>
			</el-descriptions-item>
			<el-descriptions-item label="上傳發票" :span="3">
				<div v-if="getVoucherFiles(detailData.invoiceFiles).length" class="voucher-files">
					<template v-for="file in getVoucherFiles(detailData.invoiceFiles)" :key="file">
						<el-image
							v-if="isVoucherImage(file)"
							class="voucher-thumb"
							:src="file"
							:alt="getVoucherFileName(file)"
							:preview-src-list="getVoucherImageFiles(detailData.invoiceFiles)"
							fit="cover"
							preview-teleported
							hide-on-click-modal
						/>
						<el-button
							v-else
							class="voucher-file-button"
							type="primary"
							link
							:title="getVoucherFileName(file)"
							@click="downloadVoucherFile(file)"
						>
							<cl-svg :name="getVoucherFileIcon(file)" />
							<span>{{ getVoucherFileName(file) }}</span>
						</el-button>
					</template>
				</div>
				<span v-else class="remittance-attachment-empty">-</span>
			</el-descriptions-item>
			<el-descriptions-item label="上傳檔案" :span="3">
				<div v-if="getVoucherFiles(detailData.uploadFiles).length" class="voucher-files">
					<template v-for="file in getVoucherFiles(detailData.uploadFiles)" :key="file">
						<el-image
							v-if="isVoucherImage(file)"
							class="voucher-thumb"
							:src="file"
							:alt="getVoucherFileName(file)"
							:preview-src-list="getVoucherImageFiles(detailData.uploadFiles)"
							fit="cover"
							preview-teleported
							hide-on-click-modal
						/>
						<el-button
							v-else
							class="voucher-file-button"
							type="primary"
							link
							:title="getVoucherFileName(file)"
							@click="downloadVoucherFile(file)"
						>
							<cl-svg :name="getVoucherFileIcon(file)" />
							<span>{{ getVoucherFileName(file) }}</span>
						</el-button>
					</template>
				</div>
				<span v-else class="remittance-attachment-empty">-</span>
			</el-descriptions-item>
		</el-descriptions>

		<div class="remittance-detail-block">
			<div class="remittance-detail-block__title">匯款階段</div>
			<el-table :data="detailStages" border size="small">
				<el-table-column type="index" label="序號" width="64" />
				<el-table-column prop="stageName" label="階段名稱" min-width="140" />
				<el-table-column label="匯款比例" width="120">
					<template #default="{ row }">{{ toPercent(row.ratio) }}</template>
				</el-table-column>
				<el-table-column label="應匯款金額" width="120">
					<template #default="{ row }">{{ toMoney(row.amount) }}</template>
				</el-table-column>
				<el-table-column label="關聯報價單" min-width="220">
					<template #default="{ row }">{{ getStageQuoteOrderText(row) }}</template>
				</el-table-column>
				<el-table-column prop="expectedRemittanceTime" label="預計匯款時間" width="180" />
				<el-table-column prop="actualRemittanceTime" label="實際匯款時間" width="180" />
				<el-table-column prop="nextStageRemittanceTime" label="下階段匯款時間" width="180" />
				<el-table-column label="實際匯款金額" width="120">
					<template #default="{ row }">{{ toMoney(row.paidAmount) }}</template>
				</el-table-column>
				<el-table-column label="匯款憑證" min-width="140">
					<template #default="{ row }">
						<div v-if="getVoucherFiles(row.voucherFile).length" class="voucher-files">
							<template v-for="file in getVoucherFiles(row.voucherFile)" :key="file">
								<el-image
									v-if="isVoucherImage(file)"
									class="voucher-thumb"
									:src="file"
									:alt="getVoucherFileName(file)"
									:preview-src-list="getVoucherImageFiles(row.voucherFile)"
									fit="cover"
									preview-teleported
									hide-on-click-modal
								/>
								<el-button
									v-else
									class="voucher-file-button"
									type="primary"
									link
									:title="getVoucherFileName(file)"
									@click="downloadVoucherFile(file)"
								>
									<cl-svg :name="getVoucherFileIcon(file)" />
									<span>{{ getVoucherFileName(file) }}</span>
								</el-button>
							</template>
						</div>
						<span v-else>-</span>
					</template>
				</el-table-column>
				<el-table-column prop="laborInsuranceNo" label="勞保單" min-width="160" show-overflow-tooltip />
				<el-table-column label="匯款狀態" width="120">
					<template #default="{ row }">{{ getPaymentStatusLabel(row.paymentStatus) }}</template>
				</el-table-column>
				<el-table-column prop="remark" label="備註" min-width="160" show-overflow-tooltip />
			</el-table>
		</div>
	</el-dialog>

	<el-dialog v-model="remittanceVisible" title="匯款" width="1460px">
		<el-table :data="remittanceStageRows" border size="small">
			<el-table-column type="index" label="序號" width="64" />
			<el-table-column prop="stageName" label="匯款階段" min-width="140" />
			<el-table-column label="應匯款金額" width="140">
				<template #default="{ row }">{{ toMoney(row.amount) }}</template>
			</el-table-column>
			<el-table-column label="匯款金額" width="180">
				<template #default="{ row }">
					<el-input-number
						v-model="row.paidAmount"
						:min="0"
						:max="toNumber(row.amount)"
						:precision="2"
						:controls="false"
						style="width: 100%"
					/>
				</template>
			</el-table-column>
			<el-table-column label="實際匯款時間" width="210">
				<template #default="{ row }">
					<el-date-picker
						v-model="row.actualRemittanceTime"
						type="datetime"
						format="YYYY-MM-DD HH:mm:ss"
						value-format="YYYY-MM-DD HH:mm:ss"
						placeholder="選擇實際匯款時間"
						clearable
						style="width: 100%"
					/>
				</template>
			</el-table-column>
			<el-table-column label="下階段匯款時間" width="210">
				<template #default="{ row }">
					<el-date-picker
						v-model="row.nextStageRemittanceTime"
						type="datetime"
						format="YYYY-MM-DD HH:mm:ss"
						value-format="YYYY-MM-DD HH:mm:ss"
						placeholder="選擇下階段匯款時間"
						clearable
						style="width: 100%"
					/>
				</template>
			</el-table-column>
			<el-table-column label="匯款憑證" min-width="220">
				<template #default="{ row }">
					<cl-upload v-model="row.voucherFile" type="file" :limit="1" />
				</template>
			</el-table-column>
			<el-table-column label="操作" width="120" fixed="right">
				<template #default="{ row }">
					<el-button type="primary" link :loading="remittanceSubmitting" @click="submitRemittanceRow(row)">
						儲存匯款
					</el-button>
				</template>
			</el-table-column>
		</el-table>
	</el-dialog>
</template>

<script lang="ts" setup>
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCrud, useTable } from '@cool-vue/crud'
import { ElMessage, ElMessageBox, ElSwitch } from 'element-plus'
import { checkPerm } from '/$/base'
import RemittanceService from '../service/remittance'
import RemittanceDialog from '../components/remittance-dialog.vue'
import { useCrmRemittanceTypeDict } from '../utils/remittanceTypeDict'

const remittanceService = new RemittanceService()
const { options: remittanceTypeOptions } = useCrmRemittanceTypeDict()

const canAdd = computed(() => checkPerm('crm:remittance:add'))
const canInfo = computed(() => checkPerm('crm:remittance:info'))
const canUpdate = computed(() => checkPerm('crm:remittance:update'))
const canDelete = computed(() => checkPerm('crm:remittance:delete'))
const canRemit = computed(() => checkPerm('crm:remittance:remit'))

const remittanceTableWrapRef = ref<HTMLElement | null>(null)
const remittanceXScrollRef = ref<HTMLElement | null>(null)
const remittanceScrollWidth = ref(0)

let remittanceResizeObserver: ResizeObserver | null = null
let remittanceScrollTarget: HTMLElement | null = null
let isSyncingRemittanceScroll = false

const remittanceDialogVisible = ref(false)
const remittanceEditId = ref(0)
const remittanceEditRow = ref<Record<string, any>>({})
const detailVisible = ref(false)
const detailData = ref<Record<string, any>>({})
const remittanceVisible = ref(false)
const remittanceSubmitting = ref(false)
const remittanceStageRows = ref<any[]>([])
const currentRemittanceId = ref(0)
const receivedStatusLoadingMap = ref<Record<string, boolean>>({})

const searchItems = computed(() => [
	{
		label: '匯款專案名稱',
		prop: 'remittanceName',
		component: {
			name: 'el-input',
			props: {
				clearable: true,
				placeholder: '請輸入匯款專案名稱'
			}
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
				options: [
					{ label: '匯款中', value: 1 },
					{ label: '已完成', value: 2 }
				]
			}
		}
	},
	{
		label: '郵箱',
		prop: 'supplierEmail',
		component: {
			name: 'el-input',
			props: {
				clearable: true,
				placeholder: '請輸入郵箱'
			}
		}
	}
])

function getErrorMessage(error: any, fallback = '儲存失敗') {
	return (
		error?.message ||
		error?.response?.data?.message ||
		error?.data?.message ||
		error?.msg ||
		fallback
	)
}

const detailStages = computed(() => (Array.isArray(detailData.value.stages) ? detailData.value.stages : []))

function toNumber(value: any) {
	const amount = Number(value ?? 0)
	return Number.isNaN(amount) ? 0 : amount
}

function toMoney(value: any) {
	return toNumber(value).toFixed(2)
}

function toPercent(value: any) {
	return `${(toNumber(value) * 100).toFixed(2)}%`
}

function getRemittanceStatusLabel(value: any) {
	return Number(value) === 2 ? '已完成' : '匯款中'
}

function getPaymentStatusLabel(value: any) {
	return Number(value) === 1 ? '已匯款' : '未匯款'
}

function toSwitchValue(value: any) {
	return Number(value) === 1
}

function getReceivedStatusLoadingKey(row: any, field: 'receivedLaborInsurance' | 'receivedInvoice') {
	return `${Number(row?.id || 0)}-${field}`
}

function isReceivedStatusLoading(row: any, field: 'receivedLaborInsurance' | 'receivedInvoice') {
	return !!receivedStatusLoadingMap.value[getReceivedStatusLoadingKey(row, field)]
}

function setReceivedStatusLoading(
	row: any,
	field: 'receivedLaborInsurance' | 'receivedInvoice',
	loading: boolean
) {
	const key = getReceivedStatusLoadingKey(row, field)
	receivedStatusLoadingMap.value = {
		...receivedStatusLoadingMap.value,
		[key]: loading
	}
}

function canToggleReceivedStatus(row: any) {
	return Number(row?.canToggleReceivedStatus || 0) === 1
}

async function onReceivedStatusChange(
	row: any,
	field: 'receivedLaborInsurance' | 'receivedInvoice',
	value: boolean
) {
	if (!row?.id) {
		return
	}

	const oldValue = Number(row?.[field] || 0)
	const nextValue = value ? 1 : 0
	if (oldValue === nextValue) {
		return
	}

	setReceivedStatusLoading(row, field, true)
	row[field] = nextValue

	try {
		await remittanceService.updateReceivedStatus({
			id: Number(row.id),
			[field]: nextValue
		})
		ElMessage.success(field === 'receivedLaborInsurance' ? '勞保單收到狀態已更新' : '發票收到狀態已更新')
	} catch (error: any) {
		row[field] = oldValue
		ElMessage.error(getErrorMessage(error, '更新收到狀態失敗'))
	} finally {
		setReceivedStatusLoading(row, field, false)
	}
}

function getRemittanceTypeLabel(value: any) {
	if (value === undefined || value === null || value === '') {
		return '-'
	}
	const match = remittanceTypeOptions.value.find(item => String(item.value) === String(value))
	return String(match?.label ?? match?.name ?? value)
}

function getStageQuoteOrderText(row: any) {
	const name = row?.quoteOrderName || row?.quoteName || ''
	const no = row?.quoteOrderNo || row?.quoteNo || ''

	if (!name && !no) {
		return '-'
	}

	return no ? `${name || '報價單'} (${no})` : name
}

function getVoucherFiles(value: any) {
	if (Array.isArray(value)) {
		return value.map(item => String(item?.url || item || '').trim()).filter(Boolean)
	}

	const text = String(value || '').trim()
	if (!text) {
		return []
	}

	if (text.startsWith('[')) {
		try {
			const list = JSON.parse(text)
			if (Array.isArray(list)) {
				return list.map(item => String(item?.url || item || '').trim()).filter(Boolean)
			}
		} catch {
			return [text]
		}
	}

	return text
		.split(',')
		.map(item => item.trim())
		.filter(Boolean)
}

function getVoucherFileName(file: string) {
	const name = decodeFileName(String(file || '').split('?')[0]).replace(/\\/g, '/')
	return name.split('/').pop() || '匯款憑證'
}

function decodeFileName(value: string) {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

function getVoucherFileIcon(file: string) {
	const ext = getVoucherFileName(file).split('.').pop()?.toLowerCase() || ''

	if (['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm'].includes(ext)) return 'upload-word'
	if (['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm'].includes(ext)) return 'upload-excel'
	if (['ppt', 'pptx', 'pptm', 'ppsx', 'ppsm', 'pps', 'potx', 'potm'].includes(ext)) return 'upload-ppt'
	if (ext === 'pdf') return 'upload-pdf'
	if (['zip', 'rar', '7z'].includes(ext)) return 'upload-rar'

	return 'upload-file'
}

function isVoucherImage(file: string) {
	return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(file || '').trim())
}

function getVoucherImageFiles(value: any) {
	return getVoucherFiles(value).filter(file => isVoucherImage(file))
}

function downloadVoucherFile(file: string) {
	const url = String(file || '').trim()
	if (!url) {
		ElMessage.warning('暫無匯款憑證')
		return
	}

	const link = document.createElement('a')
	link.href = url
	link.download = getVoucherFileName(url)
	link.target = '_blank'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

const Crud = useCrud(
	{
		service: remittanceService,
		onDelete(selection, { next }) {
			next({
				ids: selection.map((item: any) => item.id)
			})
		}
	},
	app => {
		const result = app.refresh()
		scheduleRemittanceScrollBarUpdate()
		return result
	}
)

function getRemittanceScrollTarget() {
	const root = remittanceTableWrapRef.value

	if (!root) return null

	const candidates = root.querySelectorAll<HTMLElement>('.el-scrollbar__wrap, .el-table__body-wrapper')

	return Array.from(candidates).find(item => item.scrollWidth > item.clientWidth) || null
}

function bindRemittanceScrollTarget(target: HTMLElement | null) {
	if (remittanceScrollTarget === target) return

	if (remittanceScrollTarget) {
		remittanceScrollTarget.removeEventListener('scroll', syncRemittanceScrollFromTable)
	}

	remittanceScrollTarget = target

	if (remittanceScrollTarget) {
		remittanceScrollTarget.addEventListener('scroll', syncRemittanceScrollFromTable)
	}
}

function scheduleRemittanceScrollBarUpdate() {
	;[0, 80, 240].forEach(delay => {
		window.setTimeout(updateRemittanceScrollBar, delay)
	})
}

async function updateRemittanceScrollBar() {
	await nextTick()

	const target = getRemittanceScrollTarget()

	bindRemittanceScrollTarget(target)

	remittanceScrollWidth.value = target ? target.scrollWidth : 0

	syncRemittanceScrollFromTable()
}

function syncRemittanceScrollFromTable() {
	if (isSyncingRemittanceScroll) return

	const scroll = remittanceXScrollRef.value
	const target = remittanceScrollTarget || getRemittanceScrollTarget()

	if (!scroll || !target) return

	isSyncingRemittanceScroll = true
	scroll.scrollLeft = target.scrollLeft

	requestAnimationFrame(() => {
		isSyncingRemittanceScroll = false
	})
}

function onRemittanceXScroll(event: Event) {
	if (isSyncingRemittanceScroll) return

	const target = remittanceScrollTarget || getRemittanceScrollTarget()
	const scroll = event.target as HTMLElement

	if (!target || !scroll) return

	isSyncingRemittanceScroll = true
	target.scrollLeft = scroll.scrollLeft

	requestAnimationFrame(() => {
		isSyncingRemittanceScroll = false
	})
}

function onRemittanceTableWheel(event: WheelEvent) {
	if (Math.abs(event.deltaY) <= Math.abs(event.deltaX || 0)) {
		return
	}

	const scroll = remittanceXScrollRef.value

	if (!scroll) {
		return
	}

	event.preventDefault()
	scroll.scrollLeft += event.deltaY
	syncRemittanceScrollFromTable()
}

useTable({
	columns: [
		{ type: 'selection', width: 60 },
		{ label: '匯款專案名稱', prop: 'remittanceName', minWidth: 180, showOverflowTooltip: true },
		{ label: '供應商', prop: 'supplierCompanyName', minWidth: 180, showOverflowTooltip: true },
		{ label: '賬戶資訊', prop: 'accountInfo', minWidth: 180, showOverflowTooltip: true },
		{ label: '業務員', prop: 'salesmanName', width: 120 },
		{
			label: '匯款總金額',
			prop: 'totalAmount',
			minWidth: 120,
			formatter(row: any) {
				return toMoney(row.totalAmount)
			}
		},
		{
			label: '匯款階段',
			prop: 'currentStageOrder',
			width: 100,
			formatter(row: any) {
				return row.currentStageOrder || '-'
			}
		},
		{
			label: '比例',
			prop: 'currentStageRatio',
			width: 110,
			formatter(row: any) {
				return row.currentStageRatio === undefined || row.currentStageRatio === null ? '-' : toPercent(row.currentStageRatio)
			}
		},
		{
			label: '當前階段應匯款金額',
			prop: 'currentStageAmount',
			minWidth: 170,
			formatter(row: any) {
				return row.currentStageAmount === undefined || row.currentStageAmount === null ? '-' : toMoney(row.currentStageAmount)
			}
		},
		{
			label: '當前階段匯款剩餘金額',
			prop: 'currentStageRemainingAmount',
			minWidth: 170,
			formatter(row: any) {
				return row.currentStageRemainingAmount === undefined || row.currentStageRemainingAmount === null
					? '-'
					: toMoney(row.currentStageRemainingAmount)
			}
		},
		{ label: '請款時間', prop: 'createTime', minWidth: 180, showOverflowTooltip: true },
		{ label: '預計匯款時間', prop: 'currentExpectedRemittanceTime', minWidth: 180, showOverflowTooltip: true },
		{ label: '實際匯款時間', prop: 'currentActualRemittanceTime', minWidth: 180, showOverflowTooltip: true },
		{
			label: '下階段款項匯款時間',
			prop: 'currentNextStageRemittanceTime',
			minWidth: 190,
			showOverflowTooltip: true
		},
		{
			label: '是否收到勞保單',
			prop: 'receivedLaborInsurance',
			minWidth: 150,
			align: 'center',
			render(row: any) {
				return h(ElSwitch, {
					modelValue: toSwitchValue(row?.receivedLaborInsurance),
					disabled: !canToggleReceivedStatus(row) || isReceivedStatusLoading(row, 'receivedLaborInsurance'),
					loading: isReceivedStatusLoading(row, 'receivedLaborInsurance'),
					'active-text': '是',
					'inactive-text': '否',
					'onUpdate:modelValue': (value: boolean) =>
						onReceivedStatusChange(row, 'receivedLaborInsurance', value)
				})
			}
		},
		{
			label: '是否收到發票',
			prop: 'receivedInvoice',
			minWidth: 150,
			align: 'center',
			render(row: any) {
				return h(ElSwitch, {
					modelValue: toSwitchValue(row?.receivedInvoice),
					disabled: !canToggleReceivedStatus(row) || isReceivedStatusLoading(row, 'receivedInvoice'),
					loading: isReceivedStatusLoading(row, 'receivedInvoice'),
					'active-text': '是',
					'inactive-text': '否',
					'onUpdate:modelValue': (value: boolean) =>
						onReceivedStatusChange(row, 'receivedInvoice', value)
				})
			}
		},
		{
			type: 'op',
			width: 400,
			buttons({ scope }: any) {
				const row = scope.row || {}
				const isCompleted = Number(row.status) === 2

				return [
					{
						label: '檢視',
						type: 'primary',
						hidden: !canInfo.value,
						onClick() {
							openDetail(row)
						}
					},
					{
						label: '匯款',
						type: 'warning',
						hidden: !(canRemit.value && !isCompleted),
						onClick() {
							openRemittance(row)
						}
					},
					{
						label: '編輯',
						hidden: !(canUpdate.value && !isCompleted),
						onClick() {
							openEdit(row)
						}
					},
					{
						label: '刪除',
						type: 'danger',
						hidden: !(canDelete.value && !isCompleted),
						onClick() {
							deleteRemittance(row)
						}
					}
				]
			}
		}
	]
})

function openAdd() {
	remittanceEditId.value = 0
	remittanceEditRow.value = {}
	remittanceDialogVisible.value = true
}

function openEdit(row: any) {
	remittanceEditId.value = Number(row?.id || 0)
	remittanceEditRow.value = { ...(row || {}) }
	remittanceDialogVisible.value = true
}

async function openDetail(row: any) {
	try {
		detailData.value = ((await remittanceService.info({ id: row.id })) as any) || {}
		detailVisible.value = true
		scheduleRemittanceScrollBarUpdate()
	} catch (error: any) {
		ElMessage.error(getErrorMessage(error, '檢視匯款單失敗'))
	}
}

async function openRemittance(row: any) {
	currentRemittanceId.value = Number(row?.id || 0)
	if (!currentRemittanceId.value) return
	try {
		const res: any = await remittanceService.remittanceStages({ id: currentRemittanceId.value })
		remittanceStageRows.value = Array.isArray(res?.stages) ? res.stages : []
		remittanceVisible.value = true
	} catch (error: any) {
		ElMessage.error(getErrorMessage(error, '開啟匯款彈框失敗'))
	}
}

async function submitRemittanceRow(row: any) {
	if (!currentRemittanceId.value || !row?.id || remittanceSubmitting.value) {
		return
	}
	if (toNumber(row.paidAmount) <= 0) {
		ElMessage.warning('請輸入匯款金額')
		return
	}
	if (!String(row.actualRemittanceTime || '').trim()) {
		ElMessage.warning('請選擇實際匯款時間')
		return
	}
	remittanceSubmitting.value = true
	try {
		await remittanceService.submitRemittance({
			id: currentRemittanceId.value,
			stageId: Number(row.id),
			paidAmount: toNumber(row.paidAmount),
			voucherFile: row.voucherFile || undefined,
			actualRemittanceTime: row.actualRemittanceTime || undefined,
			nextStageRemittanceTime: row.nextStageRemittanceTime || undefined
		})
		ElMessage.success('匯款已儲存')
		await openRemittance({ id: currentRemittanceId.value })
		Crud.value?.refresh()
		scheduleRemittanceScrollBarUpdate()
	} catch (error: any) {
		ElMessage.error(getErrorMessage(error, '匯款儲存失敗'))
	} finally {
		remittanceSubmitting.value = false
	}
}

async function deleteRemittance(row: any) {
	try {
		await ElMessageBox.confirm('確認刪除該匯款單嗎？', '刪除確認', {
			type: 'warning',
			confirmButtonText: '確認',
			cancelButtonText: '取消'
		})
	} catch {
		return
	}

	await remittanceService.delete({ ids: [row.id] })
	ElMessage.success('刪除成功')
	Crud.value?.refresh()
	scheduleRemittanceScrollBarUpdate()
}

function onRemittanceSaved() {
	remittanceDialogVisible.value = false
	remittanceEditId.value = 0
	remittanceEditRow.value = {}
	Crud.value?.refresh()
	scheduleRemittanceScrollBarUpdate()
}

onMounted(() => {
	scheduleRemittanceScrollBarUpdate()

	if (typeof ResizeObserver !== 'undefined' && remittanceTableWrapRef.value) {
		remittanceResizeObserver = new ResizeObserver(() => scheduleRemittanceScrollBarUpdate())
		remittanceResizeObserver.observe(remittanceTableWrapRef.value)
	}

	window.addEventListener('resize', scheduleRemittanceScrollBarUpdate)
})

onBeforeUnmount(() => {
	remittanceResizeObserver?.disconnect()
	window.removeEventListener('resize', scheduleRemittanceScrollBarUpdate)

	if (remittanceScrollTarget) {
		remittanceScrollTarget.removeEventListener('scroll', syncRemittanceScrollFromTable)
	}
})
</script>

<style scoped>
.remittance-table-wrap {
	width: 100%;
	overflow: visible;
}

.remittance-x-scroll {
	width: 100%;
	height: 16px;
	margin-top: 2px;
	overflow-x: auto;
	overflow-y: hidden;
	cursor: pointer;
}

.remittance-x-scroll__inner {
	height: 1px;
}

:deep(.remittance-table .el-scrollbar__bar.is-horizontal) {
	display: none;
}

.remittance-detail-block {
	margin-top: 16px;
}

.remittance-detail-block__title {
	margin-bottom: 10px;
	font-weight: 600;
}

.remittance-remark {
	white-space: pre-wrap;
	word-break: break-word;
	line-height: 1.7;
}

.voucher-files {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	min-width: 0;
}

.voucher-thumb {
	width: 40px;
	height: 40px;
	border: 1px solid var(--el-border-color);
	border-radius: 4px;
	cursor: zoom-in;
	background: var(--el-fill-color-light);
	flex-shrink: 0;
}

.remittance-attachment-empty {
	color: var(--el-text-color-secondary);
}

.voucher-file-button {
	max-width: 420px;
	height: 32px;
	padding: 0 10px;
	border: 1px solid var(--el-border-color-light);
	border-radius: 4px;
	background-color: var(--el-fill-color-lighter);
	vertical-align: middle;
}

.voucher-file-button :deep(.cl-svg) {
	width: 18px;
	height: 18px;
	margin-right: 6px;
	flex-shrink: 0;
}

.voucher-file-button span {
	display: inline-block;
	max-width: 360px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	vertical-align: middle;
}
</style>
