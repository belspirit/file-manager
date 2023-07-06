import os from "os";
import { colors } from "../utils/colors.js";
import { logInvalidOperation } from "../utils/logger.js";

export default async (command, args) => {
  switch (command) {
    case "os":
      let goodArgs = 0;
      if (args.includes("--EOL")) {
        console.log(colors.fgMagenta, JSON.stringify(os.EOL));
        goodArgs++;
      }
      if (args.includes("--cpus")) {
        console.log(
          colors.fgMagenta,
          `The host machine has ${os.cpus().length} CPUs:`
        );
        console.table(
          os
            .cpus()
            .map(({ model, speed }) => ({ Model: model, "Clock Rate": speed }))
        );
        goodArgs++;
      }
      if (args.includes("--homedir")) {
        console.log(colors.fgMagenta, os.homedir());
        goodArgs++;
      }
      if (args.includes("--username")) {
        console.log(colors.fgMagenta, os.userInfo().username);
        goodArgs++;
      }
      if (args.includes("--architecture")) {
        console.log(colors.fgMagenta, os.arch());
        goodArgs++;
      }
      if (goodArgs === 0) {
        logInvalidOperation();
      }
      return;

    default:
      return true;
  }
};
