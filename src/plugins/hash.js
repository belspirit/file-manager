import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { colors } from "../utils/colors.js";
import { logInvalidOperation, logOperationFailed } from "../utils/logger.js";
import { getCurrentDir } from "../utils/util.js";

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

const hash = async (args) => {
  let [filePath] = args;
  if (filePath === undefined) {
    logInvalidOperation();
    return;
  }
  filePath = path.resolve(getCurrentDir(), filePath);
  try {
    const hash = await calculateHash(filePath);
    console.log(colors.fgMagenta, hash);
  } catch {
    logOperationFailed();
  }
};

export default async (command, args) => {
  switch (command) {
    case "hash":
      return hash(args);

    default:
      return true;
  }
};
