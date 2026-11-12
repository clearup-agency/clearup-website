import type { ContentSnapshot } from '@/db/schema';

/** Messages between the editor (/admin) and its preview iframe (/preview/<lang>/). Same origin only. */
export const MSG = { draft: 'cu-editor:draft', ready: 'cu-preview:ready', select: 'cu-preview:select', scroll: 'cu-editor:scroll', focus: 'cu-editor:focus', page: 'cu-preview:page' } as const;
export type DraftMsg = { type: typeof MSG.draft; content: ContentSnapshot; selected: string | null; labels: Record<string, string>; page?: string; caseId?: string | null };
/** a click on a link to another page of the site, in the preview → the editor switches to that page */
export type PageMsg = { type: typeof MSG.page; page: string; slug?: string | null };
export type ScrollMsg = { type: typeof MSG.scroll; id: string };
/** what the admin clicked in the preview: a section id (or the header / footer) and, when the click was on an
 *  element that shows a field, that field's path ("title.0", "stats.2.v"; settings fields "s:cta") */
export type SelectMsg = { type: typeof MSG.select; id: string; path?: string };
/** the field being edited in the panel → outline its element on the preview ('' clears) */
export type FocusMsg = { type: typeof MSG.focus; id: string; path: string };
export const NAV_ID = '__nav';
export const FOOTER_ID = '__footer';
export const CHAT_ID = '__chat';
