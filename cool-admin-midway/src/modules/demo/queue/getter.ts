import { BaseCoolQueue, CoolQueue } from '@cool-midway/task';

/**
 * 主動消費佇列
 */
@CoolQueue({ type: 'getter' })
export class DemoGetterQueue extends BaseCoolQueue {}
