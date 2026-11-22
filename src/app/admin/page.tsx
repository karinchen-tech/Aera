import { headers } from "next/headers";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { createClient, login, logout, sendTestEvents } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · AERA Work Portal" };

const ERRORS: Record<string, string> = {
  "1": "Wrong password.",
  fields: "Name and company ID are required.",
  slug: "That company ID is already used.",
  locale: "Unknown time zone or currency code.",
  save: "Could not save. Check the database connection.",
};

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const error = sp.error ? ERRORS[sp.error] ?? "Something went wrong." : null;

  if (!process.env.ADMIN_PASSWORD) {
    return (
      <main className="enter" dir="ltr">
        <div className="card">
          <h1>Admin is locked</h1>
          <p className="sub">Set the <code>ADMIN_PASSWORD</code> environment variable, then restart the app.</p>
        </div>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return (
      <main className="enter" dir="ltr">
        <form className="card" action={login}>
          <div className="brand"><div className="logo">A</div><strong>AERA admin</strong></div>
          {error && <div className="err">{error}</div>}
          <label className="field">Password<input name="password" type="password" required autoFocus /></label>
          <button className="btn primary" style={{ marginTop: 16 }}>Sign in</button>
        </form>
      </main>
    );
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const store = await getStore();
  const clients = await store.listClients();

  return (
    <div className="wrap" dir="ltr" lang="en">
      <header className="top">
        <div className="brand">
          <div className="logo">A</div>
          <div>
            <h1>Clients</h1>
            <div className="sub">Create a client, plug their token into your automations, send them their link.</div>
          </div>
        </div>
        <form action={logout}><button className="btn">Sign out</button></form>
      </header>

      {error && <div className="err">{error}</div>}
      {sp.created && <div className="card" style={{ padding: 14 }}>✅ Created <b>{sp.created}</b>. Copy its token and link below.</div>}
      {sp.tested && <div className="card" style={{ padding: 14 }}>✅ Sent 3 test events to <b>{sp.tested}</b>. <a href={`/c/${sp.tested}`}>Open its dashboard</a>.</div>}

      <section className="card section">
        <div className="section-h"><h2>All clients ({clients.length})</h2></div>
        <div className="scroll-x" style={{ padding: "8px 8px 12px" }}>
          <table className="table">
            <thead>
              <tr><th>Client</th><th>Client link (send this)</th><th>Ingest token (for Make / n8n / Zapier)</th><th></th></tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const link = `${origin}/c/${c.slug}/enter?key=${c.accessKey}`;
                return (
                  <tr key={c.id} id={c.slug}>
                    <td>
                      <b>{c.name}</b>
                      <div className="sub">{c.slug} · {c.industry || "—"} · {c.lang.toUpperCase()} · {c.hourlyRate} {c.currency}/h</div>
                    </td>
                    <td>
                      <div className="mono"><a href={link}>{link}</a></div>
                      <div className="sub">Access key: <span className="mono">{c.accessKey}</span></div>
                    </td>
                    <td>
                      <details>
                        <summary>Show token</summary>
                        <div className="mono" style={{ marginTop: 6 }}>{c.ingestToken}</div>
                        <pre className="code">{`curl -X POST ${origin}/api/events \\
  -H "Authorization: Bearer ${c.ingestToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"whatsapp.message_answered","contact_name":"Dana","detail":"Answered: is it available?"}'`}</pre>
                      </details>
                    </td>
                    <td>
                      <form action={sendTestEvents}>
                        <input type="hidden" name="slug" value={c.slug} />
                        <button className="btn">Send test events</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card section">
        <div className="section-h"><h2>Add a client</h2></div>
        <form action={createClient} style={{ padding: "4px 20px 20px" }}>
          <div className="form-grid">
            <label className="field">Company name<input name="name" required placeholder="Cohen Real Estate" /></label>
            <label className="field">Company ID (used in the link)<input name="slug" required placeholder="cohen-realestate" pattern="[a-zA-Z0-9-]+" /></label>
            <label className="field">Industry<input name="industry" placeholder="real-estate" /></label>
            <label className="field">Dashboard language
              <select name="lang" defaultValue="he"><option value="he">Hebrew</option><option value="en">English</option></select>
            </label>
            <label className="field">Hourly value of staff time<input name="hourlyRate" type="number" min="0" step="1" defaultValue={120} /></label>
            <label className="field">Currency<input name="currency" defaultValue="ILS" maxLength={3} /></label>
            <label className="field">Time zone<input name="timezone" defaultValue="Asia/Jerusalem" /></label>
          </div>
          <button className="btn primary" style={{ marginTop: 16 }}>Create client</button>
        </form>
      </section>
    </div>
  );
}
