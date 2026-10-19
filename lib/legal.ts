import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";

import { getFitPixelApiBaseUrl } from "@/lib/api/config";

/** Served by fit-pixel-server (src/routes/legal-html.ts). */
export const LEGAL_PAGES = {
  privacy: { path: "/privacy", label: "Privacy Policy" },
  terms: { path: "/terms", label: "Terms of Use" },
} as const;

export type LegalPageId = keyof typeof LEGAL_PAGES;

export function legalPageUrl(page: LegalPageId): string {
  return `${getFitPixelApiBaseUrl()}${LEGAL_PAGES[page].path}`;
}

/** Opens the page in an in-app browser sheet. */
export async function openLegalPage(page: LegalPageId): Promise<void> {
  await openBrowserAsync(legalPageUrl(page), {
    presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
