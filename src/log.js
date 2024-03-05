const chalk = require("chalk");
module.exports = {
  debug: ({ command, context, message }) => {
    console.log(
      chalk.cyan(
        `[DEBUG][${context}] - ${message} | COMMAND: kubectl ${command.join(
          " "
        )}`
      )
    );
  },
};
