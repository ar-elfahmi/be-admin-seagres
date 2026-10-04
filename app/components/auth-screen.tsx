"use client";

import Image from "next/image";
import { ArrowRight, Eye, EyeOff, QrCode, ShieldCheck, Package } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "../actions";
import type { AccountType } from "../../lib/types";
import SeagresLogo from "./seagres-logo";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("pengepul");
  const [role, setRole] = useState("Pengepul perikanan");
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
      else router.push("/dashboard");
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
    if (registerStep === 1) { setRegisterStep(2); return; }
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await register({
        name: String(data.get("fullName") || ""),
        role: String(data.get("role") || ""),
        accountType: String(data.get("accountType") || "pengepul") as AccountType,
        organization: String(data.get("organization") || ""),
        location: String(data.get("location") || ""),
        email: String(data.get("email") || ""),
        password: String(data.get("password") || ""),
      });
      if (res?.error) setError(res.error);
      else router.push("/dashboard");
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
            <li><ShieldCheck aria-hidden="true" /> Profil pengepul dan sumber nelayan tercatat</li>
            <li><QrCode aria-hidden="true" /> QR keterlacakan untuk setiap penerimaan</li>
            <li><Package aria-hidden="true" /> Harga per grade dan stok per sumber</li>
          </ul>
        </div>
      </section>

      <section className="auth-form-side">
        <span className="auth-mobile-brand">
          <SeagresLogo size={28} showText={false} />

        </span>

        <div className="auth-card">
          {mode === "login" ? (
            <form className="form" onSubmit={loginForm}>
              <div>
                <h1 className="auth-title">Masuk</h1>
                <p className="auth-sub">Telusuri hasil laut atau kelola produk pengepulanmu.</p>
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
                <p>Pak Rahmat · KUB Mina Jaya · pengepul</p>
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
                <p className="auth-sub">Buat akun pengepul atau pembeli untuk mengakses SeaGres sesuai kebutuhanmu.</p>
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
                    setRole(next === "customer" ? "Pembeli lokal" : "Pengepul perikanan");
                  }}>
                    <option value="pengepul">Pengepul hasil laut</option>
                    <option value="customer">Pembeli lokal</option>
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Peran utama
                    <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
                      {accountType === "customer" ? <option>Pembeli lokal</option> : <>
                        <option>Pengepul perikanan</option>
                        <option>Pembudidaya</option>
                        <option>Operator kelompok/koperasi</option>
                        <option>Pengolah/UMKM</option>
                      </>}
                    </select>
                  </label>
                  <label>
                    Kecamatan
                    <input name="location" placeholder="ex: Manyar" required={registerStep === 2} />
                  </label>
                </div>
                <label>
                  {accountType === "customer" ? "Nama usaha / tempat usaha" : "Kelompok / koperasi / usaha"}
                  <input name="organization" placeholder={accountType === "customer" ? "ex: Resto Pesisir Gresik" : "ex: KUB Mina Jaya"} required={registerStep === 2} />
                </label>
                <p className="auth-note">{accountType === "customer" ? "Akun pembeli dapat melihat katalog, harga per sumber, dan keterlacakan. Preorder masih dalam pengembangan." : "Akun pengepul dapat mencatat produk dan penerimaan. Pendaftaran tidak otomatis memberikan status terverifikasi; alur verifikator masih dalam pengembangan."}</p>
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
