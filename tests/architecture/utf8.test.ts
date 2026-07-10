import { describe, expect, it } from "vitest";
import { inspectTextBuffer } from "../../scripts/check-utf8.mjs";

describe("UTF-8 repository guard", () => {
  it("rejects a UTF-8 BOM", () => {
    expect(inspectTextBuffer(Buffer.from([0xef, 0xbb, 0xbf, 0x61]))).toEqual({
      ok: false,
      reason: "UTF-8 BOM is not allowed",
    });
  });

  it("accepts Chinese UTF-8 with LF line endings", () => {
    expect(inspectTextBuffer(Buffer.from("技术教程\n", "utf8"))).toEqual({ ok: true });
  });

  it("rejects invalid UTF-8", () => {
    expect(inspectTextBuffer(Buffer.from([0xc3, 0x28]))).toEqual({
      ok: false,
      reason: "Invalid UTF-8",
    });
  });

  it("rejects CRLF line endings", () => {
    expect(inspectTextBuffer(Buffer.from("line one\r\nline two\r\n", "utf8"))).toEqual({
      ok: false,
      reason: "CRLF line endings are not allowed",
    });
  });

  it("rejects a lone carriage return", () => {
    expect(inspectTextBuffer(Buffer.from("line one\rline two", "utf8"))).toEqual({
      ok: false,
      reason: "Carriage returns are not allowed",
    });
  });
});
