import test from "node:test";
import assert from "node:assert/strict";
import { friendlyEmailError, renderTemplate } from "./emailHelpers.js";

test("renders every occurrence of an Email template variable", () => {
  assert.equal(
    renderTemplate("Hi {{name}}, {{name}}!", { name: "Tony" }),
    "Hi Tony, Tony!"
  );
});

test("returns an admin-friendly Email delivery error", () => {
  assert.equal(friendlyEmailError({ code: "EAUTH" }), "寄件帳號驗證失敗。");
  assert.equal(friendlyEmailError({ code: "ETIMEDOUT" }), "寄件服務連線逾時。");
  assert.equal(friendlyEmailError({}), "寄送失敗，請稍後重試。");
});
