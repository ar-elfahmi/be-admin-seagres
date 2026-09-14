"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Waves,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "../actions";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submitLogin(email: string, pass: string) {
    setBusy(true);
    setError("");
    const res = await login(email, pass);
    setBusy(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  function loginForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    submitLogin(String(data.get("email") || ""), String(data.get("password") || ""));
  }

  async function registerForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const res = await register({
      name: String(data.get("fullName") || ""),
      role: String(data.get("role") || ""),
      organization: String(data.get("organization") || ""),
      location: String(data.get("location") || ""),
      email: String(data.get("email") || ""),
      password: String(data.get("password") || ""),
    });
    setBusy(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
    setShowPass(false);
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <span className="auth-card-brand">
          <span className="brand-mark"><Waves /></span>SeaGres{" "}
          <small style={{ fontWeight: 500, color: "var(--muted)", fontSize: "11px", marginLeft: "6px" }}>
            Gresik · pesisir
          </small>
        </span>

        {mode === "login" ? (
          <form className="form" onSubmit={loginForm}>
            <div>
              <h1 className="auth-title">Masuk</h1>
              <p className="auth-sub">Lanjutkan belanja atau catat hasil panen.</p>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <label>
              Email
              <input name="email" type="email" defaultValue="rahmat@seagres.id" autoComplete="email" placeholder="nama@kelompok.id" required />
            </label>
            <label>
              Kata sandi
              <span className="field">
                <input name="password" type={showPass ? "text" : "password"} defaultValue="demo1234" minLength={6} autoComplete="current-password" placeholder="Minimal 6 karakter" required />
                <button type="button" className="eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                  {showPass ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>
            <div className="form-row-between">
              <label className="consent inline"><input type="checkbox" defaultChecked /> Ingat saya</label>
              <a href="#" onClick={(event) => event.preventDefault()}>Lupa kata sandi?</a>
            </div>
            <button className="primary-button form-submit" type="submit" disabled={busy}>
              {busy ? "Memeriksa…" : <>Masuk <ArrowRight /></>}
            </button>
            <div className="demo-hint">
              <span>Akun demo terverifikasi — KUB Mina Jaya.</span>
              <button type="button" disabled={busy} onClick={() => submitLogin("rahmat@seagres.id", "demo1234")}>Gunakan akun demo</button>
            </div>
            <p className="auth-foot">
              Belum punya akun? <button type="button" onClick={() => switchMode("register")}>Daftar sebagai pelaku</button>
            </p>
          </form>
        ) : (
          <form className="form" onSubmit={registerForm}>
            <div>
              <h1 className="auth-title">Daftar</h1>
              <p className="auth-sub">Nelayan, pembudidaya, pengolah, pembeli, atau pendamping. Data usaha ditinjau pendamping.</p>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <label>
              Nama lengkap
              <input name="fullName" autoComplete="name" placeholder="Nama sesuai KTP" required />
            </label>
            <div className="form-grid">
              <label>
                Peran
                <select name="role" defaultValue="Nelayan">
                  <option>Nelayan</option>
                  <option>Pembudidaya</option>
                  <option>Operator kelompok/koperasi</option>
                  <option>Pengolah/UMKM</option>
                  <option>Pembeli lokal</option>
                  <option>Pendamping</option>
                </select>
              </label>
              <label>
                Kecamatan<input name="location" placeholder="ex: Manyar" required />
              </label>
            </div>
            <label>
              Kelompok / koperasi / usaha
              <input name="organization" placeholder="ex: KUB Mina Jaya" required />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" placeholder="nama@kelompok.id" required />
            </label>
            <label>
              Kata sandi
              <span className="field">
                <input name="password" type={showPass ? "text" : "password"} minLength={6} autoComplete="new-password" placeholder="Minimal 6 karakter" required />
                <button type="button" className="eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                  {showPass ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>
            <label className="consent">
              <input type="checkbox" required /> Saya menyetujui verifikasi data usaha dan publikasi lokasi umum saja, tanpa titik kapal.
            </label>
            <button className="primary-button form-submit" type="submit" disabled={busy}>
              {busy ? "Mendaftarkan…" : <>Lanjutkan <ArrowRight /></>}
            </button>
            <p className="auth-foot">
              Sudah punya akun? <button type="button" onClick={() => switchMode("login")}>Masuk di sini</button>
            </p>
          </form>
        )}
      </div>
      <p className="auth-caption">Pasar hasil pesisir Gresik · dari nelayan langsung ke pembeli</p>
    </main>
  );
}
