import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the finished student image product instead of starter UI", async () => {
  const [page, home, brand, layout, css, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/components/home-client.tsx", root), "utf8"),
    readFile(new URL("app/components/brand.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /HomeClient/);
  assert.match(brand, /像素课代表/);
  assert.match(home, /大学生/);
  assert.match(home, /image-2-Pro/);
  assert.match(home, /校园代理/);
  assert.match(layout, /\/og\.png/);
  assert.match(css, /--acid:\s*#d8ff43/i);
  assert.match(packageJson, /pixel-monitor-campus-image/);
  assert.doesNotMatch(page + layout + packageJson, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("keeps image credentials server-side and wires durable platform storage", async () => {
  const [generateRoute, hosting, envExample, gitignore] = await Promise.all([
    readFile(new URL("app/api/generate/route.ts", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
    readFile(new URL(".gitignore", root), "utf8"),
  ]);

  assert.match(generateRoute, /getChatGPTUser/);
  assert.match(generateRoute, /IMAGE_API_KEY/);
  assert.match(generateRoute, /IMAGES_BUCKET\.put/);
  assert.match(generateRoute, /status = 'failed'/);
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.match(hosting, /"r2":\s*"IMAGES_BUCKET"/);
  assert.match(envExample, /IMAGE_API_BASE_URL/);
  assert.match(gitignore, /\.env\*/);
  assert.doesNotMatch(generateRoute + envExample, /sk-[a-zA-Z0-9]{20,}/);

  await access(new URL("dist/server/index.js", root));
  await access(new URL("public/og.png", root));
});
