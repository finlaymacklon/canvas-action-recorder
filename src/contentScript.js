'use strict';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

// Listen for messages from popup to start recording a canvas
const startWatchListener = (request, sender, sendResponse) => {
  if (request.type === "START") {
    startWatching(request.payload.canvasId);
    const message = "true";
    sendResponse({ message });
  }
  return true;
};
// Listen for messages from popup to stop recording a canvas
const stopWatchListener = (request, sender, sendResponse) => {
  if (request.type === "STOP") {
    stopWatching(request.payload.canvasId);
    const message = "false";
    sendResponse({ message });
  }
  return true;
};
// Listen for messages from popup to send the current window dimensions
const dimensionsListener = (request, sender, sendResponse) => {
  if (request.type === "GETDIMS") {
    const canvas = getCanvas(request.payload.canvasId);
    const message = {'w': canvas.offsetWidth, 'h': canvas.offsetHeight};
    sendResponse({ message });
  }
  return true;
};
// Listen for messages from popup to check if we are currently recording
const isRecordingListener = (request, sender, sendResponse) => {
  if (request.type === "ISRECORD") {
    const canvas = getCanvas(request.payload.canvasId);
    const message = canvas.getAttribute('listening');
    sendResponse({ message });
  }
  return true;
};
// Send messages to background and popup when clicks occur on canvas
const sendCoordinates = (e) => { 
  // Communicate with background file by sending a message
  chrome.runtime.sendMessage(
    {
      type: 'CLICK',
      payload: {
        targetId: e.target.id,
        x: e.offsetX,
        y: e.offsetY
      },
    },
    response => {
      console.log('Canvas Recorder', '-', response.message);
    }
  );
}
// Get canvas element by supplying an element ID
const getCanvas = (canvasId="") => {
  let canvas;
  // if no canvasId specified, try to get the canvas directly from document
  if ((canvasId === "") || (canvasId === null) || (canvasId === undefined)) {
      const canvasCollection = document.getElementsByTagName("canvas");
      if (canvasCollection.length === 1) {
          canvas = canvasCollection[0];
      } else if (canvasCollection.length > 1) {
          throw("Error: There is more than 1 canvas element on the page. Please specify an element ID to select a specific canvas element."); 
      } else if (canvasCollection.length < 1) {
          throw("Error: No canvas element could be found on the page. Please ensure the specified canvas has been initialized.");
      }
  // otherwise we can just grab the specified canvas
  } else {
      canvas = document.getElementById(canvasId);
      if (canvas === null)  {
          throw("Error: The specified canvas element could not be found. Please check that the specified canvas ID is correct."); 
      }
  }
  return canvas;
}
//
const startWatching = (canvasId) => {
  // grab <canvas> specified in popup
  const canvas = getCanvas(canvasId);
  // set event listener on canvas to send coordinates
  canvas.addEventListener('click', sendCoordinates);
  // set attribute saying the event listener is attached
  canvas.setAttribute('listening', "true");
}
//
const stopWatching = (canvasId) => {
  // grab <canvas> specified in popup
  const canvas = getCanvas(canvasId);
  // detach event listener on canvas for sending coordinates
  canvas.removeEventListener('click', sendCoordinates);
  // set attribute saying the event listener is gone
  canvas.setAttribute('listening', "false");
}
// Run the content script to listen when to start/stop tracking actions on <canvas>
(() => {
  // listen to messages from popup and service worker
  chrome.runtime.onMessage.addListener(startWatchListener);
  chrome.runtime.onMessage.addListener(stopWatchListener);
  chrome.runtime.onMessage.addListener(dimensionsListener);
  chrome.runtime.onMessage.addListener(isRecordingListener);
})();
