import { createReadStream, createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { colors } from "../utils/colors.js";
import { logInvalidOperation, logOperationFailed } from "../utils/logger.js";
import { getCurrentDir, setCurrentDir } from "../utils/util.js";

const up = async () => {
  const newDir = path.join(getCurrentDir(), "..");
  setCurrentDir(newDir);
};

const cd = async (args) => {
  let [dirPath] = args;
  if (dirPath === undefined) {
    logInvalidOperation();
    return;
  }
  dirPath = path.resolve(getCurrentDir(), dirPath);
  try {
    const stat = await fs.stat(dirPath);
    if (stat.isDirectory()) {
      setCurrentDir(dirPath);
    }
  } catch {
    logOperationFailed();
  }
};

const ls = async () => {
  const content = await fs.readdir(getCurrentDir(), { withFileTypes: true });
  const table = content
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
};

const readFile = async (filePath) => {
  let data = "";
  const readStream = createReadStream(filePath);
  return new Promise((resolve, reject) => {
    readStream.on("data", (chunk) => (data += chunk));
    readStream.on("error", (err) => reject(err));
    readStream.on("end", () => resolve(data));
  });
};

const cat = async (args) => {
  let [filePath] = args;
  if (filePath === undefined) {
    logInvalidOperation();
    return;
  }
  filePath = path.resolve(getCurrentDir(), filePath);
  try {
    const data = await readFile(filePath);
    console.log(colors.fgGray, data);
  } catch {
    logOperationFailed();
  }
};

const addFile = async (args) => {
  let [filePath] = args;
  if (filePath === undefined) {
    logInvalidOperation();
    return;
  }
  filePath = path.resolve(getCurrentDir(), filePath);
  try {
    const fileHandle = await fs.open(filePath, "w");
    await fileHandle.close();
  } catch {
    logOperationFailed();
  }
};

const renameFile = async (args) => {
  let [oldFilePath, newFilePath] = args;
  if (oldFilePath === undefined || newFilePath === undefined) {
    logInvalidOperation();
    return;
  }
  oldFilePath = path.resolve(getCurrentDir(), oldFilePath);
  newFilePath = path.resolve(getCurrentDir(), newFilePath);
  try {
    await fs.rename(oldFilePath, newFilePath);
  } catch {
    logOperationFailed();
  }
};

const removeFile = async (args) => {
  let [filePath] = args;
  if (filePath === undefined) {
    logInvalidOperation();
    return;
  }
  filePath = path.resolve(getCurrentDir(), filePath);
  try {
    await fs.rm(filePath);
  } catch {
    logOperationFailed();
  }
};

const copyFile = async (args) => {
  let [srcFilePath, destDir] = args;
  if (srcFilePath === undefined || destDir === undefined) {
    logInvalidOperation();
    return;
  }
  srcFilePath = path.resolve(getCurrentDir(), srcFilePath);
  const srcFilename = path.basename(srcFilePath);
  destDir = path.resolve(getCurrentDir(), destDir);
  const destFilePath = path.resolve(destDir, srcFilename);
  if (srcFilePath === destFilePath) {
    logOperationFailed();
    return;
  }
  try {
    const readStream = createReadStream(srcFilePath);
    const writeStream = createWriteStream(destFilePath);
    await pipeline(readStream, writeStream);
  } catch {
    logOperationFailed();
  }
};

const moveFile = async ([srcFilePath, destDir]) => {
  if (srcFilePath === undefined || destDir === undefined) {
    logInvalidOperation();
    return;
  }
  srcFilePath = path.resolve(getCurrentDir(), srcFilePath);
  const srcFilename = path.basename(srcFilePath);
  destDir = path.resolve(getCurrentDir(), destDir);
  const destFilePath = path.resolve(destDir, srcFilename);
  if (srcFilePath === destFilePath) {
    logOperationFailed();
    return;
  }
  try {
    await copyFile([srcFilePath, destDir]);
    await fs.rm(srcFilePath);
  } catch {
    logOperationFailed();
  }
};

export default async (command, args) => {
  switch (command) {
    case "up":
      return up();
    case "cd":
      return cd(args);
    case "ls":
      return ls();
    case "cat":
      return cat(args);
    case "add":
      return addFile(args);
    case "rn":
      return renameFile(args);
    case "rm":
      return removeFile(args);
    case "cp":
      return copyFile(args);
    case "mv":
      return moveFile(args);

    default:
      return true;
  }
};
