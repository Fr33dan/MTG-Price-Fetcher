# MTG-Price-Fetcher
Google Sheets Script to Fetch MTG card prices. Functions start with MTG and will auto-fill like other google sheet functions.

Card prices are fetched from MTGGoldfish.com and card metadata provided by Magicthegathering.io.

Prices are cached for 24 hours for performance and so that the script doesn't batch MTGGoldfishes servers over the head repeatedly.

To install:
1. Open Code.gs using the link above.
2. Select all the code from the file and copy it to the clipboard.
3. Open the spreadsheet to which you wish to add the add-in.
4. Select "Tools > Script Editor"
5. Paste the code from Code.gs.
6. Save your code, the name doesn't matter but "MTG Price Fetcher" is recommended for clarity.
7. Close the code window and return to your spreadsheet.
