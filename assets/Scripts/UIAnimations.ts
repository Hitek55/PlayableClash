import { _decorator, Component, Node, tween, Vec3, UIOpacity, Tween } from 'cc';
const { ccclass } = _decorator;

@ccclass('UIAnimations')
export class UIAnimations extends Component {
    public static fadeIn(node: Node, duration: number = 0.3, callback?: Function) {
        if (!node) {
            if (callback) callback();
            return;
        }

        node.active = true;
        
        const opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            node.addComponent(UIOpacity);
        }
        
        const uiOpacity = node.getComponent(UIOpacity)!;
        uiOpacity.opacity = 0;

        tween(uiOpacity)
            .to(duration, { opacity: 255 })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }

    public static fadeOut(node: Node, duration: number = 0.3, callback?: Function) {
        if (!node) {
            if (callback) callback();
            return;
        }

        const opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            node.addComponent(UIOpacity);
        }
        
        const uiOpacity = node.getComponent(UIOpacity)!;

        tween(uiOpacity)
            .to(duration, { opacity: 0 })
            .call(() => {
                node.active = false;
                if (callback) callback();
            })
            .start();
    }

    public static scaleIn(node: Node, duration: number = 0.3, targetScale: number = 1, callback?: Function) {
        if (!node) {
            if (callback) callback();
            return;
        }

        node.active = true;
        node.setScale(0, 0, 1);

        tween(node)
            .to(duration, { scale: new Vec3(targetScale, targetScale, 1) }, { easing: 'backOut' })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }

    public static pulse(node: Node, scale: number = 1.1, duration: number = 0.5, loop: boolean = false) {
        if (!node) {
            return;
        }

        Tween.stopAllByTarget(node);

        const originalScale = node.scale.clone();
        const targetScale = new Vec3(
            originalScale.x * scale,
            originalScale.y * scale,
            originalScale.z
        );

        const bump = tween(node)
            .to(duration / 2, { scale: targetScale })
            .to(duration / 2, { scale: originalScale });

        if (loop) {
            bump.union().repeatForever().start();
        } else {
            bump.start();
        }
    }

    public static floatUpDown(node: Node, distance: number = 20, duration: number = 1.0) {
        if (!node) {
            return;
        }

        const originalPos = node.position.clone();
        const upPos = new Vec3(originalPos.x, originalPos.y + distance, originalPos.z);

        tween(node)
            .to(duration / 2, { position: upPos }, { easing: 'sineInOut' })
            .to(duration / 2, { position: originalPos }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    public static pointToTarget(handNode: Node, targetNode: Node) {
        if (!handNode || !targetNode) {
            return;
        }

        handNode.active = true;
        
        const uiTransform = targetNode.getComponent('cc.UITransform') as any;
        if (!uiTransform) {
            return;
        }
        
        const buttonWidth = uiTransform.width * targetNode.scale.x;
        const buttonHeight = uiTransform.height * targetNode.scale.y;
        
        const buttonPos = targetNode.position.clone();
        const rightBottomX = buttonPos.x + buttonWidth / 2;
        const rightBottomY = buttonPos.y - buttonHeight / 2;
        
        const handPos = new Vec3(rightBottomX + 50, rightBottomY - 40, buttonPos.z);
        handNode.setPosition(handPos);
        
        const upOffset = 15;
        const startPos = handPos.clone();
        const endPos = new Vec3(handPos.x, handPos.y - upOffset, handPos.z);

        tween(handNode)
            .to(0.5, { position: endPos }, { easing: 'sineInOut' })
            .to(0.5, { position: startPos }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    public static stopNodeAnimation(node: Node) {
        if (!node) {
            return;
        }
        Tween.stopAllByTarget(node);
    }

    public static shake(node: Node, intensity: number = 10, duration: number = 0.5) {
        if (!node) {
            return;
        }

        const originalPos = node.position.clone();
        const shakeCount = 10;
        const shakeDuration = duration / shakeCount;

        let shakeTween = tween(node);
        
        for (let i = 0; i < shakeCount; i++) {
            const randomX = (Math.random() - 0.5) * intensity;
            const randomY = (Math.random() - 0.5) * intensity;
            const shakePos = new Vec3(
                originalPos.x + randomX,
                originalPos.y + randomY,
                originalPos.z
            );
            shakeTween = shakeTween.to(shakeDuration, { position: shakePos });
        }

        shakeTween
            .to(shakeDuration, { position: originalPos })
            .start();
    }

    private static handAnimationTween: Tween<Node> | null = null;
    private static onAnimationCycleComplete: (() => void) | null = null;

    public static animateMergeHand(handNode: Node, startPos: Vec3, endPos: Vec3, onCycleComplete?: () => void) {
        if (!handNode) {
            return;
        }

        this.stopMergeHandAnimation();

        this.onAnimationCycleComplete = onCycleComplete || null;

        handNode.active = true;
        handNode.setPosition(startPos);

        const opacity = handNode.getComponent(UIOpacity);
        if (!opacity) {
            handNode.addComponent(UIOpacity);
        }
        const uiOpacity = handNode.getComponent(UIOpacity)!;
        uiOpacity.opacity = 255;

        this.handAnimationTween = tween(handNode)
            .to(0.3, { position: startPos })
            .delay(0.2)
            .to(0.8, { position: endPos }, { easing: 'sineInOut' })
            .delay(0.3)
            .call(() => {
                uiOpacity.opacity = 0;
            })
            .delay(0.4)
            .call(() => {
                if (this.onAnimationCycleComplete) {
                    this.onAnimationCycleComplete();
                }
            })
            .start();
    }

    public static stopMergeHandAnimation() {
        if (this.handAnimationTween) {
            this.handAnimationTween.stop();
            this.handAnimationTween = null;
        }
        this.onAnimationCycleComplete = null;
    }
}
