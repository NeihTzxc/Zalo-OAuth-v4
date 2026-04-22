require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

const {
  ZALO_APP_ID,
  ZALO_APP_SECRET,
  ZALO_REDIRECT_URI,
  PORT
} = process.env;

function getZaloAuthUrl() {
  return `https://oauth.zaloapp.com/v4/permission?app_id=${ZALO_APP_ID}&redirect_uri=${encodeURIComponent(
    ZALO_REDIRECT_URI
  )}`;
}

async function exchangeToken(code) {
  const response = await axios.post(
    "https://oauth.zaloapp.com/v4/access_token",
    null,
    {
      params: {
        app_id: ZALO_APP_ID,
        app_secret: ZALO_APP_SECRET,
        code,
        grant_type: "authorization_code"
      }
    }
  );

  return response.data;
}

function renderTestPage() {
  const hasAppId = Boolean(ZALO_APP_ID);
  const hasAppSecret = Boolean(ZALO_APP_SECRET);
  const hasRedirectUri = Boolean(ZALO_REDIRECT_URI);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zalo OAuth Test</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --card: #ffffff;
        --text: #122033;
        --muted: #5b6b80;
        --border: #d8e0ea;
        --ok-bg: #e8fff1;
        --ok-text: #1f7a45;
        --warn-bg: #fff4e5;
        --warn-text: #9a5b00;
        --button: #0068ff;
        --button-hover: #0056d6;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(180deg, #eef4ff 0%, var(--bg) 100%);
        color: var(--text);
      }

      .wrap {
        max-width: 720px;
        margin: 48px auto;
        padding: 0 20px;
      }

      .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 18px 50px rgba(18, 32, 51, 0.08);
      }

      h1 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 32px;
      }

      p {
        margin-top: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .status {
        display: inline-block;
        padding: 8px 12px;
        border-radius: 999px;
        font-weight: 700;
        margin-bottom: 20px;
      }

      .status.ok {
        background: var(--ok-bg);
        color: var(--ok-text);
      }

      .status.warn {
        background: var(--warn-bg);
        color: var(--warn-text);
      }

      .grid {
        display: grid;
        gap: 12px;
        margin: 20px 0 28px;
      }

      .item {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px 16px;
      }

      .label {
        font-size: 13px;
        color: var(--muted);
        margin-bottom: 6px;
      }

      .value {
        font-weight: 700;
      }

      .value.ok {
        color: var(--ok-text);
      }

      .value.warn {
        color: var(--warn-text);
      }

      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      a.button {
        text-decoration: none;
        background: var(--button);
        color: #fff;
        padding: 12px 18px;
        border-radius: 12px;
        font-weight: 700;
      }

      a.button:hover {
        background: var(--button-hover);
      }

      code {
        background: #f2f5f9;
        padding: 2px 6px;
        border-radius: 6px;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <div class="status ${hasAppId && hasAppSecret && hasRedirectUri ? "ok" : "warn"}">
          ${hasAppId && hasAppSecret && hasRedirectUri ? "Service is running" : "Service is running, config is incomplete"}
        </div>
        <h1>Zalo OAuth Test Page</h1>
        <p>Mo page nay de kiem tra nhanh server da chay hay chua va env Zalo da du de test flow dang nhap chua.</p>

        <div class="grid">
          <div class="item">
            <div class="label">ZALO_APP_ID</div>
            <div class="value ${hasAppId ? "ok" : "warn"}">${hasAppId ? "Configured" : "Missing"}</div>
          </div>
          <div class="item">
            <div class="label">ZALO_APP_SECRET</div>
            <div class="value ${hasAppSecret ? "ok" : "warn"}">${hasAppSecret ? "Configured" : "Missing"}</div>
          </div>
          <div class="item">
            <div class="label">ZALO_REDIRECT_URI</div>
            <div class="value ${hasRedirectUri ? "ok" : "warn"}">${hasRedirectUri || "Missing"}</div>
          </div>
        </div>

        <div class="actions">
          <a class="button" href="/zalo/auth">Test Zalo Login</a>
          <a class="button" href="/">View JSON Home</a>
        </div>

        <p style="margin-top: 20px;">
          Neu page nay mo duoc, service da listen thanh cong tren port <code>${PORT}</code>.
        </p>
      </section>
    </main>
  </body>
</html>`;
}

/**
 * STEP 1: Redirect user → Zalo login
 */
app.get("/zalo/auth", (req, res) => {
  if (!ZALO_APP_ID || !ZALO_REDIRECT_URI) {
    console.log("[ZALO AUTH] Missing config", {
      ZALO_APP_ID,
      ZALO_REDIRECT_URI
    });
    return res.status(500).json({
      message: "Missing ZALO_APP_ID or ZALO_REDIRECT_URI in .env"
    });
  }

  const authUrl = getZaloAuthUrl();

  console.log("[ZALO AUTH] Request received", {
    appId: ZALO_APP_ID,
    redirectUri: ZALO_REDIRECT_URI,
    authUrl
  });

  res.redirect(authUrl);
});

/**
 * STEP 2: Callback → exchange code for access token
 */
app.get("/zalo/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({
      message: "Missing code from Zalo callback"
    });
  }

  try {
    if (!ZALO_APP_SECRET) {
      return res.status(500).json({
        message: "Missing ZALO_APP_SECRET in .env"
      });
    }

    const token = await exchangeToken(code);

    console.log("ZALO CALLBACK QUERY:", req.query);
    console.log("ZALO TOKEN RESPONSE:", token);

    res.json({
      message: "Success",
      ...token
    });
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      message: "Error exchanging Zalo access token",
      error: err.response?.data || err.message
    });
  }
});

app.get("/test", (req, res) => {
  res.type("html").send(renderTestPage());
});

app.get("/", (req, res) => {
  res.json({
    message: "Zalo OAuth access token demo",
    auth_url: "/zalo/auth",
    callback_url: "/zalo/callback",
    test_url: "/test"
  });
});

app.listen(PORT, () => {
  console.log("[BOOT] Zalo config", {
    appId: ZALO_APP_ID,
    redirectUri: ZALO_REDIRECT_URI,
    authUrl: ZALO_APP_ID && ZALO_REDIRECT_URI ? getZaloAuthUrl() : null
  });
  console.log(`Server running at http://localhost:${PORT}`);
});
