import { _decorator, Component, Node, Animation, AnimationClip, Vec3, tween } from 'cc';
import { AudioManager } from './AudioManager';
import { GameManager } from './GameManager';
import { GridManager } from './GridManager';
import { UIManager } from './UIManager';
import { HealthBar } from './HealthBar';
const { ccclass, property } = _decorator;

@ccclass('EnemyOrc')
export class EnemyOrc extends Component {
    @property(Node)
    model: Node = null!;

    @property(Animation)
    animation: Animation = null!;

    @property
    walkAnimName: string = 'Walk';

    @property
    idleAnimName: string = 'Idle';

    @property
    deathAnimName: string = 'Death';

    @property
    attackAnimName: string = 'Attack';

    @property
    deathAnimSpeed: number = 1.5;

    @property({ type: Node })
    waypoints: Node[] = [];

    @property
    moveSpeed: number = 2.0;

    @property
    coinReward: number = 10;

    @property
    walkYLift: number = 0.3;

    protected maxHealth: number = 100;
    protected currentHealth: number = 100;
    private currentWaypointIndex: number = 0;
    private isDead: boolean = false;
    private moveTween: any = null;
    private healthBar: HealthBar | null = null;
    private isPaused: boolean = false;

    protected rootScaleMultiplier = 2;
    protected rootYawOffsetDeg = 45;

    onLoad() {
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.coinReward = 10;
        this.moveSpeed = 2.0;
        this.applyRootPrefabScale();
    }

    protected applyRootPrefabScale(): void {
        const n = this.node;
        const s = n.scale;
        const m = this.rootScaleMultiplier;
        n.setScale(s.x * m, s.y * m, s.z * m);
    }

    start() {
        this.playWalkAnimation();
        this.applyWalkYLiftToRoot();
        this.moveToNextWaypoint();
    }

    public pauseMovement() {
        if (this.isPaused || this.isDead) {
            return;
        }

        this.isPaused = true;

        if (this.moveTween) {
            this.moveTween.stop();
        }

        this.clearWalkYLiftFromRoot();

        if (this.animation) {
            const state = this.animation.getState(this.idleAnimName);
            if (state) {
                this.animation.play(this.idleAnimName);
            }
        }
    }

    public resumeMovement() {
        if (!this.isPaused || this.isDead) {
            return;
        }

        this.isPaused = false;
        this.playWalkAnimation();
        this.applyWalkYLiftToRoot();
        this.moveToNextWaypoint();
    }

    private playWalkAnimation() {
        if (!this.animation) {
            return;
        }

        const state = this.animation.getState(this.walkAnimName);
        if (state) {
            this.animation.play(this.walkAnimName);
        }
    }

    private playDeathAnimation() {
        if (!this.animation) {
            return false;
        }

        const state = this.animation.getState(this.deathAnimName);
        if (state) {
            state.wrapMode = AnimationClip.WrapMode.Normal;
            state.speed = this.deathAnimSpeed;
            this.animation.play(this.deathAnimName);
            return true;
        }
        return false;
    }

    private playReachEndAttackVisual() {
        if (!this.animation) {
            return;
        }

        const state = this.animation.getState(this.attackAnimName);
        if (state) {
            state.wrapMode = AnimationClip.WrapMode.Normal;
            state.speed = 1;
            this.animation.play(this.attackAnimName);
            return;
        }

        const idleState = this.animation.getState(this.idleAnimName);
        if (idleState) {
            this.animation.play(this.idleAnimName);
        }
    }

    onDestroy() {
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }
    }

    public setWaypoints(waypoints: Node[]) {
        this.waypoints = waypoints;
    }

    protected playDamageHitSound(): void {
        AudioManager.instance?.playOrcHit();
    }

    protected playDeathSound(): void {
        AudioManager.instance?.playOrcDeathRandom();
    }

    protected onDeathGameManagerHooks(gameManager: GameManager): void {
        gameManager.registerOrcKill();
    }

    private applyWalkYLiftToRoot(): void {
        if (this.walkYLift === 0) {
            return;
        }
        const p = this.node.position;
        this.node.setPosition(p.x, p.y + this.walkYLift, p.z);
    }

    private clearWalkYLiftFromRoot(): void {
        if (this.walkYLift === 0) {
            return;
        }
        const p = this.node.position;
        this.node.setPosition(p.x, p.y - this.walkYLift, p.z);
    }

    private moveToNextWaypoint() {
        if (this.isDead || this.isPaused || !this.waypoints || this.waypoints.length === 0) {
            return;
        }

        if (this.currentWaypointIndex >= this.waypoints.length) {
            this.reachedEnd();
            return;
        }

        const targetWaypoint = this.waypoints[this.currentWaypointIndex];
        if (!targetWaypoint || !targetWaypoint.isValid) {
            return;
        }

        const targetPos = targetWaypoint.position.clone();
        targetPos.y += this.walkYLift;

        const distance = Vec3.distance(this.node.position, targetPos);
        const duration = distance / this.moveSpeed;

        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, this.node.position);
        direction.y = 0;
        direction.normalize();

        if (direction.lengthSqr() > 0.01) {
            const angle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
            this.node.setRotationFromEuler(0, angle + this.rootYawOffsetDeg, 0);
        }

        if (this.moveTween) {
            this.moveTween.stop();
        }

        this.moveTween = tween(this.node)
            .to(duration, { position: targetPos })
            .call(() => {
                this.currentWaypointIndex++;
                this.moveToNextWaypoint();
            })
            .start();
    }

    public takeDamage(damage: number) {
        if (this.isDead) {
            return;
        }

        this.currentHealth -= damage;

        this.playDamageHitSound();

        if (this.healthBar) {
            this.healthBar.setHealth(this.currentHealth, this.maxHealth);
        }

        if (this.currentHealth <= 0) {
            this.die();
        }
    }

    private die() {
        if (this.isDead) {
            return;
        }

        this.isDead = true;

        this.playDeathSound();

        if (this.healthBar && this.healthBar.node) {
            this.healthBar.node.active = false;
        }

        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }

        const playedDeathAnim = this.playDeathAnimation();
        this.dropCoins();

        const gameManager = GameManager.instance;
        if (gameManager) {
            if (gameManager.gridManager) {
                const gridMgr = gameManager.gridManager.getComponent(GridManager);
                if (gridMgr) {
                    //gridMgr.playEnemyDeathParticleEffectsAtWorld(this.node.worldPosition);
                }
            }
            this.onDeathGameManagerHooks(gameManager);
        }

        const destroyNode = () => {
            if (this.node && this.node.isValid) {
                this.node.destroy();
            }
        };

        if (playedDeathAnim && this.animation) {
            const state = this.animation.getState(this.deathAnimName);
            const spd = state && state.speed > 0 ? state.speed : 1;
            let delay = state ? state.duration / spd : 0;
            if (delay <= 0) {
                delay = 0.8 / spd;
            }
            this.scheduleOnce(destroyNode, delay);
        } else {
            destroyNode();
        }
    }

    private dropCoins() {
        const gameManager = GameManager.instance;
        if (!gameManager || !gameManager.uiManager) {
            return;
        }

        const uiManager = gameManager.uiManager.getComponent(UIManager);
        if (uiManager) {
            uiManager.spawnCoins(this.node.position, this.coinReward);
        }
    }

    private reachedEnd() {
        if (this.isDead) {
            return;
        }

        this.isPaused = true;
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }

        this.clearWalkYLiftFromRoot();

        const gameManager = GameManager.instance;
        if (gameManager) {
            gameManager.onEnemyReachedEnd();
        }

        this.playReachEndAttackVisual();
    }

    public isAlive(): boolean {
        return !this.isDead;
    }

    public setHealthBar(healthBar: HealthBar) {
        this.healthBar = healthBar;
        if (this.healthBar) {
            this.healthBar.setHealth(this.currentHealth, this.maxHealth);
        }
    }
}
