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
	{ bg: '#3c3a33' },
];

const title = document.querySelector('.title');
const boxContainer = document.getElementById('box');
const scoreLabel = document.getElementById('score');
const undoButton = document.getElementById('undo-button');
const restartButton = document.getElementById('restart-button');

/**
 * @type {HTMLElement[][]}
 */
let tiles = [];
let gameState = { boardSize: 4, score: 0, board: [['']], moves: [], bestScore: 0 };
let currentMove = { score: 0, changes: [ { value: '2', add: { x: 1, y: 2 }, remove: { x: 1, y: 2 } } ] };
let offsetConstant;

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
	element.className = 'active-tile', element.innerHTML = data.value, element.style.backgroundColor = palette.bg;
	if (palette.fg)
		element.style.color = palette.fg;

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
	boxContainer.style.gridTemplateRows = `repeat(${gameState.boardSize}, 1fr)`;
	boxContainer.style.gridTemplateColumns = `repeat(${gameState.boardSize}, 1fr)`;
	boxContainer.style.gap = '0px';
	title.innerHTML = '2048';
	scoreLabel.innerHTML = `Score: 0 [best: ${gameState.bestScore}]`;

	for (let i = 0; i < gameState.boardSize ** 2; i++)
		boxContainer.appendChild(document.createElement('div'));

	const children = [ ...boxContainer.children ];
	tiles = Array.from({ length: gameState.boardSize }, (_, i) => children.slice(i * gameState.boardSize, (i * gameState.boardSize) + gameState.boardSize));
	
	const elementPos = getElementPosition(tiles[0][0], true),
	      elementSize = elementPos.bottom - elementPos.top,
	      ratioW = elementSize / document.documentElement.clientWidth,
	      ratioH = elementSize / document.documentElement.clientHeight,
	      value = `${(0.013 * Math.max(ratioH, ratioW) / 0.1777) * 100}`;

	boxContainer.style.gap = `min(${value}vh, ${value}vw)`;

	const topPos = getElementPosition(tiles[0][0]),
	      offsetH = (getElementPosition(tiles[1][0]).top - topPos.top) / document.documentElement.clientHeight,
	      offsetW = (getElementPosition(tiles[0][1]).left - topPos.left) / document.documentElement.clientWidth;

	offsetConstant = Math.max(offsetH, offsetW) * 100;

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
