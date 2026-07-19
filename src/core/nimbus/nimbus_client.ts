import fs from "fs";
import path from "path";
import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app_errors";

/**
 * Nimbus — cloud file-storage REST client.
 *
 * Centralizes the base URL, the `Authorization: Bearer <key>` header, and error
 * handling for every operation. Credentials come from the environment:
 *   NIMBUS_API_KEY   (required)
 *   NIMBUS_BASE_URL  (optional, defaults to the documented API URL)
 *
 * Every method throws `AppError(status, message)` on a non-2xx response, using
 * the API's `{ error: { code, message } }` body so the message reaches the
 * caller / global error handler.
 *
 * --- Tiny usage example ------------------------------------------------------
 *   import { nimbus } from "../core/nimbus/nimbus_client";
 *
 *   // Upload a multer file and get its public URL (drop-in for cloudinary):
 *   const url = await nimbus.uploadAndGetUrl(req.file!, { tags: ["avatars"] });
 *
 *   // Upload from a Buffer or a local path:
 *   await nimbus.uploadAndGetUrl({ buffer, filename: "clip.mp4", contentType: "video/mp4" });
 *   await nimbus.uploadAndGetUrl({ path: "/tmp/clip.mp4" });
 *
 *   const { items, pagination } = await nimbus.listAssets({ search: "cat", kind: "image" });
 *   const asset = await nimbus.getAsset(id);
 *   const freshUrl = await nimbus.getFreshUrl(id);          // for private files
 *   await nimbus.updateAsset(id, { filename: "renamed.png", tags: ["kept"] });
 *   await nimbus.deleteAsset(id);
 * ----------------------------------------------------------------------------
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type NimbusAssetKind =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

export interface NimbusAsset {
  _id: string;
  filename: string;
  key: string;
  mimeType: string;
  kind: NimbusAssetKind;
  size: number;
  /** Permanent public URL — preferred. `null` for private files. */
  url: string | null;
  /** Temporary signed URL, present only when `url` is null (expires in ~1h). */
  downloadUrl?: string;
  tags: string[];
  status: string;
}

export interface NimbusUploadResponse {
  uploaded: NimbusAsset[];
  count: number;
  /** Present only when some uploaded asset has a null `url`. */
  note?: string;
}

export interface NimbusPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NimbusListResponse {
  items: NimbusAsset[];
  pagination: NimbusPagination;
}

export type NimbusSort = "newest" | "oldest" | "largest" | "name";

export interface NimbusListParams {
  search?: string;
  kind?: NimbusAssetKind;
  sort?: NimbusSort;
  page?: number;
  limit?: number;
}

/** Anything the client can turn into an upload body. */
export type NimbusFileSource =
  // Express/multer memory file (buffer + originalname + mimetype)
  | Express.Multer.File
  // Raw buffer (filename required)
  | { buffer: Buffer; filename: string; contentType?: string }
  // Local file path (filename optional — derived from the path)
  | { path: string; filename?: string; contentType?: string };

export interface NimbusUploadOptions {
  /** Comma-separated string or an array of tags. */
  tags?: string | string[];
  folderId?: string;
}

// ── Config & transport ───────────────────────────────────────────────────────

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = (
    process.env.NIMBUS_BASE_URL || "https://capi.tecsior.com/api/v1"
  ).replace(/\/+$/, "");
  const apiKey = process.env.NIMBUS_API_KEY ?? "";
  if (!apiKey) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "NIMBUS_API_KEY is not configured",
    );
  }
  return { baseUrl, apiKey };
}

/** Parse a response body and throw AppError(message) on any non-2xx. */
async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message ||
      `Nimbus request failed (${res.status})`;
    throw new AppError(res.status || StatusCodes.BAD_GATEWAY, message);
  }
  return data as T;
}

/** JSON request with the auth header applied. */
async function jsonRequest<T>(
  pathAndQuery: string,
  init: RequestInit = {},
): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  // Only declare a JSON content-type when we actually send a body — the API
  // rejects bodiless GET/DELETE requests that carry `Content-Type: application/json`.
  if (init.body !== undefined && init.body !== null) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${pathAndQuery}`, { ...init, headers });
  return handleResponse<T>(res);
}

/** Normalize any accepted source into a Blob + filename for multipart upload. */
async function toUploadPart(
  source: NimbusFileSource,
): Promise<{ blob: Blob; filename: string }> {
  // multer memory file
  if ("originalname" in source && "buffer" in source) {
    const f = source as Express.Multer.File;
    return {
      blob: new Blob([new Uint8Array(f.buffer)], { type: f.mimetype }),
      filename: f.originalname,
    };
  }
  // raw buffer
  if ("buffer" in source) {
    const s = source as { buffer: Buffer; filename: string; contentType?: string };
    return {
      blob: new Blob([new Uint8Array(s.buffer)], { type: s.contentType }),
      filename: s.filename,
    };
  }
  // local path
  const s = source as { path: string; filename?: string; contentType?: string };
  const buffer = await fs.promises.readFile(s.path);
  return {
    blob: new Blob([new Uint8Array(buffer)], { type: s.contentType }),
    filename: s.filename ?? path.basename(s.path),
  };
}

function normalizeTags(tags?: string | string[]): string | undefined {
  if (tags === undefined) return undefined;
  return Array.isArray(tags) ? tags.join(",") : tags;
}

// ── Operations ───────────────────────────────────────────────────────────────

export const nimbus = {
  /**
   * (1) Upload a file. Returns the raw API response (`uploaded`, `count`, `note`).
   * Prefer `uploadAndGetUrl` if you just need a URL.
   */
  async upload(
    source: NimbusFileSource,
    options: NimbusUploadOptions = {},
  ): Promise<NimbusUploadResponse> {
    const { baseUrl, apiKey } = getConfig();
    const { blob, filename } = await toUploadPart(source);

    const form = new FormData();
    form.append("file", blob, filename);
    const tags = normalizeTags(options.tags);
    if (tags) form.append("tags", tags);
    if (options.folderId) form.append("folderId", options.folderId);

    // NOTE: do not set Content-Type — fetch adds the multipart boundary.
    const res = await fetch(`${baseUrl}/assets/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    return handleResponse<NimbusUploadResponse>(res);
  },

  /**
   * (1b) Upload and resolve to a single usable URL:
   * `uploaded[0].url` when set, otherwise the temporary `downloadUrl`.
   * This is the drop-in replacement for the old cloudinary upload.
   */
  async uploadAndGetUrl(
    source: NimbusFileSource,
    options: NimbusUploadOptions = {},
  ): Promise<string> {
    const result = await this.upload(source, options);
    const first = result.uploaded?.[0];
    if (!first) {
      throw new AppError(
        StatusCodes.BAD_GATEWAY,
        "Nimbus upload returned no asset",
      );
    }
    const url = first.url ?? first.downloadUrl;
    if (!url) {
      throw new AppError(
        StatusCodes.BAD_GATEWAY,
        "Nimbus upload returned no url",
      );
    }
    return url;
  },

  /** (2) List / search assets. */
  async listAssets(params: NimbusListParams = {}): Promise<NimbusListResponse> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.kind) qs.set("kind", params.kind);
    if (params.sort) qs.set("sort", params.sort);
    if (params.page !== undefined) qs.set("page", String(params.page));
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return jsonRequest<NimbusListResponse>(`/assets${query ? `?${query}` : ""}`);
  },

  /** (3) Get one asset by id. */
  async getAsset(id: string): Promise<NimbusAsset> {
    return jsonRequest<NimbusAsset>(`/assets/${encodeURIComponent(id)}`);
  },

  /** (4) Get a fresh temporary download URL (for private files). */
  async getFreshUrl(id: string): Promise<string> {
    const data = await jsonRequest<{ url: string }>(
      `/assets/${encodeURIComponent(id)}/download-url`,
    );
    return data.url;
  },

  /** (5) Update an asset's filename and/or tags. */
  async updateAsset(
    id: string,
    updates: { filename?: string; tags?: string[] },
  ): Promise<NimbusAsset> {
    return jsonRequest<NimbusAsset>(`/assets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  /** (6) Delete an asset. Returns true when the API reports it deleted. */
  async deleteAsset(id: string): Promise<boolean> {
    const data = await jsonRequest<{ deleted: boolean }>(
      `/assets/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return data.deleted === true;
  },
};

export default nimbus;
