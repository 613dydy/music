const songTitleInput = document.getElementById("song-title");
const songUrlInput = document.getElementById("song-url");
const folderInput = document.getElementById("folder-name");
const saveBtn = document.getElementById("save-btn");
const songList = document.getElementById("song-list");
const folderSelect = document.getElementById("folder-select");
const searchInput = document.getElementById("search");
const playAllBtn = document.getElementById("play-all");
const shuffleBtn = document.getElementById("shuffle-btn");
const repeatBtn = document.getElementById("repeat-btn");
const nowPlaying = document.getElementById("now-playing");
const menuBtn = document.getElementById("menu-btn");
const menuPanel = document.getElementById("menu-panel");
const secretModeToggle = document.getElementById("secret-mode");
const audioPlayer = document.getElementById("audio-player");

let songs = [];
let displaySongs = [];
let currentIndex = 0;
let player;
let isShuffle = false;
let repeatMode = "all";
let secretMode = false; // ✅ 裏モードフラグ

// ✅ YouTube API
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "0",
    width: "0",
    events: { "onStateChange": onPlayerStateChange }
  });
}

// ✅ ハンバーガーメニュー
menuBtn.addEventListener("click", () => {
  menuPanel.classList.toggle("menu-show");
});

// ✅ 裏モードON/OFF
secretModeToggle.addEventListener("change", () => {
  secretMode = secretModeToggle.checked;
  alert(secretMode ? "裏モードON（バックグラウンド再生対応）" : "裏モードOFF");
});

// ✅ 曲保存
saveBtn.addEventListener("click", async () => {
  const title = songTitleInput.value.trim();
  const url = songUrlInput.value.trim();
  const folder = folderInput.value.trim() || "Default";

  if (!title || !url) {
    alert("曲名とURLを入れてくれ！");
    return;
  }

  await db.collection("songs").add({
    title,
    url,
    folder,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  songTitleInput.value = "";
  songUrlInput.value = "";
  folderInput.value = "";
  loadSongs();
});

// ✅ 曲読み込み
async function loadSongs(selectedFolder = "All") {
  songList.innerHTML = "";
  const snapshot = await db.collection("songs").orderBy("createdAt", "desc").get();
  songs = [];
  let folders = new Set(["All"]);

  snapshot.forEach(doc => {
    const data = doc.data();
    songs.push({ id: doc.id, title: data.title, url: data.url, folder: data.folder });
    folders.add(data.folder);
  });

  folderSelect.innerHTML = "";
  folders.forEach(folder => {
    const opt = document.createElement("option");
    opt.value = folder;
    opt.textContent = folder;
    if (folder === selectedFolder) opt.selected = true;
    folderSelect.appendChild(opt);
  });

  renderSongs();
}

// ✅ リスト表示
function renderSongs() {
  const folder = folderSelect.value;
  const search = searchInput.value.toLowerCase();

  displaySongs = songs.filter(song =>
    (folder === "All" || song.folder === folder) &&
    song.title.toLowerCase().includes(search)
  );

  songList.innerHTML = "";
  displaySongs.forEach((song, index) => {
    const videoId = extractVideoId(song.url);
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
      <img src="https://img.youtube.com/vi/${videoId}/default.jpg">
      <span>${song.title}</span>
      <button onclick="deleteSong('${song.id}'); event.stopPropagation();">削除</button>
    `;

    li.addEventListener("click", () => {
      currentIndex = index;
      playSong(displaySongs[currentIndex].url);
    });

    songList.appendChild(li);
  });

  initDragAndDrop();
}

// ✅ 一括再生
playAllBtn.addEventListener("click", () => {
  if (displaySongs.length === 0) {
    alert("曲がないぜブロー！");
    return;
  }
  currentIndex = 0;
  playSong(displaySongs[currentIndex].url);
});

// ✅ 再生処理（バグ修正済み）
function playSong(url) {
  nowPlaying.textContent = "Now Playing: " + displaySongs[currentIndex].title;
  highlightPlaying(currentIndex);

  if (secretMode) {
    // ✅ 裏モード時
    const audioUrl = getAudioStreamUrl(url);
    if (!audioUrl) {
      alert("音声URL取得失敗（裏モードOFFにして試せ）");
      return;
    }

    if (player && player.stopVideo) {
      player.stopVideo(); // ✅ YouTube停止
    }
    document.getElementById("player").classList.add("hidden");

    audioPlayer.classList.remove("hidden");
    audioPlayer.src = audioUrl;
    audioPlayer.play();
  } else {
    // ✅ 通常モード
    audioPlayer.pause(); // ✅ audio完全停止
    audioPlayer.classList.add("hidden");

    document.getElementById("player").classList.remove("hidden");

    const videoId = extractVideoId(url);
    if (!videoId) {
      alert("正しいYouTube URLを入れてくれ！");
      return;
    }
    player.loadVideoById(videoId);
  }
}

// ✅ 裏モード音声URL取得
function getAudioStreamUrl(url) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  return `http://localhost:3000/audio?videoId=${videoId}`; // ✅ Nodeサーバー必須
}

// ✅ 曲終了時
function onPlayerStateChange(event) {
  if (!secretMode && event.data === YT.PlayerState.ENDED) {
    nextSong();
  }
}

audioPlayer.addEventListener("ended", () => {
  if (secretMode) nextSong();
});

function nextSong() {
  if (repeatMode === "one") {
    playSong(displaySongs[currentIndex].url);
  } else {
    currentIndex = isShuffle
      ? Math.floor(Math.random() * displaySongs.length)
      : (currentIndex + 1) % displaySongs.length;
    playSong(displaySongs[currentIndex].url);
  }
}

// ✅ ハイライト
function highlightPlaying(index) {
  document.querySelectorAll("li").forEach((li, i) => {
    li.classList.toggle("playing", i === index);
  });
}

// ✅ 削除
async function deleteSong(id) {
  if (confirm("この曲を削除する？")) {
    await db.collection("songs").doc(id).delete();
    loadSongs(folderSelect.value);
  }
}

// ✅ 検索・フォルダ
searchInput.addEventListener("input", renderSongs);
folderSelect.addEventListener("change", renderSongs);

// ✅ 並べ替え
function initDragAndDrop() {
  const items = document.querySelectorAll("li");
  let draggedIndex = null;

  items.forEach(item => {
    item.addEventListener("dragstart", e => {
      draggedIndex = +item.dataset.index;
      e.dataTransfer.effectAllowed = "move";
    });

    item.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("drop", e => {
      e.preventDefault();
      const targetIndex = +item.dataset.index;
      const [draggedItem] = displaySongs.splice(draggedIndex, 1);
      displaySongs.splice(targetIndex, 0, draggedItem);
      renderSongs();
    });
  });
}

// ✅ YouTube ID抽出
function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

// ✅ 初期読み込み
loadSongs();
