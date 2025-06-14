import type { PointType, DataSourceCacheType } from '../types';


export abstract class DataSource {
    constructor(
      protected sourceUrl: string,
      protected imgSelector: string,
      protected tagsSelector: string
    ) {}

    abstract getImgSrc(videoId: string): Promise<string | null>;

    abstract getTagsString(videoId: string): Promise<string | null>;

    abstract getLink(videoId: string): Promise<string | null>;

    abstract setPopoverPosition(point: PointType): void;

    abstract showPopover(videoId: string): Promise<void>;

    abstract hidePopover(): void;

    abstract loadData(videoId: string): Promise<DataSourceCacheType[keyof DataSourceCacheType] | undefined>;
  }
