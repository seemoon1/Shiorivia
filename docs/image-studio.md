# Shiorivia Local · Image Studio

The image UI is off by default. To use ComfyUI, run your own ComfyUI service on loopback,
set `COMFYUI_URL=http://127.0.0.1:8188` in `.env.local`, and restart Shiorivia.
Choose **ComfyUI** and specify a checkpoint filename present in ComfyUI.

The default **API-format** workflow is `docs/comfyui-default-workflow-api.json`.
Change the model filename and style prompts in Settings > AI & Models > Image Studio.
For advanced ComfyUI graphs, copy/export your API-format workflow to the untracked
`data_storage/comfyui-workflow.json`. At least one text input must contain
`{{SHIORIVIA_SCENE}}` or `{{SHIORIVIA_POSITIVE}}`. Optional placeholders:
`{{SHIORIVIA_NEGATIVE}}` and `{{SHIORIVIA_MODEL}}`. The model-generated text only
supplies scene/action/character description, not your negative prompt or workflow nodes.
User-defined workflow steps, samplers, LoRAs, schedulers and graph connections remain
unchanged. Parameter fields in Image Studio affect only matching `{{SHIORIVIA_*}}`
placeholders in the workflow: they never silently overwrite arbitrary user nodes. Please review custom workflows before using them.

For hosted image providers, set `FAL_KEY`, `OPENROUTER_API_KEY`, or `GOOGLE_API_KEY` in
`.env.local` and choose provider + image model ID in Image Studio. fal.ai model names
are endpoint paths such as `fal-ai/flux/schnell` (model-specific parameters may vary).
Custom_1–4 image providers require explicit Image capability opt-in in AI & Models and
must implement OpenAI-compatible `POST /images/generations` returning `data[0].b64_json`.
All provider requests, credentials and prompts cross the chosen provider's trust boundary.

**Security**: Local is for trusted machines. Do not expose `/api/draw`, `/api/upload`
or any local file/script endpoints to the public Internet. Back up `data_storage/`.
