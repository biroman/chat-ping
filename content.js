const CHAT_CONTAINER_SELECTOR = ".seventv-chat-input-container";

class ChatObserver {
  constructor() {
    this.mutationObserver = new MutationObserver(() => this.observeChat());
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    this.chatContainerElement = null;
    this.authToken = null;
    this.userName = null;
    this.channelName = null;
    this.uniqueUserNames1 = [];
    this.uniqueUserNames2 = [];
    this.currentArray = this.uniqueUserNames1;
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
      if (!this.uniqueUserNames1.includes(userName) && !this.uniqueUserNames2.includes(userName)) {
        if (this.currentArray.length >= 25) {
          const removedUserName = this.currentArray.shift();
          const arrayName = this.currentArray === this.uniqueUserNames1 ? 'uniqueUserNames1' : 'uniqueUserNames2';
          console.log(`%c${removedUserName} in ${arrayName} replaced by %c${userName}`, 'color: red', 'color: green');
        } else {
          console.log(`%c${userName} was added`, 'color: green');
        }
        this.currentArray.push(userName);
        if (this.currentArray === this.uniqueUserNames1 && this.uniqueUserNames1.length >= 25) {
          this.currentArray = this.uniqueUserNames2;
        } else if (this.currentArray === this.uniqueUserNames2 && this.uniqueUserNames2.length >= 25) {
          this.currentArray = this.uniqueUserNames1;
        }
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
    // bellIconElement.addEventListener("mouseover", () => this.previewAlert(bellIconElement));
  
    setInterval(() => {
      const collectedNamesCount = this.uniqueUserNames1.length + this.uniqueUserNames2.length;
      countTextElement.textContent = `${collectedNamesCount}x`;
      bellIconElement.textContent = "🔔";
    }, 1000);
    return alertButtonElement;
  }

  sendAlert() {
    try {
      const collectedNames1 = Array.from(this.uniqueUserNames1).join(" ");
      const collectedNames2 = Array.from(this.uniqueUserNames2).join(" ");
      console.log(collectedNames1);
      console.log(collectedNames2);
  
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
        chatClient.say(channelName, `${collectedNames1} \n\nSOYSCREAM ALERT`).catch(error => {
          console.error("Failed to send message:", error);
        });
        if (this.uniqueUserNames2.length >= 25) {
          setTimeout(() => {
            chatClient.say(channelName, `${collectedNames2} \n\nSOYSCREAM ALERT`).catch(error => {
              console.error("Failed to send message:", error);
            });
          }, 1500);
        }
      });
    } catch (error) {
      console.error("An error occurred in sendAlert:", error);
    }
  }

  // previewAlert(alertButtonElement) {
  //   const previewMessage = Array.from(this.uniqueUserNames).join(" ");
  //   console.log(`Preview: ${previewMessage}`);
  // }

}
window.addEventListener('load', (event) => {
  new ChatObserver();
});