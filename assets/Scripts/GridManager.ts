import { _decorator, Component, Node, Prefab, instantiate, Vec3, ParticleSystem } from 'cc';
import { AudioManager } from './AudioManager';
import { ArcherUnitBase } from './ArcherUnitBase';
const { ccclass, property } = _decorator;

interface GridCell {
    position: Vec3;
    occupied: boolean;
    unit: Node | null;
}

@ccclass('GridManager')
export class GridManager extends Component {
    public static readonly GRID_PLANE_LOCAL_Y = -7.5;
    public static readonly GRID_ORIGIN_X = -2.0;
    public static readonly GRID_ORIGIN_Z = -9;

    @property(Prefab)
    cellPrefab: Prefab = null!;

    @property(Prefab)
    archerPrefab: Prefab = null!;

    @property(Prefab)
    archerLevel2Prefab: Prefab = null!;

    @property({ type: [Prefab] })
    mergeParticlePrefabs: Prefab[] = [];

    @property({ type: [Prefab] })
    enemyDeathParticlePrefabs: Prefab[] = [];

    @property
    rows: number = 4;

    @property
    cols: number = 5;

    @property
    cellSize: number = 4;

    @property
    cellSpacing: number = 0.1;

    private grid: GridCell[][] = [];
    private gridContainer: Node = null!;

    onLoad() {
        this.gridContainer = new Node('GridContainer');
        this.gridContainer.setParent(this.node);
        this.createGrid();
    }

    start() {
        this.placeInitialArcher();
    }

    private gridStep(): number {
        return this.cellSize + this.cellSpacing;
    }

    private createGrid() {
        const startX = GridManager.GRID_ORIGIN_X;
        const startZ = GridManager.GRID_ORIGIN_Z;
        const py = GridManager.GRID_PLANE_LOCAL_Y;

        for (let row = 0; row < this.rows; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const x = startX + col * this.gridStep();
                const z = startZ + row * this.gridStep();
                const position = new Vec3(x, py, z);

                const cell: GridCell = {
                    position: position,
                    occupied: false,
                    unit: null
                };

                this.grid[row][col] = cell;

                if (this.cellPrefab) {
                    const cellNode = instantiate(this.cellPrefab);
                    cellNode.setParent(this.gridContainer);
                    cellNode.setPosition(position);
                    cellNode.name = `Cell_${row}_${col}`;
                }
            }
        }

    }

    private placeInitialArcher() {
        const row = 1;
        const col = 2;
        this.placeUnit(row, col, this.archerPrefab, 1);
    }

    public placeUnit(row: number, col: number, unitPrefab: Prefab, level: number = 1, playMeridaAppear: boolean = true): Node | null {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }

        const cell = this.grid[row][col];
        if (cell.occupied) {
            return null;
        }

        const unit = instantiate(unitPrefab);
        unit.setParent(this.node);
        unit.setPosition(cell.position.x, cell.position.y, cell.position.z);
        unit.name = `Archer_${row}_${col}`;

        const unitComp = unit.getComponent(ArcherUnitBase);
        if (unitComp) {
            unitComp.setGridPosition(row, col);
            unitComp.setLevel(level);
        }

        cell.occupied = true;
        cell.unit = unit;

        if (playMeridaAppear) {
            AudioManager.instance?.playMeridaAppear();
        }

        return unit;
    }

    public removeUnit(row: number, col: number) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return;
        }

        const cell = this.grid[row][col];
        if (cell.unit) {
            cell.unit.destroy();
            cell.unit = null;
            cell.occupied = false;
        }
    }

    public getUnit(row: number, col: number): Node | null {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }
        return this.grid[row][col].unit;
    }

    public getUnitAt(row: number, col: number): Node | null {
        return this.getUnit(row, col);
    }

    public moveUnit(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
        if (fromRow < 0 || fromRow >= this.rows || fromCol < 0 || fromCol >= this.cols) {
            return false;
        }
        if (toRow < 0 || toRow >= this.rows || toCol < 0 || toCol >= this.cols) {
            return false;
        }

        const fromCell = this.grid[fromRow][fromCol];
        const toCell = this.grid[toRow][toCol];

        if (!fromCell.unit || toCell.occupied) {
            return false;
        }

        const unit = fromCell.unit;
        const unitComp = unit.getComponent(ArcherUnitBase);

        toCell.unit = unit;
        toCell.occupied = true;
        fromCell.unit = null;
        fromCell.occupied = false;

        unit.setPosition(toCell.position.x, toCell.position.y, toCell.position.z);

        if (unitComp) {
            unitComp.setGridPosition(toRow, toCol);
        }

        return true;
    }

    public getGridBounds(): { minX: number, maxX: number, minZ: number, maxZ: number } {
        const startX = GridManager.GRID_ORIGIN_X;
        const startZ = GridManager.GRID_ORIGIN_Z;
        const half = this.cellSize * 0.5;
        const step = this.gridStep();

        const minX = startX - half;
        const maxX = startX + (this.cols - 1) * step + half;
        const minZ = startZ - half;
        const maxZ = startZ + (this.rows - 1) * step + half;

        return { minX, maxX, minZ, maxZ };
    }

    public getGridPlaneWorldY(): number {
        const local = new Vec3(0, GridManager.GRID_PLANE_LOCAL_Y, 0);
        const world = new Vec3();
        Vec3.transformMat4(world, local, this.node.worldMatrix);
        return world.y;
    }

    public nearestCellFromLocalXZ(localX: number, localZ: number): { row: number, col: number } {
        const step = this.gridStep();
        const ox = GridManager.GRID_ORIGIN_X;
        const oz = GridManager.GRID_ORIGIN_Z;

        let col = Math.round((localX - ox) / step);
        let row = Math.round((localZ - oz) / step);

        row = Math.max(0, Math.min(this.rows - 1, row));
        col = Math.max(0, Math.min(this.cols - 1, col));

        return { row, col };
    }

    public getEmptyCell(): { row: number, col: number } | null {
        const empty: { row: number; col: number }[] = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (!this.grid[row][col].occupied) {
                    empty.push({ row, col });
                }
            }
        }
        if (empty.length === 0) {
            return null;
        }
        return empty[Math.floor(Math.random() * empty.length)]!;
    }

    public getCellPosition(row: number, col: number): Vec3 | null {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }
        return this.grid[row][col].position.clone();
    }

    public killAllPlayerUnits() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.grid[row][col];
                if (cell.unit) {
                    const unitComp = cell.unit.getComponent(ArcherUnitBase);
                    if (unitComp) {
                        unitComp.die();
                    }
                    cell.unit = null;
                    cell.occupied = false;
                }
            }
        }
    }

    private playParticlePrefabsAtLocal(prefabs: Prefab[] | null | undefined, localPos: Vec3) {
        if (!prefabs || prefabs.length === 0) {
            return;
        }

        for (const prefab of prefabs) {
            if (!prefab) {
                continue;
            }

            const fxNode = instantiate(prefab);
            fxNode.setParent(this.node);
            fxNode.setPosition(localPos.x, localPos.y, localPos.z);

            const systems = fxNode.getComponentsInChildren(ParticleSystem);
            let destroyAfter = 2;
            for (const ps of systems) {
                ps.play();
                const d = typeof ps.duration === 'number' ? ps.duration : 2;
                const r = ps.loop ? 8 : d;
                destroyAfter = Math.max(destroyAfter, r);
            }

            this.scheduleOnce(() => {
                if (fxNode.isValid) {
                    fxNode.destroy();
                }
            }, destroyAfter + 0.5);
        }
    }

    private playMergeParticleEffectsAt(localPos: Vec3) {
        this.playParticlePrefabsAtLocal(this.mergeParticlePrefabs, localPos);
    }

    public playEnemyDeathParticleEffectsAtWorld(worldPos: Vec3) {
        if (!this.enemyDeathParticlePrefabs || this.enemyDeathParticlePrefabs.length === 0) {
            return;
        }
        const local = new Vec3();
        this.node.inverseTransformPoint(local, worldPos);
        local.y += 1.5;
        this.playParticlePrefabsAtLocal(this.enemyDeathParticlePrefabs, local);
    }

    public mergeUnits(row1: number, col1: number, row2: number, col2: number): boolean {
        const unit1 = this.getUnit(row1, col1);
        const unit2 = this.getUnit(row2, col2);

        if (!unit1 || !unit2) {
            return false;
        }

        const comp1 = unit1.getComponent(ArcherUnitBase);
        const comp2 = unit2.getComponent(ArcherUnitBase);

        if (!comp1 || !comp2) {
            return false;
        }

        if (comp1.getLevel() !== comp2.getLevel()) {
            return false;
        }

        const currentLevel = comp1.getLevel();
        
        if (currentLevel === 2) {
            return false;
        }
        
        const newLevel = currentLevel + 1;
        
        this.removeUnit(row1, col1);
        
        if (newLevel === 2 && this.archerLevel2Prefab) {
            const cell2 = this.grid[row2][col2];
            
            const position = cell2.position.clone();
            
            unit2.destroy();
            
            const newUnit = instantiate(this.archerLevel2Prefab);
            newUnit.setParent(this.node);
            newUnit.setPosition(position.x, position.y, position.z);
            newUnit.name = `Archer_${row2}_${col2}_Lv2`;
            
            const newUnitComp = newUnit.getComponent(ArcherUnitBase);
            if (newUnitComp) {
                newUnitComp.setGridPosition(row2, col2);
                newUnitComp.setLevel(2);
            }
            
            cell2.unit = newUnit;
            cell2.occupied = true;
            
        } else {
            comp2.upgradeToLevel(newLevel);
        }

        const cell2 = this.grid[row2][col2];
        const fxPos = cell2.position.clone();
        fxPos.y += 0.5;
        this.playMergeParticleEffectsAt(fxPos);

        AudioManager.instance?.playMerge();

        return true;
    }
}
