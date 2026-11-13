import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { defaultStackConfig } from "../src/types.ts";
import { saveStackConfig } from "../src/cli/config-store.ts";
import { runGenerate } from "../src/cli/generate.ts";

describe("runGenerate", () => {
  it("reads an edited stack-config.json and includes a newly enabled extra", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "pb-cmd-"));
    const dataRoot = await mkdtemp(join(tmpdir(), "pb-data-"));
    const cfg = defaultStackConfig({
      dataRoot,
      configRoot: join(dataRoot, "configs"),
      puid: 1000,
      pgid: 1000,
      timezone: "Europe/London",
    });
    await saveStackConfig(cfg, outDir);
    const before = await runGenerate(outDir);
    expect(before.services).not.toContain("bazarr");

    await saveStackConfig({ ...cfg, services: { ...cfg.services, bazarr: true } }, outDir);
    const after = await runGenerate(outDir);
    const doc = parseYaml(await readFile(after.composePath, "utf8")) as { services: Record<string, unknown> };
    expect(doc.services).toHaveProperty("bazarr");
  });
});
