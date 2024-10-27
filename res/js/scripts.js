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
	progressBar(10);
	
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
	window.vl_dictName = '';
	window.vl_alphabetProcessing = false;
	
	// Remove any text from the user input text (some browser cache it)
	document.getElementById('inp-usr').value = '';
	
	// Uncheck any checked by the cache of the browser
	const arrLettersChecked = document.querySelectorAll('input[type="checkbox"][name="cb_alphabet"]:checked');
	arrLettersChecked.forEach(e => {
		e.checked = false;
	});
	
	progressBar(20);
	
	// Bind listeners to their callbacks (part 1)
	bindFuncs_pt1();
	
	progressBar(30);
	
	// Load stored user's options
	optionsLoad();
	
	progressBar(40);
	
	// Retrieve the ui localization
	await fetchWithProgress(`res/json/loca/${window.vl_options['langue']}.json`, i18n_ui, [40, 60]);
	
	progressBar(60);
	
	// Init css framework
	initBulma();
	
	progressBar(70);
	
	// Start the time worker (i.e. the game elapsed timer and the "next word" timer)
	initTime();
	
	progressBar(80);
	
	// Show the dictionnary selector modal
	dictSelect_init();
}

/**
* Initialize the dictionary selector
*/
async function dictSelect_init() {
	// Retrieve the list of dictionaries
	await fetchWithProgress('res/json/index.json', dictSelect_show, [80, 100]);
	
	// Load the list of dictionaries
	var api = function(inputValue) {
		return new Promise(function(resolve) {
			document.getElementById('selector').classList.remove('is-danger');
			document.getElementById('inp-set-dsc').style.visibility = 'hidden';
			resolve(window.vl_listSelection);
		}).then(function(Elems) {
			return Elems.filter(function(elem) {
				const filteredElems = elem.name.filter(elem => 
					elem.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
				);
				return filteredElems.length > 0
			})
		}).then(function(filtered) {
			return filtered.map(function(elem) {
				return {label: elem.name.filter(elem => 
					elem.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
				)[0], value: JSON.stringify(elem)}
			})
		}).then(function(transformed) {
			return transformed.slice(0, 15)
		})
	};

	var onSelect = function(elem) {
		const data = JSON.parse(elem.value);
		
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
		
		// Forging html the frag
		let frag = `
			<div class="control">
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
			</div>`;
		
		// If a note exists in the current language, or by default in global english
		const note = data[window.vl_options['langue']] || data['en-US'];
		// Append the note to the html fragment
		if (note)
			frag +=
			`<div class="control">
				<div class="tags has-addons are-medium">
					<span class="tag is-link">${note}</span>
				</div>
			</div>`;
			
		// Populate the description div with the html fragment
		document.getElementById("selector-infos").innerHTML = frag;
	};
	
	// Init the selector text input
	await bulmahead('selector', 'selector-menu', api, onSelect, 0, 0);
}

/**
* Initialize the dictionary selector
* @param {blob} _blob - The data retrieved
*/
async function dictSelect_show(_blob) {
	document.getElementById('run-set').removeAttribute('disabled');
	document.getElementById('selector').removeAttribute('disabled');
	
	window.vl_listSelection = JSON.parse(JSON.parse(JSON.stringify(await _blob.text())));
	
	// If the dict is given, populate the dict selector, then empty it (cache)
	const dictName = (new URLSearchParams(window.location.search)).get('set');
	if (dictName !== null
	&& dictName !== '') {		
		const arrFound = window.vl_listSelection.filter(function(elem) {
			return elem.dict === dictName;
		});
		
		if (arrFound.length > 0)
			document.getElementById('selector').value = arrFound[0].name[0];
		
		loadDict();
	}
	else
		document.getElementById('selector').value = '';
	
	progressBar(false);
	
	// Show the selector modal
	document.getElementById('selector-container').style.display = 'flex';
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
			_onFinished(blob);
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
	const userChoice = document.getElementById('selector').value;
	// Check if this name exists in the index.json
	const arrFound = window.vl_listSelection.filter(function(dict) {
		return dict.name.filter(function(elem) {
			return elem === userChoice
		}).length > 0
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
	
	// Set the set title to the nav
	document.getElementById('set-title').innerHTML = userChoice;
	
	// Fill the copy link text input with the set url
	document.getElementById('inp-link').value = `${window.location.origin+window.location.pathname}?set=${arrFound[0].dict}`;
	// And make its modal trigger button visible
	document.querySelector('button[data-target="mdl-link"]').style.display = 'flex';
	
	// Hide the selector modal
	document.getElementById('selector-container').style.display = 'none';
	
	// Show the progress bar
	progressBar(0);
	progressBar(true);
	
	// Retrieve the dict
	await fetchWithProgress(`res/json/dict/${arrFound[0].dict}.json`, retrieveDict, [0, 100]);
}

/**
* Show the UI after loading the dictionary
*/
function loadDict_end() {
	// Show the menu button and the alphabet
	document.getElementsByTagName('nav')[0].style.visibility = 'visible';
	document.getElementsByClassName('alphabet')[0].style.visibility = 'visible';
	
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
	});
	
	// Bind the "Abandon" button from the abandon modal to its callback
	document.getElementById('btn-abandon').addEventListener('click', function(e) {
		gameEnd(false);
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
		return this.toLowerCase().normalize("NFKC");
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
	window.vl_i18n = JSON.parse(JSON.parse(JSON.stringify(await _blob.text())));
	
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
	window.vl_verblist = await JSON.parse(JSON.parse(JSON.stringify(await _blob.text())));
	
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
		
		// clues
		document.getElementById(`rad-ranking-${opt['ranking']}`).checked = true;
		
		// Language
		document.querySelector(`.rad-lng input[type="radio"][value="${opt['langue']}"]`).checked = true;
	}
	else {
		// Clues
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
		
		// Clues
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
	// Final word when every characters have been picked
	let strWord = '';
	// Set the current branch of the n-ary tree to its root
	let currBranch = window.vl_verblist;
	// Added offset to seed, increased when going throw a new branch
	let iAdd = Object.keys(currBranch).length * 5;
	// 
	let bRun = true;
	
	// Move deeper into the tree until the bottom has been reach
	while(bRun) {
		// Pick a random number with the current day (independently of the time zone) as seed.
		// Pay attention, the rand lib uses included min and max.
		const iRand = getRandom(iAdd).randomInteger(1, Object.keys(currBranch).length) - 1;
		iAdd += Object.keys(currBranch).length * 3;
		
		// Get the character associated with the random picked number
		const cChar = Object.keys(currBranch)[iRand];
		
		// If no end of a word has been reached...
		// Note: In the tree, words end with an ACK character. This is useful to determine if the user tries an existing word.
		if (cChar.charCodeAt() !== 6) {
			// ... append the picked character to the reste of the word.
			strWord += cChar.toLowerCase();
			
			// Move to the branch corresponding to the picked character
			currBranch = currBranch[cChar];
		}
		else {
			const clue = currBranch[cChar];
			if (clue !== true) {
				if (clue.indexOf('data:image/jpeg;base64,/') === 0)
					document.getElementById('clue-content').innerHTML = `<img src="${clue}" />`;
				else if (clue.indexOf('data:audio/mpeg;base64,/') === 0)
					document.getElementById('clue-content').innerHTML = `<audio controls="controls" autobuffer="autobuffer"><source src="${clue}" /></audio>`;
				else
					document.getElementById('clue-content').innerHTML = `<p>${clue}</p>`;
			
				document.getElementById('plzclue').removeAttribute('disabled');
			}
			
			bRun = false;
		}
	};
	
	// Relatively hide the chosen word
	window.vl_nswr = obfus(strWord);
}

/**
* Get a random number.
* @param {number} _add - Offset to add to the seed (today's epoch) to randomize each visited branch of the dictionary
* @return {number} Who knows
*/
function getRandom(_add) {
	return (new Randomizer({ rng : 'MersenneTwister', seed : ((getDailyIntWithTimezone() + 7891235) + _add)}));
}

/**
* Check if the given word exists in the dictionary, and if it is the picked one.
* @return {null}
*/
function checkWord() {
	// Get the HTML user text input
	const inputUser = document.getElementById('inp-usr');
	// Get the user given word
	// Convert the user word to lowercase (but keep diacritic, used to check if the word exists, and if it is equal to the the picked word)
	// Convert the user word to non-diacritic string (used to determine if the picked word is alphabetically placed before or after)
	const wordUser = inputUser.value.vl_normalize();
	// Store the tried word
	window.vl_lastTry = wordUser;
	
	// If the word string is empty
	if (wordUser.length === 0
	// or if the processing is already running
	|| !checkWord_Beg())
		// Stop the process
		return;
	
	/*
	** WORD ALREADY TRIED
	*/
	// The user already tried this word
	if (window.vl_tried[wordUser] !== undefined) {
		// If the "already tried" animation is not running
		if (window.vl_tried[wordUser].hnd === null
		// ... and the word is still exists in either the "before" or the "after" list...
		// Note: words overflowing the window are deleted.
		&& document.body.contains(window.vl_tried[wordUser].node)) {
			// Assign the "already tried" animation to this word in the DOM
			window.vl_tried[wordUser].node.classList.add('highlight');
			
			// Remove the "already tried" animation in 3 seconds
			window.vl_tried[wordUser].hnd = setTimeout(() => {
				// If the word is still exists in either the "before" or the "after" list
				if (document.body.contains(window.vl_tried[wordUser].node))
					// Remove the "already tried" animation
					window.vl_tried[wordUser].node.classList.remove('highlight');
					
				// Release the timeout handle
				window.vl_tried[wordUser].hnd = null;
			}, 3000);
		}
		
		// Flush the user input text
		inputUser.value = '';
		// Revert the "Essayer" button, and update the word processing status
		checkWord_End();
		
		return;
	}
	
	/*
	** DOES THE WORD EXIST?
	*/
	// Set the current branch of the tree to its root
	let branchCurr = window.vl_verblist;
	let wordNotFound = false;
	
	// For each character of the given word
	[...wordUser].forEach(e => {
		// From the current character, a word exists with the next given character
		if (branchCurr[e] !== undefined)
			// Enter the branch corresponding to the given character
			branchCurr = branchCurr[e];
		// The next given character does not match any known word
		else {
			// Remember the word does not exist
			wordNotFound = true;
			// Do not process remaining characters
			return;
		}
	});
	
	// The word does not match any known word
	if (wordNotFound === true
	// or the user gave an unfinished word
	|| branchCurr['\x06'] === undefined) {
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
		
		// Increment the number of tries
		document.getElementById('nav-try').innerHTML = (++window.vl_tryCount).toString();
		
		// Flush the user input text
		inputUser.value = '';
	
		// Deobfuscate the picked word
		const strDeobf = deobf(window.vl_nswr);
		// The word given matches the picked one
		if (strDeobf === wordUser)
			// End the game
			gameEnd(true);
		// The given word does not match the picked one
		else {
			// Remove any diacritic from the given word (necessary to compare words alphabetically)
			const ag_nswrLoc = strDeobf.vl_normalize();
			// Does the given word is alphabetically placed before or after the picked one
			const givenIsBeforePicked = (wordUser.vl_compare(ag_nswrLoc) < 0);
			// Get the corresponding tried words list in the DOM
			let wordListNode = document.getElementById((givenIsBeforePicked ? 'ag-words-before' : 'ag-words-after'));
			
			// Create a Html fragment for the given word
			let frag = document.createElement('div');
			frag.classList.add('word');
			frag.innerHTML = wordUser;
			// Add the clue according to the number of identical letters at the beginning and end
			const countSameBeg = countEquality(wordUser, ag_nswrLoc, false);
			const countSameEnd = countEquality(wordUser, ag_nswrLoc, true);
			
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
					if (wordUser.vl_compare(div.innerText.vl_normalize()) <= 0) {
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
			
			// Store information that this given word has been tried
			window.vl_tried[wordUser] = {node: frag, hnd: null};
			
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
	}
	
	// Revert the "Essayer" button, and update the word processing status
	checkWord_End();
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
* End game processing
* @param {bool} _success - Does the user won
* @param {bool} _save - Does the results needs to be saved in the local storage (it depends on if this function is called when the user win/abandon, or when the game loads the last game infos)
*/
function gameEnd(_success, _save = true) {
	// Save the result
	if (_save === true)
		localStorage.setItem(
			`lf_${window.vl_dictName}`,
			JSON.stringify({
				day: getDailyIntWithTimezone(),
				type: _success,
				tries: window.vl_tryCount.toString(),
				time: document.getElementById('nav-tim').innerText
			})
		);
	
	// Forbid any word/game processing
	window.vl_finished = true;
	// Block the abandon button
	document.getElementById('plzstahp').classList.remove('has-text-danger');
	document.getElementById('plzstahp').classList.add('has-text-danger-dark');
	
	// Determine the hero color
	const clr = _success ? 'success' : 'danger';
	// Deobfuscate the picked word
	const strDeobf = deobf(window.vl_nswr).vl_capitalize();
	
	// Show the end game hero in the DOM
	document.getElementById('ag-input').innerHTML =
	`<section class="hero is-small is-${clr}">
		<div class="hero-body">
			<div>
				<p class="title">${_success ? window.vl_i18n['js_win'] : window.vl_i18n['js_abandon']}</p>
				<p class="subtitle">${window.vl_i18n['js_verbwas'].replace('%VERBID%', getWordID())} : &#171; <word><b>${strDeobf}</b></word> &#187;</p>
			</div>
			<!--
			<p>
				<a href="${window.vl_i18n['js_urldef'].replace('%', encodeURIComponent(strDeobf))}" target="_blank" class="button is-${clr} is-inverted">
					<span>${window.vl_i18n['js_search']}</span>
					<span class="icon is-small">
						<i class="fa-solid fa-up-right-from-square"></i>
					</span>
				</a>
			</p>
			-->
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
		// Stop the game and show the picked word
		gameEnd(lastFinished.type, false);
		// Display the number of tries
		document.getElementById('nav-try').innerHTML = lastFinished.tries;
		// Display the timer
		document.getElementById('nav-tim').innerHTML = lastFinished.time;
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
			optionsLoad();
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