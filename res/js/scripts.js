/**
* Initialize the DOM and game systems once the main document is loaded.
*/
window.addEventListener('load', function () {
	// Remove any text from the user input text (some browser cache it)
	document.getElementById('inp-usr').value = '';
	
	// Declare and initialize global vars
	window.vl_nswr = '';
	window.vl_finished = false;
	window.vl_tried = {};
	window.vl_tryCount = 0;
	window.vl_worker = null;
	window.vl_trying = false;
	window.vl_timeInit = null;
	window.vl_lastTry = null;
	window.vl_options = [];
	
	// Choose a word from the list
	pickWord();
	
	// Bind the "Abandon" button from the menu to its callback
	document.getElementById('plzstahp').addEventListener('click', function(e) {
		if (window.vl_finished !== true)
			document.getElementById('mdl-abandon').classList.add('is-active');
	});
	
	// Bind the "Abandon" button from the abandon modal to its callback
	document.getElementById('btn-abandon').addEventListener('click', function(e) {
		gameEnd(false);
	});
	
	// Bind the "Save" options button from the options modal to its callback
	document.getElementById('btn-options').addEventListener('click', function(e) {
		optionsSave();
	});

	// Bind the "Essayer" button to its callback
	document.getElementById('btn-try').addEventListener('click', function () {
		checkWord();
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

	// Bind the keyboard key pressing to its callback,
	// only the Enter key will be used
	document.addEventListener('keydown', function(e) {
		// If the user text input has focus
		if (document.getElementById('inp-usr') === document.activeElement) {
			// Get the key code
			const keynum = e.keyCode||e.which;
			
			// Enter key is pressed
			if (keynum == 13)
				// Start the word processing
				checkWord();
			// Up arrow is pressed
			else if (keynum == 38
			// A word has already been tried
			&& window.vl_lastTry !== null)
				// Set the last tried (successfully or not) word in the user text input
				document.getElementById('inp-usr').value = window.vl_lastTry;
			// Down arrow is pressed
			else if (keynum == 40)
				// Erase the value of the user text input
				document.getElementById('inp-usr').value = '';
		}
	});

	// Add function to reverse a string
	String.prototype.reverse = function (char) {
		var arrSlitted = this.split("");
		var arrReversed = arrSlitted.reverse();
		var arrJoined = arrReversed.join("");
		return arrJoined;
	};

	// Add function to convert any diacritical character to its equivalent without diacritical mark
	String.prototype.rmvDiacr = function (char) {
		return this.toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
	};

	// Erase the "Please wait loading" hero
	document.getElementById('loading').remove();
	// Set the inputs visibile
	document.getElementById('ag-input').style.display = 'flex';
	// Enable the button back
	document.getElementById('btn-try').removeAttribute('disabled');
	// Enable the text input back
	document.getElementById('inp-usr').removeAttribute('disabled');
	// Automatically focus the text input
	document.getElementById('inp-usr').focus();
	
	// Init css framework
	initBulma();
	
	// Start the time worker (i.e. the game elapsed timer and the "next word" timer)
	initTime();
	
	// Determine word (day) ID
	document.getElementById('day-id').innerHTML = `Mot n°${getWordID()}`;
	
	// Check if this word has already been done
	checkLastFinish();
	
	// Load stored user's options
	optionsLoad();
	
	// Show a welcome message if first visit
	welcomeMessage();
});

/**
* Display the word ID (based on the day ID) in the menu
*/
function getWordID() {
	return getDailyIntWithTimezone() - 20015;
}

/**
* Help modal opened as a welcome message
*/
function welcomeMessage() {
	if (localStorage.getItem('wm') !== 'true')
		setTimeout(() => {
			localStorage.setItem('wm', 'true');
			document.getElementById('menu').classList.add('is-active');
		}, 750);
}

/**
* Load options from stored data
*/
function optionsLoad() {
	if (localStorage.getItem('opt') !== null) {
		const opt = JSON.parse(localStorage.getItem('opt'));
		
		window.vl_options = opt;
		
		document.getElementById(`rad-indice-${opt['indice']}`).checked = true;
	}
	else {
		document.getElementById('rad-indice-2').checked = true;
		optionsSave();
	}
}

/**
* Save options to stored data
*/
function optionsSave() {
		const opt = JSON.parse(localStorage.getItem('opt') || '{}');
		
		opt['indice'] = parseInt(document.querySelector('*[name="rad-indice"]:checked').value);
		
		window.vl_options = opt;
		
		localStorage.setItem('opt', JSON.stringify(opt));
		
		applyWordAfterStyle();
}

/**
* Apply visibility to words::after corresponding to users options
*/
function applyWordAfterStyle() {
	// Apply the style to the word::after corresponding to the alphabetically closest words
	document.querySelectorAll('#ag-words-before .word:last-of-type, #ag-words-after .word:first-of-type').forEach(e => {
		e.classList.remove('show-after');
		if (window.vl_options['indice'] < 2)
			e.classList.add('show-after');
	});
	
	// Apply the style to the word::after corresponding to the alphabetically farest words
	document.querySelectorAll('#ag-words-before .word:not(:last-of-type), #ag-words-after .word:not(:first-of-type)').forEach(e => {
		e.classList.remove('show-after');
		if (window.vl_options['indice'] === 0)
			e.classList.add('show-after');
	});
}

/**
* Pick a seeded random word from a list. The seed is the time, independently of the current time zone.
* This allows the picked word to be the same regardless of user time zone.
* The dictionary has an n-ary tree shape, so the function randomly chooses a character and navigates under that branch.
*/
function pickWord() {
	// Added offset to seed, increased when going throw a new branch
	let iAdd = 0;
	// Final word when every characters have been picked
	let strWord = '';
	// Set the current branch of the n-ary tree to its root
	let currBranch = wordList;
	
	// Move deeper into the tree until the bottom has been reach
	do {
		// Pick a random number with the current day (independently of the time zone) as seed.
		// Pay attention, the rand lib uses included min and max.
		const iRand = getRandom(iAdd++).randomInteger(1, Object.keys(currBranch).length) - 1;
		
		// Get the character associated with the random picked number
		const cChar = Object.keys(currBranch)[iRand];
		
		// If no end of a word has been reached...
		// Note: In the tree, words end with an ACK character. This is useful to determine if the user tries an existing word.
		if (cChar.charCodeAt() !== 6)
			// ... append the picked character to the reste of the word.
			strWord += cChar.toLowerCase();
			
		// Move to the branch corresponding to the picked character
		currBranch = currBranch[cChar];
	} while (Object.keys(currBranch).length > 0);
	
	// Relatively hide the chosen word
	window.vl_nswr = obfus(strWord);
}

/**
* Get a random number.
* @param {number} _add - Offset to add to the seed (today's epoch) to randomize each visited branch of the dictionary
* @return {number} Who knows
*/
function getRandom(_add) {
	return (new Randomizer({ rng : 'MersenneTwister', seed : (getDailyIntWithTimezone() + _add)}));
}

/**
* Check if the given word exists in the dictionary, and if it is the picked one.
* @return {null}
*/
function checkWord() {
	// Get the HTML user text input
	const inputUser = document.getElementById('inp-usr');
	// Get the user given word
	const wordUserRaw = inputUser.value;
	// Store the tried word
	window.vl_lastTry = wordUserRaw;
	
	// If the word string is empty
	if (wordUserRaw.length === 0
	// or if the processing is already running
	|| !checkWord_Beg())
		// Stop the process
		return;

	// Convert the user word to lowercase (but keep diacritic, used to check if the word exists, and if it is equal to the the picked word)
	const wordUserLca = wordUserRaw.toLowerCase();
	// Convert the user word to non-diacritic string (used to determine if the picked word is alphabetically placed before or after)
	const wordUserLoc = wordUserRaw.rmvDiacr();
	
	/*
	** WORD ALREADY TRIED
	*/
	// The user already tried this word
	if (window.vl_tried[wordUserLca] !== undefined) {
		// If the "already tried" animation is not running
		if (window.vl_tried[wordUserLca].hnd === null
		// ... and the word is still exists in either the "before" or the "after" list...
		// Note: words overflowing the window are deleted.
		&& document.body.contains(window.vl_tried[wordUserLca].node)) {
			// Assign the "already tried" animation to this word in the DOM
			window.vl_tried[wordUserLca].node.classList.add('highlight');
			
			// Remove the "already tried" animation in 3 seconds
			window.vl_tried[wordUserLca].hnd = setTimeout(() => {
				// If the word is still exists in either the "before" or the "after" list
				if (document.body.contains(window.vl_tried[wordUserLca].node))
					// Remove the "already tried" animation
					window.vl_tried[wordUserLca].node.classList.remove('highlight');
					
				// Release the timeout handle
				window.vl_tried[wordUserLca].hnd = null;
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
	let branchCurr = wordList;
	let wordNotFound = false;
	
	// For each character of the given word
	[...wordUserLca].forEach(e => {
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
	|| branchCurr['\x06'] !== true) {
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
		if (strDeobf === wordUserLca)
			// End the game
			gameEnd(true);
		// The given word does not match the picked one
		else {
			// Remove any diacritic from the given word (necessary to compare words alphabetically)
			const ag_nswrLoc = strDeobf.rmvDiacr();
			// Does the given word is alphabetically placed before or after the picked one
			const givenIsBeforePicked = (wordUserLoc.localeCompare(ag_nswrLoc) < 0);
			// Get the corresponding tried words list in the DOM
			let wordListNode = document.getElementById((givenIsBeforePicked ? 'ag-words-before' : 'ag-words-after'));
			
			// Create a Html fragment for the given word
			let frag = document.createElement('div');
			frag.classList.add('word');
			frag.innerHTML = wordUserLca;
			// Color the given word depending on how many characters differ from the picked one
			/*
			const countDiffChar = wordUserLoc.length - ag_nswrLoc.length;
			if (countDiffChar == 0)
				frag.setAttribute('data-size', '\u229c');
			else if (countDiffChar < 0)
				frag.setAttribute('data-size', '\u229d');
			else
				frag.setAttribute('data-size', '\u2295');
			*/
			/*
			const countSameBeg = countDifference(wordUserLoc, ag_nswrLoc);
			if (countSameBeg !== 0) {
				const specialCharString = `\\u${(9311 + countDiffChar).toString(16)}`;
				const numericValue = parseInt(specialCharString.replace(/\\u|\\/g, ''), 16);
				const specialChar = String.fromCharCode(numericValue);
				frag.setAttribute('data-size', specialChar);
			}
			*/
			const countSameBeg = countEquality(wordUserLoc, ag_nswrLoc, false);
			const countSameEnd = countEquality(wordUserLoc, ag_nswrLoc, true);
			
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
					if (wordUserLoc.localeCompare(div.innerText.rmvDiacr()) <= 0) {
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
			window.vl_tried[wordUserLca] = {node: frag, hnd: null};
			
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
	let user = _user.rmvDiacr();
	let pick = _picked.rmvDiacr();
	let len = Math.max(user.length, pick.length);
	
	// Reverse strings in case the first difference to found is from the end
	if (_reverse) {
		user = user.reverse();
		pick = pick.reverse();
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
			"lastFinished",
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
	const strDeobf = deobf(window.vl_nswr);
	
	// Show the end game hero in the DOM
	document.getElementById('ag-input').innerHTML =
	`<section class="hero is-small is-${clr}">
		<div class="hero-body">
			<div>
				<p class="title">${_success ? 'Félicitation !' : 'Dommage...'}</p>
				<p class="subtitle">Le mot n°${getWordID()} était : &#171; <word><b>${strDeobf}</b></word> &#187;</p>
			</div>
			<p>
				<a href="https://fr.wiktionary.org/wiki/${encodeURIComponent(strDeobf)}" target="_blank" class="button is-${clr} is-inverted">
					<span>Définition</span>
					<span class="icon is-small">
						<i class="fa-solid fa-up-right-from-square"></i>
					</span>
				</a>
			</p>
		</div>
	</section>`;
}

/**
* Determine if the player's last part matches the current word
*/
function checkLastFinish() {
	// Retrieve the latest potentially stored game information
	const lastFinished = JSON.parse(localStorage.getItem("lastFinished") || '{"day": -1, "type": "none"}');
	
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
		document.getElementById('timer-next').innerHTML = `Prochain : ${formatTime(Math.floor(getNextVerbTime() / 1000))}`;
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
    $el.classList.add('is-active');
  }

  function closeModal($el) {
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