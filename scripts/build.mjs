// Build simples, sem bundler: copia o site para dist/ e carimba a versão.
//
// - Calcula um hash do conteúdo de todos os arquivos do app.
// - Acrescenta ?v=<hash> aos <link>/<script> locais do index.html, para o
//   navegador nunca usar CSS/JS antigos depois de um deploy.
// - Gera o sw.js com o nome de cache e a lista de arquivos daquela versão,
//   o que faz o app instalado se atualizar sozinho.

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const DIST = join(RAIZ, "dist");
const ESTATICOS = ["index.html", "manifest.json", "icon-192.png", "icon-512.png"];
const PASTAS = ["css", "js"];

async function listar(pasta) {
  const saida = [];
  for (const e of await readdir(join(RAIZ, pasta), { withFileTypes: true })) {
    const rel = join(pasta, e.name);
    if (e.isDirectory()) saida.push(...(await listar(rel)));
    else saida.push(rel);
  }
  return saida.sort();
}

const arquivos = [...ESTATICOS, ...(await Promise.all(PASTAS.map(listar))).flat()];

const hash = createHash("sha256");
for (const a of arquivos) hash.update(a).update(await readFile(join(RAIZ, a)));
hash.update(await readFile(join(RAIZ, "sw.js")));
const versao = hash.digest("hex").slice(0, 10);

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
for (const a of ESTATICOS) await cp(join(RAIZ, a), join(DIST, a));
for (const p of PASTAS) await cp(join(RAIZ, p), join(DIST, p), { recursive: true });

let html = await readFile(join(RAIZ, "index.html"), "utf8");
html = html.replace(/(href|src)="(\/(?:css|js)\/[^"?]+)"/g, `$1="$2?v=${versao}"`);
await writeFile(join(DIST, "index.html"), html);

const assets = ["/", ...arquivos.map((a) => "/" + relative(RAIZ, join(RAIZ, a))).map((u) =>
  /^\/(css|js)\//.test(u) ? `${u}?v=${versao}` : u)];
let sw = await readFile(join(RAIZ, "sw.js"), "utf8");
sw = sw.replace("__VERSAO__", versao).replace("__ASSETS__", JSON.stringify(assets, null, 2));
await writeFile(join(DIST, "sw.js"), sw);

console.log(`Build ${versao}: ${arquivos.length} arquivos em dist/`);
