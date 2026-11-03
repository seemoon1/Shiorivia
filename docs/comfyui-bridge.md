# Shiorivia × ComfyUI · Local image bridge

Shiorivia **never generates an image automatically** when the AI emits a `<draw>` instruction. It displays a small pending-illustration card; the user clicks it and explicitly confirms the request.

## Author your workflow in ComfyUI

1. Set `COMFYUI_URL=http://127.0.0.1:8188` (or your own loopback port) in Shiorivia's `.env.local`.
2. Open ComfyUI. Build your preferred graph using **your installed** Checkpoint / LoRA / CLIP / KSampler / VAE / image dimensions. The sample `docs/comfyui-default-workflow-api.json` is a starting *API-format graph*, not a locked list of supported models. If your ComfyUI version cannot import API JSON into its visual editor, build the equivalent graph using its nodes.
3. In the **positive CLIP text field**, place `{{SHIORIVIA_SCENE}}` exactly where the AI's subject/scene should be inserted, e.g. `cinematic lighting, {{SHIORIVIA_SCENE}}, beautiful composition`. Leave your other prompts and node parameters as your own literal values. Do **not** place this marker inside a JSON key, file path or checkpoint name.
4. In ComfyUI export the graph in **API format** (often called *Save (API Format)* / *Export API*) and save the JSON as `data_storage/comfyui-workflow.json` under the Shiorivia project root.
5. Restart Shiorivia if needed, enable image generation in Settings, and try a new assistant illustration card. Shiorivia fills in only the explicit scene marker in your saved graph; it does **not** override literal checkpoint names, CLIP styles, samplers, dimensions or LoRAs.

The sample API graph contains `{{SHIORIVIA_MODEL}}` as a starter checkpoint placeholder. For quick testing without a custom graph, fill **Template Checkpoint** in Image Studio with an installed checkpoint name. Shiorivia queries ComfyUI's live checkpoint list and can resolve `example-model` to `example-model.safetensors` when unambiguous. It never selects a checkpoint silently. An exported custom graph with a real selected checkpoint does **not** require the Shiorivia model field.

Only explicit placeholders are substituted. Legacy `{{SHIORIVIA_POSITIVE}}` and other parameter placeholders remain supported in old API graphs, but for a workflow entirely managed in ComfyUI, set those node values there and retain **only** `{{SHIORIVIA_SCENE}}`.

## Debug Mode

Normal chat shows only the **pending illustration card** and the generate action. Debug Mode expands the AI's raw `<draw>` instruction and the Shiorivia request payload (including the injected scene text, selected backend, and any explicitly entered image settings). Custom CLIP styling and LoRA settings live in your saved ComfyUI graph and remain visible/editable in ComfyUI itself.

The local ComfyUI server and Shiorivia server should not be exposed to untrusted networks. Keep all API keys in `.env.local` and do not commit `data_storage/`.
