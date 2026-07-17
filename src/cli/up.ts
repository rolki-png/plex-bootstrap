import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DockerCompose = {
  up: (dir: string) => Promise<void>;
  down: (dir: string) => Promise<void>;
  pull: (dir: string) => Promise<void>;
};

async function compose(dir: string, args: string[]): Promise<void> {
  await execFileAsync("docker", ["compose", ...args], { cwd: dir });
}

export function createDockerCompose(): DockerCompose {
  return {
    up: (dir) => compose(dir, ["up", "-d"]),
    down: (dir) => compose(dir, ["down"]),
    pull: (dir) => compose(dir, ["pull"]),
  };
}
