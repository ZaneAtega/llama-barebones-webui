import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import { modify_prompt } from "./modify-prompt.js";

const DIR = path.resolve(fileURLToPath(new URL("./prompts/", import.meta.url)));

const FILES = fs.readdirSync(DIR)
    .filter(f => f.endsWith(".txt"))
    .map(f => ({
        name: f.split(".txt")[0],
        mtime: fs.statSync(path.join(DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .map(f => `<a href="${f.name}">${f.name}</a><br>`)
    .join('');

const OK = [200, { "Content-Type": "text/html; charset=utf-8" }];

const Html = {
   style: "<style>body{background:#000;color:#fff;font-family:ui-sans-serif,system-ui}a{text-decoration:none;color:inherit}textarea{background:#000;border-color:#fff;width:100%;height:4lh;color:inherit;font-family:inherit}</style>",

   _js: `
const endpoint = \`\${location.origin.split(':').slice(0, -1).join(':')}:6970\`;

const methodAndHeaders = {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${fs.readFileSync(new URL("./api-key.txt", import.meta.url), "utf8")}"
    }
};

const tokenize = msg => fetch(\`\${endpoint}/tokenize\`, { ...methodAndHeaders, body: JSON.stringify({ content:msg }) }).then(r => r.json()).then(r => r.tokens.length);

const send = async msg => {
    chat.insertAdjacentHTML("beforeend", \`<p style="opacity:.8">\${msg}</p>\`);

    const msgs = [...document.querySelectorAll('p')];
    let i;

    for (i = 0; await tokenize(msgs.slice(i).map(msg => msg.textContent).join("\\n")) > 16384; i++);

    const payload = structuredClone(template);

    for (; i < msgs.length; i++)
        payload.messages.push({ role: msgs[i].style.opacity ? "user" : "assistant", content: msgs[i].textContent });

    const reply = document.createElement('p');
    chat.insertAdjacentElement("beforeend", reply);

    const r = await fetch(\`\${endpoint}/v1/chat/completions\`, { ...methodAndHeaders, body: JSON.stringify(payload) });

    const reader = r.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        for (const line of decoder.decode(value, { stream: true }).split("\\n")) {
            if (!line.startsWith("data: ")) continue;
            if (line === "data: [DONE]") break;

            reply.textContent += JSON.parse(line.slice(6)).choices[0].delta.content || '';
        }
    }

    localStorage.setItem(location.href, chat.innerHTML);
};

const bottom = () => requestAnimationFrame(() => scrollTo(0, document.body.scrollHeight));
onload = () => ((chat = document.getElementById("chat")).innerHTML = localStorage.getItem(location.href)) && bottom();`,

   _body: `
<body>
   <div id="chat" onclick="event.target.matches('p')&&confirm('Delete message?')&&event.target.remove()"></div>
   <textarea onkeydown="event.key==='Enter'&&!event.preventDefault()&&send(this.value)&&(this.value='')"></textarea>
   <button onclick="Object.assign(document.createElement('a'),{href:window.URL.createObjectURL(new Blob([chat.innerHTML])),download:\`\${location.href.split('/')[3]} \${Date.now()}.html\`}).click()">Download</button>
   <button onclick="chat.innerHTML=''">New</button>
   <input title="Import" type="file" accept=".html" onchange="this.files[0].text().then(html=>(chat.innerHTML=html)&&bottom())">
</body>`,

   build_html(system) {
      return `<head><meta name="viewport" content="width=device-width, initial-scale=1.0">${this.style}<script>const template={"messages":[{"role":"system","content":${JSON.stringify(system)}}],"stream":true,"reasoning_effort":"minimal"};${this._js}</script></head>${this._body}`;
   }
};

http.createServer((req, res) => {
    const segments = req.url.replace(/\/$/, '').split('/');

    let file;

    switch (segments.length) {
        case 1:
            res.writeHead(...OK);
            return res.end(FILES);
        case 3:
            if (segments[2] !== "chat") segments[1] = "foo";
        case 2:
            if (segments[1] === "favicon.ico") {
                res.writeHead(204);
                return res.end();
            }

            file = fs.realpathSync(path.join(DIR, `${segments[1]}.txt`));
            if (path.dirname(file) === DIR) break;
        default:
            res.writeHead(404);
            return res.end("Not Found");
    }

    const system = modify_prompt(fs.readFileSync(file, "utf8")); // Deliberately leave the error uncaught if the file doesn't exist

    if (!system && segments[2] !== "chat") {
        res.writeHead(302, { Location: `${req.url}/chat` });
        return res.end();
    }

    res.writeHead(...OK);
    res.end(segments.length === 2 ? `${Html.style}<a href="${req.url}/chat">${system}</a>` : Html.build_html(system));
}).listen(6969, "0.0.0.0");

// New-NetFirewallRule -DisplayName "llama.cpp" -Protocol TCP -LocalPort 6970 -Action Allow -Profile Private