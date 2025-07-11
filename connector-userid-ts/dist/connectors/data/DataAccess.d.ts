export interface DataAccessConfig {
    userId: string;
    dataUrl: string;
    dsUrl: string;
    onPrem?: boolean;
    tz?: string;
}
export interface ApiResponse<T = any> {
    data: T;
    errors?: string[];
}
export interface DeviceDetail {
    devID: string;
    devTypeID: string;
}
export interface SensorInfo {
    sensorId: string;
    sensorName: string;
}
export interface DeviceMetadata {
    _id: string;
    devID: string;
    devName: string;
    devTypeID: string;
    devTypeName: string;
    sensors: SensorInfo[];
    location?: {
        latitude: number;
        longitude: number;
    };
    tags?: string[];
    addedOn: string;
    widgets: any[];
    params: Record<string, any>;
    topic: string;
    canUserEdit: boolean;
    star: boolean;
    unit: Record<string, string[]>;
    unitSelected: Record<string, string>;
    properties: Array<{
        propertyName: string;
        propertyValue: any;
    }>;
    added_by: string;
    config: any[];
    geoFences: any[];
    custom: Record<string, any>;
    __v: number;
    isHidden: boolean;
}
export interface UserInfo {
    _id: string;
    email: string;
    organisation: {
        _id: string;
        orgID: string;
        orgName: string;
        hostname: string;
        phone: number;
    };
    timeCreated: string;
    userDetail: {
        personalDetails: {
            name: {
                first: string;
                last: string;
            };
            phone: {
                number: string;
                internationalNumber: string;
                dialCode: string;
                countryCode: string;
                e164Number: string;
                name: string;
            };
            profilePicUrl: string;
            gender: string;
        };
        _id: string;
    };
}
export interface SensorDataPoint {
    time: string | number;
    sensor: string;
    value: string | number | null;
}
export interface RawSensorData {
    time?: string | number;
    sensor?: string;
    value?: string | number | null;
}
export interface CursorInfo {
    end?: number;
    limit?: number;
}
export interface GetFirstDpOptions {
    deviceId: string;
    sensorList?: string[] | null;
    cal?: boolean;
    startTime?: string | number | Date | null;
    n?: number;
    alias?: boolean;
    unix?: boolean;
    onPrem?: boolean | null;
}
export interface GetDpOptions {
    deviceId: string;
    sensorList?: string[] | null;
    n?: number;
    cal?: boolean;
    endTime?: string | number | Date | null;
    alias?: boolean;
    unix?: boolean;
    onPrem?: boolean | null;
}
export interface CleanedTableOptions {
    data: any[];
    alias?: boolean;
    cal?: boolean;
    deviceId?: string | false;
    sensorList?: string[];
    onPrem?: boolean;
    unix?: boolean;
    metadata?: DeviceMetadata | null;
    pivotTable?: boolean;
}
export interface DataQueryOptions {
    deviceId: string;
    sensorList?: string[] | null;
    startTime?: string | number | Date | null;
    endTime?: string | number | Date | null;
    cal?: boolean;
    alias?: boolean;
    unix?: boolean;
    onPrem?: boolean | null;
}
export interface InfluxDbOptions {
    deviceId: string;
    startTime: number;
    endTime: number;
    alias?: boolean;
    cal?: boolean;
    unix?: boolean;
    sensorList?: string[];
    metadata?: DeviceMetadata | null;
    onPrem?: boolean | null;
}
export interface CursorData {
    start?: number;
    end?: number;
}
export interface GetLoadEntitiesOptions {
    onPrem?: boolean | null;
    clusters?: string[] | null;
}
export interface LoadEntity {
    id: string;
    name: string;
    type?: string;
    description?: string;
    [key: string]: any;
}
export interface LoadEntitiesResponse {
    data: LoadEntity[];
    totalCount: number;
    error?: boolean;
}
export default class DataAccess {
    private userId;
    private dataUrl;
    private dsUrl;
    private onPrem;
    private tz;
    /**
     * Class constructor for DataAccess.
     * @param options - Configuration options for DataAccess.
     * @param options.userId - The user ID to use for API requests.
     * @param options.dataUrl - The data URL for the API.
     * @param options.dsUrl - The DS URL for the API.
     * @param options.onPrem - Whether the API is on-premises or Live. Defaults to false.
     * @param options.tz - Timezone to use. Defaults to "UTC".
     */
    constructor({ userId, dataUrl, dsUrl, onPrem, tz }: DataAccessConfig);
    /**
     * Helper function to format error messages
     * @param response - The axios response object
     * @param url - The URL that was requested
     * @returns Formatted error message
     */
    private errorMessage;
    /**
     * Convert a given time to Unix timestamp in milliseconds.
     * @param time - The time to be converted. It can be a string in ISO 8601 format, a Unix timestamp in milliseconds, or a Date object. If null or undefined, the current time is used.
     * @param timezone - The timezone to use (e.g., 'America/New_York', 'UTC'). This is used when time is not provided or doesn't have timezone info.
     * @returns The Unix timestamp in milliseconds.
     * @throws Error if the provided Unix timestamp is not in milliseconds or if there are mismatched offset times.
     */
    private timeToUnix;
    /**
     * Sleep for a specified number of milliseconds
     * @param ms - Number of milliseconds to sleep
     * @returns Promise that resolves after the specified time
     */
    private _sleep;
    /**
     * Format sensor data from API response
     * @param data - Raw sensor data from API
     * @returns Formatted sensor data array
     */
    private formatSensorData;
    /**
     * Gets a cleaned table from sensor data
     * @param options - Configuration options for cleaning the data
     * @returns The cleaned data array
     */
    private getCleanedTable;
    /**
     * Fetches user info from the API using axios.
     * @param onPremOverride - Whether to   override the onPrem flag.
     * @returns User info object with the following structure:
     * ```typescript
     * {
     *   _id: string;           // User ID
     *   email: string;         // User's email address
     *   organisation: {
     *     _id: string;         // Organization ID
     *     orgID: string;       // Organization identifier
     *     orgName: string;     // Organization name
     *     hostname: string;    // Organization hostname
     *     phone: number;       // Organization phone number
     *   };
     *   timeCreated: string;   // ISO timestamp of account creation
     *   userDetail: {
     *     personalDetails: {
     *       name: {
     *         first: string;   // First name
     *         last: string;    // Last name
     *       };
     *       phone: {
     *         number: string;              // Phone number
     *         internationalNumber: string; // International format
     *         dialCode: string;           // Country dial code
     *         countryCode: string;        // Country code
     *         e164Number: string;         // E.164 format
     *         name: string;               // Country name
     *       };
     *       profilePicUrl: string;        // Profile picture URL
     *       gender: string;               // Gender
     *     };
     *     _id: string;         // User detail ID
     *   };
     * }
     * ```
     *
     * @example
     * ```typescript
     * const dataAccess = new DataAccess({
     *   userId: '645a15922****a319ca5f5ad',
     *   dataUrl: 'data*****sense.io',
     *   dsUrl: 'ds-serv*****sense.io'
     * });
     *
     * const userInfo = await dataAccess.getUserInfo();
     *
     * // Example output:
     * // {
     * //   "_id": "",
     * //   "email": "",
     * //   "organisation": {
     * //     "_id": "",
     * //     "orgID": "Facabs",
     * //     "orgName": "Faabs",
     * //     "hostname": "ios.io",
     * //     "phone":
     * //   },
     * //   "timeCreated": "2023-05-09T09:42:42.189Z",
     * //   "userDetail": {
     * //     "personalDetails": {
     * //       "name": {
     * //         "first": "Data",
     * //         "last": "Science"
     * //       },
     * //       "phone": {
     * //         "number": "9005900762",
     * //         "internationalNumber": "",
     * //         "dialCode": "91",
     * //         "countryCode": "in",
     * //         "e164Number": "",
     * //         "name": "India"
     * //       },
     * //       "profilePicUrl": "",
     * //       "gender": "male"
     * //     },
     * //     "_id": ""
     * //   }
     * // }
     * ```
     *
     * @throws Error if an error occurs during the HTTP request, such as a network issue or timeout.
     * @throws Error if an unexpected error occurs during metadata retrieval, such as parsing JSON data or other unexpected issues.
     */
    getUserInfo(onPremOverride?: boolean | null): Promise<UserInfo | {}>;
    /**
     * Fetches device details from the API using axios.
     * @param onPremOverride - Whether to override the onPrem flag.
     * @returns Array of device details with the following structure:
     * ```typescript
     * Array<{
     *   devID: string;      // Unique device identifier (e.g., "RHT_231049", "UT2312EM_A2")
     *   devTypeID: string;  // Device type identifier (e.g., "TEMP_HMD_BAT", "ENERGY039")
     * }>
     * ```
     *
     * @example
     * ```typescript
     * const dataAccess = new DataAccess({
     *   userId: '645a15922****',
     *   dataUrl: 'data*****se',
     *   dsUrl: 'ds-serv*****se'
     * });
     *
     * const devices = await dataAccess.getDeviceDetails();
     *
     * // Example output:
     * // [
     * //   {
     * //     "devID": "RHT_231049",
     * //     "devTypeID": "TEMP_HMD_BAT"
     * //   },
     * //   {
     * //     "devID": "UT2312EM_A2",
     * //     "devTypeID": "ENERGY039"
     * //   },
     * //   {
     * //     "devID": "DS_TEST_DATA_POSTING",
     * //     "devTypeID": "ENERGY456"
     * //   }
     * // ]
     * ```
  
     *
     * @throws Error if an error occurs during the HTTP request, such as a network issue or timeout.
     * @throws Error if an unexpected error occurs during metadata retrieval, such as parsing JSON data or other unexpected issues.
     */
    getDeviceDetails(onPremOverride?: boolean | null): Promise<DeviceDetail[] | {}>;
    /**
     * Fetches device metadata from the API using axios.
     * @param deviceID - The ID of the device to fetch metadata for.
     * @param onPremOverride - Whether to override the onPrem flag.
     * @returns Device metadata object with the following structure:
     * ```typescript
     * {
     *   _id: string;                    // Device metadata ID
     *   devID: string;                  // Device identifier
     *   devName: string;                // Device name
     *   devTypeID: string;              // Device type identifier
     *   devTypeName: string;            // Device type name
     *   sensors: Array<{               // List of sensors
     *     sensorId: string;            // Sensor identifier
     *     sensorName: string;          // Human-readable sensor name
     *     globalName: string;          // Global sensor name
     *   }>;
     *   location?: {                    // Device location
     *     latitude: number;
     *     longitude: number;
     *   };
     *   tags?: string[];               // Device tags
     *   params: Record<string, Array<{  // Sensor parameters
     *     paramName: string;           // Parameter name (e.g., "m", "c", "min", "max")
     *     paramValue: any;             // Parameter value
     *   }>>;
     *   unit: Record<string, string[]>; // Available units for each sensor
     *   unitSelected: Record<string, string>; // Selected units for each sensor
     *   properties: Array<{            // Device properties
     *     propertyName: string;
     *     propertyValue: any;
     *   }>;
     *   custom: Record<string, Array<{  // Custom sensor configurations
     *     customShow: string;
     *     customVariable: string;
     *   }>>;
     * }
     * ```
     *
  
     * ```
     *
     * @throws Error if an error occurs during the HTTP request, such as a network issue or timeout.
     * @throws Error if an unexpected error occurs during metadata retrieval, such as parsing JSON data or other unexpected issues.
     */
    getDeviceMetaData(deviceID: string, onPremOverride?: boolean | null): Promise<DeviceMetadata | {}>;
    /**
     * Retrieves the first datapoint(s) for specified sensors on a device starting from a given time.
     * @param options - Configuration options
     * @param options.deviceId - The ID of the device to fetch data from
     * @param options.sensorList - List of sensor IDs. If null, fetches data for all sensors
     * @param options.cal - Whether to apply calibration to sensor values
     * @param options.startTime - The time from which to start fetching data (Unix timestamp in milliseconds)
     * @param options.n - Number of datapoints to fetch (must be ≥ 1)
     * @param options.alias - Whether to use sensor aliases instead of IDs
     * @param options.unix - Whether to return timestamps in Unix format
     * @param options.onPrem - Whether to use on-premise API endpoints
     * @returns Array of datapoints with time and sensor values. Each datapoint has the following structure:
     * ```typescript
     * {
     *   time: number;      // unix timestamp (e.g., 1718102400)
     *   sensor: string;    // Sensor ID (e.g., "D5", "D13") or sensor name if alias=true
     *   value: number | null;  // Sensor reading value or null if no data available
     * }
     * ```
     *
     * @example
     * ```typescript
     * const dataAccess = new DataAccess({
     *   userId: '645a15922****',
     *   dataUrl: 'data*****',
     *   dsUrl: 'ds-serv*****'
     * });
     *
     * // Get first datapoint for specific sensors after a given time
     * const result = await dataAccess.getFirstDp({
     *   deviceId: 'tvhf',
     *   sensorList: ["D5", "D13"],
     *   n: 1,
     *   startTime: 1687344669000,
     *   cal: true,
     *   alias: false,
     *   unix: false,
     *   onPrem: null
     * });
     *
     * // Example output:
     * // [
     * //   {
     * //     "time": "2023-12-30T05:18:59.000Z",
     * //     "sensor": "D5",
     * //     "value": 6418.59
     * //   },
     * //   {
     * //     "time": "2023-12-29T10:16:42.000Z",
     * //     "sensor": "D13",
     * //     "value": null
     * //   }
     * // ]
     * ```
     *
     * @throws Error if parameter 'n' is less than 1
     * @throws Error if the specified device is not found in the account
     * @throws Error if no sensor data is available for the device
     * @throws Error if the API request fails or returns an error response
     */
    getFirstDp(options: GetFirstDpOptions): Promise<any[]>;
    /**
     * Retrieves datapoint(s) for specified sensors on a device up until a given end time.
     * @param options - Configuration options
     * @param options.deviceId - The ID of the device to fetch data from
     * @param options.sensorList - List of sensor IDs. If null, fetches data for all sensors
     * @param options.n - Number of datapoints to fetch
     * @param options.cal - Whether to apply calibration to sensor values
     * @param options.endTime - The time up until which to fetch data
     * @param options.alias - Whether to use sensor aliases instead of IDs
     * @param options.unix - Whether to return timestamps in Unix format
     * @param options.onPrem - Whether to use on-premise API endpoints
     * @returns Array of datapoints with time and sensor values. Each datapoint has the following structure:
     * ```typescript
     * {
     *   time: string;      // ISO timestamp (e.g., "2024-04-20T11:03:01.000Z")
     *   sensor: string;    // Sensor name (if alias=true) or sensor ID (if alias=false)
     *   value: number;     // Sensor reading value
     * }
     * ```
     *
     * @example
     * ```typescript
     * const dataAccess = new DataAccess({
     *   userId: '645a15*******',
     *   dataUrl: 'datad*****',
     *   dsUrl: 'ds-ser****.'
     * });
     *
     * // Get last 2 datapoints for all sensors
     * const result = await dataAccess.getDp({
     *   deviceId: 'DS_TEST_STING',
     *   sensorList: null,
     *   n: 2,
     *   endTime: 1717180320000,
     *   cal: true,
     *   alias: true,
     *   unix: false
     * });
     *
     * // Example output:
     * // [
     * //   {
     * //     "time": "2024-04-20T11:03:01.000Z",
     * //     "sensor": "Line Voltage",
     * //     "value": 0.765
     * //   },
     * //   {
     * //     "time": "2024-04-20T06:03:26.000Z",
     * //     "sensor": "Line Voltage",
     * //     "value": 0.645
     * //   },
     * //   // ... more datapoints for other sensors
     * // ]
     * ```
     *
     * @throws Error if parameter 'n' is less than 1
     * @throws Error if the specified device is not found in the account
     * @throws Error if no sensor data is available for the device
     * @throws Error if the API request fails or returns an error response
     */
    getDp(options: GetDpOptions): Promise<any[]>;
    /**
     * Queries sensor data for a device within a specified time range.
     * @param options - Configuration options
     * @param options.deviceId - The ID of the device to fetch data from
     * @param options.sensorList - List of sensor IDs. If null, fetches data for all sensors
     * @param options.startTime - Start time for the query range (Unix timestamp in milliseconds)
     * @param options.endTime - End time for the query range (Unix timestamp in milliseconds)
     * @param options.cal - Whether to apply calibration to sensor values
     * @param options.alias - Whether to use sensor aliases instead of IDs
     * @param options.unix - Whether to return timestamps in Unix format
     * @param options.onPrem - Whether to use on-premise API endpoints
     * @returns Array of sensor data points with the following structure:
     * ```typescript
     * Array<{
     *   time: string | number;    // Timestamp (ISO string or Unix timestamp based on unix option)
     *   sensor: string;          // Sensor ID or name (based on alias option)
     *   value: number | null;    // Sensor reading value or null if no data
     * }>
     * ```
     *
     * @example
     * ```typescript
     * const dataAccess = new DataAccess({
     *   userId: '645a15922****a319ca5f5ad',
     *   dataUrl: 'data*****sense.io',
     *   dsUrl: 'ds-serv*****sense.io'
     * });
     *
     * // Query data for specific sensors over a time range
     * const result = await dataAccess.dataQuery({
     *   deviceId: 'DS_TEST_DTING',
     *   sensorList: ['AVT', 'ACR'],  // Line Voltage and Average Current sensors
     *   startTime: 1718102400000,    // April 10, 2024 00:00:00 UTC
     *   endTime: 1718188800000,      // April 11, 2024 00:00:00 UTC
     *   cal: true,                   // Apply calibration
     *   alias: true,                 // Use sensor names instead of IDs
     *   unix: false                  // Return ISO timestamps
     * });
     *
     * // Example output:
     * // [
     * //   {
     * //     "time": "2024-04-10T00:00:00.000Z",
     * //     "sensor": "Line Voltage",
     * //     "value": 230.5
     * //   },
     * //   {
     * //     "time": "2024-04-10T00:00:00.000Z",
     * //     "sensor": "Average Current",
     * //     "value": 4.2
     * //   },
     * //   {
     * //     "time": "2024-04-10T00:15:00.000Z",
     * //     "sensor": "Line Voltage",
     * //     "value": 231.2
     * //   },
     * //   {
     * //     "time": "2024-04-10T00:15:00.000Z",
     * //     "sensor": "Average Current",
     * //     "value": 4.1
     * //   }
     * // ]
     * ```
     *
     * @throws Error if the time range is invalid (start > end)
     * @throws Error if the specified device is not found in the account
     * @throws Error if no sensor data is available for the device
     */
    dataQuery(options: DataQueryOptions): Promise<any[]>;
    /**
     * Internal method to fetch data from InfluxDB with cursor-based pagination
     * @param options - Configuration options for InfluxDB query
     * @returns Array of sensor data points
     */
    private _influxdb;
    /**
     * Retrieves load entities (clusters) from the API with pagination support.
     * @param options - Configuration options
     * @param options.onPrem - Whether to use on-premise API endpoints
     * @param options.clusters - List of cluster names/IDs to filter by. If null, returns all clusters
     * @returns Array of load entities/clusters with the following structure:
     * ```typescript
     * Array<{
     *   id: string;           // Unique identifier for the cluster
     *   name: string;         // Name of the cluster
     *   devConfigs: Array<{   // Device configurations in the cluster
     *     devId: string;      // Device identifier
     *     percentage: number; // Percentage value for the device
     *     sensor: string;     // Sensor identifier to monitor
     *   }>;
     *   [key: string]: any;   // Additional properties specific to the cluster
     * }>
     * ```
     *
     * @example
     * ```typescript
     * const dataAccess = new DataAccess({
     *   userId: '645a15922****a319ca5f5ad',
     *   dataUrl: 'data*****sense.io',
     *   dsUrl: 'ds-serv*****sense.io'
     * });
     *
     * // Get all load entities
     * const allEntities = await dataAccess.getLoadEntities();
     *
     * // Get specific cluster by name
     * const specificCluster = await dataAccess.getLoadEntities({
     *   clusters: ['Energy Consumption ( HT )']
     * });
     *
     * // Example output:
     * // [
     * //   {
     * //     "name": "Energy Consumption ( HT )",
     * //     "id": "647efd40162",
     * //     "devConfigs": [
     * //       {
     * //         "devId": "APREM_A1",
     * //         "percentage": 100,
     * //         "sensor": "D5"
     * //       },
     * //       {
     * //         "devId": "APREM_A2",
     * //         "percentage": 100,
     * //         "sensor": "D5"
     * //       }
     * //     ]
     * //   }
     * // ]
     * ```
     *
     * @throws Error if no clusters are provided when clusters parameter is an empty array
     * @throws Error if the API request fails after maximum retries
     * @throws Error if the API returns an error response
     */
    getLoadEntities(options?: GetLoadEntitiesOptions): Promise<LoadEntity[]>;
}
//# sourceMappingURL=DataAccess.d.ts.map