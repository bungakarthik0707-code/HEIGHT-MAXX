import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(process.cwd());
const publicFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.css", "app.css"],
  ["/app.js", "app.js"],
  ["/favicon.svg", "favicon.svg"],
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const fileName = publicFiles.get(pathname);

  if (!fileName || request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  try {
    const filePath = resolve(root, fileName);
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    console.error(`Unable to serve ${fileName}:`, error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The app could not load a required file.");
  }
});

const port = Number(process.env.PORT || 5000);
server.listen(port, "0.0.0.0", () => {
  console.log(`HeightMax is running on port ${port}`);
});
