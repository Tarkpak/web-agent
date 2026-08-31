import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import JSZip, { type JSZipObject } from "jszip";
import type {
  PresentationBrand,
  PresentationMasterDecoration,
  PresentationMasterProfile,
} from "@/lib/artifacts";

const MAX_ENTRIES = 1_000;
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;
const MEDIA_TYPES = new Set(["png", "jpg", "jpeg", "gif"]);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

type XmlNode = Record<string, unknown>;

function records(value: unknown): XmlNode[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is XmlNode => typeof item === "object" && item !== null,
  );
}

function record(value: unknown): XmlNode | undefined {
  return records(value)[0];
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const node = record(value);
  return node ? textValue(node["#text"]) : "";
}

function attr(node: XmlNode | undefined, name: string) {
  const value = node?.[name];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function safeHex(value: string | undefined, fallback = "#000000") {
  return value && /^[0-9A-Fa-f]{6}$/.test(value) ? `#${value.toUpperCase()}` : fallback;
}

function zipSize(entry: JSZipObject) {
  const internal = entry as JSZipObject & { _data?: { uncompressedSize?: number } };
  return internal._data?.uncompressedSize ?? 0;
}

function normalizeZipPath(value: string) {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (normalized.startsWith("../") || normalized.startsWith("/") || normalized.includes("/../")) {
    throw new Error("The PowerPoint contains an unsafe package path.");
  }
  return normalized;
}

function resolveRelationshipPath(ownerPath: string, target: string) {
  return normalizeZipPath(path.posix.join(path.posix.dirname(ownerPath), target));
}

async function readXml(zip: JSZip, fileName: string) {
  const entry = zip.file(fileName);
  if (!entry) throw new Error(`Required PowerPoint part is missing: ${fileName}`);
  return xmlParser.parse(await entry.async("string")) as XmlNode;
}

async function relationships(zip: JSZip, ownerPath: string) {
  const relPath = path.posix.join(
    path.posix.dirname(ownerPath),
    "_rels",
    `${path.posix.basename(ownerPath)}.rels`,
  );
  const entry = zip.file(relPath);
  if (!entry) return new Map<string, string>();
  const parsed = xmlParser.parse(await entry.async("string")) as XmlNode;
  const root = record(parsed.Relationships);
  return new Map(
    records(root?.Relationship)
      .map((relationship) => {
        const id = attr(relationship, "Id");
        const target = attr(relationship, "Target");
        return id && target ? [id, resolveRelationshipPath(ownerPath, target)] : undefined;
      })
      .filter((value): value is [string, string] => Boolean(value)),
  );
}

function parseTheme(theme: XmlNode) {
  const root = record(theme.theme);
  const elements = record(root?.themeElements);
  const scheme = record(elements?.clrScheme);
  const colors = new Map<string, string>();
  for (const [name, rawColor] of Object.entries(scheme ?? {})) {
    if (name === "name") continue;
    const color = record(rawColor);
    const rgb = attr(record(color?.srgbClr), "val") ?? attr(record(color?.sysClr), "lastClr");
    if (rgb) colors.set(name, safeHex(rgb));
  }
  const fontScheme = record(elements?.fontScheme);
  const major = record(fontScheme?.majorFont);
  const minor = record(fontScheme?.minorFont);
  return {
    colors,
    fonts: {
      major: attr(record(major?.latin), "typeface") || attr(record(major?.ea), "typeface"),
      minor: attr(record(minor?.latin), "typeface") || attr(record(minor?.ea), "typeface"),
    },
  };
}

function resolveColor(node: unknown, colors: Map<string, string>, fallback: string) {
  const fill = record(node);
  const direct = attr(record(fill?.srgbClr), "val");
  if (direct) return safeHex(direct, fallback);
  const scheme = attr(record(fill?.schemeClr), "val");
  return (scheme && colors.get(scheme)) || fallback;
}

function geometry(node: XmlNode, sourceWidth: number, sourceHeight: number) {
  const properties = record(node.spPr);
  const transform = record(properties?.xfrm) ?? record(node.xfrm);
  const offset = record(transform?.off);
  const extent = record(transform?.ext);
  const x = Number(attr(offset, "x") ?? 0);
  const y = Number(attr(offset, "y") ?? 0);
  const width = Number(attr(extent, "cx") ?? 0);
  const height = Number(attr(extent, "cy") ?? 0);
  return {
    x: (x / sourceWidth) * CANVAS_WIDTH,
    y: (y / sourceHeight) * CANVAS_HEIGHT,
    width: (width / sourceWidth) * CANVAS_WIDTH,
    height: (height / sourceHeight) * CANVAS_HEIGHT,
  };
}

function collectText(node: XmlNode) {
  const body = record(node.txBody);
  return records(body?.p)
    .flatMap((paragraph) => records(paragraph.r).map((run) => textValue(run.t)).concat(textValue(paragraph.fld)))
    .filter(Boolean)
    .join(" ");
}

function visibleObjectCount(xml: XmlNode) {
  const root = record(xml.sldLayout) ?? record(xml.sldMaster);
  const tree = record(record(root?.cSld)?.spTree);
  return records(tree?.sp).length + records(tree?.pic).length + records(tree?.cxnSp).length;
}

function slideBackground(xml: XmlNode, colors: Map<string, string>) {
  const root = record(xml.sldLayout) ?? record(xml.sldMaster);
  const background = record(record(record(root?.cSld)?.bg)?.bgPr);
  return background ? resolveColor(background.solidFill, colors, "#FFFFFF") : undefined;
}

function masterShapes(
  master: XmlNode,
  colors: Map<string, string>,
  fonts: { major?: string; minor?: string },
  sourceWidth: number,
  sourceHeight: number,
) {
  const root = record(master.sldMaster) ?? record(master.sldLayout);
  const tree = record(record(root?.cSld)?.spTree);
  const decorations: PresentationMasterDecoration[] = [];
  for (const shape of records(tree?.sp)) {
    const placeholder = record(record(record(shape.nvSpPr)?.nvPr)?.ph);
    if (placeholder) continue;
    const frame = geometry(shape, sourceWidth, sourceHeight);
    if (frame.width <= 0 || frame.height <= 0) continue;
    const properties = record(shape.spPr);
    const text = collectText(shape);
    if (text) {
      const paragraph = record(record(shape.txBody)?.p);
      const run = record(paragraph?.r);
      const runProperties = record(run?.rPr) ?? record(paragraph?.defRPr);
      const size = Number(attr(runProperties, "sz") ?? 1800) / 100;
      decorations.push({
        kind: "text",
        value: text,
        ...frame,
        fontSize: Math.max(8, size),
        color: resolveColor(runProperties?.solidFill, colors, colors.get("tx1") ?? "#111827"),
        fontFamily: attr(record(runProperties?.latin), "typeface") || fonts.minor || "Aptos",
        weight: attr(runProperties, "b") === "1" ? 700 : 400,
        align: attr(record(paragraph?.pPr), "algn") === "ctr" ? "center" : attr(record(paragraph?.pPr), "algn") === "r" ? "right" : "left",
      });
      continue;
    }
    const preset = attr(record(record(properties?.prstGeom)), "prst");
    const color = resolveColor(properties?.solidFill, colors, colors.get("accent1") ?? "#2563EB");
    if (preset === "ellipse") decorations.push({ kind: "ellipse", ...frame, color });
    else if (preset === "line") {
      const line = record(properties?.ln);
      decorations.push({ kind: "line", ...frame, color: resolveColor(line?.solidFill, colors, color), lineWidth: Math.max(1, Number(attr(line, "w") ?? 12700) / 12700) });
    } else if (properties?.solidFill) decorations.push({ kind: "rect", ...frame, color });
  }
  return decorations;
}

export async function importPresentationTemplate(options: {
  buffer: Buffer;
  sourceName: string;
  outputRoot: string;
}) {
  const { buffer, sourceName, outputRoot } = options;
  if (!sourceName.toLowerCase().endsWith(".pptx")) throw new Error("Choose a .pptx PowerPoint file.");
  if (buffer.byteLength > 10 * 1024 * 1024) throw new Error("PowerPoint templates are limited to 10 MB.");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true, createFolders: false });
  } catch {
    throw new Error("This file is not a valid PowerPoint OOXML package.");
  }
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ENTRIES) throw new Error("The PowerPoint package contains too many files.");
  let totalSize = 0;
  for (const entry of entries) {
    normalizeZipPath(entry.name);
    totalSize += zipSize(entry);
    if (totalSize > MAX_UNCOMPRESSED_BYTES) throw new Error("The expanded PowerPoint package is too large.");
  }
  if (!zip.file("[Content_Types].xml") || !zip.file("ppt/presentation.xml")) {
    throw new Error("This file is not a valid PowerPoint OOXML package.");
  }

  const id = randomUUID();
  const assetDirectory = path.join(outputRoot, id);
  await mkdir(assetDirectory, { recursive: true });
  await writeFile(path.join(assetDirectory, "source.pptx"), buffer);

  const presentation = await readXml(zip, "ppt/presentation.xml");
  const size = record(record(presentation.presentation)?.sldSz);
  const sourceWidth = Number(attr(size, "cx") ?? 12192000);
  const sourceHeight = Number(attr(size, "cy") ?? 6858000);
  if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error("The PowerPoint slide size is invalid.");

  const themeEntry = entries.find((entry) => /^ppt\/theme\/theme\d+\.xml$/i.test(entry.name));
  const theme: {
    colors: Map<string, string>;
    fonts: { major?: string; minor?: string };
  } = themeEntry
    ? parseTheme(await readXml(zip, themeEntry.name))
    : { colors: new Map<string, string>(), fonts: {} };
  const warnings: string[] = [];
  if (!themeEntry) warnings.push("No theme definition was found; default colors and fonts will be used.");

  const masterEntries = entries.filter((entry) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/i.test(entry.name));
  const layoutEntries = entries.filter((entry) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/i.test(entry.name));
  if (!masterEntries.length) throw new Error("The PowerPoint does not contain a slide master.");
  const masters = await Promise.all(masterEntries.map(async (entry) => ({ entry, xml: await readXml(zip, entry.name) })));
  const layouts = await Promise.all(layoutEntries.map((entry) => readXml(zip, entry.name)));
  const masterNames = masters.map(({ xml }, index) => attr(record(record(xml.sldMaster)?.cSld), "name") || `Master ${index + 1}`);
  const layoutNames = layouts.map((xml, index) => attr(record(record(xml.sldLayout)?.cSld), "name") || `Layout ${index + 1}`);
  const selectedLayoutIndex = layouts.reduce(
    (selected, layout, index) => visibleObjectCount(layout) > visibleObjectCount(layouts[selected]) ? index : selected,
    0,
  );
  const selectedLayout = layouts[selectedLayoutIndex];
  const selectedLayoutEntry = layoutEntries[selectedLayoutIndex];
  const decorations = masterShapes(masters[0].xml, theme.colors, theme.fonts, sourceWidth, sourceHeight);
  if (selectedLayout) {
    decorations.push(...masterShapes(selectedLayout, theme.colors, theme.fonts, sourceWidth, sourceHeight));
  }
  if (layoutNames.length > 1 && selectedLayout) warnings.push(`Applied master decorations from layout “${layoutNames[selectedLayoutIndex]}”.`);
  if (masterEntries.length > 1) warnings.push(`Detected ${masterEntries.length} masters; decorations from the first master are applied.`);

  let assetCount = 0;
  const savedMedia = new Map<string, string>();
  const pictureSources = [
    { owner: masters[0].entry.name, xml: masters[0].xml, rootName: "sldMaster" },
    ...(selectedLayoutEntry && selectedLayout
      ? [{ owner: selectedLayoutEntry.name, xml: selectedLayout, rootName: "sldLayout" }]
      : []),
  ];
  for (const source of pictureSources) {
    const rels = await relationships(zip, source.owner);
    const root = record(source.xml[source.rootName]);
    const tree = record(record(root?.cSld)?.spTree);
    for (const picture of records(tree?.pic)) {
      const blip = record(record(record(picture.blipFill)?.blip));
      const relationshipId = attr(blip, "embed");
      const mediaPath = relationshipId ? rels.get(relationshipId) : undefined;
      const media = mediaPath ? zip.file(mediaPath) : undefined;
      const extension = mediaPath?.split(".").pop()?.toLowerCase();
      if (!media || !extension || !MEDIA_TYPES.has(extension)) {
        warnings.push("A master image used an unsupported or missing media format and was skipped.");
        continue;
      }
      if (zipSize(media) > MAX_MEDIA_BYTES) {
        warnings.push("A master image exceeded the 12 MB media limit and was skipped.");
        continue;
      }
      const frame = geometry(picture, sourceWidth, sourceHeight);
      if (frame.width <= 0 || frame.height <= 0) continue;
      let assetId = savedMedia.get(mediaPath!);
      if (!assetId) {
        assetId = `asset-${++assetCount}.${extension === "jpeg" ? "jpg" : extension}`;
        await writeFile(path.join(assetDirectory, assetId), await media.async("nodebuffer"));
        savedMedia.set(mediaPath!, assetId);
      }
      decorations.push({
        kind: "image",
        ...frame,
        assetId,
        assetUrl: `/api/presentations/templates/assets/${id}/${assetId}`,
      });
    }
  }

  const palette = [...new Set(theme.colors.values())];
  const importedBackground =
    (selectedLayout && slideBackground(selectedLayout, theme.colors)) ||
    slideBackground(masters[0].xml, theme.colors) ||
    theme.colors.get("lt1") ||
    palette[0];
  const brand: PresentationBrand = {
    name: path.basename(sourceName, path.extname(sourceName)),
    titleFont: theme.fonts.major,
    bodyFont: theme.fonts.minor,
    background: importedBackground,
    foreground: theme.colors.get("dk1") ?? palette[1],
    muted: theme.colors.get("dk2") ?? theme.colors.get("lt2") ?? palette[2],
    accent: theme.colors.get("accent1") ?? palette[4] ?? palette[0],
    secondary: theme.colors.get("accent2") ?? palette[5] ?? palette[1],
  };
  const profile: PresentationMasterProfile = {
    id,
    sourceName,
    slideSize: { width: sourceWidth, height: sourceHeight },
    masterNames,
    layoutNames,
    colors: palette,
    fonts: theme.fonts,
    assetCount,
    decorations,
    warnings,
  };
  await writeFile(path.join(assetDirectory, "profile.json"), JSON.stringify(profile, null, 2), "utf8");
  return { brand, profile };
}
