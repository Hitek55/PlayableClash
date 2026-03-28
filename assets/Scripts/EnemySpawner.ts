import { _decorator, Component, Node, Prefab, instantiate, Vec3, director, Camera } from 'cc';
import { EnemyOrc } from './EnemyOrc';
import { HealthBar } from './HealthBar';
const { ccclass, property } = _decorator;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {
    @property(Prefab)
    orcPrefab: Prefab = null!;

    @property(Prefab)
    bossPrefab: Prefab = null!;

    @property(Prefab)
    healthBarPrefab: Prefab = null!;

    @property(Node)
    healthBarContainer: Node = null!;

    @property(Camera)
    mainCamera: Camera = null!;

    @property({ type: Node })
    waypoints: Node[] = [];

    @property
    enemySpacing: number = 3;

    private enemies: Node[] = [];
    private totalOrcs: number = 7;

    start() {
        this.spawnAllEnemies();
    }

    private spawnAllEnemies() {
        const startX = this.waypoints.length > 0 ? this.waypoints[0].position.x : -10;
        const startY = this.waypoints.length > 0 ? this.waypoints[0].position.y : 0;
        const startZ = this.waypoints.length > 0 ? this.waypoints[0].position.z : 0;

        for (let i = 0; i < this.totalOrcs; i++) {
            const offsetX = startX + i * this.enemySpacing;
            this.spawnEnemyAt(this.orcPrefab, new Vec3(offsetX, startY, startZ));
        }

        const bossOffsetX = startX + this.totalOrcs * this.enemySpacing;
        this.spawnEnemyAt(this.bossPrefab, new Vec3(bossOffsetX, startY, startZ));
    }

    private spawnEnemyAt(prefab: Prefab, position: Vec3) {
        if (!prefab) {
            return;
        }

        const enemy = instantiate(prefab);
        const scene = director.getScene();
        if (scene) {
            enemy.setParent(scene);
        }
        
        enemy.setPosition(position);

        const enemyComp = enemy.getComponent(EnemyOrc);
        if (enemyComp) {
            enemyComp.setWaypoints(this.waypoints);
            
            this.createHealthBarForEnemy(enemy, enemyComp);
        }

        this.enemies.push(enemy);
    }

    public getAliveEnemies(): Node[] {
        this.enemies = this.enemies.filter(enemy => enemy && enemy.isValid);
        return this.enemies.filter(enemy => {
            const comp = enemy.getComponent(EnemyOrc);
            return comp && comp.isAlive();
        });
    }

    public pauseAllEnemies() {
        for (const enemy of this.enemies) {
            if (enemy && enemy.isValid) {
                const enemyComp = enemy.getComponent(EnemyOrc);
                if (enemyComp && enemyComp.isAlive()) {
                    enemyComp.pauseMovement();
                }
            }
        }
    }

    public resumeAllEnemies() {
        for (const enemy of this.enemies) {
            if (enemy && enemy.isValid) {
                const enemyComp = enemy.getComponent(EnemyOrc);
                if (enemyComp && enemyComp.isAlive()) {
                    enemyComp.resumeMovement();
                }
            }
        }
    }

    private createHealthBarForEnemy(enemyNode: Node, enemyComp: EnemyOrc) {
        const healthBarNode = instantiate(this.healthBarPrefab);
        healthBarNode.setParent(this.healthBarContainer);
        healthBarNode.active = true;

        const healthBar = healthBarNode.getComponent(HealthBar);
        if (healthBar) {
            healthBar.camera = this.mainCamera;
            healthBar.targetNode = enemyNode;
            healthBar.offset = new Vec3(0, 2.5, 0);

            enemyComp.setHealthBar(healthBar);
        }
    }
}
