# WWE ShowRunner

A hands-free chronological show runner for **WWE content** across **Peacock** and **Netflix**.  
Automatically plays **RAW**, **SmackDown**, **PPV**, and **Heat** episodes in the correct historical order, switching platforms when necessary. The episode list is still expanding, and contributions are welcome to help complete the chronology.

---

## Features

- Automatic chronological playback across shows and platforms  
- Hands-free episode switching after true video completion  
- Start from the beginning, start at any point in time within the episode list, or resume from your last episode  
- Import and export episode lists as JSON files   
- Color-coded indicator dot showing current show type  
- Lightweight "always-on" design (no manual activation needed)  

---
## Installation

**Requirements**
- Active Netflix Subscription (US)
- Active PeacockTV Subscription (US)

1. Install and enable **Tampermonkey** in your browser.
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)

2. Download `WWE ShowRunner-1.0.user.js` and drag it to your desktop.
   - Alternatively, you can copy the code directly from GitHub.

3. Open Tampermonkey in your extensions and click **Create a new script**.

4. In the new screen, choose one of the following methods:

   **a. Drag-and-drop method**
   - Drag `WWE ShowRunner-1.0.user.js` from your desktop into Tampermonkey.
   - When prompted to install, click **Install** and then close Tampermonkey.

   **b. Copy-and-paste method**
   - Right-click `WWE ShowRunner-1.0.user.js` on your desktop and open it in Notepad.
   - Copy the entire code, paste it into Tampermonkey, then click **File → Save**.
   - Exit Tampermonkey.

Once installed, reload your browser. Firefox users should also ensure they are not on an empty tab (i.e visit any webpage like google). Then, hit "ctrl + alt + /". You should see The panel open up at the bottom right of the screen.
If this does not appeare, the installation was unsuccessful. After confirming the installation, load the show order:

1. Download `WWE_show_lists.json`.
2. On Netflix or Peacock, click the circle at the bottom right.
3. Click **Import** on the menu.
4. Select `WWE_show_lists.json`.

To confirm that the episodes were loaded, you should see the lists populate in the extension.

---

## Usage

1. Ensure you are not on an empty tab (i.e go to google or any website)
2. Press "ctrl + alt + /" to open the control pane (alternatively, you can click the colored circle at bottom right during an episode)
3. Add or import your lists of shows (RAW, SD, PPV, HEAT).  
4. Click **Save** to update your list.  
5. Use **Start** to begin from the first chronological episode (Wrestlemania 15 for now), or **Resume** to continue from your last watched episode.  
6. The script will automatically advance to the next show once the current one finishes.

---

## Updating the List

The ShowRunner system uses a **JSON list file** to store all episodes in chronological order.  
Each entry must follow this format:

```
YYYY-MM-DD https://example.com/watch/episode
```

For example:

```json
{
  "format": "showRunnerLists",
  "version": "1",
  "lists": {
    "raw": [
      "1999-04-12 https://www.netflix.com/watch/81937939",
      "1999-05-10 https://www.netflix.com/watch/81937943"
    ],
    "sd": [
      "1999-04-29 https://www.peacocktv.com/watch/playback/vod/GMO_00000000372824_01/c4fe6d7c-f08d-31f1-b9e6-455a9dc47370"
    ],
    "ppv": [
      "1999-05-16 https://www.peacocktv.com/watch/playback/vod/GMO_00000000374710_01/ecef3eb8-59f8-336e-91a1-a72b87986094"
    ],
    "heat": [
      "1999-04-11 https://www.peacocktv.com/watch/playback/vod/GMO_00000000377893_01/706fee82-3e2d-3fe0-9812-1b2b79b4fbb6"
    ]
  }
}
```

- Always put the **date first** (in `YYYY-MM-DD` format), followed by the **episode URL**.  
- Each show category (RAW, SD, PPV, HEAT) keeps its own list.  
- When importing the JSON file, ShowRunner will automatically **sort episodes by date** and **merge them into one master list**.  
- You can manually edit the JSON file using any text editor to add, remove, or reorder episodes.

---

## Troubleshooting & Tips

### If videos load but do not automatically start

You must enable **autoplay** in your **browser preferences** for Netflix and Peacock.  
If autoplay is blocked, ShowRunner cannot automatically continue playback as the video will load and be stopped.

**Chrome:**  
- Go to `chrome://settings/content/mediaAutoplay`  
- Set **“Sites can autoplay media”** to **Allow**.  

**Firefox:**  
- Go to `about:preferences#privacy` → scroll to **Permissions → Autoplay**.  
- Change **Default for all websites** to **Allow Audio and Video**.  

**Edge:**  
- Go to **Settings → Cookies and site permissions → Media autoplay**.  
- Set it to **Allow**.  

Once browser-level autoplay are enabled, ShowRunner will run seamlessly.

---

## Disable

To temporarily disable the plugin:

1. Open the **Tampermonkey** extension in your browser.
2. Locate the script titled **WWE ShowRunner**.
3. Click the **toggle switch** next to its name to disable it.
4. Refresh your browser tab to apply the change.

---

## Uninstall

To completely remove the plugin:

1. Open the **Tampermonkey** extension while the ShowRunner is active.
2. Find **WWE ShowRunner** in your list of scripts.
3. Click the **dropdown arrow** next to its name.
4. Select **Delete** or **Uninstall** from the menu.
5. Confirm when prompted.

---

## Notes
- All data is stored locally (no external servers).

## Planned Improvements
- Add hotkey option for panel activation (in cae you want to remove dot)
- Updated episode list

---

## License

This project is licensed under the **Creative Commons Attribution–NonCommercial 4.0 International (CC BY-NC 4.0)** license.  
You are free to use, modify, and share this script for personal or educational purposes, but **commercial use is not permitted**.  
Author: Big Feta  
Year: 2025  
https://creativecommons.org/licenses/by-nc/4.0/
