export enum GameState {
    MENU = 0,
    TUTORIAL_BUY = 1,
    TUTORIAL_MERGE = 2,
    BATTLE = 3,
    VICTORY = 4,
    DEFEAT = 5,
}

const ALLOWED: Record<GameState, ReadonlySet<GameState>> = {
    [GameState.MENU]: new Set([
        GameState.TUTORIAL_BUY,
        GameState.DEFEAT,
    ]),
    [GameState.TUTORIAL_BUY]: new Set([
        GameState.TUTORIAL_MERGE,
        GameState.BATTLE,
        GameState.DEFEAT,
    ]),
    [GameState.TUTORIAL_MERGE]: new Set([
        GameState.BATTLE,
        GameState.DEFEAT,
    ]),
    [GameState.BATTLE]: new Set([
        GameState.VICTORY,
        GameState.DEFEAT,
    ]),
    [GameState.VICTORY]: new Set(),
    [GameState.DEFEAT]: new Set(),
};

export class GameStateMachine {
    public static canTransition(from: GameState, to: GameState): boolean {
        if (from === to) {
            return true;
        }
        return ALLOWED[from]?.has(to) ?? false;
    }
}

export function isGameOver(state: GameState): boolean {
    return state === GameState.VICTORY || state === GameState.DEFEAT;
}

export function allowsGameplayInput(state: GameState): boolean {
    return !isGameOver(state);
}
