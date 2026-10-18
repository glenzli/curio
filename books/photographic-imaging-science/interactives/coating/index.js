import { mount as single } from './single-layer-view.js';
import { mount as multilayer } from '../multilayer/index.js';
import { tabs } from '../common/tabs.js';
export function mount(context) {
 return tabs({...context, title:'镀膜实验', modes:[['single','单层相消',single],['multilayer','多层膜',multilayer]]});
}
