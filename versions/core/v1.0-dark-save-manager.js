// Save/Load manager using localStorage
import GameState from './game-state.js';
import EventBus from './event-bus.js';

const SAVE_KEY = 'monglebel_save';
const CHECKPOINT_KEY = 'monglebel_checkpoint';

const SaveManager = {
  save() {
    try {
      const data = GameState.toJSON();
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      EventBus.emit('game:saved');
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      GameState.fromJSON(data);
      EventBus.emit('game:loaded');
      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  },

  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  },

  deleteSave() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(CHECKPOINT_KEY);
  },

  // Checkpoint: snapshot at summoning room for death recovery
  saveCheckpoint() {
    try {
      const data = GameState.toJSON();
      data.currentPhase = 'summoning'; // always restore to summoning room
      GameState.checkpoint = data;
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(data));
      EventBus.emit('checkpoint:saved');
      return true;
    } catch (e) {
      console.error('Checkpoint save failed:', e);
      return false;
    }
  },

  loadCheckpoint() {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      GameState.fromJSON(data);
      GameState.fullHeal();
      EventBus.emit('checkpoint:loaded');
      return true;
    } catch (e) {
      console.error('Checkpoint load failed:', e);
      return false;
    }
  },

  hasCheckpoint() {
    return localStorage.getItem(CHECKPOINT_KEY) !== null;
  }
};

export default SaveManager;
