// src/constants.ts
export const VERSION = '1.0.0';
export const TIMEZONES = {
    UTC: 'UTC',
    IST: 'Asia/Kolkata'
};
/* ----------------------------- MQTT HANDLER ------------------------------- */
export const MAX_CHUNK_SIZE = 1000;
export const SLEEP_TIME = 1;
/* ----------------------------- DATA ACCESS -------------------------------- */
export const GET_USER_INFO_URL = '{protocol}://{data_url}/api/metaData/user';
export const GET_DEVICE_DETAILS_URL = '{protocol}://{data_url}/api/metaData/allDevices';
export const GET_DEVICE_METADATA_URL = '{protocol}://{data_url}/api/metaData/device/{device_id}';
export const GET_DP_URL = '{protocol}://{data_url}/api/apiLayer/getLimitedDataMultipleSensors/';
export const GET_FIRST_DP = '{protocol}://{data_url}/api/apiLayer/getMultipleSensorsDPAfter';
export const GET_LOAD_ENTITIES = '{protocol}://{data_url}/api/metaData/getAllClusterData';
export const INFLUXDB_URL = '{protocol}://{data_url}/api/apiLayer/getAllData';
export const GET_CURSOR_BATCHES_URL = '{protocol}://{data_url}/api/apiLayer/getCursorOfBatches';
export const CONSUMPTION_URL = '{protocol}://{data_url}/api/apiLayer/getStartEndDPV2';
export const TRIGGER_URL = '{protocol}://{data_url}/api/expression-schedular/user-trigger-with-title';
export const CLUSTER_AGGREGATION = '{protocol}://{data_url}/api/widget/clusterData';
export const GET_FILTERED_OPERATION_DATA = '{protocol}://{data_url}/api/consumption/getOperationDataWithTime';
/* ----------------------------- BRUCE HANDLER ------------------------------ */
export const FETCH_USER_INSIGHTS_URL = '{protocol}://{data_url}/api/bruce/userInsight/fetch/paginated';
export const GET_SOURCE_INSIGHT_URL = '{protocol}://{data_url}/api/bruce/userInsight/fetch/getSourceInsight/{insight_id}';
export const FETCH_INSIGHT_RESULTS_URL = '{protocol}://{data_url}/api/bruce/insightResult/fetch/paginated/{insight_id}';
/* ----------------------------- EVENTS HANDLER ----------------------------- */
export const PUBLISH_EVENT_URL = '{protocol}://{data_url}/api/eventTag/publishEvent';
export const GET_EVENTS_IN_TIMESLOT_URL = '{protocol}://{data_url}/api/eventTag/fetchEvents/timeslot';
export const GET_EVENT_DATA_COUNT_URL = '{protocol}://{data_url}/api/eventTag/fetchEvents/count';
export const GET_EVENT_CATEGORIES_URL = '{protocol}://{data_url}/api/eventTag';
export const GET_DETAILED_EVENT_URL = '{protocol}://{data_url}/api/eventTag/eventLogger';
export const GET_MONGO_DATA = '{protocol}://{data_url}/api/table/getRows3';
export const GET_MAINTENANCE_MODULE_DATA = '{protocol}://{data_url}/api/widget/getMaintenanceModuleData';
export const GET_DEVICE_DATA = '{protocol}://{data_url}/api/table/getRowsByDevices';
export const GET_SENSOR_ROWS = '{protocol}://{data_url}/api/table/getRowBySensor';
export const GET_DEVICE_METADATA_MONGO_URL = '{protocol}://{data_url}/api/getDeviceData';
export const CREATE_MONGO_ROWS_URL = '{protocol}://{data_url}/api/table/createRows3';
// API Configuration constants
export const MAX_RETRIES = 15;
export const RETRY_DELAY = [2, 4];
export const CURSOR_LIMIT = 25000;
// Enum for common protocols
export var Protocol;
(function (Protocol) {
    Protocol["HTTP"] = "http";
    Protocol["HTTPS"] = "https";
})(Protocol || (Protocol = {}));
// Enum for timezone identifiers
export var TimezoneId;
(function (TimezoneId) {
    TimezoneId["UTC"] = "UTC";
    TimezoneId["IST"] = "Asia/Kolkata";
})(TimezoneId || (TimezoneId = {}));
//# sourceMappingURL=constants.js.map