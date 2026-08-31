import { lstat, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const TASK_FILES_ROOT = path.join(process.cwd(), "task-files");
const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TASK_UPLOAD_BYTES = 10 * 1024 * 1024;

const MIME_TYPES: Record<string, string> = {
  ".bash": "text/x-shellscript; charset=utf-8",
  ".c": "text/x-c; charset=utf-8",
  ".cjs": "text/javascript; charset=utf-8",
  ".cpp": "text/x-c++; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".env": "text/plain; charset=utf-8",
  ".gif": "image/gif",
  ".go": "text/x-go; charset=utf-8",
  ".h": "text/x-c; charset=utf-8",
  ".hpp": "text/x-c++; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ini": "text/plain; charset=utf-8",
  ".java": "text/x-java; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/jsx; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".ps1": "text/plain; charset=utf-8",
  ".py": "text/x-python; charset=utf-8",
  ".rb": "text/x-ruby; charset=utf-8",
  ".rs": "text/x-rust; charset=utf-8",
  ".sh": "text/x-shellscript; charset=utf-8",
  ".sql": "text/x-sql; charset=utf-8",
  ".svelte": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".text": "text/plain; charset=utf-8",
  ".toml": "text/plain; charset=utf-8",
  ".ts": "text/typescript; charset=utf-8",
  ".tsx": "text/tsx; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".vue": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
};

export type TaskFileInfo = {
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  mimeType: string;
};

export function taskFileMimeType(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

export function taskFileKind(filePath: string, mimeType = taskFileMimeType(filePath)) {
  const extension = path.extname(filePath).toLowerCase();
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType === "application/pdf") return "pdf" as const;
  if (extension === ".md") return "markdown" as const;
  if (extension === ".html" || extension === ".htm") return "html" as const;
  if (mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("xml")) {
    return [".txt", ".text", ".csv"].includes(extension) ? ("text" as const) : ("code" as const);
  }
  return "file" as const;
}

export function normalizeTaskFilePath(input: string, allowEmpty = false) {
  const normalized = input.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if ((!normalized && !allowEmpty) || normalized.includes("\0")) {
    throw new Error("A relative task file path is required.");
  }
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error("Task file paths must be relative.");
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Task file paths cannot contain '.' or '..'.");
  }
  return segments.join("/");
}

export function resolveTaskFilePath(input: string, allowEmpty = false) {
  const relativePath = normalizeTaskFilePath(input, allowEmpty);
  return { relativePath, absolutePath: path.join(TASK_FILES_ROOT, ...relativePath.split("/")) };
}

async function assertNoSymlink(relativePath: string) {
  let current = TASK_FILES_ROOT;
  for (const segment of relativePath.split("/").filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        throw new Error("Symbolic links are not allowed in task file paths.");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

export async function listTaskFiles(directory = "") {
  await mkdir(TASK_FILES_ROOT, { recursive: true });
  const { relativePath, absolutePath } = resolveTaskFilePath(directory, true);
  await assertNoSymlink(relativePath);
  const files: TaskFileInfo[] = [];

  async function visit(currentDirectory: string, prefix: string) {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const entryPath = path.join(currentDirectory, entry.name);
      const relativeEntryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(entryPath, relativeEntryPath);
      } else if (entry.isFile()) {
        const metadata = await stat(entryPath);
        files.push({
          path: relativePath ? `${relativePath}/${relativeEntryPath}` : relativeEntryPath,
          name: entry.name,
          size: metadata.size,
          modifiedAt: metadata.mtime.toISOString(),
          mimeType: taskFileMimeType(entry.name),
        });
        if (files.length >= 500) return;
      }
    }
  }

  try {
    await visit(absolutePath, "");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function readTaskFile(filePath: string) {
  await mkdir(TASK_FILES_ROOT, { recursive: true });
  const resolved = resolveTaskFilePath(filePath);
  await assertNoSymlink(resolved.relativePath);
  const metadata = await stat(resolved.absolutePath);
  if (!metadata.isFile()) throw new Error("Task file not found.");
  const mimeType = taskFileMimeType(resolved.relativePath);
  const kind = taskFileKind(resolved.relativePath, mimeType);
  const isText = ["markdown", "html", "code", "text"].includes(kind);
  if (isText && metadata.size > MAX_TEXT_FILE_BYTES) {
    throw new Error("Text files larger than 2 MB cannot be opened in the canvas.");
  }
  return {
    path: resolved.relativePath,
    name: path.basename(resolved.relativePath),
    size: metadata.size,
    modifiedAt: metadata.mtime.toISOString(),
    mimeType,
    kind,
    content: isText ? await readFile(resolved.absolutePath, "utf8") : undefined,
  };
}

export async function readTaskFileBuffer(filePath: string) {
  await mkdir(TASK_FILES_ROOT, { recursive: true });
  const resolved = resolveTaskFilePath(filePath);
  await assertNoSymlink(resolved.relativePath);
  const metadata = await stat(resolved.absolutePath);
  if (!metadata.isFile()) throw new Error("Task file not found.");
  return {
    path: resolved.relativePath,
    name: path.basename(resolved.relativePath),
    mimeType: taskFileMimeType(resolved.relativePath),
    data: await readFile(resolved.absolutePath),
  };
}

export async function writeTaskFile(filePath: string, content: string) {
  const byteLength = Buffer.byteLength(content, "utf8");
  if (byteLength > MAX_TEXT_FILE_BYTES) throw new Error("Task files are limited to 2 MB.");
  await mkdir(TASK_FILES_ROOT, { recursive: true });
  const resolved = resolveTaskFilePath(filePath);
  await assertNoSymlink(resolved.relativePath);
  await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
  await writeFile(resolved.absolutePath, content, "utf8");
  return readTaskFile(resolved.relativePath);
}

export async function writeTaskFileBuffer(filePath: string, data: Uint8Array) {
  if (data.byteLength > MAX_TASK_UPLOAD_BYTES) throw new Error("Uploads are limited to 10 MB.");
  await mkdir(TASK_FILES_ROOT, { recursive: true });
  const resolved = resolveTaskFilePath(filePath);
  await assertNoSymlink(resolved.relativePath);
  await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
  await writeFile(resolved.absolutePath, data);
  return readTaskFile(resolved.relativePath);
}
