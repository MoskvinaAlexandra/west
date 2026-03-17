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
    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        this._currentPower = Math.min(value, this.maxPower);
    }

    getDescriptions() {
        return [
            getCreatureDescription(this),
            ...super.getDescriptions()
        ];
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

class Brewer extends Duck {
    constructor() {
        super('Пивовар', 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const {currentPlayer, oppositePlayer} = gameContext;
        const allCards = currentPlayer.table.concat(oppositePlayer.table);

        allCards.forEach(card => {
            if (isDuck(card)) {
                card.maxPower += 1;
                card.currentPower += 2;
                card.view.signalHeal(() => {
                    card.updateView();
                });
            }
        });

        continuation();
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

class Lad extends Dog {
    constructor() {
        super('Браток', 2);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        const currentCount = Lad.getInGameCount();
        Lad.setInGameCount(currentCount + 1);
        console.log(`Братков в игре: ${Lad.getInGameCount()}, бонус: ${Lad.getBonus()}`);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        const currentCount = Lad.getInGameCount();
        Lad.setInGameCount(Math.max(0, currentCount - 1));

        console.log(`Братков в игре: ${Lad.getInGameCount()}, бонус: ${Lad.getBonus()}`);
        super.doBeforeRemoving(continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            const bonus = Lad.getBonus();
            const newValue = value + bonus;
            console.log(`${this.name} наносит урон ${newValue} (${value} + ${bonus} бонус)`);
            super.modifyDealedDamageToCreature(newValue, toCard, gameContext, continuation);
        });
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            const bonus = Lad.getBonus();
            const newValue = Math.max(0, value - bonus);
            console.log(`${this.name} получает урон ${newValue} (${value} - ${bonus} защита)`);
            super.modifyTakenDamage(newValue, fromCard, gameContext, continuation);
        });
    }

    getDescriptions() {
        const descriptions = super.getDescriptions();

        const hasDealDamageOverride = Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature');
        const hasTakenDamageOverride = Lad.prototype.hasOwnProperty('modifyTakenDamage');

        if (hasDealDamageOverride || hasTakenDamageOverride) {
            return [
                'Чем их больше, тем они сильнее',
                ...descriptions
            ];
        }

        return descriptions;
    }
}

class Rogue extends Creature {
    constructor() {
        super('Изгой', 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const {oppositePlayer, position, updateView} = gameContext;
        const target = oppositePlayer.table[position];

        if (target) {
            const targetProto = Object.getPrototypeOf(target);
            const abilitiesToSteal = [
                'modifyDealedDamageToCreature',
                'modifyDealedDamageToPlayer',
                'modifyTakenDamage'
            ];

            abilitiesToSteal.forEach(ability => {
                if (targetProto.hasOwnProperty(ability)) {
                    this[ability] = targetProto[ability];
                    delete targetProto[ability];
                }
            });
        }

        updateView();
        continuation();
    }
}

const seriffStartDeck = [
    new Duck(),
    new Brewer(),
];
const banditStartDeck = [
    new Dog(),
    new Dog(),
    new Dog(),
    new Dog(),
];

const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});