/**
 * building a session defined undo structure for any type of Mongoose record
 *
 * version 0.1 Jay McAnser 2020-04-22 - initial setup
 * (c) JayMcAnser MIT
 */

const DiffHistory = require('mongoose-diff-history/diffHistory');
const DiffModel = require('mongoose-diff-history/diffHistoryModel');
const DiffPatcher = require('jsondiffpatch');
const JsonDiffPatch = require('jsondiffpatch');
const Mongoose = require('mongoose');
const _ = require('lodash');

let _validateSession = (session) => {
  if (typeof session !== 'object' || !session.user) {
    throw new Error('no session given or no session active')
  }
  return true;
}

const UndoHelper = {
  /**
   * assign the session to the object
   *
   * @param obj
   * @param session
   * @private
   */
  _assignSession(obj, session, asCreate = false) {
    if (session.setInfo !== undefined) {
      session.setInfo(obj)
    } else {
      if (asCreate) {
        obj.by = session.user.username
        obj.reason = session.reason;
      } else {
        obj.__user = session.user.username;
        obj.__reason = session.reason;
      }
    }
  },

  create: (session, rec) =>{
    _validateSession(session);
    if (rec.created !== undefined) {
      UndoHelper._assignSession(rec.created, session, true);
      // rec.created.by = session.name;
      // rec.created.reason = session.reason;
    }
    UndoHelper._assignSession(rec, session)
    // rec.__user = session.name;
    // rec.__reason = session.reason;
    return rec;
  },

  /**
   * make a sessional object out of the result
   * @param session
   * @param data
   * @return {*}
   */
  session:(session, data) => {
    if (_.isArray(data)) {
      for (let l = 0; l < data.length; l++) {
        UndoHelper._assignSession(data[l], session);
        // data[l].__user = session.name;
        // data[l].__reason = session.reason;
      }
    } else {
      UndoHelper._assignSession(data, session);
      // data.__user = session.name;
      // data.__reason = session.reason;
    }
    return data;
  },

  queryOne: (session, model, where, fields, options) => {
    _validateSession(session);
    return model.findOne(where, fields, options).then( (rec) => {
      if (rec) {
        UndoHelper._assignSession(rec, session);
        // rec.__user = session.name;
        // rec.__reason = session.reason;
        return rec;
      }
      return false;
    });
  },

  queryById: (session, model, id, fields, options) => {
    _validateSession(session);
    return model.findById(id, fields, options).then( (rec) => {
      if (rec) {
        UndoHelper._assignSession(rec, session);
        // rec.__user = session.name;
        // rec.__reason = session.reason;
        return rec;
      }
      return false;
    });
  },

  query: (session, model, where, fields, options) => {
    _validateSession(session);
    return model.find(where, fields, options).then((recs) => {
      for (let l = 0; l < recs.length; l++) {
        UndoHelper._assignSession(recs[l], session);
        // recs[l].__user = session.name;
        // recs[l].__reason = session.reason;
      }
      return recs;
    });
  },

  /**
   * list the history including the creation of the record
   * @param instance
   * @return {Promise|PromiseLike<any>|Promise<any>}
   */
  history: (instance) => {
    return DiffHistory.getHistories(instance.constructor.modelName, instance.id).then( (versions) => {
      return instance.model(instance.constructor.modelName).findById(instance.id).then( (rec) => {
        versions.unshift({
          "changedBy": rec.created.by,
          "createdAt": rec.created.createdAt,
          "updatedAt": rec.created.createdAt,
          "reason": rec.created.reason,
          "comment": "created",

        })
        return versions;
      })
    });
  },

  /**
   * return a full restore of all the previous steps to the requested version
   *
   * @param session
   * @param model
   * @param id
   * @param versionIndex
   * @param options
   * @return {Promise|PromiseLike<any>|Promise<any>}
   */
  getVersion: (session, model, id, versionIndex, options) => {
    _validateSession(session);
    // return DiffHistory.getVersion(Mongoose.model('Address'), this.id, index, options).then( (rec) => {
    return DiffHistory.getVersion(model, id, versionIndex, options).then( (rec) => {
      UndoHelper._assignSession(rec, session);
      // rec.__user = session.name;
      // rec.__reason = session.reason;
      return rec;
    })
  },

  /**
   * list all the history with the diffs
   *
   * @param instance
   * @param options
   * @return {Promise|PromiseLike<any>|Promise<any>}
   */
  historySteps: (instance, options) => {
    return DiffHistory.getDiffs(instance.constructor.modelName, instance.id, options).then((steps) => {
      return instance.model(instance.constructor.modelName).findById(instance.id).then( (rec) => {
        steps.unshift(
        {
          "_id": undefined,
          "collectionId": undefined,
          "collectionName": instance.constructor.modelName,
          "diff": {},
          "user": rec.created.by,
          "version": -1,
          "createdAt": rec.created.createdAt,
          "updatedAt": rec.created.createdAt,
          "__v": -1
        })
        return steps;
      });
    });
  },

  // /**
  //  *
  //  * @param session
  //  * @param modelName
  //  * @param record
  //  * @param index
  //  * @return {Promise|PromiseLike<any>|Promise<any>}
  //  */
  // historyStepUndo: (session, modelName, record,  index) => {
  //   _validateSession(session);
  //   return DiffHistory.getDiffs('Address', record.id).then((diffs) => {
  //     if (index >= 0 && index < diffs.length) {
  //       let rec = JsonDiffPatch.unpatch(record, diffs[index].diff);
  //       rec.__user = session.name;
  //       rec.__reason = session.reason;
  //       return rec;
  //     } else {
  //       return Promise.reject('index out of bounce');
  //     }
  //   })
  // },

  /**
   * list per version the user, date and fields that have changed
   *
   * @param instance
   * @param options
   * @return {Promise(steps)}
   */
  historyFields: (instance, options ) => {
    return UndoHelper.historySteps(instance, options).then( (diffSteps) => {
      let steps = [];
      for (let l = 0; l < diffSteps.length; l++) {
        steps.push({
          user: diffSteps[l].user,
          version: diffSteps[l].version,
          date: diffSteps[l].createdAt,
          fields: Object.keys(diffSteps[l].diff)
          // fields should be ['name', { field: 'telephone', ids: ['23489234098', '123123']}
          // or: ['name', 'telephone.1237891723', 'telephone.23425235']
          // or: ['name', 'telephone', 'telephone.1237891723', 'telephone.23425235']
        });
      }
      return steps;
    });
  },

  /**
   * shows the changes made in this version with the old data
   *ƒ
   * @param instance
   * @param version
   * @param options
   * @return Promise(Object)
   *   - current  Mongoose Record the version that was requested
   *   - previousValue Object the fieldName => values the where changed
   */
  historyChanges(instance, version, queryOpts) {
    //instance.model(instance.constructor.modelName)
    let model = Mongoose.model(instance.constructor.modelName);
    let History = Mongoose.models.History;

    return DiffHistory.getDiffs(instance.constructor.modelName, instance._id).then( (diffs) => {
      let result = {
        current: {},
        previousValues: {}

      }
      return model
        .findById(instance.id, null, queryOpts)
        .then(latest => {
          result.current = latest || {};
          return History.find(
            {
              collectionName: model.modelName,
              collectionId: instance.id,
              version: { $gte: parseInt(version - 1, 10) }
            },
            { diff: 1, version: 1 },
            { sort: '-version' }
          )
            .lean()
            .cursor()
            .eachAsync(history => {
              if (history.version < version) {
                // undo this in a new version and only copy the changed fields to the previousValues
                let oldRec = _.cloneDeep(result.current._doc);
                DiffPatcher.unpatch(oldRec, history.diff);
                for (let fieldName in history.diff) {
                  if (!history.diff.hasOwnProperty(fieldName)) { continue }
                  // if (!_.isArray(history.diff[fieldName])) {
                  //   result.previousValues[fieldName] = {}
                  //   for (let subName in history.diff[fieldName]) {
                  //     if (!history.diff[fieldName].hasOwnProperty(subName)) { continue }
                  //     result.previousValues[fieldName][subName] = oldRec[fieldName][subName]
                  //   }
                  // } else {
                    result.previousValues[fieldName] = oldRec[fieldName]; // */ { _doc: oldRec[fieldName]};
                  // }
                }
              } else {
                DiffPatcher.unpatch(result.current, history.diff);
              }
            })
            .then(() => {
              return result;
            });
        })
        .catch(err => {
          throw err;
        });
    });
  },

  /**
   * undo a specific version
   * This does NOT work if there are complex (array / Object) structures in the data
   *
   * @param session
   * @param instance
   * @param version
   * @param options Object
   *    fields: Array of fields to restore
   */
  historyUndoVersion(session, instance, version, options) {
    return UndoHelper.historySteps(instance, options).then( (diffSteps) => {
      for (let l = 0; l < diffSteps.length; l++) {
        if (version === diffSteps[l].version) {
          let rec = JsonDiffPatch.unpatch(instance, diffSteps[l].diff);
          // check if one of the fields as 3 element field
          let replaceField = [];
          let arrayField = []
          for (let fieldName in diffSteps[l].diff) {
            if (!diffSteps[l].diff.hasOwnProperty(fieldName)) {
              continue
            }
            if (diffSteps[l].diff[fieldName].length === 3) {
              replaceField.push(fieldName)
            }
            if (diffSteps[l].diff[fieldName]._t === 'a') {
              arrayField.push(fieldName)
            }
          }
          if (replaceField.length || arrayField.length) {
            // we have a problem. We must find the previous version of the field to get the value at that time
            let loopObj =  _.cloneDeep( instance._doc);
            for (let loopIndex = diffSteps.length - 1; loopIndex >= l; loopIndex--) {
              // could optomize this to only update the requested ones, but who cares .......
              loopObj = JsonDiffPatch.unpatch(loopObj, diffSteps[loopIndex].diff);
            }
            // the long fields restore
            for (let fieldIndex = 0; fieldIndex < replaceField.length; fieldIndex++) {
              rec._doc[replaceField[fieldIndex]] = loopObj[replaceField[fieldIndex]];
              rec.markModified(replaceField[fieldIndex]);
            }
            // the array field restore
            for (let fieldIndex = 0; fieldIndex < arrayField.length; fieldIndex++) {
              console.log(rec._doc[arrayField[fieldIndex]] )
              // rec._doc[arrayField[fieldIndex]] = loopObj[replaceField[fieldIndex]];
              // rec.markModified(replaceField[fieldIndex]);
            }
          }
          rec.__user = session.user.username;
          rec.__reason = session.reason;
          return rec;
        }
      }
      return Promise.reject('version not found');
    });
  },

  _flattenArray(arr) {
    let prev = [];
    for (let prevIndex = 0; prevIndex < arr.length; prevIndex++) {
      let obj;
      if (arr[prevIndex]._doc) {
        obj = _.cloneDeep(arr[prevIndex]._doc);
      } else {
        obj = _.cloneDeep(arr[prevIndex]);
      }
      obj.id = obj._id.toString();
      delete obj._id;
      prev.push(obj);
    }
    // do we need to sort and what does is do to the original arrays
    // prev.sort( (a,b) => {
    //   if (a.id > b.id) {
    //     return 1
    //   } else if (a.id < b.id) {
    //     return -1
    //   }
    //   return 0;
    // })
    return prev;
  },

  /**
   *
   * TODO: Need more tests
   *
   * calculate the direct diff of an object array
   * @param diff Object returned by historyChanges
   * @param key String the field to calculate
   * @returns Array
   */
  calculateDiff: (diff, key) => {
    let curr = UndoHelper._flattenArray(diff.current[key] ? diff.current[key] :  []);
    let prev = UndoHelper._flattenArray(diff.previousValues[key] ? diff.previousValues[key] : []);

    let max = curr.length > prev.length ? curr.length : prev.length;
    let result = []
    let prevIndex = 0;
    for (let currIndex = 0; currIndex < curr.length; currIndex++) {
      let id = curr[currIndex].id;
      while (prevIndex < prev.length && prev[prevIndex].id < id) {
        result.push({action: 'remove', element: diff.previousValues[key][prevIndex]})
        prevIndex++;
      }
      if (prevIndex < prev.length && prev[prevIndex].id === id) {
        let changed = false;
        for (let fieldName in curr[currIndex]) {
          if (!curr[currIndex].hasOwnProperty(fieldName)) { continue}
          if (curr[currIndex][fieldName].toString() !== prev[prevIndex][fieldName].toString()) {
            changed = true;
            break;
          }
        }
        prevIndex++;
        result.push({action: changed ? 'update' : 'none', element: diff.current[key][currIndex]})
      } else {
        result.push({action: 'add', element: diff.current[key][currIndex]})
      }
    }
    while (prevIndex < prev.length) {
      result.push({action: 'remove', element: diff.previousValues[key][prevIndex]})
      prevIndex++;
    }
    return result;
  }
}

module.exports = UndoHelper;

module.exports.createSchema = {
  createdAt: {type: Date, default: Date.now},
  by: {type: String},
  reason: {type: String}
}

module.exports.DiffHistory = DiffHistory;


module.exports.plugin = function(schema, options) {
  // ToDo: This plugin crashes the multi DB system.
  // So temporary blocked
  // schema.plugin(DiffHistory.plugin, options)

  schema.statics.queryOne = function(session, where, fields, options) {
    return UndoHelper.queryOne(session, this, where, fields, options);
  }

  schema.statics.create = function(session, data) {
    return UndoHelper.create(session, new this(data));
  }

  schema.statics.queryById = function(session, id, fields, options) {
    return UndoHelper.queryById(session, this, id, fields, options);
  }

  schema.statics.query = function(session, where, fields, options) {
    return UndoHelper.query(session, this, where, fields, options);
  }

  schema.methods.getVersion = function(session, index, options) {
    return UndoHelper.getVersion(session, this.constructor, this.id, index, options);
  }

  schema.methods.history = function(options = {}) {
    return UndoHelper.history(this);
  }

  schema.methods.historySteps = async function(options) {
    return UndoHelper.historySteps(this, options);//'Address', this.id);
  }
  //
  // schema.methods.historyStepUndo = async function(session, index) {
  //   return UndoHelper.historyStepUndo(session, 'Address', this, index);
  // }

  schema.methods.historyFields = function(options) {
    return UndoHelper.historyFields(this, options)
  }

  schema.methods.historyUndoVersion = function(session, version, options) {
    return UndoHelper.historyUndoVersion(session, this, version, options)
  }

  schema.methods.historyChanges = function(version, options) {
    return UndoHelper.historyChanges(this, version, options);
  }

  schema.statics.calculateDiff = function(diff, fieldName) {
    return UndoHelper.calculateDiff(diff, fieldName)
  }

  schema.methods.session = function(session) {
    UndoHelper._assignSession(this, session);
  }
}

// ToDo: should use export but can not find the way to do it simple

module.exports.Model = DiffModel;
// from the undo model: const historySchema
module.exports.Schema = {
  collectionName: String,
  collectionId: Mongoose.Types.ObjectId,
  diff: {},
  user: {},
  reason: String,
  version: { type: Number, min: 0 }
}
