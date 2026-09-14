"use client";

import Image from "next/image";
import { ArrowRight, Eye, EyeOff, QrCode, ShieldCheck, ShoppingCart } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "../actions";
import type { AccountType } from "../../lib/types";
import SeagresLogo from "./seagres-logo";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("seller");
  const [role, setRole] = useState("Nelayan");
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submitLogin(email: string, pass: string) {
    setBusy(true);
    setError("");
    try {
      const res = await login(email, pass);
      if (res?.error) setError(res.error);
      else router.refresh();
    } catch {
      setError("Login belum bisa diproses. Coba lagi sebentar.");
    } finally {
      setBusy(false);
    }
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
    try {
      const res = await register({
        name: String(data.get("fullName") || ""),
        role: String(data.get("role") || ""),
        accountType: String(data.get("accountType") || "seller") as AccountType,
        organization: String(data.get("organization") || ""),
        location: String(data.get("location") || ""),
        email: String(data.get("email") || ""),
        password: String(data.get("password") || ""),
      });
      if (res?.error) setError(res.error);
      else router.refresh();
    } catch {
      setError("Pendaftaran belum bisa diproses. Coba lagi sebentar.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
    setShowPass(false);
    setRegisterStep(1);
    // The registration form is taller than login. Without resetting the page,
    // switching back can leave the user midway down an otherwise short login screen.
    window.scrollTo(0, 0);
  }

  return (
    <main className={`auth-screen ${mode === "register" ? "auth-register" : "auth-login"}`}>
      <section className="auth-brand-side">
        <Image src="/brand/seagres-hero.png" alt="" fill sizes="50vw" className="auth-photo" unoptimized priority />
        <div className="auth-brand-overlay" />
        <div className="auth-brand-content">
          <div className="auth-brand-mark">
            <SeagresLogo size={64} showText={false} />
          </div>
          <h2>Pasar hasil pesisir Gresik, dimulai dari sini.</h2>
          <ul className="auth-points">
            <li><ShieldCheck aria-hidden="true" /> Penjual diverifikasi penyuluh perikanan</li>
            <li><QrCode aria-hidden="true" /> Tiap lot punya kartu QR penelusuran</li>
            <li><ShoppingCart aria-hidden="true" /> Pre-order direkap otomatis per kelompok</li>
          </ul>
        </div>
      </section>

      <section className="auth-form-side">
        <span className="auth-mobile-brand">
          <SeagresLogo size={28} showText={false} />
          <strong>sea<strong className="brand-green">gres</strong></strong>
        </span>

        <div className="auth-card">
          {mode === "login" ? (
            <form className="form" onSubmit={loginForm}>
              <div>
                <h1 className="auth-title">Masuk</h1>
                <p className="auth-sub">Belanja lot segar atau catat hasil panen kelompokmu.</p>
              </div>
              {error ? <p className="form-error">{error}</p> : null}
              <label>
                Email
                <input name="email" type="email" autoComplete="email" placeholder="nama@kelompok.id" required />
              </label>
              <label>
                Kata sandi
                <span className="field">
                  <input name="password" type={showPass ? "text" : "password"} minLength={6} autoComplete="current-password" placeholder="Masukkan kata sandi" required />
                  <button type="button" className="eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                    {showPass ? <EyeOff /> : <Eye />}
                  </button>
                </span>
              </label>
              <button className="primary-button form-submit" type="submit" disabled={busy}>
                {busy ? "Memeriksa…" : "Masuk"}
              </button>
              <div className="demo-row">
                <span className="demo-tag">DEMO</span>
                <p>Pak Rahmat · KUB Mina Jaya · penjual</p>
                <button type="button" disabled={busy} onClick={() => submitLogin("rahmat@seagres.id", "demo1234")}>Masuk</button>
              </div>
              <div className="demo-row demo-buyer">
                <span className="demo-tag">DEMO</span>
                <p>Resto Pesisir Gresik · pembeli lokal</p>
                <button type="button" disabled={busy} onClick={() => submitLogin("resto@seagres.id", "demo1234")}>Masuk</button>
              </div>
              <p className="auth-foot">
                Belum punya akun? <button type="button" onClick={() => switchMode("register")}>Daftar sebagai pelaku</button>
              </p>
            </form>
          ) : (
            <form className="form" onSubmit={registerForm}>
              <div>
                <h1 className="auth-title">Daftar</h1>
                <p className="auth-sub">Buat akun penjual atau pembeli untuk mengakses SeaGres sesuai kebutuhanmu.</p>
              </div>
              {error ? <p className="form-error">{error}</p> : null}
              <div className={`register-step ${registerStep === 1 ? "active" : "inactive"}`}>
                <p className="form-step-label"><span>01</span> Data diri</p>
                <label>
                  Nama lengkap
                  <input name="fullName" autoComplete="name" placeholder="Nama sesuai KTP" required />
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
                <button className="primary-button form-submit" type="button" onClick={(event) => {
                  const firstStepFields = Array.from(event.currentTarget.form?.querySelectorAll<HTMLInputElement>(".register-step.active input") ?? []);
                  if (firstStepFields.every((field) => field.reportValidity())) {
                    setRegisterStep(2);
                    window.scrollTo(0, 0);
                  }
                }}>
                  Lanjut ke profil <ArrowRight />
                </button>
              </div>
              <div className={`register-step ${registerStep === 2 ? "active" : "inactive"}`}>
                <p className="form-step-label"><span>02</span> Profil akses</p>
                <label>
                  Saya mendaftar sebagai
                  <select name="accountType" value={accountType} onChange={(event) => {
                    const next = event.target.value as AccountType;
                    setAccountType(next);
                    setRole(next === "buyer" ? "Pembeli lokal" : "Nelayan");
                  }}>
                    <option value="seller">Penjual hasil laut</option>
                    <option value="buyer">Pembeli lokal</option>
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Peran utama
                    <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
                      {accountType === "buyer" ? <option>Pembeli lokal</option> : <>
                        <option>Nelayan</option>
                        <option>Pembudidaya</option>
                        <option>Operator kelompok/koperasi</option>
                        <option>Pengolah/UMKM</option>
                      </>}
                    </select>
                  </label>
                  <label>
                    Kecamatan
                    <input name="location" placeholder="ex: Manyar" required />
                  </label>
                </div>
                <label>
                  {accountType === "buyer" ? "Nama usaha / tempat usaha" : "Kelompok / koperasi / usaha"}
                  <input name="organization" placeholder={accountType === "buyer" ? "ex: Resto Pesisir Gresik" : "ex: KUB Mina Jaya"} required />
                </label>
                <p className="auth-note">{accountType === "buyer" ? "Profil pembeli dipakai untuk mengajukan pre-order dan menerima konfirmasi pengambilan." : "Dokumen pendukung (SK kelompok, KTP, atau izin usaha) ditindaklanjuti pendamping setelah pendaftaran."}</p>
                <label className="consent">
                  <input type="checkbox" required /> Saya menyetujui verifikasi data usaha dan publikasi lokasi umum saja, tanpa titik kapal.
                </label>
                <div className="register-actions">
                  <button className="back-button" type="button" onClick={() => setRegisterStep(1)}>Kembali</button>
                  <button className="primary-button form-submit" type="submit" disabled={busy}>
                    {busy ? "Mendaftarkan…" : "Daftar sekarang"}
                  </button>
                </div>
              </div>
              <p className="auth-foot">
                Sudah punya akun? <button type="button" onClick={() => switchMode("login")}>Masuk di sini</button>
              </p>
            </form>
          )}
        </div>
        <p className="auth-caption">Pasar hasil pesisir Gresik · dari nelayan langsung ke pembeli</p>
      </section>
    </main>
  );
}
