window.onload = function() {
  chrome.storage.sync.get(['token', 'username'], function(data) {
    if (data.token && data.username) {
      document.getElementById('token').value = data.token;
      document.getElementById('username').value = data.username;
      document.getElementById('token').disabled = true;
      document.getElementById('username').disabled = true;
      document.getElementById('tokenForm').querySelector('input[type="submit"]').disabled = true;
    }
  });
};

document.getElementById('oauthButton').addEventListener('click', function() {
  // Get the current tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var currentTab = tabs[0];

    // Open the new tab
    chrome.tabs.create({ url: 'https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=q6batx0epp608isickayubi39itsckt&redirect_uri=https://twitchapps.com/tmi/&scope=chat:read+chat:edit+channel:moderate+whispers:read+whispers:edit+channel_editor' }, function(tab) {
      var checkInterval = setInterval(function() {
        chrome.tabs.get(tab.id, function(updatedTab) {
          if (updatedTab.url.includes('access_token')) {
            clearInterval(checkInterval);
            var token = new URL(updatedTab.url).hash.split('&')[0].split('=')[1];
            document.getElementById('token').value = "oauth:" + token;
            chrome.tabs.remove(updatedTab.id);

            // Focus back on the original tab
            chrome.tabs.update(currentTab.id, {active: true});
          }
        });
      }, 1000);
    });
  });
});

document.getElementById('tokenForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const token = document.getElementById('token').value;
  const username = document.getElementById('username').value;
  if (token.trim() === '' || username.trim() === '') {
    showNotification('Error', 'Please fill in both fields', '#FF0000', '#FFFFFF');
    return;
  }
  chrome.storage.sync.set({token: token, username: username}, function() {
    showNotification('Saved', 'Username and token has been saved', '#A0E4B3', 'green');
    // Disable the text fields and the submit button after successfully storing the data
    document.getElementById('token').disabled = true;
    document.getElementById('username').disabled = true;
    document.getElementById('tokenForm').querySelector('input[type="submit"]').disabled = true;
    document.getElementById('stepThree').style.display = 'block';
    document.getElementById('usernameDisplay').textContent = "@" + username;
  });
});

document.getElementById('deleteButton').addEventListener('click', function() {
  const token = document.getElementById('token').value;
  const username = document.getElementById('username').value;
  
  if (token.trim() === '' && username.trim() === '') {
    showNotification('Error', 'There is nothing to remove', '#FF0000', '#FFFFFF');
    return;
  }
  
  chrome.storage.sync.remove(['token', 'username'], function() {
    document.getElementById('token').value = '';
    document.getElementById('username').value = '';
    document.getElementById('token').disabled = false;
    document.getElementById('username').disabled = false;
    document.getElementById('tokenForm').querySelector('input[type="submit"]').disabled = false;
    showNotification('Removed', 'Token and username have been removed', '#E4A0A3', '#AA3407');
    document.getElementById('stepThree').style.display = 'none';
  });
});

function showNotification(title, message, color, textColor) {
  const notification = document.createElement('div');
  notification.classList.add('notification');
  notification.style.color = textColor;
  notification.style.backgroundColor = color;

  if (title === 'Saved') {
    notification.innerHTML = `<svg class="notification-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
    </svg> ${message}`;
  } else if (title === 'Removed') {
    notification.innerHTML = `<svg class="w-[12px] h-[12px] text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20">
    <path d="M17 4h-4V2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H1a1 1 0 0 0 0 2h1v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1a1 1 0 1 0 0-2ZM7 2h4v2H7V2Zm1 14a1 1 0 1 1-2 0V8a1 1 0 0 1 2 0v8Zm4 0a1 1 0 0 1-2 0V8a1 1 0 0 1 2 0v8Z"/>
  </svg> ${message}`;
  }else{
    notification.textContent = `${title}: ${message}`;
  }

  document.body.insertBefore(notification, document.body.firstChild);

  setTimeout(function() {
    notification.style.animation = 'slideOut 1s forwards';
    setTimeout(function() {
      notification.remove();
    }, 500);
  }, 3000);
}

