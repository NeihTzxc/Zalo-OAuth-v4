require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

const {
  FB_APP_ID,
  FB_APP_SECRET,
  REDIRECT_URI,
  PORT
} = process.env;

const GRAPH_VERSION = "v19.0";
const REQUIRED_SCOPES = [
  "pages_show_list"
].join(",");

/**
 * STEP 1: Redirect user → Facebook login
 */
app.get("/login", (req, res) => {
  if (!FB_APP_ID || !REDIRECT_URI) {
    return res.status(500).json({
      message: "Missing FB_APP_ID or REDIRECT_URI in .env"
    });
  }

  const fbUrl = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${REQUIRED_SCOPES}`;

  res.redirect(fbUrl);
});

/**
 * STEP 2: Callback → exchange code for user access token
 */
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  console.log("QUERY:", req.query);  
  if (!code) {
    return res.status(400).json({
      message: "Missing code from Facebook callback"
    });
  }

  try {
    const tokenRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
      {
        params: {
          client_id: FB_APP_ID,
          redirect_uri: REDIRECT_URI,
          client_secret: FB_APP_SECRET,
          code
        }
      }
    );

    const userAccessToken = tokenRes.data.access_token;

    console.log("USER TOKEN:", userAccessToken);

    const pageRes = await axios.get(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`,
      {
        params: {
          access_token: userAccessToken
        }
      }
    );

    const pages = pageRes.data.data || [];

    console.log("PAGES:", pages);

    res.json({
      message: "Success",
      pages
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      message: "Error getting Facebook page access token",
      error: err.response?.data || err.message
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Facebook Page Access Token demo",
    login_url: "/login"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
