
export type Message = { 
  role: string; 
  content: any; 
  modelName?: string;
  characterId?: string; 
  voiceVariant?: string;
};

export type CodeFile = {
  name: string;    
  language: string;
  content: string; 
};

export type ProtagonistState = {
  name: string;
  age: string;
  gender: string;
  environment: string; 
  temperature: string; 
  timeDesc: string;    
  clothing: string;    
  sensation: string;   
  innerState: string;  
};

export type CharacterStatus = {
  name: string;
  clothing: string;
  shoes: string;       
  bodyState: string;   
  legState: string;    
  sexCount: string;    
  affection: number;   
  monopoly: number;    
  yandere: number;     
  lust: number;        
  innerState: string;  
};

export type PlotSuggestions = {
  fun: string;      
  rational: string; 
  radical: string;  
};

export type TimelineStructure = {
  major: string;  
  medium: string; 
  minor: string;  
};

export type SaveData = {
  id: string;           
  slotIndex: number;    
  name: string;         
  timestamp: number;    
  previewText: string;  
  sessionSnapshot: Session; 
};

export type ViaeMessage = {
  id: string;
  role: "user" | "assistant";
  /** Mark out-of-character director notes separately from participant speech. */
  kind?: "director" | "chat";
  content: string;
  createdAt: number;
  modelName?: string;
};

export type ViaeConversation = {
  id: string;
  name: string;
  type: "direct" | "group";
  members: string[];
  pov: "outsider" | "insider";
  defaultPovChar?: string;
  reality: "canon" | "au";
  timeline: string;
  auContext?: string;
  messages: ViaeMessage[];
  stm?: string;
  ltm?: string;
  turnCount?: number;
  updatedAt: number;
};

export type NovelDraft = {
  selectedCharIds: string[];
  scenario: string;
  action: string;
  style: string;
  outline: string;
  themeMode: "dark" | "paper";
};

export type Session = {
  id: string; 
  title: string; 
  folderId: string | null; 
  characterId: string;
  voiceVariant?: string; 
  messages: Message[]; 
  updatedAt: number;
  localWorldInfo?: string;
  
  memoryMode?: 'infinite' | 'sliding' | 'novel' | 'chat' | 'lime';
  // A single LIME session holds its own private/group conversations.
  /** Legacy persisted key; retained for all VIAE local backups. */
  limeGroups?: ViaeConversation[];
  limeGroupId?: string | null;
  stm?: string;
  stmBackup?: string; 
  ltm?: string;
  novelDraft?: NovelDraft;
  turnCount?: number;

  protagonist?: ProtagonistState;
  charStatus?: CharacterStatus | CharacterStatus[];
  plotSuggestions?: PlotSuggestions;
  timeline?: TimelineStructure;
  lastDanmaku?: string[];

  codeRepository?: Record<string, CodeFile>;

  currentEmotion?: string;    
  currentBackground?: string; 
  currentOutfitId?: string;   
  live2dCharId?: string;      
};

export type ChatFolder = { id: string; name: string; isExpanded: boolean; };

export const CHARACTERS = [
  // MyGO!!!!!
  { id: "tomori", name: "高松 灯", avatar: "🐧", hex: "#3498db", sub: "MyGO!!!!!" },
  { id: "anon", name: "千早 爱音", avatar: "🎸", hex: "#FF8899", sub: "MyGO!!!!!" },
  { id: "soyo", name: "长崎 素世", avatar: "🥐", hex: "#FFDD88", sub: "MyGO!!!!!" },
  { id: "taki", name: "椎名 立希", avatar: "🐼", hex: "#7777AA", sub: "MyGO!!!!!" },
  { id: "rana", name: "要 乐奈", avatar: "🐱", hex: "#77DD77", sub: "MyGO!!!!!" },

  // Ave Mujica
  { id: "sakiko", name: "丰川 祥子", avatar: "🎹", hex: "#7799CC", sub: "Ave Mujica" },
  { id: "mutsu", name: "若叶 睦", avatar: "🥒", hex: "#779977", sub: "Ave Mujica" },
  { id: "uika", name: "三角 初华", avatar: "✨", hex: "#BB9955", sub: "Ave Mujica" },
  { id: "nyamu", name: "祐天寺 若麦", avatar: "💄", hex: "#AA4477", sub: "Ave Mujica" },
  { id: "umiri", name: "八幡 海铃", avatar: "🎧", hex: "#335566", sub: "Ave Mujica" },
  
  // Sumimi
  { id: "mana", name: "纯田 真奈", avatar: "🍊", hex: "#D2B48C", sub: "Sumimi" },
];

export type ModelGroup = { groupName: string; models: { id: string; name: string }[] };

export const MODEL_DATA: ModelGroup[] = [
  { 
    groupName: "Gemini (Google)", 
    models: [
      { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
      { id: "google/gemini-3-flash-preview", name: "Gemini 3.0 Flash Preview" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ]
  },
  /* 
  { 
    groupName: "Image Gen (文生图)", 
    models: [
      { id: "google/imagen-3", name: "Imagen 3" },
    ]
  },
  */
  { 
    groupName: "GPT (OpenAI)", 
    models: [
      { id: "openai/gpt-5.2-chat", name: "GPT-5.2 Chat" },
      { id: "openai/gpt-5.2-pro", name: "GPT-5.2 Pro" },
      { id: "openai/gpt-5.2", name: "GPT-5.2 Base" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
    ]
  },
  { 
    groupName: "DeepSeek", 
    models: [
      { id: "deepseek/deepseek-v3.2", name: "DeepSeek v3.2" },
      { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek Chat v3.1" },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
    ]
  },
  { 
    groupName: "Claude (Anthropic)", 
    models: [
      { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
      { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
      { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
    ]
  },
  { 
    groupName: "Grok (xAI)", 
    models: [
      { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast 1" },
      { id: "x-ai/grok-4-fast", name: "Grok 4 Fast" },
      { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
      { id: "x-ai/grok-4", name: "Grok 4" },
    ]
  }
];