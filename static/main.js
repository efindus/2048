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
let score = 0;

const getValue = (x, y, isSideways) => {
    if (isSideways) x += y, y = x - y, x = x - y;

    return document.getElementById(`tile-${x}-${y}`).innerText;
}

const setValue = (val, x, y, isSideways) => {
    if (isSideways) x += y, y = x - y, x = x - y;

    document.getElementById(`tile-${x}-${y}`).innerHTML = val;
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

    while(getValue(x, y) !== '') x = random(0, 3), y = random(0, 3);

    if (Math.random() < 0.7) setValue('2', x, y);
    else setValue('4', x, y);
}

const gen4X4Val = (val) => {
    const res = [];
    for (let i = 0; i < 4; i++) res.push([ val, val, val, val ]);
    return res;
}

// side = 1 - up, 2 - down, 3 - left, 4 - right
const moveToSide = (side) => {
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
                        setValue('', x, y, isSideways);
                        setValue(currentValue, i, y, isSideways);

                        lockedIn[i][y] = true;
                        break;
                    } else if (x !== i + 1 * direction && (value !== '' || (i === indexStart && (i -= direction || true)) || lockedIn[i][y])) {
                        moved = true;
                        setValue('', x, y, isSideways);
                        setValue(currentValue, i + 1 * direction, y, isSideways);
                        break;
                    }
                }
            }
        }
    }

    if (moved) {
        if (verifySpace()) spawnNumber();
        if (!verifySpace() && !verifyMoves()) document.querySelector('.title').innerHTML = 'You lost!';
    }
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
}

load();
