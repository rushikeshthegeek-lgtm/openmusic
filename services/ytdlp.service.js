const { exec, execFile, spawn } = require("child_process");
const path = require("path");

const COOKIE_FILE = process.env.YTDLP_COOKIES || "";
const USER_AGENT = process.env.YTDLP_USER_AGENT || "";
const EXTRA_YTDLP_ARGS = process.env.YTDLP_ARGS ? process.env.YTDLP_ARGS.split(" ").filter(Boolean) : [];
const DEFAULT_YTDLP_ARGS = [
    "--js-runtimes",
    "node:/usr/local/bin/node"
];

function buildYtdlpArgs(args = []) {
    const result = [...DEFAULT_YTDLP_ARGS];
    if (COOKIE_FILE) {
        result.push("--cookies", COOKIE_FILE);
    }
    if (USER_AGENT) {
        result.push("--user-agent", USER_AGENT);
    }
    if (EXTRA_YTDLP_ARGS.length) {
        result.push(...EXTRA_YTDLP_ARGS);
    }
    return result.concat(args);
}

class YTDLP {

    constructor() {
        this.cache = new Map();
    }

    search(query) {

        return new Promise((resolve, reject) => {

            const key = query.toLowerCase().trim();

            // Check cache
            if (this.cache.has(key)) {
                console.log("Cache hit:", key);
                return resolve(
                    this.cache.get(key)
                );

            }

            console.log("Searching:", key);

            const args = buildYtdlpArgs([
                "--flat-playlist",
                "--dump-single-json",
                `ytsearch5:${key}`
            ]);

            console.log("yt-dlp executable:", "/opt/venv/bin/yt-dlp");
            console.log("yt-dlp args:", args);
            console.log("PATH:", process.env.PATH);

            execFile("/opt/venv/bin/yt-dlp", args, {
                maxBuffer: 1024 * 1024 * 10
            },
                (err, stdout, stderr) => {
                    if (err) {
                        console.log(stderr);
                        return reject(new Error(`yt-dlp search failed: ${stderr.trim()}`));
                    }
                    try {
                        const data =
                            JSON.parse(stdout);
                        const results =
                            data.entries.map(video => {
                                return {
                                    id: video.id,
                                    title: video.title,
                                    uploader:
                                        video.uploader ||
                                        video.channel,
                                    thumbnail:
                                        video.thumbnail ||
                                        `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
                                    url:
                                        `https://www.youtube.com/watch?v=${video.id}`
                                };
                            });

                        // Store cache
                        this.cache.set(
                            key,
                            results
                        );

                        // Remove cache after 10 minutes
                        setTimeout(() => {
                            this.cache.delete(key);
                        }, 10 * 60 * 1000);

                        resolve(results);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
        });
    }

    download(url) {

        return new Promise((resolve, reject) => {

            const output = path.join(
                __dirname,
                "../downloads/%(title)s.%(ext)s"
            );

            const args = buildYtdlpArgs([
                "-f", "bestaudio",
                "-o", output,
                url
            ]);
            console.log("yt-dlp executable:", "/opt/venv/bin/yt-dlp");
            console.log("yt-dlp args:", args);
            console.log("PATH:", process.env.PATH);

            const process = spawn("/opt/venv/bin/yt-dlp", args);
            let stderr = "";

            process.stdout.on("data", data => {
                console.log(data.toString());
            });

            process.stderr.on("data", data => {
                stderr += data.toString();
                console.log(data.toString());
            });

            process.on("close", code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Download failed: ${stderr.trim() || code}`));
                }
            });

        });

    }

    getStreamURL(id) {

        return new Promise((resolve, reject) => {

            const video = `https://www.youtube.com/watch?v=${id}`;
            const args = buildYtdlpArgs(["-f", "bestaudio", "-g", video]);
            console.log("yt-dlp executable:", "/opt/venv/bin/yt-dlp");
            console.log("yt-dlp args:", args);
            console.log("PATH:", process.env.PATH);
            const process = spawn("/opt/venv/bin/yt-dlp", args);
            let stdout = "";
            let stderr = "";

            process.stdout.on("data", data => {
                stdout += data.toString();
            });

            process.stderr.on("data", data => {
                stderr += data.toString();
                console.log(data.toString());
            });

            process.on("close", code => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(`yt-dlp failed with code ${code}: ${stderr.trim() || "unknown error"}`));
                }
            });

        });

    }

}

module.exports = new YTDLP();