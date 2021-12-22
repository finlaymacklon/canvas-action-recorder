'use strict';

// With service workers you can communicate with popup
// and contentScript files.
// For more information on service workers,
// See https://developer.chrome.com/docs/extensions/service-workers

// More information on Storage API can we found at
// https://developer.chrome.com/extensions/storage
// To get storage access, we have to mention it in `permissions` property of manifest.json file
// More information on Permissions can we found at
// https://developer.chrome.com/extensions/declare_permissions

const setCanvasRecorderData = (tabId, canvasId, key, value) => {
  const data = {};
  const slot = slotName(tabId, canvasId, key);
  data[slot] = value;
  chrome.storage.local.set(data, () => {
    console.log(`Stored ${slot}.`);
  }); 
}
//
const getCanvasRecorderData = (tabId, canvasId, key, callback) => {
  const slot = slotName(tabId, canvasId, key);
  chrome.storage.local.get([slot], (result) => {
    console.log(`Retrieved ${slot}.`);
    callback(result);
  });
}
//
const clearCanvasRecorderData = (tabId, canvasId, key) => {
  const slot = slotName(tabId, canvasId, key);
  chrome.storage.local.remove([slot], () => {
    console.log(`Cleared ${slot}`);
  });
}
//
const slotName = (tabId, canvasId, key) => {
  return `${tabId}_${canvasId}_${key}`;
}
//
const getDataListener = (request, sender, sendResponse) => {
  if (request.type === "GETDATA") {
      const tabId = request.payload.tabId;
      const canvasId = request.payload.canvasId;
      const key = request.payload.key;

      getCanvasRecorderData(tabId, canvasId, key, (result) => {
        const message = result[slotName(tabId, canvasId, key)];
        sendResponse({
          message,
        })
      });
  }
  return true;
}
//
const clearDataListener = (request, sender, sendResponse) => {
  if (request.type === "CLEARDATA") {
      const tabId = request.payload.tabId;
      const canvasId = request.payload.canvasId;
      const key = request.payload.key;

      clearCanvasRecorderData(tabId, canvasId, key);

      const success = 1;
      // Send a response message
      sendResponse({
        success,
      });
  }
  return true;
}

const clickListener = (request, sender, sendResponse) => {
  if (request.type === "CLICK") {
    // add these coordinates to the list of coordinates
    pushCoordinates(sender.tab.id, request.payload.targetId, request.payload.x, request.payload.y);
    // echo the coordinates back to contentScript
    const message = `Clicked on "${request.payload.targetId}": [${request.payload.x}, ${request.payload.y}]`;    
    // Send a response message
    sendResponse({
      message,
    });
  }
  return true;
}

const pushCoordinates = (tabId, canvasId, x, y) => {
  const key = 'coordinates';
  const coords = [x,y];
  getCanvasRecorderData(tabId, canvasId, key, (result) => {
    let coordinatesList = result[slotName(tabId, canvasId, key)];
    if (!coordinatesList) {
      coordinatesList = [coords];
    } else {
      coordinatesList.push(coords);
    }
    setCanvasRecorderData(tabId, canvasId, key, coordinatesList);
  });
}

// Run the background script to track coordinates clicked on canvas 
(() => {
  // listen to CLICK messages from content script
  chrome.runtime.onMessage.addListener(clickListener);
  // listen to GETDATA messages from popup
  chrome.runtime.onMessage.addListener(getDataListener);
  // list to CLEARDATA messages from content script and popup
  chrome.runtime.onMessage.addListener(clearDataListener);
})();
