/**
 * Share links.
 *
 * The whole builder state is the config, so a share link is the minimal TOML
 * compressed into the URL fragment. Keeping it in the fragment means the
 * config never reaches a server — this app is a static export with no backend
 * — and lz-string's URI-component alphabet survives copy-paste and browser
 * history without further escaping.
 */

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { parseConfig, serialiseConfig } from "./toml";
import type { StarshipConfig } from "@/lib/engine/prompt";

export function encodeShare(config: StarshipConfig): string {
  return compressToEncodedURIComponent(
    serialiseConfig(config, { header: false }),
  );
}

/**
 * Decodes a fragment produced by `encodeShare`. Accepts a bare payload, a
 * leading `#`, or a `#key=payload` pair, and returns null for anything that
 * does not decompress to a valid config.
 */
export function decodeShare(fragment: string): StarshipConfig | null {
  const payload = extractPayload(fragment);
  if (payload.length === 0) return null;

  let toml: string | null;
  try {
    toml = decompressFromEncodedURIComponent(payload);
  } catch {
    return null;
  }
  // lz-string signals failure by returning null or an empty string rather than
  // throwing, and happily produces mojibake for arbitrary input — so the TOML
  // parse below is the real validation step.
  if (!toml) return null;

  const result = parseConfig(toml);
  return result.ok ? result.config : null;
}

function extractPayload(fragment: string): string {
  const withoutHash = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  const separator = withoutHash.indexOf("=");
  return separator === -1 ? withoutHash : withoutHash.slice(separator + 1);
}
