import { _decorator, Component, Node, Label, Button, Prefab, instantiate, Vec3, tween, Camera, Sprite, view, UIOpacity, UITransform } from 'cc';
import { GameManager, GameState } from './GameManager';
import { UIAnimations } from './UIAnimations';
import { GridManager } from './GridManager';
import { PoolManager } from './ObjectPool';
import { AudioManager } from './AudioManager';
import { TutorialManager } from './TutorialManager';
const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    @property(Label)
    coinsLabel: Label = null!;

    @property(Button)
    buyButton: Button = null!;

    @property(Label)
    buyButtonLabel: Label = null!;

    @property(Node)
    buyButtonAnchorPortrait: Node | null = null;

    @property(Node)
    buyButtonAnchorLandscape: Node | null = null;

    @property(Button)
    tutorialBuyButton: Button = null!;

    @property(Node)
    tutorialBuyCard: Node = null!;

    @property(Node)
    tutorialBuyHand: Node = null!;

    @property(Node)
    tutorialBuyPanel: Node = null!;

    @property(Node)
    tutorialBuyPanelLandscape: Node | null = null;

    @property(Button)
    tutorialBuyButtonLandscape: Button | null = null;

    @property(Node)
    tutorialBuyCardLandscape: Node | null = null;

    @property(Node)
    tutorialBuyHandLandscape: Node | null = null;

    @property(Node)
    tutorialMergePanel: Node = null!;

    @property(Node)
    tutorialMergePanelLandscape: Node | null = null;

    @property(Node)
    tutorialMergeHand: Node = null!;

    @property(Node)
    tutorialMergeHandLandscape: Node | null = null;

    @property(Node)
    winPanel: Node = null!;

    @property(Button)
    winGetGameButton: Button = null!;

    @property(Node)
    winGetGameHand: Node = null!;

    @property(Node)
    losePanel: Node = null!;

    @property(Button)
    loseGetGameButton: Button = null!;

    @property(Node)
    loseGetGameHand: Node = null!;

    @property(Prefab)
    coinPrefab: Prefab = null!;

    @property(Node)
    coinTarget: Node = null!;

    @property(Camera)
    mainCamera: Camera = null!;

    @property(Node)
    canvas: Node = null!;

    private coins: number = 0;
    private buyButtonIdleScale: Vec3 | null = null;
    private buyButtonPulseActive: boolean = false;
    private isMergeHandAnimating: boolean = false;
    private isBuyTutorialAnimating: boolean = false;

    onLoad() {
        if (this.buyButton) {
            this.buyButton.node.on(Button.EventType.CLICK, this.onBuyButtonClick, this);
            this.buyButton.node.active = false;
        }

        if (this.tutorialBuyButton) {
            this.tutorialBuyButton.node.on(Button.EventType.CLICK, this.onBuyButtonClick, this);
        }

        if (this.tutorialBuyButtonLandscape) {
            this.tutorialBuyButtonLandscape.node.on(Button.EventType.CLICK, this.onBuyButtonClick, this);
        }

        if (this.tutorialBuyPanel) {
            this.tutorialBuyPanel.active = false;
        }

        if (this.tutorialBuyPanelLandscape) {
            this.tutorialBuyPanelLandscape.active = false;
        }

        if (this.tutorialMergePanel) {
            this.tutorialMergePanel.active = false;
        }

        if (this.tutorialMergePanelLandscape) {
            this.tutorialMergePanelLandscape.active = false;
        }

        view.on('canvas-resize', this.onCanvasResize, this);

        if (this.winPanel) {
            this.winPanel.active = false;
        }

        if (this.losePanel) {
            this.losePanel.active = false;
        }

        this.applyEndGamePanelsScale();
        this.applyBuyButtonPositionFromAnchors();
    }

    onDestroy() {
        view.off('canvas-resize', this.onCanvasResize, this);
        this.unschedule(this.applyBuyButtonLayoutDeferred);
    }

    private static isPortraitViewport(): boolean {
        const s = view.getVisibleSize();
        return s.height > s.width;
    }

    private static isLandscapeViewport(): boolean {
        const s = view.getVisibleSize();
        return s.width >= s.height;
    }

    private onCanvasResize = () => {
        this.refreshOpenTutorialLayout();
        this.applyEndGamePanelsScale();
        this.applyBuyButtonPositionFromAnchors();
        this.applyBuyButtonScaleForCurrentOrientationIfVisible();
        const deferBuyLayout =
            !!(this.buyButtonAnchorPortrait || this.buyButtonAnchorLandscape) ||
            !!this.buyButton?.node.active;
        if (deferBuyLayout) {
            this.unschedule(this.applyBuyButtonLayoutDeferred);
            this.scheduleOnce(this.applyBuyButtonLayoutDeferred, 0);
        }
        this.restartManagedAnimationsAfterOrientationChange();
    };

    private applyBuyButtonLayoutDeferred = () => {
        this.applyBuyButtonPositionFromAnchors();
        this.applyBuyButtonScaleForCurrentOrientationIfVisible();
    };

    private applyBuyButtonPositionFromAnchors() {
        if (!this.buyButton) {
            return;
        }
        const anchor = UIManager.isPortraitViewport()
            ? this.buyButtonAnchorPortrait
            : this.buyButtonAnchorLandscape;
        if (!anchor) {
            return;
        }
        const btn = this.buyButton.node;
        const parent = btn.parent;
        const parentUi = parent?.getComponent(UITransform);
        if (parentUi) {
            const local = new Vec3();
            parentUi.convertToNodeSpaceAR(anchor.worldPosition, local);
            btn.setPosition(local);
        } else {
            btn.setPosition(anchor.position);
        }
    }

    private getBattleBuyButtonTargetScale(): number {
        return UIManager.isPortraitViewport() ? 5 : 2;
    }

    private applyBuyButtonScaleForCurrentOrientationIfVisible() {
        if (!this.buyButton?.node.active) {
            return;
        }
        const s = this.getBattleBuyButtonTargetScale();
        const u = new Vec3(s, s, 1);
        UIAnimations.stopNodeAnimation(this.buyButton.node);
        this.buyButton.node.setScale(u);
        this.buyButtonIdleScale = u.clone();
        this.buyButtonPulseActive = false;
        this.updateBuyButton();
    }

    private getEndGamePanelScale(): number {
        return UIManager.isPortraitViewport() ? 2 : 1;
    }

    private applyEndGamePanelsScale() {
        const s = this.getEndGamePanelScale();
        for (const panel of [this.winPanel, this.losePanel]) {
            if (!panel) {
                continue;
            }
            UIAnimations.stopNodeAnimation(panel);
            panel.setScale(s, s, 1);
        }
    }

    private refreshOpenTutorialLayout() {
        if (this.tutorialBuyPanel?.active || this.tutorialBuyPanelLandscape?.active) {
            const p = this.resolveBuyTutorialRoot();
            this.ensureFullOpacity(p);
        }
        if (this.tutorialMergePanel?.active || this.tutorialMergePanelLandscape?.active) {
            const p = this.resolveMergeTutorialRoot();
            this.ensureFullOpacity(p);
        }
    }

    private restartManagedAnimationsAfterOrientationChange() {
        if (this.tutorialBuyPanel?.active || this.tutorialBuyPanelLandscape?.active) {
            this.isBuyTutorialAnimating = false;
            this.stopBuyTutorialTweensOnAllRefs();
            this.startBuyTutorialAnimations();
        }
        if (this.tutorialMergePanel?.active || this.tutorialMergePanelLandscape?.active) {
            this.stopMergeHandAnimation();
            this.startMergeHandAnimation();
        }
        if (this.winPanel?.active) {
            this.stopWinEndGameCtaAnimations();
            this.startWinEndGameCtaAnimations();
        }
        if (this.losePanel?.active) {
            this.stopLoseEndGameCtaAnimations();
            this.startLoseEndGameCtaAnimations();
            UIAnimations.shake(this.losePanel, 5, 0.5);
        }
    }

    private ensureFullOpacity(panel: Node | null) {
        if (!panel || !panel.active) {
            return;
        }
        let op = panel.getComponent(UIOpacity);
        if (!op) {
            op = panel.addComponent(UIOpacity);
        }
        op.opacity = 255;
    }

    private resolveBuyTutorialRoot(): Node | null {
        if (!this.tutorialBuyPanel) {
            return null;
        }
        const useLandscape = UIManager.isLandscapeViewport() && this.tutorialBuyPanelLandscape != null;
        if (this.tutorialBuyPanelLandscape) {
            this.tutorialBuyPanel.active = !useLandscape;
            this.tutorialBuyPanelLandscape.active = useLandscape;
        } else {
            this.tutorialBuyPanel.active = true;
        }
        return useLandscape ? this.tutorialBuyPanelLandscape! : this.tutorialBuyPanel;
    }

    private resolveMergeTutorialRoot(): Node | null {
        if (!this.tutorialMergePanel) {
            return null;
        }
        const useLandscape = UIManager.isLandscapeViewport() && this.tutorialMergePanelLandscape != null;
        if (this.tutorialMergePanelLandscape) {
            this.tutorialMergePanel.active = !useLandscape;
            this.tutorialMergePanelLandscape.active = useLandscape;
        } else {
            this.tutorialMergePanel.active = true;
        }
        return useLandscape ? this.tutorialMergePanelLandscape! : this.tutorialMergePanel;
    }

    private getActiveBuyCard(): Node | null {
        if (UIManager.isLandscapeViewport() && this.tutorialBuyCardLandscape) {
            return this.tutorialBuyCardLandscape;
        }
        return this.tutorialBuyCard;
    }

    private getActiveBuyButton(): Button | null {
        if (UIManager.isLandscapeViewport() && this.tutorialBuyButtonLandscape) {
            return this.tutorialBuyButtonLandscape;
        }
        return this.tutorialBuyButton;
    }

    private getActiveBuyHand(): Node | null {
        if (UIManager.isLandscapeViewport() && this.tutorialBuyHandLandscape) {
            return this.tutorialBuyHandLandscape;
        }
        return this.tutorialBuyHand;
    }

    private getActiveMergeHand(): Node | null {
        if (UIManager.isLandscapeViewport() && this.tutorialMergeHandLandscape) {
            return this.tutorialMergeHandLandscape;
        }
        return this.tutorialMergeHand;
    }

    start() {
        this.updateCoins(0);
    }

    public updateCoins(amount: number) {
        this.coins = amount;
        if (this.coinsLabel) {
            this.coinsLabel.string = this.coins.toString();
        }
        this.updateBuyButton();
    }

    private updateBuyButton() {
        const gameManager = GameManager.instance;
        if (!gameManager) {
            return;
        }

        const cost = gameManager.getUnitCost();

        if (this.buyButtonLabel) {
            this.buyButtonLabel.string = cost.toString();
        }

        if (this.buyButton) {
            const canAfford = this.coins >= cost;
            this.buyButton.interactable = canAfford;
            this.applyVisual(canAfford);
            this.updateBuyButtonPulse(canAfford);
        }
    }

    private updateBuyButtonPulse(canAfford: boolean) {
        if (!this.buyButton || !this.buyButton.node.active) {
            return;
        }
        const btnNode = this.buyButton.node;
        if (canAfford && this.buyButtonIdleScale) {
            if (!this.buyButtonPulseActive) {
                this.buyButtonPulseActive = true;
                btnNode.setScale(this.buyButtonIdleScale);
                UIAnimations.pulse(btnNode, 1.15, 1.0, true);
            }
        } else {
            if (this.buyButtonPulseActive) {
                this.buyButtonPulseActive = false;
                UIAnimations.stopNodeAnimation(btnNode);
                if (this.buyButtonIdleScale) {
                    btnNode.setScale(this.buyButtonIdleScale);
                }
            }
        }
    }

    private applyVisual(canAfford: boolean) {
        const root = this.buyButton.target ?? this.buyButton.node;
        for (const sp of root.getComponentsInChildren(Sprite)) {
            sp.grayscale = !canAfford;
        }
    }

    private onBuyButtonClick() {
        const gameManager = GameManager.instance;
        if (!gameManager) {
            return;
        }

        const cost = gameManager.getUnitCost();
        if (this.coins < cost) {
            return;
        }

        if (gameManager.gridManager) {
            const gridManager = gameManager.gridManager.getComponent(GridManager);
            if (gridManager) {
                const emptyCell = gridManager.getEmptyCell();
                if (emptyCell) {
                    const unit = gridManager.placeUnit(emptyCell.row, emptyCell.col, gridManager.archerPrefab, 1, false);
                    if (unit) {
                        AudioManager.instance?.playUnitBuy();
                        AudioManager.instance?.playMeridaAppear();

                        gameManager.addCoins(-cost);
                        if (gameManager.getGameState() !== GameState.TUTORIAL_BUY) {
                            gameManager.increaseUnitCost();
                        }
                        this.updateBuyButton();
                            
                        if (gameManager.getGameState() === GameState.TUTORIAL_BUY && gameManager.tutorialManager) {
                            const tutorialMgr = gameManager.tutorialManager.getComponent(TutorialManager);
                            if (tutorialMgr && tutorialMgr.onUnitPurchased) {
                                tutorialMgr.onUnitPurchased();
                            }
                        }
                    }
                }
            }
        }
    }

    public spawnCoins(worldPos: Vec3, amount: number) {
        if (!this.coinPrefab || !this.coinTarget) {
            const gameManager = GameManager.instance;
            if (gameManager) {
                if (amount > 0) {
                    AudioManager.instance?.playCoins();
                }
                gameManager.addCoins(amount);
            }
            return;
        }

        const numCoins = Math.min(amount / 2, 5);

        if (numCoins > 0) {
            AudioManager.instance?.playCoins();
        }

        for (let i = 0; i < numCoins; i++) {
            this.scheduleOnce(() => {
                this.spawnSingleCoin(worldPos);
            }, i * 0.08);
        }

        const gameManager = GameManager.instance;
        if (gameManager) {
            this.scheduleOnce(() => {
                gameManager.addCoins(amount);
            }, numCoins * 0.08 + 0.5);
        }
    }

    private spawnSingleCoin(worldPos: Vec3) {
        if (!this.coinPrefab || !this.coinTarget) {
            return;
        }

        const gameManager = GameManager.instance;
        const poolManager = gameManager?.node.getComponent(PoolManager);
        let coin: Node;
        
        if (poolManager) {
            coin = poolManager.getFromPool('coins');
            if (!coin) {
                coin = instantiate(this.coinPrefab);
            }
        } else {
            coin = instantiate(this.coinPrefab);
        }

        const parentNode = this.canvas || this.node;
        if (coin.parent !== parentNode) {
            coin.setParent(parentNode);
        }
        coin.active = true;

        let startPos = new Vec3();
        if (this.mainCamera) {
            const parentNode = this.canvas || this.node;
            this.mainCamera.convertToUINode(worldPos, parentNode, startPos);
        } else {
            startPos = new Vec3(0, 0, 0);
        }

        const randomOffset = new Vec3(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            0
        );
        startPos.add(randomOffset);

        coin.setPosition(startPos);
        coin.setScale(0.5, 0.5, 1);

        const targetPos = this.coinTarget.position.clone();
        const midPos = new Vec3(
            (startPos.x + targetPos.x) / 2,
            startPos.y + 150,
            0
        );

        tween(coin)
            .to(0.4, { position: midPos }, { easing: 'sineOut' })
            .to(0.3, { position: targetPos }, { easing: 'sineIn' })
            .call(() => {
                if (poolManager) {
                    poolManager.releaseToPool('coins', coin);
                } else {
                    coin.destroy();
                }
            })
            .start();
    }

    public showTutorialBuy() {
        const panel = this.resolveBuyTutorialRoot();
        if (!panel) {
            return;
        }

        UIAnimations.fadeIn(panel, 0.3);
        
        this.startBuyTutorialAnimations();
    }

    public showTutorialMerge() {
        const panel = this.resolveMergeTutorialRoot();
        if (!panel) {
            return;
        }

        UIAnimations.fadeIn(panel, 0.3);

        this.startMergeHandAnimation();
    }

    public closeTutorialBuy() {
        this.stopBuyTutorialAnimations();
        
        if (this.tutorialBuyPanel?.active) {
            UIAnimations.fadeOut(this.tutorialBuyPanel, 0.3);
        }
        if (this.tutorialBuyPanelLandscape?.active) {
            UIAnimations.fadeOut(this.tutorialBuyPanelLandscape, 0.3);
        }
    }

    private startBuyTutorialAnimations() {
        this.isBuyTutorialAnimating = true;
        
        const card = this.getActiveBuyCard();
        if (card) {
            UIAnimations.floatUpDown(card, 20, 1.5);
        }
        
        const btn = this.getActiveBuyButton();
        if (btn) {
            UIAnimations.pulse(btn.node, 1.15, 1.0, true);
        }
        
        const hand = this.getActiveBuyHand();
        if (hand && btn) {
            UIAnimations.pointToTarget(hand, btn.node);
        }
    }

    private stopBuyTutorialTweensOnAllRefs() {
        const cards = [this.tutorialBuyCard, this.tutorialBuyCardLandscape];
        for (const c of cards) {
            if (c) {
                UIAnimations.stopNodeAnimation(c);
            }
        }

        const buttons = [this.tutorialBuyButton, this.tutorialBuyButtonLandscape];
        for (const b of buttons) {
            if (b) {
                UIAnimations.stopNodeAnimation(b.node);
            }
        }

        const hands = [this.tutorialBuyHand, this.tutorialBuyHandLandscape];
        for (const h of hands) {
            if (h) {
                UIAnimations.stopNodeAnimation(h);
                h.active = false;
            }
        }
    }

    private stopBuyTutorialAnimations() {
        if (!this.isBuyTutorialAnimating) {
            return;
        }

        this.isBuyTutorialAnimating = false;
        this.stopBuyTutorialTweensOnAllRefs();
    }

    public closeTutorialMerge() {
        this.stopMergeHandAnimation();
        if (this.tutorialMergePanel?.active) {
            UIAnimations.fadeOut(this.tutorialMergePanel, 0.3);
        }
        if (this.tutorialMergePanelLandscape?.active) {
            UIAnimations.fadeOut(this.tutorialMergePanelLandscape, 0.3);
        }
    }

    public isTutorialPanelActive(): boolean {
        const buyPanelActive =
            (this.tutorialBuyPanel && this.tutorialBuyPanel.active) ||
            (!!this.tutorialBuyPanelLandscape && this.tutorialBuyPanelLandscape.active);
        const mergePanelActive =
            (this.tutorialMergePanel && this.tutorialMergePanel.active) ||
            (!!this.tutorialMergePanelLandscape && this.tutorialMergePanelLandscape.active);
        return buyPanelActive || mergePanelActive;
    }

    public showBuyButton() {
        if (this.coinTarget) {
            this.coinTarget.active = true;
        }
        if (this.buyButton) {
            this.applyBuyButtonPositionFromAnchors();
            this.buyButton.node.active = true;
            this.buyButtonIdleScale = null;
            this.buyButtonPulseActive = false;
            this.updateBuyButton();
            const targetScale = this.getBattleBuyButtonTargetScale();
            UIAnimations.scaleIn(this.buyButton.node, 1.0, targetScale, () => {
                this.buyButtonIdleScale = this.buyButton.node.scale.clone();
                this.updateBuyButton();
            });
        }
    }

    public hideBuyButton() {
        if (this.buyButton) {
            this.buyButtonPulseActive = false;
            UIAnimations.stopNodeAnimation(this.buyButton.node);
            if (this.buyButtonIdleScale) {
                this.buyButton.node.setScale(this.buyButtonIdleScale);
            }
            this.buyButton.node.active = false;
        }
        if (this.coinTarget) {
            this.coinTarget.active = false;
        }
    }

    public showWinScreen() {
        this.hideBuyButton();
        this.stopWinEndGameCtaAnimations();
        if (this.winPanel) {
            const s = this.getEndGamePanelScale();
            UIAnimations.fadeIn(this.winPanel, 0.5);
            UIAnimations.scaleIn(this.winPanel, 1.0, s);
        }
        this.startWinEndGameCtaAnimations();
    }

    public showLoseScreen() {
        this.hideBuyButton();
        this.stopLoseEndGameCtaAnimations();
        if (this.losePanel) {
            const s = this.getEndGamePanelScale();
            UIAnimations.stopNodeAnimation(this.losePanel);
            this.losePanel.setScale(s, s, 1);
            UIAnimations.fadeIn(this.losePanel, 0.5);
            UIAnimations.shake(this.losePanel, 5, 0.5);
        }
        this.startLoseEndGameCtaAnimations();
    }

    private startWinEndGameCtaAnimations() {
        if (this.winGetGameButton) {
            UIAnimations.pulse(this.winGetGameButton.node, 1.15, 1.0, true);
        }

        if (this.winGetGameHand && this.winGetGameButton) {
            UIAnimations.pointToTarget(this.winGetGameHand, this.winGetGameButton.node);
        }
    }

    private stopWinEndGameCtaAnimations() {
        if (this.winGetGameButton) {
            UIAnimations.stopNodeAnimation(this.winGetGameButton.node);
        }

        if (this.winGetGameHand) {
            UIAnimations.stopNodeAnimation(this.winGetGameHand);
            this.winGetGameHand.active = false;
        }
    }

    private startLoseEndGameCtaAnimations() {
        if (this.loseGetGameButton) {
            UIAnimations.pulse(this.loseGetGameButton.node, 1.15, 1.0, true);
        }

        if (this.loseGetGameHand && this.loseGetGameButton) {
            UIAnimations.pointToTarget(this.loseGetGameHand, this.loseGetGameButton.node);
        }
    }

    private stopLoseEndGameCtaAnimations() {
        if (this.loseGetGameButton) {
            UIAnimations.stopNodeAnimation(this.loseGetGameButton.node);
        }

        if (this.loseGetGameHand) {
            UIAnimations.stopNodeAnimation(this.loseGetGameHand);
            this.loseGetGameHand.active = false;
        }
    }

    private startMergeHandAnimation() {
        this.isMergeHandAnimating = true;
        this.startMergeHandAnimationCycle();
    }

    private startMergeHandAnimationCycle() {
        if (!this.isMergeHandAnimating) {
            return;
        }

        this.updateMergeHandAnimation();
    }

    private updateMergeHandAnimation() {
        const mergeHand = this.getActiveMergeHand();
        if (!mergeHand || !this.isMergeHandAnimating) {
            return;
        }

        const gameManager = GameManager.instance;
        if (!gameManager || !gameManager.gridManager) {
            return;
        }

        const gridManager = gameManager.gridManager.getComponent(GridManager);
        if (!gridManager) {
            return;
        }

        let firstArcherNode: Node | null = null;
        let secondArcherNode: Node | null = null;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const unit = gridManager.getUnit(row, col);
                if (unit) {
                    if (!firstArcherNode) {
                        firstArcherNode = unit;
                    } else if (!secondArcherNode) {
                        secondArcherNode = unit;
                        break;
                    }
                }
            }
            if (secondArcherNode) break;
        }

        if (!firstArcherNode || !secondArcherNode) {
            this.stopMergeHandAnimation();
            return;
        }

        const startWorldPos = firstArcherNode.worldPosition;
        const endWorldPos = secondArcherNode.worldPosition;

        const startScreenPos = new Vec3();
        const endScreenPos = new Vec3();
        
        this.mainCamera.convertToUINode(startWorldPos, this.canvas, startScreenPos);
        this.mainCamera.convertToUINode(endWorldPos, this.canvas, endScreenPos);

        const onCycleComplete = () => {
            this.startMergeHandAnimationCycle();
        };

        UIAnimations.animateMergeHand(mergeHand, startScreenPos, endScreenPos, onCycleComplete);
    }

    private stopMergeHandAnimation() {
        this.isMergeHandAnimating = false;
        UIAnimations.stopMergeHandAnimation();
        for (const h of [this.tutorialMergeHand, this.tutorialMergeHandLandscape]) {
            if (h) {
                UIAnimations.stopNodeAnimation(h);
                h.active = false;
            }
        }
    }
}
