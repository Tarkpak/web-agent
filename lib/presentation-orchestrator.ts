import type {
  PresentationLayout,
  PresentationNarrativeQuality,
  PresentationSlide,
} from "@/lib/artifacts";
import { PRESENTATION_TEMPLATES, resolvePresentationTemplate } from "@/lib/presentation-templates";

const TEMPLATE_BY_LAYOUT = new Map(
  PRESENTATION_TEMPLATES.map((template) => [template.layout, template]),
);
const TIMELINE_PATTERN =
  /(?:^|\b)(?:q[1-4]|20\d{2}|phase|stage|step|month|week|year|阶段|步骤|季度|年度|月份|周)(?:\b|$)/i;
const COMPARISON_PATTERN =
  /(?:\bvs\.?\b|versus|compared?|option\s+[ab]|before|after|对比|比较|方案[一二甲乙ab]|之前|之后)/i;
const QUOTE_PATTERN = /[“”"「」『』]|(?:^|\b)(?:said|quote|观点|引述)(?:\b|$)/i;
const CLOSING_PATTERN =
  /(?:next steps?|recommendation|decision|action|summary|conclusion|下一步|建议|决策|行动|总结|结论)/i;

function textUnits(value = "") {
  return Array.from(value).reduce(
    (total, character) => total + ((character.codePointAt(0) ?? 0) > 0xff ? 2 : 1),
    0,
  );
}

function contentText(slide: PresentationSlide) {
  return [slide.title, slide.subtitle, slide.body, ...(slide.bullets ?? [])]
    .filter(Boolean)
    .join(" ");
}

function uniqueLayouts(layouts: PresentationLayout[]) {
  return layouts.filter((layout, index) => layouts.indexOf(layout) === index);
}

function inferSection(slide: PresentationSlide, index: number, total: number) {
  if (index === 0 || slide.layout === "cover") return "Opening";
  if (index === total - 1 || slide.layout === "closing") return "Decision";
  if (slide.layout === "timeline") return "Roadmap";
  if (slide.layout === "comparison") return "Options";
  if (slide.layout === "chart" || slide.layout === "table") return "Evidence";
  if (slide.layout === "quote" || slide.layout === "statement") return "Key message";
  return "Analysis";
}

function candidates(slide: PresentationSlide, index: number, total: number) {
  if (slide.chart)
    return [
      {
        layout: "chart" as const,
        score: 100,
        reason: "Chart data requires the editable chart layout.",
      },
    ];
  if (slide.table)
    return [
      {
        layout: "table" as const,
        score: 100,
        reason: "Tabular data requires the editable table layout.",
      },
    ];
  if (index === 0)
    return [
      {
        layout: "cover" as const,
        score: 100,
        reason: "The opening page establishes the deck title and context.",
      },
    ];

  const text = contentText(slide);
  const bullets = slide.bullets?.length ?? 0;
  const bodyUnits = textUnits(slide.body);
  const results: Array<{ layout: PresentationLayout; score: number; reason: string }> = [];
  const add = (layout: PresentationLayout, score: number, reason: string) =>
    results.push({ layout, score, reason });

  if (QUOTE_PATTERN.test(text) && bodyUnits <= 260)
    add("quote", 88, "Quotation signals and concise copy suit an editorial quote page.");
  if (TIMELINE_PATTERN.test(text) && bullets >= 3 && bullets <= 5)
    add("timeline", 86, "Ordered time or stage signals suit a milestone sequence.");
  if (COMPARISON_PATTERN.test(text) && bullets >= 2)
    add("comparison", 84, "Comparison language and paired points suit a two-column contrast.");
  if (slide.body && bullets)
    add("split", 82, "A narrative paragraph and supporting points need distinct reading zones.");
  if (!slide.body && bullets >= 3)
    add("list", 78, "A concise point sequence benefits from a numbered list.");
  if (bodyUnits > 0 && bodyUnits <= 180 && bullets === 0)
    add("statement", 76, "A single concise claim benefits from a focused statement page.");
  if (index === total - 1 && CLOSING_PATTERN.test(text))
    add("closing", 90, "The final action or conclusion resolves the narrative.");
  add("split", 55, "The balanced narrative layout is the safest general-purpose fit.");
  add("list", 48, "A list layout is a viable alternate for scannable supporting points.");
  return results.sort((a, b) => b.score - a.score);
}

function splitSentences(value: string) {
  return value
    .split(/(?<=[。！？.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitBody(slide: PresentationSlide, maxUnits: number) {
  if (!slide.body || textUnits(slide.body) <= maxUnits) return [slide];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of splitSentences(slide.body)) {
    if (current && textUnits(`${current} ${sentence}`) > maxUnits) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  if (chunks.length <= 1) {
    const characters = Array.from(slide.body);
    for (let start = 0; start < characters.length; start += Math.max(1, Math.floor(maxUnits / 2))) {
      chunks.push(characters.slice(start, start + Math.floor(maxUnits / 2)).join(""));
    }
    chunks.shift();
  }
  return chunks.map((body, index) => ({
    ...slide,
    title: index === 0 ? slide.title : `${slide.title} (continued)`,
    body,
    bullets: index === 0 ? slide.bullets : undefined,
  }));
}

function applyCapacity(slide: PresentationSlide) {
  const template = resolvePresentationTemplate(slide.layout ?? "split", slide.templateId);
  const bulletLimit = template.slots.bullets?.maxItems;
  const bulletCharacterLimit = template.slots.bullets?.maxCharacters;
  if ((bulletLimit || bulletCharacterLimit) && slide.bullets?.length) {
    const bullets = slide.bullets ?? [];
    const groups: string[][] = [];
    let group: string[] = [];
    for (const bullet of bullets) {
      const exceedsItems = bulletLimit && group.length >= bulletLimit;
      const exceedsCharacters =
        bulletCharacterLimit &&
        group.length > 0 &&
        textUnits([...group, bullet].join("")) > bulletCharacterLimit;
      if (exceedsItems || exceedsCharacters) {
        groups.push(group);
        group = [];
      }
      group.push(bullet);
    }
    if (group.length) groups.push(group);
    if (groups.length > 1)
      return groups.map((pageBullets, index) => ({
        ...slide,
        title: index === 0 ? slide.title : `${slide.title} (continued)`,
        body: index === 0 ? slide.body : undefined,
        bullets: pageBullets,
      }));
  }
  const bodyLimit = template.slots.body?.maxCharacters;
  if (bodyLimit && slide.body) return splitBody(slide, bodyLimit);
  return [slide];
}

function scoreDeck(slides: PresentationSlide[]): PresentationNarrativeQuality {
  const hasCover = slides[0]?.layout === "cover";
  const hasResolution =
    slides.at(-1)?.layout === "closing" ||
    CLOSING_PATTERN.test(contentText(slides.at(-1) ?? { title: "" }));
  const layouts = slides.map((slide) => slide.layout ?? "split");
  const adjacentRepeats = layouts
    .slice(1)
    .filter(
      (layout, index) =>
        layout === layouts[index] && !slides[index + 1]?.title.endsWith("(continued)"),
    ).length;
  const uniqueRatio = new Set(layouts).size / Math.max(1, Math.min(layouts.length, 6));
  const overflowSlides = slides.filter((slide) => {
    const template = TEMPLATE_BY_LAYOUT.get(slide.layout ?? "split");
    if (!template) return false;
    return Object.entries(template.slots).some(([slot, limits]) => {
      if (slot === "body") return textUnits(slide.body) > (limits.maxCharacters ?? Infinity);
      if (slot === "bullets")
        return (
          (slide.bullets?.length ?? 0) > (limits.maxItems ?? Infinity) ||
          textUnits((slide.bullets ?? []).join("")) > (limits.maxCharacters ?? Infinity)
        );
      return false;
    });
  }).length;
  const structure = Math.max(0, Math.min(100, 55 + (hasCover ? 20 : 0) + (hasResolution ? 25 : 0)));
  const pacing = Math.max(0, Math.round(100 - adjacentRepeats * 18));
  const density = Math.max(0, Math.round(100 - overflowSlides * 30));
  const variety = Math.max(0, Math.min(100, Math.round(uniqueRatio * 100)));
  const score = Math.round(structure * 0.3 + pacing * 0.25 + density * 0.3 + variety * 0.15);
  const strengths = [
    hasCover ? "The deck opens with a dedicated framing page." : "",
    overflowSlides === 0 ? "All mapped content stays within template capacity budgets." : "",
    adjacentRepeats === 0 ? "The deck avoids unnecessary adjacent layout repetition." : "",
  ].filter(Boolean);
  const suggestions = [
    !hasResolution ? "End with a clear conclusion, decision, or next action." : "",
    adjacentRepeats > 0 ? "Review repeated adjacent layouts and vary the visual cadence." : "",
    overflowSlides > 0 ? "Split or shorten dense pages before export." : "",
  ].filter(Boolean);
  return { score, dimensions: { structure, pacing, density, variety }, strengths, suggestions };
}

export function orchestratePresentation(slides: PresentationSlide[]) {
  const arranged = slides.flatMap((sourceSlide, index) => {
    const ranked = candidates(sourceSlide, index, slides.length);
    const selected = ranked[0];
    const slide = {
      ...sourceSlide,
      layout: selected.layout,
      templateId: TEMPLATE_BY_LAYOUT.get(selected.layout)?.id,
      layoutReason: selected.reason,
      layoutAlternatives: uniqueLayouts(ranked.slice(1).map((candidate) => candidate.layout)).slice(
        0,
        3,
      ),
    };
    return applyCapacity(slide);
  });
  if (arranged.length > 40)
    throw new Error(
      "Automatic layout would exceed the 40-slide limit. Shorten the source or split it into multiple decks.",
    );
  const sectioned = arranged.map((slide, index) => ({
    ...slide,
    section: slide.section ?? inferSection(slide, index, arranged.length),
  }));
  return { slides: sectioned, narrativeQuality: scoreDeck(sectioned) };
}

export function assessPresentation(slides: PresentationSlide[]) {
  return scoreDeck(slides);
}

export function chooseAlternateLayout(slide: PresentationSlide, direction = 1) {
  const fallbackLayouts: PresentationLayout[] = ["split", "list", "statement"];
  const layouts = (
    slide.layoutAlternatives?.length ? slide.layoutAlternatives : fallbackLayouts
  ).filter(
    (layout) => !(layout === "chart" && !slide.chart) && !(layout === "table" && !slide.table),
  );
  const next = layouts[Math.abs(direction) % layouts.length] ?? "split";
  return {
    ...slide,
    layout: next,
    templateId: TEMPLATE_BY_LAYOUT.get(next)?.id,
    layoutReason: "Selected as an alternate composition for the same content.",
    layoutAlternatives: [
      slide.layout ?? "split",
      ...layouts.filter((layout) => layout !== next),
    ].slice(0, 3),
  };
}
