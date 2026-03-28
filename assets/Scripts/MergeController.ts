import { _decorator, Component, Node, EventTouch, Camera, geometry, Vec3, Input, input } from 'cc';
import { GameManager, isGameOver, allowsGameplayInput } from './GameManager';
import { ArcherUnitBase } from './ArcherUnitBase';
import { GridManager } from './GridManager';
import { AudioManager } from './AudioManager';
import { TutorialManager } from './TutorialManager';
const { ccclass, property } = _decorator;

@ccclass('MergeController')
export class MergeController extends Component {
    @property(Camera)
    camera: Camera = null!;

    @property(Node)
    gridManager: Node = null!;

    private selectedUnit: Node | null = null;
    private selectedGridPos: { row: number, col: number } | null = null;
    private isDragging: boolean = false;
    private dragOffsetXZ: Vec3 = new Vec3();

    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        const gameManager = GameManager.instance;
        const state = gameManager.getGameState();

        if (isGameOver(state)) {
            gameManager.onScreenClick();
            return;
        }

        if (allowsGameplayInput(state)) {
            this.handleDragStart(event);
        }
    }

    private onTouchMove(event: EventTouch) {
        if (this.isDragging && this.selectedUnit) {
            this.handleDragMove(event);
        }
    }

    private onTouchEnd(event: EventTouch) {
        if (this.isDragging && this.selectedUnit) {
            this.handleDragEnd(event);
        }
    }

    private intersectScreenWithGridPlane(screenX: number, screenY: number, gridMgr: GridManager, outWorld: Vec3): boolean {
        const ray = new geometry.Ray();
        this.camera.screenPointToRay(screenX, screenY, ray);

        const planeY = gridMgr.getGridPlaneWorldY();
        if (Math.abs(ray.d.y) < 1e-5) {
            return false;
        }

        const t = (planeY - ray.o.y) / ray.d.y;
        if (t <= 0) {
            return false;
        }

        Vec3.multiplyScalar(outWorld, ray.d, t);
        Vec3.add(outWorld, ray.o, outWorld);
        return true;
    }

    private worldToGridLocal(world: Vec3, outLocal: Vec3) {
        this.gridManager!.inverseTransformPoint(outLocal, world);
    }

    private handleDragStart(event: EventTouch) {
        const gridMgr = this.gridManager.getComponent(GridManager);
        if (!gridMgr) {
            return;
        }

        const touch = event.touch!;
        const touchX = touch.getLocationX();
        const touchY = touch.getLocationY();

        const hitNode = this.findNearestUnitToScreenPoint(touchX, touchY, gridMgr);

        if (hitNode) {
            const unitComp = hitNode.getComponent(ArcherUnitBase);

            if (unitComp) {
                this.selectedUnit = hitNode;
                this.selectedGridPos = unitComp.getGridPosition();
                this.isDragging = true;

                const worldHit = new Vec3();
                const pickLocal = new Vec3();
                if (this.intersectScreenWithGridPlane(touchX, touchY, gridMgr, worldHit)) {
                    this.worldToGridLocal(worldHit, pickLocal);
                    this.dragOffsetXZ.set(
                        hitNode.position.x - pickLocal.x,
                        0,
                        hitNode.position.z - pickLocal.z
                    );
                } else {
                    this.dragOffsetXZ.set(0, 0, 0);
                }

                ArcherUnitBase.selectUnit(hitNode);

                const liftY = GridManager.GRID_PLANE_LOCAL_Y;
                hitNode.setPosition(hitNode.position.x, liftY, hitNode.position.z);

                AudioManager.instance?.playUnitUp();
            }
        }
    }

    private findNearestUnitToScreenPoint(screenX: number, screenY: number, gridMgr: GridManager): Node | null {
        let closestUnit: Node | null = null;
        let minScreenDistance = Infinity;
        const threshold = 150;

        for (let row = 0; row < gridMgr.rows; row++) {
            for (let col = 0; col < gridMgr.cols; col++) {
                const unit = gridMgr.getUnitAt(row, col);
                if (unit) {
                    const worldPos = unit.worldPosition;

                    try {
                        const screenPos = this.camera.worldToScreen(worldPos);

                        const dx = screenX - screenPos.x;
                        const dy = screenY - screenPos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < threshold && distance < minScreenDistance) {
                            minScreenDistance = distance;
                            closestUnit = unit;
                        }
                    } catch (e) {
                    }
                }
            }
        }

        return closestUnit;
    }

    private handleDragMove(event: EventTouch) {
        if (!this.selectedUnit || !this.camera || !this.gridManager) {
            return;
        }

        const gridMgr = this.gridManager.getComponent(GridManager);
        if (!gridMgr) {
            return;
        }

        const touch = event.touch!;
        const worldHit = new Vec3();
        if (!this.intersectScreenWithGridPlane(touch.getLocationX(), touch.getLocationY(), gridMgr, worldHit)) {
            return;
        }

        const localHit = new Vec3();
        this.worldToGridLocal(worldHit, localHit);

        let worldX = localHit.x + this.dragOffsetXZ.x;
        let worldZ = localHit.z + this.dragOffsetXZ.z;

        const bounds = gridMgr.getGridBounds();
        worldX = Math.max(bounds.minX, Math.min(bounds.maxX, worldX));
        worldZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, worldZ));

        const liftY = GridManager.GRID_PLANE_LOCAL_Y;
        this.selectedUnit.setPosition(worldX, liftY, worldZ);
    }

    private handleDragEnd(event: EventTouch) {
        if (!this.selectedUnit || !this.camera || !this.gridManager) {
            return;
        }

        const gridMgr = this.gridManager.getComponent(GridManager);
        if (!gridMgr) {
            return;
        }

        const touch = event.touch!;
        const worldHit = new Vec3();
        let targetCell: { row: number, col: number } | null = null;

        if (this.intersectScreenWithGridPlane(touch.getLocationX(), touch.getLocationY(), gridMgr, worldHit)) {
            const localHit = new Vec3();
            this.worldToGridLocal(worldHit, localHit);
            targetCell = gridMgr.nearestCellFromLocalXZ(localHit.x, localHit.z);
        }

        if (targetCell) {
            const targetUnit = gridMgr.getUnitAt(targetCell.row, targetCell.col);

            if (targetUnit && targetUnit !== this.selectedUnit) {
                const success = gridMgr.mergeUnits(
                    this.selectedGridPos!.row,
                    this.selectedGridPos!.col,
                    targetCell.row,
                    targetCell.col
                );

                if (success) {
                    const gameManager = GameManager.instance;
                    if (gameManager && gameManager.tutorialManager) {
                        const tutorialMgr = gameManager.tutorialManager.getComponent(TutorialManager);
                        if (tutorialMgr) {
                            tutorialMgr.onMergePerformed();
                        }
                    }
                } else {
                    this.returnUnitToOriginalPosition(gridMgr);
                    AudioManager.instance?.playUnitDown();
                }
            } else if (!targetUnit) {
                this.moveUnitToCell(targetCell, gridMgr);
                AudioManager.instance?.playUnitDown();
            } else {
                this.returnUnitToOriginalPosition(gridMgr);
                AudioManager.instance?.playUnitDown();
            }
        } else {
            this.returnUnitToOriginalPosition(gridMgr);
            AudioManager.instance?.playUnitDown();
        }

        ArcherUnitBase.deselectUnit();

        this.selectedUnit = null;
        this.selectedGridPos = null;
        this.isDragging = false;
    }

    private moveUnitToCell(targetCell: { row: number, col: number }, gridMgr: GridManager) {
        if (!this.selectedUnit || !this.selectedGridPos) {
            return;
        }

        const success = gridMgr.moveUnit(
            this.selectedGridPos.row,
            this.selectedGridPos.col,
            targetCell.row,
            targetCell.col
        );

        if (!success) {
            this.returnUnitToOriginalPosition(gridMgr);
        }
    }

    private returnUnitToOriginalPosition(gridMgr: GridManager) {
        if (!this.selectedUnit || !this.selectedGridPos) {
            return;
        }

        const cellPos = gridMgr.getCellPosition(this.selectedGridPos.row, this.selectedGridPos.col);
        if (cellPos) {
            this.selectedUnit.setPosition(cellPos.x, cellPos.y, cellPos.z);
        }
    }

}
