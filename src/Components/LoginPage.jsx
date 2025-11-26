import React, { useEffect, useMemo, useState } from "react";

/** ========= Crypto helpers (AES-GCM via Web Crypto) ========= **/
const PASSPHRASE = "rvp-insansa-local-session-key-please-change-2025"; // change to your app's secret
const SALT_STR = "rvp-insansa-auth-salt-v1"; // can rotate for invalidating old sessions
const STORAGE_KEY = "rvp_auth_session_v1";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const ub64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

async function deriveKey() {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc(PASSPHRASE),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc(SALT_STR),
      iterations: 120000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJson(obj) {
  const key = await deriveKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc(JSON.stringify(obj));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  return {
    v: 1,
    iv: b64(iv),
    ct: b64(ciphertext),
  };
}

async function decryptJson(payload) {
  const { v, iv, ct } = payload || {};
  if (v !== 1 || !iv || !ct) throw new Error("Invalid payload");
  const key = await deriveKey();
  const plaintext = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ub64(iv) },
    key,
    ub64(ct)
  );
  return JSON.parse(dec(plaintext));
}

/** ========= Session helpers ========= **/
async function saveSession({ rvpId }) {
  const now = Date.now();
  const exp = now + SESSION_TTL_MS;
  const session = { rvpId, iat: now, exp }; // keep it minimal; avoid storing password if you can
  const encrypted = await encryptJson(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
}

async function loadSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    const session = await decryptJson(payload);
    if (typeof session?.exp !== "number" || Date.now() > session.exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/** ========= Component ========= **/
const LoginPage = ({ setIsCorrect, Credentials }) => {
  const [rvpId, setRvpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true); // default ON

  // Auto-login if a valid 1-day session exists
  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session?.rvpId) {
        setIsCorrect(true);
      }
    })();
  }, [setIsCorrect]);

  const canSubmit = useMemo(() => rvpId.trim() && password.trim(), [rvpId, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const expectedId = Credentials?.id ?? Credentials?.username ?? Credentials?.rvpId ?? "";
    const expectedPw = Credentials?.password ?? Credentials?.pass ?? "";

    // Validate
    if (expectedId && expectedPw) {
      if (rvpId.trim() === String(expectedId).trim() && password === String(expectedPw)) {
        if (remember) {
          await saveSession({ rvpId });
        } else {
          clearSession();
        }
        setIsCorrect(true);
        return;
      }
      setError("Invalid ID or password. Please try again.");
      return;
    }

    // Fallback: no provided credentials → accept any non-empty
    if (remember) {
      await saveSession({ rvpId });
    } else {
      clearSession();
    }
    setIsCorrect(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="relative bg-white/80 backdrop-blur-md shadow-xl rounded-2xl border border-gray-100 p-6 sm:p-8">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-lg font-semibold text-gray-900">
                Welcome Janardan Rai Nagar Rajasthan Vidyapeeth
              </h1>
              <p className="text-sm text-gray-500">Verify to continue</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* RVP ID */}
            <div>
              <label htmlFor="rvpId" className="block text-sm font-medium text-gray-700 mb-1">
                RVP ID
              </label>
              <div className="relative">
                <input
                  id="rvpId"
                  type="text"
                  value={rvpId}
                  onChange={(e) => setRvpId(e.target.value)}
                  placeholder="Enter RVP_ID"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoComplete="username"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">🪪</span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-12 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute inset-y-0 right-2.5 my-auto text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-md"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remember me (1 day)
              </label>
              {/* Optional: Add a sign-out button for testing auto-login */}
              <button
                type="button"
                onClick={() => { clearSession(); setError("Cleared stored session."); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear session
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-white font-medium shadow-sm transition
                ${canSubmit ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500" : "bg-indigo-300 cursor-not-allowed"}`}
            >
              Login
            </button>
          </form>

          {/* Footer hint */}
          <p className="mt-6 text-center text-xs text-gray-500">
            👋🏻 : Welcome <span className="font-semibold">Janardan Rai Nagar Rajasthan Vidyapeeth</span> Please verify.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
