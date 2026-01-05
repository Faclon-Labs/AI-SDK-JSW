export interface EventsHandlerConfig {
    userId: string;
    dataUrl: string;
    onPrem?: boolean;
    tz?: string;
    logTime?: boolean;
}
export interface PublishEventOptions {
    message: string;
    metaData: string;
    hoverData: string;
    createdOn?: string;
    eventTagsList?: string[];
    eventNamesList?: string[];
    title?: string;
    onPrem?: boolean;
}
export interface EventsInTimeslotOptions {
    startTime: string | Date;
    endTime?: string | Date;
    onPrem?: boolean;
}
export interface EventDataCountOptions {
    endTime?: string | Date;
    count?: number;
    onPrem?: boolean;
}
export interface DetailedEventOptions {
    eventTagsList?: string[];
    startTime?: string | Date;
    endTime?: string | Date;
    onPrem?: boolean;
}
export interface MongoDataOptions {
    devID: string;
    limit?: number;
    startTime?: string;
    endTime?: string;
    onPrem?: boolean;
}
export interface MaintenanceModuleDataOptions {
    startTime: number | string | Date;
    endTime?: number | string | Date;
    remarkGroup?: string[];
    eventId?: string[];
    maintenanceModuleId?: string;
    operator?: 'count' | 'activeDuration' | 'inactiveDuration';
    dataPrecision?: number;
    periodicity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
    cycleTime?: string;
    weekStart?: number;
    monthStart?: number;
    yearStart?: number;
    shifts?: any[];
    shiftOperator?: 'sum' | 'mean' | 'median' | 'mode' | 'min' | 'max';
    filter?: Record<string, any>;
    onPrem?: boolean;
}
export interface DeviceDataOptions {
    devices?: string[];
    n?: number;
    endTime?: string;
    startTime?: string;
    onPrem?: boolean;
}
export interface SensorRowsOptions {
    deviceId?: string;
    sensor?: string;
    value?: string;
    endTime?: string;
    startTime?: string;
    alias?: boolean;
    onPrem?: boolean;
}
export interface CreateMongoRowsOptions {
    data: any;
    onPrem?: boolean;
}
export interface EventCategory {
    _id: string;
    name: string;
}
export interface ApiResponse<T = any> {
    data: T;
    errors?: string[];
    success?: boolean;
}
export default class EventsHandler {
    private userId;
    private dataUrl;
    private onPrem;
    private tz;
    private logTime;
    readonly version: string;
    constructor({ userId, dataUrl, onPrem, tz, logTime }: EventsHandlerConfig);
    private errorMessage;
    private isoUtcTime;
    private formatUrl;
    publishEvent(options: PublishEventOptions): Promise<any>;
    getEventsInTimeslot(options: EventsInTimeslotOptions): Promise<any[]>;
    getEventDataCount(options?: EventDataCountOptions): Promise<any[]>;
    getEventCategories(options?: {
        onPrem?: boolean;
    }): Promise<EventCategory[]>;
    getDetailedEvent(options?: DetailedEventOptions): Promise<any[]>;
    private getPaginatedData;
    getMaintenanceModuleData(options: MaintenanceModuleDataOptions): Promise<Record<string, any>>;
    private timeToUnix;
    /**
     * Fetch device data from the API with optional filters for time range and device list.
     *
     * @param options - Configuration options for retrieving device data
     * @returns Array of device data records
     *
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: 'your-user-id',
     *   dataUrl: 'your-data-url',
     *   onPrem: false,
     *   tz: 'UTC'
     * });
     *
     * const result = await eventsHandler.getDeviceData({
     *   devices: ["device1", "device2"],
     *   startTime: "2025-01-27 07:00:00",
     *   endTime: "2025-01-28 06:59:59"
     * });
     *
     * // Example output structure:
     * // [
     * //   {
     * //     _id: "record-id-1",
     * //     devID: "device1",
     * //     data: {
     * //       D0: "start-time",
     * //       D1: "end-time",
     * //       D2: "status",
     * //       D3: "reason",
     * //       D6: "value1",
     * //       D7: "value2",
     * //       ... // more fields
     * //       fromVMS: false
     * //     }
     * //   },
     * //   {
     * //     _id: "record-id-2",
     * //     devID: "device2",
     * //     data: {
     * //       D0: "start-time",
     * //       D1: "end-time",
     * //       D2: "status",
     * //       D3: "reason",
     * //       D6: "value1",
     * //       D7: "value2",
     * //       ... // more fields
     * //       fromVMS: false
     * //     }
     * //   }
     * // ]
     * ```
     *
     * Each record contains:
     * - _id: Unique identifier for the record
     * - devID: Device identifier
     * - data: Object with device data fields (D0, D1, D2, ...), including status, times, and other metrics
     *   - fromVMS: boolean flag
     */
    getDeviceData(options?: DeviceDataOptions): Promise<any[]>;
    /**
     * Retrieve device data rows from the server based on sensor parameters and optional time range filters.
     *
     * @param options - Configuration options for retrieving sensor rows
     * @returns Array of sensor data records
     *
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: 'your-user-id',
     *   dataUrl: 'your-data-url',
     *   onPrem: false,
     *   tz: 'UTC'
     * });
     *
     * const result = await eventsHandler.getSensorRows({
     *   deviceId: 'PHEXT_L1ne',
     *   sensor: 'D0',
     *   value: '2025-05-08 12:49:53',
     *   startTime: '2025-05-08 12:00:00',
     *   endTime: '2025-05-08 14:00:00'
     * });
     *
     * // Example output (partial):
     * // [
     * //   {
     * //     _id: "",
     * //     devID: "",
     * //     data: {
     * //       D0: "2025-05-08 12:49:53",
     * //       D1: "2025-05-08 12:59:39",
     * //       D2: "Downtime",
     * //       D3: "MC setting Time",
     * //       D4: "220044",
     * //       D5: "800033.0",
     * //       D6: "0.00",
     * //       D7: "586.0",
     * //       ... // more fields
     * //       fromVMS: false
     * //     }
     * //   },
     * //   {
     * //     _id: "", // id for the user
     * //     devID: "",  // device ID
     * //     data: {
     * //       D0: "2025-05-08 12:59:39",
     * //       D1: "2025-05-08 13:18:01",
     * //       D2: "Downtime",
     * //       D3: "Lunch/Breakfast",
     * //       D4: "220044",
     * //       D5: "800033.0",
     * //       D6: "0.00",
     * //       D7: "1102.0",
     * //       ... // more fields
     * //       fromVMS: false
     * //     }
     * //   }
     * // ]
     * ```
     *
     * Each record contains:
     * - _id: Unique identifier for the record
     * - devID: Device identifier
     * - data: Object with sensor data fields (D0, D1, D2, ...), including status, times, and other metrics
     *   - fromVMS: boolean flag
     */
    getSensorRows(options: SensorRowsOptions): Promise<any[]>;
    getDeviceMetadata(deviceId: string, onPrem?: boolean): Promise<Record<string, any>>;
}
//# sourceMappingURL=EventsHandler.d.ts.map