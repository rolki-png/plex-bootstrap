export type ExecResult = { code: number; stdout: string; stderr: string };

export type DoctorDeps = {
  which: (cmd: string) => Promise<string | null>;
  exec: (cmd: string) => Promise<ExecResult>;
  canWrite: (path: string) => Promise<boolean>;
  dataRoot: string;
};

export type DoctorCheck = { name: string; ok: boolean; detail: string };
