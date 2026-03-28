import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
const { ccclass } = _decorator;

export class ObjectPool {
    private prefab: Prefab;
    private pool: Node[] = [];
    private parent: Node;
    private initialSize: number;

    constructor(prefab: Prefab, parent: Node, initialSize: number = 10) {
        this.prefab = prefab;
        this.parent = parent;
        this.initialSize = initialSize;
        this.initialize();
    }

    private initialize() {
        for (let i = 0; i < this.initialSize; i++) {
            const obj = this.createObject();
            obj.active = false;
            this.pool.push(obj);
        }
    }

    private createObject(): Node {
        const obj = instantiate(this.prefab);
        obj.setParent(this.parent);
        return obj;
    }

    public get(): Node {
        let obj: Node | undefined;

        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                obj = this.pool[i];
                break;
            }
        }

        if (!obj) {
            obj = this.createObject();
            this.pool.push(obj);
        }

        obj.active = true;
        return obj;
    }

    public release(obj: Node) {
        obj.active = false;
        obj.setParent(this.parent);
    }
}

@ccclass('PoolManager')
export class PoolManager extends Component {
    private pools: Map<string, ObjectPool> = new Map();

    public createPool(name: string, prefab: Prefab, parent: Node, initialSize: number = 10) {
        if (this.pools.has(name)) {
            return;
        }

        const pool = new ObjectPool(prefab, parent, initialSize);
        this.pools.set(name, pool);
    }

    public getFromPool(name: string): Node | null {
        const pool = this.pools.get(name);
        if (!pool) {
            return null;
        }
        return pool.get();
    }

    public releaseToPool(name: string, obj: Node) {
        const pool = this.pools.get(name);
        if (!pool) {
            return;
        }
        pool.release(obj);
    }
}
