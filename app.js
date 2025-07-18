const songTitleInput = document.getElementById("song-title");
const songUrlInput = document.getElementById("song-url");
const saveBtn = document.getElementById("save-btn");
const songList = document.getElementById("song-list");
const playAllBtn = document.getElementById("play-all");

let songs = [];
let currentIndex = 0;
let player;

// YouTube Player APIの準備
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "0",
    width: "0",
    events: {
      "onStateChange": onPlayerStateChange
    }
  });
}

// 曲保存
saveBtn.addEventListener("click", async () => {
  const title = songTitleInput.value.trim();
  const url = songUrlInput.value.trim();

  if (!title || !url) {
    alert("曲名とURLを入れてくれ！");
    return;
  }

  await db.collection("songs").add({
    title,
    url,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  songTitleInput.value = "";
  songUrlInput.value = "";
  loadSongs();
});

// 曲リスト読み込み
async function loadSongs() {
  songList.innerHTML = "";
  const snapshot = await db.collection("songs").orderBy("createdAt", "desc").get();
  songs = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    songs.push({ id: doc.id, title: data.title, url: data.url });

    const li = document.createElement("li");
    li.innerHTML = `
      <span>${data.title}</span>
      <button onclick="deleteSong('${doc.id}')">削除</button>
    `;
    songList.appendChild(li);
  });
}

// ▶ 再生ボタン
playAllBtn.addEventListener("click", () => {
  if (songs.length === 0) {
    alert("曲がないぜブロー！");
    return;
  }
  currentIndex = 0;
  playSong(songs[currentIndex].url);
});

// 曲再生
function playSong(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    alert("正しいYouTube URLを入れてくれ！");
    return;
  }
  player.loadVideoById(videoId);
}

// YouTube終了時 → 次の曲
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    currentIndex = (currentIndex + 1) % songs.length;
    playSong(songs[currentIndex].url);
  }
}

// 曲削除
async function deleteSong(id) {
  if (confirm("この曲を削除する？")) {
    await db.collection("songs").doc(id).delete();
    loadSongs();
  }
}

// YouTube URLから動画ID抽出
function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

loadSongs();
