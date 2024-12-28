import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [artistName, setArtistName] = useState('');
  const [currentArtistName, setCurrentArtistName] = useState(''); // For displaying the current artist
  const [songName, setSongName] = useState('');
  const [randomSong, setRandomSong] = useState(null);
  const [songPlays, setSongPlays] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const [guessedSongs, setGuessedSongs] = useState([]); // To track guessed songs
  const spotifyAPIRef = useRef(null);
  const controllerRef = useRef(null);
  const iframeScriptLoaded = useRef(false);
  const embedIframeRef = useRef(null);

  const login = () => {
    window.location.href = 'http://localhost:10000/login';
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('access_token');
    if (token) {
      setAccessToken(token);
    }
  }, []); // Obtain access token after callback 

  const searchArtist = async () => {
    if (!artistName) return;
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
    try {
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      const artist = data.artists.items[0];
      if (artist) {
        console.log('Artist found:', artist.name);
        setCurrentArtistName(artist.name); // Update the current artist
        getTopTracks(artist.id);
      } else {
        console.log('Artist not found');
      }
    } catch (error) {
      console.error('Error searching for artist:', error);
    }
  };

  const getTopTracks = async (artistId) => {
    const url = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      const tracks = data.tracks;

      if (tracks.length === 0) {
        console.log('No top tracks found');
        return;
      }

      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      console.log('Randomly selected track:', randomTrack.name);

      setRandomSong(randomTrack);
      setEmbedUrl(`spotify:track:${randomTrack.id}`);
      setSongPlays((prev) => prev + 1);
    } catch (error) {
      console.error('Error fetching top tracks:', error);
    }
  };

  const checkSongName = () => {
    if (!randomSong) {
      return 'No song found yet. Please search for an artist first!';
    }
    const correctSong = randomSong.name.toLowerCase();
    const enteredSong = songName.toLowerCase();
    if (correctSong === enteredSong) {
      setSongName('');
      setCorrectGuesses((prev) => prev + 1);

      // Add guessed song and artist to the list
      setGuessedSongs((prev) => [
        ...prev,
        { song: randomSong.name, artist: randomSong.artists[0].name },
      ]);

      getAnotherSong();
    } else if (enteredSong) {
      return 'wrong';
    }
  };

  const getAnotherSong = () => {
    if (randomSong) {
      getTopTracks(randomSong.artists[0].id);
    }
  };

  useEffect(() => {
    if (!embedUrl) return;

    // Load the iframe API script only once
    if (!iframeScriptLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.onload = () => {
        iframeScriptLoaded.current = true;
        window.onSpotifyIframeApiReady = (IFrameAPI) => {
          spotifyAPIRef.current = IFrameAPI;
          createEmbedController(IFrameAPI);
        };
      };
      document.body.appendChild(script);
    } else if (spotifyAPIRef.current && !controllerRef.current) {
      // If API is loaded and controller is not yet created, initialize it
      createEmbedController(spotifyAPIRef.current);
    } else if (controllerRef.current) {
      // Update the embed URL for an existing controller
      updateEmbedUri(controllerRef.current, embedUrl);
    }
  }, [embedUrl]);

  const createEmbedController = (IFrameAPI) => {
    const iframeContainer = embedIframeRef.current;
    if (!iframeContainer) {
      console.error('Embed container is missing or not mounted.');
      return;
    }

    iframeContainer.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = `https://open.spotify.com/embed/track/${embedUrl.split(':')[2]}`;
    iframe.width = '100%';
    iframe.height = '380';
    iframe.frameBorder = '0';
    iframe.allow =
      'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframeContainer.appendChild(iframe);

    const options = {
      width: '0',
      height: '0',
      uri: embedUrl,
    };

    const callback = (EmbedController) => {
      if (!EmbedController) {
        console.error('Failed to create EmbedController.');
        return;
      }
      controllerRef.current = EmbedController;
      EmbedController.play();
    };

    IFrameAPI.createController(iframeContainer, options, callback);
  };

  const updateEmbedUri = (controller, newUri) => {
    controller.loadUri(newUri);
    controller.play();
  };

  return (
    <div className="root">
      {!accessToken ? (
        <div>
          <h1>melodio</h1>
          <button onClick={login}>login with Spotify</button>
        </div>
      ) : (
        <div>
          <h1>melodio</h1>

          <div>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="artist name"
            />
            <button onClick={searchArtist}>test me</button>
          </div>

          {randomSong && (
            <div>
              <h3>target artist: {currentArtistName}</h3>
              <h2>what song?</h2>
              <input
                type="text"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                placeholder="song name"
              />
              <p>{checkSongName()}</p>
              <button onClick={getAnotherSong}>get another song</button>
            </div>
          )}

          <div ref={embedIframeRef} id="embed-iframe-container"></div>

          <div>
            <p>total plays: {songPlays}</p>
            <p>correct guesses: {correctGuesses}</p>
          </div>

          <div>
            <h3>previously guessed songs:</h3>
            <ul>
              {guessedSongs.map((guess, index) => (
                <li key={index}>
                  {guess.song} - {guess.artist}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
