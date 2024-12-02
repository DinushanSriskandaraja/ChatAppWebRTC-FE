import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class WebRTCService {
  private socket: Socket;
  private onlineUsersSubject = new BehaviorSubject<
    {
      id: string;
      name: string;
    }[]
  >([]);
  onlineUsers$ = this.onlineUsersSubject.asObservable();
  messages$: BehaviorSubject<{ from: string; text: string }[]> =
    new BehaviorSubject<{ from: string; text: string }[]>([]);
  private unsubscribe$ = new Subject<void>();
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor() {
    this.socket = io('http://localhost:3000'); // Replace with your server URL

    // Listen for updates to the online user list from the backend
    this.socket.on(
      'updateUserList',
      (users: { id: string; name: string }[]) => {
        this.onlineUsersSubject.next(users);
        console.log('Socket connected with ID:', this.socket.id);
      }
    );
  }

  // Emit a join event to the backend when the user connects
  join(userName: string) {
    this.socket.emit('join', userName);
  }

  // Send WebRTC signaling data to a specific user
  sendSignal(targetId: string, signal: any) {
    this.socket.emit('signal', { targetId, signal });
  }

  // Connect to a specific user and set up WebRTC Data Channel
  connectToUser(userId: string) {
    this.socket.emit('connectToUser', { targetId: userId });
    console.log(`Connecting to user with ID: ${userId}`);

    this.peerConnection = new RTCPeerConnection();

    // Create the data channel
    this.dataChannel = this.peerConnection.createDataChannel('chat');

    this.dataChannel.onopen = () => {
      console.log('Data channel opened.');
    };

    this.dataChannel.onmessage = (event) => {
      const message = event.data;
      console.log('Received message:', message);
      this.messages$.next([
        ...this.messages$.value,
        { from: 'Other User', text: message },
      ]);
    };

    // Create the offer and send it to the target user
    if (this.peerConnection) {
      this.peerConnection
        .createOffer()
        .then((offer) => {
          return this.peerConnection?.setLocalDescription(offer);
        })
        .then(() => {
          this.socket.emit('signal', {
            targetId: userId,
            signal: this.peerConnection?.localDescription,
          });
        });
    }

    // Listen for signaling data
    this.onSignal().subscribe((data) => {
      if (this.peerConnection) {
        if (data.signal.type === 'offer') {
          // If we receive an offer, we need to respond with an answer
          this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.signal)
          );
          this.peerConnection
            .createAnswer()
            .then((answer) => {
              return this.peerConnection?.setLocalDescription(answer);
            })
            .then(() => {
              this.socket.emit('signal', {
                targetId: data.senderId,
                signal: this.peerConnection?.localDescription,
              });
            });
        } else if (data.signal.type === 'answer') {
          // If we receive an answer, set it as remote description
          this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.signal)
          );
        }

        // Add ICE candidates to peer connection
        if (data.signal.candidate) {
          this.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.signal.candidate)
          );
        }
      }
    });
  }

  // Send a message to the connected user via the data channel
  sendMessage(targetId: string, message: string) {
    if (this.dataChannel) {
      if (this.dataChannel.readyState === 'open') {
        this.dataChannel.send(message);
        console.log('Message sent:', message);
      } else {
        console.warn('Data channel is not open yet. Queuing message.');
        // Queue message for sending once the data channel is open
        this.queueMessage(message);
      }
    } else {
      console.warn('No data channel established.');
    }
  }

  // This function will handle queued messages
  queueMessage(message: string) {
    // Store messages locally in a queue until the data channel opens
    this.messages$.next([
      ...this.messages$.value,
      { from: 'You (queued)', text: message },
    ]);
  }

  // Listen for incoming signaling data
  onSignal(): Observable<{ senderId: string; signal: any }> {
    return new Observable<{ senderId: string; signal: any }>((observer) => {
      this.socket.on('signal', (data: { senderId: string; signal: any }) => {
        observer.next(data);
      });
    }).pipe(takeUntil(this.unsubscribe$)); // Automatically unsubscribe when unsubscribe$ emits
  }

  // Clean up the peer connection and data channel
  cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      console.log('Peer connection closed.');
      this.peerConnection = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      console.log('Data channel closed.');
      this.dataChannel = null;
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.cleanupPeerConnection(); // Ensure cleanup on component destroy
  }
}
