/**
 * Core Store Module
 *
 * 通用存储系统，平台无关
 */

// Types
export type {
	Attachment,
	LoggedMessage,
	BaseStoreConfig,
	DownloadRequest,
	AttachmentInput,
	PlatformStore,
} from "./types.js";

// Base Store
export { BaseStore } from "./base.js";
