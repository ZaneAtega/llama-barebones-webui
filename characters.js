import fs from "fs";
import http from "http";
import os from "os";
import path from "path";

const dir = fs.realpathSync(path.join(os.homedir(), ".lmstudio", "config-presets"));

http.createServer((req, res) => {
    const filename = req.url.split("/").pop();

    if (filename) {
        const file = fs.realpathSync(path.join(dir, filename));

        if (!filename.endsWith(".json") || path.dirname(file) !== dir) {
            res.writeHead(404);
            res.end("Not Found");
            return;
        }

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(JSON.parse(fs.readFileSync(file, "utf8")).operation.fields[0].value);
    } else {
        const files = fs.readdirSync(dir)
            .filter(file => file.endsWith(".json"))
            .map(file => ({
                name: file,
                mtime: fs.statSync(path.join(dir, file)).mtimeMs
            }))
            .sort((a, b) => b.mtime - a.mtime)
            .map(file => file.name);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(files.map(file => `<a href="${file}">${file}</a><br>`).join(""));
    }
}).listen(6971, "0.0.0.0");