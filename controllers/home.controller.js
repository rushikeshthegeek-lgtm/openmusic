const ytdlp = require("../services/ytdlp.service");

exports.index = (req, res) => {
    res.render("index", {
        results: [],
        query: ""
    });
};

let trendingSearchQueries = [
    "trending songs in india - trending singles",
    "popular songs in india - trending singles",
    "new releases in india - trending singles",
    "new bollywood songs - trending singles",
    "old hindi songs - trending singles",
    "top 10 songs in india - trending singles",
    "latest music videos in india - trending singles",
    "hit songs in india - trending singles",
];
let recommendedSearchQueries = [
    "popular music playlist in india",
    "non-stop travel music playlist",
    "chill music playlist",
    "workout music playlist",
    "study music playlist",
    "relaxing music playlist",
    "romantic music playlist",
    "party music playlist",
];
exports.sweetHome = async (req, res) => {
    try {
        const trending =
            await ytdlp.search(
                trendingSearchQueries[Math.floor(Math.random() * trendingSearchQueries.length)]
            );
        const recommended =
            await ytdlp.search(
                recommendedSearchQueries[Math.floor(Math.random() * recommendedSearchQueries.length)]
            );
        res.json({
            trending,
            recommended
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Unable to load home"
        });
    }
};

exports.apiSearch = async (req, res) => {

    try {

        const query = req.query.q || "";

        if (!query.trim()) {

            return res.json([]);

        }


        const results =
            await ytdlp.search(query);


        res.json(results);


    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Search failed"
        });

    }

};

exports.download = async (req, res) => {

    try {

        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required."
            });
        }

        await ytdlp.download(url);

        res.json({
            success: true,
            message: "Download started."
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Download failed."
        });

    }

};

exports.stream = async (req, res) => {

    try {

        const id = req.params.id;

        const url = await ytdlp.getStreamURL(id);

        res.json({
            success: true,
            url
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false
        });

    }

};

exports.streamVideo = async (req, res) => {

    try {

        const id = req.params.id;

        const url = await ytdlp.getVideoURL(id);

        console.log('streamVideo chosen URL:', url);

        // If caller only wants metadata about the stream, return it as JSON
        if (req.query.meta === '1') {
            const meta = { url };

            // Detect likely audio-only or playlist/manifest URLs
            const low = url.toLowerCase();
            if (low.includes('.m4a') || low.includes('mime=audio') || low.includes('.webm') && low.includes('audio')) {
                meta.embed = true;
                meta.embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
            }
            if (low.includes('.m3u8') || low.includes('playlist') || low.includes('manifest')) {
                meta.embed = true;
                meta.embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
            }

            return res.json(meta);
        }

        // Proxy the remote video and forward Range headers to support seeking
        const { URL } = require('url');
        const parsed = new URL(url);
        const protocol = parsed.protocol === 'https:' ? require('https') : require('http');

        const options = {
            headers: {}
        };

        if (req.headers.range) {
            options.headers.Range = req.headers.range;
        }

        const requestOptions = {
            hostname: parsed.hostname,
            path: parsed.pathname + (parsed.search || ''),
            protocol: parsed.protocol,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            headers: options.headers
        };

        protocol.get(requestOptions, (proxyRes) => {

            // Forward status and headers
            const headers = Object.assign({}, proxyRes.headers);

            // Remove hop-by-hop headers that may confuse clients
            delete headers['transfer-encoding'];

            res.writeHead(proxyRes.statusCode, headers);
            proxyRes.pipe(res);

        }).on('error', (err) => {
            console.error('Proxy error', err);
            res.status(500).end();
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false
        });

    }

};

exports.videoFormats = async (req, res) => {
    try {
        const id = req.params.id;
        const formats = await ytdlp.getVideoFormats(id);
        res.json({ success: true, formats });
    } catch (err) {
        console.error('videoFormats error', err);
        res.status(500).json({ success: false });
    }
};

exports.streamVideoFormat = async (req, res) => {
    try {
        const id = req.params.id;
        const format = req.params.format;

        // Get actual direct URL for specified format
        const url = await ytdlp.getVideoURLByFormat(id, format);

        console.log('streamVideoFormat chosen URL:', url, 'format:', format);

        // Proxy similar to streamVideo
        const { URL } = require('url');
        const parsed = new URL(url);
        const protocol = parsed.protocol === 'https:' ? require('https') : require('http');

        const requestOptions = {
            hostname: parsed.hostname,
            path: parsed.pathname + (parsed.search || ''),
            protocol: parsed.protocol,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            headers: {}
        };

        if (req.headers.range) requestOptions.headers.Range = req.headers.range;

        protocol.get(requestOptions, (proxyRes) => {
            const headers = Object.assign({}, proxyRes.headers);
            delete headers['transfer-encoding'];
            res.writeHead(proxyRes.statusCode, headers);
            proxyRes.pipe(res);
        }).on('error', (err) => {
            console.error('Proxy error', err);
            res.status(500).end();
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

