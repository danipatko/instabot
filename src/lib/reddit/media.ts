export interface IRedditVideo {
    width: number;
    height: number;
    is_gif: number;
    duration: number; // in seconds
    bitrate_kbps: number;
}

// TODO: reddit separates the video from the audio,
// so it needs to be remade with ffmpeg
export default class RedditVideo implements IRedditVideo {
    public width: number;
    public height: number;
    public is_gif: number;
    public duration: number; // in seconds
    public bitrate_kbps: number;

    public constructor(data: IRedditVideo) {
        this.width = data.width;
        this.height = data.height;
        this.is_gif = data.is_gif;
        this.duration = data.duration;
        this.bitrate_kbps = data.bitrate_kbps;
    }

    public async fetchVideo() {
        const response = await fetch('');
    }
}
