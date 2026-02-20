/**
 * Server-only module for data access
 * This file should never be imported on the client side
 */

// Type definition for DataAccess config
interface DataAccessConfig {
  userId: string;
  dataUrl: string;
  dsUrl: string;
  onPrem: boolean;
  tz: string;
}

// Type definition for dataQuery params
interface DataQueryParams {
  deviceId: string;
  sensorList: string[];
  startTime: number;
  endTime: number;
}

// Lazy load the DataAccess class to avoid importing mqtt at module load time
let DataAccessClass: any = null;

async function getDataAccessClass() {
  if (!DataAccessClass) {
    // Use webpackIgnore to prevent webpack from analyzing this import
    // Use process.cwd() to get the correct base path
    const path = require('path');
    const basePath = path.resolve(process.cwd(), '../../connector-userid-ts/dist/index.js');
    const module = await import(/* webpackIgnore: true */ basePath);
    DataAccessClass = module.DataAccess;
  }
  return DataAccessClass;
}

export async function createDataAccess(config: DataAccessConfig) {
  const DataAccess = await getDataAccessClass();
  return new DataAccess(config);
}

export async function queryData(config: DataAccessConfig, params: DataQueryParams) {
  const dataAccess = await createDataAccess(config);
  return await dataAccess.dataQuery(params);
}
