// Normalize a rejected/thrown value to a display message. Wails rejects a failed
// bound call with the Go error STRING (not an Error object); plain JS failures
// throw an Error. Handle both — and fall back — so error UI is never blank.
//
// Use it everywhere you'd reach for `(error as Error).message`: that cast is a
// lie when the value is a string, yielding `undefined` and an empty error box.
export function errorMessage(
  error: unknown,
  fallback = "Operation failed.",
): string {
  let message = "";
  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    message = String((error as { message: unknown }).message);
  } else if (typeof error === "number" || typeof error === "boolean") {
    message = String(error);
  }
  // Objects without a message (and null/undefined) fall through to the fallback
  // rather than a useless "[object Object]".
  return message.trim() || fallback;
}
