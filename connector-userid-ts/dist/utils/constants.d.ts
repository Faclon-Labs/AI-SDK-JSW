export declare const VERSION: string;
export interface TimezoneConfig {
    readonly UTC: string;
    readonly IST: string;
}
export declare const TIMEZONES: TimezoneConfig;
export declare const MAX_CHUNK_SIZE: number;
export declare const SLEEP_TIME: number;
export declare const GET_USER_INFO_URL: string;
export declare const GET_DEVICE_DETAILS_URL: string;
export declare const GET_DEVICE_METADATA_URL: string;
export declare const GET_DP_URL: string;
export declare const GET_FIRST_DP: string;
export declare const GET_LOAD_ENTITIES: string;
export declare const INFLUXDB_URL: string;
export declare const GET_CURSOR_BATCHES_URL: string;
export declare const CONSUMPTION_URL: string;
export declare const TRIGGER_URL: string;
export declare const CLUSTER_AGGREGATION: string;
export declare const GET_FILTERED_OPERATION_DATA: string;
export declare const FETCH_USER_INSIGHTS_URL: string;
export declare const GET_SOURCE_INSIGHT_URL: string;
export declare const FETCH_INSIGHT_RESULTS_URL: string;
export declare const PUBLISH_EVENT_URL: string;
export declare const GET_EVENTS_IN_TIMESLOT_URL: string;
export declare const GET_EVENT_DATA_COUNT_URL: string;
export declare const GET_EVENT_CATEGORIES_URL: string;
export declare const GET_DETAILED_EVENT_URL: string;
export declare const GET_MONGO_DATA: string;
export declare const GET_MAINTENANCE_MODULE_DATA: string;
export declare const GET_DEVICE_DATA: string;
export declare const GET_SENSOR_ROWS: string;
export declare const GET_DEVICE_METADATA_MONGO_URL: string;
export declare const CREATE_MONGO_ROWS_URL: string;
export declare const MAX_RETRIES: number;
export declare const RETRY_DELAY: readonly [number, number];
export declare const CURSOR_LIMIT: number;
export interface UrlTemplateParams {
    protocol: 'http' | 'https';
    data_url: string;
    device_id?: string;
}
export type ApiEndpoint = string;
export declare enum Protocol {
    HTTP = "http",
    HTTPS = "https"
}
export declare enum TimezoneId {
    UTC = "UTC",
    IST = "Asia/Kolkata"
}
//# sourceMappingURL=constants.d.ts.map