'use strict';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

// Listen for messages from popup (GUI) and background (service worker)
const listener = (request, sender, sendResponse) => {
  // just logging for now... not doing anything...
  console.log(sender.tab, request.type, request.payload);

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  sendResponse({});
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

// const clearStorage = () => {
//   // Tell service worker to clear some storage on reload
//   chrome.runtime.sendMessage(
//     {
//       type: 'CLEARDATA',
//       payload: {
//         targetId: e.target.id,
//         x: e.offsetX,
//         y: e.offsetY
//       },
//     },
//     response => {
//       console.log('Canvas Recorder', '-', response.message);
//     }
//   );
// }

// Run the content script to start tracking actions on <canvas>
(() => {
  // grab <canvas> specified in popup
  const canvas = getCanvas("");
  // set event listener on canvas to send coordinates
  canvas.addEventListener('click', sendCoordinates);
  // listen to messages from popup and service worker
  chrome.runtime.onMessage.addListener(listener);
})();
