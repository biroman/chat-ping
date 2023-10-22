const CHAT_CONTAINER_SELECTOR = ".seventv-chat-input-container";

class ChatObserver {
  constructor() {
    this.mutationObserver = new MutationObserver(() => this.observeChat());
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    this.chatContainerElement = null;
    this.authToken = null;
    this.userName = null;
    this.channelName = null;
    this.uniqueUserNames = [];
    this.verifyAuthTokenAndUserName();
  }

  verifyAuthTokenAndUserName() {
    chrome.storage.sync.get(['token', 'username'], (result) => {
      this.authToken = result.token;
      this.userName = result.username;
      if (!this.authToken || !this.userName) {
        chrome.runtime.sendMessage({action: "openOptionsPage"});
      } else {
        try {
          this.initializeChatConnection();
        } catch (error) {
          console.error("Failed to connect to chat due to:", error);
        }
      }
    });
  }

  collectUserNames(userName) {
    const englishLettersRegex = /^[a-zA-Z0-9\s\-_]+$/;
    const blacklistedUserNames = ["schnozebot", "fossabot", "biroman", "xqc", "thepositivebot", "darkface____"]; 
  
    if (userName && englishLettersRegex.test(userName) && !blacklistedUserNames.includes(userName.toLowerCase())) {
      if (!this.uniqueUserNames.includes(userName)) {
        if (this.uniqueUserNames.length >= 25) {
          const removedUserName = this.uniqueUserNames.shift();
          console.log(`%c${removedUserName}%c replaced by %c${userName}`, 'color: red', 'color: black', 'color: green');
        } else {
          console.log(`%c${userName} was added`, 'color: green');
        }
        this.uniqueUserNames.push(userName);
      }
    }
  }
  
  observeChat() {
    try {
      this.chatContainerElement = this.chatContainerElement || this.getChatContainer();
      const existingButtonContainer1 = this.chatContainerElement?.querySelector("div.jaMZlX");
      const existingButtonContainer2 = this.chatContainerElement?.querySelector("div.liBNWc");
  
      if (this.chatContainerElement && existingButtonContainer1 && existingButtonContainer2) {
        this.mutationObserver.disconnect();
        const alertButtonContainer = this.createAlertButtonContainer();
        const alertButton = this.createAlertButton();
  
        alertButtonContainer.appendChild(alertButton);
        existingButtonContainer1.insertAdjacentElement("afterend", alertButtonContainer);
      }
    } catch (error) {
      console.error("Failed to create alert button due to:", error);
    }
  }


  initializeChatConnection() {
    const url = window.location.href;
    this.channelName = new URL(url).pathname.slice(1);
    try {
      this.collectUserNames();
    } catch (error) {
      console.error("Failed to collect names due to:", error);
    }

    const chatClient = new tmi.Client({
      options: { debug: false },
      identity: {
        username: this.userName,
        password: this.authToken,
      },
      channels: [this.channelName],
    });

    chatClient.connect().catch(error => {
      console.error("Failed to connect to the chat:", error);
      // Try to reconnect
      try {
        chatClient.connect();
      } catch (reconnectError) {
        console.error("Failed to reconnect to the chat:", reconnectError);
      }
    });

    chatClient.on('message', (channel, userstate, message, self) => {
      try {
        this.collectUserNames(userstate.username);
      } catch (error) {
        console.error("Failed to collect names from message due to:", error);
      }
    });
  }

  getChatContainer() {
    return document.querySelector(CHAT_CONTAINER_SELECTOR);
  }

  createAlertButtonContainer() {
    const buttonContainerElement = document.createElement("div");
    buttonContainerElement.style.display = "flex";
    buttonContainerElement.style.justifyContent = "center";
    return buttonContainerElement;
  }

  createAlertButton() {
    const alertButtonElement = document.createElement("span");
    const countTextElement = document.createElement("span");
    const bellIconElement = document.createElement("span");
  
    countTextElement.style.fontSize = "small";
    bellIconElement.style.fontSize = "large";
    bellIconElement.style.cursor = "pointer";
  
    alertButtonElement.appendChild(countTextElement);
    alertButtonElement.appendChild(bellIconElement);
  
    bellIconElement.addEventListener("click", () => this.sendAlert());
    bellIconElement.addEventListener("mouseover", () => this.previewAlert(bellIconElement));
  
    setInterval(() => {
      const collectedNamesCount = this.uniqueUserNames.size;
      countTextElement.textContent = `${this.uniqueUserNames.length}x`;
      bellIconElement.textContent = "🔔";
    }, 1000);
  
    return alertButtonElement;
  }

  sendAlert() {
    try {
      const collectedNames = Array.from(this.uniqueUserNames).join(" ");
      console.log(collectedNames);
  
      const url = window.location.href;
      const channelName = new URL(url).pathname.slice(1);
  
      const chatClient = new tmi.Client({
        options: { debug: false },
        identity: {
          username: this.userName,
          password: this.authToken,
        },
        channels: [channelName],
      });
  
      chatClient.connect().catch(error => {
        console.error("Failed to connect to the chat:", error);
        // Try to reconnect
        try {
          chatClient.connect();
        } catch (reconnectError) {
          console.error("Failed to reconnect to the chat:", reconnectError);
        }
      });
  
      chatClient.on("connected", () => {
        chatClient.say(channelName, `${collectedNames} \n\nSOYSCREAM ALERT`).catch(error => {
          console.error("Failed to send message:", error);
        });
      });
    } catch (error) {
      console.error("An error occurred in sendAlert:", error);
    }
  }

  previewAlert(alertButtonElement) {
    const previewMessage = Array.from(this.uniqueUserNames).join(" ");
    console.log(`Preview: ${previewMessage}`);
  }

}
window.addEventListener('load', (event) => {
  new ChatObserver();
});