const APP_URL = "https://app.thrivedev.co";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message) {
  if (message?.type === "AUTH_STATUS") {
    const { thriveToken } = await chrome.storage.local.get("thriveToken");
    return { connected: Boolean(thriveToken) };
  }
  if (message?.type === "CONNECT") {
    const redirectUri = chrome.identity.getRedirectURL("thrive");
    try {
      const callback = await chrome.identity.launchWebAuthFlow({
        url: `${APP_URL}/api/extensions/connect?redirect_uri=${encodeURIComponent(redirectUri)}`,
        interactive: true
      });
      const token = callback && new URL(callback).searchParams.get("token");
      if (!token) return { connected: false, error: "Connection was not completed." };
      await chrome.storage.local.set({ thriveToken: token });
      return { connected: true };
    } catch {
      return { connected: false, error: "Could not connect Thrive OS." };
    }
  }
  if (message?.type === "GET_CONTEXT") {
    const { thriveToken } = await chrome.storage.local.get("thriveToken");
    if (!thriveToken) return { connected: false };
    const response = await fetch(
      `${APP_URL}/api/extensions/gmail/context?email=${encodeURIComponent(message.email)}`,
      { headers: { Authorization: `Bearer ${thriveToken}` } }
    );
    if (response.status === 401) {
      await chrome.storage.local.remove("thriveToken");
      return { connected: false };
    }
    if (!response.ok) return { connected: true, error: "CRM lookup failed." };
    return { connected: true, data: await response.json() };
  }
  return { error: "Unsupported request." };
}
