(() => {
  if (window.__thriveGmailLoaded) return;
  window.__thriveGmailLoaded = true;

  const APP_URL = "https://app.thrivedev.co";
  let panel;
  let contactEmail = "";
  let subject = "";

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

  let refreshTimer;
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
    if (panel) renderPanel();
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
  }

  function renderPanel() {
    if (!panel) return;
    const query = encodeURIComponent(contactEmail || subject);
    panel.innerHTML = `
      <header>
        <div class="thrive-gmail-brand"><span>T</span><strong>Thrive OS</strong></div>
        <button type="button" data-close aria-label="Close Thrive OS">×</button>
      </header>
      <main>
        ${
          contactEmail
            ? `<p class="thrive-gmail-label">OPEN CONVERSATION</p>
               <h2>${escapeHtml(contactEmail)}</h2>
               <p class="thrive-gmail-subject">${escapeHtml(subject || "Gmail conversation")}</p>
               <a class="thrive-gmail-primary" href="${APP_URL}/companies?q=${query}" target="_blank" rel="noreferrer">Find in Thrive OS</a>
               <a class="thrive-gmail-secondary" href="${APP_URL}/companies/new?email=${encodeURIComponent(contactEmail)}" target="_blank" rel="noreferrer">Add company or contact</a>`
            : `<div class="thrive-gmail-empty">
                 <span>✉</span>
                 <h2>Open a conversation</h2>
                 <p>Thrive will detect the contact from the email currently open in Gmail.</p>
               </div>`
        }
      </main>
      <footer>
        <a href="${APP_URL}/settings/connections" target="_blank" rel="noreferrer">Gmail connection settings</a>
        <small>Thrive never sends an email without your confirmation.</small>
      </footer>
    `;
    panel.querySelector("[data-close]")?.addEventListener("click", togglePanel);
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
