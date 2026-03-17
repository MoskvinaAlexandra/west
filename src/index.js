import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

function isDuck(card) {
    return card && card.quacks && card.swims;
}

function isDog(card) {
    return card instanceof Dog;
}

class Creature extends Card {
    constructor(name, maxPower, image) {
        super(name, maxPower, image);
    }

    getDescriptions() {
        const creatureDesc = getCreatureDescription(this);
        const baseDescriptions = super.getDescriptions();
        return [creatureDesc, ...baseDescriptions];
    }
}

function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Duck extends Creature {
    constructor(name = 'Мирная утка', power = 2) {
        super(name, power);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', power = 3) {
        super(name, power);
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation);
        });
    }

    getDescriptions() {
        return [
            'Получает на 1 меньше урона',
            ...super.getDescriptions()
        ];
    }
}

class Gatling extends Creature {
    constructor() {
        super('Гатлинг', 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const {oppositePlayer} = gameContext;

        taskQueue.push(onDone => this.view.showAttack(onDone));

        taskQueue.push(onDone => {
            const oppositeCards = oppositePlayer.table;
            const subTaskQueue = new TaskQueue();

            oppositeCards.forEach(oppositeCard => {
                if (oppositeCard) {
                    subTaskQueue.push(onNextCardDone => {
                        this.dealDamageToCreature(2, oppositeCard, gameContext, onNextCardDone);
                    });
                }
            });

            subTaskQueue.continueWith(onDone);
        });

        taskQueue.continueWith(continuation);
    }
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Gatling(),
];

const banditStartDeck = [
    new Trasher(),
    new Dog(),
    new Dog(),
];

const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});