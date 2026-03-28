import { _decorator, Component, Node, Sprite, UITransform, Camera, Vec3, Color, Canvas } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HealthBar')
export class HealthBar extends Component {
    @property(Sprite)
    fillSprite: Sprite = null!;

    @property(Camera)
    camera: Camera = null!;

    @property(Node)
    targetNode: Node = null!;

    @property
    offset: Vec3 = new Vec3(0, 100, 0);

    private maxHealth: number = 100;
    private currentHealth: number = 100;

    start() {
        this.updateHealthBar();
    }

    update(deltaTime: number) {
        if (this.targetNode && this.targetNode.isValid && this.camera) {
            this.updatePosition();
        }
    }

    private findCanvasNode(): Node | null {
        let n: Node | null = this.node;
        while (n) {
            if (n.getComponent(Canvas)) {
                return n;
            }
            n = n.parent;
        }
        return null;
    }

    private updatePosition() {
        if (!this.camera || !this.targetNode || !this.targetNode.isValid || !this.node.parent) {
            return;
        }

        const worldPos = this.targetNode.worldPosition.clone();
        worldPos.add(this.offset);

        const canvasNode = this.findCanvasNode();
        const canvasUIT = canvasNode?.getComponent(UITransform);
        const parentUIT = this.node.parent.getComponent(UITransform);
        if (!canvasNode || !canvasUIT || !parentUIT) {
            return;
        }

        const inCanvas = new Vec3();
        this.camera.convertToUINode(worldPos, canvasNode, inCanvas);

        const parent = this.node.parent;
        if (parent === canvasNode) {
            this.node.setPosition(inCanvas);
            return;
        }

        const worldUI = new Vec3();
        canvasUIT.convertToWorldSpaceAR(inCanvas, worldUI);
        const localInParent = new Vec3();
        parentUIT.convertToNodeSpaceAR(worldUI, localInParent);
        this.node.setPosition(localInParent);
    }

    public setHealth(current: number, max: number) {
        this.currentHealth = current;
        this.maxHealth = max;
        this.updateHealthBar();
    }

    private updateHealthBar() {
        if (!this.fillSprite) {
            return;
        }

        const healthPercent = this.currentHealth / this.maxHealth;
        const transform = this.fillSprite.getComponent(UITransform);
        
        if (transform) {
            const maxWidth = 100;
            transform.width = maxWidth * healthPercent;
        }

        if (healthPercent > 0.5) {
            this.fillSprite.color = new Color(0, 255, 0);
        } else if (healthPercent > 0.25) {
            this.fillSprite.color = new Color(255, 255, 0);
        } else {
            this.fillSprite.color = new Color(255, 0, 0);
        }
    }
}
