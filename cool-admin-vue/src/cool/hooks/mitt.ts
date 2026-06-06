import Mitt, { type Emitter } from 'mitt';
import { hmr } from './hmr';

export const mitt: Emitter<any> = hmr.getData('mitt', Mitt());

// 返回 mitt 例項，用於在應用中進行事件的釋出和訂閱
export function useMitt() {
	return mitt;
}
