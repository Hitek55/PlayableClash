import { _decorator, Color, MeshRenderer } from 'cc';
import { AudioManager } from './AudioManager';
import { GameManager } from './GameManager';
import { EnemyOrc } from './EnemyOrc';
const { ccclass } = _decorator;

@ccclass('EnemyBoss')
export class EnemyBoss extends EnemyOrc {
    onLoad() {
        super.onLoad();
        this.maxHealth = 450;
        this.currentHealth = 450;
        this.coinReward = 50;
        this.moveSpeed = 2.0;

        if (this.model) {
            this.model.setScale(2.5, 2.5, 2.5);
            this.applyBossVisualTint();
        }
    }

    private applyBossVisualTint() {
        if (!this.model) {
            return;
        }
        const renderers = this.model.getComponentsInChildren(MeshRenderer);
        const tint = new Color(200, 80, 220, 255);
        for (const r of renderers) {
            const mats = r.materials;
            for (let i = 0; i < mats.length; i++) {
                const m = mats[i];
                if (m) {
                    try {
                        m.setProperty('mainColor', tint);
                    } catch {
                        try {
                            m.setProperty('baseColor', tint);
                        } catch {

                        }
                    }
                }
            }
        }
    }

    protected playDamageHitSound(): void {
        AudioManager.instance?.playGolemHit();
    }

    protected playDeathSound(): void {
        AudioManager.instance?.playGolemDeath();
    }

    protected onDeathGameManagerHooks(gameManager: GameManager): void {
        gameManager.onBossKilled();
    }
}
