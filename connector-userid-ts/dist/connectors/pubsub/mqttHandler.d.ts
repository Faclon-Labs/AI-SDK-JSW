export interface MqttConfig {
    broker: string;
    port: number;
    username: string;
    password: string;
}
export interface DevicePayload {
    device: string;
    time: number;
    data: Array<{
        tag: string;
        value: string;
    }>;
}
export declare class MqttConnector {
    private client;
    private config;
    private isConnected;
    constructor(config: MqttConfig);
    /**
     * Connect to MQTT broker
     */
    connect(): Promise<void>;
    /**
     * Publish data to a topic
     */
    publish(topic: string, payload: any): Promise<void>;
    /**
     * Publish device data using the standard format
     * @param deviceId - The device identifier
     * @param data - Array of tag-value pairs
     * @param time - Optional timestamp in UTC unix milliseconds. If not provided, uses current time
     */
    publishDeviceData(deviceId: string, data: Array<{
        tag: string;
        value: string;
    }>, time?: number): Promise<void>;
    /**
     * Subscribe to a topic and return data via callback
     */
    subscribe(topic: string, callback: (topic: string, message: any) => void): Promise<void>;
    /**
     * Subscribe to device data using the standard topic pattern
     */
    subscribeToDeviceData(deviceId: string, callback: (deviceData: DevicePayload) => void): Promise<void>;
    /**
     * Subscribe to all device data using wildcard
     */
    subscribeToAllDevices(callback: (deviceId: string, deviceData: DevicePayload) => void): Promise<void>;
    /**
     * Close the MQTT connection
     */
    close(): Promise<void>;
    /**
     * Check if the client is connected
     */
    get connected(): boolean;
    /**
     * Helper method to check if topic matches (supports wildcards)
     */
    private topicMatches;
}
//# sourceMappingURL=mqttHandler.d.ts.map