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
const fullPlay = document.getElementById("fullPlay");
const fullProgress = document.getElementById("fullProgress");
const fullCurrent = document.getElementById("fullCurrent");
const fullDuration = document.getElementById("fullDuration");
const fullNextBtn = document.getElementById("fullNextBtn");
const fullPrevBtn = document.getElementById("fullPrevBtn");
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileResults = document.getElementById("mobileResults");
const searchResultsLabel = document.getElementById("searchResultsLabel");

let playing = false;
let queue = [];
let currentIndex = -1;
let currentSong = null;
let mobileTimer;

playBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    updatePlayButtons(true);
  } else {
    audio.pause();
    updatePlayButtons(false);
  }
};

audio.addEventListener("loadedmetadata", () => {
  duration.innerHTML = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  progress.value = (audio.currentTime / audio.duration) * 100 || 0;
  currentTime.innerHTML = formatTime(audio.currentTime);
  let percent = (audio.currentTime / audio.duration) * 100;
  fullProgress.value = percent || 0;
  fullCurrent.innerText = formatTime(audio.currentTime);
});

progress.oninput = () => {
  audio.currentTime = (progress.value / 100) * audio.duration;
};

volume.oninput = () => {
  audio.volume = volume.value;
};

function formatTime(seconds) {
  if (!seconds) return "0:00";
  let min = Math.floor(seconds / 60);
  let sec = Math.floor(seconds % 60);
  if (sec < 10) sec = "0" + sec;
  return `${min}:${sec}`;
}

let timer;

searchInput.addEventListener("input", () => {
  handleSearchInput(searchInput, results, "searchQuery", "home");
});

mobileSearchInput.addEventListener("input", () => {
  handleSearchInput(mobileSearchInput, mobileResults, "mobileSearchLabel", "home");
});

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
      currentIndex = songs.indexOf(song);
      playSong(song);
    };

    container.appendChild(card);
  });
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

audio.addEventListener("loadedmetadata", () => {
  fullDuration.innerText = formatTime(audio.duration);
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