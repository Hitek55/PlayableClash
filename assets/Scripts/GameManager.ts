import { _decorator, Component, Node, Prefab } from 'cc';
import { AudioManager } from './AudioManager';
import { UIManager } from './UIManager';
import { PoolManager } from './ObjectPool';
import { GridManager } from './GridManager';
import { EnemySpawner } from './EnemySpawner';
import { GameState, GameStateMachine, isGameOver } from './GameState';
const { ccclass, property } = _decorator;

export { GameState, GameStateMachine, isGameOver, allowsGameplayInput } from './GameState';

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Node)
    gridManager: Node = null!;

    @property(Node)
    uiManager: Node = null!;

    @property(Node)
    enemySpawner: Node = null!;

    @property(Node)
    tutorialManager: Node = null!;

    @property(Prefab)
    projectilePrefab: Prefab = null!;

    @property(Prefab)
    coinPrefab: Prefab = null!;

    @property
    defeatScreenDelay: number = 2;

    private static _instance: GameManager = null!;
    private poolManager: PoolManager = null!;
    private _gameState: GameState = GameState.MENU;
    private _coins: number = 0;
    private _unitCost: number = 15;
    public orcKillCount: number = 0;

    public static get instance(): GameManager {
        return this._instance;
    }

    onLoad() {
        GameManager._instance = this;
        this._coins = 0;
        this._unitCost = 15;
        
        this.poolManager = this.node.addComponent(PoolManager);
        this.initializePools();
    }

    private initializePools() {
        if (this.projectilePrefab) {
            this.poolManager.createPool('projectiles', this.projectilePrefab, this.node, 10);
        }
        
        if (this.coinPrefab) {
            this.poolManager.createPool('coins', this.coinPrefab, this.node, 15);
        }
    }

    start() {
        this._gameState = GameState.MENU;
    }

    public getGameState(): GameState {
        return this._gameState;
    }

    public transitionTo(next: GameState): boolean {
        if (!GameStateMachine.canTransition(this._gameState, next)) {
            return false;
        }
        this._gameState = next;
        return true;
    }

    public addCoins(amount: number) {
        this._coins += amount;
        
        if (this.uiManager) {
            const uiComp = this.uiManager.getComponent(UIManager);
            if (uiComp) {
                uiComp.updateCoins(this._coins);
            }
        }
    }

    public getUnitCost(): number {
        if (this._gameState === GameState.TUTORIAL_BUY) {
            return 10;
        }
        return this._unitCost;
    }

    public increaseUnitCost() {
        this._unitCost += 5;
    }

    public onEnemyReachedEnd() {
        if (isGameOver(this._gameState)) {
            return;
        }
        this.gameLose();
    }

    public registerOrcKill() {
        this.orcKillCount++;
    }

    public onBossKilled() {
        if (this._gameState === GameState.BATTLE) {
            this.gameWin();
        }
    }

    private gameWin() {
        if (this._gameState === GameState.VICTORY) {
            return;
        }
        if (!this.transitionTo(GameState.VICTORY)) {
            return;
        }

        AudioManager.instance?.playVictoryMusic();

        if (this.uiManager) {
            const uiComp = this.uiManager.getComponent(UIManager);
            if (uiComp) {
                uiComp.showWinScreen();
            }
        }
    }

    private gameLose() {
        if (isGameOver(this._gameState)) {
            return;
        }
        if (!this.transitionTo(GameState.DEFEAT)) {
            return;
        }

        AudioManager.instance?.playDefeatMusic();

        if (this.enemySpawner) {
            const spawner = this.enemySpawner.getComponent(EnemySpawner);
            if (spawner) {
                spawner.pauseAllEnemies();
            }
        }

        if (this.gridManager) {
            const grid = this.gridManager.getComponent(GridManager);
            grid?.killAllPlayerUnits();
        }

        const delay = Math.max(0, this.defeatScreenDelay);
        if (this.uiManager) {
            const uiNode = this.uiManager;
            this.scheduleOnce(() => {
                if (!this.node || !this.node.isValid) {
                    return;
                }
                const uiComp = uiNode.getComponent(UIManager);
                if (uiComp) {
                    uiComp.showLoseScreen();
                }
            }, delay);
        }
    }

    public onScreenClick() {
        if (this._gameState === GameState.VICTORY) {
            console.log('[CTA] WIN - Игрок победил!');
        } else if (this._gameState === GameState.DEFEAT) {
            console.log('[CTA] LOSE - Игрок проиграл!');
        }
    }
}
