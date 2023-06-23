import { createInterface } from "readline/promises";
import { stat as fsStat, readdir, open, rename, rm } from "fs/promises";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import zlib from "zlib";
import { Transform } from "stream";

const args = process.argv.slice(2);

let username = "Unknown";
if (args[0]?.startsWith("--username=")) {
  [, username] = args[0]?.split("=");
}

let currentDir = os.homedir();

const colors = {
  fgGreen: "\x1b[32m%s\x1b[0m",
  fgCyan: "\x1b[36m%s\x1b[0m",
  fgYellow: "\x1b[33m%s\x1b[0m",
  fgRed: "\x1b[31m%s\x1b[0m",
  fgGray: "\x1b[90m%s\x1b[0m",
};

console.log(colors.fgGreen, `Welcome to the File Manager, ${username}!`);

const exit = () => {
  console.log(
    colors.fgGreen,
    `${os.EOL}Thank you for using File Manager, ${username}, goodbye!`
  );
  process.exit();
};

const whereiam = () => {
  // const currentDir = dirname(fileURLToPath(import.meta.url));
  console.log(colors.fgCyan, `You are currently in ${currentDir}`);
};
whereiam();

const readFile = async (filePath) => {
  let data = "";
  const readStream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    readStream.on("data", (chunk) => {
      data += chunk;
    });
    readStream.on("error", (err) => {
      reject(err);
    });
    readStream.on("end", () => {
      resolve(data);
    });
  });
};

const addFile = async (fileName) => {
  const fileHandle = await open(fileName, "w");
  await fileHandle.close();
};

const copyFile = async (srcPath, destPath) => {
  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath);
  await pipeline(readStream, writeStream);
};

const calculateHash = async (filePath) => {
  const hash = createHash("sha256", "MySecret");
  const input = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    input.on("readable", () => {
      const data = input.read();
      if (data) {
        hash.update(data);
      } else {
        resolve(hash.digest("hex"));
      }
    });
    input.on("error", (error) => {
      reject(error);
    });
  });
};

const compress = async (srcPath, destPath) => {
  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath);
  await pipeline(readStream, zlib.createBrotliCompress(), writeStream);
};

const brotliDecompress = new Transform({
  transform: (chunk, encoding, cb) => {
    zlib.brotliDecompress(chunk, cb);
  },
});
const decompress = async (srcPath, destPath) => {
  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath);
  await pipeline(readStream, brotliDecompress, writeStream);
};

// workarround for the Windows CTRL+C hotkey
if (process.platform === "win32") {
  var rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function () {
  //graceful shutdown
  exit();
});

process.stdin.on("data", async (data) => {
  const inputData = data.toString();
  const pattern = /[^'"\s]+|'([^']*)'|"([^"]*)"/g;
  const chunks = [];
  let regExResult;
  while ((regExResult = pattern.exec(inputData)) !== null) {
    chunks.push(regExResult[0]);
  }
  const [command, ...args] = chunks;
  console.log({ command, args });

  if (command === ".exit") exit();

  // TODO: check root level for 'up'
  switch (command) {
    case "up":
      currentDir = path.join(currentDir, "..");
      break;
    case "cd":
      const [cdPath] = args;
      if (cdPath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      const newPath = path.resolve(currentDir, cdPath);
      try {
        const stat = await fsStat(newPath);
        if (stat.isDirectory()) {
          currentDir = newPath;
        }
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;
    case "ls":
      const dirContent = await readdir(currentDir, { withFileTypes: true });
      const table = dirContent
        .map((de) => ({
          Name: de.name,
          Type: de.isDirectory()
            ? "directory"
            : de.isFile()
            ? "file"
            : de.isSymbolicLink()
            ? "link"
            : "other",
        }))
        .sort(
          (a, b) => a.Type.localeCompare(b.Type) || a.Name.localeCompare(b.Name)
        );
      console.table(table);
      break;
    case "cat":
      let [catPath] = args;
      if (catPath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      catPath = path.resolve(currentDir, catPath);
      try {
        const data = await readFile(catPath);
        console.log(colors.fgGray, data);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;
    case "add":
      let [addPath] = args;
      if (addPath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      addPath = path.resolve(currentDir, addPath);
      try {
        await addFile(addPath);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;
    case "rn":
      let [oldRnPath, newRnPath] = args;
      if (oldRnPath === undefined || newRnPath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      try {
        await rename(oldRnPath, newRnPath);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;
    case "rm":
      let [rmPath] = args;
      if (rmPath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      rmPath = path.resolve(currentDir, rmPath);
      try {
        await rm(rmPath);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;
    case "cp":
      let [srcCpPath, destCpDir] = args;
      if (srcCpPath === undefined || destCpDir === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      srcCpPath = path.resolve(currentDir, srcCpPath);
      const srcCpFilename = path.basename(srcCpPath);
      destCpDir = path.resolve(currentDir, destCpDir);
      const destCpPath = path.resolve(destCpDir, srcCpFilename);
      if (srcCpPath === destCpPath) break;
      try {
        await copyFile(srcCpPath, destCpPath);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;
    case "mv":
      let [srcMvPath, destMvDir] = args;
      if (srcMvPath === undefined || destMvDir === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      srcMvPath = path.resolve(currentDir, srcMvPath);
      const srcMvFilename = path.basename(srcMvPath);
      destMvDir = path.resolve(currentDir, destMvDir);
      const destMvPath = path.resolve(destMvDir, srcMvFilename);
      if (srcMvPath === destMvPath) break;
      try {
        await copyFile(srcMvPath, destMvPath);
        await rm(srcMvPath);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;

    case "hash":
      let [hashFilePath] = args;
      if (hashFilePath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      hashFilePath = path.resolve(currentDir, hashFilePath);
      try {
        const hash = await calculateHash(hashFilePath);
        console.log(hash);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;

    case "compress":
      let [srcZipPath, destZipPath] = args;
      if (srcZipPath === undefined || destZipPath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      srcZipPath = path.resolve(currentDir, srcZipPath);
      destZipPath = path.resolve(currentDir, destZipPath);
      if (srcZipPath === destZipPath) {
        console.log(colors.fgRed, "Operation failed");
        break;
      }
      try {
        await compress(srcZipPath, destZipPath);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;
    case "decompress":
      let [srcUnzipPath, destUnzipPath] = args;
      if (srcUnzipPath === undefined || destUnzipPath === undefined) {
        console.log(colors.fgYellow, "Invalid input");
        break;
      }
      srcUnzipPath = path.resolve(currentDir, srcUnzipPath);
      destUnzipPath = path.resolve(currentDir, destUnzipPath);
      if (srcUnzipPath === destUnzipPath) {
        console.log(colors.fgRed, "Operation failed");
        break;
      }
      try {
        await decompress(srcUnzipPath, destUnzipPath);
      } catch {
        console.log(colors.fgRed, "Operation failed");
      }
      break;

    case "os":
      let goodArgs = 0;
      if (args.includes("--EOL")) {
        console.log(JSON.stringify(os.EOL));
        goodArgs++;
      }
      if (args.includes("--cpus")) {
        console.log(`The host machine has ${os.cpus().length} CPUs:`);
        console.table(
          os
            .cpus()
            .map(({ model, speed }) => ({ Model: model, "Clock Rate": speed }))
        );
        goodArgs++;
      }
      if (args.includes("--homedir")) {
        console.log(os.homedir());
        goodArgs++;
      }
      if (args.includes("--username")) {
        console.log(os.userInfo().username);
        goodArgs++;
      }
      if (args.includes("--architecture")) {
        console.log(os.arch());
        goodArgs++;
      }
      if (goodArgs === 0) {
        console.log(colors.fgYellow, "Invalid input");
      }
      break;

    default:
      console.log(colors.fgYellow, "Invalid input");
      break;
  }

  whereiam(); // TODO: show this if success
});

// console.log({ cpus: os.cpus() });
