import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";

/**
 * Written in fit-pixel-server (src/routes/legal-html.ts) and served on the
 * website, so the app links to the same fitpixel.app URLs as App Store Connect.
 */
const LEGAL_SITE_URL = "https://fitpixel.app";

export const LEGAL_PAGES = {
  privacy: { path: "/privacy", label: "Privacy Policy" },
  terms: { path: "/terms", label: "Terms of Use" },
} as const;

export type LegalPageId = keyof typeof LEGAL_PAGES;

export function legalPageUrl(page: LegalPageId): string {
  return `${LEGAL_SITE_URL}${LEGAL_PAGES[page].path}`;
}

/** Opens the page in an in-app browser sheet. */
export async function openLegalPage(page: LegalPageId): Promise<void> {
  await openBrowserAsync(legalPageUrl(page), {
    presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
