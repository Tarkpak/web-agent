import PptxGenJS from "pptxgenjs";
import type { PresentationDesign, PresentationSlide } from "@/lib/artifacts";

export type PresentationTheme = "tech" | "light" | "dark";

const SLIDE_WIDTH = 1600;
const SLIDE_HEIGHT = 900;

const THEMES = {
  tech: { background: "#07111F", foreground: "#F8FAFC", muted: "#B8C4D4", accent: "#22D3EE", secondary: "#38BDF8" },
  dark: { background: "#111111", foreground: "#FAFAFA", muted: "#B8B8B8", accent: "#A3E635", secondary: "#FACC15" },
  light: { background: "#F8FAFC", foreground: "#111827", muted: "#475569", accent: "#0891B2", secondary: "#2563EB" },
} as const;

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
    return entities[character];
  });
}

function textLength(value: string) {
  return Array.from(value).reduce((total, character) => total + (/[^\u0000-\u00ff]/.test(character) ? 2 : 1), 0);
}

function wrapText(value: string, maxUnits: number, maxLines: number) {
  const lines: string[] = [];
  let current = "";
  let units = 0;
  for (const character of Array.from(value.trim())) {
    const size = /[^\u0000-\u00ff]/.test(character) ? 2 : 1;
    if (units + size > maxUnits && current) {
      lines.push(current.trim());
      current = "";
      units = 0;
      if (lines.length === maxLines) break;
    }
    current += character;
    units += size;
  }
  if (current && lines.length < maxLines) lines.push(current.trim());
  const consumed = lines.reduce((total, line) => total + textLength(line), 0);
  if (consumed < textLength(value.trim()) && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.。,:：;；!！?？\s]+$/, "")}...`;
  }
  return lines;
}

function textBlock({ value, x, y, width, fontSize, color, weight = 400, maxLines = 4, lineHeight = 1.35, fontFamily = "Aptos, 'Microsoft YaHei', Arial, sans-serif" }: {
  value: string; x: number; y: number; width: number; fontSize: number; color: string; weight?: number; maxLines?: number; lineHeight?: number; fontFamily?: string;
}) {
  const maxUnits = Math.max(8, Math.floor((width / fontSize) * 1.9));
  const lines = wrapText(value, maxUnits, maxLines);
  return `<text x="${x}" y="${y}" fill="${color}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : Math.round(fontSize * lineHeight)}">${escapeXml(line)}</tspan>`).join("")}</text>`;
}

export function renderPresentationSlide({ deckTitle, deckSubtitle, theme = "tech", design, slide, index }: {
  deckTitle: string; deckSubtitle?: string; theme?: PresentationTheme; design?: PresentationDesign; slide: PresentationSlide; index: number;
}) {
  const fallback = THEMES[theme] ?? THEMES.tech;
  const colors = design ?? fallback;
  const fontFamily = design?.typography === "editorial"
    ? "Georgia, 'Microsoft YaHei', serif"
    : design?.typography === "technical"
      ? "'Aptos Mono', Consolas, 'Microsoft YaHei', monospace"
      : design?.typography === "friendly"
        ? "'Arial Rounded MT Bold', Aptos, 'Microsoft YaHei', sans-serif"
        : "Aptos, 'Microsoft YaHei', Arial, sans-serif";
  const densityScale = design?.density === "airy" ? 1.12 : design?.density === "dense" ? 0.9 : 1;
  const page = String(index + 1).padStart(2, "0");
  const layout = slide.layout ?? (index === 0 ? "cover" : "split");
  const elements: string[] = [
    `<rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="${colors.background}"/>`,
  ];

  const addText = (options: Parameters<typeof textBlock>[0]) => elements.push(textBlock({ ...options, fontFamily }));
  const addStandardHeader = () => {
    addText({ value: page, x: 90, y: 78, width: 80, fontSize: 18, color: colors.accent, weight: 700, maxLines: 1 });
    addText({ value: slide.title, x: 90, y: 175, width: 1380, fontSize: Math.round(50 * densityScale), color: colors.foreground, weight: 700, maxLines: 1 });
    if (slide.subtitle) addText({ value: slide.subtitle, x: 90, y: 235, width: 1320, fontSize: 24, color: colors.secondary, maxLines: 1 });
  };
  const bullets = slide.bullets?.slice(0, 6) ?? [];

  if (layout === "cover") {
    const alignedRight = design?.composition === "cinematic";
    const x = alignedRight ? 650 : 110;
    elements.push(`<rect x="${alignedRight ? 70 : 1360}" y="0" width="170" height="${SLIDE_HEIGHT}" fill="${colors.accent}" opacity="0.92"/>`);
    addText({ value: slide.title || deckTitle, x, y: 325, width: 820, fontSize: Math.round(76 * densityScale), color: colors.foreground, weight: 700, maxLines: 2, lineHeight: 1.12 });
    if (slide.subtitle || deckSubtitle) addText({ value: slide.subtitle || deckSubtitle || "", x, y: 485, width: 800, fontSize: 31, color: colors.muted, maxLines: 2 });
    elements.push(`<rect x="${x}" y="385" width="150" height="7" fill="${colors.accent}"/>`);
  } else if (layout === "statement") {
    addText({ value: page, x: 90, y: 80, width: 80, fontSize: 18, color: colors.accent, weight: 700, maxLines: 1 });
    addText({ value: slide.title, x: 150, y: 390, width: 1290, fontSize: Math.round(82 * densityScale), color: colors.foreground, weight: 700, maxLines: 3, lineHeight: 1.08 });
    if (slide.body) addText({ value: slide.body, x: 155, y: 650, width: 1050, fontSize: 26, color: colors.muted, maxLines: 3 });
  } else if (layout === "quote") {
    addText({ value: "“", x: 105, y: 245, width: 160, fontSize: 170, color: colors.accent, weight: 700, maxLines: 1 });
    addText({ value: slide.body || slide.title, x: 250, y: 340, width: 1120, fontSize: Math.round(54 * densityScale), color: colors.foreground, weight: 500, maxLines: 5, lineHeight: 1.28 });
    if (slide.subtitle) addText({ value: slide.subtitle, x: 255, y: 700, width: 850, fontSize: 23, color: colors.muted, maxLines: 1 });
  } else if (layout === "closing") {
    elements.push(`<circle cx="800" cy="440" r="260" fill="${colors.accent}" opacity="0.09"/>`);
    addText({ value: slide.title, x: 260, y: 400, width: 1080, fontSize: Math.round(72 * densityScale), color: colors.foreground, weight: 700, maxLines: 2, lineHeight: 1.12 });
    if (slide.body || slide.subtitle) addText({ value: slide.body || slide.subtitle || "", x: 350, y: 555, width: 900, fontSize: 28, color: colors.muted, maxLines: 3 });
  } else if (layout === "timeline") {
    addStandardHeader();
    elements.push(`<line x1="150" y1="520" x2="1450" y2="520" stroke="${colors.muted}" stroke-width="3" opacity="0.45"/>`);
    bullets.slice(0, 5).forEach((bullet, bulletIndex) => {
      const x = 170 + bulletIndex * (1260 / Math.max(1, bullets.length - 1));
      elements.push(`<circle cx="${x}" cy="520" r="13" fill="${colors.accent}"/>`);
      addText({ value: String(bulletIndex + 1).padStart(2, "0"), x: x - 20, y: 475, width: 50, fontSize: 17, color: colors.secondary, weight: 700, maxLines: 1 });
      addText({ value: bullet, x: x - 105, y: bulletIndex % 2 ? 590 : 620, width: 210, fontSize: 21, color: colors.foreground, maxLines: 4, lineHeight: 1.3 });
    });
  } else if (layout === "comparison") {
    addStandardHeader();
    elements.push(`<line x1="800" y1="300" x2="800" y2="745" stroke="${colors.muted}" stroke-width="2" opacity="0.35"/>`);
    [bullets.slice(0, Math.ceil(bullets.length / 2)), bullets.slice(Math.ceil(bullets.length / 2))].forEach((group, column) => {
      addText({ value: column === 0 ? (slide.subtitle || "Option A") : "Option B", x: 115 + column * 760, y: 345, width: 580, fontSize: 27, color: column === 0 ? colors.accent : colors.secondary, weight: 700, maxLines: 1 });
      group.forEach((bullet, bulletIndex) => addText({ value: bullet, x: 115 + column * 760, y: 425 + bulletIndex * 105, width: 590, fontSize: 25, color: colors.foreground, maxLines: 3 }));
    });
  } else if (layout === "list") {
    addStandardHeader();
    bullets.forEach((bullet, bulletIndex) => {
      const y = 330 + bulletIndex * 82;
      addText({ value: String(bulletIndex + 1).padStart(2, "0"), x: 110, y, width: 60, fontSize: 18, color: colors.accent, weight: 700, maxLines: 1 });
      addText({ value: bullet, x: 215, y, width: 1130, fontSize: 29, color: colors.foreground, maxLines: 2 });
      elements.push(`<line x1="210" y1="${y + 27}" x2="1420" y2="${y + 27}" stroke="${colors.muted}" stroke-width="1" opacity="0.22"/>`);
    });
  } else {
    addStandardHeader();
    const top = slide.subtitle ? 330 : 290;
    if (slide.body) addText({ value: slide.body, x: 90, y: top + 35, width: bullets.length ? 530 : 1320, fontSize: Math.round(28 * densityScale), color: colors.muted, maxLines: 10, lineHeight: 1.5 });
    bullets.forEach((bullet, bulletIndex) => {
      const x = slide.body ? 760 : 130;
      const y = top + 18 + bulletIndex * 86;
      elements.push(`<rect x="${x}" y="${y - 13}" width="5" height="48" fill="${colors.accent}"/>`);
      addText({ value: bullet, x: x + 28, y: y + 18, width: slide.body ? 690 : 1260, fontSize: 27, color: colors.foreground, maxLines: 2, lineHeight: 1.25 });
    });
  }

  elements.push(textBlock({ value: deckTitle, x: 82, y: 858, width: 790, fontSize: 14, color: colors.muted, maxLines: 1 }));
  elements.push(textBlock({ value: page, x: 1460, y: 858, width: 70, fontSize: 18, color: colors.accent, weight: 700, maxLines: 1 }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}">${elements.join("")}</svg>`;
}

export async function writePresentation({ outputPath, title, subtitle, theme = "tech", design, slides }: {
  outputPath: string; title: string; subtitle?: string; theme?: PresentationTheme; design?: PresentationDesign; slides: PresentationSlide[];
}) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Agent Shell";
  pptx.subject = title;
  pptx.title = title;
  pptx.company = "Agent Shell";
  slides.forEach((slideData, index) => {
    const slide = pptx.addSlide();
    const svg = renderPresentationSlide({ deckTitle: title, deckSubtitle: subtitle, theme, design, slide: slideData, index });
    slide.addImage({ data: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, x: 0, y: 0, w: 13.333, h: 7.5 });
  });
  await pptx.writeFile({ fileName: outputPath });
}
