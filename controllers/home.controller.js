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

