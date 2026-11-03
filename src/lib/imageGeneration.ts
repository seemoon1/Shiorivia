import { promises as fs } from "node:fs";
import path from "node:path";
import { injectComfyScene, type WorkflowGraph } from "./comfyWorkflow";
import { getServerLocalProvider } from "./localProviderServer";

type DrawRequest = { provider?: string; model?: string; description?: string; positive?: string; negative?: string;
  negativePrompt?: string; width?: number; height?: number; steps?: number; cfg?: number; seed?: number };
const text = (x: unknown, max = 10000) => typeof x === "string" ? x.trim().slice(0, max) : "";
const number = (x: unknown, fallback: number, min: number, max: number) => typeof x === "number" && Number.isFinite(x) ? Math.round(Math.min(max, Math.max(min, x))) : fallback;
const loadBase64 = (s: string) => s.startsWith('data:image/') ? s.slice(s.indexOf(',') + 1) : s;
const jsonBody = (res: Response) => res.json().catch(() => ({}));
const limit = (str: string) => { if (str.length > 12 * 1024 * 1024) throw Error('Image response is too large'); return str; };

export async function generateImage(payload: DrawRequest): Promise<{ image: string; meta: Record<string, unknown> }> {
  const provider = text(payload.provider, 50) || 'comfyui';
  const scene = text(payload.description);
  if (!scene) throw Error('Scene description is required');
  const positive = text(payload.positive, 4000);
  const negative = text(payload.negative, 4000);
  const prompt = [positive, scene].filter(Boolean).join(', ');
  const model = text(payload.model, 200);
  const width = number(payload.width, 768, 256, 2048), height = number(payload.height, 1024, 256, 2048);
  const steps = number(payload.steps, 24, 1, 100), cfg = number(payload.cfg, 7, 1, 30);
  const seed = number(payload.seed, Math.floor(Math.random() * 2147483646), 0, 2147483647);

  if (provider === 'comfyui') {
    const target = process.env.COMFYUI_URL;
    if (!target) throw Error('Set COMFYUI_URL in .env.local first');
    const url = new URL(target);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('ComfyUI must use a local loopback HTTP address');
    const root = url.origin;
    const custom = path.join(process.cwd(), 'data_storage', 'comfyui-workflow.json');
    const fallback = path.join(process.cwd(), 'docs', 'comfyui-default-workflow-api.json');
    let workflow: WorkflowGraph;
    try { workflow = JSON.parse(await fs.readFile(custom, 'utf8')); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; workflow = JSON.parse(await fs.readFile(fallback, 'utf8')); }
    // A saved ComfyUI API graph owns its checkpoint, CLIP, LoRAs and sampler.
    // Shiorivia only replaces explicit placeholders; no inferred checkpoint override.
    const graph = injectComfyScene(workflow, { scene, positive, negative, model, width, height, steps, cfg, seed });
    const loaders = Object.values(graph).filter(node => node?.class_type === 'CheckpointLoaderSimple');
    const unresolved = loaders.some(node => node.inputs.ckpt_name === '{{SHIORIVIA_MODEL}}');
    if (unresolved && !model) throw Error('Choose a checkpoint in Image Studio or export your configured ComfyUI API workflow to data_storage/comfyui-workflow.json');
    if (loaders.length) {
      // Read the names installed on THIS ComfyUI instance; never hardcode a model catalog.
      try {
        const infoRes = await fetch(root + '/object_info/CheckpointLoaderSimple', { signal: AbortSignal.timeout(8000), cache: 'no-store' });
        if (infoRes.ok) {
          const info = await jsonBody(infoRes);
          const candidates: unknown = info?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
          if (Array.isArray(candidates) && candidates.every(item => typeof item === 'string')) {
            const installed = candidates as string[];
            for (const loader of loaders) {
              const wanted = loader.inputs.ckpt_name;
              if (typeof wanted !== 'string' || wanted.includes('{{')) continue;
              if (installed.includes(wanted)) continue;
              const exact = installed.filter(v => v.toLowerCase() === wanted.toLowerCase());
              const byStem = installed.filter(v => v.replace(/\.(safetensors|ckpt|pt)$/i, '').toLowerCase() === wanted.replace(/\.(safetensors|ckpt|pt)$/i, '').toLowerCase());
              const matches = exact.length ? exact : byStem;
              if (matches.length === 1) loader.inputs.ckpt_name = matches[0];
              else throw Error(`ComfyUI checkpoint not found: ${wanted}. Available: ${installed.slice(0, 12).join(', ') || '(none)'}`);
            }
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('ComfyUI checkpoint not found:')) throw e;
        // Older/custom ComfyUI nodes may not expose object_info; let the backend validate.
      }
    }
    const queued = await fetch(root + '/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: graph, client_id: crypto.randomUUID() }), signal: AbortSignal.timeout(20000) });
    const submission = await jsonBody(queued);
    if (!queued.ok || !submission.prompt_id) throw Error('ComfyUI rejected workflow: ' + JSON.stringify(submission).slice(0, 400));
    const id = encodeURIComponent(String(submission.prompt_id));
    let image: { filename: string; subfolder?: string; type?: string } | undefined;
    for (let i = 0; i < 90; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const response = await fetch(root + '/history/' + id, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      const history = await jsonBody(response);
      const job = history[submission.prompt_id];
      if (job?.status?.status_str === 'error') throw Error('ComfyUI workflow failed');
      if (!job?.outputs) continue;
      for (const node of Object.values(job.outputs) as any[]) {
        if (node?.images?.length) { image = node.images[0]; break; }
      }
      if (image) break;
    }
    if (!image) throw Error('ComfyUI timed out without an image');
    const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type || 'output' });
    const result = await fetch(root + '/view?' + query.toString(), { signal: AbortSignal.timeout(20000) });
    if (!result.ok) throw Error('ComfyUI image retrieval failed');
    const bytes = Buffer.from(await result.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw Error('ComfyUI image too large');
    return { image: bytes.toString('base64'), meta: { provider, model, promptId: submission.prompt_id } };
  }
  if (!model) throw Error('Choose an image model ID');
  if (provider === 'fal') {
    const key = process.env.FAL_KEY || '';
    if (!key) throw Error('FAL_KEY is not configured');
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./-]+$/.test(model) || model.includes('..')) throw Error('Invalid fal model path');
    const response = await fetch('https://fal.run/' + model, { method: 'POST', headers: { Authorization: 'Key ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, negative_prompt: negative, image_size: { width, height }, num_inference_steps: steps, seed }), signal: AbortSignal.timeout(120000) });
    const data = await jsonBody(response);
    if (!response.ok) throw Error('fal.ai generation failed: ' + JSON.stringify(data).slice(0, 300));
    const imageUrl = data.images?.[0]?.url || data.image?.url;
    if (!imageUrl || !String(imageUrl).startsWith('https://')) throw Error('fal response did not include an HTTPS image URL');
    // Returned URLs are provider-controlled; reject arbitrary non-fal hosts to prevent SSRF.
    const host = new URL(imageUrl).hostname;
    if (!host.endsWith('.fal.media') && host !== 'fal.media') throw Error('Unexpected fal media host');
    const binary = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!binary.ok) throw Error('Unable to fetch fal image');
    const bytes = Buffer.from(await binary.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw Error('Image too large');
    return { image: bytes.toString('base64'), meta: { provider, model } };
  }
  if (provider === 'google') {
    const key = process.env.GOOGLE_API_KEY || '';
    if (!key) throw Error('GOOGLE_API_KEY is not configured');
    if (!/^[a-zA-Z0-9_.-]+$/.test(model)) throw Error('Invalid Google image model ID');
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT','IMAGE'] } }), signal: AbortSignal.timeout(120000) });
    const data = await jsonBody(response);
    if (!response.ok) throw Error('Gemini image request failed');
    const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (!part) throw Error('Gemini returned no image');
    return { image: limit(part.inlineData.data), meta: { provider, model } };
  }
  if (provider === 'openrouter') {
    const key = process.env.OPENROUTER_API_KEY || '';
    if (!key) throw Error('OPENROUTER_API_KEY is not configured');
    const response = await fetch('https://openrouter.ai/api/v1/images', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size: `${width}x${height}` }), signal: AbortSignal.timeout(120000) });
    const data = await jsonBody(response);
    if (!response.ok) throw Error('OpenRouter image request failed');
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw Error('OpenRouter returned no image');
    return { image: limit(loadBase64(b64)), meta: { provider, model } };
  }
  if (/^custom_[1-4]$/.test(provider)) {
    const custom = getServerLocalProvider(provider);
    if (!custom) throw Error('Custom image provider is not configured');
    const response = await fetch(custom.baseURL + '/images/generations', { method: 'POST', headers: { Authorization: 'Bearer ' + custom.apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size: `${width}x${height}` }), signal: AbortSignal.timeout(120000) });
    const data = await jsonBody(response);
    if (!response.ok || !data.data?.[0]?.b64_json) throw Error('Custom provider must support OpenAI-compatible /images/generations with b64_json');
    return { image: limit(loadBase64(data.data[0].b64_json)), meta: { provider, model } };
  }
  throw Error('Unsupported image provider');
}
