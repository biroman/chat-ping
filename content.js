const CHAT_CONTAINER_SELECTOR = ".chat-input__buttons-container";
const CHAT_ELEMENTS_SELECTOR = ".seventv-chat-user-username";

class ChatObserver {
  constructor() {
    this.observer = new MutationObserver(() => this.observeChat());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.chatContainer = null;
    this.token = null;
    this.username = null;
    this.channel = null;
    this.uniqueNames = [];
    this.checkTokenAndUsername();
  }

  checkTokenAndUsername() {
    chrome.storage.sync.get(['token', 'username'], (result) => {
      this.token = result.token;
      this.username = result.username;
      if (!this.token || !this.username) {
        chrome.runtime.sendMessage({action: "openOptionsPage"});
      } else {
        try {
          this.connectToChat();
        } catch (error) {
          console.error("Failed to connect to chat due to:", error);
        }
      }
    });
  }

  collectNames(username) {
    const englishLettersRegex = /^[a-zA-Z0-9\s\-_]+$/;
    const blacklist = ["schnozebot", "fossabot", "biroman", "xqc", "thepositivebot", "darkface____"]; 
  
    if (username && englishLettersRegex.test(username) && !blacklist.includes(username.toLowerCase())) {
      if (!this.uniqueNames.includes(username)) {
        if (this.uniqueNames.length >= 25) {
          const removedUsername = this.uniqueNames.shift();
          console.log(`%c${removedUsername}%c replaced by %c${username}`, 'color: red', 'color: black', 'color: green');
        } else {
          console.log(`%c${username} was added`, 'color: green');
        }
        this.uniqueNames.push(username);
      }
    }
  }
  
  observeChat() {
    try {
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
    } catch (error) {
      console.error("Failed to create alert button due to:", error);
    }
  }

  connectToChat() {
    const url = window.location.href;
    this.channel = new URL(url).pathname.slice(1);
    try {
      this.collectNames();
    } catch (error) {
      console.error("Failed to collect names due to:", error);
    }

    const client = new tmi.Client({
      options: { debug: false },
      identity: {
        username: this.username,
        password: this.token,
      },
      channels: [this.channel],
    });

    client.connect().catch(error => {
      console.error("Failed to connect to the chat:", error);
      // Try to reconnect
      try {
        client.connect();
      } catch (reconnectError) {
        console.error("Failed to reconnect to the chat:", reconnectError);
      }
    });

    client.on('message', (channel, userstate, message, self) => {
      try {
        this.collectNames(userstate.username);
      } catch (error) {
        console.error("Failed to collect names from message due to:", error);
      }
    });
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
      const collectedNamesCount = this.uniqueNames.size;
      countText.textContent = `${this.uniqueNames.length}x`;
      bellIcon.textContent = "🔔";
    }, 1000);
  
    return alertButton;
  }

  sendAlert() {
    try {
      const collectedNames = Array.from(this.uniqueNames).join(" ");
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
  
      client.connect().catch(error => {
        console.error("Failed to connect to the chat:", error);
        // Try to reconnect
        try {
          client.connect();
        } catch (reconnectError) {
          console.error("Failed to reconnect to the chat:", reconnectError);
        }
      });
  
      client.on("connected", () => {
        client.say(channelName, `${collectedNames} \n\nSOYSCREAM ALERT`).catch(error => {
          console.error("Failed to send message:", error);
        });
      });
    } catch (error) {
      console.error("An error occurred in sendAlert:", error);
    }
  }

  previewAlert(alertButton) {
    const previewMessage = Array.from(this.uniqueNames).join(" ");
    console.log(`Preview: ${previewMessage}`);
  }

}
window.addEventListener('load', (event) => {
  new ChatObserver();
});