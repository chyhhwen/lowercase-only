// 產生 index.html 裡的 LOCK 設定。
//
// 用法：
//   node tools/make-lock.mjs [答案位元] [旗標]
//
// 答案位元：只含 0 / 1 的字串（0 = 小寫、1 = 大寫）。
//           省略時隨機產生 32 位。
// 旗標：過關後顯示的文字。省略時用預設值。
//
// 輸出一段 JS，整段貼回 index.html 取代原本的 LOCK 區塊。
// 答案本身不會出現在輸出裡；旗標用答案推導出的金鑰加密。

import { webcrypto as crypto } from "node:crypto";

const ITER = 200000;

let bits = process.argv[2];
const flag = process.argv[3] || "FLAG{case_is_a_side_channel}";

if (!bits) {
  const r = crypto.getRandomValues(new Uint8Array(32));
  bits = Array.from(r, (b) => b & 1).join("");
}
if (!/^[01]+$/.test(bits)) {
  console.error("答案位元只能有 0 和 1");
  process.exit(1);
}

// 畫面上的燈號是答案的反向：亮的燈就是要「關掉」的位元
const lights = bits.replace(/[01]/g, (c) => (c === "0" ? "1" : "0"));

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const base = await crypto.subtle.importKey(
  "raw", enc.encode(bits), "PBKDF2", false, ["deriveKey"]
);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
  base,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"]
);
const ct = new Uint8Array(
  await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(flag))
);

const b64 = (u) => Buffer.from(u).toString("base64");

console.log(`const LOCK = {
  lights: "${lights}",
  iter: ${ITER},
  salt: "${b64(salt)}",
  iv: "${b64(iv)}",
  ct: "${b64(ct)}",
};`);
console.error(`\n答案位元（自己留著，別 commit）：${bits}`);
