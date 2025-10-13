import React, { useState, useRef, useEffect, use } from 'react'
import axios from "axios";
import './App.css'
import playing_img from './assets/playing-img.png'
import search_icon from './assets/search-icon.png'
import play_btn from './assets/play-buttton.png';
import pause_btn from './assets/pause.png';
import next_btn from './assets/next-button.png';
import previous_btn from './assets/previous.png'
import shuffel_btn from './assets/shuffle.png'
import shuffelOff_btn from './assets/shuffle-off.png'
import playlist_btn from './assets/playlist.png'
import repeateOff_btn from './assets/repeateoff.png'
import repeateAll_btn from './assets/repeateall.png'
import repeateOne_btn from './assets/repeateone.png'
import close_btn from './assets/close.png'
import volume_icon from './assets/volume-up.png'

function App() {
  [
  ];
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [songDuration, setSongDuration] = useState("00:00");
  const [currentTime, setCurrentTime] = useState("00:00");
  const [repeatMode, setRepeatMode] = useState("");
  const [playlistVisible, setPlaylistVisible] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [shuffle, setShuffle] = useState(true);
  const [playlist, setPlaylist] = useState([]);

  const handlePlayPause = () => {
    if (!currentSong) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }
  const handleNextsong = () => {
    if (!playlist.length) return;
    if (!currentSong) return;
    if(audioRef.current){
      audioRef.current.pause();
      setPlaying(false);
    }
    const currentIndex = playlist.findIndex(song => song._id === currentSong._id);
    let nextIndex;
    if (!shuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    }
    else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    const nextsong = playlist[nextIndex];
    playsong(nextsong._id);
  }
  const handlePrevioussong = () => {
    if(audioRef.current){
      audioRef.current.pause();
      setPlaying(false);
    }
    const currentIndex = playlist.findIndex((song) => song._id === currentSong._id);
    const previousIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    const previousSong = playlist[previousIndex];
    playsong(previousSong._id)
  }
  const handleShuffleBtn = () => {
    setShuffle(!shuffle);

  }
  const handleTimeUpdate = () => {
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration;

    if (!duration || isNaN(duration)) return;
    setCurrentTime(formatTime(current));
    setProgress((current / duration) * 100);

  }
  const handleProgressChange = (e) => {
    const value = e.target.value;
    const song_duration = audioRef.current.duration;
    audioRef.current.currentTime = (value / 100) * song_duration;
    setProgress(value);
  }
  const handlerepeatModeChange = () => {
    if (repeatMode === "off") {
      setRepeatMode("one");
      audioRef.current.loop = true;
    } else if (repeatMode === "one") {
      setRepeatMode("all");
      audioRef.current.loop = false;
    } else {
      setRepeatMode("off");
      audioRef.current.loop = false;
    }
  }
  useEffect(() => {
    const handlekeydown = (e) => {
      if (e.key === 'Space' || e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener("keydown", handlekeydown);
    return () => {
      window.removeEventListener("keydown", handlekeydown);
    };
  }, [playing, currentSong]);
  const playsong = (_id) => {
    const url = `/stream/${_id}`

    setCurrentSong({ url, _id });
    setProgress(0);
    if(audioRef.current){
      audioRef.current.pause();
    }
    audioRef.current.src = url;
    audioRef.current.load();
    audioRef.current.oncanplay=()=>{
      setPlaying(true);
      audioRef.current.play()
        .catch(err=>console.log("play Interrepted",err)
        );
    }
  }
  const handleLoadedMetadata = () => {
    const duration = audioRef.current.duration;
    setSongDuration(formatTime(duration));
  };
  const formatTime = (time) => {
    if (!time || isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  };
  useEffect(() => {
    if (playlist.length > 0 && !currentSong) {
      const firstSong = playlist[Math.floor(Math.random() * playlist.length)];
      if(!playing)
      playsong(firstSong._id);
    }
  }, [playlist, currentSong]);

  useEffect(() => {
    axios.get("https://paadalbox.onrender.com/playlist")
      .then(res => {
        setPlaylist(res.data);
        console.log("song Fetched", res.data)
        // console.log(playlist);

      })
      .catch(error => console.error("Error Fetching playlist", error)
      );
  }, []);

  return (
    <>
      <div className='App' >
        <div className="logo">
          <h1>Paadal<span>box</span></h1>
          <button className='playlist-btn' onClick={()=>setPlaylistVisible(!playlistVisible)}>
            <img src={playlistVisible ? close_btn : playlist_btn} alt="" />
          </button>
        </div>
        {currentSong && <div className="song-details">
          <p>{playlist.find(song => song._id === currentSong._id)?.name || "Now Playing..."}</p>

        </div>}
        {playlistVisible && (<div className="playlist">
          <div className="searchbar">
          <input type="text" placeholder='Search for songs, artists, albums...' />
          <button>
            <img src={search_icon}
              className='search-icon' />
          </button>
        </div>
          <ul>
            {playlist.map((song, index) => (
              <li onClick={() => playsong(song._id)} key={index}>
                {song.name}
              </li>
            ))}
          </ul>
        </div>)}
        
        <div className="playing-img">
          <img src={playing_img} className={`img ${playing ? "spin" : ""}`} />
        </div>
        
        <audio type="audio/mp3" 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata} 
        onEnded={handleNextsong}> 
          
        </audio>
        <div className="progress-bar">
          <input type="range" min="0" max="100" value={progress} onChange={handleProgressChange} />
        </div>
        <div className='time-stamps'>
          <span>{currentTime}</span>
          <span>{songDuration}</span>
        </div>
        <div className='btn-container'>
          <button onClick={handleShuffleBtn}>
            <img src={shuffle ? shuffelOff_btn : shuffel_btn} />
          </button>
          <button onClick={handlePrevioussong}>
            <img src={previous_btn} />
          </button>
          <button onClick={handlePlayPause}>
            {playing ? <img src={pause_btn} /> : <img src={play_btn} />}
          </button>
          <button onClick={handleNextsong}>
            <img src={next_btn} />
          </button>
          <button onClick={handlerepeatModeChange}>
            <img src={repeatMode === "off" ? repeateOff_btn : repeatMode === "one" ? repeateOne_btn : repeateAll_btn}
              alt="" />
          </button>
        </div>
      </div>
    </>
  )
}

export default App
