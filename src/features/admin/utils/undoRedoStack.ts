/**
 * Undo/Redo stack for layout editor
 * Maintains history of layout changes
 */

import type { ParkingSlot } from "../../../types/parkingLayout";

export interface EditorState {
  slots: ParkingSlot[];
  timestamp: number;
}

export class UndoRedoStack {
  private history: EditorState[] = [];
  private currentIndex: number = -1;
  private maxSize: number = 50;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  push(state: EditorState): void {
    // Remove any redo history
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new state
    this.history.push(state);
    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  undo(): EditorState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  redo(): EditorState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getCurrentState(): EditorState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }
}
