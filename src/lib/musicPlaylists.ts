import type { BGMTrack } from "../data/bgm_library";

export type MusicFolder = { key: string; name: string; count: number; children: MusicFolder[] };

/** Folder names are presentation metadata, never filesystem paths supplied to an API. */
export function playlistParts(track: BGMTrack): string[] {
  if (!track.id.startsWith("local_")) return ["内置曲库"];
  return ["本地音乐", ...(Array.isArray(track.playlistPath) ? track.playlistPath : [])];
}

export function playlistKey(parts: string[]): string {
  return parts.join("/");
}

export function inPlaylist(track: BGMTrack, key: string | null): boolean {
  if (!key) return true;
  const trackKey = playlistKey(playlistParts(track));
  return trackKey === key || trackKey.startsWith(key + "/");
}

export function musicFolderTree(tracks: BGMTrack[]): MusicFolder[] {
  const roots: MusicFolder[] = [];
  for (const track of tracks) {
    const parts = playlistParts(track);
    let branch = roots;
    for (let index = 0; index < parts.length; index++) {
      const key = playlistKey(parts.slice(0, index + 1));
      let node = branch.find(item => item.key === key);
      if (!node) {
        node = { key, name: parts[index], count: 0, children: [] };
        branch.push(node);
      }
      node.count++;
      branch = node.children;
    }
  }
  const sort = (nodes: MusicFolder[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    for (const node of nodes) sort(node.children);
  };
  sort(roots);
  return roots;
}
