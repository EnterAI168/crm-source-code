import { useCrud } from '@cool-vue/crud';
import { deepTree } from '/@/cool/utils';
import { isEmpty } from 'lodash-es';

interface Item extends Eps.BaseSysMenuEntity {
	children?: Item[];
	_children?: Item[];
	hasChildren?: boolean;
}

/**
 * 樹形表格
 * @param options.lazy 是否懶載入，資料過多時開啟
 * @param options.onRefresh 重新整理方法
 * @returns
 */
export function toTree(
	options: { lazy?: boolean; onRefresh?: (params: any) => Promise<any[]> } = {}
) {
	return ({ exposed }) => {
		const Crud = useCrud();

		// 設定重新整理方法
		if (Crud.value) {
			// 原 cl-crud 的 onRefresh
			const onRefresh = Crud.value.config.onRefresh;

			// 重寫 onRefresh
			Crud.value.config.onRefresh = async (
				params: Parameters<ClCrud.Config['onRefresh']>[0],
				{ render, next, done }: Parameters<ClCrud.Config['onRefresh']>[1]
			) => {
				const req: Promise<any[]> = new Promise(resolve => {
					if (onRefresh) {
						const _next = async (params?: any) => {
							const res = await next(params);
							resolve(res.list);
						};

						const _render = (list: any[]) => {
							resolve(list);
						};

						onRefresh(params, { render: _render, next: _next, done });
					} else {
						resolve(
							options.onRefresh
								? options.onRefresh(params)
								: Crud.value?.service[Crud.value.dict.api.list](params)
						);
					}
				});

				const list = await req;

				render(onData(list, params.sort));
			};
		}

		// 資料處理
		const onData = (list: Item[], sort: 'desc' | 'asc') => {
			const data = deepTree(list, sort);

			// 遞迴處理
			const deep = (arr: Item[]) => {
				arr.forEach(e => {
					const nodes: { [key: number]: Item[] } =
						exposed.Table.value?.store.states.lazyTreeNodeMap.value || {};

					if (nodes[e.id!]) {
						nodes[e.id!] = e.children || [];
					}

					if (!isEmpty(e.children)) {
						e.hasChildren = true;
						e._children = e.children;

						if (options.lazy) {
							delete e.children;
						}

						deep(e._children || []);
					}
				});
			};

			deep(data);

			return data;
		};

		// 層級參數
		exposed.config.props.lazy = true;
		exposed.config.props['row-key'] = 'id';
		exposed.config.props['tree-props'] = {
			children: 'children',
			hasChildren: 'hasChildren'
		};

		// 層級事件
		exposed.config.on.load = (
			row: Item,
			treeNode: unknown,
			resolve: (data: Item[]) => void
		) => {
			resolve(row._children || []);
		};

		// 行點選
		exposed.config.on.onRowClick = (row: Item) => {
			if (row._children) {
				exposed.Table.value?.store.loadOrToggle(row);
			}
		};
	};
}
