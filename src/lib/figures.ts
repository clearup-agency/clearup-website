/* A figure as the admin writes it («+1,200», «164%», «$4.7M+»): the signs around it and the number inside. */
const FIG = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/;

export function splitFigure(v: string): { pre: string; num: number; dec: number; comma: boolean; post: string } | null {
  const m = FIG.exec(v.trim());
  if (!m) return null;
  const raw = m[2];
  return { pre: m[1], num: parseFloat(raw.replace(/,/g, '')), dec: (raw.split('.')[1] || '').length, comma: raw.includes(','), post: m[3] };
}

export function formatFigure(n: number, dec: number, comma: boolean): string {
  const s = n.toFixed(dec);
  if (!comma) return s;
  const [i, f] = s.split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
}
