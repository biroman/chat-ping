const CHAT_CONTAINER_SELECTOR = "#live-page-chat > div > div > div.Layout-sc-1xcs6mc-0.gTweXu.chat-shell.chat-shell__expanded > div > div > section > div > seventv-container > div > div:nth-child(2) > div.Layout-sc-1xcs6mc-0.bGbtMS.chat-input__buttons-container";
const CHAT_ELEMENTS_SELECTOR = "#seventv-message-container > main > div > span > div > div > span > div.seventv-chat-user > span.seventv-chat-user-username > span > span";
const NAMES_LIMIT = 20;

class ChatObserver {
  constructor() {
    this.observer = new MutationObserver(() => this.observeChat());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.checkTokenAndUsername();
    this.chatContainer = null;
    this.token = null;
    this.username = null;
  }

  checkTokenAndUsername() {
    chrome.storage.sync.get(['token', 'username'], (result) => {
      this.token = result.token;
      this.username = result.username;
      if (!this.token || !this.username) {
        chrome.runtime.sendMessage({action: "openOptionsPage"});
      } else {
        this.observeChat();
      }
    });
  }

  observeChat() {
    this.chatContainer = this.chatContainer || this.getChatContainer();
    const existingButtonContainer1 = this.chatContainer?.querySelector("div.Layout-sc-1xcs6mc-0.jaMZlX");
    const existingButtonContainer2 = this.chatContainer?.querySelector("div.Layout-sc-1xcs6mc-0.liBNWc");

    if (this.chatContainer && existingButtonContainer1 && existingButtonContainer2) {
      this.observer.disconnect();
      const alertButtonContainer = this.createAlertButtonContainer();
      const alertButton = this.createAlertButton();

      alertButtonContainer.appendChild(alertButton);
      existingButtonContainer1.insertAdjacentElement("afterend", alertButtonContainer);
    }
  }

  getChatContainer() {
    return document.querySelector(CHAT_CONTAINER_SELECTOR);
  }

  createAlertButtonContainer() {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    return buttonContainer;
  }

  createAlertButton() {
    const alertButton = document.createElement("span");
    const countText = document.createElement("span");
    const bellIcon = document.createElement("span");
  
    countText.style.fontSize = "small";
    bellIcon.style.fontSize = "large";
    bellIcon.style.cursor = "pointer";
  
    alertButton.appendChild(countText);
    alertButton.appendChild(bellIcon);
  
    bellIcon.addEventListener("click", () => this.sendAlert());
    bellIcon.addEventListener("mouseover", () => this.previewAlert(bellIcon));
  
    setInterval(() => {
      const collectedNames = this.collectNames();
      const collectedNamesCount = collectedNames.split(' ').length - 2; // Subtract 2 for the two words in "SOYSCREAM ALERT"
      countText.textContent = `${collectedNamesCount}x`;
      bellIcon.textContent = "🔔";
    }, 1000);
  
    return alertButton;
  }

  sendAlert() {
    const collectedNames = this.collectNames();
    console.log(collectedNames);
  
    const url = window.location.href;
    const channelName = new URL(url).pathname.slice(1);
  
    const client = new tmi.Client({
      options: { debug: false },
      identity: {
        username: this.username,
        password: this.token,
      },
      channels: [channelName],
    });
  
    client.connect();
  
    client.on("connected", () => {
      client.say(channelName, collectedNames);
    });
  }

  previewAlert(alertButton) {
    const previewMessage = this.collectNames();
    console.log(`Preview: ${previewMessage}`);
  }

  collectNames(limit = NAMES_LIMIT) {
    const chatElements = document.querySelectorAll(CHAT_ELEMENTS_SELECTOR);
    const uniqueNames = new Set();
    const englishLettersRegex = /^[a-zA-Z0-9\s\-_]+$/;
    const blacklist = ["schnozebot", "fossabot", "biroman", "xqc", "thepositivebot", "darkface____"]; //You might get timed out, for example: darkface____ will time you out because of "racism" thats why I blacklisted his name.
  
    chatElements.forEach((chatElement) => {
      const username = chatElement.textContent.trim();
  
      if (username && englishLettersRegex.test(username) && !blacklist.includes(username.toLowerCase())) {
        uniqueNames.add(username); // Removed "@" here
      }
    });
  
    const namesLimited = Array.from(uniqueNames).reverse().slice(0, limit);
    return `${namesLimited.join(" ")} \n\nSOYSCREAM ALERT`;
  }
}

new ChatObserver();