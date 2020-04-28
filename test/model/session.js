/**
 * basic session class
 */



class Session {
  constructor(options= {}) {
    if (typeof options === 'string') {
      this.name = options;
    } else {
      this.name = options.name === undefined ? 'John' : options.name;
      this.id = options.id === undefined ? 1 : options.id;
      this.reason = options.reason === undefined ? undefined : options.reason;
    }
  }
}

module.exports = Session;
