// Universal background script for Chrome and Firefox

// Check if the browser is Chrome or Firefox
if (typeof chrome !== "undefined") {
  // For Chrome
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") {
      chrome.storage.sync.get(["token", "username"], (result) => {
        if (!result.token || !result.username) {
          chrome.runtime.openOptionsPage();
        }
      });
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "accessToken") {
      handleAccessToken(request.token, request.expiresIn);
    }
  });
} else if (typeof browser !== "undefined") {
  // For Firefox
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") {
      browser.storage.sync.get(["token", "username"]).then((result) => {
        if (!result.token || !result.username) {
          browser.runtime.openOptionsPage();
        }
      });
    }
  });

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "accessToken") {
      handleAccessToken(request.token, request.expiresIn);
    }
  });
}
