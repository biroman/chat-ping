# Quick Start Guide

## Installation

1. Clone the repository from GitHub or download the zip file and extract it.
2. Open the Google Chrome browser and navigate to `chrome://extensions`.
3. At the top right, turn on `Developer mode`.
4. Click `Load unpacked`.
5. Navigate to the project directory and select it.

## Setup

1. After installation, you should be automatically redirected to its setup page.
2. Follow the steps outlined in the setup guide:

   - **Step 1**: Generate an OAuth token from your Twitch account. This is necessary for the application to send the ping message. You can generate the token by clicking the "Generate token" button or manually at [Twitchapps.com](https://twitchapps.com/tmi/).

   - **Step 2**: Insert your Twitch username (and the OAuth token if you chose manually) you generated in step 1 into the respective fields and click "Save". Once saved, the input fields will be disabled to prevent accidental changes.

## Usage

- The application maintains a list of up to 50 names from the chat. You can see the number of stored names below your chat, indicated as for example '41x🔔'.
- Clicking the bell icon sends a ping message in the chat. But if you wait until it hits 50x, it will send two separate messages with 50 unique names.
- When the list of names gets full, the system replaces old stored names with new ones so both messages will contain up to date names of active chatters.

## ⚠️ Warning

**Please note that indiscriminately pinging random usernames could lead to a temporary chat timeout. This can occur if Fossabot flags certain usernames as inappropriate or profane. To avoid this, if you identify or encounter usernames that result in a timeout, please manually add them to your blacklist.**

## Customization

- If you wish to adjust the maximum number of stored names, you'll need to edit the `collectNames()` function within the `content.js` file.
- If you want to modify the emotes used in the ping, you'll need to edit the `sendAlert()` function within the `content.js` file.
- To expand the blacklist with additional names, you can add the names through the options page.

## Known bugs

- N/A

## Support

- If you encounter any issues or have any questions, please open an issue on GitHub or dm me on Twitch.
