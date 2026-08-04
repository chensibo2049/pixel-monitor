import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships a concrete campus poster product and reusable recipes", async () => {
  const [page, home, studio, brand, layout, css, packageJson, homeCases] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/components/home-client.tsx", root), "utf8"),
    readFile(new URL("app/components/studio-client.tsx", root), "utf8"),
    readFile(new URL("app/components/brand.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/data/home-cases.ts", root), "utf8"),
  ]);

  assert.match(page, /HomeClient/);
  assert.match(brand, /像素课代表/);
  assert.match(home, /校园公开课/);
  assert.match(home, /主持人/);
  assert.match(home, /学校校徽 PNG/);
  assert.match(home, /案例配方库/);
  assert.match(home, /首页再放 27 个/);
  assert.match(home, /cases\?case=/);
  assert.match(homeCases, /CASE|id: 520|id: 418/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(home, /积分 \/ 次/);
  assert.match(studio, /局部修改/);
  assert.match(studio, /生成类似/);
  assert.match(studio, /一键去背景/);
  assert.match(studio, /出 4 张/);
  assert.match(layout, /\/og\.png/);
  assert.match(css, /--acid:\s*#d8ff43/i);
  assert.match(packageJson, /pixel-monitor-campus-image/);
  assert.doesNotMatch(page + layout + packageJson, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("keeps credentials server-side and stores images on local durable disk", async () => {
  const [generateRoute, imageTools, runtime, envExample, gitignore, compose, dockerfile] = await Promise.all([
    readFile(new URL("app/api/generate/route.ts", root), "utf8"),
    readFile(new URL("app/api/image-tools/route.ts", root), "utf8"),
    readFile(new URL("db/runtime.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
    readFile(new URL(".gitignore", root), "utf8"),
    readFile(new URL("docker-compose.yml", root), "utf8"),
    readFile(new URL("Dockerfile", root), "utf8"),
  ]);

  assert.match(generateRoute, /IMAGE_API_KEY/);
  assert.match(generateRoute, /saveGeneratedAsset/);
  assert.match(generateRoute, /output_compression:\s*80/);
  assert.match(generateRoute, /failGenerationAndRefund/);
  assert.match(imageTools, /images\/\$\{endpoint\}/);
  assert.match(imageTools, /generation_assets/);
  assert.match(runtime, /better-sqlite3/);
  assert.match(runtime, /DATA_DIR/);
  assert.match(runtime, /status = 'failed'/);
  assert.match(compose, /\.\/data:\/app\/data/);
  assert.match(dockerfile, /output|standalone|server\.js/);
  assert.match(envExample, /AUTH_SECRET/);
  assert.match(gitignore, /\/data\//);
  assert.doesNotMatch(generateRoute + imageTools + runtime + compose, /IMAGES_BUCKET|R2Bucket/);
  assert.doesNotMatch(generateRoute + imageTools + envExample, /sk-[a-zA-Z0-9]{20,}/);
  assert.doesNotMatch(compose, /sk-[a-zA-Z0-9]{20,}/);

  await access(new URL("public/og.png", root));
  await access(new URL("public/cases/lecture.jpg", root));
  await access(new URL("public/cases/campus-talk.jpg", root));
});

test("ships the reclassified 517-case student inspiration library", async () => {
  const [page, client, rawLibrary] = await Promise.all([
    readFile(new URL("app/cases/page.tsx", root), "utf8"),
    readFile(new URL("app/components/case-library-client.tsx", root), "utf8"),
    readFile(new URL("public/case-library/cases.json", root), "utf8"),
  ]);
  const library = JSON.parse(rawLibrary);
  assert.match(page, /CaseLibraryClient/);
  assert.match(client, /带入创作台/);
  assert.equal(library.total, 517);
  assert.equal(library.cases.length, 517);
  assert.equal(library.categories.length, 9);
  assert.ok(library.cases.every((item) => item.prompt && item.image));
  await access(new URL("public/case-library/images/case1.jpg", root));
  await access(new URL("public/case-library/images/case423.jpg", root));
  await access(new URL("public/case-library/images/case520.jpg", root));
});

test("provides local accounts and progressive generation", async () => {
  const [auth, login, register, stream, studio, admin, loginClient] = await Promise.all([
    readFile(new URL("app/auth.ts", root), "utf8"),
    readFile(new URL("app/api/auth/login/route.ts", root), "utf8"),
    readFile(new URL("app/api/auth/register/route.ts", root), "utf8"),
    readFile(new URL("app/api/generate/stream/route.ts", root), "utf8"),
    readFile(new URL("app/components/studio-client.tsx", root), "utf8"),
    readFile(new URL("app/components/admin-client.tsx", root), "utf8"),
    readFile(new URL("app/components/login-client.tsx", root), "utf8"),
  ]);
  assert.match(auth, /httpOnly/);
  assert.match(auth, /jwtVerify/);
  assert.match(login, /bcrypt\.compare/);
  assert.match(register, /bcrypt\.hash/);
  assert.match(loginClient, /注册即送 30 积分/);
  assert.match(studio, /可用积分/);
  assert.match(studio, /本次 \{selectedPrice\} 积分/);
  assert.doesNotMatch(admin, /Number\(form\.get\("standardPrice"\)\) \* 100/);
  assert.match(stream, /stream:\s*true/);
  assert.match(stream, /partial_image_b64/);
});

test("unifies reference generation, supports production ratios, themes, and permanent subsite ownership", async () => {
  const [studio, options, imageTools, runtime, register, login, layout, themeSwitcher, css] = await Promise.all([
    readFile(new URL("app/components/studio-client.tsx", root), "utf8"),
    readFile(new URL("app/lib/image-options.ts", root), "utf8"),
    readFile(new URL("app/api/image-tools/route.ts", root), "utf8"),
    readFile(new URL("db/runtime.ts", root), "utf8"),
    readFile(new URL("app/api/auth/register/route.ts", root), "utf8"),
    readFile(new URL("app/api/auth/login/route.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/theme-switcher.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(studio, /文字或参考图都在这里/);
  assert.match(studio, /添加参考图（可选）/);
  assert.match(studio, /国风政务/);
  assert.match(options, /portrait-916/);
  assert.match(options, /landscape-169/);
  assert.match(options, /2160x3840/);
  assert.match(options, /3840x2160/);
  assert.match(imageTools, /upstream\.set\("size", size\)/);
  assert.match(imageTools, /upstream\.append\("image\[\]"/);
  assert.match(runtime, /origin_subsite_id/);
  assert.match(runtime, /getAttributedSubsite/);
  assert.match(register, /origin_subsite_id/);
  assert.match(login, /origin_subsite_slug/);
  assert.match(layout, /ThemeSwitcher/);
  assert.match(themeSwitcher, /国风政务/);
  assert.match(css, /data-theme="guofeng"/);
});

test("stores one account logo and applies the exact asset to later poster generations", async () => {
  const [studio, studioPage, profileRoute, logoRoute, runtime, brandProfile, brandImage, brandGeneration, generate, stream, imageTools, packageJson] = await Promise.all([
    readFile(new URL("app/components/studio-client.tsx", root), "utf8"),
    readFile(new URL("app/studio/page.tsx", root), "utf8"),
    readFile(new URL("app/api/brand-profile/route.ts", root), "utf8"),
    readFile(new URL("app/api/brand-profile/logo/route.ts", root), "utf8"),
    readFile(new URL("db/runtime.ts", root), "utf8"),
    readFile(new URL("app/lib/brand-profile.ts", root), "utf8"),
    readFile(new URL("app/lib/brand-image.ts", root), "utf8"),
    readFile(new URL("app/lib/brand-generation.ts", root), "utf8"),
    readFile(new URL("app/api/generate/route.ts", root), "utf8"),
    readFile(new URL("app/api/generate/stream/route.ts", root), "utf8"),
    readFile(new URL("app/api/image-tools/route.ts", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(studio, /上传一次，之后每张海报都能直接复用/);
  assert.match(studio, /默认 Logo 说明/);
  assert.match(studio, /本次 Logo 位置/);
  assert.match(studio, /本次 Logo 其他要求/);
  assert.match(studioPage, /initialBrandProfile/);
  assert.match(profileRoute, /normalizeBrandLogo/);
  assert.match(profileRoute, /5 \* 1024 \* 1024/);
  assert.match(logoRoute, /private, no-store/);
  assert.match(runtime, /CREATE TABLE IF NOT EXISTS user_brand_profiles/);
  assert.match(runtime, /brand-assets/);
  assert.match(brandProfile, /不要自行绘制、模仿、拼写或重复任何 Logo/);
  assert.match(brandImage, /composite/);
  assert.match(brandGeneration, /applyBrandLogo/);
  assert.match(generate, /applyResolvedBrandLogo/);
  assert.match(stream, /applyResolvedBrandLogo/);
  assert.match(imageTools, /reference-logo/);
  assert.match(packageJson, /"sharp"/);
});
