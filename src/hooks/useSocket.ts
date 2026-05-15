import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useSocket() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useSocket must be used within AppContext');
  return { socket: ctx.socket };
}
