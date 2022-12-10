import Path from 'path';

import cors from 'cors';
import express from 'express';
import STATUS from 'http-status';  //HTTP status codes
import assert from 'assert';
import bodyParser from 'body-parser';
import { okResult, errResult } from 'cs544-js-utils';

import { DEFAULT_COUNT } from './defs.mjs';
import { STATUS_CODES } from 'http';

export default function serve(model, base='') {
  const app = express();
  cdThisDir();
  app.locals.model = model;
  app.locals.base = base;
  app.use(express.static('statics'));
  setupRoutes(app);
  return okResult(app);
}


const EXPOSED_HEADERS = [ 'Location', 'Content-Type', 'Content-Length' ];

/** set up mapping between URL routes and handlers */
function setupRoutes(app) {
  const base = app.locals.base;
  app.use(cors({ exposedHeaders: EXPOSED_HEADERS}));
  app.use(bodyParser.json());
  if (false) { //make true to see incoming requests
    app.use((req, res, next) => {
      console.log(req.method, requestUrl(req));
      next();
    });
  }


  app.post(`${base}/:userId`, doContactCreate(app));
  app.get(`${base}/:userId/:id`, doContactGet(app));
  app.patch(`${base}/:userId/:id`, doContactUpdate(app));
  app.delete(`${base}/:userId/:id`, doContactDelete(app));
  app.get(`${base}/:userId`, doContactsSearch(app));


  //must be last
  app.use(do404(app));
  app.use(doErrors(app));
}

/****************************** Route Handlers *************************/

function doContactCreate(app) {
  return (async function(req, res) {
    try {
      const {userId} = req.params;
      const obj = req.body;
      const contactIdResult = await app.locals.model.create({userId, ...obj});
      if (contactIdResult.errors) throw contactIdResult;
      const location = requestUrl(req) + '/' + contactIdResult.val;
      res.append('Location', location);
      res.sendStatus(STATUS.CREATED);
    }
    catch(err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doContactGet(app) {
  return (async function(req, res) {
    try {
      const { userId, id } = req.params;
      const contactResult = await app.locals.model.read({ userId, id });
      if (contactResult.errors) throw contactResult;
      res.json(addSelfLinks(req, contactResult.val));
    }
    catch(err) {

      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  });
}


function doContactUpdate(app) {
  return (async function(req, res) {
    try {
      const { userId, id } = req.params;
      const body = req.body;
      const contact = await app.locals.model.update({ ...body, userId, id });
      if (contact.errors) throw contact;
      res.json(addSelfLinks(req, contact.val));
    }
    catch(err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  });
}


function doContactDelete(app) {
  return (async function(req, res) {
    try {
      const { userId, id } = req.params;
      const contact = await app.locals.model.delete({ userId, id });
      if (contact.errors) throw contact;
      res.status(STATUS.NO_CONTENT).end();
    }
    catch(err) {

      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doContactsSearch(app) {
  return (async function(req, res) {
    try {
      const {userId, id} = req.params;
      const q = { ...(req.query ?? {}), userId, id, };
      const index = getNonNegInt(q, 'index', 0);
      if (index.errors) throw index;
      const count = getNonNegInt(q, 'count', DEFAULT_COUNT);
      if (count.errors) throw count;
      const options = { index, count: count + 1 };
      const result = await app.locals.model.search({...q, ...options});
      if (result.errors) throw result;
      res.json(addPagingLinks(req, result.val, 'id'));
    }
    catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  });
}


/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app) {
  return async function(req, res) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: STATUS.NOT_FOUND,
      errors: [	{ code: 'NOT_FOUND', message, }, ],
    };
    res.status(STATUS.NOT_FOUND).json(result);
  };
}


/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    const result = {
      status: STATUS.INTERNAL_SERVER_ERROR,
      errors: [ { code: 'SERVER_ERROR', message: err.message } ],
    };
    res.status(STATUS.INTERNAL_SERVER_ERROR).json(result);
    console.error(result.errors);
  };
}

/************************* HATEOAS Utilities ***************************/

/** Return original URL for req (excluding query params) */
function requestUrl(req) {
  const url = req.originalUrl.replace(/\/?(\?.*)?$/, '');
  return `${req.protocol}://${req.get('host')}${url}`;
}

function selfResult(req, result, method=undefined){
  return { result, _links: { self: { href: queryUrl(req), method } } };
}

/** Return req URL with query params appended */
function queryUrl(req, query={}) {
  const url = new URL(requestUrl(req));
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.href;
}

/** Return object containing { result: obj, links: [{ rel: 'self',
 *  name: 'self', href }] } where href is req-url + suffix /obj[id] if
 *  id.
 */
function addSelfLinks(req, obj, id=undefined) {
  const baseUrl = requestUrl(req);
  const href = (id) ? `${baseUrl}/${obj[id]}` : baseUrl;
  const links = [ { rel: 'self', name: 'self', href } ];
  return {result: obj,  links: links };
}

/** Wrap results in paging links.  Specifically, return 
 *  { result, links: [self, next, prev] } where result
 *  is req-count prefix of results with each individual
 *  result wrapped in a self-link. self will always
 *  be present, next/prev are present if there
 *  are possibly more/earlier results.
 */
function addPagingLinks(req, results, selfId=undefined) {
  const links = [
    { rel: 'self', name: 'self', href: queryUrl(req, req.query) }
  ];
  const count = Number(req.query?.count ?? DEFAULT_COUNT);
  const nResults = results.length;  //may be 1 more than count
  const next = pagingUrl(req, nResults, +1);
  if (next) links.push({ rel: 'next', name: 'next', href: next });
  const prev = pagingUrl(req, nResults, -1);
  if (prev) links.push({ rel: 'prev', name: 'prev', href: prev });
  const results1 =
	results.slice(0, count).map(obj => addSelfLinks(req, obj, selfId));
  return { result: results1, links: links };
}

/** Return paging url (dir == +1: next; dif == -1: prev);
 *  returns null if no paging link necessary.
 *  (no prev if index == 0, no next if nResults <= count).
 */
//index and count have been validated  
function pagingUrl(req, nResults, dir) {
  const q = req.query;
  const index = Number(q?.index ?? 0);
  const count = Number(q?.count ?? DEFAULT_COUNT);
  const index1 = (index + dir*count) < 0 ? 0 : (index + dir*count);
  const query1 = Object.assign({}, q, { index: index1 });
  return ((dir > 0 && nResults <= count) || (dir < 0 && index1 === index))
         ? null
         : queryUrl(req, query1);
}

/*************************** Mapping Errors ****************************/

//map from domain errors to HTTP status codes.  If not mentioned in
//this map, an unknown error will have HTTP status BAD_REQUEST.
const ERROR_MAP = {
  EXISTS: STATUS.CONFLICT,
  NOT_FOUND: STATUS.NOT_FOUND,
  DB: STATUS.INTERNAL_SERVER_ERROR,
  INTERNAL: STATUS.INTERNAL_SERVER_ERROR,
}

/** Return first status corresponding to first option.code in
 *  appErrors, but SERVER_ERROR dominates other statuses.  Returns
 *  BAD_REQUEST if no code found.
 */
function getHttpStatus(appErrors) {
  let status = null;
  for (const appError of appErrors) {
    const errStatus = ERROR_MAP[appError.options?.code];
    if (!status) status = errStatus;
    if (errStatus === STATUS.INTERNAL_SERVER_ERROR) status = errStatus;
  }
  return status ?? STATUS.BAD_REQUEST;
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapResultErrors(err) {
  const errors = err.errors ||
    [ { message: err.message, options: { code: 'INTERNAL' } } ];
  const status = getHttpStatus(errors);
  if (status === STATUS.INTERNAL_SERVER_ERROR) {
    console.error(err);
  }
  return { status, errors, };
} 

/**************************** Misc Utilities ***************************/

/** return query[key] as a non-neg int; error if not */
function getNonNegInt(query, key, defaultVal) {
  const n = query[key];
  if (n === undefined) {
    return defaultVal;
  }
  else if (!/^\d+$/.test(n)) {
    const message = `${key} "${n}" must be a non-negative integer`;
    return {errors: [{ message, options: { code: 'BAD_VAL', widget: key}}]};
  }
  else {
    return Number(n);
  }
}

/** change dir to directory containing this file */
function cdThisDir() {
  try {
    const path = new URL(import.meta.url).pathname;
    const dir = Path.dirname(path);
    process.chdir(dir);
  }
  catch (err) {
    console.error(`cannot cd to this dir: ${err}`);
    process.exit(1);
  }
}
