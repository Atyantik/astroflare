class Spinner {
  /**
   * Create a new spinner instance
   */
  constructor() {
    this.spinnerChars = ['-', '\\', '|', '/'];
    this.spinnerIndex = 0;
    this.interval = null;
    this.isRunning = false;
  }

  /**
   * Start the spinner animation
   * @param {string} [message='Processing'] - The message to display with the spinner
   */
  start(message = 'Processing') {
    this.message = message;
    if (this.isRunning) return;
    this.isRunning = true;
    process.stdout.write('\x1B[?25l');
    this.interval = setInterval(() => {
      if (!this.isRunning) {
        this.stop();
        return;
      }
      process.stdout.write(
        `\r${this.spinnerChars[this.spinnerIndex]} ${this.message}`,
      );
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerChars.length;
    }, 100);
  }

  /**
   * Stop the spinner and clear the line
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Clear the entire line
    process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
    process.stdout.write('\x1B[?25h');
  }
}

export default Spinner;
