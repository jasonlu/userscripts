import { DataSourceCacheEntityType } from "../types";
import { DataSource } from "./DataSource";

export class JAVDataBaseDataSource extends DataSource {
  constructor() {
    super(
      "https://www.javdatabase.com/movies/__VIDEO_ID__/",
      "#poster-container img",
      "a[href]"
    );
    this.cache = {};
  }

  getImgSrc(videoId: string): string {
    let imgSrc = this.cache[videoId]?.imgUrl;
    if (!imgSrc) {
      const doc = this.getDoc(videoId);
      const imgSelector = this.imgSelector;
      const img = <HTMLImageElement>doc.querySelector(imgSelector);
      imgSrc = img.src ?? "";

      this.cache[videoId].imgUrl = imgSrc;
    }
    return imgSrc;
  }

  getTagsString(videoId: string): string {
    let tags = this.cache[videoId]?.tags;
    if (!tags || tags.length === 0) {
      const doc = this.getDoc(videoId);
      const tagsSelector = this.tagsSelector;
      const links = [
        ...(doc.querySelectorAll(tagsSelector) as any as HTMLAnchorElement[]),
      ];
      tags = links
        .filter((link) => {
          const href = link.getAttribute("href");
          if (!href) {
            return false;
          }
          return href.indexOf("/genres/") > -1;
        })
        .map((tag) => {
          return tag.innerText;
        });
      this.cache[videoId].tags = tags;
    }
    return tags.join(", ");
  }

  async loadData(videoId: string) {
    const url = this.sourceUrl.replace(this.VIDEO_ID_PLEACEHOLDER, videoId);
    return await this.loadRemoteData(url, videoId);
  }
}
