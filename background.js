chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['token', 'username'], (result) => {
      if (!result.token || !result.username) {
        // The username or OAuth token is not set.
        // Open the options page.
        chrome.runtime.openOptionsPage();
      }
    });
  });


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'accessToken') {
    handleAccessToken(request.token, request.expiresIn);
  }
});
