class Logger {
  static info(message) {
    console.log(`\x1b[36m✔️ ${message}\x1b[0m`);
  }

  static success(message) {
    console.log(`\n\x1b[32m🚀 ${message}\x1b[0m`);
  }

  static error(message) {
    console.error(`\n\x1b[31m❌ ${message}\x1b[0m`);
  }

  static warn(message) {
    console.warn(`\x1b[33m⚠️ ${message}\x1b[0m`);
  }

  static debug(message) {
    console.log(`\x1b[32m🔍 ${message}\x1b[0m`);
  }
}

export default Logger;
