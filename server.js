const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");

const app = express();
const PORT = 3000;

app.use(cors());

// ✅ YouTube音声ストリームAPI
app.get("/audio", async (req, res) => {
  try {
    const videoId = req.query.videoId;
    if (!videoId) {
      return res.status(400).send("videoIdが必要だぜブロー！");
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`🎧 音声抽出中: ${url}`);

    res.header("Content-Disposition", `attachment; filename="${videoId}.mp3"`);
    res.header("Content-Type", "audio/mpeg");

    // ✅ ytdlで音声ストリームだけ取得
    ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio"
    }).pipe(res);

  } catch (err) {
    console.error("エラー:", err);
    res.status(500).send("音声取得失敗だぜブロー！");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 サーバー起動！ http://localhost:${PORT}`);
});
