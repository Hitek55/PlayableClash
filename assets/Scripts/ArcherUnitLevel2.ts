import { _decorator, Vec3 } from 'cc';
import { ArcherUnitLevel1 } from './ArcherUnitLevel1';
const { ccclass } = _decorator;

@ccclass('ArcherUnitLevel2')
export class ArcherUnitLevel2 extends ArcherUnitLevel1 {

    onLoad() {
        this._level = 2;
    }

    public override getLevel(): number {
        return 2;
    }

    public override setLevel(_level: number) {
        this._level = 2;
        this.updateStats();
    }

    protected override updateStats() {
        this.attackDamage = 100;
        this.attackSpeed = 2.0;
        this._attackCooldownMultiplier = 1.5;
        this.applyModelScale(3);
    }

    protected override getNodeScaleAfterUpgrade(_originalScale: Vec3): Vec3 {
        return new Vec3(1.2, 1.2, 1.2);
    }
}
