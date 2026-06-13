import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { __resetDbForTests } from "../client/lib/db.ts";

afterEach(async () => {
	await __resetDbForTests();
});
