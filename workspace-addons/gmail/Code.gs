var THRIVE_APP_URL = "https://app.thrivedev.co";

function onHomepage() {
  var token = getThriveToken();
  if (!token) return buildConnectionCard();
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Thrive OS").setSubtitle("Connected"))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("Open a Gmail conversation to see its CRM contact, company, deal and next step."))
      .addWidget(CardService.newTextButton()
        .setText("Open Thrive OS")
        .setOpenLink(CardService.newOpenLink().setUrl(THRIVE_APP_URL + "/dashboard"))))
    .build();
}

function onGmailMessage(e) {
  if (!getThriveToken()) return buildConnectionCard();
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    var message = GmailApp.getMessageById(e.gmail.messageId);
    var email = extractEmail(message.getFrom());
    if (!email) return buildInfoCard("Contact not detected", "Thrive could not identify an email address in this message.");
    var context = fetchCrmContext(email);
    if (!context.found) return buildUnknownContactCard(email);
    return buildCrmCard(context);
  } catch (error) {
    return buildInfoCard("Unable to load CRM context", "Reconnect Thrive OS or try opening the message again.");
  }
}

function onGmailCompose() {
  if (!getThriveToken()) return buildConnectionCard();
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Thrive AI").setSubtitle("Sales-aware email assistant"))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("AI reply generation will use the recipient, CRM relationship, deal stage and next step. It will only insert a draft and never send automatically."))
      .addWidget(CardService.newTextButton()
        .setText("Open CRM context")
        .setOpenLink(CardService.newOpenLink().setUrl(THRIVE_APP_URL + "/companies"))))
    .build();
}

function saveConnectionToken(e) {
  var token = String(e.commonEventObject.formInputs.token.stringInputs.value[0] || "").trim();
  if (token.length < 40) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("The connection token is invalid."))
      .build();
  }
  PropertiesService.getUserProperties().setProperty("THRIVE_TOKEN", token);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(onHomepage()))
    .setNotification(CardService.newNotification().setText("Thrive OS connected."))
    .build();
}

function disconnectThrive() {
  PropertiesService.getUserProperties().deleteProperty("THRIVE_TOKEN");
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildConnectionCard()))
    .build();
}

function buildConnectionCard() {
  var saveAction = CardService.newAction().setFunctionName("saveConnectionToken");
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Connect Thrive OS").setSubtitle("One secure connection per user"))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("Generate a token in Thrive OS, then paste it below."))
      .addWidget(CardService.newTextButton()
        .setText("Generate connection token")
        .setOpenLink(CardService.newOpenLink().setUrl(THRIVE_APP_URL + "/api/extensions/workspace/connect")))
      .addWidget(CardService.newTextInput().setFieldName("token").setTitle("Connection token"))
      .addWidget(CardService.newTextButton().setText("Connect").setOnClickAction(saveAction)))
    .build();
}

function buildCrmCard(data) {
  var contact = data.contact;
  var company = data.company;
  var deal = data.deal;
  var section = CardService.newCardSection()
    .addWidget(keyValue("Email", contact.email))
    .addWidget(keyValue("Company", company ? company.name : "No company"))
    .addWidget(keyValue("Owner", contact.owner || "Unassigned"))
    .addWidget(keyValue("Deal", deal ? deal.name : "No active deal"))
    .addWidget(keyValue("Stage", deal ? deal.stage : "—"))
    .addWidget(keyValue("Next step", deal && deal.nextStep ? deal.nextStep : "Not set"));
  if (company) {
    section.addWidget(CardService.newTextButton()
      .setText("Open CRM record")
      .setOpenLink(CardService.newOpenLink().setUrl(THRIVE_APP_URL + "/companies/" + encodeURIComponent(company.id))));
  }
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(contact.name).setSubtitle(contact.jobTitle || "CRM contact"))
    .addSection(section)
    .build();
}

function buildUnknownContactCard(email) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Not in CRM").setSubtitle(email))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("This sender does not exist in Thrive OS yet."))
      .addWidget(CardService.newTextButton()
        .setText("Add to Thrive OS")
        .setOpenLink(CardService.newOpenLink().setUrl(THRIVE_APP_URL + "/companies/new?email=" + encodeURIComponent(email)))))
    .build();
}

function buildInfoCard(title, message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(title))
    .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(message)))
    .build();
}

function fetchCrmContext(email) {
  var response = UrlFetchApp.fetch(
    THRIVE_APP_URL + "/api/extensions/gmail/context?email=" + encodeURIComponent(email),
    {
      method: "get",
      headers: { Authorization: "Bearer " + getThriveToken() },
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() === 401) {
    PropertiesService.getUserProperties().deleteProperty("THRIVE_TOKEN");
    throw new Error("Unauthorized");
  }
  if (response.getResponseCode() !== 200) throw new Error("CRM request failed");
  return JSON.parse(response.getContentText());
}

function getThriveToken() {
  return PropertiesService.getUserProperties().getProperty("THRIVE_TOKEN");
}

function extractEmail(value) {
  var match = String(value || "").match(/<([^>]+)>/) || String(value || "").match(/[^\s<>]+@[^\s<>]+/);
  return match ? String(match[1] || match[0]).trim().toLowerCase() : "";
}

function keyValue(label, value) {
  return CardService.newDecoratedText().setTopLabel(label).setText(String(value || "—"));
}
