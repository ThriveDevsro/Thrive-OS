# Thrive OS for Gmail

Development build of the Thrive OS Chrome extension.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extensions/gmail` directory.
5. Open Gmail and click the black Thrive button in the bottom-right corner.

The extension detects the email address and subject of the open Gmail
conversation. After **Connect Thrive OS**, Chrome opens a secure Thrive sign-in
flow and stores a dedicated 30-day extension token. It never reads the Thrive
web session cookie.

For a known CRM contact, the panel shows the company, owner, latest deal,
pipeline stage and next step. AI-assisted replies are the next layer.
