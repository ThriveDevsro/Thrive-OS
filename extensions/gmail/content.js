(() => {
  if (window.__thriveGmailLoaded) return;
  window.__thriveGmailLoaded = true;

  const APP_URL = "https://app.thrivedev.co";
  let panel;
  let contactEmail = "";
  let subject = "";
  let connected = false;
  let crmData;
  let crmLoading = false;
  let refreshTimer;

  const launcher = document.createElement("button");
  launcher.className = "thrive-gmail-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open Thrive OS");
  launcher.innerHTML = "<span>T</span>";
  launcher.addEventListener("click", togglePanel);
  document.body.appendChild(launcher);

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("hashchange", scheduleRefresh);
  scheduleRefresh();

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refreshContext, 250);
  }

  function refreshContext() {
    const nextEmail = findConversationEmail();
    const nextSubject = findSubject();
    if (nextEmail === contactEmail && nextSubject === subject) return;
    contactEmail = nextEmail;
    subject = nextSubject;
    crmData = undefined;
    if (panel) {
      renderPanel();
      void loadCrmContext();
    }
  }

  function findConversationEmail() {
    const candidates = [...document.querySelectorAll("[email]")]
      .filter((element) => element.offsetParent !== null)
      .map((element) => element.getAttribute("email")?.trim().toLowerCase())
      .filter((email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    return candidates[0] || "";
  }

  function findSubject() {
    const heading = [...document.querySelectorAll("h2")]
      .find((element) => element.offsetParent !== null && element.textContent?.trim());
    return heading?.textContent?.trim() || "";
  }

  function togglePanel() {
    if (panel) {
      panel.remove();
      panel = undefined;
      launcher.classList.remove("active");
      return;
    }
    panel = document.createElement("aside");
    panel.className = "thrive-gmail-panel";
    panel.setAttribute("aria-label", "Thrive OS CRM panel");
    document.body.appendChild(panel);
    launcher.classList.add("active");
    renderPanel();
    void initializePanel();
  }

  function renderPanel() {
    if (!panel) return;
    panel.innerHTML = `
      <header>
        <div class="thrive-gmail-brand"><span>T</span><strong>Thrive OS</strong></div>
        <button type="button" data-close aria-label="Close Thrive OS">×</button>
      </header>
      <main>
        ${
          !connected
            ? `<div class="thrive-gmail-empty">
                 <span>↗</span>
                 <h2>Connect Thrive OS</h2>
                 <p>Sign in securely to show CRM context for Gmail contacts.</p>
                 <button class="thrive-gmail-primary" type="button" data-connect>Connect Thrive OS</button>
               </div>`
            : !contactEmail
              ? `<div class="thrive-gmail-empty">
                   <span>✉</span>
                   <h2>Open a conversation</h2>
                   <p>Thrive will detect the contact from the email currently open in Gmail.</p>
                 </div>`
              : crmLoading
                ? `<div class="thrive-gmail-empty"><span>···</span><h2>Loading CRM context</h2></div>`
                : crmData?.found
                  ? crmContactMarkup(crmData)
                  : `<p class="thrive-gmail-label">NOT IN CRM</p>
                     <h2>${escapeHtml(contactEmail)}</h2>
                     <p class="thrive-gmail-subject">${escapeHtml(subject || "Gmail conversation")}</p>
                     <a class="thrive-gmail-primary" href="${APP_URL}/companies/new?email=${encodeURIComponent(contactEmail)}" target="_blank" rel="noreferrer">Add to Thrive OS</a>`
        }
      </main>
      <footer>
        <a href="${APP_URL}/settings/connections" target="_blank" rel="noreferrer">Gmail connection settings</a>
        <small>Thrive never sends an email without your confirmation.</small>
      </footer>
    `;
    panel.querySelector("[data-close]")?.addEventListener("click", togglePanel);
    panel.querySelector("[data-connect]")?.addEventListener("click", connect);
  }

  async function initializePanel() {
    const status = await chrome.runtime.sendMessage({ type: "AUTH_STATUS" });
    connected = Boolean(status?.connected);
    renderPanel();
    if (connected) await loadCrmContext();
  }

  async function connect() {
    const result = await chrome.runtime.sendMessage({ type: "CONNECT" });
    connected = Boolean(result?.connected);
    renderPanel();
    if (connected) await loadCrmContext();
  }

  async function loadCrmContext() {
    if (!connected || !contactEmail) return;
    crmLoading = true;
    renderPanel();
    const result = await chrome.runtime.sendMessage({
      type: "GET_CONTEXT",
      email: contactEmail
    });
    connected = Boolean(result?.connected);
    crmData = result?.data;
    crmLoading = false;
    renderPanel();
  }

  function crmContactMarkup(data) {
    const companyLink = data.company
      ? `${APP_URL}/companies/${encodeURIComponent(data.company.id)}`
      : `${APP_URL}/companies?q=${encodeURIComponent(data.contact.email)}`;
    return `<p class="thrive-gmail-label">CRM CONTACT</p>
      <h2>${escapeHtml(data.contact.name)}</h2>
      <p class="thrive-gmail-subject">${escapeHtml(
        [data.contact.jobTitle, data.company?.name].filter(Boolean).join(" · ") ||
          data.contact.email
      )}</p>
      <section class="thrive-gmail-context">
        <div><span>Owner</span><strong>${escapeHtml(data.contact.owner || "Unassigned")}</strong></div>
        <div><span>Deal</span><strong>${escapeHtml(data.deal?.name || "No active deal")}</strong></div>
        <div><span>Stage</span><strong>${escapeHtml(data.deal?.stage || "—")}</strong></div>
        <div><span>Next step</span><strong>${escapeHtml(data.deal?.nextStep || "Not set")}</strong></div>
      </section>
      <a class="thrive-gmail-primary" href="${companyLink}" target="_blank" rel="noreferrer">Open CRM record</a>`;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }
})();
