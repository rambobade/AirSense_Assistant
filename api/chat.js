const dialogflow = require("@google-cloud/dialogflow");

function cleanPrivateKey(raw) {
  let key = (raw || "").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

const projectId = (process.env.DIALOGFLOW_PROJECT_ID || "").trim();
const clientEmail = (process.env.DIALOGFLOW_CLIENT_EMAIL || "").trim();
const privateKey = cleanPrivateKey(process.env.DIALOGFLOW_PRIVATE_KEY);
const languageCode = process.env.DIALOGFLOW_LANGUAGE_CODE || "en";

let sessionClient = null;

function getSessionClient() {
  if (!sessionClient) {
    sessionClient = new dialogflow.SessionsClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }
  return sessionClient;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!projectId || !clientEmail || !privateKey) {
    res.status(500).json({ error: "Dialogflow credentials are not configured on the server." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      body = {};
    }
  }
  body = body || {};

  const message = (body.message || "").toString().trim();
  if (!message) {
    res.status(400).json({ error: "A message is required." });
    return;
  }

  const sessionId = body.sessionId ? body.sessionId.toString() : "airsense-" + Date.now();

  try {
    const client = getSessionClient();
    const sessionPath = client.projectAgentSessionPath(projectId, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: languageCode,
        },
      },
    };

    const responses = await client.detectIntent(request);
    const queryResult = (responses && responses[0] && responses[0].queryResult) || {};

    res.status(200).json({
      reply: queryResult.fulfillmentText || "Sorry, I didn't get a response for that.",
      intent: queryResult.intent ? queryResult.intent.displayName : null,
    });
  } catch (err) {
    console.error("Dialogflow request failed:", err && err.message ? err.message : err);
    res.status(500).json({
      error: "Could not reach the assistant right now.",
      debug: err && err.message ? err.message : String(err),
      keyBegin: privateKey.startsWith("-----BEGIN PRIVATE KEY-----"),
      keyEnd: privateKey.trim().endsWith("-----END PRIVATE KEY-----"),
      projectId: projectId,
      clientEmail: clientEmail,
    });
  }
};
