<template>
	<div class="card">
		<div class="card__header">
			<span class="label">{{ $t('熱門商品排行') }}</span>

			<cl-select-button v-model="type" :options="options.type" small />
		</div>

		<div class="card__container">
			<cl-crud ref="Crud" padding="0">
				<cl-table ref="Table" />
			</cl-crud>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useCrud, useTable } from '@cool-vue/crud';
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 型別
const type = ref('day');

// 選項
const options = reactive({
	type: [
		{
			label: t('今日'),
			value: 'day'
		},
		{
			label: t('本週'),
			value: 'week'
		},
		{
			label: t('本月'),
			value: 'month'
		},
		{
			label: t('全年'),
			value: 'year'
		}
	]
});

const Crud = useCrud(
	{
		service: {
			page() {
				return Promise.resolve({
					list: [
						{
							keyWord: '無線耳機',
							count: 983,
							ud: 5,
							launchDate: '2023-01-01',
							price: 299
						},
						{
							keyWord: '運動耳機',
							count: 763,
							ud: -3,
							launchDate: '2023-02-15',
							price: 199
						},
						{
							keyWord: '藍牙音箱',
							count: 328,
							ud: 7,
							launchDate: '2023-03-10',
							price: 399
						},
						{
							keyWord: '4k顯示屏',
							count: 144,
							ud: 4,
							launchDate: '2023-04-05',
							price: 999
						},
						{
							keyWord: '羅技 G530',
							count: 121,
							ud: -1,
							launchDate: '2023-05-20',
							price: 499
						},
						{
							keyWord: '智慧手錶',
							count: 450,
							ud: 2,
							launchDate: '2023-06-15',
							price: 599
						},
						{
							keyWord: '遊戲滑鼠',
							count: 300,
							ud: 6,
							launchDate: '2023-07-01',
							price: 150
						},
						{
							keyWord: '機械鍵盤',
							count: 200,
							ud: -2,
							launchDate: '2023-08-10',
							price: 350
						},
						{
							keyWord: 'VR眼鏡',
							count: 150,
							ud: 8,
							launchDate: '2023-09-05',
							price: 799
						},
						{
							keyWord: '智慧音箱',
							count: 100,
							ud: 3,
							launchDate: '2023-10-01',
							price: 250
						}
					]
				});
			}
		}
	},
	app => {
		app.refresh();
	}
);

const Table = useTable({
	autoHeight: false,
	contextMenu: ['order-asc', 'order-desc'],
	columns: [
		{
			label: t('排名'),
			type: 'index',
			width: 60
		},
		{
			label: t('商品名稱'),
			prop: 'keyWord',
			minWidth: 120
		},
		{
			label: t('商品金額'),
			prop: 'price',
			minWidth: 100
		},
		{
			label: t('下單次數'),
			prop: 'count',
			minWidth: 100,
			sortable: true
		},
		{
			label: t('日漲幅'),
			prop: 'ud',
			sortable: true,
			minWidth: 100
		},
		{
			label: t('上架時間'),
			prop: 'launchDate',
			minWidth: 120
		}
	]
});
</script>

<style lang="scss" scoped>
.card {
	padding-bottom: 20px;
}
</style>
