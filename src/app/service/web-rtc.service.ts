import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { ChatMessage } from '../Interfaces/chat-message.interface';

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

  private messagesSource = new BehaviorSubject<ChatMessage[]>([]);
  messages$ = this.messagesSource.asObservable();

  private dataChannels: { [userId: string]: RTCDataChannel } = {};
  private peerConnections: { [userId: string]: RTCPeerConnection } = {};

  private messageIds: Set<string> = new Set(); // Set to track message IDs

  constructor() {
    this.socket = io('https://djatbe-f58917b6514c.herokuapp.com/');

    this.socket.on('onlineUsers', (users: { id: string; name: string }[]) => {
      console.log('Received online users:', users);
      this.onlineUsersSubject.next(users);
    });

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

  join(userName: string) {
    console.log('Joining chat with username:', userName);
    this.socket.emit('join', userName);
  }

  connectToUser(userId: string) {
    const peerConnection = new RTCPeerConnection();
    const dataChannel = peerConnection.createDataChannel('chat');

    dataChannel.onopen = () => {
      console.log(`Data channel for ${userId} is open`);
    };

    dataChannel.onmessage = (event) => {
      console.log(`Message from ${userId}: ${event.data}`);
      const message: ChatMessage = {
        from: userId,
        to: 'You', // Assuming messages from a user to you
        text: event.data,
        id: this.generateMessageId(),
      };

      // Avoid duplicate messages
      if (!this.messageIds.has(message.id)) {
        this.messageIds.add(message.id);
        this.messagesSource.next([...this.messagesSource.value, message]);
      }
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

    peerConnection
      .createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(() => {
        this.socket.emit('signal', {
          userId,
          signalType: 'offer',
          signalData: peerConnection.localDescription,
        });
      });
  }

  handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
    const peerConnection = this.peerConnections[userId];
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
            const message: ChatMessage = {
              from: userId,
              to: 'You', // Assuming messages from a user to you
              text: event.data,
              id: this.generateMessageId(),
            };

            if (!this.messageIds.has(message.id)) {
              this.messageIds.add(message.id);
              this.messagesSource.next([...this.messagesSource.value, message]);
            }
          };

          this.dataChannels[userId] = dataChannel;
          return peerConnection.createAnswer();
        })
        .then((answer) => peerConnection.setLocalDescription(answer))
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

  handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    const peerConnection = this.peerConnections[userId];
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(answer))
      .catch((error) => {
        console.error('Error handling answer:', error);
      });
  }

  sendMessage(userId: string, message: string) {
    const dataChannel = this.dataChannels[userId];
    if (dataChannel && dataChannel.readyState === 'open') {
      const messageObj: ChatMessage = {
        from: 'You',
        to: userId,
        text: message,
        id: this.generateMessageId(),
      };

      dataChannel.send(message);
      if (!this.messageIds.has(messageObj.id)) {
        this.messageIds.add(messageObj.id);
        this.messagesSource.next([...this.messagesSource.value, messageObj]);
      }
    } else {
      console.log(
        `Data channel for ${userId} is not open, can't send message.`
      );
    }
  }

  handleCandidate(userId: string, candidate: RTCIceCandidateInit) {
    const peerConnection = this.peerConnections[userId];
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substr(2, 9); // Generate a unique ID for each message
  }
}
