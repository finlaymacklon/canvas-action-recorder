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

    // load default options
    const optionsMap = {
      'canvasId': optionCanvasId,
      'format': optionFormat,
      'defaultW': optionDefaultW,
      'defaultH': optionDefaultH,
      'doScale': optionScale
    }
    loadOptions(optionsMap);
    // load current recording state
    sendToActiveTab(
      'ISRECORD', 
      {
        'canvasId': optionCanvasId.value,
        'key': 'coordinates'
      }, 
      loadRecordingState
    );
    // load current coordinates
    sendWithActiveTabId(
      'GETDATA', 
      {
        'canvasId': optionCanvasId.value,
        'key': 'coordinates'
      }, 
      loadCoordinates
    );
    // attatch listeners for changes to options
    Object.keys(optionsMap).map(k => {
      const el = optionsMap[k];
      el.addEventListener("input", e => {
        if (el.type === "checkbox") {
          setStoredValue(k, el.checked);
        } else {
          setStoredValue(k, el.value);
        }
      });
    })
    // set up listener for button to start/stop recording
    recordButton.addEventListener('click', (e) => {
      // check current recording state
      sendToActiveTab(
        'ISRECORD', 
        {
          'canvasId': optionCanvasId.value,
          'key': 'coordinates'
        }, 
        (response) => {
          const payload = {
            canvasId: optionCanvasId.value,
            key: 'coordinates'
          }
          if (response.message === "true") {
            sendToActiveTab('STOP', payload, loadRecordingState);
          } else {
            sendToActiveTab('START', payload, loadRecordingState);
          }
        }
      );
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
    getStoredValue(k, (res) => {
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
const getStoredValue = (key, callback) => {
  const slot = slotName(key);
  chrome.storage.local.get([slot], (result) => {
    console.log(`Retrieved ${slot} as ${result[slot]}.`);
    callback(result);
  });
}
const setStoredValue = (key, value) => {
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
const loadRecordingState = (response) => {
  const startTxt = "Start Recording";
  const startColor = "lightgrey";
  const stopTxt = "Stop Recording";
  const stopColor = "red";
  const recordButton = document.getElementById("toggleRecord");
  if (response.message === "true") {
    recordButton.innerText = stopTxt;
    recordButton.style.backgroundColor = stopColor;
  } else {
    recordButton.innerText = startTxt;
    recordButton.style.backgroundColor = startColor;
  }
}
const loadCoordinates = (response) => {
  if (response.message) {
    // print out the formatted coordinates (and allow user to "copy to clipboard")
    scaleCoordinates(response.message, (coordsList) => {
      const coordsString = formatCoordinates(coordsList);
      document.getElementById('coordinates').innerText = coordsString;
    })
  }
}
const clearCoordinates = (response) => {
  if (response.success)
    document.getElementById('coordinates').innerText = "";
}
// format output
const formatCoordinates = (coordinatesList) => {
  const format = document.getElementById('outputFormat').value;
  let openBracket = "[";
  const coordString = coordinatesList.map(([x,y]) => {
      const coords = format.replace("$x", x).replace("$y", y);
      return coords;
    }).reduce((coordString, coord, idx, arr) => {
        coordString += coord;
        if ((idx+1)===arr.length) {
          coordString += "]";
        } else {
          coordString += ",\n";
        }
        return coordString;
        }, 
    openBracket);
  return coordString;
}
const scaleCoordinates = (coordinatesList, callback) => {
  const doScale = document.getElementById('scaleCoords').checked;
  // if we don't scale, just multiply each coordinate by 1
  if (!doScale) {
    callback(coordinatesList);
    return;
  }
  // otherwise we will scale the coordinates
  const canvasId = document.getElementById("canvasId").value;
  const payload = {
    'canvasId': canvasId,
    'key': 'coordinates'
  }
  sendToActiveTab("GETDIMS", payload, (response) => {
    const defaultW = document.getElementById('defaultWidth').value;
    const defaultH = document.getElementById('defaultHeight').value;
    const currentW = response.message.w;
    const currentH = response.message.h;
    const scaleX = defaultW / currentW;
    const scaleY = defaultH / currentH;

    const coordsListScaled = coordinatesList.map(([x,y]) => {
      // round coordinates to 3 decimal places...idk seems about right
      const roundFactor = 1000;
      const xScaled = Math.round(x*scaleX * roundFactor) / roundFactor;
      const yScaled = Math.round(y*scaleY * roundFactor) / roundFactor;
      return [xScaled, yScaled];
    });
    callback(coordsListScaled);
  });
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
