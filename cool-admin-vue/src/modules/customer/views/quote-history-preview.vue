<template>
	<div class="quote-preview-page" :class="{ 'quote-preview-page--embedded': embedded }">
		<div v-if="!embedded" class="quote-preview-toolbar no-print">
			<div>
				<div class="quote-preview-toolbar__title">報價單預覽</div>
				<div class="quote-preview-toolbar__sub">
					{{ detail?.quoteNo || order.quoteNo || '--' }} /
					{{ detail?.createTime || '--' }}
				</div>
			</div>
			<!-- <div class="quote-preview-toolbar__actions">
				<el-button @click="router.back()">返回</el-button>
				<el-button type="primary" @click="downloadPdf">下載PDF</el-button>
				<el-button @click="windowPrint">列印</el-button>
			</div> -->
		</div>

		<div v-loading="loading" class="quote-preview-canvas">
			<article ref="sheetRef" class="quote-sheet" id="quote-history-preview-doc">
				<header class="quote-sheet__title">
					<img class="quote-sheet__header-logo" src="/quote-header-logo.png" alt="ENTER" />
					<span>合作報價單</span>
				</header>

				<div class="quote-sheet__body">
					<aside class="quote-sheet__rail" aria-hidden="true">
						<div
							v-for="(block, index) in railBlocks"
							:key="index"
							class="quote-sheet__rail-block"
							:style="{ height: block }"
						>
							<span>報</span>
						</div>
					</aside>

					<main class="quote-sheet__content">
						<section class="quote-section quote-section--intro">
							<p>為廣告主，以下簡稱甲方；</p>
							<p>{{ partyB.companyName }}為委刊主，以下簡稱乙方。</p>
						</section>

						<table class="quote-table quote-table--party">
							<colgroup>
								<col class="quote-party__label" />
								<col class="quote-party__value" />
								<col class="quote-party__label" />
								<col class="quote-party__value" />
							</colgroup>
							<tbody>
								<tr>
									<th colspan="2">甲方</th>
									<th colspan="2">乙方</th>
								</tr>
								<tr>
									<th>名稱</th>
									<td>
										{{ customer.companyName || customer.contactName || '' }}
									</td>
									<th>名稱</th>
									<td>{{ partyB.companyName }}</td>
								</tr>
								<tr>
									<th>地址</th>
									<td>{{ customer.address || '' }}</td>
									<th>地址</th>
									<td>{{ partyB.address }}</td>
								</tr>
								<tr>
									<th>統一編號</th>
									<td>{{ customer.taxNumber || '' }}</td>
									<th>統一編號</th>
									<td>{{ partyB.taxNumber }}</td>
								</tr>
								<tr>
									<th>匯款末五碼</th>
									<td>{{ customer.remittanceLast5 || '' }}</td>
									<th></th>
									<td></td>
								</tr>
								<tr>
									<th>聯絡人</th>
									<td>{{ customer.contactName || '' }}</td>
									<th>聯絡人</th>
									<td>{{ partyB.contactName }}</td>
								</tr>
								<tr>
									<th>信箱</th>
									<td>{{ customer.email || '' }}</td>
									<th>信箱</th>
									<td>{{ partyB.email }}</td>
								</tr>
								<tr>
									<th>電話</th>
									<td>{{ customer.mobile || '' }}</td>
									<th>電話</th>
									<td>{{ partyB.mobile }}</td>
								</tr>
							</tbody>
						</table>

						<table class="quote-table quote-table--project">
							<colgroup>
								<col class="quote-project__label-col" />
								<col class="quote-project__product-col" />
								<col class="quote-project__spec-col" />
								<col class="quote-project__qty-col" />
								<col class="quote-project__price-col" />
							</colgroup>
							<tbody>
								<tr>
									<th class="quote-table__label">專案名稱</th>
									<td colspan="4">
										{{ order.quoteName || detail?.quoteName || '' }}
									</td>
								</tr>
								<tr>
									<th class="quote-table__label">專案期間</th>
									<td colspan="4" class="quote-table__center">
										{{ formatDateText(order.startDate) }} 至
										{{ formatDateText(order.endDate) }} 止
									</td>
								</tr>
								<tr>
									<th class="quote-table__label">專案專案</th>
									<th>產品</th>
									<th>規格</th>
									<th>數量</th>
									<th>價格</th>
								</tr>
								<tr v-for="(item, index) in visibleItems" :key="index">
									<th class="quote-table__label quote-table__number">
										{{ index + 1 }}
									</th>
									<td>{{ item?.productName || '' }}</td>
									<td>{{ item?.specName || '' }}</td>
									<td class="quote-table__center">{{ item?.quantity || '' }}</td>
									<td class="quote-table__right">
										{{
											item
												? money(
														item.subtotalAmount || item.actualPrice || 0
													)
												: ''
										}}
									</td>
								</tr>
								<tr>
									<th class="quote-table__label quote-table__remark-label">
										執行備註
									</th>
									<td colspan="4" class="quote-table__remark">
										<div>{{ order.execRemark }}</div>
									</td>
								</tr>
								<tr>
									<td colspan="5" class="quote-table__label quote-table-total">
										<div class="quote-total__amount">
											專案總價 {{ money(finalAmount) }}
										</div>
										<div>本委刊內容仍依據實際操作調整</div>
									</td>
								</tr>
							</tbody>
						</table>






						<div class="quote-bar">付款條件</div>
						<table class="quote-table quote-table--payment">
							<tbody>
								<tr>
									<th>刊登未稅價</th>
									<td>{{ money(untaxedAmount) }}</td>
									<th>營業稅</th>
									<td>{{ money(taxAmount) }}</td>
									<th>含稅總價</th>
									<td>{{ money(finalAmount) }}</td>
								</tr>
								<tr v-for="(line, index) in paymentConditionLines" :key="index">
									<td colspan="6">
										{{ line }}
									</td>
								</tr>
							</tbody>
						</table>

						<div class="quote-bar">乙方匯款資訊</div>
						<section class="quote-bank">
							<div class="quote-bank__title">乙方存摺封面</div>
							<img
								class="quote-bank__cover"
								:src="partyB.bankCoverUrl || '/quote-bank-cover.jpg'"
								crossorigin="anonymous"
								alt="乙方存摺封面"
							/>
							<div class="quote-bank__info">
								<div class="quote-bank__contact">
									<p>聯絡人：{{ partyB.contactName }}</p>
									<p>Email：{{ partyB.email }}</p>
								</div>
								<div class="quote-bank__account-name">
									<p>戶名：{{ partyB.bankAccountName || partyB.companyName }}</p>
									<p>銀行代號：{{ partyB.bankCode }}{{ partyB.bankName ? `（${partyB.bankName}）` : '' }}</p>
								</div>
								<div class="quote-bank__account-no">
									<p>帳號：</p>
									<p>{{ partyB.bankAccountNo }}</p>
								</div>
							</div>
						</section>

						<div v-if="termSections.length" class="quote-bar">雙方合作條款約定</div>
						<section v-if="termSections.length" class="quote-terms">
							<div
								v-for="(section, sectionIndex) in termSections"
								:key="`${sectionIndex}-${section.title}`"
								class="quote-terms__section"
							>
								<h3>{{ section.title }}</h3>
								<div
									v-for="(item, itemIndex) in section.items"
									:key="`${sectionIndex}-${itemIndex}-${item.no}`"
									class="quote-terms__item"
								>
									<div class="quote-terms__no">{{ item.no }}</div>
									<p>
										<span
											v-for="(part, partIndex) in splitTermText(item.text)"
											:key="partIndex"
											:class="{ 'quote-term-date': part.isDate }"
										>
											{{ part.text }}
										</span>
									</p>
								</div>
							</div>
						</section>

						<section class="quote-sign">
							<aside class="quote-sign__rail">
								<div class="quote-sign__meta">
									<div>
										<span>委刊單號</span>
									</div>
									<div>
										<span>委刊日期</span>
									</div>
								</div>
								<img
									class="quote-sign__logo"
									src="/quote-enter-logo.png"
									alt="ENTER"
								/>
							</aside>
							<div class="quote-sign__content">
								<div class="quote-sign__values">
									<div>{{ commissionNo }}</div>
									<div>{{ commissionDate }}</div>
								</div>
								<div class="quote-sign__names">
									<span>甲方簽章</span>
									<span>乙方簽章</span>
								</div>
								<img
									v-if="partyB.companySealUrl"
									class="quote-sign__company-seal"
									:src="partyB.companySealUrl"
									crossorigin="anonymous"
									alt="乙方簽章"
								/>
							</div>
						</section>
					</main>
				</div>
			</article>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { host as apiHost } from '/@/config/proxy';
import { request } from '/@/cool/service/request';
import { getBaseUrl } from '/@/cool/service/base-url';
import { exportElementToPdf, safePdfFileName } from '/@/utils/exportPdf';

const props = defineProps<{
	historyId?: number;
	embedded?: boolean;
	pdfFileNameSuffix?: string;
}>();

const emit = defineEmits<{
	(event: 'loaded'): void;
}>();

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detail = ref<any>(null);
const sheetRef = ref<HTMLElement | null>(null);

const order = reactive<any>({});
const customer = reactive<any>({});
const partyB = reactive<any>({
	companyName: '確認鍵智創科技股份有限公司',
	address: '臺北市中正區福州街43巷11號',
	taxNumber: '83516691',
	contactName: 'vicky',
	email: 'vicky@enterimc.com',
	mobile: '',
	bankAccountName: '確認鍵智創科技股份有限公司',
	bankCode: '012',
	bankName: '臺北富邦銀行',
	bankAccountNo: '82110000259100',
	bankCoverUrl: '/quote-bank-cover.jpg',
	companySealUrl: ''
});
const items = ref<any[]>([]);
const previewId = computed(() => Number(props.historyId || route.query.id || 0));
const paymentConditionLines = ref<string[]>([]);

const railBlocks = [
	'620px',
	'860px',
	'720px',
	'620px',
	'520px',
	'420px',
	'380px',
	'320px',
	'260px'
];

const termSections = ref<any[]>([]);

const visibleItems = computed(() => {
	const rows = [...items.value];
	while (rows.length < 3) {
		rows.push(null);
	}
	return rows;
});

const finalAmount = computed(() => toNumber(order.finalAmount || detail.value?.amount || 0));
const dutyRate = computed(() => parseDutyRate(detail.value?.duty));
const commissionNo = computed(() => detail.value?.quoteNo || order.quoteNo || '-');
const commissionDate = computed(() =>
	formatDateText(order.createTime || detail.value?.quoteCreateTime || detail.value?.createTime)
);
const untaxedAmount = computed(() => {
	return dutyRate.value > 0 ? finalAmount.value / (1 + dutyRate.value) : finalAmount.value;
});
const taxAmount = computed(() => finalAmount.value - untaxedAmount.value);

watch(
	previewId,
	() => {
		loadDetail();
	},
	{ immediate: true }
);

async function loadDetail() {
	const id = previewId.value;
	if (!id) {
		ElMessage.warning('缺少歷史記錄ID');
		return;
	}
	loading.value = true;
	try {
		const res: any = await request({
			url: `${getBaseUrl()}/admin/crmQuoteOrder/quoteHistoryDetail`,
			method: 'POST',
			data: { id }
		});
		detail.value = res || {};
		Object.assign(order, res?.snapshot?.order || {});
		Object.assign(customer, res?.customer || {});
		Object.assign(partyB, normalizePartyB(res?.partyB));
		items.value = Array.isArray(res?.snapshot?.items) ? res.snapshot.items : [];
		termSections.value = normalizeTermSections(res?.quoteTerms);
		paymentConditionLines.value = normalizePaymentConditionLines(res?.paymentCondition);
		await nextTick();
		emit('loaded');
	} finally {
		loading.value = false;
	}
}

async function downloadPdf() {
	await downloadPreviewPdf();
}

async function downloadPreviewPdf() {
	const element =
		sheetRef.value ||
		(document.getElementById('quote-history-preview-doc') as HTMLElement | null);
	if (!element) {
		ElMessage.error('未找到報價單預覽內容');
		return;
	}

	const quoteName =
		order.quoteName ||
		detail.value?.quoteName ||
		detail.value?.quoteNo ||
		order.quoteNo ||
		'報價單';
	const suffix = props.pdfFileNameSuffix || '歷史記錄';
	const filename = `${safePdfFileName(`${quoteName}-${suffix}`)}.pdf`;

	await exportElementToPdf(element, {
		filename,
		format: 'a4',
		scale: 2,
		safePageBreakSelector: '.quote-sheet__content',
		safePageBreakSearch: 220,
		avoidTextLineSelectors: ['.quote-sheet__content']
	});
}

function windowPrint() {
	window.print();
}

function formatDateText(value: any) {
	const text = String(value || '').slice(0, 10);
	if (!text) return '　　年　　月　　日';
	const [year, month, day] = text.split('-');
	return `${year || '　　'} 年 ${month || '　　'} 月 ${day || '　　'} 日`;
}

function money(value: any) {
	return toNumber(value).toLocaleString('zh-TW', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

function toNumber(value: any) {
	const number = Number(value || 0);
	return Number.isFinite(number) ? number : 0;
}

function parseDutyRate(value: any) {
	const raw =
		typeof value === 'object' && value !== null
			? (value.value ?? value.data ?? value.val ?? value.content ?? '')
			: value;
	const number = Number(String(raw || '').replace('%', ''));
	if (!Number.isFinite(number) || number <= 0) return 0;
	return number > 1 ? number / 100 : number;
}

function normalizePartyB(value: any) {
	const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	return {
		companyName: String(source.companyName ?? partyB.companyName ?? ''),
		address: String(source.address ?? partyB.address ?? ''),
		taxNumber: String(source.taxNumber ?? partyB.taxNumber ?? ''),
		contactName: String(source.contactName ?? partyB.contactName ?? ''),
		email: String(source.email ?? partyB.email ?? ''),
		mobile: String(source.mobile ?? partyB.mobile ?? ''),
		bankAccountName: String(source.bankAccountName ?? partyB.bankAccountName ?? ''),
		bankCode: String(source.bankCode ?? partyB.bankCode ?? ''),
		bankName: String(source.bankName ?? partyB.bankName ?? ''),
		bankAccountNo: String(source.bankAccountNo ?? partyB.bankAccountNo ?? ''),
		bankCoverUrl: normalizePreviewImageUrl(source.bankCoverUrl ?? partyB.bankCoverUrl ?? ''),
		companySealUrl: normalizePreviewImageUrl(source.companySealUrl ?? partyB.companySealUrl ?? '')
	};
}

function normalizePreviewImageUrl(value: any) {
	const url = String(value || '').trim();
	if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
		return url;
	}

	try {
		const target = new URL(url);
		if (target.origin === window.location.origin) {
			return `${target.pathname}${target.search}${target.hash}`;
		}

		const apiOrigin = apiHost ? new URL(apiHost).origin : '';
		if (import.meta.env.DEV && apiOrigin && target.origin === apiOrigin && target.pathname.startsWith('/upload/')) {
			return `${getBaseUrl()}${target.pathname}${target.search}${target.hash}`;
		}
	} catch {
		return url;
	}

	return url;
}

function normalizePaymentConditionLines(value: any) {
	const fallback = `付款方式：專案金額(含營業稅)共計新臺幣 ${money(finalAmount.value)} 元整，甲方於收到發票後，30 天內以匯款方式支付款項至乙方指定帳戶，匯款後提供後五碼及匯款日期以便甲方核對。\n*本欄請注意：本單須雙方簽立完成後，送交乙方才會始得進行委刊作業。`;
	const text = Array.isArray(value)
		? value.join('\n')
		: typeof value === 'object' && value !== null
			? String(value.text ?? value.content ?? value.value ?? '')
			: String(value || '');
	return (text.trim() || fallback)
		.split(/\r?\n/)
		.map(item => item.trim())
		.filter(Boolean);
}

function normalizeTermSections(value: any) {
	let source = value;
	if (typeof source === 'string') {
		try {
			source = JSON.parse(source);
		} catch {
			source = source
				.split(/\r?\n/)
				.map((item: string) => item.trim())
				.filter(Boolean);
		}
	}
	if (!Array.isArray(source)) {
		return [];
	}
	if (source.every(item => typeof item === 'string')) {
		return [
			{
				title: '報價單條款',
				items: source.map((text, index) => ({
					no: index + 1,
					text: fillCurrentDateInTermText(text)
				}))
			}
		];
	}
	return source
		.map(section => ({
			title: String(section?.title || '報價單條款'),
			items: Array.isArray(section?.items)
				? section.items
						.map((item: any, index: number) => ({
							no: item?.no ?? index + 1,
							text: fillCurrentDateInTermText(item?.text)
						}))
						.filter((item: any) => item.text)
				: []
		}))
		.filter((section: any) => section.items.length > 0);
}

function fillCurrentDateInTermText(value: any) {
	const text = String(value || '').trim();
	if (!text) return '';
	const date = new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return text.replace(/[?\s]{2,}?[?\s]{1,}?[?\s]{1,}?/g, `${year}?${month}?${day}?`);
}

function splitTermText(value: any) {
	const text = String(value || '');
	const match = text.match(/\d{4}?\d{2}?\d{2}?/);
	if (!match || match.index === undefined) {
		return [{ text, isDate: false }];
	}
	const start = match.index;
	const end = start + match[0].length;
	return [
		{ text: text.slice(0, start), isDate: false },
		{ text: text.slice(start, end), isDate: true },
		{ text: text.slice(end), isDate: false }
	].filter(item => item.text);
}

defineExpose({
	downloadPreviewPdf
});
</script>

<style scoped>
.quote-preview-page {
	min-height: 100%;
	background: #f2f2f2;
	padding: 0 0 32px;
}

.quote-preview-page--embedded {
	background: #f2f2f2;
	padding: 0;
}

.quote-preview-toolbar {
	position: sticky;
	top: 0;
	z-index: 5;
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 900px;
	margin: 0 auto;
	padding: 10px 14px;
	background: #fff;
	border-bottom: 1px solid var(--el-border-color-light);
}

.quote-preview-toolbar__title {
	font-size: 16px;
	font-weight: 700;
}

.quote-preview-toolbar__sub {
	margin-top: 4px;
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.quote-preview-toolbar__actions {
	display: flex;
	gap: 8px;
}

.quote-preview-canvas {
	width: 900px;
	margin: 0 auto;
	background: #fff;
}

.quote-sheet {
	--quote-blue: #0036b3;
	width: 900px;
	background: #fff;
	color: #111;
	font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif;
	font-size: 17px;
	line-height: 1.55;
	box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
}

.quote-sheet__title {
	position: relative;
	height: 76px;
	line-height: 76px;
	text-align: center;
	color: #fff;
	background: var(--quote-blue);
	font-size: 34px;
	font-weight: 700;
	letter-spacing: 2px;
}

.quote-sheet__header-logo {
	position: absolute;
	top: 0;
	left: 0;
	width: 64px;
	height: 76px;
	object-fit: cover;
	display: block;
}

.quote-sheet__body {
	display: grid;
	grid-template-columns: 158px 1fr;
	align-items: stretch;
}

.quote-sheet__rail {
	background: var(--quote-blue);
	border-right: 1px solid #111;
}

.quote-sheet__rail-block {
	display: none;
}

.quote-sheet__rail-block span {
	display: none;
}

.quote-sheet__content {
	padding: 0;
	border-right: 2px solid #111;
}

.quote-section--intro {
	min-height: 58px;
	padding: 10px 12px 7px;
	text-align: center;
	font-size: 16px;
	line-height: 1.5;
	border-bottom: 1px solid #111;
}

.quote-section--intro p {
	margin: 0;
}

.quote-table {
	width: 100%;
	border-collapse: collapse;
	table-layout: fixed;
}

.quote-table th,
.quote-table td {
	min-height: 34px;
	padding: 4px 8px;
	border: 1px solid #777;
	vertical-align: middle;
	word-break: break-word;
}

.quote-table th {
	font-weight: 700;
	background: #fff;
}

.quote-table--party {
	border: 1px solid #111;
	border-top: 0;
	font-size: 14px;
	line-height: 1.45;
}

.quote-table--party th,
.quote-table--party td {
	height: 29px;
	min-height: 29px;
	padding: 3px 4px;
	border: 0;
}

.quote-table--party tr:first-child th {
	height: 31px;
	padding: 4px;
	border-bottom: 1px solid #111;
	text-align: left;
	font-size: 15px;
}

.quote-table--party tr:first-child th + th {
	border-left: 1px solid #111;
}

.quote-table--party tr:not(:first-child) th {
	text-align: left;
	font-size: 14px;
}

.quote-table--party tr:not(:first-child) th:nth-child(3) {
	border-left: 1px solid #111;
}

.quote-party__label {
	width: 72px;
}

.quote-party__value {
	width: auto;
}

.quote-table--project {
	width: calc(100% + 112px);
	margin-left: -112px;
	border-left: 1px solid #111;
	border-right: 1px solid #111;
	font-size: 16px;
}

.quote-table--project th,
.quote-table--project td {
	border-color: #111;
}

.quote-project__label-col {
	width: 112px;
}

.quote-project__product-col {
	width: 124px;
}

.quote-project__spec-col {
	width: auto;
}

.quote-project__qty-col {
	width: 124px;
}

.quote-project__price-col {
	width: 124px;
}

.quote-table__label {
	width: 112px;
	text-align: center;
	background: #d3d3d3 !important;
	font-size: 20px;
}
.quote-table-total {
	width: 112px;
	text-align: center;
	background: #fdfbfb !important;
	font-size: 20px;
}

.quote-table__number {
	font-size: 22px;
}

.quote-table__center {
	text-align: center;
}

.quote-table__right {
	text-align: right;
}

.quote-table__remark-label {
	height: 116px;
}

.quote-table__remark {
	text-align: center;
	background: #d3d3d3;
	font-size: 17px;
	line-height: 1.65;
}

.quote-total {
	padding: 10px 12px 8px;
	text-align: center;
	border-left: 1px solid #777;
	border-right: 1px solid #777;
}

.quote-total__amount {
	color: #e60012;
	font-size: 23px;
	font-weight: 700;
}

.quote-bar {
	padding: 4px 0;
	text-align: center;
	font-size: 20px;
	font-weight: 700;
	background: #d3d3d3;
	border: 1px solid #d3d3d3;
}

.quote-table--payment th {
	color: #e60012;
	text-align: center;
}

.quote-table--payment {
	border-left: 1px solid #777;
	border-right: 1px solid #777;
}

.quote-table--payment th,
.quote-table--payment td {
	border: 0;
}

.quote-bank {
	min-height: 462px;
	padding: 0 0 28px;
	background: #fff;
	border-left: 1px solid #777;
	border-right: 1px solid #777;
}

.quote-bank__title {
	padding: 2px 0 22px;
	text-align: center;
	font-size: 16px;
	font-weight: 700;
}

.quote-bank__cover {
	display: block;
	width: 580px;
	max-width: calc(100% - 180px);
	margin: 0 auto 74px;
	object-fit: contain;
}

.quote-bank__info {
	display: grid;
	grid-template-columns: 1.15fr 1.55fr 0.85fr;
	column-gap: 12px;
	padding: 0 12px 0 4px;
	font-size: 16px;
	font-weight: 700;
	line-height: 1.55;
}

.quote-bank__info p {
	margin: 0;
}

.quote-bank__contact,
.quote-bank__account-name,
.quote-bank__account-no {
	min-width: 0;
}

.quote-bank__account-name,
.quote-bank__account-no {
	text-align: center;
}

.quote-terms {
	padding: 10px 18px 18px;
	border-left: 1px solid #777;
	border-right: 1px solid #777;
}

.quote-terms__section {
	margin-bottom: 12px;
}

.quote-terms__section h3 {
	margin: 0 0 6px;
	font-size: 19px;
	font-weight: 700;
}

.quote-terms__item {
	display: grid;
	grid-template-columns: 54px 1fr;
	gap: 10px;
	margin: 6px 0;
}

.quote-terms__no {
	text-align: center;
}

.quote-terms__item p {
	margin: 0;
	text-align: justify;
	line-height: 1.75;
}

.quote-term-date {
	text-decoration: underline;
	text-underline-offset: 3px;
	text-decoration-thickness: 1px;
}

.quote-sign {
	display: grid;
	grid-template-columns: 158px 1fr;
	width: calc(100% + 158px);
	min-height: 360px;
	margin-left: -158px;
	border-right: 1px solid #111;
	border-bottom: 1px solid #111;
	background: #fff;
	box-sizing: border-box;
}

.quote-sign__rail {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	background: var(--quote-blue);
	color: #fff;
	font-size: 16px;
	font-weight: 700;
}

.quote-sign__meta {
	width: 100%;
	margin-top: 56px;
	line-height: 1.4;
	text-align: left;
}

.quote-sign__meta div {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-height: 48px;
	padding-left: 8px;
	padding-right: 12px;
	box-sizing: border-box;
	text-align: right;
}

.quote-sign__values {
	position: absolute;
	top: 56px;
	left: 10px;
	width: 230px;
	color: #111;
	font-size: 14px;
	font-weight: 600;
	line-height: 1.4;
}

.quote-sign__values div {
	display: flex;
	align-items: center;
	min-height: 48px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.quote-sign__logo {
	width: 120px;
	max-width: calc(100% - 12px);
	margin-top: 8px;
	margin-left: 10px;
}

.quote-sign__content {
	position: relative;
	min-height: 360px;
}

.quote-sign__names {
	position: absolute;
	top: 162px;
	left: 70px;
	right: 210px;
	display: flex;
	justify-content: space-between;
	font-size: 16px;
	color: #111;
}

.quote-sign__company-seal {
	position: absolute;
	top: 175px;
	right: 109px;
	width: 130px;
	height: 130px;
	object-fit: contain;
	pointer-events: none;
}

@media print {
	.quote-preview-page {
		padding: 0;
		background: #fff;
	}

	.quote-preview-canvas,
	.quote-sheet {
		width: 100%;
		margin: 0;
		box-shadow: none;
	}
}
</style>
