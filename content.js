const CHAT_CONTAINER_SELECTOR = ".seventv-chat-input-container";
const MAX_USERS = 20;
const MIN_USERS = 15;

class ChatObserver {
  constructor() {
    const blacklistedUserNames = [
      "schnozebot",
      "fossabot",
      "biroman",
      "xqc",
      "thepositivebot",
      "darkface____",
      "a_seagull",
      "aiden",
      "aimbotcalvin",
      "antvenom",
      "ben",
      "crtvly",
      "eff2ct",
      "evomanny",
      "hnlbot",
      "hydration",
      "infinitea",
      "jayne",
      "jessesmfi",
      "kaanvict",
      "legoenthusiast",
      "logviewer",
      "m0xyy",
      "mendo",
      "mightyoaks",
      "moobot",
      "netcat",
      "nightbot",
      "novakr",
      "numbratv",
      "nvez",
      "ohbot",
      "pajlada",
      "pokelawls",
      "reckful",
      "shadder2k",
      "sinatraa",
      "sodapoppin",
      "spanova",
      "streamelements",
      "supertf",
      "surefour",
      "thisapear",
      "thonkbot",
      "timthetatman",
      "topkej",
      "trainwreckstv",
      "xqcbot",
      "zostradamus",
      "zullxv",
      "zza_ow",
      "790w",
      "wizwot",
      "nothingsinger",
    ];

    chrome.storage.sync.set({ blacklist: blacklistedUserNames });
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
    this.refreshTokenIfNeeded();
  }

  refreshTokenIfNeeded() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(["expiresAt", "refreshToken"], (result) => {
        const expiresAt = new Date(result.expiresAt);
        const refreshToken = result.refreshToken;
        const now = new Date();
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

        if (!expiresAt || !refreshToken) {
          console.error("Missing expiresAt or refreshToken");
          reject("Missing expiresAt or refreshToken");
          return;
        }

        // If the token is about to expire or has already expired
        if (now.getTime() > expiresAt.getTime() - tenMinutes) {
          fetch("https://chlorinated-harvest-brontomerus.glitch.me/refresh_token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })
            .then((response) => response.json())
            .then((data) => {
              const newAccessToken = "oauth:" + data.access_token;
              const newRefreshToken = data.refresh_token;
              const newExpiresIn = data.expires_in;

              // Convert expiresIn to a date and timestamp
              const newExpiresAt = new Date().getTime() + newExpiresIn * 1000;

              chrome.storage.sync.set({ token: newAccessToken, refreshToken: newRefreshToken, expiresAt: newExpiresAt }, () => {
                console.log("Token refreshed");
                this.authToken = newAccessToken; // Update the authToken property
                resolve();
              });
            })
            .catch((error) => {
              console.error("Failed to refresh token:", error);
              reject(error);
            });
        } else {
          resolve();
        }
      });
    });
  }

  verifyAuthTokenAndUserName() {
    chrome.storage.sync.get(["token", "username"], (result) => {
      this.authToken = result.token;
      this.userName = result.username;
      if (!this.authToken || !this.userName) {
        chrome.runtime.sendMessage({ action: "openOptionsPage" });
      } else {
        this.refreshTokenIfNeeded()
          .then(() => {
            try {
              this.initializeChatConnection();
            } catch (error) {
              console.error("Failed to connect to chat due to:", error);
            }
          })
          .catch((error) => {
            console.error("Failed to refresh token:", error);
          });
      }
    });
  }

  collectUserNames(userName) {
    const englishLettersRegex = /^[a-zA-Z0-9\s\-_]+$/;
    const forbiddenWords = ["trans", "nibor", "walrus", "whale", "adept"]; //Preventing timeouts

    if (forbiddenWords.some((word) => userName.toLowerCase().includes(word))) {
      return;
    }

    chrome.storage.sync.get(["blacklist"], (data) => {
      const blacklistedUserNames = data.blacklist || [];
      if (userName && englishLettersRegex.test(userName) && !blacklistedUserNames.includes(userName.toLowerCase())) {
        const indexInArray1 = this.uniqueUserNames1.indexOf(userName);
        const indexInArray2 = this.uniqueUserNames2.indexOf(userName);

        if (indexInArray1 !== -1) {
          this.uniqueUserNames1.splice(indexInArray1, 1);
          console.log(`%c${userName}%c refreshed their position in uniqueUserNames1`, "color: orange", "color: gray");
          this.uniqueUserNames1.push(userName);
        } else if (indexInArray2 !== -1) {
          this.uniqueUserNames2.splice(indexInArray2, 1);
          console.log(`%c${userName}%c refreshed their position in uniqueUserNames2`, "color: orange", "color: gray");
          this.uniqueUserNames2.push(userName);
        } else {
          if (this.currentArray === this.uniqueUserNames1 && this.uniqueUserNames1.length >= MAX_USERS) {
            this.currentArray = this.uniqueUserNames2;
          } else if (this.currentArray === this.uniqueUserNames2 && this.uniqueUserNames2.length >= MAX_USERS) {
            this.currentArray = this.uniqueUserNames1;
          }

          if (this.currentArray.length >= MAX_USERS) {
            const removedUserName = this.currentArray.shift();
            const arrayName = this.currentArray === this.uniqueUserNames1 ? "uniqueUserNames1" : "uniqueUserNames2";
            console.log(`%c${userName} %creplaced %c${removedUserName} %cin ${arrayName}`, "color: green", "color: gray", "color: red", "color: gray");
          } else {
            console.log(`%c${userName}%c was added`, "color: green", "color: gray");
          }

          this.currentArray.push(userName);
        }
      }
    });
  }

  observeChat() {
    try {
      this.chatContainerElement = this.chatContainerElement || this.getChatContainer();
      const existingButtonContainer1 = this.chatContainerElement?.querySelector(".chat-input__buttons-container div:nth-child(1)");
      const existingButtonContainer2 = this.chatContainerElement?.querySelector(".chat-input__buttons-container div:nth-child(2)");
      const existingAlertButton = this.chatContainerElement?.querySelector(".alert-button");

      if (this.chatContainerElement && existingButtonContainer1 && existingButtonContainer2 && !existingAlertButton) {
        const alertButtonContainer = this.createAlertButtonContainer();
        const alertButton = this.createAlertButton();

        alertButtonContainer.appendChild(alertButton);
        alertButtonContainer.classList.add("alert-button");
        existingButtonContainer1.insertAdjacentElement("afterend", alertButtonContainer);
      }
    } catch (error) {
      console.error("Failed to create alert button due to:", error);
    }
  }

  initializeChatConnection() {
    const url = window.location.href;
    this.channelName = new URL(url).pathname.slice(1);

    this.chatClient = new tmi.Client({
      options: { debug: false },
      identity: {
        username: this.userName,
        password: this.authToken,
      },
      channels: [this.channelName],
    });

    this.chatClient.connect().catch((error) => {
      console.error("Failed to connect to the chat:", error);
      try {
        this.chatClient.connect();
      } catch (reconnectError) {
        console.error("Failed to reconnect to the chat:", reconnectError);
      }
    });

    this.chatClient.on("message", (channel, userstate, message, self) => {
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
    bellIconElement.addEventListener("mouseover", () => this.previewAlert());

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

      this.chatClient.say(this.channelName, `${collectedNames1} \n\nSOYSCREAM ALERT`).catch((error) => {
        console.error("Failed to send message:", error);
      });
      if (this.uniqueUserNames2.length >= MIN_USERS && this.uniqueUserNames2.length <= MAX_USERS) {
        setTimeout(() => {
          this.chatClient.say(this.channelName, `${collectedNames2} \n\nSOYSCREAM ALERT`).catch((error) => {
            console.error("Failed to send message:", error);
          });
        }, 1500);
      } else {
        console.log(`uniqueUserNames2 was not sent because it does not have at least ${MAX_USERS} elements.`);
      }
    } catch (error) {
      console.error("An error occurred in sendAlert:", error);
    }
  }

  previewAlert() {
    const previewMessage1 = Array.from(this.uniqueUserNames1).join(" ");
    const previewMessage2 = Array.from(this.uniqueUserNames2).join(" ");
    console.log(`Preview1: ${previewMessage1}`);
    console.log(`Preview2: ${previewMessage2}`);
  }
}

window.addEventListener("load", (event) => {
  new ChatObserver();
});
