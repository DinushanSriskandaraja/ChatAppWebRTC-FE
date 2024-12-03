import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class WebRTCService {
  private socket: any;
  private onlineUsersSubject = new BehaviorSubject<
    { id: string; name: string }[]
  >([]);
  onlineUsers$: Observable<{ id: string; name: string }[]> =
    this.onlineUsersSubject.asObservable();

  private messagesSource = new BehaviorSubject<
    { from: string; text: string }[]
  >([]);
  messages$ = this.messagesSource.asObservable();

  private dataChannels: { [userId: string]: RTCDataChannel } = {};
  private peerConnections: { [userId: string]: RTCPeerConnection } = {};

  constructor() {
    this.socket = io('http://localhost:5000');

    // Listen for online users updates
    this.socket.on('onlineUsers', (users: { id: string; name: string }[]) => {
      console.log('Received online users:', users);
      this.onlineUsersSubject.next(users);
    });

    // Listen for a signaling message (offer, answer, ice candidate)
    this.socket.on('signal', (data: any) => {
      const { userId, signalType, signalData } = data;
      if (signalType === 'offer') {
        this.handleOffer(userId, signalData);
      } else if (signalType === 'answer') {
        this.handleAnswer(userId, signalData);
      } else if (signalType === 'candidate') {
        this.handleCandidate(userId, signalData);
      }
    });
  }

  // Join the chat with a username
  join(userName: string) {
    console.log('Joining chat with username:', userName);
    this.socket.emit('join', userName);
  }

  connectToUser(userId: string) {
    const peerConnection = new RTCPeerConnection();
    const dataChannel = peerConnection.createDataChannel('chat');

    // Handle opening of the data channel
    dataChannel.onopen = () => {
      console.log(`Data channel for ${userId} is open`);
    };

    // Handle incoming messages
    dataChannel.onmessage = (event) => {
      console.log(`Message from ${userId}: ${event.data}`);
      this.messagesSource.next([
        ...this.messagesSource.value,
        { from: userId, text: event.data },
      ]);
    };

    this.dataChannels[userId] = dataChannel;
    this.peerConnections[userId] = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal', {
          userId,
          signalType: 'candidate',
          signalData: event.candidate,
        });
      }
    };

    // Create offer and send to receiver
    peerConnection
      .createOffer()
      .then((offer) => {
        return peerConnection.setLocalDescription(offer);
      })
      .then(() => {
        this.socket.emit('signal', {
          userId,
          signalType: 'offer',
          signalData: peerConnection.localDescription,
        });
      });
  }

  // Handle incoming offer
  handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
    const peerConnection = this.peerConnections[userId];

    // Check if peer connection exists and set the remote description
    if (peerConnection) {
      peerConnection
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
          const dataChannel = peerConnection.createDataChannel('chat');

          dataChannel.onopen = () => {
            console.log(`Data channel for ${userId} is open`);
          };

          dataChannel.onmessage = (event) => {
            console.log(`Message from ${userId}: ${event.data}`);
            this.messagesSource.next([
              ...this.messagesSource.value,
              { from: userId, text: event.data },
            ]);
          };

          this.dataChannels[userId] = dataChannel;

          return peerConnection.createAnswer();
        })
        .then((answer) => {
          return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
          this.socket.emit('signal', {
            userId,
            signalType: 'answer',
            signalData: peerConnection.localDescription,
          });
        })
        .catch((error) => {
          console.error('Error handling offer:', error);
        });
    }
  }

  // Handle incoming answer
  handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    const peerConnection = this.peerConnections[userId];
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(answer))
      .catch((error) => {
        console.error('Error handling answer:', error);
      });
  }

  // Send a message to a connected user
  sendMessage(userId: string, message: string) {
    const dataChannel = this.dataChannels[userId];

    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(message);
      this.messagesSource.next([
        ...this.messagesSource.value,
        { from: 'You', text: message },
      ]);
    } else {
      console.log(
        `Data channel for ${userId} is not open, can't send message.`
      );
    }
  }

  // Handle incoming ICE candidate
  handleCandidate(userId: string, candidate: RTCIceCandidateInit) {
    const peerConnection = this.peerConnections[userId];
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
}
