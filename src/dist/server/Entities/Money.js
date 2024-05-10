"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    constructor(value) {
        this._valueInCents = Math.round(value * 100);
    }
    static get Zero() {
        return new Money(0);
    }
    get value() {
        return this._valueInCents / 100;
    }
    get valueInCents() {
        return this._valueInCents;
    }
    add(money) {
        this._valueInCents += money.valueInCents;
    }
    subtract(money) {
        this._valueInCents -= money.valueInCents;
    }
    multiply(multiplier) {
        if (multiplier < 0)
            throw new Error("Multiplier cannot be negative");
        this._valueInCents *= multiplier;
        this._valueInCents = Math.round(this._valueInCents);
    }
    static Add(money1, money2) {
        const newMoney = new Money(0);
        newMoney.add(money1);
        newMoney.add(money2);
        return newMoney;
    }
    static Subtract(money1, money2) {
        const newMoney = new Money(0);
        newMoney.add(money1);
        newMoney.subtract(money2);
        return newMoney;
    }
    static Multiply(money, multiplier) {
        const newMoney = new Money(0);
        newMoney.add(money);
        newMoney.multiply(multiplier);
        return newMoney;
    }
    static Divide(money, divisor) {
        if (divisor == 0) {
            throw new Error("Divisor cannot be zero");
        }
        const newMoney = new Money(0);
        newMoney.add(money);
        newMoney.multiply(1 / divisor);
        return newMoney;
    }
    isEqualTo(money) {
        return this._valueInCents == money.valueInCents;
    }
    isGte(money) {
        return this._valueInCents >= money.valueInCents;
    }
    isLte(money) {
        return this._valueInCents <= money.valueInCents;
    }
    isGt(money) {
        return this._valueInCents > money.valueInCents;
    }
    isLt(money) {
        return this._valueInCents < money.valueInCents;
    }
    copy() {
        return new Money(this.value);
    }
    divideIntoPart(partCount) {
        return new Money(this.value / partCount);
    }
}
exports.Money = Money;
//# sourceMappingURL=Money.js.map