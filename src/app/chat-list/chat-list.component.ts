import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebRTCService } from '../service/web-rtc.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.css'],
})
export class ChatListComponent implements OnInit, OnDestroy {
  onlineUsers: { id: string; name: string }[] = [];
  private onlineUsersSub: Subscription | null = null;
  userName: string = '';
  selectedUser: string | null = null;
  userMessage: string = '';
  chatMessages: string[] = [];
  errorMessage: string = '';

  constructor(private webrtcService: WebRTCService) {}

  ngOnInit() {
    // Subscribe to the online users list
    this.onlineUsersSub = this.webrtcService.onlineUsers$.subscribe(
      (users: { id: string; name: string }[]) => {
        this.onlineUsers = users;
      }
    );

    // Subscribe to incoming messages
    // Subscribe to incoming messages
    this.webrtcService.messages$.subscribe((messageData) => {
      if (messageData) {
        // If messageData is an array, loop through it and add messages
        if (Array.isArray(messageData)) {
          messageData.forEach((message) => {
            this.chatMessages.push(`${message.from}: ${message.text}`);
          });
        } else {
          // If messageData is an object, directly push the message
          this.chatMessages.push(`rr`);
        }
      }
    });
  }

  onJoin(userName: string) {
    if (userName.trim()) {
      this.webrtcService.join(userName); // Send 'join' event to backend
      this.errorMessage = ''; // Clear any previous error message
    } else {
      this.errorMessage = 'Please enter a valid username!';
    }
  }

  // Handle selecting a user to chat with
  onSelectUser(userId: string) {
    this.selectedUser = userId;
    console.log(`Selected user for chat: ${userId}`);
    this.webrtcService.connectToUser(userId); // Initiate connection to the selected user
    this.chatMessages = []; // Clear chat history when a new user is selected
  }

  // Handle sending a message
  onSendMessage() {
    if (this.selectedUser && this.userMessage.trim()) {
      this.webrtcService.sendMessage(this.selectedUser, this.userMessage);
      this.chatMessages.push(`You: ${this.userMessage}`);
      this.userMessage = ''; // Clear the message input after sending
    } else {
      this.errorMessage = 'Please enter a valid message!';
    }
  }

  ngOnDestroy() {
    // Unsubscribe from the online users observable
    if (this.onlineUsersSub) {
      this.onlineUsersSub.unsubscribe();
    }
  }
}
