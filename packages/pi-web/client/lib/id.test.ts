import { describe, expect, it } from "vitest";
import { generateId, isValidId } from "./id";

describe("generateId", () => {
	it("returns a valid v4 UUID", () => {
		const id = generateId();
		expect(isValidId(id)).toBe(true);
	});

	it("produces unique values", () => {
		const a = generateId();
		const b = generateId();
		expect(a).not.toBe(b);
	});
});

describe("isValidId", () => {
	it("accepts canonical UUIDs", () => {
		expect(isValidId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
	});

	it("rejects bad shapes", () => {
		expect(isValidId("not-a-uuid")).toBe(false);
		expect(isValidId("550e8400-e29b-41d4-a716")).toBe(false);
		expect(isValidId("")).toBe(false);
		expect(isValidId("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
	});
});
