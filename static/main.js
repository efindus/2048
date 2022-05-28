const content = document.getElementById('content');
content.innerHTML =
`<div class="title">2048</div>
<div id="score">Score: 2048</div>
<div id="box"></div>
<div id="status-ui">
    <div id="undo-button" class="button-style">Undo</div>
    <div id="restart-button" class="button-style">Restart</div>
</div>`

const title = document.querySelector('.title');
const boxContainer = document.getElementById('box');
const scoreLabel = document.getElementById('score');
const restartButton = document.getElementById('restart-button');
const undoButton = document.getElementById('undo-button');
const moves = [];
let score = 0, currentMove = { score: 0, changes: [ { value: '2', add: { x: 1, y: 2 }, remove: { x: 1, y: 2 } } ] };

const swap = (a, b) => {
    a += b, b = a - b, a = a - b;
    return [ a, b ];
}

const getValue = (x, y, isSideways = false) => {
    if (isSideways) [ x, y ] = swap(x, y);

    const tile = document.getElementById(`tile-${x}-${y}`);
    return tile.innerText !== '' ? tile.children[0].innerText : '';
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
 */
const setValue = (data) => {
    if (data.isSideways) [ data.x, data.y ] = swap(data.x, data.y), data.lastPosition ? 
                         [ data.lastPosition.x, data.lastPosition.y ] = swap(data.lastPosition.x, data.lastPosition.y) : null;

    if (!data.doNotRecord) {
        if (data.value && getValue(data.x, data.y) !== '') currentMove.changes.push({ value: getValue(data.x, data.y), add: { x: data.x, y: data.y } });

        if (!data.lastPosition) currentMove.changes.push({ remove: { x: data.x, y: data.y } });
        else currentMove.changes.push({ value: getValue(data.lastPosition.x, data.lastPosition.y), add: data.lastPosition, remove: { x: data.x, y: data.y } });
    }

    if (data.lastPosition) setValue({ x: data.lastPosition.x, y: data.lastPosition.y, doNotRecord: true });

    const tile = document.getElementById(`tile-${data.x}-${data.y}`);
    tile.innerHTML = data.value ? `<div class="active-tile ${data.lastPosition ? '' : ' new-tile'}">${data.value}</div>` : '';

    if (data.lastPosition) {
        const block = tile.children[0], offset = -19 * (data.isSideways ? data.y - data.lastPosition.y : data.x - data.lastPosition.x);

        block.style.transform = `translate${data.isSideways ? 'X' : 'Y'}(${offset < 0 ? 'max' : 'min'}(${offset}vh, ${offset}vw))`;
        block.style.transition = 'transform 0.3s ease 0s';
        setTimeout(() => block.style.transform = 'none');
    }
}

const random = (min, max) => Math.round(min + (max - min) * Math.random());

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

    while(getValue(x, y, false) !== '') x = random(0, 3), y = random(0, 3);

    if (Math.random() < 0.7) setValue({ value: '2', x, y });
    else setValue({ value: '4', x, y });
}

const gen4X4Val = (val) => {
    const res = [];
    for (let i = 0; i < 4; i++) res.push([ val, val, val, val ]);
    return res;
}

// side = 1 - up, 2 - down, 3 - left, 4 - right
const moveToSide = (side) => {
    moves.push({
        score,
        changes: [],
    });

    currentMove = moves[moves.length - 1];
    const lockedIn = gen4X4Val(false);
    let moved = false;

    let indexStart = 0, indexEnd = 3, direction = 1, isSideways = false;
    if (side === 3 || side === 4) isSideways = true;
    if (side === 2 || side === 4) indexStart = 3, indexEnd = 0, direction = -1;

    for (let x = indexStart + 1 * direction; x !== indexEnd + 1 * direction; x += direction) {
        for (let y = 0; y < 4; y++) {
            if (lockedIn[x][y]) continue;

            let currentValue = getValue(x, y, isSideways);
            if (currentValue !== '') {
                for (let i = x - 1 * direction; i !== indexStart - 1 * direction; i -= direction) {
                    const value = getValue(i, y, isSideways);

                    if (value === currentValue && !lockedIn[i][y]) {
                        currentValue = `${+value * 2}`;
                        score += +currentValue;
                        scoreLabel.innerHTML = `Score: ${score}`;

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
        if (verifySpace()) spawnNumber();
        if (!verifySpace() && !verifyMoves()) document.querySelector('.title').innerHTML = 'You lost!';
    } else moves.pop();

    if (moves.length > 25) moves.shift();
}

const generateBoard = () => {
    score = 0;

    boxContainer.innerHTML = '';
    title.innerHTML = '2048';
    scoreLabel.innerHTML = 'Score: 0';

    for (let i = 0; i < 16; i++) {
        boxContainer.innerHTML += `<div id="tile-${Math.floor(i / 4)}-${i % 4}"></div>`;
    }

    spawnNumber();
    spawnNumber();
}

const load = () => {
    generateBoard();

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

    restartButton.onclick = generateBoard;
    undoButton.onclick = () => {
        if (moves.length) {
            currentMove = moves.pop();
            score = currentMove.score;
            scoreLabel.innerHTML = `Score: ${score}`;
            currentMove.changes.reverse();

            for (const change of currentMove.changes) {
                if (change.remove) setValue({ x: change.remove.x, y: change.remove.y, doNotRecord: true });
                if (change.add) {
                    setValue({
                        value: change.value,
                        x: change.add.x,
                        y: change.add.y,
                        lastPosition: change.remove,
                        doNotRecord: true,
                    });
                }
            }
        }
    }
}

load();
