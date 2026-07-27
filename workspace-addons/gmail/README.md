# Thrive OS Google Workspace Add-on

Native Gmail add-on for Gmail web, Android and iOS. It is browser-independent.

## Development deployment

1. Create a Google Apps Script project attached to the same Google Cloud
   project as the Thrive OAuth consent screen.
2. Copy `Code.gs` and `appsscript.json` into the Apps Script project.
3. Create a test deployment under **Deploy → Test deployments → Google
   Workspace Add-on**.
4. Install the deployment for a test Google account.
5. Open Gmail, select the Thrive OS icon, generate a connection token and paste
   it into the add-on card.

The add-on stores the dedicated Thrive token in Apps Script User Properties,
separately for each Google user. It does not store the user's Thrive password.
