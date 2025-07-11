export interface BruceHandlerConfig {
    userId: string;
    dataUrl: string;
    onPrem?: boolean;
    tz?: string;
}
export interface PopulateConfig {
    path: string;
    select: string;
}
export interface PaginationConfig {
    page: number;
    count: number;
}
export interface FetchUserInsightsOptions {
    pagination?: PaginationConfig;
    populate?: PopulateConfig[];
    sort?: Record<string, number>;
    projection?: string | null;
    onPrem?: boolean;
}
export interface SourceInsightID {
    _id: string;
    tags: string[];
    source: string;
    insightID: string;
    insightProperty: any[];
}
export interface UserInsight {
    _id: string;
    userTags: string[];
    starred: boolean;
    hidden: boolean;
    restrictedAccess: boolean;
    source: string;
    insightID: string;
    insightName: string;
    sourceInsightID: SourceInsightID;
    iconUrl: string;
    added_by: string;
    organisation: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
    updated_by: string;
}
export interface FetchUserInsightsResponse {
    success: boolean;
    data: {
        data: UserInsight[];
    };
}
export interface ApiResponse<T = any> {
    success?: boolean;
    data: T;
    errors?: string[];
}
export interface GetSourceInsightOptions {
    insightId: string;
    onPrem?: boolean;
}
export interface VectorConfig {
    _id: string;
    distanceMetric: string;
    modelName: string;
    vectorSize: number;
}
export interface SelectedUser {
    orgName: string;
    user: string;
    email: string;
    userName: string;
}
export interface SourceInsight {
    _id: string;
    organisations: string[];
    restrictedAccess: boolean;
    whitelistedUsers: string[];
    tags: string[];
    users: string[];
    workbenches: string[];
    workbenchTags: string[];
    source: string;
    privilegeUsers: string[];
    insightID: string;
    insightName: string | null;
    note: string;
    insightProperty: any[];
    added_by: string;
    vectorConfig: VectorConfig;
    selectedUsers: SelectedUser[];
    createdAt: string;
    updatedAt: string;
    __v: number;
    updated_by: string;
    firstDataPointTime: string;
    lastDataPointTime: string;
}
export interface GetSourceInsightResponse {
    success: boolean;
    data: SourceInsight;
}
export interface FetchInsightResultsOptions {
    insightId: string;
    filter?: {
        startDate?: string;
        endDate?: string;
        insightProperty?: any[];
        tags?: string[];
    };
    pagination?: PaginationConfig;
    onPrem?: boolean;
}
export interface InsightResultFilter {
    startDate?: string;
    endDate?: string;
    insightProperty?: any[];
    tags?: string[];
}
export interface S3Details {
    bucket: string;
    fileName: string;
    folderName: string;
    contentType: string;
    objectOperation: string;
    fileSize?: number;
}
export interface ChunkMetadata {
    chunkSize: number;
    chunkOverlap: number;
}
export interface InsightResultMetadata {
    s3Details?: S3Details;
    dataSource: any[];
    filetype?: string;
    s3_url?: string;
    instructions?: string;
    documentID?: string;
    mode?: string[];
    chunkMetadata?: ChunkMetadata;
    language?: string;
    status?: string;
}
export interface ApplicationID {
    _id: string;
    workbenchName: string;
}
export interface InsightResult {
    _id: string;
    tags: string[];
    metadata: InsightResultMetadata;
    added_by: string;
    applicationType: string;
    insightID: string;
    insightProperty: any[];
    invocationTime: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
    applicationID?: ApplicationID;
    resultName?: string;
}
export interface InsightResultsPagination {
    page: number;
    count: number;
    totalPages: number;
}
export interface FetchInsightResultsResponse {
    success: boolean;
    data: {
        data: InsightResult[];
        totalCount: number;
        pagination: InsightResultsPagination;
    };
}
export default class BruceHandler {
    private userId;
    private dataUrl;
    private onPrem;
    private tz;
    readonly version: string;
    constructor({ userId, dataUrl, onPrem, tz }: BruceHandlerConfig);
    private errorMessage;
    private formatUrl;
    private _sleep;
    fetchUserInsights(options?: FetchUserInsightsOptions): Promise<UserInsight[]>;
    getSourceInsight(options: GetSourceInsightOptions): Promise<SourceInsight>;
    private convertToUtc;
    fetchInsightResults(options: FetchInsightResultsOptions): Promise<{
        results: InsightResult[];
        totalCount: number;
        pagination: InsightResultsPagination;
    }>;
}
//# sourceMappingURL=BruceHandler.d.ts.map