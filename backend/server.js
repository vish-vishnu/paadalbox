require("dotenv").config();
const fs = require("fs");
const { google } = require("googleapis");
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { count } = require("console");
const cors = require("cors");


const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;


const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_URI,
        private_key: process.env.PRODUCT_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const dbName = "paadalbox";
const collectionName = "playlist";


const folderId = "1GU7U0eua7VARm9UgMrCRdAcMP9oG30y8";

app.get("/playlist", async (req, res) => {
    try {

        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const songs = await collection.find().sort({ name: 1 }).toArray();
        await client.close();

        res.json(songs);


    } catch (error) {
        console.error("Error fetching playlist", error);
        res.status(500).send("Failed to Fetch Playlist from DB");

    }
})

app.get("/driveId-get", async (req, res) => {
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: "files(id, name)",
        });
        const files = response.data.files;
        if (!files || files.length === 0) {
            return res.status(404).send("No files found in your playlist");
        }


        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const formattedFiles = files.map((file) => ({
            _id: file.id,
            name: file.name.replace(/\.mp3$/i, ""),
        }));

        for (const song of formattedFiles) {
            await collection.updateOne(
                { _id: song._id }, // filter by fileId
                { $setOnInsert: song }, // only insert if not exists
                { upsert: true }
            );
        }
        await client.close();

        res.json({ message: "Folder files saved to MongoDB", count: formattedFiles.length });

    } catch (error) {
        console.error("Error fetching files:", error.message);
        res.status(500).send("Failed to save Folder Files");
    }
});

app.get("/stream/:id", async (req, res) => {
    const fileId = req.params.id;
    const range = req.headers.range;
    if (!range) {
        return res.status(400).send("Range header required");
    }

    try {
        const metadata = await drive.files.get({
            fileId,
            fields: "size",
        });
        const fileSize = parseInt(metadata.data.size, 10);

        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;


        const contentLength = end - start + 1;

        const headers = {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": contentLength,
            "Content-Type": "audio/mpeg",
        };

        res.writeHead(206, headers);

        const response = await drive.files.get(
            { fileId, alt: "media" },
            {
                responseType: "stream",
                headers: { Range: `bytes=${start}-${end}` },
            }
        );

        response.data.pipe(res);
    } catch (error) {
        console.error("Error Streaming File:", error);
        res.status(500).send("Failed to stream song");

    }
})

app.listen(PORT, () => console.log(`server running at http://localhost:${PORT}`));


