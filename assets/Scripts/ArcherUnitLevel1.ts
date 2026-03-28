import { _decorator } from 'cc';
import { ArcherUnitBase } from './ArcherUnitBase';
const { ccclass } = _decorator;

@ccclass('ArcherUnitLevel1')
export class ArcherUnitLevel1 extends ArcherUnitBase {

    protected updateStats() {
        this.attackDamage = 50;
        this.attackSpeed = 2.5;
        this._attackCooldownMultiplier = 1;
        this.applyModelScale(3.0);
    }
}
