if ('serviceWorker' in navigator)
	navigator.serviceWorker.register('/sw.js');

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
	{ bg: 'linear-gradient(45deg, rgb(131, 58, 180) 0%, rgb(253, 29, 29) 50%, rgb(252, 176, 69) 100%)' },
	{ bg: 'linear-gradient(135deg, rgb(225, 52, 84) 0%, rgb(255, 144, 56) 20%, rgb(254, 223, 67) 40%, rgb(133, 232, 140) 60%, rgb(25, 133, 185) 80%, rgb(133, 72, 180) 100%)', ts: '0px 0px 18px black' },
	{ bg: 'linear-gradient(45deg, rgb(2, 0, 36) 0%, rgb(23, 23, 173) 33%, rgb(3, 142, 209) 67%, rgb(0, 212, 255) 100%)' },
	{ bg: '#3c3a33' },
];

const title = document.querySelector('.title');
const boxContainer = document.getElementById('box');
const scoreLabel = document.getElementById('score');
const undoButton = document.getElementById('undo-button');

const menu = document.getElementById('menu');
const settingsToggle = document.getElementById('settings-toggle');
const settingsClose = document.getElementById('settings-close');
const restartButton = document.getElementById('restart-button');
const toggleUndoButton = document.getElementById('toggle-undo-button');
const boardSizeUpButton = document.getElementById('board-size-up-button');
const boardSizeDownButton = document.getElementById('board-size-down-button');

/**
 * @type {HTMLElement[][]}
 */
let tiles = [];
let gameState = { boardSize: 4, score: 0, board: [['']], moves: [], bestScore: 0, disabledUndo: false, gameStarted: false };
let currentMove = { score: 0, changes: [ { value: '2', add: { x: 1, y: 2 }, remove: { x: 1, y: 2 } } ] };
let offsetConstant, settingsOpen = false;

const swap = (a, b) => {
	a += b, b = a - b, a = a - b;
	return [ a, b ];
}

const random = (min, max) => Math.round(min + (max - min) * Math.random());
const delay = async time => new Promise(resolve => setTimeout(resolve, time));

const genBoard = (val) => {
	const res = [];
	for (let i = 0; i < gameState.boardSize; i++)
		res.push(Array(gameState.boardSize).fill(val));

	return res;
}

const getElementPosition = (element, noOffset = false) => {
	const rect = element.getBoundingClientRect();
	const win = element.ownerDocument.defaultView;

	let bottom = rect.bottom + win.pageYOffset, right = rect.right + win.pageXOffset;
	if (!noOffset)
		bottom = document.documentElement.clientHeight - bottom, right = document.documentElement.clientWidth - right;

	return {
		top: rect.top + win.pageYOffset,
		left: rect.left + win.pageXOffset,
		bottom,
		right,
	};
}

const toggleSettings = (forceClose = false) => {
	if (forceClose)
		settingsOpen = false;
	else
		settingsOpen = !settingsOpen;

	if (settingsOpen)
		menu.style.display = 'flex', settingsClose.style.display = 'block';
	else
		menu.style.display = 'none', settingsClose.style.display = 'none';
}

// side = 1 - up, 2 - down, 3 - left, 4 - right
const translateCoordinates = (x, y, side) => {
	if (side % 2 === 0)
		x = (gameState.boardSize - 1) - x;

	if (side >= 3)
		[ x, y ] = swap(x, y);

	return [ x, y ];
}

const getValue = (x, y, side = 1) => {
	[ x, y ] = translateCoordinates(x, y, side);

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
 * @param {number?} data.side
 * @param {boolean?} data.doNotRecord
 * @param {boolean?} data.fastAnimate
 */
const setValue = (data) => {
	if (data.side) {
		[ data.x, data.y ] = translateCoordinates(data.x, data.y, data.side);
		if (data.lastPosition)
			[ data.lastPosition.x, data.lastPosition.y ] = translateCoordinates(data.lastPosition.x, data.lastPosition.y, data.side);
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
	element.className = 'active-tile', element.innerHTML = data.value, element.style.background = palette.bg;
	if (palette.fg)
		element.style.color = palette.fg;

	if (palette.ts)
		element.style.textShadow = palette.ts;

	if (!data.lastPosition)
		element.classList.add(data.fastAnimate ? 'old-tile' : 'new-tile');

	tile.replaceChildren(element);

	if (data.lastPosition) {
		const isSideways = (data.y - data.lastPosition.y) !== 0;
		const offset = -offsetConstant * (isSideways ? data.y - data.lastPosition.y : data.x - data.lastPosition.x);

		element.animate([
			{
				transform: `translate${isSideways ? 'X' : 'Y'}(${offset < 0 ? 'max' : 'min'}(${offset}vh, ${offset}vw))`,
			}, {
				transform: 'none',
			} 
		], { duration: 300, easing: 'ease', iterations: 1});
	}
}

const verifySpace = () => {
	let valid = false;
	for (let x = 0; x < gameState.boardSize; x++) {
		for (let y = 0; y < gameState.boardSize; y++) {
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
		for (let x = 0; x < gameState.boardSize; x++) {
			let lastTile = '';
			for (let y = 0; y < gameState.boardSize; y++) {
				const currentTile = getValue(x, y, (side * 2) + 1);

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
	let x, y;
	do {
		x = random(0, gameState.boardSize - 1), y = random(0, gameState.boardSize - 1);
	} while (getValue(x, y) !== '');

	if (Math.random() < 0.7)
		setValue({ value: '2', x, y });
	else
		setValue({ value: '4', x, y });
}

// side = 1 - up, 2 - down, 3 - left, 4 - right
const moveToSide = (side) => {
	toggleSettings(true);
	gameState.gameStarted = true;
	gameState.moves.push({
		score: gameState.score,
		changes: [],
	});

	currentMove = gameState.moves[gameState.moves.length - 1];
	const lockedIn = genBoard(false);
	let moved = false;

	for (let x = 1; x < gameState.boardSize; x++) {
		for (let y = 0; y < gameState.boardSize; y++) {
			if (lockedIn[x][y])
				continue;

			let currentValue = getValue(x, y, side);
			if (currentValue !== '') {
				for (let i = x - 1; i >= 0; i--) {
					const value = getValue(i, y, side);

					if (value === currentValue && !lockedIn[i][y]) {
						currentValue = `${+value * 2}`;
						gameState.score += +currentValue;

						setValue({ value: currentValue, x: i, y: y, lastPosition: { x, y }, side });

						moved = true, lockedIn[i][y] = true;
						break;
					} else if (value !== '' || (i === 0 && (i-- || true)) || lockedIn[i][y]) {
						if (i !== x - 1) {
							moved = true;
							setValue({ value: currentValue, x: i + 1, y: y, lastPosition: { x, y }, side });
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

		if (gameState.disabledUndo)
			gameState.moves.pop();
		else if (gameState.moves.length > 25)
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
	toggleSettings(true);
	boxContainer.innerHTML = '';
	boxContainer.style.gridTemplateRows = `repeat(${gameState.boardSize}, 1fr)`;
	boxContainer.style.gridTemplateColumns = `repeat(${gameState.boardSize}, 1fr)`;
	boxContainer.style.gap = '0px';
	title.innerHTML = '2048';

	for (let i = 0; i < gameState.boardSize ** 2; i++)
		boxContainer.appendChild(document.createElement('div'));

	const children = [ ...boxContainer.children ];
	tiles = Array.from({ length: gameState.boardSize }, (_, i) => children.slice(i * gameState.boardSize, (i * gameState.boardSize) + gameState.boardSize));
	
	const scaleConstant = 0.1777,
	      elementPos = getElementPosition(tiles[0][0], true),
	      elementSize = elementPos.bottom - elementPos.top,
	      offsetH = (getElementPosition(tiles[1][0]).top - elementPos.top) / document.documentElement.clientHeight,
	      offsetW = (getElementPosition(tiles[0][1]).left - elementPos.left) / document.documentElement.clientWidth,
	      ratio = Math.max(elementSize / document.documentElement.clientWidth, elementSize / document.documentElement.clientHeight),
	      value = `${(0.013 * ratio / scaleConstant) * 100}`,
	      fontValue = `${(0.05 * ratio / scaleConstant) * 100}`;

	boxContainer.style.gap = `min(${value}vh, ${value}vw)`;
	boxContainer.style.setProperty('--font-size-formula', `min(${fontValue}vh, ${fontValue}vw)`);
	offsetConstant = Math.max(offsetH, offsetW) * 100;

	if (newGame) {
		gameState.score = 0;
		gameState.moves = [];
		gameState.board = genBoard('');
		gameState.gameStarted = false;
		gameState.disabledUndo = gameState.disabledUndo ?? false;

		spawnNumber();
		spawnNumber();
		localStorage.setItem('gameState', JSON.stringify(gameState));
	}

	scoreLabel.innerHTML = `Score: ${gameState.score} [best: ${gameState.bestScore}]`;
}

const restoreState = () => {
	gameState = Object.assign(gameState, JSON.parse(localStorage.getItem('gameState')));
	setupBoard(false);

	for (let x = 0; x < gameState.boardSize; x++) {
		for (let y = 0; y < gameState.boardSize; y++) {
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
	if (!localStorage.getItem('gameState'))
		setupBoard();
	else
		restoreState();

	if (gameState.disabledUndo)
		undoButton.style.display = 'none';

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

	const changeBoardSize = (diff) => {
		if (!gameState.gameStarted) {
			if (gameState.boardSize + diff < 2 || 9 < gameState.boardSize + diff) {
				alert('You cannot set this size!');
			} else {
				gameState.boardSize += diff;
				setupBoard();
			}
		} else {
			alert('You cannot change the board size while in game! Restart the game to change it.');
		}
	}

	restartButton.onclick = setupBoard;
	menu.onclick = (e) => e.stopPropagation();
	settingsToggle.onclick = () => toggleSettings();
	settingsClose.onclick = () => toggleSettings(true);
	boardSizeUpButton.onclick = () => changeBoardSize(1);
	boardSizeDownButton.onclick = () => changeBoardSize(-1);
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

	toggleUndoButton.onclick = () => {
		toggleSettings(true);
		if (!gameState.gameStarted) {
			gameState.disabledUndo = !gameState.disabledUndo;
			if (gameState.disabledUndo) {
				undoButton.style.display = 'none';
				alert('Keep in mind that you cannot enable undo later!');
			} else {
				undoButton.style.display = 'flex';
			}
		} else {
			alert('You cannot toggle undo while in game! Restart the game to change it.');
		}
	}
}

load();
