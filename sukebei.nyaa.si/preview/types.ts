import type { DataSource } from "./data-source/DataSource";

export type DataSourceCacheType = {
  [videoId: string]: {
    doc?: Document;
    imgUrl?: string;
    tags?: string[];
    url?: string;
    id?: string;
    request: Tampermonkey.AbortHandle<any> | null;
    response: Tampermonkey.Response<string> | null;
  };
};

export type PointType = {
  x: number;
  y: number;
};

// Define the type for a constructor of a class that extends DataSource
// This ensures that 'dataSourceClass' will be a *concrete* class
// that can be instantiated and is a subclass of DataSource.
export type DataSourceConstructor = new (...args: any[]) => DataSource;


export type SearchPatternType = {
  name: string;
  pattern: RegExp;
  source: string;
  dataSourceClass: DataSourceConstructor
  dataSourceInstance: DataSource | null;
};