#!/usr/bin/env node

import { Command } from "commander";
import getAudio, { defaultPath } from "./lib/core";

const program = new Command();

program
    .name("converter")
    .description("a tool to convert YouTube videos and save them in specified location")
    .usage("[options]")
    .requiredOption("-u, --url <link>", "link to the video")
    .option("-o, --outPut <string>", "location to save audio", defaultPath);

program.parse(process.argv);

const options = program.opts();

(async () => {
    await getAudio(options.url, options.outPut);
})();