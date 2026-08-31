import {
  generateId,
  type Attachment,
  type AttachmentAdapter,
  type CompleteAttachment,
  type PendingAttachment,
} from "@assistant-ui/core";

const TEXT_TYPES = new Set([
  "application/json",
  "application/xml",
  "text/css",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/xml",
  "text/yaml",
]);

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read attachment."));
    reader.readAsDataURL(file);
  });
}

export class TaskFileAttachmentAdapter implements AttachmentAdapter {
  accept = "*";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    if (file.size > 10 * 1024 * 1024) throw new Error("Attachments are limited to 10 MB.");
    return {
      id: generateId(),
      type: file.type.startsWith("image/") ? "image" : "document",
      name: file.name,
      contentType: file.type || "application/octet-stream",
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const form = new FormData();
    form.set("file", attachment.file, attachment.name);
    const response = await fetch("/api/task-files/upload", { method: "POST", body: form });
    const saved = await response.json();
    if (!response.ok) throw new Error(saved.error || "Could not save attachment.");

    const contentType =
      attachment.contentType || attachment.file.type || "application/octet-stream";
    if (contentType.startsWith("image/")) {
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          { type: "image", image: await fileToDataUrl(attachment.file), filename: attachment.name },
        ],
      };
    }
    if (contentType.startsWith("text/") || TEXT_TYPES.has(contentType)) {
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "text",
            text: `<attachment name=${JSON.stringify(attachment.name)} task_path=${JSON.stringify(saved.path)}>\n${await attachment.file.text()}\n</attachment>`,
          },
        ],
      };
    }
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          filename: attachment.name,
          mimeType: contentType,
          data: await fileToDataUrl(attachment.file),
        },
      ],
    };
  }

  async remove(_attachment: Attachment): Promise<void> {}
}
