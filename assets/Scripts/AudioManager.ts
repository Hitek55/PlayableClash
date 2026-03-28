import { _decorator, Component, AudioSource, AudioClip } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property(AudioClip)
    unitBuySound: AudioClip = null!;

    @property(AudioClip)
    golemHitSound: AudioClip = null!;

    @property(AudioClip)
    meridaAppearSound: AudioClip = null!;

    @property(AudioClip)
    golemDeathSound: AudioClip = null!;

    @property({ type: [AudioClip] })
    bowReleaseSounds: AudioClip[] = [];

    @property(AudioClip)
    mergeSound: AudioClip = null!;

    @property(AudioClip)
    femaleDeathSound: AudioClip = null!;

    @property(AudioClip)
    orcHitSound: AudioClip = null!;

    @property({ type: [AudioClip] })
    orcDeathSounds: AudioClip[] = [];

    @property(AudioClip)
    coinsSound: AudioClip = null!;

    @property(AudioClip)
    unitDownSound: AudioClip = null!;

    @property(AudioClip)
    unitUpSound: AudioClip = null!;

    @property(AudioClip)
    backgroundMusic: AudioClip = null!;

    @property(AudioClip)
    backgroundMusicAlternate: AudioClip = null!;

    @property(AudioClip)
    victoryMusic: AudioClip = null!;

    @property(AudioClip)
    defeatMusic: AudioClip = null!;

    @property(AudioSource)
    sfxSource: AudioSource = null!;

    @property(AudioSource)
    musicSource: AudioSource = null!;

    private static _instance: AudioManager = null!;

    public static get instance(): AudioManager {
        return this._instance;
    }

    onLoad() {
        AudioManager._instance = this;
    }

    start() {
        this.playBackgroundMusic();
    }

    public playUnitBuy() {
        this.playOneShot(this.unitBuySound);
    }

    public playGolemHit() {
        this.playOneShot(this.golemHitSound);
    }

    public playMeridaAppear() {
        this.playOneShot(this.meridaAppearSound);
    }

    public playGolemDeath() {
        this.playOneShot(this.golemDeathSound);
    }

    public playBowRelease() {
        this.playRandomFrom(this.bowReleaseSounds);
    }

    public playMerge() {
        this.playOneShot(this.mergeSound);
    }

    public playFemaleDeath() {
        this.playOneShot(this.femaleDeathSound);
    }

    public playOrcHit() {
        this.playOneShot(this.orcHitSound);
    }

    public playOrcDeathRandom() {
        this.playRandomFrom(this.orcDeathSounds);
    }

    public playCoins() {
        this.playOneShot(this.coinsSound);
    }

    public playUnitDown() {
        this.playOneShot(this.unitDownSound);
    }

    public playUnitUp() {
        this.playOneShot(this.unitUpSound);
    }

    private playOneShot(clip: AudioClip | null) {
        if (!clip || !this.sfxSource) {
            return;
        }

        this.sfxSource.playOneShot(clip, 1.0);
    }

    private playRandomFrom(clips: AudioClip[]) {
        if (!clips || clips.length === 0 || !this.sfxSource) {
            return;
        }

        const valid = clips.filter((c) => !!c);
        if (valid.length === 0) {
            return;
        }

        const clip = valid[Math.floor(Math.random() * valid.length)]!;
        this.sfxSource.playOneShot(clip, 1.0);
    }

    private playBackgroundMusic() {
        if (!this.musicSource) {
            return;
        }

        const clip =
            this.backgroundMusic && this.backgroundMusicAlternate
                ? Math.random() < 0.5
                    ? this.backgroundMusic
                    : this.backgroundMusicAlternate
                : this.backgroundMusic || this.backgroundMusicAlternate;

        if (!clip) {
            return;
        }

        this.musicSource.stop();
        this.musicSource.clip = clip;
        this.musicSource.loop = true;
        this.musicSource.volume = 0.5;
        this.musicSource.play();
    }

    public playVictoryMusic() {
        this.playEndMusic(this.victoryMusic);
    }

    public playDefeatMusic() {
        this.playEndMusic(this.defeatMusic);
    }

    private playEndMusic(clip: AudioClip) {
        if (!clip || !this.musicSource) {
            return;
        }

        this.musicSource.stop();
        this.musicSource.clip = clip;
        this.musicSource.loop = false;
        this.musicSource.volume = 0.55;
        this.musicSource.play();
    }
}
