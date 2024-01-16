const oauthButton = document.getElementById("oauthButton");
const username = document.getElementById("username").value;
let bufferTime = 60;

const permanentBlacklist = ["schnozebot", "fossabot", "biroman", "xqc", "thepositivebot", "darkface____"];
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

function startCountdown() {
  chrome.storage.sync.get(["expiresAt"], function (data) {
    const expiresAt = new Date(data.expiresAt);
    const countdownElement = document.getElementById("countdown");

    const intervalId = setInterval(function () {
      const now = new Date();
      const distance = expiresAt - now;

      if (distance < 0) {
        clearInterval(intervalId);
        countdownElement.textContent = "Token expired";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s until token expires`;
    }, 1000);
  });
}

oauthButton.addEventListener("click", function () {
  const redirectUrl = chrome.identity.getRedirectURL();
  const clientId = "ckomeetnagpxh3cno24cuk23hxrxm6";
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=chat:read+chat:edit`;

  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function (redirectUrl) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    } else {
      const url = new URL(redirectUrl);
      const code = url.searchParams.get("code");

      // Send the code to your server
      fetch("https://chlorinated-harvest-brontomerus.glitch.me/auth/twitch/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code }),
      })
        .then((response) => response.json())
        .then((data) => {
          const accessToken = data.access_token;
          const refreshToken = data.refresh_token;
          const expiresIn = data.expires_in;

          // Convert expiresIn to a date and timestamp
          const expiresAt = new Date().getTime() + expiresIn * 1000;

          chrome.storage.sync.set({ token: "oauth:" + accessToken, refreshToken: refreshToken, expiresAt: expiresAt }, function () {
            console.log(expiresAt);
            console.log(accessToken + refreshToken);
            document.getElementById("token").value = accessToken;
            showNotification("Saved", "Username and token has been stored", "#A0E4B3", "green");

            fetchUsername(accessToken).then((username) => {
              if (username) {
                chrome.storage.sync.set({ username: username }, function () {
                  document.getElementById("token").disabled = true;
                  document.getElementById("username").disabled = true;
                  oauthButton.disabled = true;
                  oauthButton.style.backgroundColor = "#cccccc";
                });
              }
              document.getElementById("stepThree").style.display = "block";
              document.getElementById("usernameDisplay").textContent = "@" + username;
              document.getElementById("blacklistForm").style.display = "block";
              document.getElementById("blacklistDisplay").style.display = "block";
              updateBlacklistDisplay();
            });
          });
        })
        .catch((error) => {
          console.error("Failed to exchange code for token:", error);
        });
    }
  });
});

if (token) {
  document.getElementById("token").value = "oauth:" + token;
  fetchUsername(token);
}

function fetchUsername(token) {
  return fetch("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": "ckomeetnagpxh3cno24cuk23hxrxm6",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const username = data.data[0].login;
      document.getElementById("username").value = username;
      return username;
    })
    .catch((error) => {
      console.error("Error:", error);
      return null;
    });
}

window.onload = function () {
  chrome.storage.sync.get(["token", "username"], function (data) {
    if (data.token && data.username) {
      document.getElementById("token").value = data.token;
      document.getElementById("username").value = data.username;
      document.getElementById("token").disabled = true;
      document.getElementById("username").disabled = true;
      oauthButton.disabled = true;
      oauthButton.style.backgroundColor = "#cccccc";
      document.getElementById("blacklistForm").style.display = "block";
      document.getElementById("blacklistDisplay").style.display = "block";
      // document.getElementById('tokenForm').querySelector('input[type="submit"]').disabled = true;
      if (data.blacklist) {
        document.getElementById("blacklist").value = data.blacklist.join(",");
      }
      updateBlacklistDisplay();
    } else {
      oauthButton.style.backgroundColor = "#9147ff";
      oauthButton.disabled = false;
    }
  });
  startCountdown();
};

document.getElementById("blacklistForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("blacklist").value.toLowerCase();
  chrome.storage.sync.get(["blacklist"], function (data) {
    let blacklist = data.blacklist || [];
    blacklist = blacklist.map((name) => name.toLowerCase());
    if (username && !blacklist.includes(username) && !permanentBlacklist.includes(username)) {
      blacklist.push(username);
      chrome.storage.sync.set({ blacklist: blacklist }, function () {
        document.getElementById("blacklist").value = "";
        updateBlacklistDisplay(); // Call this only when a new username is added
      });
    } else {
      showNotification("Oops!", "This name is already blacklisted", "#eeeeee", "#656565");
    }
  });
});

chrome.storage.sync.get(null, function (items) {
  console.log(items);
});

function updateBlacklistDisplay() {
  chrome.storage.sync.get(["blacklist"], function (data) {
    const blacklistDisplay = document.getElementById("blacklistDisplay");
    blacklistDisplay.innerHTML = "";
    const blacklist = data.blacklist || [];
    blacklist.forEach(function (username) {
      if (!permanentBlacklist.includes(username)) {
        const usernameDiv = document.createElement("div");
        usernameDiv.textContent = username;
        usernameDiv.style.display = "inline-flex";
        usernameDiv.style.alignItems = "center"; // Add this line
        const removeButton = document.createElement("span");
        removeButton.textContent = "x";
        removeButton.classList.add("removeButton");
        removeButton.addEventListener("click", function () {
          chrome.storage.sync.get(["blacklist"], function (data) {
            const blacklist = data.blacklist || [];
            const index = blacklist.indexOf(username);
            if (index > -1) {
              blacklist.splice(index, 1);
              chrome.storage.sync.set({ blacklist: blacklist }, updateBlacklistDisplay);
            }
          });
        });
        usernameDiv.appendChild(removeButton);
        blacklistDisplay.appendChild(usernameDiv);
      }
    });
  });
}

// document.getElementById('oauthButton').addEventListener('click', function() {
//   // Get the current tab
//   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     var currentTab = tabs[0];

//     // Open the new tab
//     chrome.tabs.create({ url: 'https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=q6batx0epp608isickayubi39itsckt&redirect_uri=https://twitchapps.com/tmi/&scope=chat:read+chat:edit+channel:moderate+whispers:read+whispers:edit+channel_editor' }, function(tab) {
//       var checkInterval = setInterval(function() {
//         chrome.tabs.get(tab.id, function(updatedTab) {
//           if (updatedTab.url.includes('access_token')) {
//             clearInterval(checkInterval);
//             var token = new URL(updatedTab.url).hash.split('&')[0].split('=')[1];
//             document.getElementById('token').value = "oauth:" + token;
//             chrome.tabs.remove(updatedTab.id);

//             // Focus back on the original tab
//             chrome.tabs.update(currentTab.id, {active: true});
//           }
//         });
//       }, 1000);
//     });
//   });
// });

document.getElementById("deleteButton").addEventListener("click", function () {
  const token = document.getElementById("token").value;
  const username = document.getElementById("username").value;
  oauthButton.disabled = false;
  oauthButton.style.backgroundColor = "#9147ff";

  if (token.trim() === "" && username.trim() === "") {
    showNotification("Error", "There is nothing to remove", "#FF0000", "#FFFFFF");
    return;
  }

  chrome.storage.sync.remove(["token", "username", "refreshToken"], function () {
    document.getElementById("token").value = "";
    document.getElementById("username").value = "";
    document.getElementById("token").disabled = false;
    document.getElementById("username").disabled = false;
    // document.getElementById('tokenForm').querySelector('input[type="submit"]').disabled = false;
    showNotification("Removed", "Token and username have been removed", "#E4A0A3", "#AA3407");
    document.getElementById("stepThree").style.display = "none";
    document.getElementById("blacklistForm").style.display = "none";
    document.getElementById("blacklistDisplay").style.display = "none";
  });
});

function showNotification(title, message, color, textColor) {
  const notification = document.createElement("div");
  notification.classList.add("notification");
  notification.style.color = textColor;
  notification.style.backgroundColor = color;

  if (title === "Saved") {
    notification.innerHTML = `<svg class="notification-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
    </svg> ${message}`;
  } else if (title === "Removed") {
    notification.innerHTML = `<svg class="w-[12px] h-[12px] text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20">
    <path d="M17 4h-4V2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H1a1 1 0 0 0 0 2h1v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1a1 1 0 1 0 0-2ZM7 2h4v2H7V2Zm1 14a1 1 0 1 1-2 0V8a1 1 0 0 1 2 0v8Zm4 0a1 1 0 0 1-2 0V8a1 1 0 0 1 2 0v8Z"/>
  </svg> ${message}`;
  } else {
    notification.textContent = `${title}: ${message}`;
  }

  document.body.insertBefore(notification, document.body.firstChild);

  setTimeout(function () {
    notification.style.animation = "slideOut 1s forwards";
    setTimeout(function () {
      notification.remove();
    }, 500);
  }, 3000);
}
