const { exec, spawn } = require("child_process");
const path = require("path");

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

            const command =
                `yt-dlp --flat-playlist --dump-single-json "ytsearch5:${key}"`;

            exec(command, {
                maxBuffer: 1024 * 1024 * 10
            },
                (err, stdout, stderr) => {
                    if (err) {
                        console.log(stderr);
                        return reject(err);
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

            const process = spawn("yt-dlp", [
                "-f", "bestaudio",
                "-o", output,
                url
            ]);

            process.stdout.on("data", data => {
                console.log(data.toString());
            });

            process.stderr.on("data", data => {
                console.log(data.toString());
            });

            process.on("close", code => {

                if (code === 0)
                    resolve();
                else
                    reject(new Error("Download failed"));

            });

        });

    }

    getStreamURL(id){

        return new Promise((resolve,reject)=>{


            const video =
            `https://www.youtube.com/watch?v=${id}`;


            exec(
                `yt-dlp -f bestaudio -g "${video}"`,
                {
                    maxBuffer:1024 * 1024 * 5
                },
                (err,stdout,stderr)=>{


                    if(err){

                        console.log(stderr);

                        return reject(err);

                    }


                    resolve(
                        stdout.trim()
                    );


                });


        });


    }

}

module.exports = new YTDLP();