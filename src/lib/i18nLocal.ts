import type { Locale } from "./locale";

/** Second-wave UI strings. Brand names, saved content and protocol keys are not translated. */
const strings = {
  "sync.loading": ["正在读取本地资料", "正在讀取本機資料", "Reading local data", "ローカルデータを読み込み中", "로컬 데이터 불러오는 중"],
  "sync.idle": ["已就绪 · 本地保存", "已就緒 · 本機儲存", "Ready · Local storage", "準備完了 · ローカル保存", "준비 완료 · 로컬 저장"],
  "sync.syncing": ["正在写入本地", "正在寫入本機", "Saving locally", "ローカルに保存中", "로컬에 저장 중"],
  "sync.success": ["已保存至本地", "已儲存至本機", "Saved locally", "ローカルに保存済み", "로컬에 저장됨"],
  "sync.unsaved": ["有尚未保存的更改", "有尚未儲存的變更", "Unsaved changes", "未保存の変更があります", "저장되지 않은 변경 사항"],
  "sync.error": ["本地同步失败", "本機同步失敗", "Local sync failed", "ローカル同期に失敗", "로컬 동기화 실패"],
  "sync.title": ["本地数据", "本機資料", "Local data", "ローカルデータ", "로컬 데이터"],
  "sync.now": ["保存到本地", "儲存至本機", "Save locally", "ローカルに保存", "로컬에 저장"],
  "sync.failed": ["保存失败", "儲存失敗", "Save failed", "保存に失敗", "저장 실패"],
  "sync.saved": ["已保存", "已儲存", "Saved", "保存済み", "저장됨"],
  "sync.auto": ["自动本地保存已开启", "自動本機儲存已開啟", "Local autosave enabled", "ローカル自動保存は有効", "로컬 자동 저장 활성화"],
  "sync.check": ["请检查本地服务", "請檢查本機服務", "Check local service", "ローカルサービスを確認", "로컬 서비스를 확인하세요"],
  "sync.pending": ["等待保存", "等待儲存", "Pending save", "保存待ち", "저장 대기"],
  "memory.emptyStm": ["暂无短期记忆", "暫無短期記憶", "No short-term memory yet", "短期記憶はまだありません", "아직 단기 기억이 없습니다"],
  "memory.emptyLtm": ["暂无长期记忆", "暫無長期記憶", "No long-term memory yet", "長期記憶はまだありません", "아직 장기 기억이 없습니다"],
  "memory.open": ["打开记忆档案", "開啟記憶檔案", "Open Memory Vault", "記憶アーカイブを開く", "기억 보관함 열기"],
  "memory.stm": ["短期记忆", "短期記憶", "Short-term memory", "短期記憶", "단기 기억"],
  "memory.ltm": ["长期记忆", "長期記憶", "Long-term memory", "長期記憶", "장기 기억"],
  "memory.add": ["添加记忆", "新增記憶", "Add memory", "記憶を追加", "기억 추가"],
  "memory.save": ["保存记忆", "儲存記憶", "Save memory", "記憶を保存", "기억 저장"],
  "memory.cancel": ["取消", "取消", "Cancel", "キャンセル", "취소"],
  "memory.close": ["关闭记忆档案", "關閉記憶檔案", "Close Memory Vault", "記憶アーカイブを閉じる", "기억 보관함 닫기"],
  "memory.description": ["六个基础短期记忆槽，长期记忆可自由追加。旧记录完整保留。", "六個基本短期記憶欄位，可自由新增長期記憶。保留舊紀錄。", "Six base STM slots; add LTM freely. Older entries are preserved.", "短期記憶は基本6枠。長期記憶は追加可能。過去の記録も保持します。", "기본 단기 기억 6칸, 장기 기억 추가 가능. 이전 기록은 유지됩니다."],
  "memory.emptyList": ["长期记忆尚为空，可添加一条。", "長期記憶仍是空的，可以新增。", "No long-term entries yet. Add one to begin.", "長期記憶はまだありません。新しく追加できます。", "장기 기억이 비어 있습니다. 새로 추가해 보세요."],
  "memory.confirm": ["确定保存当前会话的 STM / LTM 吗？", "確定要儲存目前對話的 STM / LTM 嗎？", "Save STM / LTM for this conversation?", "この会話の STM / LTM を保存しますか？", "이 대화의 STM / LTM을 저장할까요?"],
  "memory.changed": ["编辑期间记忆已有更新。请重新打开档案，避免覆盖新内容。", "編輯時記憶已更新。請重新開啟檔案，以免覆蓋新內容。", "Memory changed during editing. Reopen the vault to avoid overwriting it.", "編集中に記憶が更新されました。上書きを防ぐため開き直してください。", "편집 중 기억이 변경되었습니다. 덮어쓰지 않도록 다시 열어 주세요."],
  "novel.cast": ["角色选择", "角色選擇", "Cast selection", "登場人物を選ぶ", "등장인물 선택"],
  "novel.world": ["全局设定", "全域設定", "Global setting", "全体設定", "전체 설정"],
  "novel.ready": ["准备好编织下一章。", "準備好編織下一章。", "Ready for the next chapter.", "次の章を紡ぐ準備ができました。", "다음 장을 엮을 준비가 되었습니다."],
} as const;

export type LocalTextKey = keyof typeof strings;
const order: Locale[] = ["zh-CN", "zh-TW", "en", "ja", "ko"];
export function localText(locale: Locale, key: LocalTextKey): string {
  return strings[key][Math.max(0, order.indexOf(locale))];
}
