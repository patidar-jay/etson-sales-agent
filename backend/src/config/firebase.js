import { memoryStore } from '../store/memoryStore.js';

// In a real app, initialize Firebase Admin SDK here.
// For dev mode, use in-memory store.

export const db = memoryStore;
export const storage = {}; // Mock storage if needed
