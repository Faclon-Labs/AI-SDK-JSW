export interface MachineTimelineConfig {
    userId: string;
    dataUrl: string;
    onPrem?: boolean;
    tz?: string;
    logTime?: boolean;
}
export interface MongoDataOptions {
    devID: string;
    limit?: number;
    startTime?: string;
    endTime?: string;
    onPrem?: boolean;
}
export interface CreateMongoRowsOptions {
    data: any;
    onPrem?: boolean;
}
export default class MachineTimeline {
    private userId;
    private dataUrl;
    private onPrem;
    private tz;
    private logTime;
    readonly version: string;
    constructor({ userId, dataUrl, onPrem, tz, logTime }: MachineTimelineConfig);
    private errorMessage;
    private formatUrl;
    private convertToIST;
    private getTimezoneOffset;
    private processDataForInsertion;
    private getPaginatedData;
    getMongoData(options: MongoDataOptions): Promise<any[]>;
    createMongoData(options: CreateMongoRowsOptions): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=MachineTimeline.d.ts.map