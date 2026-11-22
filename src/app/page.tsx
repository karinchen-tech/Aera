import { dict, dirOf } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const lang: Lang = sp.lang === "en" ? "en" : "he";
  const t = dict[lang];
  return (
    <main className="enter" dir={dirOf(lang)} lang={lang}>
      <form className="card" method="post" action="/c/_/enter">
        <div className="brand">
          <div className="logo">A</div>
          <strong>AERA</strong>
        </div>
        <h1>{t.enterTitle}</h1>
        <p className="sub">{t.enterBody}</p>
        {sp.error && <div className="err" role="alert">{t.invalid}</div>}
        <label className="field">
          {t.slug}
          <input name="slug" required autoComplete="username" dir="ltr" defaultValue={sp.slug ?? ""} />
        </label>
        <label className="field">
          {t.key}
          <input name="key" type="password" required autoComplete="current-password" dir="ltr" />
        </label>
        <button className="btn primary" style={{ marginTop: 20, width: "100%", justifyContent: "center", padding: "11px" }}>
          {t.enter}
        </button>
        <p className="hint">{t.demoHint}</p>
        <p className="hint">
          <a href={lang === "he" ? "/?lang=en" : "/"}>{lang === "he" ? "English" : "עברית"}</a>
        </p>
      </form>
    </main>
  );
}
