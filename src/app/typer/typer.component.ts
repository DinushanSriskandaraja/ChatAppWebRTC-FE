import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel

@Component({
  selector: 'app-typer',
  standalone: true,
  imports: [FormsModule], // Make sure FormsModule is imported
  templateUrl: './typer.component.html',
  styleUrls: ['./typer.component.css'],
})
export class TyperComponent {
  message: string = '';

  @Output() sendMessage = new EventEmitter<string>();

  onSendMessage() {
    if (this.message.trim()) {
      console.log('Sending message:', this.message);
      this.sendMessage.emit(this.message); // Emit message to parent
      this.message = ''; // Reset the input field after sending
    } else {
      console.warn('Message is empty or only whitespace!');
    }
  }
}
