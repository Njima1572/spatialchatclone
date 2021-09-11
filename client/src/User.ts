import { setUserVolume } from "./VolumeController";

class User {
  peerConnection: RTCPeerConnection;
  avatarDC: RTCDataChannel;
  sender: RTCRtpSender;
  id: string;
  stream: MediaStream;
  player: HTMLAudioElement;
  selfPosition: [number, number];
  peerPosition: [number, number];
  setPosition: (positionString) => void;
  constructor(id: string) {
    this.id = id;
    this.sender = null as unknown as RTCRtpSender;
    this.avatarDC = null as unknown as RTCDataChannel;
    // initialize with a free public STUN server to find out public ip, NAT type, and internet side port
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:iphone-stun.strato-iphone.de:3478" }],
    });
    // set the local datachannel on connect
    this.peerConnection.ondatachannel = (event) => {
      console.log(event.channel);
      this.avatarDC = event.channel;
      this.avatarDC.onopen = this.onAvatarDCOpen.bind(this);
      this.avatarDC.onclose = this.onAvatarDCClose.bind(this);
      this.avatarDC.onmessage = this.onAvatarDCMessage.bind(this);
    };
    this.stream = new MediaStream();
    this.player = new Audio();
    this.selfPosition = [0, 0];
    this.peerPosition = [0, 0];
    this.setPosition = (positionString) => console.warn(positionString);

    // listener for when a peer adds a track
    this.peerConnection.ontrack = (event) => {
      this.updateLocalTrack(event.track);
    };
  }

  onAvatarDCOpen(): void {
    console.log("dc open");
  }
  onAvatarDCClose(): void {
    console.log("dc close");
  }
  onAvatarDCMessage(event): void {
    const position = JSON.parse(event.data);
    this.setVolume(this.getVolume(this.selfPosition, position));
    this.peerPosition = position;
    this.setPosition(position);
  }

  setSelfPosition(position: [number, number]): void {
    this.selfPosition = position;
  }

  getVolume(selfPosition: [number, number], peerPosition: [number, number]): number {
    const distance = Math.sqrt(
      Math.pow(selfPosition[0] - peerPosition[0], 2) +
        Math.pow(selfPosition[1] - peerPosition[1], 2)
    );
    const max = 600;
    let volume = 0;
    if (distance < max) {
      volume = (max - distance) / max;
    }
    return volume;
  }

  // sets volume for this peer user
  setVolume(volume: number): void {
    if (volume >= 0 && volume <= 1) {
      this.player.volume = volume;
    } else {
      console.warn("Volume needs to be within 0 and 1");
    }
  }

  setSender(s: RTCRtpSender): void {
    this.sender = s;
  }

  updateLocalTrack(track: MediaStreamTrack): boolean {
    if (!track.readyState) {
      return false;
    }
    // if there's already a track assigned to the stream, remove it
    if (this.stream.getAudioTracks()[0]) {
      this.stream.removeTrack(this.stream.getAudioTracks()[0]);
    }
    this.stream.addTrack(track);
    // set the new stream as the audio source
    this.player.srcObject = this.stream;
    this.player.play();
    this.player.autoplay = true;
    return true;
  }

  updateRemoteTrack(track: MediaStreamTrack): void {
    if (this.sender) {
      this.peerConnection.removeTrack(this.sender);
    }
    this.setSender(this.peerConnection.addTrack(track));
  }
}

export default User;
