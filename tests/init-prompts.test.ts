import { describe, expect, it } from "vitest";
import { promptStackConfig, type PromptFns } from "../src/prompts/initPrompts.ts";

type InputArgs = { message: string; default?: string };

function makePrompts(overrides: {
  inputs?: Record<string, string>;
  extras?: string[];
  vpnEnabled?: boolean;
  password?: string;
}): PromptFns {
  const inputs = overrides.inputs ?? {};
  return {
    input: (async ({ message, default: def }: InputArgs) =>
      inputs[message] ?? def ?? "") as PromptFns["input"],
    checkbox: (async () => overrides.extras ?? []) as PromptFns["checkbox"],
    confirm: (async () => overrides.vpnEnabled ?? false) as PromptFns["confirm"],
    password: (async () => overrides.password ?? "") as PromptFns["password"],
  };
}

describe("promptStackConfig", () => {
  it("uses defaults and enables no extras or vpn when nothing selected", async () => {
    const config = await promptStackConfig(makePrompts({}));

    expect(config.dataRoot).toBe("/data");
    expect(config.services.jackett).toBe(false);
    expect(config.services.recyclarr).toBe(false);
    expect(config.services.vpn).toBe(false);
    expect(config.vpn).toBeUndefined();
    expect(config.qbittorrentPassword).toBe("adminadmin");
  });

  it("enables the extras returned by the checkbox prompt", async () => {
    const config = await promptStackConfig(
      makePrompts({ extras: ["jackett", "bazarr", "tautulli"] }),
    );

    expect(config.services.jackett).toBe(true);
    expect(config.services.bazarr).toBe(true);
    expect(config.services.tautulli).toBe(true);
    expect(config.services.flaresolverr).toBe(false);
    expect(config.services.unpackerr).toBe(false);
    expect(config.services.recyclarr).toBe(false);
  });

  it("collects VPN credentials when VPN is confirmed", async () => {
    const config = await promptStackConfig(
      makePrompts({
        vpnEnabled: true,
        password: "vpn-secret",
        inputs: {
          "VPN provider": "protonvpn",
          "VPN username": "vpn-user",
        },
      }),
    );

    expect(config.services.vpn).toBe(true);
    expect(config.vpn).toEqual({
      provider: "protonvpn",
      username: "vpn-user",
      password: "vpn-secret",
    });
  });

  it("captures a custom qBittorrent WebUI password", async () => {
    const config = await promptStackConfig(
      makePrompts({ inputs: { "qBittorrent WebUI password": "hunter2" } }),
    );

    expect(config.qbittorrentPassword).toBe("hunter2");
  });
});
