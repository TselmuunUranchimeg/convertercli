#!/usr/bin/env node

import { Command } from "commander";
import getAudio, { defaultPath } from "./lib/core";

const program = new Command();

program
    .name("converter")
    .description("a tool to convert YouTube videos and save them in specified location")
    .usage("[command] [options]");

program
    .command("url")
    .usage("<link> [options]")
    .description("get video in specified link and convert it to a mp3 file")
    .summary("get video and convert to audio file")
    .argument("<link>", "url of the youtube video")
    .option("-o, --outPut <string>", "location to save audio", defaultPath)
    .action(async (url, options) => {await getAudio(url, options.outPut)});

program.parse();