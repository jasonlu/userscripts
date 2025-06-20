// ==UserScript==
// @name         Sukebei FC2-PPV Image Preview
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Hover over a link on sukebei.nyaa.si to see a preview image from fc2ppvdb.com. Middle click on that link opens fc2ppvdv page to a new tab.
// @author       Nardcromance
// @match        https://sukebei.nyaa.si/*
// @grant        GM_xmlhttpRequest
// @connect      fc2ppvdb.com
// ==/UserScript==

(function () {
    'use strict';
    const GM_xmlhttpRequest = GM.xmlHttpRequest;
    class DataSource {
        constructor(sourceUrl, imgSelector, tagsSelector) {
            this.sourceUrl = sourceUrl;
            this.imgSelector = imgSelector;
            this.tagsSelector = tagsSelector;
        }

        getImgSrc(videoId) {
            return ""
        }

        getTagsString(videoId) {
            return "";
        }

        getLink(videoId) {
            return "";
        }
    }

    class FC2PPVDataSource extends DataSource {
        currentRequest = null;
        VIDEO_ID_PLEACEHOLDER = '__VIDEO_ID__';
        cache = null;
        divId = 'sukeibei-video-preview';
        constructor() {
            super('https://fc2ppvdb.com/articles/__VIDEO_ID__', 'main section img[alt="__VIDEO_ID__"]', 'main section a[href]');
            this.cache = {};
        }

        /**
         * Extracts an FC2 ID from a string using a case-insensitive regex.
         *
         * @param {string} text The input string to search within.
         * @returns {string|null} The extracted numerical ID as a string, or null if no match is found.
         */
        extractFc2Id(text) {
            // Ensure the input is a string before proceeding.
            if (typeof text !== 'string' || text.trim() === '') {
                return null;
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
            return match ? match[1] : null;
        }

        async getDoc(videoId) {
            const fc2Id = this.extractFc2Id(videoId);
            if (!fc2Id) {
                return null;
            }
            const doc = this.cache[fc2Id].doc;
            if (!doc) {
                const dataEntry = await this.loadData(fc2Id);
                return dataEntry.doc;
            }
            return doc;
        }

        async getImgSrc(videoId) {
            const fc2Id = this.extractFc2Id(videoId);
            if (!fc2Id) {
                return null;
            }
            let imgSrc = this.cache[fc2Id]?.imgUrl;
            if (!imgSrc) {
                const doc = await this.getDoc(videoId);
                const imgSelector = this.imgSelector.replace(this.VIDEO_ID_PLEACEHOLDER, fc2Id);
                const img = doc?.querySelector(imgSelector);
                imgSrc = img?.src;
                this.cache[fc2Id].imgUrl = imgSrc;
            }

            return imgSrc;
        }

        async getTagsString(videoId) {
            const fc2Id = this.extractFc2Id(videoId);
            if (!fc2Id) {
                return null;
            }
            let tags = this.cache[fc2Id]?.tags;
            if (!tags) {
                const doc = await this.getDoc(videoId);
                if (!doc) {
                    return "";
                }
                const tagsSelector = this.tagsSelector.replace(this.VIDEO_ID_PLEACEHOLDER, fc2Id);
                const links = [...doc.querySelectorAll(tagsSelector)];
                tags = links.filter(link => {
                    const href = link.getAttribute("href");
                    return href.startsWith("/tags/");
                }).map(tag => {
                    return tag.innerText;
                });
                this.cache[fc2Id].tags = tags;
            }
            return tags.join(", ");
        }

        async getLink(videoId) {
            const fc2Id = this.extractFc2Id(videoId);
            if (!fc2Id) {
                return null;
            }
            let link = this.cache[fc2Id].url;
            if (!link) {
                const dataEntry = await this.loadData(fc2Id);
                return dataEntry.url;
            }
            return link;
        }

        getImgElement(sourceUrl) {
            const previewImg = document.querySelector(`#${this.divId} img#preview-image`) || document.createElement('img');
            previewImg.id = 'preview-image';
            previewImg.src = sourceUrl;
            previewImg.style.maxWidth = '300px';
            previewImg.style.maxHeight = '300px';
            previewImg.style.display = 'block';
            return previewImg;
        }

        getTagsElement(tagsString) {
            const previewTags = document.querySelector(`#${this.divId} div#preview-tags`) || document.createElement('div');
            previewTags.id = 'preview-tags';
            previewTags.style.marginTop = '10px';
            previewTags.innerText = tagsString;
            return previewTags
        }

        hidePopover() {
            if (this.previewDiv) {
                this.previewDiv.style.display = 'none';
            }
            if (this.currentRequest) {
                this.currentRequest.abort();
                this.currentRequest = null;
            }
            this.currentViewingUrl = null;
        }

        getPreviewDiv() {
            if (this.previewDiv) {
                return this.previewDiv;
            } else {
                let previewDiv = document.getElementById(this.divId);
                if (previewDiv) {
                    this.previewDiv = previewDiv;
                } else {
                    previewDiv = document.createElement('div');
                    previewDiv.id = this.divId;
                    previewDiv.style.width = '300px';
                    previewDiv.style.position = 'fixed';
                    previewDiv.style.display = 'block';
                    previewDiv.style.border = '1px solid #ccc';
                    previewDiv.style.padding = '5px';
                    previewDiv.style.backgroundColor = 'white';
                    previewDiv.style.zIndex = '9999';
                    document.body.appendChild(previewDiv);
                    this.previewDiv = previewDiv;
                }
                return this.previewDiv;
            }
        }

        async showPopover(videoIdId) {
            // Create the preview div and style it
            
            const previewDiv = this.getPreviewDiv();
            previewDiv.style.display = 'block';
            const imageSrc = await this.getImgSrc(videoIdId);
            const tagsString = await this.getTagsString(videoIdId);
            const imgElement = this.getImgElement(imageSrc);
            const tagsElement = this.getTagsElement(tagsString);

            // Append the new content if not already present
            if (!previewDiv.contains(imgElement)) {
                previewDiv.appendChild(imgElement);
            }
            if (!previewDiv.contains(tagsElement)) {
                previewDiv.appendChild(tagsElement);
            }
            this.currentViewingUrl = this.fc2Url;
        }

        setPopoverPosition(mousePosition) {
            if (!this.previewDiv) {
                return;
            }
            // Position the div near the cursor
            this.previewDiv.style.left = `${mousePosition.x + 10}px`;
            this.previewDiv.style.top = `${mousePosition.y + 10}px`;
        }

        async loadData(videoId) {
            // Abort any previous request to prevent multiple popups
            // if (this.currentRequest) {
            //     this.currentRequest.abort();
            // }
            const fc2Id = this.extractFc2Id(videoId);
            if (!this.cache[fc2Id]) {
                this.cache[fc2Id] = {};
            }
            const fc2Url = this.sourceUrl.replace(this.VIDEO_ID_PLEACEHOLDER, fc2Id);
            this.cache[fc2Id].url = fc2Url;
            this.cache[fc2Id].id = fc2Id;


            try {
                // The await keyword will pause the function until the Promise resolves or rejects.
                const response = await new Promise((resolve, reject) => {
                    if (!this.cache[fc2Id].request) {

                        
                        // We still assign the request object to `this.currentRequest` immediately.
                        // This ensures that the *next* call to loadData can abort this one if needed.
                        const request = GM_xmlhttpRequest({
                            method: 'GET',
                            url: fc2Url,
                            onload: (res) => {
                                // When the request loads, check the status code
                                if (res.status === 200) {
                                    // If successful, resolve the promise with the response object
                                    resolve(res);
                                } else {
                                    // If we get an error status (like 404), reject the promise
                                    reject(new Error(`Request failed with status: ${res.status}`));
                                }
                            },
                            // For all failure cases, we reject the promise
                            onerror: (err) => reject(err),
                            ontimeout: () => reject(new Error('Request timed out')),
                            onabort: () => reject(new Error('Request aborted')) // Handle intentional aborts
                        });
                        this.cache[fc2Id].request = request;
                    } else {
                        resolve(this.cache[fc2Id].response);
                    }
                });

                // This code will only run if the promise above was successfully resolved
                if (response) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');
                    this.cache[fc2Id].doc = doc;
                }
                
                this.cache[fc2Id].response = response;
                return this.cache[fc2Id];

            } catch (error) {
                // The catch block now handles all errors from the promise in one place.
                // We check if the error is from an intentional abort to avoid logging it as a real error.
                if (error.message !== 'Request aborted') {
                    console.error(`Error fetching data for ${videoId}:`, error);
                }
                this.cache[fc2Id].request = null;
            }
        }
    }

    let currentDataSource = null;
    let fc2DataSource = null
    let currentVideoId = null;
    let currentMegnetLink = null;
    document.addEventListener('mouseover', async function (e) {
        if (e.target.tagName === 'A') {
            const linkText = e.target.textContent;
            const match = linkText.match(/(FC2-PPV-\d+)/);
            const trElement = e.target.closest('tr');
            const aElements = trElement?.querySelectorAll('a');
            const megnetLink = [...aElements].find(a => a.href.startsWith('magnet:'));
            currentMegnetLink = megnetLink?.href;
            if (match) {
                const videoId = match[1];
                if (fc2DataSource === null) {
                    fc2DataSource = new FC2PPVDataSource(videoId);
                }
                await fc2DataSource.loadData(videoId);
                currentVideoId = videoId;
                fc2DataSource.showPopover(videoId)
                fc2DataSource.setPopoverPosition({ x: e.clientX, y: e.clientY });
                currentDataSource = fc2DataSource;
            } else {
                currentDataSource = null;
                currentVideoId = null
            }
        }
    });

    document.addEventListener('auxclick', async function (e) {
        // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
        // 1 => middle buton
        // When middle clicking while holding the Ctrl key, open the magnet link in a new tab
        if (e.button === 1 && e.ctrlKey && currentMegnetLink) {
            e.preventDefault();
            window.location.href = currentMegnetLink;
        //     window.open(currentMegnetLink);
        } else if (e.button === 1 && currentDataSource) {
            e.preventDefault();
            window.open(await currentDataSource.getLink(currentVideoId));
        } 
    });

    document.addEventListener('mousemove', function (e) {
        // Position the div near the cursor
        currentDataSource?.setPopoverPosition({ x: e.clientX, y: e.clientY });
    });

    document.addEventListener('mouseout', function (e) {
        if (e.target.tagName === 'A' && currentDataSource) {
            currentDataSource.hidePopover();
            // currentDataSource = null;
        }
    });
})();