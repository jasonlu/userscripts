import type { PointType, DataSourceCacheType, DataSourceCacheEntityType } from "../types";

export abstract class DataSource {
  private divId = "sukeibei-video-preview";
  private previewDiv: HTMLDivElement | null = null;

  constructor(
    protected sourceUrl: string,
    protected imgSelector: string,
    protected tagsSelector: string
  ) {}

  protected cache: DataSourceCacheType = {};

  protected readonly VIDEO_ID_PLEACEHOLDER = "__VIDEO_ID__";

  protected currentRequest: Tampermonkey.AbortHandle<any> | null = null;

  protected currentViewingUrl: string | null = null;

  abstract getImgSrc(videoId: string): string;

  abstract getTagsString(videoId: string): string;

  abstract loadData(videoId: string): Promise<DataSourceCacheEntityType>;

  protected async loadRemoteData(
    url: string,
    videoId: string
  ): Promise<DataSourceCacheEntityType> {
    // Abort any previous request to prevent multiple popups
    console.log(`Loading data for ${videoId} from ${url}`);
    
    // if (this.currentRequest) {
    //   console.log(`\t\t--abort`);

    //   this.currentRequest.abort();
    // }
    const newCachedData: DataSourceCacheEntityType = {
        doc: null,
        imgUrl: "",
        tags: [],
        url,
        id: videoId,
        request: null,
        response: null,
        fulfilled: false,
    };
   
    if (!this.cache[videoId]) {
      this.cache[videoId] = newCachedData
    }
    const currentCacheObject = this.cache[videoId];

    try {
      // The await keyword will pause the function until the Promise resolves or rejects.
      const response: Tampermonkey.Response<string> = await new Promise(
        (resolve, reject) => {
          if (!currentCacheObject.fulfilled) {
            console.log(`Sending request to retrieve data for ${videoId} from ${url}`);

            // We still assign the request object to `this.currentRequest` immediately.
            // This ensures that the *next* call to loadData can abort this one if needed.
            const request = GM_xmlhttpRequest({
              method: "GET",
              url,
              onload: (res) => {
                // When the request loads, check the status code
                if (res.status === 200) {
                  // If successful, resolve the promise with the response object
                  resolve(res);
                } else {
                  // If we get an error status (like 404), reject the promise
                  reject(
                    new Error(`Request failed with status: ${res.status}, request URL: ${url}`),
                  );
                }
              },
              // For all failure cases, we reject the promise
              onerror: (err) => reject(err),
              ontimeout: () => reject(new Error("Request timed out")),
              onabort: () => reject(new Error("Request aborted")), // Handle intentional aborts
            });
            currentCacheObject.request = request;
            this.currentRequest = request; // Assign the request to currentRequest
          } else {
            console.log(`Using cached data for ${videoId}`);
            resolve(currentCacheObject.response!);
          }
        }
      );

      // This code will only run if the promise above was successfully resolved
      if (response) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.responseText, "text/html");
        currentCacheObject.doc = doc;
        currentCacheObject.fulfilled = true;
        currentCacheObject.response = response;
      }

      return currentCacheObject;
    } catch (error: unknown) {
      // The catch block now handles all errors from the promise in one place.
      // We check if the error is from an intentional abort to avoid logging it as a real error.
      // if (error.message !== "Request aborted") {
      console.error(`Error fetching data for ${videoId}:`, error);
      // }
      this.cache[videoId].request = null;
      throw error;
    }
  }

  getDoc(videoId: string): Document {
    if (!this.cache[videoId] || !this.cache[videoId].doc) {
      throw new Error("Load data before getting the document.");
    }
    return this.cache[videoId].doc!;
  }

  getLink(videoId: string): string {
    if (!this.cache[videoId] || !this.cache[videoId].url) {
      throw new Error("Load data before getting the link.");
    }
    return this.cache[videoId].url;
  }

  getPreviewDiv() {
    if (this.previewDiv) {
      return this.previewDiv;
    } else {
      let previewDiv = <HTMLDivElement>document.getElementById(this.divId);
      if (previewDiv) {
        this.previewDiv = previewDiv;
      } else {
        previewDiv = document.createElement("div");
        previewDiv.id = this.divId;
        previewDiv.style.width = "300px";
        previewDiv.style.position = "fixed";
        previewDiv.style.display = "block";
        previewDiv.style.border = "1px solid #ccc";
        previewDiv.style.padding = "5px";
        previewDiv.style.backgroundColor = "white";
        previewDiv.style.zIndex = "9999";


        const errorP = document.createElement("p");
        errorP.id = "preview-error-message";
        errorP.innerText = "";
        errorP.style.display = "none"; // Hide error message by default
        previewDiv.appendChild(errorP);

        const metadataDiv = document.createElement("div");
        metadataDiv.id = "preview-metadata";
        metadataDiv.style.margin = "0";
        metadataDiv.style.padding = "0";
        previewDiv.appendChild(metadataDiv);

        const previewImg = document.createElement("img");
        previewImg.id = "preview-image";
        previewImg.src = "";
        previewImg.style.maxWidth = "100%";
        previewImg.style.maxHeight = "300px";
        previewImg.style.display = "block";
        metadataDiv.appendChild(previewImg);
      
         const previewTags = document.createElement("div");
        previewTags.id = "preview-tags";
        previewTags.style.marginTop = "10px";
        previewTags.innerText = "";
        metadataDiv.appendChild(previewTags);


        
        document.body.appendChild(previewDiv);
        this.previewDiv = previewDiv;


      }
      return this.previewDiv;
    }
  }

  getImgElement(sourceUrl: string) {
    const previewImg =<HTMLImageElement>document.querySelector(`#${this.divId} img#preview-image`);
    previewImg.src = sourceUrl;
    return previewImg;
  }

  getTagsElement(tagsString: string) {
    const previewTags = <HTMLDivElement>document.querySelector(`#${this.divId} div#preview-tags`);
    previewTags.innerText = tagsString;
    return previewTags;
  }

  hidePopover() {
    if (this.previewDiv) {
      this.previewDiv.style.display = "none";
    }
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
    this.currentViewingUrl = null;
  }

  async showPopover(videoIdId: string) {
    // Create the preview div and style it

    const previewDiv = this.getPreviewDiv();
    previewDiv.style.display = "block";
    const errorP =  <HTMLParagraphElement>previewDiv.querySelector("#preview-error-message");
    const metadataDiv =  <HTMLDivElement>previewDiv.querySelector("#preview-metadata");
    try {
      const imageSrc = await this.getImgSrc(videoIdId);
      const tagsString = await this.getTagsString(videoIdId);
      const imgElement = this.getImgElement(imageSrc);
      const tagsElement = this.getTagsElement(tagsString);
      this.currentViewingUrl = await this.getLink(videoIdId);
      errorP.style.display = "none"; // Hide error message
      metadataDiv.style.display = "block"; // Show metadata div
    } catch (error) {
      errorP.innerHTML = `Video ID: ${videoIdId} not found`;
      errorP.style.display = "block"; // Show error message
      metadataDiv.style.display = "none"; // Hide metadata div

      this.currentViewingUrl = null;
    }
  }

  setPopoverPosition(mousePosition: PointType) {
    if (!this.previewDiv) {
      return;
    }
    // Position the div near the cursor
    this.previewDiv.style.left = `${mousePosition.x}px`;
    this.previewDiv.style.top = `${mousePosition.y + 30}px`;
  }
}
