import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number.parseInt(process.argv[2] ?? process.env.PORT ?? "3000", 10);
const root = join(process.cwd(), "apps", "web", "public");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

createServer(async (request, response) => {
  const rawPath = request.url === "/" ? "/phase1-preview.html" : (request.url ?? "/phase1-preview.html");
  const relativePath = normalize(rawPath.split("?")[0] ?? "/phase1-preview.html").replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, relativePath);

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`CrusherMitra AI Phase 1 preview running at http://localhost:${port}`);
});
