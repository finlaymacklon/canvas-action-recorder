'use strict';

import './popup.css';

// when open, open a connection with background and keep reading the current coordinates
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    // options
    const optionCanvasId = document.getElementById('canvasId');
    const optionFormat = document.getElementById('outputFormat');
    const optionDefaultW = document.getElementById('defaultWidth');
    const optionDefaultH = document.getElementById('defaultHeight');
    const optionScale = document.getElementById('scaleCoords');
    // buttons
    const recordButton = document.getElementById("toggleRecord");
    const coordText = document.getElementById('coordinates');
    const clearBtn = document.getElementById('clearButton');
    // recording states
    const start = "Start Recording";
    const stop = "Stop Recording";
    // load default options
    const optionsMap = {
      'canvasId': optionCanvasId,
      'format': optionFormat,
      'defaultW': optionDefaultW,
      'defaultH': optionDefaultH,
      'doScale': optionScale
    }
    loadOptions(optionsMap);
    // load current coordinates
    const payload = {
      canvasId: optionCanvasId.value,
      key: 'coordinates'
    }
    sendWithActiveTabId('GETDATA', payload, loadCoordinates);
    // attatch listeners for changes to options
    Object.keys(optionsMap).map(k => {
      const el = optionsMap[k];
      el.addEventListener("input", e => {
        if (el.type === "checkbox") {
          setOption(k, el.checked);
        } else {
          setOption(k, el.value);
        }
      });
    })
    // set up listener for button to start/stop recording
    recordButton.addEventListener('click', (e) => {
      const payload = {
        canvasId: optionCanvasId.value,
        key: 'coordinates'
      }
      if (recordButton.innerText === start){
        sendToActiveTab('START', payload, () => {
          recordButton.innerText = stop;
          recordButton.style.backgroundColor = 'red';
        });
      } else {
        sendToActiveTab('STOP', payload, () => {
          recordButton.innerText = start;
          recordButton.style.backgroundColor = 'green';
        });
      }
    });
    // copy coordinates to clipboard on click
    coordText.addEventListener('click', (e) => {
      navigator.clipboard.writeText(coordText.innerText);
    });
    // provide button to clear coordinates
    clearBtn.addEventListener('click', (e) => {
      const canvasId = optionCanvasId.value;
      const payload = {
        canvasId: canvasId,
        key: 'coordinates'
      }
      sendWithActiveTabId('CLEARDATA', payload, clearCoordinates);
    });
  });
})();

const loadOptions = (optionsMap) => {
  Object.keys(optionsMap).map(k => {
    const el = optionsMap[k];
    getOption(k, (res) => {
      const slot = slotName(k);
      if (res[slot] || res[slot]===""){
        if (el.type === "checkbox") {
          el.checked = res[slot];
        } else {
          el.value = res[slot];
        }
      }
    });
  });
}
const getOption = (key, callback) => {
  const slot = slotName(key);
  chrome.storage.local.get([slot], (result) => {
    console.log(`Retrieved ${slot} as ${result[slot]}`);
    callback(result);
  });
}
const setOption = (key, value) => {
  const slot = slotName(key);
  const data = {};
  data[slot] = value;
  chrome.storage.local.set(data, () => {
    console.log(`Stored ${slot} as ${value}.`);
  }); 
}
const slotName = (key) => {
  return `canvasRecorder_${key}`;
}
const loadCoordinates = (response) => {
  if (response.message)
      // print out the coordinates (and allow user to "copy to clipboard")
      document.getElementById('coordinates').innerText += JSON.stringify(response.message);
}
const clearCoordinates = (response) => {
  if (response.success)
    document.getElementById('coordinates').innerText = "";
}
// format output
const formatCoordinates = () => {
  // TODO
}
const sendToActiveTab = (type, payload, callback) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentActiveTabId = tabs[0].id;
    chrome.tabs.sendMessage(
      currentActiveTabId, 
      {
        type: type,
        payload: payload
      },
      callback
    );
  });
}
const sendWithActiveTabId = (type, payload, callback) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentActiveTabId = tabs[0].id;
    payload["tabId"] = currentActiveTabId;
    chrome.runtime.sendMessage(
      {
        type: type,
        payload: payload,
      },
      callback
    );
  });
}
