import { errorMessage } from "./errorMessage";

test("returns a Wails-rejected error string as-is (the common case)", () => {
  expect(errorMessage("connect: connection refused")).toBe(
    "connect: connection refused",
  );
});

test("reads the message off an Error instance", () => {
  expect(errorMessage(new Error("boom"))).toBe("boom");
});

test("falls back for empty, null, or message-less values", () => {
  expect(errorMessage("")).toBe("Operation failed.");
  expect(errorMessage(null)).toBe("Operation failed.");
  expect(errorMessage({}, "Login failed.")).toBe("Login failed.");
});
