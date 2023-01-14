if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js').then(reg => {

		if(reg.installing) {
			console.log('Service worker installing');
		} else if(reg.waiting) {
			console.log('Service worker installed');
		} else if(reg.active) {
			console.log('Service worker active');
		}

	}).catch(error => {
		console.log('Registration failed with ' + error);
	});
}

const content = document.getElementById('content');
content.innerHTML =
`<div class="title">2048</div>
<div id="score">Score: 2048</div>
<div id="box"></div>
<div id="ui">
	<div id="undo-button" class="button-style">Undo</div>
	<div id="restart-button" class="button-style">Restart</div>
</div>`;

const colors = [
	{ bg: '#eee4da', fg: '#776e65' },
	{ bg: '#eee1c9', fg: '#776e65' },
	{ bg: '#f6803d' },
	{ bg: '#f3b27a' },
	{ bg: '#f69664' },
	{ bg: '#f77c5f' },
	{ bg: '#f75f3b' },
	{ bg: '#edd073' },
	{ bg: '#edcc62' },
	{ bg: '#edc950' },
	{ bg: '#edc53f' },
	{ bg: '#edc22e' },
	{ bg: '#3c3a33' },
];

const title = document.querySelector('.title');
const boxContainer = document.getElementById('box');
const scoreLabel = document.getElementById('score');
const restartButton = document.getElementById('restart-button');
const undoButton = document.getElementById('undo-button');

const genBoard = (val, size = 4) => {
	const res = [];
	for (let i = 0; i < size; i++)
		res.push(Array(size).fill(val));

	return res;
}

const swap = (a, b) => {
	a += b, b = a - b, a = a - b;
	return [ a, b ];
}

const random = (min, max) => Math.round(min + (max - min) * Math.random());
const delay = async time => new Promise(resolve => setTimeout(resolve, time));

/**
 * @type {HTMLElement[][]}
 */
let tiles = [];
let gameState = { boardSize: 4, score: 0, board: genBoard(''), moves: [], bestScore: 0 };
let currentMove = { score: 0, changes: [ { value: '2', add: { x: 1, y: 2 }, remove: { x: 1, y: 2 } } ] };

const getValue = (x, y, isSideways = false) => {
	if (isSideways)
		[ x, y ] = swap(x, y);

	return gameState.board[x][y];
}

/**
 * @param {object} data
 * @param {string?} data.value
 * @param {number} data.x
 * @param {number} data.y
 * @param {object} data.lastPosition
 * @param {number?} data.lastPosition.x
 * @param {number?} data.lastPosition.y
 * @param {boolean?} data.isSideways
 * @param {boolean?} data.doNotRecord
 * @param {boolean?} data.fastAnimate
 */
const setValue = (data) => {
	if (data.isSideways) {
		[ data.x, data.y ] = swap(data.x, data.y);
		if (data.lastPosition)
			[ data.lastPosition.x, data.lastPosition.y ] = swap(data.lastPosition.x, data.lastPosition.y);
	}

	if (!data.doNotRecord) {
		if (data.value && getValue(data.x, data.y) !== '')
			currentMove.changes.push({ value: getValue(data.x, data.y), add: { x: data.x, y: data.y } });

		if (!data.lastPosition)
			currentMove.changes.push({ remove: { x: data.x, y: data.y } });
		else
			currentMove.changes.push({ value: getValue(data.lastPosition.x, data.lastPosition.y), add: data.lastPosition, remove: { x: data.x, y: data.y } });
	}

	if (data.lastPosition)
		setValue({ x: data.lastPosition.x, y: data.lastPosition.y, doNotRecord: true });

	const tile = tiles[data.x][data.y];
	gameState.board[data.x][data.y] = data.value ?? '';
	if (!data.value)
		return tile.replaceChildren();

	const element = document.createElement('div');
	const palette = colors[Math.min(Math.log2(+data.value), colors.length) - 1];
	element.className = 'active-tile', element.innerHTML = data.value, element.style.backgroundColor = palette.bg;
	if (palette.fg)
		element.style.color = palette.fg;

	if (!data.lastPosition)
		element.classList.add(data.fastAnimate ? 'old-tile' : 'new-tile');

	tile.replaceChildren(element);

	if (data.lastPosition) {
		data.isSideways = (data.y - data.lastPosition.y) !== 0;
		const offset = -19 * (data.isSideways ? data.y - data.lastPosition.y : data.x - data.lastPosition.x);

		element.animate([
			{
				transform: `translate${data.isSideways ? 'X' : 'Y'}(${offset < 0 ? 'max' : 'min'}(${offset}vh, ${offset}vw))`,
			}, {
				transform: 'none',
			} 
		], { duration: 300, easing: 'ease', iterations: 1});
	}
}

const verifySpace = () => {
	let valid = false;
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			if (getValue(x, y) === '') {
				valid = true;
				break;
			}
		}
	}

	return valid;
}

const verifyMoves = () => {
	let valid = false;
	for (let side = 0; side < 2; side++) {
		for (let x = 0; x < 4; x++) {
			let lastTile = '';
			for (let y = 0; y < 4; y++) {
				let currentTile = getValue(x, y, side);
				if (currentTile !== '') {
					if (currentTile === lastTile) {
						valid = true;
						break;
					}
	
					lastTile = currentTile;
				}
			}
		}
	}

	return valid;
}

const spawnNumber = () => {
	let x = random(0, 3), y = random(0, 3);
	while (getValue(x, y, false) !== '')
		x = random(0, 3), y = random(0, 3);

	if (Math.random() < 0.7)
		setValue({ value: '2', x, y });
	else
		setValue({ value: '4', x, y });
}

// side = 1 - up, 2 - down, 3 - left, 4 - right
const moveToSide = (side) => {
	gameState.moves.push({
		score: gameState.score,
		changes: [],
	});

	currentMove = gameState.moves[gameState.moves.length - 1];
	const lockedIn = genBoard(false);
	let moved = false;

	let indexStart = 0, indexEnd = 3, direction = 1, isSideways = false;
	if (side >= 3)
		isSideways = true;

	if (side % 2 === 0)
		[ indexStart, indexEnd ] = swap(indexStart, indexEnd), direction = -1;

	for (let x = indexStart + 1 * direction; x !== indexEnd + 1 * direction; x += direction) {
		for (let y = 0; y < 4; y++) {
			if (lockedIn[x][y])
				continue;

			let currentValue = getValue(x, y, isSideways);
			if (currentValue !== '') {
				for (let i = x - 1 * direction; i !== indexStart - 1 * direction; i -= direction) {
					const value = getValue(i, y, isSideways);

					if (value === currentValue && !lockedIn[i][y]) {
						currentValue = `${+value * 2}`;
						gameState.score += +currentValue;

						moved = true;
						setValue({ value: currentValue, x: i, y, isSideways, lastPosition: { x, y } });

						lockedIn[i][y] = true;
						break;
					} else if (value !== '' || (i === indexStart && (i -= direction || true)) || lockedIn[i][y]) {
						if (x !== i + 1 * direction) {
							moved = true;
							setValue({ value: currentValue, x: i + 1 * direction, y, isSideways, lastPosition: { x, y } });
						}

						break;
					}
				}
			}
		}
	}

	if (moved) {
		if (verifySpace())
			spawnNumber();
		if (!verifySpace() && !verifyMoves())
			document.querySelector('.title').innerHTML = 'You lost!';

		if (gameState.moves.length > 25)
			gameState.moves.shift();
		if (gameState.bestScore < gameState.score)
			gameState.bestScore = gameState.score;

		scoreLabel.innerHTML = `Score: ${gameState.score} [best: ${gameState.bestScore}]`;

		localStorage.setItem('gameState', JSON.stringify(gameState));
	} else {
		gameState.moves.pop();
	}
}

const setupBoard = (newGame = true) => {
	boxContainer.innerHTML = '';
	title.innerHTML = '2048';
	scoreLabel.innerHTML = `Score: 0 [best: ${gameState.bestScore}]`;

	for (let i = 0; i < 16; i++)
		boxContainer.appendChild(document.createElement('div'));

	const children = [ ...boxContainer.children ];
	tiles = Array.from({ length: 4 }, (_, i) => children.slice(i * 4, (i * 4) + 4));

	if (newGame) {
		gameState.score = 0;
		gameState.moves = [];
		gameState.board = genBoard('');

		spawnNumber();
		spawnNumber();
		localStorage.setItem('gameState', JSON.stringify(gameState));
	}
}

const restoreState = () => {
	gameState = Object.assign(gameState, JSON.parse(localStorage.getItem('gameState')));

	scoreLabel.innerHTML = `Score: ${gameState.score} [best: ${gameState.bestScore}]`;

	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			if (gameState.board[x][y] !== '') {
				setValue({
					value: gameState.board[x][y],
					x, y,
					doNotRecord: true,
					fastAnimate: true,
				});
			}
		}
	}
}

const load = () => {
	if (!localStorage.getItem('gameState')) {
		localStorage.setItem('gameState', JSON.stringify(gameState));
		setupBoard();
	} else {
		setupBoard(false);
		restoreState();
	}

	const eventHandler = event => {
		switch(event?.detail?.dir ?? event.keyCode) {
		case 38:
		case 'up':
			moveToSide(1);
			break;
		case 40:
		case 'down':
			moveToSide(2);
			break;
		case 37:
		case 'left':
			moveToSide(3);
			break;
		case 39:
		case 'right':
			moveToSide(4);
			break;
		}
	}

	document.addEventListener('keydown', eventHandler);
	document.addEventListener('swiped', eventHandler);

	restartButton.onclick = setupBoard;
	undoButton.onclick = () => {
		if (gameState.moves.length) {
			currentMove = gameState.moves.pop();
			gameState.score = currentMove.score;
			scoreLabel.innerHTML = `Score: ${gameState.score} [best: ${gameState.bestScore}]`;
			currentMove.changes.reverse();

			for (const change of currentMove.changes) {
				if (change.remove)
					setValue({ x: change.remove.x, y: change.remove.y, doNotRecord: true });

				if (change.add) {
					setValue({
						value: change.value,
						x: change.add.x,
						y: change.add.y,
						lastPosition: change.remove,
						fastAnimate: true,
						doNotRecord: true,
					});
				}
			}
		}
	}
}

load();
