'use strict';

// when open, open a connection with background and keep reading the current coordinates
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const currentActiveTabId = tabs[0].id;
      const canvasId = document.getElementById('canvasId').value;

      chrome.runtime.sendMessage(
        {
          type: 'GETDATA',
          payload: {
            tabId: currentActiveTabId,
            canvasId: canvasId,
            key: 'coordinates'
          },
        },
        response => {
          if (response.message)
            // print out the coordinates (and allow user to "copy to clipboard")
            document.getElementById('coordinates').innerText += JSON.stringify(response.message);
        }
      );
    })
    
    const coordText = document.getElementById('coordinates')
    coordText.addEventListener('click', (e) => {
      navigator.clipboard.writeText(coordText.innerText);
    });

    // provide button to clear coordinates
    const clearBtn = document.getElementById('clearButton');
    clearBtn.addEventListener('click', (e) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentActiveTabId = tabs[0].id;
        const canvasId = document.getElementById('canvasId').value;
  
        chrome.runtime.sendMessage(
          {
            type: 'CLEARDATA',
            payload: {
              tabId: currentActiveTabId,
              canvasId: canvasId,
              key: 'coordinates'
            },
          },
          response => {
            if (response.message)
              // print out the coordinates (and allow user to "copy to clipboard")
              document.getElementById('coordinates').innerText += JSON.stringify(response.message);
          }
        );
      })
    });
  })
})();

// format output
