import { expect, test } from "vitest";
import { resultProof } from "./resultProof";

test("maps written/skipped/evidence and flattens the nested summary", () => {
  const proof = resultProof({
    written: ["DNS"],
    skipped: ["WAN"],
    evidence: ["save submitted", "read-back consistent"],
    summary: { dns1: "1.1.1.1", nested: { port: 443 }, empty: "", list: [1] },
  });
  expect(proof.commands).toEqual(["DNS"]);
  expect(proof.diagnostics).toEqual(["Skipped: WAN"]);
  expect(proof.readback).toEqual(["dns1: 1.1.1.1", "nested.port: 443"]);
  expect(proof.rawOutput).toBe("save submitted\nread-back consistent");
});

test("omits empty sections instead of rendering empty arrays", () => {
  const proof = resultProof({});
  expect(proof.commands).toBeUndefined();
  expect(proof.diagnostics).toBeUndefined();
  expect(proof.readback).toEqual([]);
});
