import type { Locale } from "./locale";

/** Display titles apply only to newly created sessions, never existing saves. */
const titles = {
  infinite: ["新工程", "新專案", "New Project", "新しいプロジェクト", "새 프로젝트"],
  sliding: ["新故事", "新故事", "New Story", "新しい物語", "새 이야기"],
  chat: ["新聊天", "新對話", "New Chat", "新しいチャット", "새 채팅"],
  novel: ["新小说", "新小說", "New Novel", "新しい小説", "새 소설"],
} as const;
export type NamedSessionMode = keyof typeof titles;
/** Initial assistant greetings are generated only for brand-new sessions. */
export function sessionGreeting(mode: "infinite" | "chat", name: string, locale: Locale): string {
  const who = name || "Shiorivia";
  const greetings = mode === "infinite" ? {
    "zh-CN": `我是${who}。欢迎来到 Shiorivia。请告诉我你想做什么。`,
    "zh-TW": `我是${who}。歡迎來到 Shiorivia。想從哪裡開始呢？`,
    en: `I'm ${who}. Welcome to Shiorivia. What would you like to work on?`,
    ja: `${who}です。Shiorivia へようこそ。今日は何をしましょうか？`,
    ko: `저는 ${who}입니다. Shiorivia에 오신 것을 환영해요. 무엇을 도와드릴까요?`,
  } : {
    "zh-CN": `我是${who}。今天想聊些什么？`,
    "zh-TW": `我是${who}。今天想聊些什麼？`,
    en: `It's ${who}. What would you like to talk about today?`,
    ja: `${who}です。今日は何を話そうか？`,
    ko: `${who}예요. 오늘은 무슨 이야기를 나눌까요?`,
  };
  return greetings[locale];
}
const languages: Locale[] = ["zh-CN", "zh-TW", "en", "ja", "ko"];
export function defaultSessionTitle(mode: NamedSessionMode, locale: Locale): string {
  return titles[mode][Math.max(0, languages.indexOf(locale))];
}
/** Read-only fallback used by Tela's first-chapter automatic naming. */
export function isUntitledNovel(title: string): boolean {
  return titles.novel.includes(title as (typeof titles.novel)[number]) ||
    ["New Dream", "未命名作品"].includes(title);
}
