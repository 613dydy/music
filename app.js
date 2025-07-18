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

let songs = [];
let filteredSongs = [];
let currentIndex = 0;
let player;
let isShuffle = false;
let repeatMode = "all"; // all or one

// YouTube API
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "0",
    width: "0",
    events: { "onStateChange": onPlayerStateChange }
  });
}

// 曲保存
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

// 曲読み込み
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

  // フォルダ選択更新
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

function renderSongs() {
  const folder = folderSelect.value;
  const search = searchInput.value.toLowerCase();
  filteredSongs = songs.filter(song =>
    (folder === "All" || song.folder === folder) &&
    song.title.toLowerCase().includes(search)
  );

  songList.innerHTML = "";
  filteredSongs.forEach((song, index) => {
    const videoId = extractVideoId(song.url);
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
      <img src="https://img.youtube.com/vi/${videoId}/default.jpg">
      <span>${song.title}</span>
      <button onclick="deleteSong('${song.id}')">削除</button>
    `;
    songList.appendChild(li);
  });

  initDragAndDrop();
}

// プレイリスト再生
playAllBtn.addEventListener("click", () => {
  if (filteredSongs.length === 0) {
    alert("曲がないぜブロー！");
    return;
  }
  currentIndex = 0;
  playSong(filteredSongs[currentIndex].url);
});

// ランダム・リピート
shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleBtn.textContent = isShuffle ? "✅シャッフル" : "🔀 シャッフル";
});

repeatBtn.addEventListener("click", () => {
  repeatMode = repeatMode === "all" ? "one" : "all";
  repeatBtn.textContent = repeatMode === "one" ? "🔂 リピート: 1曲" : "🔁 リピート: 全曲";
});

// 再生
function playSong(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    alert("正しいYouTube URLを入れてくれ！");
    return;
  }
  player.loadVideoById(videoId);
  nowPlaying.textContent = "Now Playing: " + filteredSongs[currentIndex].title;
  highlightPlaying(currentIndex);
}

// 再生終了時
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    if (repeatMode === "one") {
      playSong(filteredSongs[currentIndex].url);
    } else {
      currentIndex = isShuffle
        ? Math.floor(Math.random() * filteredSongs.length)
        : (currentIndex + 1) % filteredSongs.length;
      playSong(filteredSongs[currentIndex].url);
    }
  }
}

// ハイライト
function highlightPlaying(index) {
  document.querySelectorAll("li").forEach((li, i) => {
    li.classList.toggle("playing", i === index);
  });
}

// 削除
async function deleteSong(id) {
  if (confirm("この曲を削除する？")) {
    await db.collection("songs").doc(id).delete();
    loadSongs(folderSelect.value);
  }
}

// 検索・フォルダ切り替え
searchInput.addEventListener("input", renderSongs);
folderSelect.addEventListener("change", renderSongs);

// ドラッグ＆ドロップ
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

    item.addEventListener("drop", async e => {
      e.preventDefault();
      const targetIndex = +item.dataset.index;
      const [draggedItem] = filteredSongs.splice(draggedIndex, 1);
      filteredSongs.splice(targetIndex, 0, draggedItem);

      // DB保存順序更新は今回は省略（必要なら追加可）
      renderSongs();
    });
  });
}

// YouTube ID抽出
function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

loadSongs();
