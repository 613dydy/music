const songTitleInput = document.getElementById("song-title");
const songUrlInput = document.getElementById("song-url");
const saveBtn = document.getElementById("save-btn");
const songList = document.getElementById("song-list");
const player = document.getElementById("player");

let songs = [];
let currentIndex = 0;

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
      <div>
        <button onclick="playSong('${data.url}')">▶再生</button>
        <button onclick="deleteSong('${doc.id}')">削除</button>
      </div>
    `;
    songList.appendChild(li);
  });
}

// 曲再生
function playSong(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    alert("正しいYouTube URLを入れてくれ！");
    return;
  }
  player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  currentIndex = songs.findIndex(song => song.url === url);

  // 自動再生用（簡易：30秒で次に行く仮仕様、後で正確にする）
  setTimeout(playNextSong, 30000); 
}

// 次の曲
function playNextSong() {
  if (songs.length === 0) return;
  currentIndex = (currentIndex + 1) % songs.length;
  playSong(songs[currentIndex].url);
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
