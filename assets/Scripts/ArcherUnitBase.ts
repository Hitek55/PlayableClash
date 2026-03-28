import { _decorator, Component, Node, Animation, AnimationClip, Vec3, Prefab, instantiate, tween, director } from 'cc';
import { GameManager } from './GameManager';
import { EnemySpawner } from './EnemySpawner';
import { EnemyOrc } from './EnemyOrc';
import { PoolManager } from './ObjectPool';
import { AudioManager } from './AudioManager';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

@ccclass('ArcherUnitBase')
export abstract class ArcherUnitBase extends Component {
    @property(Node)
    model: Node = null!;

    @property(Prefab)
    projectilePrefab: Prefab = null!;

    @property(Animation)
    animation: Animation = null!;

    @property
    idleAnimName: string = 'Idle';

    @property
    attackAnimName: string = 'Attack';

    @property
    deathAnimName: string = 'Death';

    @property
    deathAnimSpeed: number = 1;

    @property
    attackRange: number = 15;

    @property
    attackDamage: number = 50;

    @property
    attackSpeed: number = 2.5;

    @property
    projectileFlightDuration: number = 0.55;

    @property
    projectileEulerOffsetY: number = 0;

    protected _level: number = 1;

    protected _attackCooldownMultiplier: number = 1;

    private gridRow: number = -1;
    private gridCol: number = -1;
    private currentTarget: Node | null = null;
    private attackTimer: number = 0;
    private canAttack: boolean = true;
    private updateTimer: number = 0;
    private _isDead: boolean = false;

    private static selectedUnitNode: Node | null = null;

    public static selectUnit(unit: Node): void {
        if (ArcherUnitBase.selectedUnitNode === unit) {
            ArcherUnitBase.deselectUnit();
            return;
        }
        ArcherUnitBase.deselectUnit();
        ArcherUnitBase.selectedUnitNode = unit;
    }

    public static deselectUnit(): void {
        ArcherUnitBase.selectedUnitNode = null;
    }

    private static clearSelectionIfUnit(unit: Node): void {
        if (ArcherUnitBase.selectedUnitNode === unit) {
            ArcherUnitBase.deselectUnit();
        }
    }

    start() {
        this.playIdleAnimation();
        this.attackTimer = 0;
        this.updateTimer = Math.random() * 0.1;

        this.updateStats();
    }

    protected getCooldown(): number {
        return this.attackSpeed * this._attackCooldownMultiplier;
    }

    protected applyModelScale(scale: number): void {
        if (!this.model) {
            return;
        }
        this.model.active = true;
        this.model.setScale(scale, scale, scale);
    }

    private playIdleAnimation() {
        const anim = this.getActiveAnimation();
        if (!anim) {
            return;
        }

        const state = anim.getState(this.idleAnimName);
        if (state) {
            anim.play(this.idleAnimName);
        }
    }

    private playAttackAnimation() {
        const anim = this.getActiveAnimation();
        if (!anim) {
            return;
        }

        const state = anim.getState(this.attackAnimName);
        if (state) {
            state.wrapMode = AnimationClip.WrapMode.Normal;
            anim.play(this.attackAnimName);

            const duration = state.duration || 0.5;
            this.scheduleOnce(() => {
                if (!this._isDead) {
                    this.playIdleAnimation();
                }
            }, duration);
        }
    }

    protected getActiveAnimation(): Animation | null {
        return this.animation;
    }

    update(deltaTime: number) {
        if (this._isDead) {
            return;
        }

        const gameManager = GameManager.instance;
        if (gameManager && gameManager.uiManager) {
            const uiManager = gameManager.uiManager.getComponent(UIManager);
            if (uiManager && uiManager.isTutorialPanelActive()) {
                return;
            }
        }

        this.updateTimer += deltaTime;
        if (this.updateTimer < 0.1) {
            return;
        }
        this.updateTimer = 0;

        if (!this.canAttack) {
            this.attackTimer += deltaTime * 10;
            const cooldown = this.getCooldown();

            if (this.attackTimer >= cooldown) {
                this.canAttack = true;
                this.attackTimer = 0;
            }
        }

        if (this.canAttack) {
            this.findAndAttackTarget();
        }
    }

    private horizontalDistanceSqWorldTo(other: Node): number {
        const a = this.node.worldPosition;
        const b = other.worldPosition;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return dx * dx + dz * dz;
    }

    private findAndAttackTarget() {
        const gameManager = GameManager.instance;
        if (!gameManager || !gameManager.enemySpawner) {
            return;
        }

        const spawner = gameManager.enemySpawner.getComponent(EnemySpawner);
        if (!spawner) {
            return;
        }

        const enemies = spawner.getAliveEnemies();
        if (enemies.length === 0) {
            this.currentTarget = null;
            return;
        }

        const rangeSq = this.attackRange * this.attackRange;

        if (this.currentTarget && this.currentTarget.isValid) {
            const keep = this.currentTarget.getComponent(EnemyOrc);
            if (keep && keep.isAlive() && this.horizontalDistanceSqWorldTo(this.currentTarget) <= rangeSq) {
                this.attack(this.currentTarget);
                return;
            }
            this.currentTarget = null;
        }

        let closestEnemy: Node | null = null;
        let closestDistanceSq = rangeSq;
        const myWorld = this.node.worldPosition;

        for (const enemy of enemies) {
            const w = enemy.worldPosition;
            const dx = w.x - myWorld.x;
            const dz = w.z - myWorld.z;
            const distanceSq = dx * dx + dz * dz;

            if (distanceSq <= closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestEnemy = enemy;
            }
        }

        if (closestEnemy) {
            this.currentTarget = closestEnemy;
            this.attack(closestEnemy);
        }
    }

    private attack(target: Node) {
        if (!this.canAttack) {
            return;
        }

        this.canAttack = false;
        this.attackTimer = 0;

        this.rotateTowardsTarget(target);

        this.playAttackAnimation();
        AudioManager.instance?.playBowRelease();
        this.shootProjectile(target);
    }

    private rotateTowardsTarget(target: Node) {
        if (!target || !target.isValid) {
            return;
        }

        const direction = new Vec3();
        Vec3.subtract(direction, target.worldPosition, this.node.worldPosition);
        direction.y = 0;
        direction.normalize();

        if (direction.lengthSqr() > 0.01) {
            const targetAngle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);

            tween(this.node)
                .to(0.2, { eulerAngles: new Vec3(0, targetAngle, 0) })
                .start();
        }
    }

    private shootProjectile(target: Node) {
        if (!this.projectilePrefab) {
            this.scheduleOnce(() => {
                this.hitTarget(target);
            }, this.projectileFlightDuration);
            return;
        }

        const poolManager = GameManager.instance?.node.getComponent(PoolManager);
        let projectile: Node;

        if (poolManager) {
            projectile = poolManager.getFromPool('projectiles');
            if (!projectile) {
                projectile = instantiate(this.projectilePrefab);
            }
        } else {
            projectile = instantiate(this.projectilePrefab);
        }

        const scene = director.getScene();
        if (scene && projectile.parent !== scene) {
            projectile.setParent(scene);
        }

        projectile.active = true;

        const heightOffset = new Vec3(0, 1, 0);
        const startWorld = this.node.worldPosition.clone().add(heightOffset);
        const endWorld = target.worldPosition.clone().add(heightOffset);
        const duration = this.projectileFlightDuration;

        let tweenProps: { position: Vec3 } | { worldPosition: Vec3 };
        if (scene) {
            const startLocal = new Vec3();
            const endLocal = new Vec3();
            scene.inverseTransformPoint(startLocal, startWorld);
            scene.inverseTransformPoint(endLocal, endWorld);
            projectile.setPosition(startLocal);
            tweenProps = { position: endLocal };
        } else {
            projectile.setWorldPosition(startWorld);
            tweenProps = { worldPosition: endWorld };
        }

        const flyDir = new Vec3();
        Vec3.subtract(flyDir, endWorld, startWorld);
        if (flyDir.lengthSqr() > 1e-8) {
            projectile.lookAt(endWorld, Vec3.UP);
            if (this.projectileEulerOffsetY !== 0) {
                const e = projectile.eulerAngles;
                projectile.setRotationFromEuler(e.x, e.y + this.projectileEulerOffsetY, e.z);
            }
        }

        tween(projectile)
            .to(duration, tweenProps)
            .call(() => {
                this.hitTarget(target);

                if (poolManager) {
                    poolManager.releaseToPool('projectiles', projectile);
                } else {
                    projectile.destroy();
                }
            })
            .start();
    }

    private hitTarget(target: Node) {
        if (!target || !target.isValid) {
            return;
        }

        const enemyComp = target.getComponent(EnemyOrc);
        if (enemyComp) {
            enemyComp.takeDamage(this.attackDamage);
        }
    }

    public setGridPosition(row: number, col: number) {
        this.gridRow = row;
        this.gridCol = col;
    }

    public getGridPosition(): { row: number, col: number } {
        return { row: this.gridRow, col: this.gridCol };
    }

    public setLevel(level: number) {
        this._level = level;
        this.updateStats();
    }

    public getLevel(): number {
        return this._level;
    }

    public upgradeToLevel(newLevel: number) {
        this._level = newLevel;
        this.updateStats();
        this.playUpgradeEffect();
    }

    protected abstract updateStats(): void;

    protected getNodeScaleAfterUpgrade(originalScale: Vec3): Vec3 {
        return originalScale;
    }

    protected playUpgradeEffect() {
        const originalScale = this.node.scale.clone();
        const targetScale = this.getNodeScaleAfterUpgrade(originalScale);

        tween(this.node)
            .to(0.15, { scale: new Vec3(1.5, 1.5, 1.5) })
            .to(0.15, { scale: targetScale })
            .start();

        tween(this.node)
            .by(0.3, { eulerAngles: new Vec3(0, 360, 0) })
            .start();

        const activeModel = this.model;
        if (activeModel && activeModel.active) {
            const modelScale = activeModel.scale.clone();
            tween(activeModel)
                .to(0.1, { scale: new Vec3(modelScale.x * 1.2, modelScale.y * 1.2, modelScale.z * 1.2) })
                .to(0.2, { scale: modelScale })
                .start();
        }
    }

    public die() {
        if (this._isDead) {
            return;
        }
        this._isDead = true;

        ArcherUnitBase.clearSelectionIfUnit(this.node);

        AudioManager.instance?.playFemaleDeath();

        const anim = this.getActiveAnimation();
        if (anim) {
            const deathState = anim.getState(this.deathAnimName);
            if (deathState) {
                deathState.wrapMode = AnimationClip.WrapMode.Normal;
                deathState.speed = this.deathAnimSpeed;
                anim.play(this.deathAnimName);
            }
        }
    }
}
