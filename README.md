# WWE ShowRunner

A hands-free chronological show runner for **WWE content** across **Peacock** and **Netflix**.  
This userscript automatically plays **RAW**, **SmackDown**, **PPV**, and **Heat** episodes in the correct historical order, switching platforms when necessary. The episode list is still expanding, and contributions are welcome to help complete the chronology.

---

## Features

- Automatic chronological playback across shows and platforms  
- Hands-free episode switching after true video completion  
- Respects manual pause (does not skip when you pause)  
- Start from the beginning or resume from your last episode  
- Import and export episode lists as JSON files  
- Detects and ignores teaser or background animations on Peacock  
- Color-coded indicator dot showing current show type  
- Lightweight always-on design—no manual activation needed  

---

## Installation

### Option 1: Direct Installation (Recommended)

1. Install **Tampermonkey** in your browser  
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)  
   - [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)  
2. Open the **Raw** link to this script in your repository:  
   ```
   https://github.com/<your-username>/showrunner/raw/main/showrunner.user.js
   ```
3. Tampermonkey will prompt you to **install the script**. Confirm.

---

### Option 2: Manual Installation

1. Copy the full contents of `showrunner.user.js`.  
2. In Tampermonkey, click **Create a new script**.  
3. Paste the entire code, then click **File → Save**.  

---

## Usage

1. Navigate to any WWE episode on **Peacock** or **Netflix**.  
2. Click the **colored circle** in the bottom-right corner of the page to open the control panel.  
3. Add or import your lists of shows (RAW, SD, PPV, HEAT).  
4. Click **Save** to update your list.  
5. Use **Start** to begin from the first chronological episode, or **Resume** to continue from your last watched episode.  
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

## Notes

- The script advances only when a main video ends (not background loops).  
- Works on both Netflix and Peacock simultaneously.  
- All data is stored locally (no external servers).  

---

## License

This project is licensed under the **Creative Commons Attribution–NonCommercial 4.0 International (CC BY-NC 4.0)** license.  
You are free to use, modify, and share this script for personal or educational purposes, but **commercial use is not permitted**.  
Author: Big Feta  
Year: 2025  
https://creativecommons.org/licenses/by-nc/4.0/
