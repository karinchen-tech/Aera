"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dict, dirOf, localeOf } from "@/lib/i18n";
import type { AutomationSummary, Kpis, Summary } from "@/lib/summary";
import type { Lang } from "@/lib/types";

const POLL_MS = 30_000;
const PAGE = 40;

export default function Dashboard({ initial }: { initial: Summary }) {
  const [data, setData] = useState(initial);
  const [days, setDays] = useState(initial.days);
  const [lang, setLang] = useState<Lang>(initial.client.lang);
  const [auto, setAuto] = useState<string | null>(null);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef(new Set(initial.feed.map((e) => e.id)));

  const t = dict[lang];
  const locale = localeOf(lang);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${initial.client.slug}/summary?days=${days}&lang=${lang}`, { cache: "no-store" });
    if (!res.ok) return;
    const next: Summary = await res.json();
    const added = next.feed.filter((e) => !seen.current.has(e.id)).map((e) => e.id);
    next.feed.forEach((e) => seen.current.add(e.id));
    setFresh(new Set(added));
    setData(next);
  }, [days, lang, initial.client.slug]);

  useEffect(() => {
    if (days !== data.days || lang !== initial.client.lang) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, lang]);

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const fmt = useMemo(() => {
    const n = new Intl.NumberFormat(locale);
    const n1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const money = new Intl.NumberFormat(locale, { style: "currency", currency: data.client.currency, maximumFractionDigits: 0 });
    const rel = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const dt = new Intl.DateTimeFormat(locale, { timeZone: data.client.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const day = new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "short" });
    const ago = (iso: string) => {
      const s = (Date.parse(iso) - Date.now()) / 1000;
      const a = Math.abs(s);
      if (a < 60) return rel.format(Math.round(s), "second");
      if (a < 3600) return rel.format(Math.round(s / 60), "minute");
      if (a < 86400) return rel.format(Math.round(s / 3600), "hour");
      return rel.format(Math.round(s / 86400), "day");
    };
    return { n: n.format, n1: n1.format, money: money.format, ago, dt: (iso: string) => dt.format(new Date(iso)), day: (d: string) => day.format(new Date(`${d}T00:00:00Z`)) };
  }, [locale, data.client.currency, data.client.timezone]);

  const autoByKey = useMemo(() => Object.fromEntries(data.automations.map((a) => [a.key, a])), [data.automations]);

  const feed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.feed.filter(
      (e) =>
        (!auto || e.automation === auto) &&
        (!attentionOnly || e.outcome !== "success") &&
        (!q || [e.title, e.detail, e.contactName, e.contactPhone].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [data.feed, auto, attentionOnly, query]);

  useEffect(() => setShown(PAGE), [auto, attentionOnly, query, days]);

  const k = data.kpis;
  const p = data.previous;
  const afterPct = k.actions ? Math.round((k.afterHours / k.actions) * 100) : 0;

  return (
    <div className="wrap" dir={dirOf(lang)} lang={lang}>
      <header className="top">
        <div className="brand">
          <div className="logo">A</div>
          <div>
            <h1>{data.client.name}</h1>
            <div className="sub">
              <span className="live"><i aria-hidden /> {t.live}</span>
              {" · "}
              {t.updated} {fmt.ago(data.generatedAt)}
            </div>
          </div>
        </div>
        <div className="controls">
          <div className="seg" role="group" aria-label="range">
            {[7, 30, 90].map((d) => (
              <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>
                {t.lastDays(d)}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => setLang(lang === "he" ? "en" : "he")}>{lang === "he" ? "EN" : "עב"}</button>
          <button className="btn" onClick={() => window.print()}>{t.print}</button>
        </div>
      </header>

      <section className="kpis" aria-label="summary">
        <Kpi hero label={t.hoursSaved} value={`${fmt.n1(k.hoursSaved)}`} cur={k.hoursSaved} prev={p.hoursSaved} t={t} fmt={fmt} />
        <Kpi label={t.valueSaved} value={fmt.money(k.valueSaved)} cur={k.valueSaved} prev={p.valueSaved} t={t} fmt={fmt} />
        <Kpi label={t.actions} value={fmt.n(k.actions)} cur={k.actions} prev={p.actions} t={t} fmt={fmt} />
        <Kpi label={t.leads} value={fmt.n(k.leads)} cur={k.leads} prev={p.leads} t={t} fmt={fmt} />
        <Kpi label={t.afterHours} value={fmt.n(k.afterHours)} note={`${afterPct}% · ${t.afterHoursHint}`} t={t} fmt={fmt} />
        {k.needsAttention > 0 && (
          <Kpi
            warn
            label={t.needsAttention}
            value={fmt.n(k.needsAttention)}
            onClick={() => { setAttentionOnly(true); setAuto(null); document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" }); }}
            t={t}
            fmt={fmt}
          />
        )}
      </section>

      <section className="card section">
        <div className="section-h">
          <h2>{t.activityByDay}</h2>
          <div className="legend">
            {data.automations.map((a) => (
              <span key={a.key}><i style={{ background: `var(${a.color})` }} />{a.name}</span>
            ))}
          </div>
        </div>
        <Chart data={data} fmt={fmt} />
      </section>

      <section className="card section">
        <div className="section-h"><h2>{t.yourAutomations}</h2></div>
        <div className="autos">
          {data.automations.length === 0 && <div className="empty">{t.empty}</div>}
          {data.automations.map((a) => (
            <AutoCard key={a.key} a={a} t={t} fmt={fmt} onClick={() => { setAuto(a.key); setAttentionOnly(false); document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" }); }} />
          ))}
        </div>
      </section>

      <section className="card section" id="feed">
        <div className="section-h">
          <h2>{t.feed}</h2>
          <span className="sub">{t.feedHint}</span>
        </div>
        <div className="filters">
          <button className="chip" aria-pressed={!auto && !attentionOnly} onClick={() => { setAuto(null); setAttentionOnly(false); }}>{t.all}</button>
          {data.automations.map((a) => (
            <button key={a.key} className="chip" aria-pressed={auto === a.key} onClick={() => setAuto(auto === a.key ? null : a.key)}>
              {a.icon} {a.name}
            </button>
          ))}
          <button className="chip" aria-pressed={attentionOnly} onClick={() => setAttentionOnly(!attentionOnly)}>⚠ {t.attentionOnly}</button>
          <input className="search" type="search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {feed.length === 0 ? (
          <div className="empty">{t.empty}</div>
        ) : (
          <ul className="feed">
            {feed.slice(0, shown).map((e) => {
              const a = autoByKey[e.automation];
              return (
                <li key={e.id} className={fresh.has(e.id) ? "fresh" : undefined} style={{ ["--c" as string]: `var(${a?.color ?? "--series-4"})` }}>
                  <div className="ic" aria-hidden>{a?.icon ?? "⚙️"}</div>
                  <div>
                    <div className="t">{e.title}</div>
                    {e.detail && <div className="d">{e.detail}</div>}
                    <div className="meta">
                      {e.outcome !== "success" && <span className={`pill ${e.outcome}`}>{t.outcome[e.outcome]}</span>}
                      {e.contactName && <span>👤 {e.contactName}</span>}
                      {e.contactPhone && <span dir="ltr">{e.contactPhone}</span>}
                      {e.minutesSaved > 0 && e.outcome !== "failed" && <span className="saved">⏱ +{fmt.n1(e.minutesSaved)} min</span>}
                      {e.link && <a href={e.link} target="_blank" rel="noreferrer noopener">{t.open} ↗</a>}
                    </div>
                  </div>
                  <div className="when" title={fmt.dt(e.occurredAt)}>
                    {fmt.ago(e.occurredAt)}
                    <br />
                    <span className="num">{fmt.dt(e.occurredAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {feed.length > shown && (
          <div className="more">
            <button className="btn" onClick={() => setShown(shown + PAGE)}>{t.loadMore} ({fmt.n(feed.length - shown)})</button>
          </div>
        )}
      </section>

      <p className="foot">{t.poweredBy}</p>
    </div>
  );
}

type T = (typeof dict)["en"];
type Fmt = { n: (v: number) => string; n1: (v: number) => string; money: (v: number) => string; ago: (iso: string) => string; dt: (iso: string) => string; day: (d: string) => string };

function Kpi(props: { label: string; value: string; cur?: number; prev?: number; note?: string; hero?: boolean; warn?: boolean; onClick?: () => void; t: T; fmt: Fmt }) {
  const { label, value, cur, prev, note, hero, warn, onClick, t } = props;
  let delta: React.ReactNode = note ?? null;
  if (cur !== undefined && prev !== undefined && prev > 0) {
    const pct = Math.round(((cur - prev) / prev) * 100);
    delta = (
      <>
        <b className={pct >= 0 ? "up" : "down"}>{pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}%</b> {t.vsPrev}
      </>
    );
  }
  return (
    <div
      className={`card kpi${hero ? " hero" : ""}${warn ? " warn" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="label">{label}</div>
      <div className="value num">{value}</div>
      {delta && <div className="delta">{delta}</div>}
    </div>
  );
}

function AutoCard({ a, t, fmt, onClick }: { a: AutomationSummary; t: T; fmt: Fmt; onClick: () => void }) {
  return (
    <div className="auto" style={{ ["--c" as string]: `var(${a.color})`, cursor: "pointer" }} onClick={onClick} role="button" tabIndex={0}>
      <div className="head">
        <div className="name"><span aria-hidden>{a.icon}</span>{a.name}</div>
        <span className={`pill ${a.status}`}>● {t.status[a.status]}</span>
      </div>
      <div className="desc">{a.description}</div>
      <div className="stats">
        <div><b className="num">{fmt.n(a.count)}</b><small>{t.actions} · {t.thisPeriod}</small></div>
        <div><b className="num">{fmt.n1(a.hoursSaved)}</b><small>{t.hoursShort}</small></div>
      </div>
      <div className="last">{t.lastRun}: {a.lastAt ? fmt.ago(a.lastAt) : t.never}{a.failures > 0 ? ` · ⚠ ${a.failures}` : ""}</div>
    </div>
  );
}

function Chart({ data, fmt }: { data: Summary; fmt: Fmt }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000, H = 220, padL = 34, padB = 26, padT = 10;
  const days = data.daily;
  const keys = data.automations.map((a) => a.key);
  const max = Math.max(1, ...days.map((d) => d.total));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const bw = (W - padL) / days.length;
  const y = (v: number) => H - padB - (v / top) * (H - padB - padT);
  const labelEvery = Math.ceil(days.length / 8);

  return (
    <div className="chart" style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ direction: "ltr" }} role="img" aria-label="activity per day">
        {Array.from({ length: top / step + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line className="gridline" x1={padL} x2={W} y1={y(v)} y2={y(v)} />
            <text className="axis" x={padL - 6} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
        {days.map((d, i) => {
          let acc = 0;
          const x = padL + i * bw + bw * 0.15;
          const w = Math.max(2, bw * 0.7);
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={padL + i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
              {keys.map((k) => {
                const v = d.counts[k] ?? 0;
                if (!v) return null;
                const y0 = y(acc), y1 = y(acc + v);
                acc += v;
                return (
                  <rect key={k} x={x} y={y1} width={w} height={Math.max(0, y0 - y1 - 1)} rx={2}
                    fill={`var(${data.automations.find((a) => a.key === k)?.color})`} opacity={hover === null || hover === i ? 1 : 0.45} />
                );
              })}
              {i % labelEvery === 0 && (
                <text className="axis" x={padL + i * bw + bw / 2} y={H - 8} textAnchor="middle">{fmt.day(d.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && days[hover] && (
        <div className="tip" style={{ left: `${((padL + hover * bw + bw / 2) / W) * 100}%`, top: `${(y(days[hover].total) / H) * 100}%` }}>
          <strong>{fmt.day(days[hover].date)} · {days[hover].total}</strong>
          {data.automations.map((a) => (days[hover].counts[a.key] ? <div key={a.key}><span>{a.name}</span><span>{days[hover].counts[a.key]}</span></div> : null))}
        </div>
      )}
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag);
}
