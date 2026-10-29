# Shiorivia — Local Edition (formerly Mutsu Studio Lite)

<div align="center">

**A Local-First, Highly Customizable AI Chat Interface.**  
**本地优先、高度可定制的沉浸式 AI 交互前端。**

![License](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)
![Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)
![Local](https://img.shields.io/badge/Data-Local%20Storage-green)

[English](#english) | [中文说明](#中文说明)

</div>

---

> [!WARNING]
> **Unofficial Fan Project / 非官方二创项目**  
> This project is a non-profit fan work based on *BanG Dream! It's MyGO!!!!!* & *Ave Mujica*.  
> It is distributed as a **Source Code Only** framework. No copyrighted assets (images, audio, models) are included.  
> 本项目是基于《BanG Dream! It's MyGO!!!!!》与《BanG Dream! Ave Mujica》的非盈利同人二创代码框架。  
> 本仓库**仅包含源代码**，不包含任何属于版权方的图像、音频、Live2D 模型或剧本。

---

## <a id="english"></a>🇬🇧 English

### ✨ Features
*   **100% Local Data**: All chat history and settings are saved to your local disk (`data_storage/`). No cloud tracking.
*   **Multi-Mode AI**: 
    *   🛠️ **Infinite Mode**: For coding and logic tasks.
    *   🎭 **Story Mode**: Visual novel style interaction with emotional dampening system.
    *   🌌 **Novel Mode**: Immersive story generation.
*   **Dual-Core API**: Seamlessly switch between **Google Gemini** (Free tier available) and **OpenRouter** (Access to GPT-4, Claude, etc.).
*   **Customizable**: Bring your own Live2D models, backgrounds, and music.

### 🚀 Getting Started

#### 1. Prerequisites
*   **Node.js**: You must have Node.js (v18 or later) installed. [Download Here](https://nodejs.org/).
*   **API Key**: You need at least one AI provider key.
    *   **Google Gemini**: [Get API Key](https://aistudio.google.com/app/apikey) (Free tier available in supported regions).
    *   **OpenRouter**: [Get API Key](https://openrouter.ai/) (Aggregates OpenAI, Anthropic, etc.).

#### 2. Installation
1.  Download or Clone this repository.
2.  Double-click `start_mutsu.bat` (Windows).
    *   It will automatically install dependencies and create necessary folders.
3.  The browser will open at `http://localhost:3000`.

#### 3. Configuration (.env.local)
Upon first launch, the app might complain about missing keys. Create a file named `.env.local` in the root folder:

# Recommended: Google Gemini (Free & Fast)
GOOGLE_API_KEY=your_google_api_key_here

# Optional: OpenRouter (For GPT-4/Claude)
OPENROUTER_API_KEY=your_openrouter_key_here

# Optional: Tavily (For Web Search)
TAVILY_API_KEY=your_tavily_key_here

# Optional: Password for Batch Delete (Default: 123456)
ACCESS_CODE=your_password

> ### Note on Network: 
> Please ensure your network environment can access the API services (Google/OpenAI). If you are in a restricted region, you may need to configure your system proxy.

### 📂 How to Add Assets
This is a "Fill-in-the-Blank" player. You need to put your files in public/.
*   **Live2D**: Put model folders in public/live2d/. Then run python scripts/scan_live2d_local.py.
*   **Images**: Put character images in public/tachie/. Then run python scripts/scan_tachie.py.
*   **Music**: Put .mp3 files in public/music/ and edit src/data/bgm_library.ts.


## <a id="中文说明"></a>🇨🇳 中文说明

### ✨ 核心特性
*   **完全本地化**: 所有聊天记录、设置均存储在您的本地硬盘 (data_storage/ 文件夹)。没有云端数据库，您的数据只属于您自己。
*   **三模切换**:
    *   🛠️ **工程模式**: 适合写代码、日常问答。
    *   🎭 **故事模式**: 带有“情感阻尼系统”的 Galgame 风格交互。
    *   🌌 **梦境模式**: 沉浸式小说生成器。
*   **双核驱动**: 支持 **Google Gemini** (免费/高速) 和 **OpenRouter** (聚合 GPT-5, Claude4.5 等)。
*   **高度可扩展**: 所有的立绘、Live2D、背景音乐均可由用户放入本地文件夹加载。


### 🚀 快速开始
#### 1. 准备工作
*   **Node.js**: 请确保安装了 Node.js (v18 或更高版本)。官网下载。
*   **API Key** (密钥): 您至少需要一个 AI 服务的密钥。
    *   **Google Gemini**: 点击注册 (推荐，量大管饱)。
    *   **OpenRouter**: 点击注册 (支持 GPT-4, Claude 等模型)。

#### 2. 启动
1.  下载并解压本仓库。
2.  双击根目录下的 start_mutsu.bat。
    *   首次运行会自动安装依赖库，并创建所需的文件夹结构，请耐心等待。
3.  启动完成后，浏览器会自动打开 http://localhost:3000。
#### 3. 配置密钥 (.env.local)
在项目根目录下创建一个名为 .env.local 的文件，填入您的密钥：

# [推荐] Google Gemini (免费且速度快)
GOOGLE_API_KEY=这里填你的key

# [可选] OpenRouter (如果你想用 GPT-4)
OPENROUTER_API_KEY=这里填你的key

# [可选] Tavily (如果你开启了联网搜索功能)
TAVILY_API_KEY=这里填你的key

# [可选] 批量删除时的保护密码 (默认: 123456)
ACCESS_CODE=123456

> ### ⚠️ 关于网络环境:
> 本项目运行在您的本地电脑上，直接请求 AI 服务商的接口。
> 如果您所在的地区无法直接访问 Google 或 OpenAI，请确保您的终端/系统具备访问国际互联网的能力。本项目不提供任何代理功能。

### 📂 如何添加素材
Mutsu Studio Lite 是一个“播放器”，素材需要您自己放入 public 文件夹。
*   **Live2D 模型**: 将模型文件夹放入 public/live2d/，然后运行 python scripts/scan_live2d_local.py 自动生成配置。
*   **静态立绘**: 将图片放入 public/tachie/，运行 python scripts/scan_tachie.py。
*   **音乐**: 将 mp3 放入 public/music/，并手动编辑 src/data/bgm_library.ts 进行注册。

---

## ⚖️ License / 协议

Copyright (c) 2026 Tsuki (seemoon1).

Licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

You may copy, distribute and modify the software as long as you track changes/dates in source files. Any modifications to or software including (via compiler) GPL-licensed code must also be made available under the GPL along with build & install instructions.

Commercial use of the **software code** is permitted under AGPL-3.0, subject to the license. The Shiorivia name and official branding are governed separately by [TRADEMARKS.md](TRADEMARKS.md).
软件**代码**可依据 AGPL-3.0 条款商业使用；Shiorivia 名称及官方品牌标识适用独立的 [品牌使用政策](TRADEMARKS.md)。
See also [BRANDING.md](BRANDING.md) and [SECURITY.md](SECURITY.md). / 另见品牌视觉规范与安全说明。

---

## 🙏 Acknowledgements / 致谢

*   **Character Data**: 部分角色基础设定参考自 [Moegirl Encyclopedia (萌娘百科)](https://zh.moegirl.org.cn/)，遵循 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh) 协议。

*   **Music / Sound**: Demo music provided by [MaouDamashii (魔王魂)](https://maoudamashii.jokersounds.com/). 
    示例音乐由 魔王魂 提供（或参考其开源精神）。

*   **UI Inspiration**: Inspired by the aesthetics of *BanG Dream! It's MyGO!!!!!*.
