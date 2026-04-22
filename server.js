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

/**
 * STEP 1: Redirect user → Zalo login
 */
app.get("/zalo/auth", (req, res) => {
  if (!ZALO_APP_ID || !ZALO_REDIRECT_URI) {
    return res.status(500).json({
      message: "Missing ZALO_APP_ID or ZALO_REDIRECT_URI in .env"
    });
  }

  res.redirect(getZaloAuthUrl());
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

app.get("/", (req, res) => {
  res.json({
    message: "Zalo OAuth access token demo",
    auth_url: "/zalo/auth",
    callback_url: "/zalo/callback"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
