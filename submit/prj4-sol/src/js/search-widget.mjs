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
    const shadow = this.shadow = this.attachShadow({mode: "open"});
    let template = document.querySelector('#search-widget');
    shadow.appendChild(template.content.cloneNode(true));
    this.#query = '';
  }
  currentUrl;
  nextUrl;
  prevUrl;
  searchInput;
  #query;
  #query_param
  #result_widget
  #liResult

  connectedCallback() {
    //TODO
    const shadow = this.shadow;
    this.currentUrl = this.getAttribute('ws-url');
    this.#query_param = this.getAttribute('query-param');
    this.#result_widget = this.getAttribute('result-widget');
    this.#liResult = shadow.querySelector('.result');
    const label = this.getAttribute('label');

    const oldLabel = shadow.querySelector('.search label slot');
    oldLabel.innerHTML = label;

    this.#updateSearch(null);

    const input = shadow.querySelector('input');
    input.addEventListener('input', async (e) =>{
      this.searchInput = e;
      this.#updateSearch();
    });

    this.#setClickListeners();


  }

  #setClickListeners(){
    const shadow = this.shadow;

    const next_buttons = shadow.querySelectorAll('.scroll .next');
    next_buttons.forEach((b) => b.addEventListener('click', () => {
      if(this.nextUrl){
        this.currentUrl = this.nextUrl;
        this.#updateSearch();
      }
    }));

    const prev_buttons = shadow.querySelectorAll('.scroll .prev');
    prev_buttons.forEach((b) => b.addEventListener('click', () => {
      this.currentUrl = this.prevUrl;
      this.#updateSearch();
    }));
  }

  async #updateSearch(){
    const shadow = this.shadow;
    const ulError = shadow.querySelector('ul.errors');
    ulError.innerHTML="";
    
    if(this.searchInput){
      if(this.searchInput.target.value){
        this.#query = this.searchInput.target.value;
      }
    }

    let url = new URL(this.currentUrl);
    url.searchParams.set(this.#query_param, this.#query);

    const res = await doFetchJson('GET', url);

    if(res.errors){
      for(const err of res.errors){
        const liError = document.createElement('li');
        liError.innerHTML = `${err[0].message}`;
        ulError.append(liError);
      }
    }
    else{
      this.#setContacts(res.val);
      this.#toggleButtons();
    }
  }

  #toggleButtons(){
    const shadow = this.shadow;
    const prev_buttons = shadow.querySelectorAll('.scroll .prev');
    prev_buttons.forEach( (b) => {
      if(this.prevUrl){
        b.style.visibility = 'visible';
      }
      else{
        b.style.visibility = 'hidden';
      }
    });

    const next_buttons = shadow.querySelectorAll('.scroll .next');
    next_buttons.forEach( (b) => {
      if(this.nextUrl){
        b.style.visibility = 'visible';
      }
      else{
        b.style.visibility = 'hidden';
      }
    });

  }

  #setContacts(res){
    const shadow = this.shadow;
    this.#setLinks(res);
    const ulResults = shadow.querySelector(`#results`);
    while(ulResults.firstChild){
      ulResults.removeChild(ulResults.firstChild);
    }
    
    for(const contact of res.result){
      const con_widget = document.createElement(this.#result_widget);
      con_widget.setResult(contact.result);
      const cpResult = this.#liResult.cloneNode(true);
      cpResult.prepend(con_widget);
      cpResult.setAttribute('contactId', contact.result.id);
      cpResult.querySelector('.delete a').addEventListener('click', () => { this.#deleteContact(cpResult, contact.links[0].href); });
      
      ulResults.append(cpResult);

    }
  } 

  async #deleteContact(cpResult, self){
    const shadow = this.shadow;
    const contactId = cpResult.getAttribute('contactId');
    const delResult = await doFetchJson('DELETE', `${self}/${contactId}`);
    this.#updateSearch();
  }

  #setLinks(res){
    const links = res.links;
    this.nextUrl = links.find( l => l.name === 'next' )?.href;
    this.prevUrl = links.find( l => l.name === 'prev' )?.href;
  }
}

customElements.define('search-widget', SearchWidget);
