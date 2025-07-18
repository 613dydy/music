const songTitleInput = document.getElementById("song-title");
const songUrlInput = document.getElementById("song-url");
const saveBtn = document.getElementById("save-btn");
const songList = document.getElementById("song-list");

// 曲を保存
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

  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement("li");

    li.innerHTML = `
      <a href="${data.url}" target="_blank">${data.title}</a>
      <button onclick="deleteSong('${doc.id}')">削除</button>
    `;
    songList.appendChild(li);
  });
}

// 曲削除
async function deleteSong(id) {
  if (confirm("この曲を削除する？")) {
    await db.collection("songs").doc(id).delete();
    loadSongs();
  }
}

loadSongs();
