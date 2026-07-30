const searchInput = document.getElementById("searchInput");
const searchQuery = document.getElementById("searchQuery");
const results = document.getElementById("results");
const audio = document.getElementById("audio");
const playerLoader = document.getElementById("playerLoader");
const playBtn = document.getElementById("playBtn");
const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const volume = document.getElementById("volume");
const fullPlayer = document.getElementById("fullPlayer");
const closePlayer = document.getElementById("closePlayer");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const fullPlay = document.getElementById("fullPlay");
const fullProgress = document.getElementById("fullProgress");
const fullCurrent = document.getElementById("fullCurrent");
const fullDuration = document.getElementById("fullDuration");
const fullNextBtn = document.getElementById("fullNextBtn");
const fullPrevBtn = document.getElementById("fullPrevBtn");
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileResults = document.getElementById("mobileResults");
const searchResultsLabel = document.getElementById("searchResultsLabel");
const videoModal = document.getElementById("videoModal");
const videoPlayer = document.getElementById("videoPlayer");
const closeVideo = document.getElementById("closeVideo");
const videoAudio = document.getElementById("videoAudio");
let _syncAttached = false;
let _syncListeners = {};
let _rateResetTimer = null;
let timer;
let mobileTimer;

searchInput.addEventListener("input", () => {
  handleSearchInput(searchInput, results, "searchQuery", "home");
});

mobileSearchInput.addEventListener("input", () => {
  handleSearchInput(mobileSearchInput, mobileResults, "mobileSearchLabel", "home");
});

playBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    updatePlayButtons(true);
  } else {
    audio.pause();
    updatePlayButtons(false);
  }
};

function updateAudioProgress() {
  if (!audio || !duration) return;
  if (!audio.duration || isNaN(audio.duration)) return;

  const percent = (audio.currentTime / audio.duration) * 100;
  progress.value = percent;
  fullProgress.value = percent;
  currentTime.innerHTML = formatTime(audio.currentTime);
  fullCurrent.innerText = formatTime(audio.currentTime);
}

audio.addEventListener("loadedmetadata", () => {
  duration.innerHTML = formatTime(audio.duration);
  progress.value = 0;
  fullProgress.value = 0;
  updateAudioProgress();
});

audio.addEventListener("durationchange", () => {
  duration.innerHTML = formatTime(audio.duration);
  updateAudioProgress();
});

audio.addEventListener("timeupdate", updateAudioProgress);

progress.oninput = () => {
  if (!audio.duration || isNaN(audio.duration)) return;
  audio.currentTime = (progress.value / 100) * audio.duration;
};

volume.oninput = () => {
  audio.volume = volume.value;
};

function handleSearchInput(inputElement, resultsContainer, queryId, homeSectionId, options = {}) {
  clearTimeout(timer);
  clearTimeout(mobileTimer);

  const query = inputElement.value.trim();
  const home = document.getElementById(homeSectionId);
  const queryDisplay = document.getElementById(queryId);

  if (!query || query.length < 3) {
    if (resultsContainer) resultsContainer.innerHTML = "";
    if (home) home.style.display = "block";
    if (queryDisplay) queryDisplay.innerText = "";
    mobileResults.hidden = true;
    searchResultsLabel.hidden = true;
    return;
  }

  if (options.resultsLabel) {
    options.resultsLabel.innerText = query;
  } else if (queryDisplay) {
    queryDisplay.innerText = query;
  }

  const executeSearch = async () => {
    if (resultsContainer) {
      renderLoaderCard(resultsContainer, "Searching songs...");
    }
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const songs = await response.json();

    if (resultsContainer === mobileResults) {
      renderSongs(songs, resultsContainer);
    } else {
      renderSongs(songs);
    }

    if (resultsContainer === results || resultsContainer === mobileResults) {
      resultsContainer.classList.remove("loading");
    }

    mobileResults.hidden = false;
    searchResultsLabel.hidden = false;
  };

  if (inputElement === mobileSearchInput) {
    mobileTimer = setTimeout(executeSearch, 500);
  } else {
    timer = setTimeout(executeSearch, 500);
  }

  if (resultsContainer) {
    resultsContainer.classList.add("loading");
  }

  if (home) home.style.display = "none";
}

function attachSyncHandlers() {
  if (!videoPlayer || !videoAudio) return;
  if (_syncAttached) return;
  _syncAttached = true;

  _syncListeners.timeupdate = () => {
    if (!videoPlayer || !videoAudio) return;
    const vt = videoPlayer.currentTime || 0;
    const at = videoAudio.currentTime || 0;
    const diff = at - vt;

    // if very large drift, perform corrective seek
    if (Math.abs(diff) > 0.8) {
      try {
        // seek the lagging media to the leading time
        if (at > vt) videoPlayer.currentTime = at;
        else videoAudio.currentTime = vt;
      } catch (e) {}
      // reset playbackRates
      try { if (videoAudio) videoAudio.playbackRate = 1; } catch (e) {}
      return;
    }

    // for moderate drift apply small playbackRate nudges to audio to catch up/slow down
    if (Math.abs(diff) > 0.05) {
      // adjust audio playbackRate slightly based on diff direction
      // when audio is behind (at < vt) we speed audio up (playbackRate > 1)
      let targetRate = 1 + (-diff) * 0.2; // negative diff => audio behind => positive multiplier
      // clamp
      targetRate = Math.max(0.92, Math.min(1.08, targetRate));
      try { videoAudio.playbackRate = targetRate; } catch (e) {}

      // reset rate back to 1 after a short period
      if (_rateResetTimer) clearTimeout(_rateResetTimer);
      _rateResetTimer = setTimeout(() => {
        try { if (videoAudio) videoAudio.playbackRate = 1; } catch (e) {}
      }, 1200);
    }
  };

  _syncListeners.seeking = () => {
    if (!videoPlayer || !videoAudio) return;
    try { videoAudio.currentTime = videoPlayer.currentTime; } catch (e) {}
  };

  _syncListeners.videoPause = () => { try { videoAudio.pause(); } catch (e) {} };
  _syncListeners.videoPlay = () => { try { videoAudio.play().catch(()=>{}); } catch (e) {} };
  _syncListeners.audioSeeking = () => {
    if (!videoPlayer || !videoAudio) return;
    const t = videoAudio.currentTime;
    if (Math.abs(videoPlayer.currentTime - t) > 0.5) videoPlayer.currentTime = t;
  };

  videoPlayer.addEventListener('timeupdate', _syncListeners.timeupdate);
  videoPlayer.addEventListener('seeking', _syncListeners.seeking);
  videoPlayer.addEventListener('pause', _syncListeners.videoPause);
  videoPlayer.addEventListener('play', _syncListeners.videoPlay);
  videoAudio.addEventListener('seeking', _syncListeners.audioSeeking);
}

function detachSyncHandlers() {
  if (!_syncAttached) return;
  _syncAttached = false;
  try {
    if (_syncListeners.timeupdate) videoPlayer.removeEventListener('timeupdate', _syncListeners.timeupdate);
    if (_syncListeners.seeking) videoPlayer.removeEventListener('seeking', _syncListeners.seeking);
    if (_syncListeners.videoPause) videoPlayer.removeEventListener('pause', _syncListeners.videoPause);
    if (_syncListeners.videoPlay) videoPlayer.removeEventListener('play', _syncListeners.videoPlay);
    if (_syncListeners.audioSeeking) videoAudio.removeEventListener('seeking', _syncListeners.audioSeeking);
  } catch (e) {}
  _syncListeners = {};
  if (_rateResetTimer) clearTimeout(_rateResetTimer);
  _rateResetTimer = null;
  try { if (videoAudio) videoAudio.playbackRate = 1; } catch (e) {}
}

function renderLoaderCard(container, text) {
  if (!container) return;
  container.innerHTML = `
    <div class="loader-card">
      <div class="loader-spinner"></div>
      <p>${text}</p>
    </div>
  `;
}

function renderSongs(songs, container = results) {
  queue = songs;
  container.innerHTML = "";
  songs.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
        <div class="artwork">
            <img src="${song.thumbnail}">
            <div class="play-btn">
                ▶
            </div>
        </div>
        <h3>
            ${song.title}
        </h3>
        <p>
            ${song.uploader}
        </p>`;
    card.onclick = () => {
      const playVideo = confirm("Play video? Press OK for Video, Cancel for Audio.");
      if (playVideo) {
        showVideoPlayer(song);
        return;
      }
      currentIndex = songs.indexOf(song);
      playSong(song);
    };

    container.appendChild(card);
  });
}

function showVideoPlayer(song) {
  if (!videoModal) return;
  document.getElementById("title").innerText = song.title;
  document.getElementById("artist").innerText = song.uploader;

  // Ask server for metadata and available formats; use formats to populate quality selector
  Promise.all([
    fetch(`/stream/video/${song.id}?meta=1`).then(r => r.json()),
    fetch(`/stream/video/formats/${song.id}`).then(r => r.json())
  ]).then(([meta, formatsResp]) => {
    const formats = (formatsResp && formatsResp.formats) || [];
    populateQualitySelect(song.id, formats);

    const data = meta;
    if (data.embed) {
      // create iframe fallback
      let iframe = document.createElement('iframe');
      iframe.src = data.embedUrl;
      iframe.width = '960';
      iframe.height = '540';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.style.maxWidth = '100%';
      iframe.id = 'videoIframe';

      // remove any existing iframe/video
      const existing = document.getElementById('videoIframe');
      if (existing) existing.remove();
      if (videoPlayer) {
        videoPlayer.pause();
        try { videoPlayer.removeAttribute('src'); } catch(e){}
        videoPlayer.load();
        videoPlayer.style.display = 'none';
      }
      // ensure modal is visible
      videoModal.classList.remove('hidden');
      videoModal.classList.add('active');
      videoModal.appendChild(iframe);
    } else {
      // play proxied stream (default format will be selected by populateQualitySelect)
      if (videoPlayer) {
        // remove any existing iframe
        const existing = document.getElementById('videoIframe');
        if (existing) existing.remove();
        videoPlayer.style.display = '';
        videoModal.classList.remove('hidden');
        videoModal.classList.add('active');
      }
    }
  }).catch(err => {
    console.error('failed to fetch video metadata/formats', err);
  });
}

function populateQualitySelect(id, formats) {
  const select = document.getElementById('qualitySelect');
  if (!select) return;
  select.innerHTML = '';

  // Store formats for this id for later lookup
  window._videoFormatsMap = window._videoFormatsMap || {};
  window._videoFormatsMap[id] = formats;

  formats.forEach(f => {
    const label = f.height ? `${f.height}p (${f.ext})` : `${f.note || f.format_id} (${f.ext})`;
    const opt = document.createElement('option');
    opt.value = f.format_id;
    opt.text = label;
    select.appendChild(opt);
  });

  select.onchange = () => {
    const fmt = select.value;
    if (!fmt) return;
    const formatObj = (window._videoFormatsMap[id]||[]).find(x=>x.format_id==fmt || x.format_id==decodeURIComponent(fmt));

    // If chosen format has no audio, also load a best audio track and sync
    const needsSeparateAudio = formatObj && (!formatObj.acodec || formatObj.acodec.toLowerCase()==='none');

    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.src = `/stream/video/format/${id}/${encodeURIComponent(fmt)}`;
      videoPlayer.load();
    }

    if (needsSeparateAudio) {
      // find best audio format
      const audioFmt = (window._videoFormatsMap[id]||[]).find(f => !f.vcodec || f.vcodec.toLowerCase()==='none' || (f.height==null && f.acodec && f.acodec.toLowerCase()!=='none'));
      const audioFormatId = audioFmt ? audioFmt.format_id : 'bestaudio';
      if (videoAudio) {
        try { videoAudio.pause(); } catch(e){}
        try { videoAudio.removeAttribute('src'); } catch(e){}
        videoAudio.src = `/stream/video/format/${id}/${encodeURIComponent(audioFormatId)}`;
        try { videoAudio.load(); } catch(e){}
      }

      // reattach sync handlers (detach first to reset state)
      detachSyncHandlers();
      try { if (videoAudio) videoAudio.playbackRate = 1; } catch(e){}
      attachSyncHandlers();

      // start both when ready
      Promise.all([
        videoPlayer ? videoPlayer.play().catch(()=>{}) : Promise.resolve(),
        videoAudio ? videoAudio.play().catch(()=>{}) : Promise.resolve()
      ]).catch(()=>{});
    } else {
      // single-stream playback: ensure audio element is cleared
      // stop and detach any separate audio
      try { if (videoAudio) { videoAudio.pause(); videoAudio.removeAttribute('src'); videoAudio.load(); } } catch(e){}
      detachSyncHandlers();
      // start video
      if (videoPlayer) videoPlayer.play().catch(()=>{});
    }
    const existing = document.getElementById('videoIframe');
    if (existing) existing.remove();
  };

  if (select.options.length) {
    select.selectedIndex = 0;
    select.onchange();
  }
}


function attachSyncHandlers() {
  if (!videoPlayer || !videoAudio) return;
  if (_syncAttached) return;
  _syncAttached = true;

  _syncListeners.timeupdate = () => {
    if (!videoPlayer || !videoAudio) return;
    const vt = videoPlayer.currentTime || 0;
    const at = videoAudio.currentTime || 0;
    const diff = at - vt;

    // if very large drift, perform corrective seek
    if (Math.abs(diff) > 0.8) {
      try {
        if (at > vt) videoPlayer.currentTime = at;
        else videoAudio.currentTime = vt;
      } catch (e) {}
      try { if (videoAudio) videoAudio.playbackRate = 1; } catch (e) {}
      return;
    }

    // moderate drift: nudge audio playbackRate
    if (Math.abs(diff) > 0.05) {
      let targetRate = 1 + (-diff) * 0.2;
      targetRate = Math.max(0.92, Math.min(1.08, targetRate));
      try { videoAudio.playbackRate = targetRate; } catch (e) {}

      if (_rateResetTimer) clearTimeout(_rateResetTimer);
      _rateResetTimer = setTimeout(() => {
        try { if (videoAudio) videoAudio.playbackRate = 1; } catch (e) {}
      }, 1200);
    }
  };

  _syncListeners.seeking = () => {
    if (!videoPlayer || !videoAudio) return;
    try { videoAudio.currentTime = videoPlayer.currentTime; } catch (e) {}
  };

  _syncListeners.videoPause = () => { try { videoAudio.pause(); } catch (e) {} };
  _syncListeners.videoPlay = () => { try { videoAudio.play().catch(()=>{}); } catch (e) {} };

  _syncListeners.audioSeeking = () => {
    if (!videoPlayer || !videoAudio) return;
    const t = videoAudio.currentTime;
    if (Math.abs(videoPlayer.currentTime - t) > 0.5) videoPlayer.currentTime = t;
  };

  videoPlayer.addEventListener('timeupdate', _syncListeners.timeupdate);
  videoPlayer.addEventListener('seeking', _syncListeners.seeking);
  videoPlayer.addEventListener('pause', _syncListeners.videoPause);
  videoPlayer.addEventListener('play', _syncListeners.videoPlay);
  videoAudio.addEventListener('seeking', _syncListeners.audioSeeking);
}

function detachSyncHandlers() {
  if (!_syncAttached) return;
  _syncAttached = false;
  try {
    if (_syncListeners.timeupdate) videoPlayer.removeEventListener('timeupdate', _syncListeners.timeupdate);
    if (_syncListeners.seeking) videoPlayer.removeEventListener('seeking', _syncListeners.seeking);
    if (_syncListeners.videoPause) videoPlayer.removeEventListener('pause', _syncListeners.videoPause);
    if (_syncListeners.videoPlay) videoPlayer.removeEventListener('play', _syncListeners.videoPlay);
    if (_syncListeners.audioSeeking) videoAudio.removeEventListener('seeking', _syncListeners.audioSeeking);
  } catch (e) {}
  _syncListeners = {};
  if (_rateResetTimer) clearTimeout(_rateResetTimer);
  _rateResetTimer = null;
  try { if (videoAudio) videoAudio.playbackRate = 1; } catch (e) {}
}

if (closeVideo) {
  closeVideo.onclick = () => {
    if (videoPlayer) {
      videoPlayer.pause();
      try { videoPlayer.removeAttribute('src'); } catch(e) {}
      videoPlayer.load();
    }
    // remove iframe if any
    const existing = document.getElementById('videoIframe');
    if (existing) existing.remove();
    // stop and clear separate audio and detach sync handlers
    try { if (videoAudio) { videoAudio.pause(); videoAudio.removeAttribute('src'); videoAudio.load(); } } catch(e) {}
    detachSyncHandlers();

    if (videoModal) {
      videoModal.classList.remove('active');
      videoModal.classList.add('hidden');
    }
  };
}

async function playSong(song) {
  currentSong = song;
  currentIndex = queue.findIndex(
    item => item.id === song.id
  );
  // Immediately update UI so user sees song details while stream loads
  document.getElementById("title").innerText = song.title;
  document.getElementById("artist").innerText = song.uploader;
  document.getElementById("cover").src = song.thumbnail;
  document.getElementById("fullCover").src = song.thumbnail;
  document.getElementById("fullTitle").innerText = song.title;
  document.getElementById("fullArtist").innerText = song.uploader;
  document.getElementById("backgroundArt").style.backgroundImage = `url(${song.thumbnail})`;

  const player = document.querySelector(".player");
  if (player) {
    player.classList.add("active");
  }

  // show loader until playback actually starts
  showPlayerLoader(true);

  try {
    const response = await fetch(`/stream/${song.id}`);
    const data = await response.json();

    audio.src = data.url;
    await audio.play();
    updatePlayButtons(true);
  } catch (err) {
    console.error("Failed to load/ play stream:", err);
    showPlayerLoader(false);
  }

  await loadRelatedSongsQueue();
  renderQueue();
}

document.querySelector(".player").onclick = (e) => {
  if (
    e.target.closest("button") ||
    e.target.tagName === "INPUT" ||
    e.target.tagName === "AUDIO"
  ) {
    return;
  }
  fullPlayer.classList.add("active");
};

closePlayer.onclick = () => {
  fullPlayer.classList.remove("active");
};

fullPlay.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
    fullPlay.innerHTML = "⏸";
  }
  else {
    audio.pause();
    fullPlay.innerHTML = "▶";
  }
});

fullProgress.addEventListener("input", () => {
  const time = (fullProgress.value / 100) * audio.duration;
  audio.currentTime = time;
});

audio.addEventListener("play", () => {
  fullPlay.innerHTML = "⏸";
  showPlayerLoader(false);
});

audio.addEventListener("pause", () => {
  fullPlay.innerHTML = "▶";
});

function updatePlayButtons(state) {
  const icon = state ? "⏸" : "▶";
  document.getElementById("playBtn").innerHTML = icon;
  document.getElementById("fullPlay").innerHTML = icon;
}

function showPlayerLoader(visible) {
  if (!playerLoader) return;
  playerLoader.classList.toggle("visible", visible);
  playerLoader.classList.toggle("hidden", !visible);
}

function playQueueSong(index) {
  if (index < 0) return;
  if (index >= queue.length) return;

  currentIndex = index;
  const song = queue[currentIndex];
  playSong(song);
}

function nextSong() {
  if (currentIndex + 1 < queue.length) {
    playQueueSong(currentIndex + 1);
  }
}

function previousSong() {
  if (currentIndex > 0) {
    playQueueSong(currentIndex - 1);
  }
}

nextBtn.onclick = nextSong;
prevBtn.onclick = previousSong;
fullNextBtn.onclick = nextSong;
fullPrevBtn.onclick = previousSong;

audio.addEventListener("ended", async () => {
  if (currentIndex + 1 < queue.length) {
    playQueueSong(currentIndex + 1);
    return;
  }
  await loadRelatedSongs();
});

async function loadRelatedSongs() {
  if (!currentSong) return;

  console.log("Finding related songs for:", currentSong.title);

  const response = await fetch(`/api/search?q=${encodeURIComponent(currentSong.uploader)}`);
  const songs = await response.json();

  if (!songs.length) return;

  queue = queue.concat(songs);
  currentIndex++;
  playQueueSong(currentIndex);
}

async function loadRelatedSongsQueue() {
  if (!currentSong) return;

  console.log("Finding related songs for:", `${encodeURIComponent(currentSong.uploader)} more songs`);

  const response = await fetch(`/api/search?q=${encodeURIComponent(currentSong.uploader)} songs`);
  const songs = await response.json();

  if (!songs.length) return;

  queue = queue.concat(songs);
}

function renderQueue() {
  const list = document.getElementById("queueList");
  list.innerHTML = "";

  queue.forEach((song, index) => {
    if (index <= currentIndex) return;

    const item = document.createElement("div");
    item.className = "queue-item";
    item.innerHTML = `
      <img src="${song.thumbnail}">
      <div>
        <b>${song.title}</b>
        <br>
        <small>${song.uploader}</small>
      </div>
    `;

    item.onclick = () => {
      playQueueSong(index);
    };

    list.appendChild(item);
  });
}

// Home Page Logic
async function loadHome() {
  const trendingContainer = document.getElementById("trending");
  const recommendedContainer = document.getElementById("recommended");

  // show skeletons while loading
  renderSkeletons(trendingContainer, 6);
  renderSkeletons(recommendedContainer, 6);

  const response = await fetch("/api/home");
  const data = await response.json();

  renderHomeSongs(data.trending, "trending");
  renderHomeSongs(data.recommended, "recommended");
}

function renderSkeletons(container, count = 6) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'song-card skeleton-card';
    card.innerHTML = `
      <div class="artwork"></div>
      <div class="skeleton-line title"></div>
      <div class="skeleton-line subtitle"></div>
    `;
    container.appendChild(card);
  }
}

function renderHomeSongs(songs, sectionId) {
  const container = document.getElementById(sectionId);
  if (!container) return;

  container.innerHTML = "";

  songs.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
      <div class="artwork">
        <img src="${song.thumbnail}">
        <div class="play-btn">▶</div>
      </div>
      <h3>${song.title}</h3>
      <p>${song.uploader}</p>
    `;

    card.onclick = () => {
      const playVideo = confirm("Play video? Press OK for Video, Cancel for Audio.");
      if (playVideo) {
        showVideoPlayer(song);
        return;
      }
      queue = songs;
      currentIndex = songs.indexOf(song);
      playSong(song);
    };

    container.appendChild(card);
  });
}

loadHome();

const mobileSearch = document.getElementById("mobileSearch");
const mobileHome = document.getElementById("mobileHome");
const mobileOverlay = document.getElementById("mobileSearchOverlay");
const closeSearch = document.getElementById("closeSearch");

mobileSearch.onclick = () => {
  mobileOverlay.classList.add("active");
};

mobileHome.onclick = () => {
  mobileOverlay.classList.remove("active");
  const home = document.getElementById("home");
  if (home) home.style.display = "block";
};

closeSearch.onclick = () => {
  mobileOverlay.classList.remove("active");
  const home = document.getElementById("home");
  if (home) home.style.display = "block";
};