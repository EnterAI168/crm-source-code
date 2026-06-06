import { defineComponent, h, onMounted, onUnmounted, ref } from "vue";
import { useBrowser, useConfig, useCore } from "../../hooks";

export default defineComponent({
	name: "cl-pagination",

	setup(_, { expose }) {
		const { crud, mitt } = useCore();
		const { style } = useConfig();
		const browser = useBrowser();

		// 總數
		const total = ref(0);

		// 當前頁數
		const currentPage = ref(1);

		// 每頁大小
		const pageSize = ref(20);

		// 頁數發生變化
		function onCurrentChange(index: number) {
			crud.refresh({
				page: index
			});
		}

		// 條目發生變化
		function onSizeChange(size: number) {
			crud.refresh({
				page: 1,
				size
			});
		}

		// 設定分頁資訊
		function setPagination(res: obj) {
			if (res) {
				currentPage.value = res.currentPage || res.page || 1;
				pageSize.value = res.pageSize || res.size || 20;
				total.value = res.total || 0;
				crud.params.size = pageSize.value;
			}
		}

		// 資料重新整理
		function onRefresh(res: ClCrud.Response["page"]) {
			setPagination(res.pagination);
		}

		// 監聽重新整理事件
		onMounted(() => {
			mitt.on("crud.refresh", onRefresh);
		});

		// 移除監聽事件
		onUnmounted(() => {
			mitt.off("crud.refresh", onRefresh);
		});

		expose({
			total,
			currentPage,
			pageSize,
			setPagination
		});

		return () => {
			return h(
				<el-pagination
					class="cl-pagination"
					size={browser.isMini ? 'small' : style.size}
					background
					page-sizes={[10, 20, 30, 40, 50, 100]}
					pager-count={browser.isMini ? 5 : 7}
					layout={
						browser.isMini ? "total, pager" : "total, sizes, prev, pager, next, jumper"
					}
				/>,
				{
					onSizeChange,
					onCurrentChange,
					total: total.value,
					currentPage: currentPage.value,
					pageSize: pageSize.value
				}
			);
		};
	}
});
