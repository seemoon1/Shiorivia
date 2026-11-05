# Shiorivia Local Music · 曲库与唱片

音乐文件放在项目根目录的 `music/` 下。扫描不会修改音频和 `.lrc`，仅重建忽略 Git 追踪的 `data_storage/music-library.json` 以及由程序提取的 `data_storage/music-covers/` 图片缓存。

在 **设置 → 媒体 → 本地音乐** 点击「扫描本地音乐」，阅读确认框并确认后才会执行。重复扫描会同步文件的新增、删除与重命名。

目录示例：

```text
music/
  Artist - Song.mp3
  Artist - Song.lrc
  Band A/
    Artist - First.m4a
    Live/
      Artist - Concert.flac
```

`Band A` 是歌单，`Live` 是它的子歌单。点击歌单可将该目录及子目录下歌曲切换为当前播放列表；「播放列表」页展示这次播放的队列。根目录歌曲位于「本地音乐」歌单。内置示例曲目单独显示在「内置曲库」。

扫描器支持常见音频文件扩展名，具体解码以浏览器为准；可匹配同名 `.lrc`。封面提取目前为最佳努力模式，支持常见 MP3 ID3v2 APIC、FLAC Picture 与 M4A covr（JPEG/PNG）。不支持或损坏的封面使用静止默认唱片；用户歌曲信息不会上传到第三方。文件名建议为 `歌手 - 歌曲名称`，否则歌手名显示为 Unknown Artist。

AI 只收到歌曲名与歌手名；较新或冷门歌曲可能不被模型认识。

**安全提醒：** 本地音乐 API 可在 Shiorivia 服务可访问的网络范围内读取已扫描的音乐，不应把本地开发服务器暴露在不受信任的局域网或公网。用户应确保对导入音乐、歌词、封面拥有相应使用权。
