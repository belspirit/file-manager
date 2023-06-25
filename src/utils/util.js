import os from "os";
import { colors } from "./colors.js";

let _currentDir = os.homedir();

export const getCurrentDir = () => {
  return _currentDir;
};

export const setCurrentDir = (currentDir) => {
  _currentDir = currentDir;
};

export const parseCmd = (line) => {
  const pattern = /[^'"\s]+|'([^']*)'|"([^"]*)"/g;
  const cmdChunks = [];
  let regExResult;
  while ((regExResult = pattern.exec(line)) !== null) {
    cmdChunks.push(regExResult[0]);
  }
  return cmdChunks;
};

export const whereIam = () => {
  console.log(colors.fgCyan, `You are currently in ${getCurrentDir()}`);
};
