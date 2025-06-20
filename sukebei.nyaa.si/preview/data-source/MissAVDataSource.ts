import { DataSource } from "./DataSource";

export class MissAvDataSource extends DataSource {
  protected readonly VIDEO_ID_PLEACEHOLDER = "__VIDEO_ID__";

  constructor() {
    super("https://missav.ai/ja/__VIDEO_ID__", "video.player", "a[href]");
    this.cache = {};
  }

  async loadData(videoId: string) {
    const url = this.sourceUrl.replace(this.VIDEO_ID_PLEACEHOLDER, videoId);
    return await this.loadRemoteData(url, videoId);
  }


  getImgSrc(videoId: string): string {
    let imgSrc = this.cache[videoId]?.imgUrl;
    if (!imgSrc) {
      const doc = this.getDoc(videoId);
      const imgSelector = this.imgSelector;
      const img = <HTMLVideoElement>doc.querySelector(imgSelector);
      imgSrc = img.dataset.poster ?? "";

      this.cache[videoId].imgUrl = imgSrc;
    }
    return imgSrc;
  }

  getTagsString(videoId: string) {
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
}
