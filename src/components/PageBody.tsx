import type { SiteView } from '@/lib/view';
import { caseLabels } from '@/lib/pages';
import Sections from './Sections';
import Crumbs from './pages/Crumbs';
import CasePage from './pages/CasePage';

/** Everything between the header and the footer, for one page — shared by the public pages and the
 *  admin's live preview (mark = tag each part so the editor can find / outline / inspect it). */
export default function PageBody({ view, mark, focus }: { view: SiteView; mark?: boolean; focus?: { id: string; path: string } | null }) {
  const c = view.caseView;
  if (c) {
    // a case study page closes with the Work page's «book a call» band
    const band = view.ctx.band ? [view.ctx.band] : [];
    return (
      <>
        <Crumbs items={view.crumbs} />
        {mark && <span data-cu-mark={c.key} data-hid={c.hidden ? '1' : undefined} hidden />}
        <CasePage c={c} ctx={view.ctx} d={view.base} labels={caseLabels(view.settings, view.lang)} />
        <Sections sections={band} mark={mark} ctx={view.ctx} />
      </>
    );
  }
  return (
    <>
      <Crumbs items={view.crumbs} />
      <Sections sections={view.sections} mark={mark} focus={focus} ctx={view.ctx} />
    </>
  );
}
