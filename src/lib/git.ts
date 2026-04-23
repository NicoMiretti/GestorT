import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { simpleGit, SimpleGit } from "simple-git";

const REPO_DIR = path.join(process.cwd(), "data", "repo");

function authedUrl(): string {
  const url = process.env.REPO_URL;
  const pat = process.env.GITHUB_PAT;
  if (!url) throw new Error("REPO_URL no configurada en .env.local");
  if (!pat || pat === "ghp_xxx") return url;
  // https://github.com/owner/repo.git -> https://<pat>@github.com/owner/repo.git
  return url.replace("https://", `https://${pat}@`);
}

export function repoPath(): string {
  return REPO_DIR;
}

export async function ensureCloned(): Promise<{ cloned: boolean }> {
  if (existsSync(path.join(REPO_DIR, ".git"))) return { cloned: false };
  await fs.mkdir(path.dirname(REPO_DIR), { recursive: true });
  const git = simpleGit();
  await git.clone(authedUrl(), REPO_DIR, [
    "--branch",
    process.env.REPO_BRANCH || "main",
  ]);
  await configureIdentity();
  return { cloned: true };
}

async function configureIdentity() {
  const g = simpleGit(REPO_DIR);
  const name = process.env.GIT_AUTHOR_NAME;
  const email = process.env.GIT_AUTHOR_EMAIL;
  if (name) await g.addConfig("user.name", name);
  if (email) await g.addConfig("user.email", email);
}

export async function git(): Promise<SimpleGit> {
  await ensureCloned();
  return simpleGit(REPO_DIR);
}

export async function pull() {
  const g = await git();
  const res = await g.pull("origin", process.env.REPO_BRANCH || "main");
  return res;
}

export async function commitAndPush(message: string, files: string[]) {
  const g = await git();
  if (files.length) await g.add(files);
  else await g.add(".");
  const status = await g.status();
  if (status.staged.length === 0 && status.created.length === 0 && status.modified.length === 0) {
    return { committed: false, pushed: false, message: "Nada para commitear" };
  }
  await g.commit(message);
  // Asegurar remote autenticado en cada push (por si el PAT cambió)
  await g.remote(["set-url", "origin", authedUrl()]);
  await g.push("origin", process.env.REPO_BRANCH || "main");
  return { committed: true, pushed: true };
}

export async function status() {
  const g = await git();
  return g.status();
}

export async function log(file?: string, limit = 30) {
  const g = await git();
  const opts: Record<string, string | null> = { n: String(limit) };
  if (file) {
    const entries = await g.log({ file, ...opts });
    return entries.all;
  }
  const entries = await g.log(opts);
  return entries.all;
}

export async function fileExists(rel: string): Promise<boolean> {
  await ensureCloned();
  return existsSync(path.join(REPO_DIR, rel));
}

export async function readRepoFile(rel: string): Promise<string> {
  await ensureCloned();
  return fs.readFile(path.join(REPO_DIR, rel), "utf8");
}

export async function writeRepoFile(rel: string, content: string): Promise<void> {
  await ensureCloned();
  const full = path.join(REPO_DIR, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

export async function listMd(dir: string): Promise<string[]> {
  await ensureCloned();
  const full = path.join(REPO_DIR, dir);
  if (!existsSync(full)) return [];
  const out: string[] = [];
  async function walk(p: string, base: string) {
    const items = await fs.readdir(p, { withFileTypes: true });
    for (const it of items) {
      const childAbs = path.join(p, it.name);
      const childRel = path.posix.join(base, it.name);
      if (it.isDirectory()) await walk(childAbs, childRel);
      else if (it.isFile() && it.name.toLowerCase().endsWith(".md")) out.push(childRel);
    }
  }
  await walk(full, dir);
  return out.sort();
}
