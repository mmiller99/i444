import { Result, okResult, errResult } from 'cs544-js-utils';

/** Return a Result for dispatching HTTP method to url.  If jsonBody
 *  is specified, then it should be sent as JSON.  
 *
 *  The response should return an error Result if there is a fetch
 *  error or if the response JSON contains errors.
 *
 *  If there are no errors and the response body is non-empty then the
 *  function should return the response body within an ok Result.
 *
 * If there are no errors and the response body is empty, the function
 * should return an undefined ok Result.  
 */
export async function doFetchJson(method, url, jsonBody=undefined) {
  //TODO
  try{
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonBody)});
    if(response.content-length !== 0){
      const data = await response.json();
      if(data.errors){
        return errResult({status: 400, errors: [{ message: "Could not retrieve data"}]});
      }
      else{
        return okResult(data);
      }
    }
    else{
      return okResult();
    }
  }
  catch(err){
    return errResult(err);
  }
  
}
