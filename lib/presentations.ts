import PptxGenJS from "pptxgenjs";
import type { PresentationSlide } from "@/lib/artifacts";

type PresentationTheme = "tech" | "light" | "dark";

const THEMES = {
  tech: {
    background: "07111F",
    foreground: "F8FAFC",
    muted: "B8C4D4",
    accent: "22D3EE",
    secondary: "38BDF8",
  },
  dark: {
    background: "111111",
    foreground: "FAFAFA",
    muted: "B8B8B8",
    accent: "A3E635",
    secondary: "FACC15",
  },
  light: {
    background: "F8FAFC",
    foreground: "111827",
    muted: "475569",
    accent: "0891B2",
    secondary: "2563EB",
  },
} as const;

function addFooter(
  slide: PptxGenJS.Slide,
  deckTitle: string,
  page: number,
  colors: (typeof THEMES)[PresentationTheme],
) {
  slide.addText(deckTitle, {
    x: 0.7,
    y: 7.05,
    w: 6.5,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 7,
    color: colors.muted,
    margin: 0,
    breakLine: false,
  });
  slide.addText(String(page).padStart(2, "0"), {
    x: 12,
    y: 6.98,
    w: 0.6,
    h: 0.22,
    fontFace: "Aptos Display",
    fontSize: 9,
    bold: true,
    color: colors.accent,
    align: "right",
    margin: 0,
  });
}

export async function writePresentation({
  outputPath,
  title,
  subtitle,
  theme = "tech",
  slides,
}: {
  outputPath: string;
  title: string;
  subtitle?: string;
  theme?: PresentationTheme;
  slides: PresentationSlide[];
}) {
  const pptx = new PptxGenJS();
  const colors = THEMES[theme] ?? THEMES.tech;

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Agent Shell";
  pptx.subject = title;
  pptx.title = title;
  pptx.company = "Agent Shell";
  pptx.lang = "zh-CN";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: "zh-CN",
  };
  pptx.defineSlideMaster({
    title: "AGENT_SHELL",
    background: { color: colors.background },
    objects: [
      {
        line: {
          x: 0,
          y: 0,
          w: 13.333,
          h: 0,
          line: { color: colors.accent, width: 5 },
        },
      },
    ],
    slideNumber: { x: 12, y: 6.98, w: 0.6, h: 0.22, color: colors.accent },
  });

  slides.forEach((item, index) => {
    const slide = pptx.addSlide("AGENT_SHELL");
    slide.background = { color: colors.background };

    if (index === 0) {
      slide.addText(item.title || title, {
        x: 0.85,
        y: 1.65,
        w: 10.8,
        h: 1.3,
        fontFace: "Aptos Display",
        fontSize: 40,
        bold: true,
        color: colors.foreground,
        margin: 0,
        breakLine: false,
        fit: "shrink",
      });
      slide.addShape(pptx.ShapeType.line, {
        x: 0.85,
        y: 3.2,
        w: 1.15,
        h: 0,
        line: { color: colors.accent, width: 4 },
      });
      slide.addText(item.subtitle || subtitle || "", {
        x: 0.85,
        y: 3.55,
        w: 9.8,
        h: 0.65,
        fontFace: "Aptos",
        fontSize: 20,
        color: colors.muted,
        margin: 0,
        fit: "shrink",
      });
      if (item.body) {
        slide.addText(item.body, {
          x: 0.85,
          y: 4.55,
          w: 8.6,
          h: 0.8,
          fontFace: "Aptos",
          fontSize: 14,
          color: colors.muted,
          margin: 0,
          fit: "shrink",
        });
      }
      addFooter(slide, title, index + 1, colors);
      return;
    }

    slide.addText(String(index + 1).padStart(2, "0"), {
      x: 0.75,
      y: 0.45,
      w: 0.6,
      h: 0.3,
      fontFace: "Aptos Display",
      fontSize: 11,
      bold: true,
      color: colors.accent,
      margin: 0,
    });
    slide.addText(item.title, {
      x: 0.75,
      y: 0.95,
      w: 11.5,
      h: 0.65,
      fontFace: "Aptos Display",
      fontSize: 28,
      bold: true,
      color: colors.foreground,
      margin: 0,
      breakLine: false,
      fit: "shrink",
    });
    if (item.subtitle) {
      slide.addText(item.subtitle, {
        x: 0.75,
        y: 1.72,
        w: 10.8,
        h: 0.35,
        fontFace: "Aptos",
        fontSize: 14,
        color: colors.secondary,
        margin: 0,
        fit: "shrink",
      });
    }

    const contentTop = item.subtitle ? 2.35 : 2.05;
    if (item.body) {
      slide.addText(item.body, {
        x: 0.75,
        y: contentTop,
        w: item.bullets?.length ? 4.45 : 10.8,
        h: 3.8,
        fontFace: "Aptos",
        fontSize: 18,
        color: colors.muted,
        valign: "mid",
        margin: 0.04,
        breakLine: false,
        fit: "shrink",
      });
    }
    if (item.bullets?.length) {
      const x = item.body ? 5.75 : 0.85;
      const width = item.body ? 6.45 : 11.15;
      const bulletRuns = item.bullets.slice(0, 6).map((bullet) => ({
        text: bullet,
        options: {
          bullet: { indent: 18 },
          hanging: 4,
          breakLine: true,
          paraSpaceAfterPt: 15,
        },
      }));
      slide.addText(bulletRuns, {
        x,
        y: contentTop,
        w: width,
        h: 3.95,
        fontFace: "Aptos",
        fontSize: 18,
        color: colors.foreground,
        breakLine: false,
        valign: "mid",
        margin: 0.08,
        fit: "shrink",
      });
    }
    addFooter(slide, title, index + 1, colors);
  });

  await pptx.writeFile({ fileName: outputPath });
}
