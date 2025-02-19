const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

app.get('/login', (req, res) => {
  const scope = 'user-library-read user-read-private user-read-email playlist-read-private playlist-read-collaborative';
  const state = Math.random().toString(36).substring(7);  // Random state parameter
  const url = `https://accounts.spotify.com/authorize?` + querystring.stringify({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state
  });
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code; 

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const tokenData = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  };

  const tokenHeaders = {
    'Authorization': 'Basic ' + new Buffer(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  try {
    // Exchange the authorization code for an access token
    const response = await axios.post(tokenUrl, querystring.stringify(tokenData), { headers: tokenHeaders });
    const { access_token, refresh_token } = response.data;

    const clientUrl = process.env.CLIENT_URL || 'https://melodio.onrender.com'; // Update this with your React app's URL
    res.redirect(`${clientUrl}?access_token=${access_token}`);
  } catch (error) {
    console.error('Error exchanging code for access token', error);
    res.status(400).send('Error exchanging code for access token');
  }
});

// start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
