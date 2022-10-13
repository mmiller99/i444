import assert from 'assert';

import { namePrefixes } from './utils.mjs';
import { okResult, errResult } from 'cs544-js-utils';
import { MongoClient, ObjectId} from 'mongodb';

/** return a contacts dao for mongo URL dbUrl.  If there is previous contacts
 *  data at dbUrl, the returned dao should encompass that data.
 *  Error Codes:
 *    DB: a database error was encountered.
 */
export default async function makeContactsDao(dbUrl) {
  return ContactsDao.make(dbUrl);
}

const DEFAULT_COUNT = 5;

/** holds the contacts for multiple users. All request methods
 *  should assume that their single parameter has been validated
 *  with all non-db validations.
 *  For all requests except create(), unknown request properties are ignored.
 *  For create(), the unknown request properties are stored.
 */
class ContactsDao {
  constructor(params) {
    //TODO
    Object.assign(this, params);
  }

  /** Factory method to create a new instance of this 
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  static async make(dbUrl) {
    //TODO any setup code
    const params = {};
    try {
      params._client = await(new MongoClient(dbUrl)).connect();
      const db = params._client.db();

      const collections = await(db.listCollections().toArray());
      const user_exists = !!collections.find(c => c.name === "users");
      const contacts_exitst = !!collections.find(c => c.name === "contacts");
      const options = {collation: {locale: 'en', strength: 2, }};
      if(!user_exists){
        
        const collection = await db.createCollection("users", options);
      }
      if(contacts_exitst){
        const collection = await db.collection("contacts");
        await collection.createIndex({"emails":1});
        await collection.createIndex({"prefix":1},options);
      }
      else{
        const collection = await db.createCollection("contacts", options)
        await collection.createIndex({"emails":1});
        await collection.createIndex({"prefix":1},options);
      }

      const users = db.collection("users");
      const contacts = db.collection("contacts");
      params.users = users;
      params.contacts = contacts;
      return okResult(new ContactsDao(params));
    }
    catch (error) {
      console.error(error);
      return errResult(error.message, { code: 'DB' });
    }
  }

  /** close off this DAO; implementing object is invalid after 
   *  call to close() 
   *
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async close() { 
    //TODO any setup code
    try {
      await this._client.close();
    }
    catch (e) {
      console.error(e);
      return errResult(e.message, { code: 'DB' });
    }
  }


  /** clear out all contacts for all users; returns number of contacts
   *  cleared out. 
   *  Error Codes:
   *    DB: a database error occurred
   */
  async clearAll() {
    //TODO any setup code
    try {
      const collection = this.contacts;
      const delete_info = await collection.deleteMany({});
      return okResult(delete_info.deletedCount);
    }
    catch (error) {
      console.error(error);
      return errResult(error.message, { code: 'DB' });
    }
  }
  
  /** Clear out all contacts for user userId; return # of contacts cleared.
   *  Error Codes:
   *    DB: a database error occurred
   */
  async clear({userId}) {
    //TODO any setup code
    try {
      const collection = this.contacts;
      const delete_info = await collection.deleteMany({"userId": userId});
      return okResult(delete_info.deletedCount);
    }
    catch (error) {
      console.error(error);
      return errResult(error.message, { code: 'DB' });
    }
  }

  /** Add object contact into this as a contact for user userId and
   *  return Result<contactId> where contactId is the ID for the newly
   *  added contact.  The contact will have a name field which must
   *  contain at least one word containing at least one letter.
   *
   *  Unknown properties in contact are also stored in the database.
   *
   *  Errors Codes: 
   *    BAD_REQ: contact contains an _id property
   *    DB: a database error occurred   
   */
  async create(contact) {
    //TODO any setup code
    try {
      if(contact._id){
        return errResult("New contact cannot have id", { code: "BAD_REQ"});
      }
      const contactId = new ObjectId().toHexString();
      const prefix_arr = namePrefixes(contact.name);
      const dbObj = {"_id": contactId, "prefix":prefix_arr,...contact};
      if(prefix_arr){
        const collection = this.contacts;
        await this.contacts.insertOne(dbObj);
      }
      return okResult(contactId);
    }
    catch (error) {
      console.error(error);
      return errResult(error.message, { code: 'DB' });
    }
  }
  

  /** Return XContact for contactId for user userId.
   *  Error Codes:
   *    DB: a database error occurred   
   *    NOT_FOUND: no contact for contactId id
   */
  async read({userId, id}) {
    //TODO any setup code
    try {
      const collection = this.contacts;
      const dbEntry = await (collection.findOne({"userId": userId, "_id": id}));

      if(dbEntry){
        delete dbEntry._id;
        return okResult(dbEntry)
      }
      else{
        return errResult("No contact for contactId id", {code: 'NOT_FOUND'});
      }
    }
    catch (error) {
      console.error(error);
      return errResult(error.message, { code: 'DB' });
    }
  }

  /** perform a case-insensitive search for contact for user specified
   *  by userId using zero or more of the following fields in params:
   *    id:     the contact ID.
   *    prefix: a string, the letters of which must match 
   *            the prefix of a word in the contacts name field
   *    email:  an Email address
   *  If no params are specified, then all contacts for userId are returned.
   *  The returned XContact's are sorted by name (case-insensitive).
   *  The ordering of two contacts having the same name is unspecified.
   *  
   *  The results are sliced from startIndex (default 0) to 
   *  startIndex + count (default 5).
   *  Error Codes:
   *    DB: a database error occurred   
   */
  async search({userId, id, prefix, email, index=0, count=DEFAULT_COUNT}={}) {
    //TODO any setup code
    let ret_arr = [];
    try {
      if(!id && !prefix && !email){
        const cursor = await(this.contacts.find({"userId":userId}));
        ret_arr = ret_arr.concat(await cursor.sort({name: 1}).skip(index).limit(count).toArray());
      }
      if(prefix){
        const cursor = await(this.contacts.find({"userId":userId, "prefix":{$elemMatch:{$eq:prefix}}}));
        ret_arr = ret_arr.concat(await cursor.sort({name: 1}).skip(index).limit(count).toArray());
      }
      if(email){
        const cursor = await(this.contacts.find({"userId":userId, "emails":email}));
        ret_arr = ret_arr.concat(await cursor.sort({name: 1}).skip(index).limit(count).toArray());
      }
      if(id){
        const cursor = await(this.contacts.find({"userId":userId, "_id":id}));
        ret_arr = ret_arr.concat(await cursor.sort({name: 1}).skip(index).limit(count).toArray());
      }
      return okResult(ret_arr);
    }
    catch (error) {
      console.error(error);
      return errResult(error.message, { code: 'DB' });
    }
  }

  async #nextId(){
    const query = { _id: NEXT_ID_KEY};
    const update = { $inc: {[NEXT_ID_KEY]: 1}};
    const options = { upsert: true, returnDocument: 'after'};
    const ret = await this.contacts.findOneAndUpdate(query, update, options);
    const seq = ret.value[NEXT_ID_KEY];
    return String(seq) + Math.random().toFixed(10).replace(/^0\./, '_');
  }  
}

//TODO: add auxiliary functions and definitions as needed

const NEXT_ID_KEY = 'count';