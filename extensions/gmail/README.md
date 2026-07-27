# Thrive OS for Gmail

Development build of the Thrive OS Chrome extension.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extensions/gmail` directory.
5. Open Gmail and click the black Thrive button in the bottom-right corner.

This first version detects the email address and subject of the open Gmail
conversation. CRM data access and AI writing will use a separate extension
token; the extension intentionally does not read Thrive OS session cookies.
