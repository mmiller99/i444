// refer to ./contacts.d.ts for details of types

import { okResult, errResult } from 'cs544-js-utils';

export default function makeContacts() { return okResult(new Contacts()); }

/** holds the contacts for different users */
class Contacts {
  //TODO: add instance fields if necessary
  /** return an instance of UserContacts */
  
  #contactsMap = new Map();  
  
  userContacts(userId) {
    //TODO: fix to ensure same object returned for same userId
    if(this.#contactsMap.has(userId)){
      return okResult(this.#contactsMap.get(userId));
    }
    else{
      const temp_user = new UserContacts(userId);
      this.#contactsMap.set(userId, temp_user);
      return okResult(this.#contactsMap.get(userId));
    }
  }
}

/** holds the contacts for single user specified by userId */
class UserContacts {
  //TODO: add instance fields if necessary

  #counter;
  #contactMap

  constructor(userId) {
    this.userId = userId;
    this.#counter = 0;
    this.#contactMap = new Map();
  }
  
  generateId(){
    let random = Math.floor(Math.random()*100);
    let new_id = `${this.#counter}_${random}`;
    this.#counter += 1;
    return new_id;
  }

  /** Add object contact into this under a new contactId and return
   *  Result<contactId>.  The contact must have a name field which
   *  must contain at least one word containing at least two letters.  
   *  The added contact should not share any structure with the contact param.
   *  Errors Codes: 
   *    BAD_REQ: contact.name is not a string which contains at least one word 
   *             with at least 2 letters.
   *             Contact.emails is present but is not an array or contains
   *             an entry which does not match /^.+?\@.+?\..+$/.
   *             Contact contains an id property
   */
  create(contact) {
    if(this.prefix(contact.name) === []){
      return errResult("Name is not proper string", {code: 'BAD_REQ'});
    }
    if(contact.id){
      return errResult("Contact cannot have ID already", {code: 'BAD_REQ'});
    }
    let new_id = this.generateId();
    this.#contactMap.set(new_id, contact);
    return okResult(new_id);
  }

  /** Return XContact for contactId.
   *  The returned contact should not share any structure with that
   *  stored within this.
   *  Error Codes:
   *    BAD_REQ: contactId not provided as a string
   *    NOT_FOUND: no contact for contactId
   */
  read(contactId) {
    if(this.#contactMap.has(contactId)){
      const ret = this.deepCopy(this.#contactMap.get(contactId));
      return okResult(ret);
    }
    else if(typeof contactId !== 'string'){
      return errResult('contactId is not a string', {code: "BAD_REQ"});
    }
    else{
      return errResult('contactId not found', {code: 'NOT_FOUND'});
    }
  }

  /** search for contact by zero or more of the following fields in params:
   *    id:     the contact ID.
   *    name:   a string, the letters of which must match the prefix of a
   *            word in the contacts name field
   *    email:  an Email address
   *  If no params are specified, then all contacts are returned
   *  
   *  The results are sliced from startIndex (default 0) to 
   *  startIndex + count (default 5).
   *  Error Codes:
   *    BAD_REQ: name is specified in params but does not consist of
   *             a single word containing at least two letters
   *             email is specified in params but does not contain a
   *             a valid Email address
   */
  search({id, nameWordPrefix, email}={}, startIndex=0, count=5) {
    let deep_arr
    if(nameWordPrefix && this.prefix() === []){
      return errResult("Name is not proper string", {code: 'BAD_REQ'});
    }
    if(!id && !nameWordPrefix && !email){
      deep_arr = Array.from(this.#contactMap.values());
      deep_arr.map(c => c = this.deepCopy(c));
    }

    deep_arr = deep_arr.slice(startIndex, startIndex+count);
    deep_arr.map(c => c = this.deepCopy(c));
    return okResult(deep_arr);
  }

  //TODO: define auxiliary methods
  //Deep copy strategy taken from url:
  //https://code.tutsplus.com/articles/the-best-way-to-deep-copy-an-object-in-javascript--cms-39655

  deepCopy(my_object){
    const copy = {...my_object};
    return copy;
  }
  
  prefix(my_string){
    if(my_string === undefined){
      return "";
    }
    let prefixes = new Array();
    let sub_strings = my_string.split(" ");

    sub_strings.map(s => s.replace(/[^A-Za-z0-9]/g, ''));

    for(const sub of sub_strings){
      for(let i = 2; i < sub.length+1; i++){
        prefixes.push(sub.substring(0, i));
      }
    }
    return prefixes;
  }
}


//TODO: define auxiliary functions and classes.

class index{

}

// non-destructive implementations of set operations which may be useful
function setIntersection(setA, setB) {
  const result = new Set()
  for (const el of setA) {
    if (setB.has(el)) result.add(el);
  }
  return result;
}

function setUnion(setA, setB) {
  const result = new Set(setA);
  for (const el of setB) result.add(el);
  return result;
}

