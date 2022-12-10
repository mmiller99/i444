import React, {useState, useEffect, useRef} from 'react';

import { doFetchJson } from './utils.mjs';

export default function Search(props) {
  const {wsUrl,  queryParam, resultTag, label='Search'} = props;

  const [currentUrl, setCurrentUrl] = useState(wsUrl);
  const [nextUrl, setNextUrl] = useState();
  const [prevUrl, setPrevUrl] = useState();
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [delCheck, setDelCheck] = useState(0);

  function handleInputChange(e) {
    setCurrentUrl(queryUrl(currentUrl, queryParam, e.target.value));
  }

  function handleDoNext(){
    setCurrentUrl(nextUrl);
  }
  
  function handleDoPrev(){
    setCurrentUrl(prevUrl);
  }

  useEffect(()=>{

    const res = doFetchJson('GET',currentUrl).then(
      function(r){
        if(r.val){
          setResults(r.val.result);
          setNextUrl(getLink(r.val.links, 'next'));
          setPrevUrl(getLink(r.val.links, 'prev'))
          setErrors([]);
        }
        else{
          setErrors(r.errors);
          setNextUrl('');
          setPrevUrl('');
        }
      })
  },[currentUrl, delCheck]);

  return (
<div>
    <link href="search-widget.css" rel="stylesheet"></link>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"></link>

  {/* error messages should be inserted as <li>message</li> in here */}
    <Error err={errors}/>
  
    <div className="search">

{/* search form */}
      <Input label={label} inputChange={handleInputChange}/>
                
{/* results scrolling controls at top */}
      <Scroll doNext={ handleDoNext } doPrev={ handleDoPrev } next={nextUrl} prev={prevUrl}/>

{/* results list */}
      <Results res={results} tag={resultTag} setDel={setDelCheck}/>

{ /* results scrolling control at bottom */}
      <Scroll doNext={ handleDoNext } doPrev={ handleDoPrev } next={nextUrl} prev={prevUrl}/>
    </div>
</div>);
}

// TODO: define sub-components here + other misc functions

function Input(props){

  return(
  <div>
    <label htmlFor="search"><slot name="label">{props.label}</slot></label>
      <input id="search" onChange={props.inputChange}></input>
      
  </div>
  )
}

function Scroll(props){
  return(
    <div className="scroll">
      {props.prev &&
        <a href="#" onClick={props.doPrev} rel="prev" className="prev">
          <slot name="prev">&lt;&lt;</slot>
        </a>}
      {props.next &&
        <a href="#" onClick={props.doNext} rel="next" className="next">
          <slot name="next">&gt;&gt;</slot>
        </a>}
      </div>
  );
}

function Results({res, tag, setDel}){

  return (
  <ul id="results">
    { res.map((r) => <Result res={r} url={r.links[0].href} tag={tag} setDel={setDel}/>) }
    
  </ul>
  )
}

function Result({res, url, tag, setDel}){

  const resElement = React.useRef();

  async function handleDelete(){
    doFetchJson('DELETE', url); 
    setDel(url);
  };

  useEffect(() =>{
    const widget = document.createElement(tag);
    widget.setResult(res.result);
    resElement.current.querySelector(tag)?.remove();
    resElement.current.prepend(widget);
  },[res]);

  return(
    <li className="result" ref={resElement}>
      <div className="delete">
          <a href="#" onClick={ handleDelete }><span className="material-icons md-48">delete</span></a>
      </div>
    </li>
  )
}

function Error(props){
  return (
  <ul id="errors" className="errors">
    {
    props.err?.map(e => {
      return (<li>{e.message}</li>)}) 
  }
  </ul>
  )
}


/*************************** Utility Functions *************************/


/** Given a `links[]` array returned by web services, return the `href`
 *  for `rel`; '' if none.
 */
function getLink(links, rel) {
  return links?.find(lnk => lnk.rel === rel)?.href ?? '';
}

/** Given a baseUrl, return the URL equivalent to
 *  `${baseUrl}?${name}=${value}`, but with all appropriate escaping.
 */
function queryUrl(baseUrl, name, value) {
  const url = new URL(baseUrl);
  url.searchParams.set(name, value);
  return url.href;
}
