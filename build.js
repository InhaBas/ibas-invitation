// 사용법:
//   node build.js             config.json + src/            → dist/
//   node build.js --variants  config.sample.json + variants/* → dist-variants/<시안>/ (+ 시안 목록 index.html)
// 공통: public/은 가공 없이 결과물 루트로 복사 (public/images/a.png → images/a.png)
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

const escape = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// "2026-11-14T18:00" → "2026년 11월 14일 (토) 18:00"
const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${hhmm}`;
};
const formatTime = (iso) => (iso ? iso.slice(11, 16) : "");

// "2026-11-14T18:00" → { year: "2026", monthDay: "11.14", weekdayEn: "SATURDAY", dateText: "2026년 11월 14일 토요일" }
const dateParts = (iso) => {
  if (!iso) return { year: "", monthDay: "", weekdayEn: "", dateText: "" };
  const d = new Date(iso);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const daysEn = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return {
    year: String(d.getFullYear()),
    monthDay: `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`,
    weekdayEn: daysEn[d.getDay()],
    dateText: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`,
  };
};

const readConfig = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));

// 비어 있는 값을 경고로 알린다 (빌드는 계속 진행)
const warnEmpty = (config) => {
  const empty = [];
  (function findEmpty(obj, prefix) {
    for (const [key, value] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") findEmpty(value, p);
      else if (value === "") empty.push(p);
    }
  })(config, "");
  if (empty.length) console.warn(`⚠ 비어 있는 값 ${empty.length}개:\n  ${empty.join("\n  ")}`);
};

const render = (template, config) => {
  const startText = formatDateTime(config.datetime.start);
  const siteUrl = config.site.url.replace(/\/$/, "");

  // 템플릿에서 쓰는 파생 값. 이미 이스케이프된 HTML이면 raw에 둔다.
  const derived = {
    summary: [startText, config.location.name].filter(Boolean).join(" · "),
    startText,
    endText: formatTime(config.datetime.end),
    ogImageUrl: siteUrl ? `${siteUrl}/${config.og.image}` : config.og.image,
    startTime: formatTime(config.datetime.start),
    ...dateParts(config.datetime.start),
    // 인사말 첫 줄은 제목으로, 나머지는 본문으로 쓰는 시안용
    greetingLead: config.event.greeting.split("\n")[0],
  };
  const raw = {
    greetingBody: config.event.greeting
      .split("\n")
      .slice(1)
      .map((line) => `          <p>${escape(line)}</p>`)
      .join("\n"),
    programItems: config.program
      .map((p) => `          <li><time>${escape(p.time)}</time> ${escape(p.title)}${p.detail ? ` <small>${escape(p.detail)}</small>` : ""}</li>`)
      .join("\n"),
  };

  const lookup = (key) => {
    if (key in raw) return raw[key];
    if (key in derived) return escape(derived[key]);
    const value = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), config);
    if (value === undefined) throw new Error(`템플릿의 {{${key}}}에 해당하는 값이 config에 없습니다`);
    // 줄바꿈은 <br>로
    return escape(value).replace(/\n/g, "<br />");
  };

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => lookup(key));
};

// templateDir(index.html + 기타 파일) + public/ → outDir
const buildPage = (templateDir, config, outDir) => {
  const html = render(fs.readFileSync(path.join(templateDir, "index.html"), "utf8"), config);
  fs.rmSync(outDir, { recursive: true, force: true });
  if (fs.existsSync(PUBLIC)) fs.cpSync(PUBLIC, outDir, { recursive: true });
  fs.cpSync(templateDir, outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
};

if (process.argv.includes("--variants")) {
  const VARIANTS = path.join(ROOT, "variants");
  const DIST = path.join(ROOT, "dist-variants");
  const config = readConfig("config.sample.json");
  const names = fs
    .readdirSync(VARIANTS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(VARIANTS, e.name, "index.html")))
    .map((e) => e.name)
    .sort();

  fs.rmSync(DIST, { recursive: true, force: true });
  for (const name of names) buildPage(path.join(VARIANTS, name), config, path.join(DIST, name));

  const links = names.map((n) => `      <li><a href="${n}/index.html">${escape(n)}</a></li>`).join("\n");
  fs.writeFileSync(
    path.join(DIST, "index.html"),
    `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>초청장 시안 목록</title>
  </head>
  <body>
    <h1>초청장 시안 목록</h1>
    <ul>
${links}
    </ul>
  </body>
</html>
`,
  );
  console.log(`✔ dist-variants/ 생성 완료 (${names.length}개: ${names.join(", ")})`);
} else {
  const config = readConfig("config.json");
  warnEmpty(config);
  buildPage(path.join(ROOT, "src"), config, path.join(ROOT, "dist"));
  console.log("✔ dist/ 생성 완료");
}
