import { doFetchJson } from './util.mjs';

/** Has the following attributes:
 *  
 *  'ws-url':        The basic search URL (required).
 *  'query-param':   The name of the parameter appended to ws-url to specify
 *                   the search term (required).
 *  'result-widget': The name of the element used for displaying
 *                   each individual search result (required).
 *  'label':         The label for the search widget (optional).
 */
class SearchWidget extends HTMLElement {
  constructor() {
    super();
    //TODO
    const shadow = this.shadow = this.attachShadow({mode: "closed"});
    let template = document.querySelector('#search-widget');
    shadow.appendChild(template.content.cloneNode(true));
  }
  #currentUrl;
  #nextUrl;
  #prevUrl;
  #query_param
  #result_widget

  connectedCallback() {
    //TODO
    const shadow = this.shadow;
    this.#currentUrl = this.getAttribute('ws-url');
    this.#query_param = this.getAttribute('query-param');
    this.#result_widget = this.getAttribute('result-widget');
    const label = this.getAttribute('label');

    const input = shadow.querySelector('input');
    input.addEventListener('input', async (e) =>{
      const shadow = this.shadow;
      const ulError = shadow.querySelector('ul.errors');
      ulError.innerHTML="";
      const res = await doFetchJson('GET', e.target.value);
      console.log(res);
      if(res.errors){
        const liError = document.createElement('li');
        liError.innerHTML = `${res.errors[0].message}`;
        ulError.append(liError);
      }
      else{
        this.#setContacts(res);
      }
    });
  }

  async updateSearch(e){
    //log.textContent = `${this.#currentUrl}/?prefix=${e.target.value}`
    //this.#query_param = e.target.value;
    const res = await doFetchJson('GET', e.target.value);
    console.log(res);
    if(res.errors){
      const shadow = this.shadow;
      const ulError = shadow.querySelector('ul.errors');
      const liError = document.createElement('li');
      liError.innerHTML = `${res.errors.message}`;
      ulError.append(liError);
    }
  }

  #displayErrors(res){
    const shadow = this.shadow;
    const ulError = shadow.querySelector('ul.errors');
    const liError = shadow.createElement('li');
    liError.innerHTML = `${res.errors.message}`;
    ulError.append(liError);
  }

  #setContacts(res){
    const shadow = this.shadow;
    const ulResults = shadow.querySelector('search.results');
    const liResult = shadow.querySelector('search.results.result');
    for(const contact of res.contacts){
      const con_widget = document.createElement(this.#result_widget);
      con_widget.setResult(contact);
      const cpResult = liResult.cloneNode(true);
      cpResult.append(con_widget);
      ulResults.append(cpResult);
    }
  }

  async #myFetch(method){
    return await doFetchJson(method, this.#currentUrl);
  }
  //TODO: add private methods  
}

customElements.define('search-widget', SearchWidget);
