import React from 'react';

import { doFetchJson } from './utils.mjs';

export default function Search(props) {
  const {wsUrl,  queryParam, resultTag, label='Search'} = props;

  const [currentUrl, setCurrentUrl] = useState(wsUrl);
  const [nextUrl, setNextUrl] = useState();
  const [prevUrl, setPrevUrl] = useState();

  return (
<div>
    <link href="search-widget.css" rel="stylesheet"></link>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"></link>

  {/* error messages should be inserted as <li>message</li> in here */}
    <ul id="errors" class="errors"></ul>
  
    <div class="search">

{/* search form */}
      <label for="search"><slot name="label">Search</slot></label>
      <input id="search"></input>

{/* results scrolling controls at top */}
      <div class="scroll">  
        <a href="#" rel="prev" class="prev">
          <slot name="prev">&lt;&lt;</slot>
        </a>
        <a href="#" rel="next" class="next">
          <slot name="next">&gt;&gt;</slot>
        </a>
      </div>

{/* results list */}
      <ul id="results">
{/* each result should be inserted into a node like the following */}
        <li class="result">
          <div class="delete">
            <a href="#"><span class="material-icons md-48">delete</span></a>
          </div>
        </li>
      </ul>

{ /* results scrolling control at bottom */}
      <div class="scroll">
        <a href="#" rel="prev" class="prev">
          <slot name="prev">&lt;&lt;</slot>
        </a>
        <a href="#" rel="next" class="next">
          <slot name="next">&gt;&gt;</slot>
        </a>
      </div>
    </div>
</div>);
}

// TODO: define sub-components here + other misc functions



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
