import { colors } from "./colors.js";

export const logInvalidOperation = () => {
  console.log(colors.fgYellow, "Invalid input");
};

export const logOperationFailed = () => {
  console.log(colors.fgRed, "Operation failed");
};
