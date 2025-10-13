require("dotenv").config();
const fs = require("fs");
const { google } = require("googleapis");
const express= require("express");
const {MongoClient,ServerApiVersion}=require("mongodb");
const { count } = require("console");
const cors = require("cors");


const app= express();
app.use(cors());
app.use(express.json());
const PORT=process.env.PORT || 3000;


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

const dbName="paadalbox";
const collectionName="playlist";


const folderId = "1GU7U0eua7VARm9UgMrCRdAcMP9oG30y8";

app.get("/playlist",async (req,res)=>{
    try {
        
        await client.connect();
        const db= client.db(dbName);
        const collection=db.collection(collectionName);

        const songs=await collection.find().sort({name:1}).toArray();
        await client.close();

        res.json(songs);
       
        
    } catch (error) {
        console.error("Error fetching playlist",error);
        res.status(500).send("Failed to Fetch Playlist from DB");
        
    }
})

app.get("/driveId-get",async(req,res)=>{
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: "files(id, name)",
        });
        const files = response.data.files;
        // console.log(response.data.files);
        if(!files || files.length ===0){
            return res.status(404).send("No files found in your playlist");
        }

        
        await client.connect();
        const db= client.db(dbName);
        const collection=db.collection(collectionName);

        const formattedFiles=files.map((file)=>({
            _id:file.id,
            name:file.name.replace(/\.mp3$/i, ""),
        }));

        for (const song of formattedFiles) {
      await collection.updateOne(
        { _id: song._id }, // filter by fileId
        { $setOnInsert: song }, // only insert if not exists
        { upsert: true }
      );
    }
        await client.close();

        res.json({message:"Folder files saved to MongoDB",count:formattedFiles.length});

    } catch (error) {
        console.error("Error fetching files:", error.message);
        res.status(500).send("Failed to save Folder Files");
    }
});

app.get("/stream/:id",async (req,res)=>{
    const fileId=req.params.id;
    console.log(fileId);
    

    try {
        const response= await drive.files.get(
            {fileId,alt:"media"},
            {responseType:"stream"}
        );

        res.setHeader("Content-Type","audio/mpeg");
        res.setHeader("Accept-Ranges","bytes");

        response.data
            .on("end",()=>console.log("streaming"))
            .on("error",(err)=>{
                console.error("Stream erroe",err);
                res.status(500).end();
            })
            .pipe(res);
    } catch (error) {
        console.error("Error Streaming File:",error);
        res.status(500).send("Failed to stream song");
        
    }
})

app.listen(PORT, ()=>console.log(`server running at http://localhost:${PORT}`));

// Vishnu@2523

// async function downloadFile(fileId, destination) {
//     const dest = fs.createWriteStream(destination);
//     const res = await drive.files.get(
//         { fileId: fileId, alt: "media" },
//         { responseType: "stream" }
//     );
//     await new Promise((resolve, reject) => {
//         res.data.pipe(dest);
//         dest.on("finish", resolve);
//         dest.on("error", reject);
//     });
// }

// async function getMetadata(fileId,fileName) {
//     const tempPath = `./temp/${fileName}`;
//     await fs.ensureDir("./temp");
//     await downloadFile(fileId, tempPath);

//     const metadata = await mm.parseFile(tempPath);

//     await fs.remove(tempPath); 
//     return{
//         title: metadata.common.title || fileName,
//         artist: metadata.common.artist || "Unknown Artist",
//         album: metadata.common.album || "Unknown Album",
//         url:fileId,
//     }
// }

    
    // for (const file of files) {
    //     const data = await getMetadata(file.id,file.name);
    //     console.log(data);
    // }
