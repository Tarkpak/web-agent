import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type FeedbackRecord = {
  id: string;
  messageId: string;
  type: "positive" | "negative";
  reasons?: string[];
  note?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

let writeChain: Promise<unknown> = Promise.resolve();

async function readRecords(): Promise<FeedbackRecord[]> {
  try {
    const value: unknown = JSON.parse(await readFile(FEEDBACK_FILE, "utf8"));
    return Array.isArray(value) ? (value as FeedbackRecord[]) : [];
  } catch {
    return [];
  }
}

export function appendFeedback(
  messageId: string,
  type: "positive" | "negative",
  details?: { reasons?: string[]; note?: string },
): Promise<FeedbackRecord> {
  const run = writeChain.then(async () => {
    const records = await readRecords();
    const previous = records.find((item) => item.messageId === messageId);
    const record = {
      id: previous?.id ?? randomUUID(),
      messageId,
      type,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      reasons: details?.reasons ?? previous?.reasons,
      note: details?.note ?? previous?.note,
    };
    const next = [...records.filter((item) => item.messageId !== messageId), record];
    await mkdir(DATA_DIR, { recursive: true });
    const tempFile = `${FEEDBACK_FILE}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tempFile, JSON.stringify(next), "utf8");
    await rename(tempFile, FEEDBACK_FILE);
    return record;
  });
  writeChain = run.catch(() => undefined);
  return run;
}
