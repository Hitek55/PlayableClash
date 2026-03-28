import { _decorator, Component, Node } from 'cc';
import { GameManager, GameState } from './GameManager';
import { EnemySpawner } from './EnemySpawner';
import { GridManager } from './GridManager';
import { UIManager } from './UIManager';
import { ArcherUnitBase } from './ArcherUnitBase';
const { ccclass } = _decorator;

@ccclass('TutorialManager')
export class TutorialManager extends Component {
    private tutorialStep: number = 0;
    private checkTimer: number = 0;

    update(deltaTime: number) {
        this.checkTimer += deltaTime;
        
        if (this.checkTimer >= 0.5) {
            this.checkTimer = 0;
            this.checkForTutorials();
        }
    }

    private checkForTutorials() {
        const gameManager = GameManager.instance;
        if (!gameManager) {
            return;
        }

        const state = gameManager.getGameState();

        if (this.tutorialStep === 0 && state === GameState.MENU) {
            if (gameManager.orcKillCount >= 1) {
                this.tutorialStep = 1;
                this.scheduleOnce(() => {
                    this.showBuyTutorial();
                }, 1.0);
            }
        }

        if (this.tutorialStep === 2 && state === GameState.TUTORIAL_BUY) {
            const gridManager = gameManager.gridManager?.getComponent(GridManager);
            if (gridManager) {
                let archerCount = 0;
                for (let row = 0; row < 4; row++) {
                    for (let col = 0; col < 5; col++) {
                        const unit = gridManager.getUnit(row, col);
                        if (unit) {
                            archerCount++;
                        }
                    }
                }

                if (archerCount >= 2) {
                    this.tutorialStep = 3;
                }
            }
        }

        if (this.tutorialStep === 3 && state === GameState.TUTORIAL_BUY) {
            if (gameManager.orcKillCount >= 3) {
                const gridManager = gameManager.gridManager?.getComponent(GridManager);
                if (gridManager) {
                    let hasLevel2Archer = false;
                    for (let row = 0; row < 4; row++) {
                        for (let col = 0; col < 5; col++) {
                            const unit = gridManager.getUnit(row, col);
                            if (unit) {
                                const unitComp = unit.getComponent(ArcherUnitBase);
                                if (unitComp && unitComp.getLevel() === 2) {
                                    hasLevel2Archer = true;
                                    break;
                                }
                            }
                        }
                        if (hasLevel2Archer) break;
                    }
                    
                    if (hasLevel2Archer) {
                        this.tutorialStep = 6;
                        this.onMergeTutorialComplete();
                        return;
                    }
                }
                
                this.tutorialStep = 4;
                this.showMergeTutorial();
            }
        }
    }

    private showBuyTutorial() {
        const gameManager = GameManager.instance;
        if (!gameManager) {
            return;
        }

        gameManager.transitionTo(GameState.TUTORIAL_BUY);

        const enemySpawner = gameManager.enemySpawner?.getComponent(EnemySpawner);
        if (enemySpawner) {
            enemySpawner.pauseAllEnemies();
        }

        const uiManager = gameManager.uiManager?.getComponent(UIManager);
        if (uiManager) {
            uiManager.showTutorialBuy();
        }

        this.tutorialStep = 2;
    }

    private showMergeTutorial() {
        const gameManager = GameManager.instance;
        if (!gameManager) {
            return;
        }

        gameManager.transitionTo(GameState.TUTORIAL_MERGE);

        const enemySpawner = gameManager.enemySpawner?.getComponent(EnemySpawner);
        if (enemySpawner) {
            enemySpawner.pauseAllEnemies();
        }

        const uiManager = gameManager.uiManager?.getComponent(UIManager);
        if (uiManager) {
            uiManager.showTutorialMerge();
        }

        this.tutorialStep = 5;
    }

    public onUnitPurchased() {
        const gameManager = GameManager.instance;
        if (gameManager) {
            
            const uiManager = gameManager.uiManager?.getComponent(UIManager);
            if (uiManager) {
                uiManager.closeTutorialBuy();
            }

            gameManager.transitionTo(GameState.TUTORIAL_BUY);

            const enemySpawner = gameManager.enemySpawner?.getComponent(EnemySpawner);
            if (enemySpawner) {
                enemySpawner.resumeAllEnemies();
            }
        }
    }

    public onMergePerformed() {
        if (this.tutorialStep === 5) {
            this.tutorialStep = 6;
            
            const gameManager = GameManager.instance;
            if (gameManager) {
                const uiManager = gameManager.uiManager?.getComponent(UIManager);
                if (uiManager) {
                    uiManager.closeTutorialMerge();
                }

                const enemySpawner = gameManager.enemySpawner?.getComponent(EnemySpawner);
                if (enemySpawner) {
                    enemySpawner.resumeAllEnemies();
                }
            }
            
            this.onMergeTutorialComplete();
        }
    }

    private onMergeTutorialComplete() {
        const gameManager = GameManager.instance;
        if (!gameManager) {
            return;
        }

        const uiManager = gameManager.uiManager?.getComponent(UIManager);
        if (uiManager) {
            uiManager.showBuyButton();
        }

        gameManager.transitionTo(GameState.BATTLE);
    }
}
