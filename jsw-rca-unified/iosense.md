# IOsense SDK - Function Registry & Flows

## Authentication

### validateSSOToken
- **Endpoint:** `GET https://connector.iosense.io/api/retrieve-sso-token/{token}`
- **Headers:** `organisation: https://iosense.io`, `ngsw-bypass: true`, `Content-Type: application/json`
- **Response:** `{ success, token (Bearer JWT), organisation, userId }`
- **Notes:** SSO tokens are one-time use, expire after 60 seconds. Store Bearer JWT in localStorage.
- **Implementation:** `lib/auth.ts` → `validateSSOToken()`

## Insight Results

### fetchInsightResult
- **Endpoint:** `PUT https://connector.iosense.io/api/account/bruce/insightResult/fetch/paginated/{insightID}`
- **Headers:** `Authorization: Bearer {token}`, `Content-Type: application/json`
- **Body:** `{ filter: { startDate, endDate, insightProperty, tags }, user: { id, organisation }, pagination: { page, count } }`
- **Response:** `{ success, data: { data: InsightResult[], totalCount, pagination } }`
- **Implementation:** `lib/api.ts` → `fetchInsightResultsFromBackend()`

### updateInsightResult (custom)
- **Endpoint:** `PUT https://connector.iosense.io/api/account/ai-sdk/api/bruce/insightResult/update/singleInsightResult`
- **Headers:** `Authorization: Bearer {token}`, `Content-Type: application/json`, `userID: {userId}`
- **Body:** `{ mode: 'set', updatedFields: { _id, insightID, applicationType, result } }`
- **Implementation:** `lib/api.ts` → `updateInsightResult()`

## Sensor Data

### fetchTrendData (custom - getAllData with cursor)
- **Endpoint:** `GET https://connector.iosense.io/api/account/ai-sdk/api/apiLayer/getAllData`
- **Headers:** `Authorization: Bearer {token}`, `userID: {userId}`
- **Query:** `device, sensor, sTime, eTime, cursor=true, limit`
- **Response:** `{ data: [], cursor: { start, end } | null }`
- **Implementation:** `lib/api.ts` → `fetchTrendData()`

## Stoppages / Maintenance Events

### fetchStoppages (custom - maintenanceModuleFilters)
- **Endpoint:** `PUT https://connector.iosense.io/api/account/ai-sdk/api/eventTag/maintenanceModuleFilters/{skip}/{limit}`
- **Headers:** `Authorization: Bearer {token}`, `Content-Type: application/json`, `userID: {userId}`
- **Body:** `{ userId, moduleId, startTime, endTime, events, sortOrder }`
- **Implementation:** `lib/api.ts` → `fetchStoppages()`

## Flows

1. **Auth Flow:** `validateSSOToken` → store JWT in localStorage → use for all API calls
2. **Dashboard Flow:** `validateSSOToken` → `fetchInsightResult` (paginated) → render diagnostic data
3. **Trend Chart Flow:** `validateSSOToken` → `fetchTrendData` (cursor-paginated sensor data) → render charts
4. **Stoppages Flow:** `validateSSOToken` → `fetchStoppages` → render stoppage table
5. **Update Flow:** `validateSSOToken` → `updateInsightResult` → refetch data

## Architecture

- **Fully CSR** — `next.config.mjs` uses `output: 'export'`, no API routes, no server components
- **Auth:** `lib/auth.ts` + `hooks/useAuth.ts` (SSO via URL token param)
- **API Layer:** `lib/api.ts` (direct browser→IOsense API calls)
- **Data Hook:** `hooks/useDiagnosticData.ts` (fetches + transforms insight results)
- **Insight ID:** `INS_a7bca70a5160`
