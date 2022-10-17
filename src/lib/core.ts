import { join } from "path";
import { userInfo } from "os";
import { Stream } from "stream";
import {
    readFileSync,
    writeFileSync,
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync
} from "fs";
import { parse } from "url";
import { unlink } from "fs/promises";
import ytdl from "ytdl-core";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import sanitize from "sanitize-filename";
import sharp from "sharp";
import chalk from "chalk";
const ID3Writer = require("browser-id3-writer");

const defaultPath = join("C:", "/Users", `/${userInfo().username}`, "/Downloads");

const getThumbnailLocation = (url: string, title: string): Promise<string> => {
    return new Promise<string>(async (resolve, _) => {
        let res = await axios.request({
            url,
            method: "GET",
            responseType: "stream",
        });
        let bufferArr: Array<any> = [];
        const data = res.data as Stream;
        data.on("data", (d) => bufferArr.push(d));
        data.on("close", () => {
            const imageBuffer = Buffer.concat(bufferArr);
            const imageLocation = join(
                __dirname,
                "../../dl",
                `${sanitize(title)}.png`
            );
            sharp(imageBuffer).toFile(imageLocation);
            resolve(imageLocation);
        });
    });
};

const getAudio = async (url: string, out: string) => {
    const dlPath = join(__dirname, "../../dl");
    if (!existsSync(dlPath)) {
        mkdirSync(dlPath);
    }
    const videoId = parse(url, true).query.v as string | undefined;
    if (!videoId) {
        console.log(chalk.red.bold("This is not a valid video link!"));
        return;
    }
    console.log(chalk.white("Getting video details..."));
    const { thumbnails, title, ownerChannelName } = (
        await ytdl.getInfo(url)
    ).videoDetails;
    const thumbnail = thumbnails[thumbnails.length - 1].url;
    const getThumbnailLocationPromise = getThumbnailLocation(thumbnail, title);
    console.log(chalk.white("Downloading video..."));
    const audioStream = ytdl(videoId, {
        filter: "audioonly",
    });
    const temPath = join(__dirname, "../../dl", `${sanitize(title)}.mp3`);
    const proc = ffmpeg({ source: audioStream });
    console.log("Converting to mp3...");
    proc.setFfmpegPath(ffmpegPath!)
        .audioBitrate(320)
        .format("mp3")
        .saveToFile(temPath)
        .on("end", async () => {
            console.log(chalk.white("Filling in details..."));
            const imageLocation = await getThumbnailLocationPromise;
            const audioBuffer = readFileSync(temPath);
            const imageBuffer = readFileSync(imageLocation);
            const tagWriter = new ID3Writer(audioBuffer);
            tagWriter
                .setFrame("TIT2", title)
                .setFrame("TPE1", [ownerChannelName])
                .setFrame("TCON", ["Unknown genre"])
                .setFrame("APIC", {
                    type: 3,
                    data: imageBuffer,
                    description: "Cover photo",
                    useUnicodeEncoding: false,
                });
            tagWriter.addTag();
            writeFileSync(temPath, Buffer.from(tagWriter.arrayBuffer));
            if (!existsSync(out)) {
                mkdirSync(out);
            }
            console.log(chalk.white("Saving..."));
            const reader = createReadStream(temPath);
            const writer = createWriteStream(
                `${out as string}/${sanitize(title)}.mp3`
            );
            reader.pipe(writer);
            writer.on("close", async () => {
                await Promise.all([unlink(temPath), unlink(imageLocation)]);
                console.log(chalk.green.bold(`Finished! Saved at ${out}`));
            });
        });
};

export default getAudio;
export { defaultPath };