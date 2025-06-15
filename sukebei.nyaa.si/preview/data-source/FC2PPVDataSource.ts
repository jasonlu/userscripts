import { DataSource } from "./DataSource";

export class FC2PPVDataSource extends DataSource {
  protected readonly VIDEO_ID_PLEACEHOLDER = "__VIDEO_ID__";

  constructor() {
    super(
      "https://fc2ppvdb.com/articles/__VIDEO_ID__",
      'main section img[alt="__VIDEO_ID__"]',
      "main section a[href]"
    );
    this.cache = {};
  }

  /**
   * Extracts an FC2 ID from a string using a case-insensitive regex.
   *
   * @param {string} text The input string to search within.
   * @returns {string} The extracted numerical ID as a string, or null if no match is found.
   */
  extractFc2Id(text: string) {
    // Ensure the input is a string before proceeding.
    if (typeof text !== "string" || text.trim() === "") {
      return "";
    }

    // Check if the input string consists ONLY of numbers.
    // ^ asserts position at start of the string.
    // [0-9]+ matches one or more digits.
    // $ asserts position at the end of the string.
    if (/^[0-9]+$/.test(text)) {
      return text; // Return the numeric string as-is.
    }

    // Regex to find "FC2-PPV-" or "FC2PPV" followed by one or more digits.
    // The digits are captured in a group.
    const regex = /(?:FC2-PPV-|FC2PPV)([0-9]+)/i;

    const match = regex.exec(text);

    // If a match is found, return the first captured group (the ID).
    // Otherwise, return null.
    return match ? match[1] : "";
  }

  async loadData(videoId: string) {
    const fc2Id = this.extractFc2Id(videoId);
    const url = this.sourceUrl.replace(this.VIDEO_ID_PLEACEHOLDER, fc2Id);
    return await this.loadRemoteData(url, videoId);
  }

  getImgSrc(videoId: string) {
    let imgSrc = this.cache[videoId]?.imgUrl;
    if (!imgSrc) {
      const fc2Id = this.extractFc2Id(videoId);
      if (!fc2Id) {
        return "ss";
      }
      const doc = this.getDoc(videoId);
      const imgSelector = this.imgSelector.replace(
        this.VIDEO_ID_PLEACEHOLDER,
        fc2Id
      );
      const img = <HTMLImageElement>doc.querySelector(imgSelector);
      imgSrc = img?.src;
      this.cache[videoId].imgUrl = imgSrc;
    }
    return imgSrc;
  }

  getTagsString(videoId: string) {

    let tags = this.cache[videoId]?.tags;
    if (!tags || tags.length === 0) {
      const fc2Id = this.extractFc2Id(videoId);
      const doc = this.getDoc(videoId);
      if (!doc || !fc2Id) {
        return "";
      }
      const tagsSelector = this.tagsSelector.replace(
        this.VIDEO_ID_PLEACEHOLDER,
        fc2Id
      );
      const links = [
        ...(doc.querySelectorAll(tagsSelector) as any as HTMLAnchorElement[]),
      ];
      tags = links
        .filter((link) => {
          const href = link.getAttribute("href");
          return href?.startsWith("/tags/");
        })
        .map((tag) => {
          return tag.innerText;
        });
      this.cache[videoId].tags = tags;
    }
    return tags.join(", ");
  }



  



 

}
