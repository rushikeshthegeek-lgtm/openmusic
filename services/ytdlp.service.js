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

    getVideoURL(id){

        return new Promise((resolve,reject)=>{

            const video =
            `https://www.youtube.com/watch?v=${id}`;

            // Try to get a progressive MP4 (contains both video+audio). If not available,
            // fallback to best which may be adaptive (video-only) and cause audio-only playback.
            const cmd = `yt-dlp -f "best[ext=mp4]/best" -g "${video}"`;

            exec(
                cmd,
                {
                    maxBuffer:1024 * 1024 * 5
                },
                (err,stdout,stderr)=>{

                    if(err){

                        console.log(stderr);

                        return reject(err);

                    }

                    const out = stdout.trim();

                    if (!out) {
                        return reject(new Error('No URL from yt-dlp'));
                    }

                    // If yt-dlp returned multiple lines, pick the first non-empty line.
                    const lines = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                    let chosen = lines[0];

                    // If the chosen URL clearly looks like an audio-only file (ends with .m4a),
                    // attempt a fallback to `best` which might produce a progressive file.
                    if (/\.m4a($|\?)/i.test(chosen) && lines.length > 1) {
                        // prefer any other line
                        const alt = lines.find(l => !/\.m4a($|\?)/i.test(l));
                        if (alt) chosen = alt;
                    }

                    resolve(chosen);

                });


        });

    }

    getVideoFormats(id){

        return new Promise((resolve,reject)=>{

            const video = `https://www.youtube.com/watch?v=${id}`;

            exec(
                `yt-dlp -J "${video}"`,
                {
                    maxBuffer:1024 * 1024 * 10
                },
                (err,stdout,stderr)=>{

                    if(err){
                        console.log(stderr);
                        return reject(err);
                    }

                    try{
                        const info = JSON.parse(stdout);
                        const formats = (info.formats || [])
                            .filter(f => f.vcodec && f.vcodec !== 'none')
                            .map(f => ({
                                format_id: f.format_id,
                                ext: f.ext,
                                height: f.height || null,
                                width: f.width || null,
                                filesize: f.filesize || f.filesize_approx || null,
                                acodec: f.acodec || null,
                                vcodec: f.vcodec || null,
                                format_note: f.format_note || '',
                                note: f.format || '',
                            }))
                            // sort descending by height (quality)
                            .sort((a,b)=> (b.height||0) - (a.height||0));

                        resolve(formats);
                    }catch(e){
                        reject(e);
                    }

                }
            );

        });

    }

    getVideoURLByFormat(id, format){

        return new Promise((resolve,reject)=>{

            const video = `https://www.youtube.com/watch?v=${id}`;

            exec(
                `yt-dlp -f "${format}" -g "${video}"`,
                { maxBuffer: 1024 * 1024 * 5 },
                (err,stdout,stderr)=>{
                    if(err){
                        console.log(stderr);
                        return reject(err);
                    }

                    const out = stdout.trim();
                    const lines = out.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
                    if(!lines.length) return reject(new Error('No URL')); 
                    resolve(lines[0]);
                }
            );

        });

    }

}

module.exports = new YTDLP();