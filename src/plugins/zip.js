import fs from "fs";
import path from "path";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import zlib from "zlib";
import { logInvalidOperation, logOperationFailed } from "../utils/logger.js";
import { getCurrentDir } from "../utils/util.js";

const compress = async (args) => {
  let [srcPath, destPath] = args;
  if (srcPath === undefined || destPath === undefined) {
    logInvalidOperation();
    return;
  }
  srcPath = path.resolve(getCurrentDir(), srcPath);
  destPath = path.resolve(getCurrentDir(), destPath);
  if (srcPath === destPath) {
    logOperationFailed();
    return;
  }
  try {
    const readStream = fs.createReadStream(srcPath);
    const writeStream = fs.createWriteStream(destPath);
    await pipeline(readStream, zlib.createBrotliCompress(), writeStream);
  } catch {
    logOperationFailed();
  }
};

const decompress = async (args) => {
  let [srcPath, destPath] = args;
  if (srcPath === undefined || destPath === undefined) {
    logInvalidOperation();
    return;
  }
  srcPath = path.resolve(getCurrentDir(), srcPath);
  destPath = path.resolve(getCurrentDir(), destPath);
  if (srcPath === destPath) {
    logOperationFailed();
    return;
  }
  try {
    const readStream = fs.createReadStream(srcPath);
    const writeStream = fs.createWriteStream(destPath);
    const brotliDecompress = new Transform({
      transform: (chunk, encoding, cb) => {
        zlib.brotliDecompress(chunk, cb);
      },
    });
    await pipeline(readStream, brotliDecompress, writeStream);
  } catch (error) {
    logOperationFailed();
  }
};

export default async (command, args) => {
  switch (command) {
    case "compress":
      return compress(args);
    case "decompress":
      return decompress(args);

    default:
      return true;
  }
};
