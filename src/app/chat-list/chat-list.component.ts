import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebRTCService } from '../service/web-rtc.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../Interfaces/chat-message.interface'; // Correct import

// import { ChatMessage } from '../service/web-rtc.service'; // Import ChatMessage interface

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
  private messagesSub: Subscription | null = null;

  userName: string = '';
  selectedUser: string | null = null;
  userMessage: string = '';
  chatMessages: string[] = [];
  errorMessage: string = '';
  private messageIds: Set<string> = new Set(); // Track received message IDs to avoid duplicates

  constructor(private webrtcService: WebRTCService) {}

  ngOnInit() {
    // Subscribe to the online users list
    this.onlineUsersSub = this.webrtcService.onlineUsers$.subscribe(
      (users: { id: string; name: string }[]) => {
        this.onlineUsers = users;
      }
    );

    // Subscribe to incoming messages
    this.messagesSub = this.webrtcService.messages$.subscribe(
      (messageData: ChatMessage | ChatMessage[]) => {
        if (messageData) {
          // If messageData is an array, loop through it and add messages
          if (Array.isArray(messageData)) {
            messageData.forEach((message: ChatMessage) => {
              if (!this.messageIds.has(message.id)) {
                this.messageIds.add(message.id); // Mark this message as processed
                if (message.from === this.selectedUser) {
                  this.chatMessages.push(`${message.from}: ${message.text}`);
                }
              }
            });
          } else if (!this.messageIds.has(messageData.id)) {
            this.messageIds.add(messageData.id);
            if (messageData.from === this.selectedUser) {
              this.chatMessages.push(
                `${messageData.from}: ${messageData.text}`
              );
            }
          }
        }
      }
    );
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
    this.messageIds.clear(); // Clear message ID tracking
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
    // Unsubscribe from all subscriptions
    if (this.onlineUsersSub) {
      this.onlineUsersSub.unsubscribe();
    }
    if (this.messagesSub) {
      this.messagesSub.unsubscribe();
    }
  }
}
