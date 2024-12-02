import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { ChatListComponent } from './chat-list/chat-list.component';
import { ChatComponent } from './chat/chat.component';

export const routes: Routes = [
  { path: '', component: ChatListComponent },
  { path: 'chat', component: ChatComponent },
];
