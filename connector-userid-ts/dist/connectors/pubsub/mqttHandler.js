import mqtt from 'mqtt';
export class MqttConnector {
    constructor(config) {
        this.client = null;
        this.isConnected = false;
        this.config = config;
    }
    /**
     * Connect to MQTT broker
     */
    async connect() {
        return new Promise((resolve, reject) => {
            const url = `mqtt://${this.config.broker}:${this.config.port}`;
            this.client = mqtt.connect(url, {
                username: this.config.username,
                password: this.config.password,
                connectTimeout: 10000,
                reconnectPeriod: 1000,
            });
            this.client.on('connect', () => {
                this.isConnected = true;
                console.log(`Connected to MQTT broker at ${url}`);
                resolve();
            });
            this.client.on('error', (error) => {
                console.error('MQTT connection error:', error);
                reject(error);
            });
            this.client.on('close', () => {
                this.isConnected = false;
                console.log('MQTT connection closed');
            });
        });
    }
    /**
     * Publish data to a topic
     */
    async publish(topic, payload) {
        if (!this.client || !this.isConnected) {
            throw new Error('MQTT client is not connected. Call connect() first.');
        }
        return new Promise((resolve, reject) => {
            const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
            this.client.publish(topic, message, { qos: 1 }, (error) => {
                if (error) {
                    console.error('Failed to publish message:', error);
                    reject(error);
                }
                else {
                    console.log(`Message published to topic: ${topic}`);
                    resolve();
                }
            });
        });
    }
    /**
     * Publish device data using the standard format
     * @param deviceId - The device identifier
     * @param data - Array of tag-value pairs
     * @param time - Optional timestamp in UTC unix milliseconds. If not provided, uses current time
     */
    async publishDeviceData(deviceId, data, time) {
        const topic = `devicesIn/${deviceId}/data`;
        const payload = {
            device: deviceId,
            time: time ?? Date.now(),
            data: data
        };
        return this.publish(topic, payload);
    }
    /**
     * Subscribe to a topic and return data via callback
     */
    async subscribe(topic, callback) {
        if (!this.client || !this.isConnected) {
            throw new Error('MQTT client is not connected. Call connect() first.');
        }
        return new Promise((resolve, reject) => {
            this.client.subscribe(topic, { qos: 1 }, (error) => {
                if (error) {
                    console.error('Failed to subscribe to topic:', error);
                    reject(error);
                }
                else {
                    console.log(`Subscribed to topic: ${topic}`);
                    resolve();
                }
            });
            this.client.on('message', (receivedTopic, message) => {
                if (receivedTopic === topic || this.topicMatches(topic, receivedTopic)) {
                    try {
                        const parsedMessage = JSON.parse(message.toString());
                        callback(receivedTopic, parsedMessage);
                    }
                    catch (error) {
                        // If JSON parsing fails, return raw message
                        callback(receivedTopic, message.toString());
                    }
                }
            });
        });
    }
    /**
     * Subscribe to device data using the standard topic pattern
     */
    async subscribeToDeviceData(deviceId, callback) {
        const topic = `devicesIn/${deviceId}/data`;
        return this.subscribe(topic, (receivedTopic, message) => {
            callback(message);
        });
    }
    /**
     * Subscribe to all device data using wildcard
     */
    async subscribeToAllDevices(callback) {
        const topic = 'devicesIn/+/data';
        return this.subscribe(topic, (receivedTopic, message) => {
            // Extract device ID from topic: devicesIn/{deviceId}/data
            const deviceId = receivedTopic.split('/')[1];
            callback(deviceId, message);
        });
    }
    /**
     * Close the MQTT connection
     */
    async close() {
        if (this.client) {
            return new Promise((resolve) => {
                this.client.end(false, {}, () => {
                    this.isConnected = false;
                    console.log('MQTT connection closed successfully');
                    resolve();
                });
            });
        }
    }
    /**
     * Check if the client is connected
     */
    get connected() {
        return this.isConnected;
    }
    /**
     * Helper method to check if topic matches (supports wildcards)
     */
    topicMatches(subscribed, received) {
        const subParts = subscribed.split('/');
        const recParts = received.split('/');
        if (subParts.length !== recParts.length)
            return false;
        for (let i = 0; i < subParts.length; i++) {
            if (subParts[i] !== '+' && subParts[i] !== '#' && subParts[i] !== recParts[i]) {
                return false;
            }
            if (subParts[i] === '#') {
                return true; // # matches everything after
            }
        }
        return true;
    }
}
//# sourceMappingURL=mqttHandler.js.map