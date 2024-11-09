/**
* Run the Verlis initialization when the DOM loading is done
*/
window.addEventListener('load', function () {
	init();
});

/**
* Update the value of the progress bar
* @param {number, bool} _val - The percentage of the progress bar in percentage if not bool, else if the progress bar visibility
*/
function progressBar(_val) {
	switch (typeof(_val)) {
		// Update the progress bar value
		case 'number':
			document.getElementById('loading').value = _val;
		break;
		// Show or hide the progress bar
		case 'boolean':
			if (_val === true)
				document.getElementById('loading').style.display = 'block';
			else
				document.getElementById('loading').style.display = 'none';
		break;
	}
}

/**
* Initialize the DOM and game systems once the main document is loaded
*/
async function init() {
	progressBar(5);
	
	// Declare and initialize global vars
	window.vl_nswr = null;
	window.vl_finished = false;
	window.vl_tried = {};
	window.vl_tryCount = 0;
	window.vl_worker = null;
	window.vl_trying = false;
	window.vl_timeInit = null;
	window.vl_lastTry = null;
	window.vl_options = [];
	window.vl_verblist = {};
	window.vl_i18n = {};
	window.vl_listSelection = null;
	window.vl_dictName = null;
	window.vl_dictNfos = null;
	window.vl_alphabetProcessing = false;
	
	// Remove any text from the user input text (some browser cache it)
	document.getElementById('inp-usr').value = '';
	
	// Uncheck any checked checkbox by the cache of the browser
	const arrLettersChecked = document.querySelectorAll('input[type="checkbox"][name="cb_alphabet"]:checked');
	arrLettersChecked.forEach(e => {
		e.checked = false;
	});
	progressBar(10);
	
	// Load stored user's options
	optionsLoad();
	
	progressBar(15);
	
	// Retrieve the ui localization
	await fetchWithProgress(`res/cmpr/loca/${window.vl_options['langue']}.cmpr`, i18n_ui, [15, 50]);
	
	// Bind listeners to their callbacks (part 1)
	bindFuncs_pt1();
	
	// Lang (deck selector)
	let lang = window.vl_options['langue'];
	if (lang.length === 2)
		lang = `${lang.toLowerCase()}-${lang.toUpperCase()}`;
	document.getElementById('slct-lang').value = lang;
	
	progressBar(55);
	
	// Init css framework
	initBulma();
	
	progressBar(60);
	
	// Start the time worker (i.e. the game elapsed timer and the "next word" timer)
	initTime();
	
	progressBar(65);
	
	// Show the welcome message
	welcomeMessage();
	
	// Show the dictionnary selector modal
	dictSelect_init();
}

/**
* Show help window on first visit
*/
function welcomeMessage() {
	if (localStorage.getItem('wcm') !== 'true') {
		document.getElementById('mdl-infos').classList.add('is-active');
		localStorage.setItem('wcm', 'true');
	}
}

/**
* Used by the deck selector on the selection deck page to transformed
* an item of the dropdown list to the selector-infos
* @param {html node|string} _elem - The html dropdown element of a deck, or the information of a deck
* @param {bool} _isString - Does the elem comes from bulma (true) or is manually given when the search url arg is provided (false)
*/
function fromDropdownToInfos(_elem, _isString = true) {
	let data = null;
	if (_isString)
		data = JSON.parse(_elem.value);
	else
		data = _elem;
		
	difClr = '';
	difNam = '';
	difDsc = '';
	
	// Labels' colors
	switch(data.diff) {
		case 0:
			difClr = 'success';
			difNam = 'Easy';
			difDsc = window.vl_i18n['js_setdiff0'];
			break;
		case 1:
			difClr = 'warning';
			difNam = 'Moderate';
			difDsc = window.vl_i18n['js_setdiff1'];
			break;
		case 2:
			difClr = 'danger';
			difNam = 'Hard';
			difDsc = window.vl_i18n['js_setdiff2'];
			break;
	}
	
	// Append all languages targeted by the deck
	const arrLangCode = {
		'xx-XX': ['&#127760;', 'Universal'],
		'de-DE': ['&#127465;&#127466;', 'Deutsch'],
		'da-DK': ['&#127465;&#127472;', 'Dansk'],
		'en-US': ['&#127482;&#127480;', 'English (US)'],
		'en-UK': ['&#127468;&#127463;', 'English (UK)'],
		'es-ES': ['&#127466;&#127480;', 'Español'],
		'fr-CA': ['&#127988;&#917603;&#917601;&#917617;&#917603;&#917631;', 'Français (Québec)'],
		'fr-FR': ['&#127467;&#127479;', 'Français (France)'],
		'it-IT': ['&#127470;&#127481;', 'Italiano'],
		'hu-HU': ['&#127469;&#127482;', 'Magyar'],
		'nl-NL': ['&#127475;&#127473;', 'Nederlands'],
		'nb-NO': ['&#127475;&#127476;', 'Norsk'],
		'pt-BR': ['&#127463;&#127479;', 'Português (Brasil)'],
		'pt-PT': ['&#127477;&#127481;', 'Português (Portugal)'],
		'ro-RO': ['&#127479;&#127476;', 'Română'],
		'fi-FI': ['&#127467;&#127470;', 'Suomalainen'],
		'sv-SE': ['&#127480;&#127466;', 'Svenska'],
		'vi-VN': ['&#127483;&#127475;', 'Tiếng Việt'],
		'cs-CZ': ['&#127464;&#127487;', 'Čeština'],
		'el-GR': ['&#127468;&#127479;', 'Ελληνικά'],
		'ru-RU': ['&#127479;&#127482;', 'Русский'],
		'uk-UA': ['&#127482;&#127462;', 'Українська'],
		'th-TH': ['&#127481;&#127469;', 'แบบไทย']
	};
	let frag_lang = '';
	for (let lang of data.lang)
		frag_lang += `<div class="has-tooltip-arrow has-tooltip-info" data-tooltip="${arrLangCode[lang][1]}">${arrLangCode[lang][0]}</div>`;
	
	// Forging html the frag
	const selectLang = document.getElementById("selector-infos");
	selectLang.innerHTML =
		`<div class="control">
			<div class="tags has-addons are-medium">
				<span class="tag is-dark">${window.vl_i18n['js_setdiff']}</span>
				<span class="tag is-${difClr}">${difDsc}</span>
			</div>
		</div>
		<div class="control">
			<div class="tags has-addons are-medium">
				<span class="tag is-dark">${window.vl_i18n['js_setnmbr']}</span>
				<span class="tag is-info">${data.nmbr.toLocaleString(window.vl_options['langue'])}</span>
			</div>
		</div>
		<div class="control">
			<div class="tags has-addons are-medium">
				<span class="tag is-dark">${window.vl_i18n['js_clue']}</span>
				<span class="tag is-${data.clue ? 'white' : 'black'}">${data.clue ? window.vl_i18n['js_clueyes'] : window.vl_i18n['js_clueno']}</span>
			</div>
		</div>
		<div class="control">
			<div class="tags has-addons are-medium">
				<span class="tag is-dark">${window.vl_i18n['languages']}</span>
				<span class="tag tag-flag">${frag_lang}</span>
			</div>
		</div>`;
		
	// Append the note to the html fragment
	if (data['note'])
		selectLang.innerHTML += `<div class="control content is-small multilines">${data['note']}</div>`;
	
	// Populate the description div with the html fragment
	selectLang.style.animation = 'none';
	selectLang.offsetHeight;
	selectLang.style.animation = null;
}

/**
* Initialize the dictionary selector
*/
async function dictSelect_init() {
	// Retrieve the list of dictionaries
	await fetchWithProgress('res/cmpr/deck/_index.cmpr', dictSelect_show, [65, 100]);
	
	// Load the list of dictionaries
	var api = function(inputValue) {
		const arrWordsUser = inputValue.toLowerCase().replaceAll('\u2506', '').trim().replace(/[ ]{2,}/gi, ' ').split(' ');
		
		return new Promise(function(resolve) {
			document.getElementById('selector').classList.remove('is-danger');
			document.getElementById('inp-set-dsc').style.visibility = 'hidden';
			resolve(window.vl_listSelection);
		})
		// Filter decks whose name matches with user text input
		.then(function(decks) {
			const decksLangFilter = decks.filter(function(deck) {
				return Object.entries(deck.lang).filter(function(elem) {
					return (elem.includes(document.getElementById('slct-lang').value)
					|| elem.includes('xx-XX'));
				}).length > 0;
			});

			return decksLangFilter.filter(function(deck) {
				return Object.entries(deck.name).filter(function(elem) {
					if (document.getElementById('slct-lang').value.substr(0, 2) !== elem[0]
					&& elem[0] !== 'xx')
						return false;
					return arrWordsUser.filter(word => elem[1].toLowerCase().includes(word)).length == arrWordsUser.length;
				}).length > 0;
			});
		})
		// Return best name match, prioritize user language
		.then(function(filtered) {
			return filtered.map(function(elem) {
				const userLangISO2 = window.vl_options['langue'].substr(0, 2);
				
				let slctrValue =  {...elem['slct']};
				if (slctrValue['note'] !== undefined)
					slctrValue['note'] = (slctrValue['note'][userLangISO2] || slctrValue['note']['xx'] || Object.entries(slctrValue['note'])[0]);
				
				slctrValue['lang'] = elem['lang'];
				
				return {
					label: (elem['name'][userLangISO2] || elem['name']['xx'] || Object.entries(elem['name'])[0][1]),
					value: JSON.stringify(slctrValue)
				}
			})
		})
		// Return the 15 first items
		.then(function(transformed) {
			return transformed.slice(0, 15)
		})
	};

	var onSelect = function(elem) {
		fromDropdownToInfos(elem);
	};
	
	// Init the selector text input
	await bulmahead('selector', 'selector-menu', api, onSelect, 0, 0);
	
	// Show the welcome message
	welcomeMessage();
}

/**
* Initialize the dictionary selector
* @param {blob} _blob - The data retrieved
*/
async function dictSelect_show(_blob) {
	window.vl_listSelection = await _blob;
	
	// If the dict is given, populate the dict selector, then empty it (cache)
	let dictName = (new URLSearchParams(window.location.search)).get('deck') || '';
	if (dictName !== '') {
		const arrFound = window.vl_listSelection.filter(function(elem) {
			return elem.dict === dictName;
		});
		
		// The given dict exists
		if (arrFound.length > 0) {
			if (typeof(arrFound[0].name) === 'string')
				document.getElementById('selector').value = arrFound[0].name;
			else {
				const userLangISO2 = window.vl_options['langue'].substr(0, 2);
				document.getElementById('selector').value = arrFound[0].name[userLangISO2] || arrFound[0].name['xx'];
			}
		
			loadDict();
		}
		else
			dictName = '';
	}
	else
		document.getElementById('selector').value = '';
	
	document.getElementById('run-set').removeAttribute('disabled');
	document.getElementById('selector').removeAttribute('disabled');
	
	progressBar(false);
	
	document.querySelector('.level.minimal .level-item[type="menu"]').style.visibility = 'visible';
	
	// Show the selector modal
	document.getElementById('selector-container').style.display = 'flex';
	
	// If a prefill param is provided
	const prefill = (new URLSearchParams(window.location.search)).get('search') || '';
	if (dictName === ''
	&& prefill !== '') {
		document.getElementById('selector').value = prefill;
		
		const langUser = window.vl_options['langue'].substr(0, 2);
		const arrFound = window.vl_listSelection.filter(function(elem) {
			const dictName = elem.name[langUser] || elem.name['xx'] || Object.entries(elem.name)[0];
			return dictName === decodeURIComponent(prefill);
		});
		
		if (arrFound.length === 0)
			document.getElementById('selector').focus();
		else {
			const deckNote = arrFound[0].slct.note ? (arrFound[0].slct.note[langUser] || arrFound[0].slct.note['xx'] || Object.entries(arrFound[0].slct.note)[0]) : '';
			const deckInfos = {
				'lang': arrFound[0].lang,
				'diff': arrFound[0].slct.diff,
				'nmbr': arrFound[0].slct.nmbr,
				'clue': arrFound[0].slct.clue,
				'note': deckNote
			};
			fromDropdownToInfos(deckInfos, false);
		}
	}
}

/**
* Download a remote file with progress tracking
* @param {string} _url - File Url to fetch
* @param {function} _onFinished - Callback to call when finished
* @param {array[number]} _arrMinMax - Minimum and maximum values this fetch affects on the progress bar
*/
async function fetchWithProgress(_file, _onFinished, _arrMinMax = [0, 100]) {
	fetchWithProgress_(_file, progress => {
		// Calculates the progression within the specified range
		const val = _arrMinMax[0] + ((_arrMinMax[1] - _arrMinMax[0]) * progress.toFixed(2));
		// Update the progress bar
		progressBar(val);
	}).then(response => response.blob()) // response to binary blob
		.then(blob => {
			_onFinished(blob.vl_decompress());
		})
		.catch(console.error);
}

/**
* Backend routine to download a remote file with progress tracking
* @param {string} _url - File Url to fetch
* @param {function} _onProgress - Progress callback to update fetch progression
* @return {blob} - The retrieved file
*/
async function fetchWithProgress_(_url, _onProgress) {
  const response = await fetch(_url);
	// Throw error if response has not a body
  if (!response.body) throw new Error("ReadableStream not supported");

	// Retrieves the Content-Length header from the response, which indicates the total file size (in bytes)
  const contentLength = response.headers.get("content-length");
	// Throws an error if Content-Length is missing
  if (!contentLength) throw new Error("Content-Length not specified");

  const total = parseInt(contentLength, 10);
  let loaded = 0;

  const reader = response.body.getReader();
  const stream = new ReadableStream({
    start(controller) {
      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          loaded += value.length;
          _onProgress(loaded / total);
          controller.enqueue(value);
          read();
        });
      }
      read();
    },
  });

  return new Response(stream);
}

/**
* Load a dictionary
*/
async function loadDict() {
	// Retrieve the user dict choice
	const userChoice = document.getElementById('selector').value.toLowerCase();
	// Check if this name exists in the index.cmpr
	const arrFound = window.vl_listSelection.filter(function(dict) {
		if (typeof(dict.name) === 'string') {
			const dictName = dict.name.toLowerCase();
			return dict.name === userChoice
		}
		else {
			return Object.entries(dict.name).filter(function(elem) {
				const dictName = elem[1].toLowerCase();
				return dictName === userChoice
			}).length > 0
		}
	});
	
	// No dict has been found, force exit
	if (arrFound.length !== 1) {
		// Indicate the user no dict eixst with this name
		document.getElementById('selector').classList.add('is-danger');
		document.getElementById('inp-set-dsc').style.visibility = 'visible';
		return;
	}
	
	// Store the name of the selected set (load/save func)
	window.vl_dictName = arrFound[0].dict;
	
	// Store the Urls for quick search
	window.vl_dictNfos = arrFound[0];
	
	// Set the set title to the nav
	document.getElementById('set-title').innerHTML = userChoice.substr(userChoice.indexOf('\u2506') + 1);
	
	// Hide the selector modal
	document.getElementById('selector-container').style.display = 'none';
	
	// Show the progress bar
	progressBar(0);
	progressBar(true);
	
	// Retrieve the dict
	await fetchWithProgress(`res/cmpr/deck/${arrFound[0].dict}.cmpr`, retrieveDict, [0, 100]);
}

/**
* Show the UI after loading the dictionary
*/
function loadDict_end() {
	// Show the menu button and the alphabet
	document.getElementsByTagName('nav')[0].style.visibility = 'visible';
	document.getElementsByClassName('alphabet')[0].style.visibility = 'visible';
	
	// Show the "Home page" menu button
	document.getElementById('plzhome').style.display = 'flex';
	
	// Show the navbar
	document.getElementsByClassName('level')[0].classList.remove('minimal');
	
	// Enable the abandon button
	document.getElementById('plzstahp').removeAttribute('disabled');
	
	// Hide the dict selection inputs
	document.getElementById('selector-container').style.display = 'none';
	
	// Hide progress bar
	progressBar(false);
	
	// Set the inputs visibile
	if (document.getElementsByClassName('ag-input-container')[0])
		document.getElementsByClassName('ag-input-container')[0].style.display = 'flex';
	// Enable the button back
	if (document.getElementById('btn-try'))
		document.getElementById('btn-try').removeAttribute('disabled');
	if (document.getElementById('inp-usr')) {
		// Enable the text input back
		document.getElementById('inp-usr').removeAttribute('disabled');
		// Automatically focus the text input
		document.getElementById('inp-usr').focus();
	}
	
	// Bind listeners to their callbacks (part 2)
	bindFuncs_pt2();
}

/**
* Bind listeners to their callbacks (part 1)
*/
function bindFuncs_pt1() {
	// Bind the "Abandon" button from the menu to its callback
	document.getElementById('plzstahp').addEventListener('click', function(e) {
		if (window.vl_finished !== true)
			document.getElementById('mdl-abandon').classList.add('is-active');
	});
	
	// Bind the copy link button to its callback 
	document.getElementById('btn-copylink').addEventListener('click', function(e) {
		var inp = document.getElementById('inp-link');
		inp.select();
		inp.setSelectionRange(0, 99999);
		navigator.clipboard.writeText(inp.value);
		
		document.getElementById('btn-copylink-icn').classList.remove('fa-clipboard');
		document.getElementById('btn-copylink-icn').classList.add('fa-check');
		document.getElementById('btn-copylink').classList.remove('is-info');
		document.getElementById('btn-copylink').classList.add('is-success');
		document.getElementById('btn-copylink-txt').innerHTML = window.vl_i18n['js_linkcopied'];
	});
	
	// Bind the "Home page" button to its callback
	document.getElementById('plzhome').addEventListener('click', function(e) {
		window.location = window.location.origin + window.location.pathname;
	});
	
	// Bind the "Abandon" button from the abandon modal to its callback
	document.getElementById('btn-abandon').addEventListener('click', function(e) {
		gameEnd('a');
	});
	
	// Bind the "Save" options button from the options modal to its callback
	document.getElementById('btn-options').addEventListener('click', function(e) {
		optionsSave();
	});

	// Bind the "Send word" button to its callback
	document.getElementById('btn-try').addEventListener('click', function () {
		checkWord();
	});

	// Bind the "Play this set" button to its callback
	document.getElementById('run-set').addEventListener('click', function () {
		loadDict();
	});
	
	// Bind text input to its callback to remove the red style assigned to it
	// when the user tries a verb that doesn't exist, as soon as a letter is added or removed from it.
	// in order to remove the red style 
	document.getElementById('inp-usr').addEventListener("input", function(e) {
		// The text input has the danger class
		if (e.srcElement.classList.contains('is-danger')) {
			// Remove the danger class
			e.srcElement.classList.remove('is-danger');			
			// Remove the user text input warning icon
			document.getElementById('inp-usr-icn').classList.remove('is-visible');
			// Remove the user text input warning text
			document.getElementById('inp-usr-dsc').classList.remove('is-visible');
		}
	});

	// Bind the keyboard key pressing to its callback
	document.addEventListener('keydown', function(e) {
		// Get the key code
		const keynum = e.keyCode||e.which;
		
		// If the user text input has focus (word submission)
		if (document.activeElement === document.getElementById('inp-usr')) {
			// Return key is pressed
			if (keynum == 13)
				// Start the word processing
				checkWord();
			// A word has already been tried
			else if (window.vl_lastTry !== null
			// Up arrow is pressed
			&& keynum == 38)
				// Set the last tried (successfully or not) word in the user text input
				document.getElementById('inp-usr').value = window.vl_lastTry;
			// Down arrow is pressed
			else if (keynum == 40)
				// Erase the value of the user text input
				document.getElementById('inp-usr').value = '';
		}
		// If the user text input has focus (set selector)
		else if (document.activeElement === document.getElementById('selector')) {
			// Return key is pressed
			if (keynum == 13)
				// Load the selected dict
				loadDict();
		}
	});
	
	// Add function to decompress distant cmpr
	Blob.prototype.vl_decompress = async function () {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await this.arrayBuffer();
    
    // Convert ArrayBuffer to Uint8Array
    const bytes = new Uint8Array(arrayBuffer);

    // Decompress using GZIP in the browser
    const base64Encoded = await new Response(new Blob([bytes], { type: 'application/gzip' }))
			.arrayBuffer()
			.then(buffer => new TextDecoder('utf-8').decode(buffer));
		
		// Decode from Base64
		const gzipCompressed = Uint8Array.from(atob(base64Encoded), c => c.charCodeAt(0));
		
    // Decompress GZIP
    const decompressed = pako.ungzip(gzipCompressed, { to: 'string' });

    return JSON.parse(decompressed);
	};
	
	// Add function to reverse a string
	String.prototype.vl_reverse = function (char) {
		var arrSlitted = this.split("");
		var arrReversed = arrSlitted.reverse();
		var arrJoined = arrReversed.join("");
		return arrJoined;
	};
	
	// Add function to capitalize a string
	String.prototype.vl_capitalize = function (char) {
		return this.split(' ').map(e => {
			return e.charAt(0).toUpperCase() + e.substr(1);
		}).join(' ');
	};

	// Encode string
	String.prototype.vl_encode = function (char) {
		const bytes = new TextEncoder().encode(this);
		const bin = String.fromCodePoint(...bytes);
		return btoa(bin);
	};
	
	// Decode string
	String.prototype.vl_decode = function (char) {
		try {
			const bin = atob(this);
			const bytes = Uint8Array.from(bin, (m) => m.codePointAt(0));
			return new TextDecoder().decode(bytes);
		}
		catch(e) {
			return '';
		}
	};
	
	// Normalize special characters encoding
	String.prototype.vl_normalize = function (char) {
		//return this.toLowerCase().normalize("NFKC");
		return this.toLowerCase().normalize("NFC");
	};
	
	// Compare strings, take into account language specificities
	String.prototype.vl_compare = function (_str) {
		const arrLangDiacriticOsef = [
			'fr-FR', 'fr-CA'
		];
		
		return (
			this.localeCompare(
				_str,
				window.vl_options['langue'],
				{ sensitivity: arrLangDiacriticOsef.includes(window.vl_options['langue']) ? 'base' : 'accent' }
			)
		);
	};
}

/**
* Adjust the range of alphabet letters to highlight when the user checked/uncheck a new one
* @param {object} _lid - The div node ref of the new checked/unchecked letter of the alphabet
*/
function alphabetCheckedChange(_lid) {
	if (window.vl_alphabetProcessing) return;
	else window.vl_alphabetProcessing = true;
	
	try {
		// Does the letter has just been checked or unchecked
		const isAdded = _lid.checked;
		// Get all checked letters
		const arrLettersChecked = document.querySelectorAll('input[type="checkbox"][name="cb_alphabet"]:checked');
		
		// Unhighlight currently highlighted letters
		const arrLettersHighlithed = document.querySelectorAll('input[type="checkbox"][name="cb_alphabet"].highlight');
		arrLettersHighlithed.forEach(e => {
			e.classList.remove('highlight');
		});
		
		// A range was previously already highlighted and a letter has been addedd
		if (arrLettersChecked.length > 2) {
			// Get the letters IDs of the previous alphabet state
			const arrLettersCheckedOld = Object.values(arrLettersChecked).filter(div => div.getAttribute('lid') !== _lid.getAttribute('lid'));
			const lidCurr = parseInt(_lid.getAttribute('lid'));
			const lidPrv1 = parseInt(arrLettersCheckedOld[0].getAttribute('lid'));
			const lidPrv2 = parseInt(arrLettersCheckedOld[1].getAttribute('lid'));
			
			// Determine the closest checked letter from the removed one
			const diffCurr1 = Math.abs(lidCurr - lidPrv1);
			const diffCurr2 = Math.abs(lidCurr - lidPrv2);
			
			// Uncheck it
			document.querySelector(`input[type="checkbox"][name="cb_alphabet"][lid="${(diffCurr1 < diffCurr2 ? lidPrv1 : lidPrv2)}"]`).checked = false;
		}
		
		// Highlight the range of letters
		if (arrLettersChecked.length >= 2) {
			// Highlight the new range of letters
			const arrLettersCheckedUpd = document.querySelectorAll('input[type="checkbox"][name="cb_alphabet"]:checked');
			const lidOne = parseInt(arrLettersCheckedUpd[0].getAttribute('lid'));
			const lidTwo = parseInt(arrLettersCheckedUpd[1].getAttribute('lid'));
			const lidMin = Math.min(lidOne, lidTwo) + 1;
			const lidMax = Math.max(lidOne, lidTwo) - 1;
			
			const arrLettersToHighlith = document.querySelectorAll(
				Array.from({ length: lidMax - lidMin + 1 }, (_, i) => `input[type="checkbox"][name="cb_alphabet"][lid="${lidMin + i}"]`).join(',')
			);
			arrLettersToHighlith.forEach(e => {
				e.classList.add('highlight');
			});
		}
	}
	catch(err) {
		window.vl_alphabetProcessing = false;
		return;
	}
	
	window.vl_alphabetProcessing = false;
}

/**
* Bind listeners to their callbacks (part 2)
*/
function bindFuncs_pt2() {
	// Bind each alphabet letter to their global callback
	document.querySelectorAll('input[type="checkbox"][name="cb_alphabet"]').forEach(e => {
		e.addEventListener('change', function (l) {
			alphabetCheckedChange(l.srcElement);
		});
	});
}

/**
* Get the browser language
* @return {} - The language of the browser if implemented, else "en-US"
*/
function getLang() {
	// Language ISO Code 2 and their 5 translation
	const dctConvertIso2to5 = {
		cs: 'cs-CZ', da: 'da-DK', de: 'de-DE', en: 'en-US', el: 'el-GR', es: 'es-ES',
		fi: 'fi-FI', fr: 'fr-FR', hu: 'hu-HU', it: 'it-IT', nb: 'nb-NO', nl: 'nl-NL',
		pt: 'pt-PT', ro: 'ro-RO', ru: 'ru-RU', sv: 'sv-SE', th: 'th-TH', uk: 'uk-UA',
		vi: 'vi-VN'
  };
	
	// If the length of the language ISO Code is 2, convert it to a length of 5
	let strBrowserLang = navigator.language || navigator.userLanguage;
	if (strBrowserLang in dctConvertIso2to5)
		strBrowserLang = dctConvertIso2to5[strBrowserLang];

	// Array of languages supported
	const arrLangImpl = [
		'cs-CZ', 'da-DK', 'de-DE', 'en-US', 'el-GR', 'es-ES', 'fi-FI', 'fr-CA', 'fr-FR',
		'hu-HU', 'it-IT', 'nb-NO', 'nl-NL', 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sv-SE',
		'th-TH', 'uk-UA', 'vi-VN'
	];

	// If the current language is not supported
	if (!arrLangImpl.includes(strBrowserLang))
		// Force to american english
		strBrowserLang = 'en-US';
	
	return strBrowserLang;
}

/**
* Apply localization on UI
* @param {blob} _blob - The data retrieved
*/
async function i18n_ui(_blob) {
	window.vl_i18n = await _blob;
	
	// Determine word (day) ID
	document.getElementById('day-id').innerHTML = `${window.vl_i18n['js_dayid']}${getWordID()}`;
	
	// Append to child
	document.querySelectorAll('*[i18n^="ac_"]').forEach(e => {
		const attName = e.getAttribute('i18n').substr(3);
		
		if (attName === 'alphabet') {
			let i = 0;
			window.vl_i18n[attName].split(';').forEach(c => {
				var newNode = document.createElement('div');
				newNode.innerHTML = `<input type="checkbox" lid="${i}" id="alphabet_${i.toString()}" name="cb_alphabet" /><label for="alphabet_${i.toString()}">${c}</label>`;
				e.appendChild(newNode);
				
				++i;
			});
		}
		else {
			var newNode = document.createElement('div');
			newNode.innerHTML = window.vl_i18n[attName];
			e.appendChild(newNode);
		}
	});
	
	// Append to (inner)HTML
	document.querySelectorAll('*[i18n^="ah_"]').forEach(e => {
		const attName = e.getAttribute('i18n').substr(3);
		e.innerHTML += window.vl_i18n[attName];
	});
	
	// Replace innerHTML
	document.querySelectorAll('*[i18n^="ih_"]').forEach(e => {
		const attName = e.getAttribute('i18n').substr(3);
		let cont = attName.substr(0, 4) === 'a2b_' ? window.vl_i18n[attName].vl_decode() : window.vl_i18n[attName];
		e.innerHTML = cont;
	});
	
	// Placeholder
	document.querySelectorAll('*[i18n^="ph_"]').forEach(e => {
		const attName = e.getAttribute('i18n').substr(3);
		e.placeholder = window.vl_i18n[attName];
	});
}

/**
* Retrieve the dict
* @param {blob} _blob - The data retrieved
*/
async function retrieveDict(_blob) {
	window.vl_verblist = await _blob;
	
	for (let i = 0; i < window.vl_verblist.length; ++i)
		if (window.vl_verblist[i].r !== undefined)
			window.vl_verblist[i].r = new RegExp(`^${window.vl_verblist[i].r}$`, 'i');

	// Choose a word from the list
	pickWord();
	
	loadDict_end();
	
	checkLastFinish();
}

/**
* Display the word ID (based on the day ID) in the menu
*/
function getWordID() {
	return getDailyIntWithTimezone() - 20015;
}

/**
* Load options from stored data
*/
function optionsLoad() {
	if (localStorage.getItem('opt') !== null) {
		const opt = JSON.parse(localStorage.getItem('opt'));
		
		window.vl_options = opt;
		
		// Ranking
		document.getElementById(`rad-ranking-${opt['ranking']}`).checked = true;
		
		// Lang (options)
		document.querySelector(`.rad-lng input[type="radio"][value="${opt['langue']}"]`).checked = true;
	}
	else {
		// Ranking
		document.getElementById('rad-ranking-0').checked = true;
		
		// Language
		const strBrowserLang = getLang();
		document.querySelector(`.rad-lng input[type="radio"][value="${strBrowserLang}"]`).checked = true;
		
		// Save default options
		optionsSave();
	}
}

/**
* Save options to stored data
*/
function optionsSave() {
		const opt = JSON.parse(localStorage.getItem('opt') || '{}');
		
		// Ranking
		opt['ranking'] = parseInt(document.querySelector('*[name="rad-ranking"]:checked').value);
		
		// Language
		const oldLang = opt['langue'];
		opt['langue'] = document.querySelector(`.rad-lng input[type="radio"]:checked`).value;
		
		window.vl_options = opt;
		
		localStorage.setItem('opt', JSON.stringify(opt));
		
		applyWordAfterStyle();
		
		if (oldLang !== opt['langue'])
			window.location.reload();
}

/**
* Apply visibility to words::after corresponding to users options
*/
function applyWordAfterStyle() {
	// Apply the style to the word::after corresponding to the alphabetically closest words
	document.querySelectorAll('#ag-words-before .word:last-of-type, #ag-words-after .word:first-of-type').forEach(e => {
		e.classList.remove('show-after');
		if (window.vl_options['ranking'] < 2)
			e.classList.add('show-after');
	});
	
	// Apply the style to the word::after corresponding to the alphabetically farest words
	document.querySelectorAll('#ag-words-before .word:not(:last-of-type), #ag-words-after .word:not(:first-of-type)').forEach(e => {
		e.classList.remove('show-after');
		if (window.vl_options['ranking'] === 0)
			e.classList.add('show-after');
	});
}

/**
* Pick a seeded random word from a list. The seed is the time, independently of the current time zone.
* This allows the picked word to be the same regardless of user time zone.
* The dictionary has an n-ary tree shape, so the function randomly chooses a character and navigates under that branch.
*/
function pickWord() {
	// Set the current branch of the n-ary tree to its root
	let currBranch = window.vl_verblist;
	// Pick a random number with the current day (independently of the time zone) as seed.
	// Pay attention, the rand lib uses included min and max.
	const randNbr = getRandom().randomInteger(1, Object.keys(currBranch).length) - 1;

	// Get the random picked element
	const elemPicked = currBranch[randNbr];
	
	// Populate the Clue modal
	if (elemPicked.c !== undefined) {
		if (elemPicked.c.indexOf('data:image/jpeg;base64,/') === 0)
			document.getElementById('clue-content').innerHTML = `<img src="${elemPicked.c}" />`;
		else if (elemPicked.c.indexOf('data:audio/mpeg;base64,/') === 0)
			document.getElementById('clue-content').innerHTML = `<audio controls="controls" autobuffer="autobuffer"><source src="${elemPicked.c}" /></audio>`;
		else
			document.getElementById('clue-content').innerHTML = `<p>${elemPicked.c}</p>`;

		document.getElementById('plzclue').removeAttribute('disabled');
	}
	
	// Release memory of other useless clues
	for (let i = 0; i < currBranch.length; ++i)
		currBranch[i].c = null;
	
	// Store the infos of the chosen word
	window.vl_nswr = randNbr;
}

/**
* Get a random number.
* @return {number} Who knows
*/
function getRandom() {
	return (new Randomizer({ rng : 'CombinedMultipleRecursive', seed : (getDailyIntWithTimezone() + 7891235)}));
}

/**
* Check if the given word exists in the dictionary, and if it is the picked one.
* @param {string} _wordUser - The user given word
* @param {regex|string} _compareTo - The string to compare, or the regex to test
* @return {bool} Does the user given word is corresponding to the word from the deck
*/
function checkWord_isSame(_wordUser, _compareTo) {
	if (_compareTo.r !== undefined)
		return _compareTo.r.test(_wordUser);
	else
		return _wordUser === _compareTo.s;
}

/**
* Check if the given word exists in the dictionary, and if it is the picked one.
* @return {null}
*/
function checkWord() {
	// Get the HTML user text input
	const inputUser = document.getElementById('inp-usr');
	
	// Store the tried word
	window.vl_lastTry = inputUser.value;
	
	// Get the user given word, prepare it to comparison
	const wordUser = inputUser.value.replaceAll(' ', '').toLowerCase().vl_normalize();
	
	// If the word string is empty
	if (wordUser.length === 0
	// or if the processing is already running
	|| !checkWord_Beg())
		// Stop the process
		return;


	/*
	** CHECK THE WORD STATUS
	*/
	let wordUserOfficialWriting = null;
	// Initialize the proposition status
	// -2: default and does not exists, -1: win, \d+: exists
	let foundStatusOrID = -2;
	// Get the answer, using the vl_verblist entry and the answer word uid
	const nswr = window.vl_verblist[window.vl_nswr];
	// Does the word given is the picked one of the day
	if (checkWord_isSame(wordUser, nswr)) {
		foundStatusOrID = -1;
	}
	// Does the word exists in the deck
	else {
		for (let i = 0; i < window.vl_verblist.length; ++i) {
			if (checkWord_isSame(wordUser, window.vl_verblist[i])) {
				foundStatusOrID = i;
				wordUserOfficialWriting = window.vl_verblist[i].o;
				i = window.vl_verblist.length;
			}
		}
	}
	
	/*
	** WORD RESULT PROCESSING
	*/
	// The word does not match any known word or the user gave an unfinished word
	if (foundStatusOrID === -2) {
		// Apply the corresponding style to the user text input
		inputUser.classList.add('is-danger');
		// Show the user text input warning icon
		document.getElementById('inp-usr-icn').classList.add('is-visible');
		// Show the user text input warning text
		document.getElementById('inp-usr-dsc').classList.add('is-visible');
	}
	// The word exists
	else {
		// If the game timer has not yet been started
		if (window.vl_timeInit === null)
			// Store the start time
			window.vl_timeInit = Math.floor(Date.now() / 1000);
			
		// Flush the user input text
		inputUser.value = '';
			
		/*
		** WORD ALREADY TRIED
		*/
		// The user already tried this word
		if (window.vl_tried[foundStatusOrID] !== undefined) {
			// Assign the "already tried" animation to this word in the DOM
			const alreadyTriedWordNode = document.querySelector(`.word[word-uid="${foundStatusOrID}"]`);
			if (alreadyTriedWordNode !== null) {
				// Add the highlight animation class to the word HTML node.
				// When the game is resumed, this class is not applied to any bulk pushed word.
				if (!alreadyTriedWordNode.classList.contains('highlight'))
					alreadyTriedWordNode.classList.add('highlight');
				alreadyTriedWordNode.style.animation = 'none';
				alreadyTriedWordNode.offsetHeight;
				alreadyTriedWordNode.style.animation = null;
			}
			
			// Revert the "Essayer" button, and update the word processing status
			checkWord_End();
			
			return;
		}
		// The user did not try this existing word yet
		else {
			// Store information that this given word has been tried
			if (foundStatusOrID !== -1)
				window.vl_tried[foundStatusOrID] = true;
		}
		
		/*
		** WORD PROCESSING
		*/
		// Increment the number of tries
		document.getElementById('nav-try').innerHTML = (++window.vl_tryCount).toString();
		
		// The word given matches the picked one
		if (foundStatusOrID === -1)
			// End the game
			gameEnd('w');
		// The given word does not match the picked one
		else
			insertWord(nswr.o, foundStatusOrID);
	}
	
	// Save the game progress
	if (foundStatusOrID !== -1)
		gameSaveState();
	
	// Revert the "Essayer" button, and update the word processing status
	checkWord_End();
}

/**
* Insert a word in the before or after html node
* @param {string} _nswr - Expected answer
* @param {number} _wuid - Given word uid
*/
function insertWord(_nswr, _wuid, _anim = true) {
	// Convert any diacritic from the official writing given word (necessary to compare words alphabetically)
	const nswrClnNoSp = _nswr.replaceAll(' ', '').toLowerCase().vl_normalize();
	// Convert any diacritic from the expected word (necessary to compare words alphabetically)
	const userCleaned = window.vl_verblist[_wuid].o.toLowerCase().vl_normalize();
	const userClnNoSp = userCleaned.replaceAll(' ', '');
	// Does the given word is alphabetically placed before or after the picked one
	const givenIsBeforePicked = (userClnNoSp.vl_compare(nswrClnNoSp) < 0);
	// Get the corresponding tried words list in the DOM
	let wordListNode = document.getElementById(givenIsBeforePicked ? 'ag-words-before' : 'ag-words-after');
	
	// Create a Html fragment for the given word
	let frag = document.createElement('div');
	frag.classList.add('word');
	if (_anim)
		frag.classList.add('highlight');
	frag.setAttribute('word-uid', _wuid);
	frag.innerHTML = window.vl_verblist[_wuid].o;
	// Add the clue according to the number of identical letters at the beginning and end
	const countSameBeg = countEquality(nswrClnNoSp, userClnNoSp, false);
	const countSameEnd = countEquality(nswrClnNoSp, userClnNoSp, true);
	
	if (countSameBeg === 0 && countSameEnd === 0)
		frag.setAttribute('data-nfo', '\u25c7');
	else if (countSameBeg !== 0 && countSameEnd !== 0)
		frag.setAttribute('data-nfo', `${countSameBeg} \u25c6 ${countSameEnd}`);
	else if (countSameBeg !== 0)
		frag.setAttribute('data-nfo', `${countSameBeg} \u2b16`);
	else if (countSameEnd !== 0)
		frag.setAttribute('data-nfo', `\u2b17 ${countSameEnd}`);
	
	// Try to insert the given word alphabetically into its place in the list
	let insertDone = false;
	// The list has children
	if (wordListNode.childElementCount > 0) {
		// Iterate over all children IDs
		for (let i = 0; i < wordListNode.childElementCount; ++i) {
			// Get the children corresponding to this ID
			const div = wordListNode.childNodes[i];
		
			// If the given word is placed before the current one
			if (userCleaned.vl_compare(div.innerText.vl_normalize()) <= 0) {
				// Insert the Html fragment of the given word before the current word
				wordListNode.insertBefore(frag, div);
				// Store the information that the given word already has been added to the list
				insertDone = true;
				// Stop iterating over the list
				i = wordListNode.childElementCount;
			}	
		}
	}
	
	// The list has no children,
	// or the given word did not fit before any already tried word
	if (!insertDone)
		// Append the Html fragment to the end of the list
		wordListNode.appendChild(frag);
	
	/*
	** REMOVE OVERFLOWING WORDS
	*/
	// If the current list is the "before" one
	if (givenIsBeforePicked) {
		wordListNode.childNodes.forEach(div => {
			// Check if the iterated word is placed above the top of the window
			if (div.getBoundingClientRect().y < 0)
				// Remove the currently iterated word
				div.remove();
			// The farer word from the center of the screen is not above the top of the window
			else
				// Stop iterating over the list
				return;
		});
	}
	// If the current list is the "after" one
	else {
		Array.from(wordListNode.childNodes).slice().reverse().forEach(div => {
			// Check if the iterated word is placed below the bottom of the window
			if (div.getBoundingClientRect().y > window.innerHeight)
				// Remove the currently iterated word
				div.remove();
			// The farer word from the center of the screen is not below the bottom of the window
			else
				// Stop iterating over the list
				return;
		});
	}
	
	// Apply the corresponding style to word::after
	applyWordAfterStyle();
}

/**
* Used in checkWord(), checks if the input user's word processor is not already running,
* returns true if it is, so that checkWord() can stop before any processing.
* @return {bool} Does checkWord() should stop (false) or not (true)
*/
function checkWord_Beg() {
	// The processing is not running
	if (window.vl_trying !== true)
		// Update the processing status
		window.vl_trying = true;
	// The processing is running	
	else
		// Tell checkWord() to stop
		return false;
	
	// If the "Essayer" button exists (it can be replaced by the final score div hero)
	if (document.getElementById('btn-try') !== null)
		// Display a loader on the button
		document.getElementById('btn-try').classList.add('is-loading');
	
	// Tell checkWord() to continue
	return true;
}

/**
* Used in checkWord(), hide the "Essayer" button loader and reset the user input word processing status.
*/
function checkWord_End() {
	// If the "Essayer" button exists (it can be replaced by the final score div hero)
	if (document.getElementById('btn-try') !== null)
		// Hide the loader on the button
		document.getElementById('btn-try').classList.remove('is-loading');
	
	// Revert the processing status
	window.vl_trying = false;
}

/**
* Determine the position of the first different character from the start or the end
* @param {string} _user - The user given word
* @param {string} _picked - The picked word
* @param {bool} _reverse - Does words has to be reversed, used to count same characters from end
* @return {number} the number of characters
*/
function countEquality(_user, _picked, _reverse) {
	// Determine the number of character to check
	let user = _user.vl_normalize();
	let pick = _picked.vl_normalize();
	let len = Math.max(user.length, pick.length);
	
	// Reverse strings in case the first difference to found is from the end
	if (_reverse) {
		user = user.vl_reverse();
		pick = pick.vl_reverse();
	}
	
	pick = pick.padEnd(len, '\ufffd');
	user = user.padEnd(len, '\ufffd');
	
	// Return the number of characters when the first difference occurs
	let iSame = 0;
	for (let i = 0; i < len; ++i) {
		if (user[i] === pick[i])
			++iSame;
		else
			return iSame;
	}
	
	// Both strings are the same
	// Note: the equality between the user and the picked word is handled before, so this case should never be encountered
	return iSame;
}

/**
* Save game progress
*/
function gameSaveState() {
	localStorage.setItem(
		`lf_${window.vl_dictName}`,
		JSON.stringify({
			day: getDailyIntWithTimezone(),
			type: 'p',
			tries: window.vl_tryCount.toString(),
			time: window.vl_timeInit,
			tried: JSON.stringify(window.vl_tried)
		})
	);
}

/**
* End game processing
* @param {char} _state - 'w' for Win, 'a' for Abandoned, 'p' for InProgress
* @param {bool} _save - Does the results needs to be saved in the local storage (it depends on if this function is called when the user win/abandon, or when the game loads the last game infos)
*/
function gameEnd(_state, _save = true) {
	// Save the result
	if (_save === true) {
		localStorage.setItem(
			`lf_${window.vl_dictName}`,
			JSON.stringify({
				day: getDailyIntWithTimezone(),
				type: _state,
				tries: window.vl_tryCount.toString(),
				time: document.getElementById('nav-tim').innerText,
				tried: JSON.stringify(window.vl_tried)
			})
		);
	}
	
	// Forbid any word/game processing
	window.vl_finished = true;
	// Block the abandon button
	document.getElementById('plzstahp').classList.remove('has-text-danger');
	document.getElementById('plzstahp').classList.add('has-text-danger-dark');
	
	// Determine the hero color
	const clr = _state === 'w' ? 'success' : 'danger';
	
	const nswr = window.vl_verblist[window.vl_nswr];
	
	// Set the quick search url if provided for this deck
	let fragQuickSearch = null;
	if (window.vl_dictNfos['urls'] !== undefined) {
		const userLangISO2 = window.vl_options['langue'].substr(0, 2);
		fragQuickSearch = 
		`<p>
			<a href="${(window.vl_dictNfos['urls'][userLangISO2] || window.vl_dictNfos['urls']['xx']).replace('~#:LV_INSERT:#~', encodeURIComponent(nswr.o))}" target="_blank" class="button is-${clr} is-inverted">
				<span>${window.vl_i18n['js_search']}</span>
				<span class="icon is-small">
					<i class="fa-solid fa-up-right-from-square"></i>
				</span>
			</a>
		</p>`;
	}

	// Show the end game hero in the DOM
	document.getElementById('ag-input').innerHTML =
	`<section class="hero is-small is-${clr}">
		<div class="hero-body">
			<div>
				<p class="title">${_state === 'w' ? window.vl_i18n['js_win'] : window.vl_i18n['js_abandon']}</p>
				<p class="subtitle">${window.vl_i18n['js_verbwas'].replace('%VERBID%', getWordID())} : &#171; <word><b>${nswr.o}</b></word> &#187;</p>
			</div>
			${fragQuickSearch ?? ''}
		</div>
	</section>`;
}

/**
* Determine if the player's last part matches the current word
*/
function checkLastFinish() {
	// Retrieve the latest potentially stored game information
	const lastFinished = JSON.parse(localStorage.getItem(`lf_${window.vl_dictName}`) || '{"day": -1, "type": "none"}');
	
	// If the infos are valid,
	if (lastFinished.type !== 'none'
	// and the stored game is the current one
	&& lastFinished.day === getDailyIntWithTimezone()) {
		// Load the tried words list
		window.vl_tried = JSON.parse(lastFinished['tried']);
		// Push the tried words in the HTML DOM
		for (wordUid in window.vl_tried) {
			const word = window.vl_verblist[wordUid];
			// Push each tried words in the already tried list
			window.vl_tried[wordUid] = true;
			// Insert each word in the HTML DOM
			insertWord(window.vl_verblist[window.vl_nswr].o, wordUid, false);
		}
		
		// If the last game has been Won or Abandoned
		if (lastFinished.type === 'w'
		|| lastFinished.type === 'a') {
			// Stop the game and show the picked word
			gameEnd(lastFinished.type, false);
			// Display the number of tries
			document.getElementById('nav-try').innerHTML = lastFinished.tries;
			// Display the timer
			document.getElementById('nav-tim').innerHTML = lastFinished.time;
		}
		// Game is still running
		else if (lastFinished.type === 'p') {
			// Load the number of tries
			window.vl_tryCount = parseInt(lastFinished['tries']);
			document.getElementById('nav-try').innerHTML = lastFinished['tries'];
			// Load the epoch time the game started
			window.vl_timeInit = lastFinished['time'];
		}
		
	}
}

/**
* Initialize the timer worker
*/
function initTime() {
	// If WebWorkers are implemented
	if (typeof(Worker) !== "undefined") {
		// Declare the Worker to be stringified. Yes, I know.
		function workerFunction() {
			// Each second
			setInterval(() => {
				// Send it to the content script
				self.postMessage('trigger');
			}, 1000);
		}

		// Create a blob from the function as a string
		const blob = new Blob([`(${workerFunction.toString()})()`], { type: 'application/javascript' });

		// Create a worker from the blob URL
		window.vl_worker = new Worker(URL.createObjectURL(blob));

		// When receiving the Worker message
		window.vl_worker.onmessage = function(e) {
			displayTime();
		};
	}
	// WebWorkers are not implemented
	else
		// Display the current time
		document.getElementById('nav-tim').innerHTML = (new Date().toLocaleTimeString());
}

/**
* Display timers
*/
function displayTime() {
	// Get the current epoch
	let currentEpoch = Math.floor(Date.now() / 1000);
	
	// The game timer has started
	if (window.vl_timeInit !== null
	// The game is running
	&& !window.vl_finished) {
		// Display the game timer
		document.getElementById('nav-tim').innerHTML = formatTime(Math.max(0, currentEpoch - window.vl_timeInit));
	}
	
	// If the dopdown menu is opened
	if (document.getElementById('menu').classList.contains('is-active') === true) {
		// Update the "Next verb" timer
		document.getElementById('timer-next').innerHTML = `${window.vl_i18n['js_next']} : ${formatTime(Math.floor(getNextVerbTime() / 1000))}`;
	}
}

/**
* Obfuscate a given string to an array of integers
* @param {string} _str - The given string to obfuscate
* @return {Object Array} The obfuscated string
*/
function obfus(_str) {
	return _str.split('').map(c => c.charCodeAt(0));
}
/**
* Deobfuscate a given array of integers to a string
* @param {Object Array} _arr - The given array to deobfuscate
* @return {string} The deobfuscated array
*/
function deobf(_arr) {
	return _arr.map(i => String.fromCharCode(i)).join('');
}

/**
* Format a given number of seconds to a HH:mm:SS string
* @param {integer} _sec - The given number of seconds
* @return {string} The formated time
*/
function formatTime(_sec) {
	let hours = Math.floor(_sec / 3600);
	let minutes = Math.floor((_sec % 3600) / 60);
	let secs = _sec % 60;

	// Add leading zeroes if needed
	hours = hours.toString().padStart(2, '0');
	minutes = minutes.toString().padStart(2, '0');
	secs = secs.toString().padStart(2, '0');
	
	return `${hours}:${minutes}:${secs}`;
}

/**
* Determine which day it is, independently of the timezone
* @return {integer} The current ID of the day
*/
function getCurrDate() {
	// Milliseconds in a day
	const msPerDay = 86400000; //24 * 60 * 60 * 1000;
	const currentDate = new Date();
	// Current time in milliseconds
	const localTime = currentDate.getTime();
	
	return [msPerDay, localTime];
}

/**
* Determine which day it is, independently of the timezone
* @return {integer} The current ID of the day
*/
function getDailyIntWithTimezone() {
	const [msPerDay, localTime] = getCurrDate();
	
	// Local days since epoch, independently of the time zone
	const localMidnight = parseInt(localTime / msPerDay);
	
	return localMidnight;
}

/**
* Determine when the next word will be available
* @return {integer} Number of milliseconds remaining
*/
function getNextVerbTime() {
	const [msPerDay, localTime] = getCurrDate();
	return Math.max(0, parseInt(msPerDay - (localTime % msPerDay)));
}

/**
* Css framework initialization
* @source https://bulma.io/documentation/components/modal/
*/
function initBulma() {
  // Functions to open and close a modal
  function openModal($el) {
		if ($el.id === 'mdl-options')
			// Load options
			// Useful when the user changed options but cliked on "cancel"
			optionsLoad();
		else if ($el.id === 'mdl-link')
			if (window.vl_dictName)
				// Fill the copy link text input with the url of the deck
				document.getElementById('inp-link').value = `${window.location.origin+window.location.pathname}?deck=${encodeURIComponent(window.vl_dictName)}`;
			else
				// Fill the copy link text input with the url of the current search
				document.getElementById('inp-link').value = `${window.location.origin+window.location.pathname}?search=${encodeURIComponent(document.getElementById('selector').value)}`;
	
    $el.classList.add('is-active');
  }

  function closeModal($el) {
		if (($el).id !== 'mdl-selector')
			$el.classList.remove('is-active');
  }

  function closeAllModals() {
    (document.querySelectorAll('.modal') || []).forEach(($modal) => {
      closeModal($modal);
    });
  }

  // Add a click event on buttons to open a specific modal
  (document.querySelectorAll('.js-modal-trigger') || []).forEach(($trigger) => {
    const modal = $trigger.dataset.target;
    const $target = document.getElementById(modal);

    $trigger.addEventListener('click', () => {
      openModal($target);
    });
  });

  // Add a click event on various child elements to close the parent modal
  (document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button') || []).forEach(($close) => {
    const $target = $close.closest('.modal');

    $close.addEventListener('click', () => {
      closeModal($target);
    });
  });

  // Add a keyboard event to close all modals
  document.addEventListener('keydown', (event) => {
    if(event.key === "Escape") {
      closeAllModals();
    }
  });
	
	initDropdown();
}

/**
* Initialize the dropdown behavior
*/
function initDropdown() {
	// Get all dropdowns on the page that aren't hoverable.
	const dropdowns = document.querySelectorAll('.dropdown:not(.is-hoverable)');

	if (dropdowns.length > 0) {
		// For each dropdown, add event handler to open on click.
		dropdowns.forEach(function(el) {
			el.addEventListener('click', function(e) {
				e.stopPropagation();
				el.classList.toggle('is-active');
				displayTime();
			});
		});

		// click outside
		document.addEventListener('click', function(e) {
			closeDropdowns();
		});
	}

	// ESC
	document.addEventListener('keydown', function (event) {
		let e = event || window.event;
		if (e.key === 'Esc' || e.key === 'Escape') {
			closeDropdowns();
		}
	});
	
	// Close
	function closeDropdowns() {
		dropdowns.forEach(function(el) {
			el.classList.remove('is-active');
		});
	}
}