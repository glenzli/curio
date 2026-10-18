import { mount as mountTransfer } from './transfer.js';
import { mount as mountCalibration } from './calibration-view.js';
import { tabs } from '../common/tabs.js';
export function mount(context) {
 return tabs({...context, title:'平场实验', modes:[['transfer','增益拟合',mountTransfer],['calibration','相关噪声与暗场',mountCalibration]]});
}
