
import { DataSource } from "./data-source/DataSource";
import { FC2PPVDataSource } from "./data-source/FC2PPVDataSource";
import { JAVDataBaseDataSource } from "./data-source/JAVDataBaseDataSource";
import { MissAvDataSource } from "./data-source/MissAVDataSource";
import type { SearchPatternType } from "./types";

let currentDataSource: DataSource | null = null;
let currentVideoId: string = "";
let currentMegnetLink: string = "";
const patterns: SearchPatternType[] = [
  {
    name: "jav-database",
    pattern: /\s([A-Z]{2,}\-[0-9]{3,6})\s/,
    source: "https://www.javdatabase.com/movies/__VIDEO_ID__",
    dataSourceClass: JAVDataBaseDataSource,
    dataSourceInstance: null,
  },
  // {
  //   name: "general",
  //   pattern: /\ ([A-Z]{3,4}\-[0-9]{3,4})\ /,
  //   source: "https://missav.ai/__VIDEO_ID__",
  //   dataSourceClass: MissAvDataSource,
  //   dataSourceInstance: null,
  // },
  {
    name: "fc2ppv",
    pattern: /\s(FC2-?PPV-?([0-9]{5,7}))\s/,
    source: "https://fc2ppvdb.com/articles/__VIDEO_ID__",
    dataSourceClass: FC2PPVDataSource,
    dataSourceInstance: null,
  },
  
];

document.addEventListener("mouseover", async function (e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target && target.tagName === "TD") {
    const trElement = target.closest("tr");
    if (!trElement) {
      return;
    }
    const linkElements = trElement.querySelectorAll("a");
    console.log(linkElements)
    const linkElement = [...linkElements as unknown as HTMLAnchorElement[]].find((a) => a.href.indexOf("/view/") > -1);
    if (!linkElement) {
      return;
    }

    const linkText = linkElement.textContent!;
    const dataSource = patterns.find((pattern) => {
      if (pattern.pattern.test(linkText)) {
        return pattern.dataSourceClass;
      }
    });

    // const match = linkText.match(/(FC2-PPV-\d+)/);
    
    const aElements = trElement?.querySelectorAll("a");
    const megnetLink = [...(aElements as unknown as HTMLAnchorElement[])].find(
      (a) => a.href.startsWith("magnet:")
    );
    currentMegnetLink = megnetLink?.href ?? "";
    if (dataSource) {
      const match = linkText.match(dataSource.pattern)!;
      const videoId = match[1];
      const dataSourceClass = dataSource.dataSourceClass;
      let dataSourceInstance: DataSource | null = dataSource.dataSourceInstance;

      if (dataSourceInstance === null) {
        dataSourceInstance = new dataSourceClass();
        dataSource.dataSourceInstance = dataSourceInstance;
      } 
      currentVideoId = videoId;
      try {
        await dataSourceInstance.loadData(videoId);
      } catch (error) {
        console.error(`Failed to load data for video ID ${videoId}:`, error);
      }
      const trRect = trElement.getBoundingClientRect();
      dataSourceInstance.showPopover(videoId);
      dataSourceInstance.setPopoverPosition({ x: trRect.left, y: trRect.top });
      currentDataSource = dataSourceInstance;
    } else {
      currentDataSource = null;
      currentVideoId = "";
    }
  }
});

document.addEventListener("auxclick", async function (e) {
  // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
  // 1 => middle buton
  // When middle clicking while holding the Ctrl key, open the magnet link in a new tab
  if (e.button === 1 && e.ctrlKey && currentMegnetLink) {
    e.preventDefault();
    window.location.href = currentMegnetLink;
    //     window.open(currentMegnetLink);
  } else if (e.button === 1 && currentDataSource) {
    e.preventDefault();
    window.open((await currentDataSource.getLink(currentVideoId)) as string);
  }
});

document.addEventListener("mousemove", function (e) {
  // Position the div near the cursor
  // currentDataSource?.setPopoverPosition({ x: e.clientX, y: e.clientY });
});

document.addEventListener("mouseout", function (e) {
  const target = e.target as HTMLElement;
  if (target.tagName === "A" && currentDataSource) {
    currentDataSource.hidePopover();
  }
});
