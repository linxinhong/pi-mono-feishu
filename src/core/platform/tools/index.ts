/**
 * Platform Tools Module
 *
 * 平台工具系统统一入口
 */

// Types
export type { PlatformToolMeta, PlatformTool } from "./types.js";

// Naming
export {
	TOOL_NAMES,
	FEISHU_TOOL_NAMES,
	buildToolName,
	parseToolName,
	isPlatformToolName,
} from "./naming.js";

// Description
export {
	createPlatformDescription,
	getPlatformDisplayName,
	getPlatformIcon,
	createToolLabel,
} from "./description.js";
