/**
 * basic session class
 */



class Session {
  constructor(options= {}) {
    if (typeof options === 'string') {
      this.user = {
        username: options,
        id: 1
      };
    } else {
      this.user = {
        username:  options.name === undefined ? 'John' : options.name,
        id: options.id === undefined ? 1 : options.id,
      }
      this.reason = options.reason === undefined ? undefined : options.reason;
    }
  }
}


module.exports = Session;
