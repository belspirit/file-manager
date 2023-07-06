import os from "os";
import { createInterface } from "readline/promises";
import { fsPlugin, hashPlugin, osPlugin, zipPlugin } from "./plugins/index.js";
import { colors } from "./utils/colors.js";
import { logInvalidOperation } from "./utils/logger.js";
import { parseCmd, whereIam } from "./utils/util.js";

let username = "Unknown";

const exit = () => {
  console.log(
    colors.fgGreen,
    `${os.EOL}Thank you for using File Manager, ${username}, goodbye!`
  );
  process.exit();
};

const start = () => {
  const args = process.argv.slice(2);

  args.map((arg) => {
    if (arg.startsWith("--username=")) {
      [, username] = arg?.split("=");
    }
  });
  console.log(colors.fgGreen, `Welcome to the File Manager, ${username}!`);

  whereIam();

  process.on("SIGINT", function () {
    //graceful shutdown
    exit();
  });

  process.stdin.on("data", async (data) => {
    const [command, ...args] = parseCmd(data.toString());

    if (command === ".exit") exit();

    const plugins = [osPlugin, fsPlugin, hashPlugin, zipPlugin];

    let isNext = true;
    for (const plugin of plugins) {
      const noOp = await plugin(command, args);
      if (!noOp) {
        isNext = false;
        break;
      }
    }

    if (isNext) {
      logInvalidOperation();
    }

    whereIam();
  });
};

start();
